import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const action = body.action;
    const workspaceId = body.workspace_id;

    if (!workspaceId) {
      return jsonResponse({ error: 'workspace_id required' }, 400);
    }

    switch (action) {
      case 'status':
        return await getIntegrationStatus(supabase, workspaceId);
      case 'failed_events':
        return await getFailedEvents(supabase, workspaceId, body);
      case 'connector_health':
        return await getConnectorHealth(supabase, workspaceId);
      case 'logs':
        return await getLogs(supabase, workspaceId, body);
      case 'replay_queue':
        return await getReplayQueue(supabase, workspaceId);
      case 'reconciliation_status':
        return await getReconciliationStatus(supabase, workspaceId);
      case 'delivery_history':
        return await getDeliveryHistory(supabase, body.event_id);
      case 'resolve_error':
        return await resolveError(supabase, body.error_id, body.resolved_by);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    console.error('Make admin error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

async function getIntegrationStatus(supabase: any, workspaceId: string) {
  // Fetch everything in parallel
  const [settingsRes, outboundRes, inboundRes, errorsRes, healthRes, replayRes, runsRes] = await Promise.all([
    supabase.from('workspace_integration_settings').select('*')
      .eq('workspace_id', workspaceId).eq('provider', 'make').maybeSingle(),
    supabase.from('outbound_event_queue').select('status', { count: 'exact' })
      .eq('workspace_id', workspaceId),
    supabase.from('inbound_webhook_log').select('processing_status', { count: 'exact' })
      .eq('workspace_id', workspaceId),
    supabase.from('integration_error_log').select('id', { count: 'exact' })
      .eq('workspace_id', workspaceId).eq('resolved', false),
    supabase.from('connector_health_status').select('*')
      .eq('workspace_id', workspaceId),
    supabase.from('replay_queue').select('replay_status', { count: 'exact' })
      .eq('workspace_id', workspaceId).in('replay_status', ['requested', 'awaiting_review']),
    supabase.from('integration_runs').select('status', { count: 'exact' })
      .eq('workspace_id', workspaceId),
  ]);

  // Compute outbound stats
  const outboundEvents = outboundRes.data || [];
  const outboundStats = {
    total: outboundRes.count || 0,
    queued: outboundEvents.filter((e: any) => e.status === 'queued').length,
    delivered: outboundEvents.filter((e: any) => e.status === 'delivered').length,
    retrying: outboundEvents.filter((e: any) => e.status === 'failed_retryable').length,
    terminal: outboundEvents.filter((e: any) => e.status === 'failed_terminal').length,
    filtered: outboundEvents.filter((e: any) => e.status === 'filtered').length,
    skipped: outboundEvents.filter((e: any) => e.status === 'skipped').length,
  };

  const inboundEvents = inboundRes.data || [];
  const inboundStats = {
    total: inboundRes.count || 0,
    processed: inboundEvents.filter((e: any) => e.processing_status === 'processed').length,
    rejected: inboundEvents.filter((e: any) => e.processing_status === 'rejected').length,
    duplicate: inboundEvents.filter((e: any) => e.processing_status === 'duplicate').length,
    errors: inboundEvents.filter((e: any) => e.processing_status === 'error').length,
  };

  return jsonResponse({
    settings: settingsRes.data,
    outbound: outboundStats,
    inbound: inboundStats,
    unresolved_errors: errorsRes.count || 0,
    connector_health: healthRes.data || [],
    pending_replays: replayRes.count || 0,
    total_runs: runsRes.count || 0,
  });
}

async function getFailedEvents(supabase: any, workspaceId: string, body: any) {
  const limit = Math.min(body.limit || 50, 100);
  const { data, error } = await supabase
    .from('outbound_event_queue')
    .select('*, delivery_attempts(id, attempt_number, status, http_status, error_message, duration_ms, created_at)')
    .eq('workspace_id', workspaceId)
    .in('status', ['failed_terminal', 'failed_retryable'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return jsonResponse({ events: data || [] });
}

async function getConnectorHealth(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('connector_health_status')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('connector_name');

  if (error) throw error;
  return jsonResponse({ connectors: data || [] });
}

async function getLogs(supabase: any, workspaceId: string, body: any) {
  const direction = body.direction || 'both';
  const limit = Math.min(body.limit || 50, 200);
  const results: any = {};

  if (direction === 'outbound' || direction === 'both') {
    const { data } = await supabase
      .from('outbound_event_queue')
      .select('id, event_type, status, shipment_id, correlation_id, created_at, dispatched_at, attempts, last_error')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    results.outbound = data || [];
  }

  if (direction === 'inbound' || direction === 'both') {
    const { data } = await supabase
      .from('inbound_webhook_log')
      .select('id, callback_type, processing_status, signature_valid, shipment_id, source_name, created_at, error_message')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    results.inbound = data || [];
  }

  return jsonResponse(results);
}

async function getReplayQueue(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('replay_queue')
    .select('*, outbound_event_queue:failed_event_id(event_type, shipment_id, last_error, attempts)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return jsonResponse({ queue: data || [] });
}

async function getReconciliationStatus(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('reconciliation_jobs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return jsonResponse({ jobs: data || [] });
}

async function getDeliveryHistory(supabase: any, eventId: string) {
  if (!eventId) return jsonResponse({ error: 'event_id required' }, 400);

  const { data, error } = await supabase
    .from('delivery_attempts')
    .select('*')
    .eq('event_id', eventId)
    .order('attempt_number');

  if (error) throw error;
  return jsonResponse({ attempts: data || [] });
}

async function resolveError(supabase: any, errorId: string, resolvedBy: string) {
  if (!errorId) return jsonResponse({ error: 'error_id required' }, 400);

  const { error } = await supabase
    .from('integration_error_log')
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: resolvedBy || null })
    .eq('id', errorId);

  if (error) throw error;
  return jsonResponse({ resolved: true });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
