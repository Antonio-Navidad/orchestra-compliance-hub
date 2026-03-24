import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/nlmxidbv5ys5eo2bhs28bi923nsdgw65";

  const payload = {
    event_id: "evt_test_001",
    event_type: "integration.test",
    occurred_at: "2026-03-13T00:00:00Z",
    workspace_id: "ws_demo",
    correlation_id: "corr_test_001",
    idempotency_key: "integration.test:ws_demo:001",
    data: {
      message: "Hello from Lovable"
    }
  };

  try {
    console.log("Sending test payload to Make.com:", JSON.stringify(payload));

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    console.log("Make.com response:", res.status, body);

    return new Response(JSON.stringify({
      ok: true,
      make_status: res.status,
      make_response: body,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Make.com test ping failed:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
