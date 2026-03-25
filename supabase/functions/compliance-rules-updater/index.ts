/**
 * compliance-rules-updater
 * Weekly scheduled edge function.
 *
 * 1. Fetches the latest CBP CSMS bulletins from the public RSS feed.
 * 2. Sends each new bulletin to Claude claude-sonnet-4-6 to extract structured rule changes.
 * 3. Saves parsed changes to compliance_rules_updates.
 * 4. Creates in-app notifications for workspace owners whose active shipments
 *    are affected by the new rules (matched by origin country and transport mode).
 *
 * Schedule: every Sunday at 06:00 UTC (configure via Supabase cron or pg_cron).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── CBP CSMS RSS feed (public, no auth required) ─────────────────────────────
const CBP_CSMS_RSS = "https://csms.cbp.gov/viewmssg.asp?Edocket=rss";

// ── How many days back to look for new bulletins ──────────────────────────────
const LOOKBACK_DAYS = 8; // weekly run + 1 day overlap to avoid missing bulletins

// ── Anthropic model ───────────────────────────────────────────────────────────
const CLAUDE_MODEL = "claude-sonnet-4-6";

// ── Structured output schema Claude must return ───────────────────────────────
const PARSE_SCHEMA = `{
  "applicable": boolean,       // false if this bulletin has no customs-broker-relevant rule change
  "source": string,            // bulletin ID / title, e.g. "CBP CSMS #64291847"
  "effective_date": string,    // ISO-8601 date, e.g. "2025-04-01". Use bulletin date if not stated.
  "transport_modes": string[], // subset of ["ocean","air","land_canada","land_mexico","land"]. [] = all.
  "affected_origins": string[],// country names or ISO-2 codes. [] = all origins.
  "affected_hts_chapters": string[], // 2-digit HTS chapters. [] = all.
  "change_type": one of ["tariff_rate","document_requirement","filing_deadline",
                          "examination_criteria","quota","embargo","de_minimis",
                          "marking_requirement","other"],
  "severity": one of ["critical","high","medium","low"],
  "summary": string,           // ≤120 chars, plain English
  "detail": string,            // verbatim relevant excerpt from the bulletin
  "action_required": string    // what the customs broker must do for affected shipments
}`;

// ─── Minimal XML parser for RSS <item> elements ───────────────────────────────

interface RssItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const inner = match[1];
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(inner);
      return m ? (m[1] ?? m[2] ?? "").trim() : "";
    };
    items.push({
      title: get("title"),
      description: get("description"),
      pubDate: get("pubDate"),
      link: get("link"),
    });
  }
  return items;
}

function itemIsRecent(pubDate: string, days: number): boolean {
  if (!pubDate) return false;
  const pub = new Date(pubDate);
  if (isNaN(pub.getTime())) return false;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return pub >= cutoff;
}

// ─── Call Claude claude-sonnet-4-6 to parse one bulletin ─────────────────────────────────

async function parseBulletin(
  anthropicKey: string,
  item: RssItem,
): Promise<Record<string, unknown> | null> {
  const prompt = `You are a senior licensed U.S. customs broker analyzing a CBP CSMS bulletin.
Extract a structured compliance rule change from the bulletin below.
Return ONLY a raw JSON object matching this schema — no markdown, no explanation:
${PARSE_SCHEMA}

If the bulletin contains no actionable rule change for a customs broker (e.g. it is an IT system notice, scheduled maintenance, or purely administrative), set "applicable": false and leave other fields empty.

BULLETIN TITLE: ${item.title}
BULLETIN DATE: ${item.pubDate}
BULLETIN URL: ${item.link}
BULLETIN BODY:
${item.description}`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error(`Claude API error ${resp.status}:`, err.substring(0, 300));
    return null;
  }

  const data = await resp.json();
  const text = data?.content?.[0]?.text ?? "";
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text.trim();
    return JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Claude response:", text.substring(0, 300));
    return null;
  }
}

// ─── Notify workspace owners whose active shipments are affected ───────────────

async function notifyAffectedShipments(
  supabase: ReturnType<typeof createClient>,
  ruleId: string,
  affectedOrigins: string[],
  transportModes: string[],
  summary: string,
  severity: string,
): Promise<number> {
  // Find active shipments matching origin/mode criteria
  let query = supabase
    .from("shipments")
    .select("id, workspace_id, shipment_number, country_of_origin, transport_mode")
    .in("status", ["active", "in_progress", "pending"]);

  if (affectedOrigins.length > 0) {
    query = query.in("country_of_origin", affectedOrigins);
  }
  if (transportModes.length > 0) {
    query = query.in("transport_mode", transportModes);
  }

  const { data: shipments, error } = await query;
  if (error || !shipments?.length) return 0;

  // Build notification rows — one per affected shipment
  const notifications = shipments.map((s: Record<string, unknown>) => ({
    workspace_id: s.workspace_id,
    shipment_id: s.id,
    type: "compliance_rule_change",
    severity,
    title: "Compliance Rule Update",
    message: `${summary} — Review shipment ${s.shipment_number} for compliance with this change.`,
    metadata: { compliance_rule_update_id: ruleId },
    read: false,
  }));

  const { error: notifyError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (notifyError) {
    console.error("Failed to insert notifications:", notifyError.message);
    return 0;
  }
  return notifications.length;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch CBP CSMS RSS feed
    console.log("[compliance-rules-updater] Fetching CBP CSMS RSS feed…");
    let rssXml: string;
    try {
      const rssResp = await fetch(CBP_CSMS_RSS, {
        headers: { "User-Agent": "OrchestraComplianceHub/1.0" },
      });
      if (!rssResp.ok) throw new Error(`RSS fetch failed: ${rssResp.status}`);
      rssXml = await rssResp.text();
    } catch (fetchErr) {
      console.error("CBP RSS unavailable:", fetchErr);
      // Non-fatal — return graceful response so cron doesn't back-off
      return new Response(JSON.stringify({ processed: 0, saved: 0, notified: 0, error: "CBP RSS unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Filter to recent items
    const allItems = parseRssItems(rssXml);
    const recentItems = allItems.filter(i => itemIsRecent(i.pubDate, LOOKBACK_DAYS));
    console.log(`[compliance-rules-updater] ${allItems.length} total items, ${recentItems.length} within ${LOOKBACK_DAYS} days`);

    // 3. Process each bulletin with Claude
    let saved = 0;
    let notified = 0;

    for (const item of recentItems) {
      // Skip if already stored (idempotency — match on source title)
      const { data: existing } = await supabase
        .from("compliance_rules_updates")
        .select("id")
        .eq("source", item.title)
        .maybeSingle();
      if (existing) {
        console.log(`[compliance-rules-updater] Already stored: ${item.title}`);
        continue;
      }

      const parsed = await parseBulletin(ANTHROPIC_API_KEY, item);
      if (!parsed || parsed.applicable === false) {
        console.log(`[compliance-rules-updater] Not applicable: ${item.title}`);
        continue;
      }

      // 4. Insert into compliance_rules_updates
      const row = {
        source: parsed.source || item.title,
        source_url: item.link || null,
        effective_date: parsed.effective_date || new Date().toISOString().slice(0, 10),
        transport_modes: Array.isArray(parsed.transport_modes) ? parsed.transport_modes : [],
        affected_origins: Array.isArray(parsed.affected_origins) ? parsed.affected_origins : [],
        affected_hts_chapters: Array.isArray(parsed.affected_hts_chapters) ? parsed.affected_hts_chapters : [],
        change_type: parsed.change_type || "other",
        severity: parsed.severity || "medium",
        summary: String(parsed.summary || "").slice(0, 500),
        detail: String(parsed.detail || ""),
        action_required: String(parsed.action_required || ""),
        parsed_by_model: CLAUDE_MODEL,
        confirmed: false,
      };

      const { data: insertedRow, error: insertErr } = await supabase
        .from("compliance_rules_updates")
        .insert(row)
        .select("id")
        .single();

      if (insertErr) {
        console.error(`Failed to insert rule for "${item.title}":`, insertErr.message);
        continue;
      }
      saved++;
      console.log(`[compliance-rules-updater] Saved rule: ${row.source}`);

      // 5. Notify affected shipments
      if (insertedRow?.id && (row.severity === "critical" || row.severity === "high")) {
        const count = await notifyAffectedShipments(
          supabase,
          insertedRow.id,
          row.affected_origins as string[],
          row.transport_modes as string[],
          row.summary,
          row.severity,
        );
        notified += count;
      }
    }

    console.log(`[compliance-rules-updater] Done. processed=${recentItems.length} saved=${saved} notified=${notified}`);

    return new Response(JSON.stringify({
      processed: recentItems.length,
      saved,
      notified,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[compliance-rules-updater] Fatal error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      processed: 0,
      saved: 0,
      notified: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
