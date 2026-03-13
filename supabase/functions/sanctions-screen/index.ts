import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entities, shipmentId, workspaceId } = await req.json();

    if (!entities?.length) {
      return new Response(
        JSON.stringify({ error: "No entities provided. Send an array of { name, type?, country? }." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a sanctions compliance screening expert. You check entity names against major international sanctions and restricted-party lists including:

- OFAC SDN (Specially Designated Nationals) & Consolidated Sanctions List (USA)
- EU Consolidated Financial Sanctions List
- UN Security Council Consolidated List
- UK HM Treasury Sanctions List
- Colombia DIAN/UIAF restricted entities

For each entity provided, determine if the name is a potential match (exact or fuzzy/alias) to any sanctioned or restricted entity. Consider:
- Exact name matches
- Common aliases, transliterations, and spelling variants
- Known shell companies or front organizations
- Partial name overlaps that warrant further review

Return your analysis using the tool provided. Be conservative: flag potential matches even if uncertain, but assign lower confidence to fuzzy matches.

IMPORTANT: Return match_confidence as a decimal between 0.0 and 1.0.`;

    const userPrompt = `Screen these entities for sanctions/restricted-party matches:\n${JSON.stringify(entities, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "sanctions_screening_result",
              description: "Return sanctions screening results for a batch of entities",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input_name: { type: "string", description: "The entity name that was screened" },
                        match_found: { type: "boolean" },
                        matched_entity: { type: "string", description: "Name on the sanctions list, if matched" },
                        list_source: {
                          type: "string",
                          enum: ["OFAC_SDN", "OFAC_CONSOLIDATED", "EU_SANCTIONS", "UN_SANCTIONS", "UK_SANCTIONS", "COLOMBIA_UIAF", "MULTIPLE", "NONE"],
                        },
                        match_type: {
                          type: "string",
                          enum: ["exact", "alias", "fuzzy", "partial", "none"],
                        },
                        match_confidence: { type: "number", description: "Confidence between 0.0 and 1.0" },
                        reason: { type: "string", description: "Explanation for the match or clearance" },
                        risk_level: { type: "string", enum: ["critical", "high", "medium", "low", "clear"] },
                        additional_info: { type: "string", description: "Any extra context (designation date, program, etc.)" },
                      },
                      required: ["input_name", "match_found", "list_source", "match_type", "match_confidence", "reason", "risk_level"],
                    },
                  },
                  summary: {
                    type: "object",
                    properties: {
                      total_screened: { type: "number" },
                      matches_found: { type: "number" },
                      critical_matches: { type: "number" },
                      high_matches: { type: "number" },
                      overall_risk: { type: "string", enum: ["clear", "low", "medium", "high", "critical"] },
                    },
                    required: ["total_screened", "matches_found", "critical_matches", "high_matches", "overall_risk"],
                  },
                },
                required: ["results", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "sanctions_screening_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No screening result returned from AI");

    const result = JSON.parse(toolCall.function.arguments);

    // --- Persist matches to sanctions_alerts ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date().toISOString();
    let alertsCreated = 0;
    const persistenceErrors: string[] = [];

    const normalizeConfidence = (c: number | undefined | null): number | null => {
      if (c == null) return null;
      return c > 1 ? c / 100 : c;
    };

    for (const r of result.results || []) {
      if (!r.match_found) continue;

      const { error: insertErr } = await adminClient.from("sanctions_alerts").insert({
        entity_name: r.matched_entity || r.input_name,
        shipment_id: shipmentId || null,
        workspace_id: workspaceId || null,
        match_type: r.match_type,
        match_confidence: normalizeConfidence(r.match_confidence),
        list_source: r.list_source,
        list_freshness: now,
        status: r.risk_level === "critical" ? "escalated" : "open",
      });

      if (insertErr) {
        console.error("Failed to persist sanctions alert for", r.input_name, insertErr);
        persistenceErrors.push(r.input_name);
      } else {
        alertsCreated++;
      }
    }

    // Audit event if tied to a shipment
    if (shipmentId) {
      await adminClient.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "sanctions_screening",
        description: `Sanctions screening completed: ${result.summary?.matches_found || 0} match(es) from ${result.summary?.total_screened || entities.length} entities`,
        attribution: "system",
        evidence_quality: "ai_generated",
        evidence_reference: "sanctions-screen edge function",
        metadata: {
          total_screened: result.summary?.total_screened,
          matches_found: result.summary?.matches_found,
          critical_matches: result.summary?.critical_matches,
          overall_risk: result.summary?.overall_risk,
        },
      });
    }

    result._persistence = {
      alerts_created: alertsCreated,
      errors: persistenceErrors.length > 0 ? persistenceErrors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sanctions-screen error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
