import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shipments, userRole, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a Colombia customs and DIAN (Dirección de Impuestos y Aduanas Nacionales) compliance expert. Analyze shipments involving Colombia for customs compliance issues.

You understand Colombian import/export regulations, DIAN filing requirements, tariff schedules, value declaration rules, certificate of origin requirements, IVA (VAT) implications, and common customs hold triggers at Colombian ports.

For each shipment, evaluate from the perspective of a "${userRole || "compliance team"}" and return structured analysis using the tool provided.

Focus on:
- HS code accuracy for Colombian customs (arancel de aduanas)
- Value declaration consistency (declaración de valor)
- Required documents for DIAN filing
- IVA/tariff calculation correctness
- Certificate of origin requirements for trade agreements (TLC)
- Common rejection/hold reasons at Colombian ports
- Importer/exporter profile completeness
- Peso/USD conversion issues
- Sanctioned entity screening (consignee, shipper, exporter names)`;

    const userPrompt = `Analyze these shipments for Colombia/DIAN compliance:\n${JSON.stringify(shipments, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "dian_compliance_analysis",
            description: "Return DIAN/Colombia compliance analysis for shipments",
            parameters: {
              type: "object",
              properties: {
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      shipment_id: { type: "string" },
                      category: { type: "string", enum: ["likely_hold", "likely_rejection", "missing_fields", "valuation_mismatch", "packet_inconsistency", "tariff_error", "certificate_missing", "iva_issue", "sanctions_match"] },
                      severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      recommendation: { type: "string" },
                      dian_reference: { type: "string" },
                      confidence: { type: "number" },
                      entity_name: { type: "string", description: "Name of matched sanctioned entity, if applicable" },
                    },
                    required: ["shipment_id", "category", "severity", "title", "description", "recommendation", "confidence"],
                  },
                },
                summary: {
                  type: "object",
                  properties: {
                    total_issues: { type: "number" },
                    critical_count: { type: "number" },
                    high_count: { type: "number" },
                    overall_risk: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    top_recommendation: { type: "string" },
                  },
                  required: ["total_issues", "critical_count", "high_count", "overall_risk", "top_recommendation"],
                },
              },
              required: ["issues", "summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "dian_compliance_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    const result = JSON.parse(toolCall.function.arguments);

    // --- Persist findings to compliance_checks and sanctions_alerts ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (result.issues?.length) {
      // Group issues by shipment_id
      const issuesByShipment = new Map<string, typeof result.issues>();
      for (const issue of result.issues) {
        if (!issue.shipment_id) continue;
        if (!issuesByShipment.has(issue.shipment_id)) {
          issuesByShipment.set(issue.shipment_id, []);
        }
        issuesByShipment.get(issue.shipment_id)!.push(issue);
      }

      for (const [shipmentId, issues] of issuesByShipment) {
        // Determine overall severity for this shipment
        const hasCritical = issues.some((i: any) => i.severity === "critical");
        const hasHigh = issues.some((i: any) => i.severity === "high");
        const overallSeverity = hasCritical ? "critical" : hasHigh ? "high" : "warning";
        const overallStatus = hasCritical ? "blocked" : hasHigh ? "caution" : "cleared";

        // Insert compliance_check record
        const { error: checkErr } = await adminClient
          .from("compliance_checks")
          .insert({
            shipment_id: shipmentId,
            workspace_id: workspaceId || null,
            check_type: "dian_compliance",
            severity: overallSeverity,
            status: overallStatus,
            findings: issues,
            source_freshness: new Date().toISOString(),
            checked_at: new Date().toISOString(),
          });

        if (checkErr) console.error("Failed to persist compliance check:", checkErr);

        // Insert sanctions_alerts for any sanctions matches
        const sanctionsIssues = issues.filter((i: any) => i.category === "sanctions_match" && i.entity_name);
        for (const si of sanctionsIssues) {
          const { error: sanctionErr } = await adminClient
            .from("sanctions_alerts")
            .insert({
              shipment_id: shipmentId,
              workspace_id: workspaceId || null,
              entity_name: si.entity_name,
              match_type: "ai_screening",
              match_confidence: si.confidence ? si.confidence / 100 : null,
              list_source: "DIAN/Colombia AI screening",
              list_freshness: new Date().toISOString(),
              status: "open",
            });

          if (sanctionErr) console.error("Failed to persist sanctions alert:", sanctionErr);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dian-compliance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
