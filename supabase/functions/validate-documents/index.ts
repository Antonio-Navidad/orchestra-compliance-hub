import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documents, shipmentMode, originCountry, destinationCountry, hsCode, declaredValue, shipmentId, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const docSummary = (documents || []).map((d: any, i: number) =>
      `Document ${i + 1}: Type=${d.type}, Name=${d.name}, Fields=${JSON.stringify(d.extractedFields || {})}`
    ).join("\n");

    const userPrompt = `Validate this shipment document packet for customs compliance.

Transport Mode: ${shipmentMode || "N/A"}
Origin Country: ${originCountry || "N/A"}
Destination Country: ${destinationCountry || "N/A"}
HS Code: ${hsCode || "N/A"}
Declared Value: ${declaredValue || "N/A"}

Documents provided:
${docSummary || "No documents uploaded yet."}

Analyze completeness and consistency.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert customs document validator. Analyze document packets for completeness, consistency, and compliance. Identify missing documents, mismatches between documents, and potential customs issues. Be specific and actionable.`
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_packet",
              description: "Return the document validation result.",
              parameters: {
                type: "object",
                properties: {
                  completenessScore: { type: "number", description: "0-100 packet completeness score" },
                  consistencyScore: { type: "number", description: "0-100 cross-document consistency score" },
                  overallReadiness: { type: "string", enum: ["ready", "needs_attention", "not_ready", "critical"] },
                  missingDocuments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        documentType: { type: "string" },
                        importance: { type: "string", enum: ["required", "recommended", "optional"] },
                        reason: { type: "string" }
                      },
                      required: ["documentType", "importance", "reason"]
                    }
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        field: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" }
                      },
                      required: ["severity", "field", "description", "suggestion"]
                    }
                  },
                  countryRequirements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Country-specific requirements for this shipment"
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top recommendations to improve the packet"
                  }
                },
                required: ["completenessScore", "consistencyScore", "overallReadiness", "missingDocuments", "issues", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_packet" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a validation result");

    const result = JSON.parse(toolCall.function.arguments);

    // Persist to document_packets + document_issues
    if (shipmentId) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const readinessMap: Record<string, string> = {
        ready: "ready",
        needs_attention: "incomplete",
        not_ready: "incomplete",
        critical: "inconsistent",
      };

      const { data: packet, error: packetErr } = await adminClient
        .from("document_packets")
        .insert({
          shipment_id: shipmentId,
          workspace_id: workspaceId || null,
          status: readinessMap[result.overallReadiness] || "draft",
          completeness_score: result.completenessScore / 100,
          filing_readiness_score: result.consistencyScore / 100,
          country_requirements: {
            requirements: result.countryRequirements || [],
            missingDocuments: result.missingDocuments || [],
            recommendations: result.recommendations || [],
          },
        })
        .select("id")
        .single();

      if (packetErr) {
        console.error("Failed to persist document packet:", packetErr);
      } else if (packet && result.issues?.length) {
        const issueRows = result.issues.map((issue: any) => ({
          packet_id: packet.id,
          issue_type: "validation",
          severity: issue.severity,
          field_name: issue.field,
          description: issue.description,
          suggestion: issue.suggestion,
        }));

        const { error: issueErr } = await adminClient
          .from("document_issues")
          .insert(issueRows);

        if (issueErr) console.error("Failed to persist document issues:", issueErr);

        result.packetId = packet.id;
      }

      // Update shipment packet_score
      const { error: shipErr } = await adminClient
        .from("shipments")
        .update({ packet_score: result.completenessScore })
        .eq("shipment_id", shipmentId);

      if (shipErr) console.error("Failed to update shipment packet_score:", shipErr);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-documents error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
