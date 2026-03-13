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

    if (!shipments?.length) {
      return new Response(JSON.stringify({ error: "No shipments provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
- Sanctioned entity screening (consignee, shipper, exporter names)

IMPORTANT: Return confidence as a decimal between 0.0 and 1.0 (not a percentage).`;

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
                      confidence: { type: "number", description: "Confidence between 0.0 and 1.0" },
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

    // --- Persist findings ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date().toISOString();
    const allShipmentIds = shipments.map((s: any) => s.shipment_id).filter(Boolean);

    // Normalize confidence: if AI returns > 1, treat as percentage
    const normalizeConfidence = (c: number | undefined | null): number | null => {
      if (c == null) return null;
      return c > 1 ? c / 100 : c;
    };

    // Group issues by shipment_id
    const issuesByShipment = new Map<string, any[]>();
    for (const issue of result.issues || []) {
      if (!issue.shipment_id) continue;
      if (!issuesByShipment.has(issue.shipment_id)) {
        issuesByShipment.set(issue.shipment_id, []);
      }
      issuesByShipment.get(issue.shipment_id)!.push(issue);
    }

    const persistenceErrors: string[] = [];

    // Persist compliance checks for ALL analyzed shipments (including cleared ones)
    for (const shipmentId of allShipmentIds) {
      const issues = issuesByShipment.get(shipmentId) || [];
      const hasCritical = issues.some((i: any) => i.severity === "critical");
      const hasHigh = issues.some((i: any) => i.severity === "high");
      const hasMedium = issues.some((i: any) => i.severity === "medium");

      let status: string;
      let severity: string;
      if (hasCritical) {
        status = "blocked";
        severity = "critical";
      } else if (hasHigh) {
        status = "caution";
        severity = "high";
      } else if (hasMedium) {
        status = "caution";
        severity = "warning";
      } else if (issues.length > 0) {
        status = "cleared";
        severity = "info";
      } else {
        status = "cleared";
        severity = "info";
      }

      const { error: checkErr } = await adminClient
        .from("compliance_checks")
        .insert({
          shipment_id: shipmentId,
          workspace_id: workspaceId || null,
          check_type: "dian_compliance",
          severity,
          status,
          findings: issues.length > 0 ? issues : [{ note: "No DIAN compliance issues found" }],
          source_freshness: now,
          checked_at: now,
        });

      if (checkErr) {
        console.error("Failed to persist compliance check for", shipmentId, checkErr);
        persistenceErrors.push(`compliance_check:${shipmentId}`);
      }

      // Persist sanctions alerts for any sanctions matches
      const sanctionsIssues = issues.filter((i: any) => i.category === "sanctions_match" && i.entity_name);
      for (const si of sanctionsIssues) {
        const { error: sanctionErr } = await adminClient
          .from("sanctions_alerts")
          .insert({
            shipment_id: shipmentId,
            workspace_id: workspaceId || null,
            entity_name: si.entity_name,
            match_type: "ai_screening",
            match_confidence: normalizeConfidence(si.confidence),
            list_source: "DIAN/Colombia AI screening",
            list_freshness: now,
            status: "open",
          });

        if (sanctionErr) {
          console.error("Failed to persist sanctions alert for", shipmentId, si.entity_name, sanctionErr);
          persistenceErrors.push(`sanctions_alert:${shipmentId}:${si.entity_name}`);
        }
      }

      // Record audit event for this compliance check
      const { error: eventErr } = await adminClient
        .from("shipment_events")
        .insert({
          shipment_id: shipmentId,
          event_type: "compliance_check",
          description: `DIAN compliance check completed: ${status} (${issues.length} issue${issues.length !== 1 ? "s" : ""})`,
          attribution: "system",
          confidence_level: normalizeConfidence(
            issues.length > 0
              ? issues.reduce((sum: number, i: any) => sum + (i.confidence || 0), 0) / issues.length
              : 1.0
          ),
          evidence_quality: "ai_generated",
          evidence_reference: "dian-compliance edge function",
          metadata: {
            check_type: "dian_compliance",
            status,
            severity,
            issue_count: issues.length,
            sanctions_matches: sanctionsIssues.length,
          },
        });

      if (eventErr) {
        console.error("Failed to persist shipment event for", shipmentId, eventErr);
      }
    }

    // Attach persistence metadata to response
    result._persistence = {
      compliance_checks_created: allShipmentIds.length,
      sanctions_alerts_created: (result.issues || []).filter((i: any) => i.category === "sanctions_match" && i.entity_name).length,
      audit_events_created: allShipmentIds.length,
      errors: persistenceErrors.length > 0 ? persistenceErrors : undefined,
    };

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
