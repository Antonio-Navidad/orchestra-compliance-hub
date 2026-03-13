import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { shipment_id, workspaceId } = await req.json();
    if (!shipment_id) {
      return new Response(
        JSON.stringify({ error: "shipment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Gather shipment data
    const { data: shipment, error: shipErr } = await adminClient
      .from("shipments")
      .select("*")
      .eq("shipment_id", shipment_id)
      .single();
    if (shipErr || !shipment) throw new Error("Shipment not found: " + shipment_id);

    // 2. Gather route recommendation
    const { data: routes } = await adminClient
      .from("route_recommendations")
      .select("*")
      .eq("shipment_id", shipment_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestRoute = routes?.[0] || null;

    // 3. Gather compliance checks
    const { data: compliance } = await adminClient
      .from("compliance_checks")
      .select("check_type, status, severity")
      .eq("shipment_id", shipment_id)
      .order("checked_at", { ascending: false })
      .limit(5);

    // 4. Gather active delay signals for relevant locations
    const relevantLocations = [
      shipment.port_of_entry,
      shipment.origin_country,
      shipment.destination_country,
    ].filter(Boolean);

    let delaySignals: any[] = [];
    if (relevantLocations.length > 0) {
      const { data: signals } = await adminClient
        .from("delay_signals")
        .select("*")
        .or(
          relevantLocations.map((l: string) => `location.ilike.%${l}%`).join(",") +
          "," +
          relevantLocations.map((l: string) => `location_code.eq.${l}`).join(",")
        )
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      delaySignals = signals || [];
    }

    // 5. Gather prior ETA prediction for chaining
    const { data: priorETAs } = await adminClient
      .from("eta_predictions")
      .select("id, predicted_earliest, predicted_latest, confidence, created_at")
      .eq("shipment_id", shipment_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const priorETA = priorETAs?.[0] || null;

    // 6. Build AI prompt
    const systemPrompt = `You are a logistics ETA prediction expert. Given shipment details, route information, compliance status, and active delay signals, predict the arrival time window.

Consider:
- Transport mode and typical transit times
- Route complexity (number of legs, transshipment points)
- Compliance status (blocks or cautions may cause customs delays)
- Active delay signals (weather, congestion, strikes, holidays)
- Origin and destination country pair
- Port of entry processing times
- Historical patterns for similar shipments

Return predictions as ISO 8601 timestamps. Confidence is 0.0 to 1.0.
Each factor should describe a specific influence on the ETA with its impact in hours (positive = delay, negative = faster).`;

    const inputSnapshot = {
      shipment: {
        shipment_id: shipment.shipment_id,
        mode: shipment.mode,
        origin_country: shipment.origin_country,
        destination_country: shipment.destination_country,
        port_of_entry: shipment.port_of_entry,
        planned_departure: shipment.planned_departure,
        estimated_arrival: shipment.estimated_arrival,
        status: shipment.status,
        hs_code: shipment.hs_code,
        declared_value: shipment.declared_value,
        incoterm: shipment.incoterm,
      },
      route: latestRoute
        ? {
            mode: latestRoute.mode,
            origin: latestRoute.origin,
            destination: latestRoute.destination,
            options: latestRoute.options,
            selected_option_index: latestRoute.selected_option_index,
          }
        : null,
      compliance: compliance || [],
      delay_signals: delaySignals.map((s: any) => ({
        signal_type: s.signal_type,
        location: s.location,
        severity: s.severity,
        confidence: s.confidence,
        description: s.description,
        expires_at: s.expires_at,
      })),
      prior_eta: priorETA
        ? {
            predicted_earliest: priorETA.predicted_earliest,
            predicted_latest: priorETA.predicted_latest,
            confidence: priorETA.confidence,
          }
        : null,
      current_time: new Date().toISOString(),
    };

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Predict the ETA for this shipment:\n${JSON.stringify(inputSnapshot, null, 2)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "eta_prediction",
                description: "Return ETA prediction with factors and confidence",
                parameters: {
                  type: "object",
                  properties: {
                    predicted_earliest: {
                      type: "string",
                      description: "ISO 8601 earliest predicted arrival",
                    },
                    predicted_latest: {
                      type: "string",
                      description: "ISO 8601 latest predicted arrival",
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence 0.0 to 1.0",
                    },
                    factors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          factor: { type: "string" },
                          impact_hours: { type: "number", description: "Positive = delay, negative = faster" },
                          source: { type: "string" },
                          confidence: { type: "number" },
                        },
                        required: ["factor", "impact_hours"],
                      },
                      description: "Factors influencing the prediction",
                    },
                    explanation: {
                      type: "string",
                      description: "Plain-English summary of the prediction",
                    },
                  },
                  required: [
                    "predicted_earliest",
                    "predicted_latest",
                    "confidence",
                    "factors",
                    "explanation",
                  ],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "eta_prediction" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      if (response.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No prediction returned");

    const prediction = JSON.parse(toolCall.function.arguments);

    // Normalize confidence
    const normalizeConf = (c: number | null | undefined) => {
      if (c == null) return null;
      return c > 1 ? c / 100 : c;
    };

    // 7. Persist to eta_predictions
    const { data: inserted, error: insertErr } = await adminClient
      .from("eta_predictions")
      .insert({
        shipment_id,
        workspace_id: workspaceId || shipment.workspace_id || null,
        predicted_earliest: prediction.predicted_earliest,
        predicted_latest: prediction.predicted_latest,
        confidence: normalizeConf(prediction.confidence),
        factors: prediction.factors || [],
        model_version: "google/gemini-3-flash-preview",
        route_version_id: latestRoute?.id || null,
        prior_prediction_id: priorETA?.id || null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to persist ETA prediction:", insertErr);
    }

    // 8. Audit event
    await adminClient.from("shipment_events").insert({
      shipment_id,
      event_type: "eta_prediction",
      description: `ETA predicted: ${prediction.predicted_earliest?.slice(0, 10)} to ${prediction.predicted_latest?.slice(0, 10)} (confidence: ${Math.round((normalizeConf(prediction.confidence) || 0) * 100)}%)`,
      attribution: "system",
      confidence_level: normalizeConf(prediction.confidence),
      evidence_quality: "ai_generated",
      evidence_reference: "eta-predict edge function",
      metadata: {
        prediction_id: inserted?.id,
        factors_count: prediction.factors?.length || 0,
        delay_signals_count: delaySignals.length,
        has_prior: !!priorETA,
      },
    });

    // Return enriched response
    return new Response(
      JSON.stringify({
        ...prediction,
        prediction_id: inserted?.id,
        prior_prediction_id: priorETA?.id || null,
        delay_signals_used: delaySignals.length,
        route_version_id: latestRoute?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("eta-predict error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
