import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shipment, invoices, manifests, documents, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Analyze this shipment and produce a comprehensive Decision Twin evaluation.

SHIPMENT DATA:
- ID: ${shipment?.shipment_id || "N/A"}
- Mode: ${shipment?.mode || "N/A"}
- Status: ${shipment?.status || "N/A"}
- HS Code: ${shipment?.hs_code || "N/A"}
- Description: ${shipment?.description || "N/A"}
- Declared Value: $${shipment?.declared_value || 0}
- Consignee: ${shipment?.consignee || "N/A"}
- Shipper: ${shipment?.shipper || "N/A"}
- Origin: ${shipment?.origin_country || "N/A"}
- Destination: ${shipment?.destination_country || "N/A"}
- Jurisdiction: ${shipment?.jurisdiction_code || "US"}
- Direction: ${shipment?.direction || "inbound"}
- Assigned Broker: ${shipment?.assigned_broker || "None"}
- Risk Score: ${shipment?.risk_score || 0}
- Risk Notes: ${shipment?.risk_notes || "None"}
- Filing Readiness: ${shipment?.filing_readiness || "unknown"}
- Packet Score: ${shipment?.packet_score || 0}
- COO Status: ${shipment?.coo_status || "unknown"}
- Incoterm: ${shipment?.incoterm || "N/A"}
- Port of Entry: ${shipment?.port_of_entry || "N/A"}
- Planned Departure: ${shipment?.planned_departure || "N/A"}
- Estimated Arrival: ${shipment?.estimated_arrival || "N/A"}

INVOICES: ${JSON.stringify(invoices || [])}
MANIFESTS: ${JSON.stringify(manifests || [])}
DOCUMENTS UPLOADED: ${JSON.stringify((documents || []).map((d: any) => ({ type: d.document_type, name: d.file_name })))}

User view mode: ${mode || "enterprise"}

Produce a thorough Decision Twin analysis with scenarios, probabilities, and prescriptive actions.`;

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
            content: `You are a Shipment Decision Twin — an AI logistics intelligence engine that simulates shipment outcomes before execution. You analyze all available shipment data to produce readiness scores, clearance probabilities, risk assessments, scenario comparisons, and prescriptive actions. Be specific, quantitative, and actionable. Never be vague. Always explain your reasoning.`
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_decision_twin",
              description: "Generate a complete Decision Twin evaluation for the shipment.",
              parameters: {
                type: "object",
                properties: {
                  readinessScore: { type: "number", description: "0-100 overall shipment readiness" },
                  readinessState: { type: "string", enum: ["ready_to_proceed", "proceed_with_caution", "revise_before_dispatch", "escalate_for_review", "high_risk_do_not_proceed"], description: "Prescriptive state" },
                  clearanceProbability: { type: "number", description: "0-100 likelihood of clearing customs" },
                  delayProbability: { type: "number", description: "0-100 likelihood of delay" },
                  holdProbability: { type: "number", description: "0-100 likelihood of customs hold" },
                  predictedLandedCost: { type: "string", description: "Estimated landed cost range e.g. '$12,500 - $14,200'" },
                  predictedArrival: { type: "string", description: "Predicted arrival window e.g. 'Mar 20-23, 2026'" },
                  etaConfidence: { type: "number", description: "0-100 confidence in ETA prediction" },
                  mostLikelyFailurePoint: { type: "string", description: "The single biggest risk to this shipment" },
                  topRecommendation: { type: "string", description: "The #1 recommended action" },
                  bestAlternate: { type: "string", description: "The best alternative if top recommendation isn't feasible" },
                  reasoning: { type: "string", description: "Plain-language explanation of the overall assessment" },
                  scenarios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "e.g. 'Cheapest Route', 'Safest Route'" },
                        rank: { type: "number" },
                        routeSummary: { type: "string" },
                        landedCost: { type: "string" },
                        arrivalWindow: { type: "string" },
                        holdProbability: { type: "number" },
                        docRisk: { type: "string", enum: ["low", "medium", "high"] },
                        complianceRisk: { type: "string", enum: ["low", "medium", "high"] },
                        complexityScore: { type: "number", description: "1-10 operational complexity" },
                        explanation: { type: "string" }
                      },
                      required: ["label", "rank", "routeSummary", "landedCost", "arrivalWindow", "holdProbability", "docRisk", "complianceRisk", "complexityScore", "explanation"]
                    },
                    description: "3-5 route/strategy scenarios ranked by recommendation"
                  },
                  corrections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "number", description: "1 = highest priority" },
                        action: { type: "string" },
                        impact: { type: "string", description: "What improves if this is done" },
                        category: { type: "string", enum: ["risk_reduction", "speed_improvement", "cost_reduction", "compliance", "documentation"] }
                      },
                      required: ["priority", "action", "impact", "category"]
                    },
                    description: "Top corrective actions before dispatch"
                  },
                  riskFactors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string" },
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        description: { type: "string" }
                      },
                      required: ["factor", "severity", "description"]
                    }
                  },
                  confidenceDrivers: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key factors that drive the confidence level"
                  }
                },
                required: ["readinessScore", "readinessState", "clearanceProbability", "delayProbability", "holdProbability", "predictedLandedCost", "predictedArrival", "etaConfidence", "mostLikelyFailurePoint", "topRecommendation", "bestAlternate", "reasoning", "scenarios", "corrections", "riskFactors", "confidenceDrivers"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_decision_twin" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
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
    if (!toolCall) throw new Error("AI did not return a Decision Twin result");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decision-twin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
