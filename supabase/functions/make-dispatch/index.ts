import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_EVENT_TYPES = [
  // Shipment events
  'shipment.created', 'shipment.updated', 'shipment.status_changed',
  'shipment.checkpoint_reached', 'shipment.delivered',
  // Document events
  'document.packet.created', 'document.packet.validated',
  'document.packet.incomplete', 'document.issue.created',
  // Classification events
  'product.classification.completed', 'product.classification.accepted',
  'product.classification.overridden',
  // Route events
  'route.generated', 'route.selected', 'route.changed',
  // Compliance events
  'compliance.check.completed', 'compliance.blocked', 'compliance.escalated',
  // ETA events
  'eta.generated', 'eta.changed',
  // Decision Twin events
  'decision_twin.evaluated', 'decision_twin.state_changed',
  'decision_twin.approval_requested', 'decision_twin.approved', 'decision_twin.rejected',
  // Approval events
  'approval.requested', 'approval.completed',
  // Notification events
  'notification.requested', 'notification.failed',
  // Outcome events
  'shipment.actual_outcome_captured',
];

// Scenario group mapping for Make.com routing
const EVENT_SCENARIO_GROUPS: Record<string, string> = {
  'shipment.created': 'ops_crm_sync',
  'shipment.updated': 'ops_crm_sync',
  'shipment.status_changed': 'ops_crm_sync',
  'shipment.checkpoint_reached': 'tracking_ingestion',
  'shipment.delivered': 'ops_crm_sync',
  'document.packet.created': 'ops_crm_sync',
  'document.packet.validated': 'ops_crm_sync',
  'document.packet.incomplete': 'notification_fanout',
  'document.issue.created': 'notification_fanout',
  'product.classification.completed': 'ops_crm_sync',
  'product.classification.accepted': 'ops_crm_sync',
  'product.classification.overridden': 'notification_fanout',
  'route.generated': 'ops_crm_sync',
  'route.selected': 'ops_crm_sync',
  'route.changed': 'notification_fanout',
  'compliance.check.completed': 'compliance_refresh',
  'compliance.blocked': 'notification_fanout',
  'compliance.escalated': 'notification_fanout',
  'eta.generated': 'ops_crm_sync',
  'eta.changed': 'notification_fanout',
  'decision_twin.evaluated': 'notification_fanout',
  'decision_twin.state_changed': 'notification_fanout',
  'decision_twin.approval_requested': 'notification_fanout',
  'decision_twin.approved': 'ops_crm_sync',
  'decision_twin.rejected': 'notification_fanout',
  'approval.requested': 'notification_fanout',
  'approval.completed': 'ops_crm_sync',
  'notification.requested': 'notification_fanout',
  'notification.failed': 'notification_fanout',
  'shipment.actual_outcome_captured': 'reconciliation',
};

