import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { origin, destination, mode, priority, cargoType, shipmentValue, weightKg, deadline, incoterm, shipmentId, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const systemPrompt = `You are an expert logistics route planner and freight advisor. Given origin, destination, transport mode, and priority, recommend optimal shipping routes.

Return a JSON response using the tool provided. Generate 3 route scenarios ranked by the user's priority. Each route must include realistic port/airport names, transit times, cost estimates, and risk assessments based on real-world shipping knowledge.

Consider:
- Major shipping lanes and hub ports
- Typical transit times for the mode
- Customs processing times at borders
- Weather and congestion patterns
- Carrier availability on the lane
- Sanctions/compliance risks for the corridor`;

    const userPrompt = `Plan routes for:
Origin: ${origin}
Destination: ${destination}
Mode: ${mode}
Priority: ${priority}
Cargo: ${cargoType || "General cargo"}
Value: ${shipmentValue ? `$${shipmentValue}` : "Not specified"}
Weight: ${weightKg ? `${weightKg} kg` : "Not specified"}
Deadline: ${deadline || "Flexible"}
Incoterm: ${incoterm || "Not specified"}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "route_recommendation",
              description: "Return route recommendations with scenarios",
              parameters: {
                type: "object",
                properties: {
                  recommended_route: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      summary: { type: "string" },
                      legs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            from: { type: "string" },
                            to: { type: "string" },
                            mode: { type: "string" },
                            carrier_suggestion: { type: "string" },
                            transit_days: { type: "number" },
                            notes: { type: "string" },
                          },
                          required: ["from", "to", "mode", "transit_days"],
                        },
                      },
                      total_transit_days: { type: "number" },
                      estimated_cost_usd_min: { type: "number" },
                      estimated_cost_usd_max: { type: "number" },
                      eta_confidence: { type: "number" },
                      customs_hold_risk: { type: "number" },
                      route_risk: { type: "number" },
                      delay_risk: { type: "number" },
                      explanation: { type: "string" },
                    },
                    required: ["label", "summary", "legs", "total_transit_days", "estimated_cost_usd_min", "estimated_cost_usd_max", "eta_confidence", "customs_hold_risk", "route_risk", "delay_risk", "explanation"],
                  },
                  alternate_routes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        summary: { type: "string" },
                        legs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              from: { type: "string" },
                              to: { type: "string" },
                              mode: { type: "string" },
                              carrier_suggestion: { type: "string" },
                              transit_days: { type: "number" },
                              notes: { type: "string" },
                            },
                            required: ["from", "to", "mode", "transit_days"],
                          },
                        },
                        total_transit_days: { type: "number" },
                        estimated_cost_usd_min: { type: "number" },
                        estimated_cost_usd_max: { type: "number" },
                        eta_confidence: { type: "number" },
                        customs_hold_risk: { type: "number" },
                        route_risk: { type: "number" },
                        delay_risk: { type: "number" },
                        explanation: { type: "string" },
                      },
                      required: ["label", "summary", "legs", "total_transit_days"],
                    },
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                  },
                  predicted_arrival_window: { type: "string" },
                  confidence_summary: { type: "string" },
                },
                required: ["recommended_route", "alternate_routes", "predicted_arrival_window", "confidence_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "route_recommendation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No route recommendation returned");

    const result = JSON.parse(toolCall.function.arguments);

    // Persist to route_recommendations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const allRoutes = [result.recommended_route, ...(result.alternate_routes || [])];
    const options = allRoutes.map((r: any, i: number) => ({
      label: r.label,
      summary: r.summary,
      legs: r.legs,
      total_transit_days: r.total_transit_days,
      estimated_cost_usd_min: r.estimated_cost_usd_min,
      estimated_cost_usd_max: r.estimated_cost_usd_max,
      eta_confidence: r.eta_confidence,
      customs_hold_risk: r.customs_hold_risk,
      route_risk: r.route_risk,
      delay_risk: r.delay_risk,
      explanation: r.explanation,
      rank: i + 1,
    }));

    const avgConfidence = options.reduce((sum: number, o: any) => sum + (o.eta_confidence || 50), 0) / Math.max(options.length, 1);

    const { data: rec, error: recErr } = await adminClient
      .from("route_recommendations")
      .insert({
        shipment_id: shipmentId || null,
        workspace_id: workspaceId || null,
        mode: mode || "sea",
        origin: typeof origin === "string" ? { label: origin } : origin,
        destination: typeof destination === "string" ? { label: destination } : destination,
        priority: priority || "balanced",
        options,
        confidence: avgConfidence / 100,
        selected_option_index: 0,
        constraints: { cargoType, shipmentValue, weightKg, deadline, incoterm },
        ai_model_version: "google/gemini-3-flash-preview",
      })
      .select("id")
      .single();

    if (recErr) {
      console.error("Failed to persist route recommendation:", recErr);
    } else {
      result.recommendationId = rec?.id;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("route-builder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
