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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse optional config from body
    let maxBatchSize = 5;
    let staleThresholdMinutes = 60;
    try {
      const body = await req.json();
      if (body.max_batch_size) maxBatchSize = Math.min(body.max_batch_size, 10);
      if (body.stale_threshold_minutes) staleThresholdMinutes = body.stale_threshold_minutes;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // 1. Find stale twins older than threshold
    const cutoff = new Date(Date.now() - staleThresholdMinutes * 60 * 1000).toISOString();

    const { data: staleTwins, error: queryErr } = await adminClient
      .from("decision_twins")
      .select("id, shipment_id, workspace_id, stale_at")
      .eq("status", "stale")
      .lt("stale_at", cutoff)
      .order("stale_at", { ascending: true })
      .limit(maxBatchSize);

    if (queryErr) {
      console.error("Failed to query stale twins:", queryErr);
      throw new Error("Failed to query stale twins");
    }

    if (!staleTwins || staleTwins.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale twins to re-evaluate", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${staleTwins.length} stale twin(s) to re-evaluate`);

    const results: Array<{ shipment_id: string; status: string; error?: string }> = [];

    for (const twin of staleTwins) {
      try {
        // Mark as queued to prevent concurrent re-evaluation
        await adminClient
          .from("decision_twins")
          .update({ status: "queued" })
          .eq("id", twin.id);

        // Gather shipment data for the decision-twin function
        const { data: shipment } = await adminClient
          .from("shipments")
          .select("*")
          .eq("shipment_id", twin.shipment_id)
          .single();

        if (!shipment) {
          console.error(`Shipment ${twin.shipment_id} not found, skipping`);
          results.push({ shipment_id: twin.shipment_id, status: "skipped", error: "shipment_not_found" });
          continue;
        }

        // Skip closed/delivered shipments
        if (["cleared", "closed_avoided", "closed_incident"].includes(shipment.status)) {
          // Mark twin as evaluated (no need to re-run for closed shipments)
          await adminClient
            .from("decision_twins")
            .update({ status: "evaluated" })
            .eq("id", twin.id);
          results.push({ shipment_id: twin.shipment_id, status: "skipped_closed" });
          continue;
        }

        // Gather supporting data
        const [invoicesRes, manifestsRes, docsRes] = await Promise.all([
          adminClient.from("invoices").select("*").eq("shipment_id", twin.shipment_id),
          adminClient.from("manifests").select("*").eq("shipment_id", twin.shipment_id),
          adminClient
            .from("shipment_documents")
            .select("document_type, file_name")
            .eq("shipment_id", twin.shipment_id)
            .eq("is_current", true),
        ]);

        // Invoke the decision-twin function
        const fnUrl = `${SUPABASE_URL}/functions/v1/decision-twin`;
        const response = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            shipment,
            invoices: invoicesRes.data || [],
            manifests: manifestsRes.data || [],
            documents: docsRes.data || [],
            mode: "enterprise",
            workspaceId: twin.workspace_id,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Decision twin failed for ${twin.shipment_id}:`, response.status, errText);

          // Revert to stale if failed (so it can be retried next cycle)
          await adminClient
            .from("decision_twins")
            .update({ status: "stale" })
            .eq("id", twin.id);

          results.push({
            shipment_id: twin.shipment_id,
            status: "failed",
            error: `HTTP ${response.status}`,
          });
          continue;
        }

        results.push({ shipment_id: twin.shipment_id, status: "re-evaluated" });
        console.log(`Successfully re-evaluated twin for ${twin.shipment_id}`);
      } catch (err) {
        console.error(`Error processing twin for ${twin.shipment_id}:`, err);

        // Revert to stale
        await adminClient
          .from("decision_twins")
          .update({ status: "stale" })
          .eq("id", twin.id);

        results.push({
          shipment_id: twin.shipment_id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const summary = {
      processed: results.length,
      re_evaluated: results.filter((r) => r.status === "re-evaluated").length,
      skipped: results.filter((r) => r.status.startsWith("skipped")).length,
      failed: results.filter((r) => r.status === "failed" || r.status === "error").length,
      results,
    };

    console.log("Stale twin re-evaluation summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reeval-stale-twins error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
