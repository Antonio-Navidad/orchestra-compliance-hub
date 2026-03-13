import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_EVENT_TYPES = [
  'shipment.created', 'shipment.updated', 'shipment.checkpoint_reached',
  'shipment.delivered', 'document.packet.validated', 'compliance.blocked',
  'eta.changed', 'decision_twin.evaluated', 'decision_twin.approval_requested',
  'decision_twin.approved', 'notification.failed',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    const action = body.action || 'dispatch'; // dispatch | process_queue | replay

    if (action === 'dispatch') {
      return await handleDispatch(supabase, body);
    } else if (action === 'process_queue') {
      return await handleProcessQueue(supabase, body);
    } else if (action === 'replay') {
      return await handleReplay(supabase, body);
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Make dispatch error:', error);

    // Log to integration error log
    try {
      await supabase.from('integration_error_log').insert({
        source: 'make-dispatch',
        error_message: error.message || 'Unknown error',
        payload: { raw: 'dispatch_handler_error' },
      });
    } catch (_) { /* best effort */ }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleDispatch(supabase: any, body: any) {
  const { event_type, workspace_id, shipment_id, data, idempotency_key } = body;

  if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
    return new Response(JSON.stringify({ error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const idemKey = idempotency_key || `${event_type}:${shipment_id || 'global'}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;

  // Check idempotency
  const { data: existingKey } = await supabase
    .from('idempotency_keys')
    .select('id, result')
    .eq('key', idemKey)
    .eq('scope', 'outbound')
    .maybeSingle();

  if (existingKey) {
    return new Response(JSON.stringify({ duplicate: true, result: existingKey.result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Persist event before dispatch
  const { data: event, error: insertError } = await supabase
    .from('outbound_event_queue')
    .insert({
      event_type,
      workspace_id: workspace_id || null,
      shipment_id: shipment_id || null,
      payload: {
        event_id: crypto.randomUUID(),
        event_type,
        workspace_id,
        shipment_id,
        occurred_at: new Date().toISOString(),
        version: 1,
        idempotency_key: idemKey,
        data: data || {},
      },
      idempotency_key: idemKey,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Record idempotency key
  await supabase.from('idempotency_keys').insert({
    key: idemKey,
    scope: 'outbound',
    result: { event_id: event.id },
  });

  // Attempt immediate dispatch
  const result = await attemptDispatch(supabase, event);

  return new Response(JSON.stringify({ event_id: event.id, status: result.status, idempotency_key: idemKey }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function attemptDispatch(supabase: any, event: any) {
  // Get workspace integration settings
  const { data: settings } = await supabase
    .from('workspace_integration_settings')
    .select('*')
    .eq('workspace_id', event.workspace_id)
    .eq('provider', 'make')
    .maybeSingle();

  if (!settings?.enabled || !settings?.webhook_url) {
    await supabase.from('outbound_event_queue')
      .update({ status: 'skipped', last_error: 'Integration not enabled or no webhook URL' })
      .eq('id', event.id);
    return { status: 'skipped' };
  }

  // Check event filters
  if (settings.event_filters?.length > 0 && !settings.event_filters.includes(event.event_type)) {
    await supabase.from('outbound_event_queue')
      .update({ status: 'filtered' })
      .eq('id', event.id);
    return { status: 'filtered' };
  }

  const startTime = Date.now();
  const attemptNum = (event.attempts || 0) + 1;

  try {
    const response = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lovable-Signature': await computeSignature(JSON.stringify(event.payload), settings.shared_secret || ''),
        'X-Lovable-Event-Type': event.event_type,
        'X-Lovable-Event-Id': event.id,
        'X-Lovable-Idempotency-Key': event.idempotency_key,
      },
      body: JSON.stringify(event.payload),
    });

    const durationMs = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');

    // Record delivery attempt
    await supabase.from('delivery_attempts').insert({
      event_id: event.id,
      attempt_number: attemptNum,
      status: response.ok ? 'success' : 'failed',
      http_status: response.status,
      response_body: responseText.slice(0, 2000),
      duration_ms: durationMs,
    });

    if (response.ok) {
      await supabase.from('outbound_event_queue')
        .update({ status: 'delivered', dispatched_at: new Date().toISOString(), attempts: attemptNum })
        .eq('id', event.id);

      // Update workspace last successful sync
      await supabase.from('workspace_integration_settings')
        .update({ last_successful_sync: new Date().toISOString(), health_status: 'healthy' })
        .eq('id', settings.id);

      // Record integration run
      await supabase.from('integration_runs').insert({
        workspace_id: event.workspace_id,
        scenario_name: settings.scenario_mapping?.[event.event_type] || 'default',
        event_type: event.event_type,
        status: 'completed',
        input_event_id: event.id,
        completed_at: new Date().toISOString(),
      });

      return { status: 'delivered' };
    } else {
      throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 500)}`);
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const retryPolicy = settings.retry_policy || { max_retries: 5, backoff_multiplier: 2, initial_delay_seconds: 30 };
    const canRetry = attemptNum < (event.max_retries || retryPolicy.max_retries);
    const nextRetryDelay = retryPolicy.initial_delay_seconds * Math.pow(retryPolicy.backoff_multiplier, attemptNum - 1);
    const nextRetryAt = canRetry ? new Date(Date.now() + nextRetryDelay * 1000).toISOString() : null;

    await supabase.from('delivery_attempts').insert({
      event_id: event.id,
      attempt_number: attemptNum,
      status: 'failed',
      error_message: error.message,
      duration_ms: durationMs,
    });

    await supabase.from('outbound_event_queue')
      .update({
        status: canRetry ? 'retrying' : 'dead_letter',
        attempts: attemptNum,
        last_error: error.message,
        next_retry_at: nextRetryAt,
      })
      .eq('id', event.id);

    if (!canRetry) {
      await supabase.from('integration_error_log').insert({
        workspace_id: event.workspace_id,
        source: 'make-dispatch',
        event_type: event.event_type,
        event_id: event.id,
        error_code: 'MAX_RETRIES_EXCEEDED',
        error_message: `Failed after ${attemptNum} attempts: ${error.message}`,
        payload: event.payload,
      });

      await supabase.from('workspace_integration_settings')
        .update({ last_failed_sync: new Date().toISOString(), health_status: 'degraded' })
        .eq('id', settings.id);
    }

    return { status: canRetry ? 'retrying' : 'dead_letter' };
  }
}

async function handleProcessQueue(supabase: any, body: any) {
  const batchSize = body.batch_size || 10;

  // Get events ready for retry
  const { data: events, error } = await supabase
    .from('outbound_event_queue')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!events?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const results = [];
  for (const event of events) {
    const result = await attemptDispatch(supabase, event);
    results.push({ event_id: event.id, ...result });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleReplay(supabase: any, body: any) {
  const { event_ids } = body;
  if (!event_ids?.length) {
    return new Response(JSON.stringify({ error: 'event_ids required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Reset events to pending for replay
  const { error } = await supabase
    .from('outbound_event_queue')
    .update({ status: 'pending', attempts: 0, next_retry_at: null, last_error: null })
    .in('id', event_ids);

  if (error) throw error;

  return new Response(JSON.stringify({ replayed: event_ids.length }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function computeSignature(payload: string, secret: string): Promise<string> {
  if (!secret) return 'unsigned';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
