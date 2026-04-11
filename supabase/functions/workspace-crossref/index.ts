import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRulesForMode,
  getApplicableAlerts,
  buildCheckInstructions,
} from "./complianceRules.ts";
// ── Inlined AI client (cross-directory imports fail at runtime on Supabase) ──
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getGatewayKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

async function callGateway(model: string, messages: object[], maxTokens: number, apiKey: string): Promise<string | null> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gateway error (${model}): ${res.status} — ${err.substring(0, 300)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

async function callAIText(opts: { systemPrompt: string; userMessage: string; anthropicModel: string; lovableModel: string; maxTokens?: number }): Promise<string | null> {
  const { systemPrompt, userMessage, anthropicModel, lovableModel, maxTokens = 4096 } = opts;
  const apiKey = getGatewayKey();
  const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }];
  try {
    return await callGateway(anthropicModel, messages, maxTokens, apiKey);
  } catch (primaryErr) {
    console.warn(`Primary model (${anthropicModel}) failed, trying fallback:`, primaryErr);
    return await callGateway(lovableModel, messages, maxTokens, apiKey);
  }
}
// ── End inlined AI client ─────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    const { documents, shipmentMode, commodityType, countryOfOrigin, declaredValueUsd, shipmentId } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return new Response(JSON.stringify({ discrepancies: [], message: "Need at least 2 documents to cross-reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve mode-specific compliance rules ────────────────────────────────
    const modeRules = getRulesForMode(shipmentMode || "ocean");
    const docTypes = documents.map((d: any) => d.document_type as string);

    // Filter pairs down to only those where both documents are present
    const applicablePairs = modeRules.documentPairs.filter(
      p => docTypes.includes(p.documentA) && docTypes.includes(p.documentB)
    );

    if (applicablePairs.length === 0) {
      return new Response(JSON.stringify({ discrepancies: [], message: "No applicable cross-reference pairs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build document summaries ──────────────────────────────────────────────
    const docSummaries = documents.map((d: any) =>
      `=== ${d.document_type.toUpperCase().replace(/_/g, " ")} ===\n${JSON.stringify(d.extracted_data, null, 2)}`
    ).join("\n\n");

    // ── Build field-level check instructions from typed rules ─────────────────
    const checkInstructions = buildCheckInstructions(applicablePairs, docTypes);

    // ── 2025 tariff alerts applicable to this shipment ────────────────────────
    const alerts = getApplicableAlerts(countryOfOrigin, commodityType, declaredValueUsd);
    const alertsSection = alerts.length > 0
      ? `\n\n2025 TARIFF / COMPLIANCE ALERTS FOR THIS SHIPMENT:\n${alerts.map(a =>
          `[${a.severity.toUpperCase()}] ${a.message} (${a.regulation}, effective ${a.effectiveDate})`
        ).join("\n")}`
      : "";

    // ── System prompt ─────────────────────────────────────────────────────────
    const systemPrompt = `You are a senior licensed U.S. customs broker performing document cross-reference verification for CBP compliance.

YOUR ONLY JOB: Find actual discrepancies between documents.

STRICT OUTPUT RULES:
1. Return ONLY findings where values DIFFER or are MISSING.
2. NEVER return a finding when values match. If they match, skip that field entirely.
3. NEVER return a finding with "no action needed", "matches", "consistent", or "no discrepancy" in the finding text. Those are not findings.
4. NEVER include a finding just to confirm something is correct.
5. Each finding must state the ACTUAL VALUE from each document and WHY it is a problem.
6. If a field is null, not stated, zero, or absent in EITHER document, it is NOT a finding — skip it entirely. Only flag when BOTH documents contain an explicit non-null value AND those values differ.
7. Zero quantity on a packing list line item is always a CRITICAL finding.
8. Country of origin mismatches between any two documents are always CRITICAL.
9. Each field listing includes an "EXPLICIT SKIP" list — NEVER flag any field on that skip list regardless of what you observe.

SEVERITY RULES:
- critical: Will cause CBP hold, entry rejection, or $5,000+ penalty if unfiled/uncorrected
- high: Will likely cause CBP exam or delay, or affects duty calculation
- medium: May cause questions or documentation requests
- low: Minor wording difference, low risk

Return ONLY a raw JSON array. No markdown. No explanation. No preamble. Just the array.`;

    const userPrompt = `Shipment context: ${modeRules.displayName} import, commodity: ${commodityType || "general goods"}, origin: ${countryOfOrigin || "unknown"}.${alertsSection}

ENTRY NOTES FOR THIS MODE:
${modeRules.entryNotes.map(n => `- ${n}`).join("\n")}

DOCUMENTS TO COMPARE:
${docSummaries}

FIELDS TO CHECK (check EACH field listed — only report if there is an actual difference):
${checkInstructions}

Return format — ONLY include a row when you find an actual mismatch or missing required value:
[{
  "severity": "critical" | "high" | "medium" | "low",
  "document_a": "snake_case document type, e.g. commercial_invoice, packing_list, bill_of_lading",
  "document_b": "snake_case document type, e.g. commercial_invoice, packing_list, bill_of_lading",
  "field_checked": "exact field name from the check list above",
  "finding": "precise description stating the actual value in document A and the actual value in document B and why this is a problem",
  "recommendation": "specific actionable step to resolve this before filing",
  "estimated_financial_impact_usd": 0
}]

If ALL fields match across ALL pairs, return an empty array: []
Do not return any field that matches. Do not explain your reasoning. Return only the JSON array.`;

    // ── Call AI (Anthropic preferred, Lovable fallback) ────────────────────────
    const messageContent = await callAIText({
      systemPrompt,
      userMessage: userPrompt,
      anthropicModel: "claude-sonnet-4-5",
      lovableModel: "google/gemini-2.5-flash",
      maxTokens: 4096,
    });
    if (!messageContent) throw new Error("AI returned empty response");

    let discrepancies: any[];
    try {
      // Strip markdown fences if present
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent.trim();
      discrepancies = JSON.parse(jsonStr);
      if (!Array.isArray(discrepancies)) discrepancies = [];

      // Normalize document_a / document_b to snake_case
      const toSnakeCase = (s: string) =>
        (s || "").trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
      discrepancies = discrepancies.map((d: any) => ({
        ...d,
        document_a: toSnakeCase(d.document_a),
        document_b: toSnakeCase(d.document_b),
      }));

      // Strip findings where either value is null/absent — always false positives
      discrepancies = discrepancies.filter((d: any) => {
        if (!d.finding) return false;
        const f = d.finding.toLowerCase();
        return !f.includes("not stated") && !f.includes("not present") &&
               !f.includes(" null") && !f.includes("not provided") &&
               !f.includes("not listed") && !f.includes("not found") &&
               !f.includes("not included") && !f.includes("n/a");
      });

      // Strip any passing checks the model snuck in
      discrepancies = discrepancies.filter((d: any) => {
        if (!d.finding) return false;
        const text = (d.finding + " " + (d.recommendation || "")).toLowerCase();
        const isPassingCheck = (
          text.includes("no action needed") ||
          text.includes("no discrepancy") ||
          text.includes("matches — no action") ||
          text.includes("values match") ||
          text.includes("consistent across") ||
          (text.includes("match") && text.includes("no") && !text.includes("mismatch"))
        );
        return !isPassingCheck;
      });

      // Strip findings on explicit skip fields defined by the rule set
      const skipIndex: Record<string, Set<string>> = {};
      for (const pair of applicablePairs) {
        const key = `${pair.documentA}__${pair.documentB}`;
        const keyRev = `${pair.documentB}__${pair.documentA}`;
        skipIndex[key] = new Set(pair.explicitSkipFields);
        skipIndex[keyRev] = new Set(pair.explicitSkipFields);
      }
      discrepancies = discrepancies.filter((d: any) => {
        const key = `${d.document_a}__${d.document_b}`;
        const skipSet = skipIndex[key];
        if (!skipSet) return true;
        const field = (d.field_checked || "").toLowerCase();
        return !skipSet.has(field);
      });

    } catch (parseErr) {
      console.error("Failed to parse crossref response:", messageContent.substring(0, 500));
      discrepancies = [];
    }

    // ── Append recent compliance rule change warnings ──────────────────────────
    // Look up compliance_rules_updates from the last 30 days that match this shipment.
    // These are returned as supplemental warnings (not crossref findings) so the broker
    // is aware of regulatory changes that may require re-filing or amendment.
    const complianceWarnings: any[] = [];
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        let rulesQuery = supabase
          .from("compliance_rules_updates")
          .select("id, source, severity, summary, action_required, effective_date, transport_modes, affected_origins")
          .gte("effective_date", since)
          .order("effective_date", { ascending: false });

        const { data: recentRules } = await rulesQuery;

        if (recentRules) {
          const mode = (shipmentMode || "ocean").toLowerCase();
          const origin = (countryOfOrigin || "").toLowerCase();

          for (const rule of recentRules) {
            const modesMatch = !rule.transport_modes?.length ||
              rule.transport_modes.some((m: string) => m.toLowerCase() === mode || m.toLowerCase() === "all");
            const originMatch = !rule.affected_origins?.length ||
              rule.affected_origins.some((o: string) => o.toLowerCase() === origin || o.toLowerCase() === "all");

            if (modesMatch && originMatch) {
              complianceWarnings.push({
                type: "regulatory_update",
                source: rule.source,
                severity: rule.severity,
                summary: rule.summary,
                action_required: rule.action_required,
                effective_date: rule.effective_date,
              });
            }
          }
        }
      }
    } catch (rulesErr) {
      // Non-fatal — log but don't fail the crossref run
      console.error("[workspace-crossref] Failed to fetch compliance rule updates:", rulesErr);
    }

    console.log(`[workspace-crossref] Found ${discrepancies.length} discrepancies across ${applicablePairs.length} pairs, ${complianceWarnings.length} regulatory warnings`);

    return new Response(JSON.stringify({
      discrepancies,
      compliance_warnings: complianceWarnings,
      pairs_checked: applicablePairs.length,
      documents_analyzed: documents.length,
      mode: modeRules.displayName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("workspace-crossref error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      discrepancies: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
