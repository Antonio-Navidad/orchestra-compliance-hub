import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * record-outcome — Captures actual shipment outcomes and computes prediction accuracy.
 *
 * Payload: {
 *   shipment_id: string,
 *   twin_id?: string,
 *   actual_clearance_result: "cleared" | "held" | "delayed" | "rejected",
 *   actual_delivery_date?: string (ISO),
 *   actual_landed_cost?: number,
 *   actual_delays?: { reason: string, duration_hours: number }[],
 *   actual_issues?: { type: string, description: string }[],
 *   actual_route_used?: string,
 *   workspace_id?: string,
 *   validated_by?: string,
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      shipment_id,
      twin_id,
      actual_clearance_result,
      actual_delivery_date,
      actual_landed_cost,
      actual_delays,
      actual_issues,
      actual_route_used,
      workspace_id,
      validated_by,
    } = payload;

    if (!shipment_id || !actual_clearance_result) {
      return new Response(
        JSON.stringify({ error: "shipment_id and actual_clearance_result are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the most recent twin for this shipment if not provided
    let effectiveTwinId = twin_id;
    if (!effectiveTwinId) {
      const { data: twins } = await adminClient
        .from("decision_twins")
        .select("id")
        .eq("shipment_id", shipment_id)
        .order("created_at", { ascending: false })
        .limit(1);
      effectiveTwinId = twins?.[0]?.id || null;
    }

    // Compute prediction accuracy if we have a twin
    let predictionAccuracy = null;
    if (effectiveTwinId) {
      const { data: twin } = await adminClient
        .from("decision_twins")
        .select("*")
        .eq("id", effectiveTwinId)
        .single();

      if (twin) {
        const wasHeld = actual_clearance_result === "held";
        const wasCleared = actual_clearance_result === "cleared";
        const hadDelays = actual_delays && actual_delays.length > 0;

        predictionAccuracy = {
          hold_prediction_correct:
            twin.hold_probability !== null
              ? (twin.hold_probability > 0.5) === wasHeld
              : null,
          clearance_prediction_correct:
            twin.clearance_probability !== null
              ? (twin.clearance_probability > 0.5) === wasCleared
              : null,
          delay_prediction_correct:
            twin.delay_probability !== null
              ? (twin.delay_probability > 0.5) === hadDelays
              : null,
          readiness_state: twin.readiness_state,
          readiness_score: twin.readiness_score,
          confidence: twin.confidence,
          evaluated_at: twin.evaluated_at,
        };

        // ETA accuracy
        if (actual_delivery_date && twin.eta_range) {
          const etaRange = twin.eta_range as any;
          const actualDate = new Date(actual_delivery_date).getTime();
          const earliest = etaRange.earliest ? new Date(etaRange.earliest).getTime() : null;
          const latest = etaRange.latest ? new Date(etaRange.latest).getTime() : null;

          if (earliest && latest) {
            const midpoint = (earliest + latest) / 2;
            const rangeWidth = latest - earliest;
            const deviation = Math.abs(actualDate - midpoint);
            const etaAccuracy = Math.max(0, 1 - deviation / Math.max(rangeWidth, 86400000));
            (predictionAccuracy as any).eta_accuracy = Math.round(etaAccuracy * 100) / 100;
            (predictionAccuracy as any).eta_within_range =
              actualDate >= earliest && actualDate <= latest;
          }
        }

        // Cost accuracy
        if (actual_landed_cost && twin.landed_cost_range) {
          const costRange = twin.landed_cost_range as any;
          if (costRange.min && costRange.max) {
            const midpoint = (costRange.min + costRange.max) / 2;
            const costAccuracy = Math.max(0, 1 - Math.abs(actual_landed_cost - midpoint) / midpoint);
            (predictionAccuracy as any).cost_accuracy = Math.round(costAccuracy * 100) / 100;
            (predictionAccuracy as any).cost_within_range =
              actual_landed_cost >= costRange.min && actual_landed_cost <= costRange.max;
          }
        }
      }
    }

    // Insert outcome record
    const { data: outcome, error: insertErr } = await adminClient
      .from("outcome_records")
      .insert({
        shipment_id,
        twin_id: effectiveTwinId,
        actual_clearance_result,
        actual_delivery_date: actual_delivery_date || null,
        actual_landed_cost: actual_landed_cost || null,
        actual_delays: actual_delays || null,
        actual_issues: actual_issues || null,
        actual_route_used: actual_route_used || null,
        prediction_accuracy: predictionAccuracy,
        workspace_id: workspace_id || null,
        validated: !!validated_by,
        validated_by: validated_by || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to insert outcome:", insertErr);
      throw new Error("Failed to record outcome");
    }

    return new Response(
      JSON.stringify({
        outcome_id: outcome?.id,
        twin_id: effectiveTwinId,
        prediction_accuracy: predictionAccuracy,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("record-outcome error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