// Errors that should NOT be retried
const PERMANENT_ERROR_CODES = [400, 401, 403, 404, 422];

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
    const action = body.action || 'dispatch';

    switch (action) {
      case 'dispatch':
        return await handleDispatch(supabase, body);
      case 'process_queue':
        return await handleProcessQueue(supabase, body);
      case 'replay':
        return await handleReplay(supabase, body);
      case 'bulk_dispatch':
        return await handleBulkDispatch(supabase, body);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Make dispatch error:', error);
    await logError(supabase, null, 'make-dispatch', null, 'DISPATCH_HANDLER_ERROR', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── DISPATCH ─────────────────────────────────────────────────

async function handleDispatch(supabase: any, body: any) {
  const {
    event_type, workspace_id, shipment_id, data,
    idempotency_key, correlation_id, actor_id, severity,
    related_object_type, related_object_id, metadata,
  } = body;

  if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
    return jsonResponse({ error: `Invalid event_type. Valid: ${VALID_EVENT_TYPES.join(', ')}` }, 400);
  }

  const idemKey = idempotency_key || generateIdempotencyKey(event_type, shipment_id);
  const corrId = correlation_id || crypto.randomUUID();

  // Check idempotency
  const { data: existingKey } = await supabase
    .from('idempotency_keys')
    .select('id, result')
    .eq('key', idemKey)
    .eq('scope', 'outbound')
    .maybeSingle();

  if (existingKey) {
    return jsonResponse({ duplicate: true, idempotency_key: idemKey, result: existingKey.result });
  }

  // Build normalized payload
  const eventId = crypto.randomUUID();
  const normalizedPayload = {
    event_id: eventId,
    event_type,
    occurred_at: new Date().toISOString(),
    version: 1,
    workspace_id: workspace_id || null,
    shipment_id: shipment_id || null,
    actor_id: actor_id || null,
    severity: severity || deriveSeverity(event_type),
    idempotency_key: idemKey,
    correlation_id: corrId,
    scenario_group: EVENT_SCENARIO_GROUPS[event_type] || 'generic',
    data: data || {},
    metadata: metadata || {},
  };

  // Persist event before dispatch (write-ahead)
  const { data: event, error: insertError } = await supabase
    .from('outbound_event_queue')
    .insert({
      event_type,
      workspace_id: workspace_id || null,
      shipment_id: shipment_id || null,
      payload: normalizedPayload,
      idempotency_key: idemKey,
      correlation_id: corrId,
      related_object_type: related_object_type || null,
      related_object_id: related_object_id || null,
      actor_id: actor_id || null,
      severity: severity || deriveSeverity(event_type),
      metadata: metadata || {},
      status: 'queued',
      queued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Record idempotency key
  await supabase.from('idempotency_keys').insert({
    key: idemKey,
    scope: 'outbound',
    result: { event_id: event.id, event_type },
  });

  // Attempt immediate dispatch
  const result = await attemptDispatch(supabase, event);

  return jsonResponse({
    event_id: event.id,
    status: result.status,
    idempotency_key: idemKey,
    correlation_id: corrId,
  });
}

// ─── DISPATCH ATTEMPT ─────────────────────────────────────────

async function attemptDispatch(supabase: any, event: any): Promise<{ status: string }> {
  // Check for automation endpoint first, then fall back to workspace settings
  const { data: endpoint } = await supabase
    .from('automation_endpoints')
    .select('*')
    .eq('workspace_id', event.workspace_id)
    .eq('event_type', event.event_type)
    .eq('is_enabled', true)
    .maybeSingle();

  // Fall back to workspace-level settings
  const { data: settings } = await supabase
    .from('workspace_integration_settings')
    .select('*')
    .eq('workspace_id', event.workspace_id)
    .eq('provider', 'make')
    .maybeSingle();

  if (!settings?.enabled) {
    await updateEventStatus(supabase, event.id, 'skipped', 'Integration not enabled');
    return { status: 'skipped' };
  }

  const webhookUrl = endpoint?.make_webhook_url_ref || settings?.webhook_url;
  if (!webhookUrl) {
    await updateEventStatus(supabase, event.id, 'skipped', 'No webhook URL configured');
    return { status: 'skipped' };
  }

  // Check event filters
  if (settings.event_filters?.length > 0 && !settings.event_filters.includes(event.event_type)) {
    await updateEventStatus(supabase, event.id, 'filtered');
    return { status: 'filtered' };
  }

  const retryPolicy = endpoint?.retry_policy || settings?.retry_policy ||
    { max_retries: 5, backoff_multiplier: 2, initial_delay_seconds: 30 };
  const maxRetries = retryPolicy.max_retries || 5;
  const attemptNum = (event.attempts || 0) + 1;

  // Update status to dispatching
  await updateEventStatus(supabase, event.id, 'dispatching');

  const startTime = Date.now();
  try {
    const payloadStr = JSON.stringify(event.payload);
    const signature = await computeSignature(payloadStr, settings.shared_secret || '');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lovable-Signature': signature,
        'X-Lovable-Event-Type': event.event_type,
        'X-Lovable-Event-Id': event.id,
        'X-Lovable-Idempotency-Key': event.idempotency_key,
        'X-Lovable-Correlation-Id': event.correlation_id || '',
        'X-Lovable-Scenario-Group': EVENT_SCENARIO_GROUPS[event.event_type] || 'generic',
      },
      body: payloadStr,
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

      // Update connector health
      await updateConnectorHealth(supabase, event.workspace_id, 'make_outbound', true);

      // Update workspace last successful sync
      await supabase.from('workspace_integration_settings')
        .update({ last_successful_sync: new Date().toISOString(), health_status: 'healthy' })
        .eq('workspace_id', event.workspace_id)
        .eq('provider', 'make');

      // Record integration run
      await supabase.from('integration_runs').insert({
        workspace_id: event.workspace_id,
        scenario_name: settings.scenario_mapping?.[event.event_type] || endpoint?.scenario_name || 'default',
        event_type: event.event_type,
        status: 'completed',
        input_event_id: event.id,
        completed_at: new Date().toISOString(),
      });

      return { status: 'delivered' };
    } else {
      const isPermanent = PERMANENT_ERROR_CODES.includes(response.status);
      throw new DispatchError(
        `HTTP ${response.status}: ${responseText.slice(0, 500)}`,
        isPermanent ? 'failed_terminal' : 'failed_retryable',
        response.status
      );
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const failureType = error instanceof DispatchError ? error.failureType : 'failed_retryable';
    const canRetry = failureType === 'failed_retryable' && attemptNum < maxRetries;

    const nextRetryDelay = retryPolicy.initial_delay_seconds *
      Math.pow(retryPolicy.backoff_multiplier, attemptNum - 1);
    const nextRetryAt = canRetry ? new Date(Date.now() + nextRetryDelay * 1000).toISOString() : null;

    // Record failed delivery attempt
    await supabase.from('delivery_attempts').insert({
      event_id: event.id,
      attempt_number: attemptNum,
      status: 'failed',
      http_status: error instanceof DispatchError ? error.httpStatus : null,
      error_message: error.message,
      duration_ms: durationMs,
    });

    const newStatus = canRetry ? 'failed_retryable' : 'failed_terminal';
    await supabase.from('outbound_event_queue')
      .update({
        status: newStatus,
        attempts: attemptNum,
        last_error: error.message,
        next_retry_at: nextRetryAt,
      })
      .eq('id', event.id);

    if (!canRetry) {
      // Dead letter → error log + replay queue
      await logError(supabase, event.workspace_id, 'make-dispatch', event.event_type,
        'MAX_RETRIES_EXCEEDED', `Failed after ${attemptNum} attempts: ${error.message}`, event.id, event.payload);

      // Auto-create replay queue entry
      await supabase.from('replay_queue').insert({
        failed_event_id: event.id,
        event_type: event.event_type,
        workspace_id: event.workspace_id,
        replay_status: 'awaiting_review',
      });

      await updateConnectorHealth(supabase, event.workspace_id, 'make_outbound', false, error.message);

      await supabase.from('workspace_integration_settings')
        .update({ last_failed_sync: new Date().toISOString(), health_status: 'degraded' })
        .eq('workspace_id', event.workspace_id)
        .eq('provider', 'make');
    }

    return { status: newStatus };
  }
}

// ─── PROCESS QUEUE ────────────────────────────────────────────

async function handleProcessQueue(supabase: any, body: any) {
  const batchSize = Math.min(body.batch_size || 10, 50);

  const { data: events, error } = await supabase
    .from('outbound_event_queue')
    .select('*')
    .in('status', ['queued', 'pending', 'failed_retryable'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!events?.length) return jsonResponse({ processed: 0 });

  const results = [];
  for (const event of events) {
    const result = await attemptDispatch(supabase, event);
    results.push({ event_id: event.id, event_type: event.event_type, ...result });
  }

  return jsonResponse({
    processed: results.length,
    delivered: results.filter(r => r.status === 'delivered').length,
    retrying: results.filter(r => r.status === 'failed_retryable').length,
    terminal: results.filter(r => r.status === 'failed_terminal').length,
    results,
  });
}

// ─── REPLAY ───────────────────────────────────────────────────

async function handleReplay(supabase: any, body: any) {
  const { event_ids, replay_queue_ids, requested_by } = body;
  const ids = event_ids || [];

  // Also resolve replay queue entries
  if (replay_queue_ids?.length) {
    const { data: replayEntries } = await supabase
      .from('replay_queue')
      .select('failed_event_id')
      .in('id', replay_queue_ids);

    if (replayEntries) {
      ids.push(...replayEntries.map((r: any) => r.failed_event_id).filter(Boolean));
      await supabase.from('replay_queue')
        .update({ replay_status: 'replaying', replayed_at: new Date().toISOString() })
        .in('id', replay_queue_ids);
    }
  }

  if (!ids.length) return jsonResponse({ error: 'No event_ids or replay_queue_ids provided' }, 400);

  // Reset events for re-dispatch
  const { error } = await supabase
    .from('outbound_event_queue')
    .update({
      status: 'queued',
      attempts: 0,
      next_retry_at: null,
      last_error: null,
      dispatched_at: null,
    })
    .in('id', ids);

  if (error) throw error;

  // Process immediately
  const results = [];
  for (const id of ids) {
    const { data: event } = await supabase
      .from('outbound_event_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (event) {
      const result = await attemptDispatch(supabase, event);
      results.push({ event_id: id, ...result });

      // Update replay queue status
      if (replay_queue_ids?.length) {
        const status = result.status === 'delivered' ? 'completed' : 'failed';
        await supabase.from('replay_queue')
          .update({
            replay_status: status,
            result: result,
            error_message: result.status !== 'delivered' ? 'Replay dispatch failed' : null,
          })
          .eq('failed_event_id', id);
      }
    }
  }

  return jsonResponse({ replayed: results.length, results });
}

// ─── BULK DISPATCH ────────────────────────────────────────────

async function handleBulkDispatch(supabase: any, body: any) {
  const { events } = body;
  if (!events?.length) return jsonResponse({ error: 'events array required' }, 400);

  const syncJobId = crypto.randomUUID();
  await supabase.from('sync_jobs').insert({
    id: syncJobId,
    workspace_id: events[0]?.workspace_id,
    job_type: 'bulk_dispatch',
    direction: 'outbound',
    source_system: 'lovable',
    target_system: 'make',
    status: 'running',
    total_events: events.length,
    started_at: new Date().toISOString(),
    correlation_id: body.correlation_id || crypto.randomUUID(),
  });

  const results = [];
  let processed = 0;
  let failed = 0;

  for (const evt of events) {
    try {
      const res = await handleDispatch(supabase, evt);
      const resBody = await res.json();
      results.push({ event_type: evt.event_type, ...resBody });
      processed++;
    } catch (e) {
      results.push({ event_type: evt.event_type, error: e.message });
      failed++;
    }
  }

  await supabase.from('sync_jobs')
    .update({
      status: failed === events.length ? 'failed' : 'completed',
      processed_events: processed,
      failed_events: failed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', syncJobId);

  return jsonResponse({ sync_job_id: syncJobId, total: events.length, processed, failed, results });
}

// ─── HELPERS ──────────────────────────────────────────────────

class DispatchError extends Error {
  failureType: string;
  httpStatus: number | null;
  constructor(message: string, failureType: string, httpStatus?: number) {
    super(message);
    this.failureType = failureType;
    this.httpStatus = httpStatus || null;
  }
}

function generateIdempotencyKey(eventType: string, shipmentId?: string): string {
  return `${eventType}:${shipmentId || 'global'}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
}

function deriveSeverity(eventType: string): string {
  if (eventType.includes('blocked') || eventType.includes('failed') || eventType.includes('rejected')) return 'critical';
  if (eventType.includes('escalated') || eventType.includes('changed') || eventType.includes('incomplete')) return 'warning';
  return 'info';
}

async function updateEventStatus(supabase: any, eventId: string, status: string, lastError?: string) {
  await supabase.from('outbound_event_queue')
    .update({ status, last_error: lastError || null })
    .eq('id', eventId);
}

async function updateConnectorHealth(supabase: any, workspaceId: string, connectorName: string, success: boolean, errorMsg?: string) {
  if (!workspaceId) return;
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('connector_health_status')
    .select('id, consecutive_failures')
    .eq('workspace_id', workspaceId)
    .eq('connector_name', connectorName)
    .maybeSingle();

  const updates = success
    ? { last_success_at: now, status: 'healthy', freshness_status: 'fresh', consecutive_failures: 0, updated_at: now }
    : {
      last_failure_at: now,
      status: (existing?.consecutive_failures || 0) >= 3 ? 'unhealthy' : 'degraded',
      freshness_status: 'stale',
      consecutive_failures: (existing?.consecutive_failures || 0) + 1,
      last_error: errorMsg || null,
      updated_at: now,
    };

  if (existing) {
    await supabase.from('connector_health_status').update(updates).eq('id', existing.id);
  } else {
    await supabase.from('connector_health_status').insert({
      workspace_id: workspaceId,
      connector_name: connectorName,
      ...updates,
    });
  }
}

async function logError(
  supabase: any, workspaceId: string | null, source: string, eventType: string | null,
  errorCode: string, errorMessage: string, eventId?: string, payload?: any
) {
  await supabase.from('integration_error_log').insert({
    workspace_id: workspaceId,
    source,
    event_type: eventType,
    event_id: eventId || null,
    error_code: errorCode,
    error_message: errorMessage,
    payload: payload || null,
  });
}

async function computeSignature(payload: string, secret: string): Promise<string> {
  if (!secret) return 'unsigned';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
