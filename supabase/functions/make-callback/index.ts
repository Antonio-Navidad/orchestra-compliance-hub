import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-make-signature, x-idempotency-key, x-callback-type, x-correlation-id, x-source-name, x-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_CALLBACK_TYPES = [
  // Notification callbacks
  'notification.sent', 'notification.failed',
  // External task/CRM callbacks
  'external.task.created', 'external.task.updated',
  'crm.record.created', 'crm.record.updated',
  // Tracking callbacks
  'tracking.event.received', 'checkpoint.confirmed',
  // Compliance/sanctions callbacks
  'compliance.feed.refreshed', 'sanctions.feed.refreshed',
  // Broker/carrier callbacks
  'broker.response.received', 'carrier.update.received',
  // Approval callbacks
  'external.approval.completed',
  // Error/system callbacks
  'integration.error', 'reconciliation.completed',
  // Legacy compat
  'notification', 'tracking', 'compliance', 'crm_task', 'approval', 'error', 'generic',
];

// Max allowed timestamp drift (5 minutes)
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let webhookLogId: string | null = null;

  try {
    const rawBody = await req.text();
    const callbackType = req.headers.get('x-callback-type') || 'generic';
    const signature = req.headers.get('x-make-signature') || '';
    const idempotencyKey = req.headers.get('x-idempotency-key') || '';
    const correlationId = req.headers.get('x-correlation-id') || '';
    const sourceName = req.headers.get('x-source-name') || 'make';
    const requestTimestamp = req.headers.get('x-timestamp') || '';

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const workspaceId = payload.workspace_id || null;
    const shipmentId = payload.shipment_id || null;

    // 1. Validate timestamp freshness if provided
    if (requestTimestamp) {
      const ts = new Date(requestTimestamp).getTime();
      if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_TIMESTAMP_DRIFT_MS) {
        return jsonResponse({ error: 'Request timestamp too old or invalid' }, 400);
      }
    }

    // 2. Compute payload hash for dedup
    const payloadHash = await computeHash(rawBody);

    // 3. Verify signature
    let signatureValid = false;
    let verificationStatus = 'skipped';
    if (workspaceId) {
      const { data: settings } = await supabase
        .from('workspace_integration_settings')
        .select('shared_secret')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'make')
        .maybeSingle();

      if (settings?.shared_secret && signature) {
        const expected = await computeSignature(rawBody, settings.shared_secret);
        signatureValid = expected === signature;
        verificationStatus = signatureValid ? 'verified' : 'failed';
      } else if (!settings?.shared_secret) {
        signatureValid = true;
        verificationStatus = 'no_secret_configured';
      } else {
        signatureValid = false;
        verificationStatus = 'missing_signature';
      }
    } else {
      signatureValid = true;
      verificationStatus = 'no_workspace_context';
    }

    // 4. Log the inbound webhook
    const { data: logEntry, error: logError } = await supabase
      .from('inbound_webhook_log')
      .insert({
        callback_type: callbackType,
        workspace_id: workspaceId,
        shipment_id: shipmentId,
        payload,
        payload_hash: payloadHash,
        idempotency_key: idempotencyKey || null,
        signature_valid: signatureValid,
        verification_status: verificationStatus,
        processing_status: 'received',
        source_name: sourceName,
        source_type: 'make',
        related_object_type: payload.object_type || null,
        related_object_id: payload.object_id || null,
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError) throw logError;
    webhookLogId = logEntry.id;

    // 5. Reject invalid signatures
    if (!signatureValid) {
      await updateWebhookLog(supabase, webhookLogId, 'rejected', 'Signature verification failed');
      await logIntegrationError(supabase, workspaceId, 'make-callback', callbackType,
        'INVALID_SIGNATURE', 'Webhook signature verification failed', payload);
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    // 6. Check idempotency (by key or payload hash)
    const dedupeKey = idempotencyKey || payloadHash;
    if (dedupeKey) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('id, result')
        .eq('key', dedupeKey)
        .eq('scope', 'inbound')
        .maybeSingle();

      if (existingKey) {
        await updateWebhookLog(supabase, webhookLogId, 'duplicate');
        return jsonResponse({ duplicate: true, result: existingKey.result });
      }
    }

    // 7. Validate callback type
    if (!VALID_CALLBACK_TYPES.includes(callbackType)) {
      await updateWebhookLog(supabase, webhookLogId, 'rejected', `Unknown callback type: ${callbackType}`);
      return jsonResponse({ error: `Invalid callback type: ${callbackType}` }, 400);
    }

    // 8. Process callback
    const result = await processCallback(supabase, callbackType, payload, correlationId, workspaceId);

    // 9. Record idempotency
    if (dedupeKey) {
      await supabase.from('idempotency_keys').insert({
        key: dedupeKey,
        scope: 'inbound',
        result,
      });
    }

    // 10. Mark processed
    await updateWebhookLog(supabase, webhookLogId, 'processed');

    // 11. Update connector health
    await updateConnectorHealth(supabase, workspaceId, `make_inbound_${callbackType.split('.')[0]}`, true);

    // 12. Record integration run
    await supabase.from('integration_runs').insert({
      workspace_id: workspaceId,
      scenario_name: `callback:${callbackType}`,
      event_type: callbackType,
      status: 'completed',
      output_summary: result,
      completed_at: new Date().toISOString(),
    });

    return jsonResponse({ success: true, callback_type: callbackType, result });
  } catch (error) {
    console.error('Callback error:', error);
    if (webhookLogId) {
      await updateWebhookLog(supabase, webhookLogId, 'error', error.message);
    }
    await logIntegrationError(supabase, null, 'make-callback', null,
      'CALLBACK_PROCESSING_ERROR', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── CALLBACK ROUTER ──────────────────────────────────────────

async function processCallback(supabase: any, callbackType: string, payload: any, correlationId: string, workspaceId: string | null) {
  switch (callbackType) {
    // Notification
    case 'notification.sent':
    case 'notification':
      return handleNotificationSent(supabase, payload);
    case 'notification.failed':
      return handleNotificationFailed(supabase, payload);

    // Tracking
    case 'tracking.event.received':
    case 'checkpoint.confirmed':
    case 'tracking':
      return handleTrackingEvent(supabase, payload, workspaceId);

    // Compliance
    case 'compliance.feed.refreshed':
    case 'sanctions.feed.refreshed':
    case 'compliance':
      return handleComplianceFeedRefresh(supabase, payload, workspaceId, callbackType);

    // CRM / tasks
    case 'external.task.created':
    case 'external.task.updated':
    case 'crm.record.created':
    case 'crm.record.updated':
    case 'crm_task':
      return handleExternalObjectSync(supabase, payload, workspaceId, callbackType);

    // Carrier / broker
    case 'carrier.update.received':
    case 'broker.response.received':
      return handlePartnerUpdate(supabase, payload, workspaceId, callbackType);

    // Approval
    case 'external.approval.completed':
    case 'approval':
      return handleApprovalCallback(supabase, payload);

    // Error
    case 'integration.error':
    case 'error':
      return handleErrorCallback(supabase, payload, workspaceId);

    // Reconciliation
    case 'reconciliation.completed':
      return handleReconciliationCompleted(supabase, payload, workspaceId);

    default:
      return handleGenericCallback(supabase, payload);
  }
}

// ─── CALLBACK HANDLERS ───────────────────────────────────────

async function handleNotificationSent(supabase: any, p: any) {
  if (p.notification_id) {
    await supabase.from('notification_delivery_log').insert({
      notification_id: p.notification_id,
      channel: p.channel || 'external',
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
  }
  return { processed: 'notification.sent', notification_id: p.notification_id };
}

async function handleNotificationFailed(supabase: any, p: any) {
  if (p.notification_id) {
    await supabase.from('notification_delivery_log').insert({
      notification_id: p.notification_id,
      channel: p.channel || 'external',
      status: 'failed',
      error_message: p.error_message || 'External delivery failed',
    });
  }
  // Emit internal event for retry/escalation
  if (p.shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id: p.shipment_id,
      event_type: 'notification_failed',
      description: `Notification delivery failed via ${p.channel || 'unknown'}: ${p.error_message || 'unknown error'}`,
      attribution: 'make.com',
      metadata: p,
    });
  }
  return { processed: 'notification.failed', notification_id: p.notification_id };
}

async function handleTrackingEvent(supabase: any, p: any, workspaceId: string | null) {
  if (!p.shipment_id) throw new Error('shipment_id required for tracking callback');

  // Record shipment event (checkpoint)
  await supabase.from('shipment_events').insert({
    shipment_id: p.shipment_id,
    event_type: 'tracking_update',
    description: p.checkpoint || p.description || 'External tracking update',
    metadata: {
      location: p.location, carrier: p.carrier,
      external_tracking_id: p.external_tracking_id,
      timestamp: p.timestamp, raw: p.raw_data,
    },
    attribution: 'make.com',
  });

  // Link external tracking ID
  if (p.external_tracking_id && workspaceId) {
    await supabase.from('external_object_links').upsert({
      workspace_id: workspaceId,
      internal_entity_type: 'shipment',
      internal_entity_id: p.shipment_id,
      external_system: p.carrier || 'carrier',
      external_entity_id: p.external_tracking_id,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      metadata: { last_checkpoint: p.checkpoint, last_update: p.timestamp },
    }, { onConflict: 'workspace_id,internal_entity_type,internal_entity_id,external_system' });
  }

  // Trigger ETA refresh if checkpoint is significant
  if (p.trigger_eta_refresh && p.shipment_id) {
    await dispatchInternalEvent(supabase, 'eta_refresh_requested', p.shipment_id, workspaceId);
  }

  // Trigger Decision Twin re-evaluation if risk changed
  if (p.risk_signal) {
    await dispatchInternalEvent(supabase, 'twin_reeval_requested', p.shipment_id, workspaceId);
  }

  return { processed: 'tracking', shipment_id: p.shipment_id };
}

async function handleComplianceFeedRefresh(supabase: any, p: any, workspaceId: string | null, callbackType: string) {
  const isSanctions = callbackType.includes('sanctions');

  if (p.findings?.length && p.shipment_id) {
    for (const finding of p.findings) {
      await supabase.from('compliance_checks').insert({
        shipment_id: p.shipment_id || finding.shipment_id,
        check_type: isSanctions ? 'sanctions_refresh' : (finding.check_type || 'external_compliance'),
        status: finding.status || 'pending',
        severity: finding.severity || 'info',
        findings: finding.details || [],
        workspace_id: workspaceId,
        source_freshness: new Date().toISOString(),
      });
    }
  }

  // Update connector freshness
  await updateConnectorHealth(supabase, workspaceId,
    isSanctions ? 'sanctions_feed' : 'compliance_feed', true);

  // Trigger risk re-scoring if new findings
  if (p.shipment_id && p.findings?.length) {
    await dispatchInternalEvent(supabase, 'compliance_rescore_requested', p.shipment_id, workspaceId);
  }

  return {
    processed: callbackType,
    findings_count: p.findings?.length || 0,
    shipment_id: p.shipment_id,
  };
}

async function handleExternalObjectSync(supabase: any, p: any, workspaceId: string | null, callbackType: string) {
  const externalSystem = p.external_system || (callbackType.startsWith('crm') ? 'crm' : 'task_system');

  if (p.external_id && p.internal_id && workspaceId) {
    await supabase.from('external_object_links').upsert({
      workspace_id: workspaceId,
      internal_entity_type: p.internal_type || 'shipment',
      internal_entity_id: p.internal_id,
      external_system: externalSystem,
      external_entity_type: p.external_type || null,
      external_entity_id: p.external_id,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      metadata: { status: p.status, callback_type: callbackType, updated_at: new Date().toISOString() },
    }, { onConflict: 'workspace_id,internal_entity_type,internal_entity_id,external_system' });
  }

  if (p.shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id: p.shipment_id,
      event_type: 'external_sync',
      description: `${externalSystem} ${callbackType.split('.').pop()}: ${p.external_id || 'unknown'}`,
      attribution: 'make.com',
      metadata: p,
    });
  }

  return { processed: callbackType, external_id: p.external_id };
}

async function handlePartnerUpdate(supabase: any, p: any, workspaceId: string | null, callbackType: string) {
  const isCarrier = callbackType.includes('carrier');

  if (p.shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id: p.shipment_id,
      event_type: isCarrier ? 'carrier_update' : 'broker_response',
      description: p.description || `${isCarrier ? 'Carrier' : 'Broker'} update received`,
      attribution: 'make.com',
      metadata: p,
      broker_id: p.broker_id || null,
    });
  }

  // Trigger downstream recalculations
  if (p.affects_route && p.shipment_id) {
    await dispatchInternalEvent(supabase, 'route_reeval_requested', p.shipment_id, workspaceId);
  }
  if (p.affects_twin && p.shipment_id) {
    await dispatchInternalEvent(supabase, 'twin_reeval_requested', p.shipment_id, workspaceId);
  }

  return { processed: callbackType, shipment_id: p.shipment_id };
}

async function handleApprovalCallback(supabase: any, p: any) {
  if (!p.twin_id && !p.shipment_id) throw new Error('twin_id or shipment_id required for approval');

  await supabase.from('shipment_events').insert({
    shipment_id: p.shipment_id || 'unknown',
    event_type: 'external_approval',
    description: `External approval: ${p.action || 'completed'} by ${p.actor_name || 'external'}`,
    attribution: 'make.com',
    metadata: p,
  });

  return { processed: 'approval', twin_id: p.twin_id, action: p.action };
}

async function handleErrorCallback(supabase: any, p: any, workspaceId: string | null) {
  await supabase.from('integration_error_log').insert({
    workspace_id: workspaceId,
    source: 'make-scenario',
    event_type: p.scenario_name || p.event_type || 'unknown',
    event_id: p.event_id || null,
    error_code: p.error_code || 'MAKE_SCENARIO_ERROR',
    error_message: p.error_message || 'Unknown Make.com error',
    payload: p,
  });

  if (p.event_id) {
    await supabase.from('outbound_event_queue')
      .update({ status: 'failed_terminal', last_error: p.error_message })
      .eq('id', p.event_id);

    await supabase.from('replay_queue').insert({
      failed_event_id: p.event_id,
      event_type: p.event_type || 'unknown',
      workspace_id: workspaceId,
      replay_status: 'awaiting_review',
    });
  }

  await updateConnectorHealth(supabase, workspaceId, 'make_scenario', false, p.error_message);

  return { processed: 'error', error_code: p.error_code };
}

async function handleReconciliationCompleted(supabase: any, p: any, workspaceId: string | null) {
  await supabase.from('reconciliation_jobs').insert({
    workspace_id: workspaceId,
    job_type: p.job_type || 'external_reconciliation',
    status: 'completed',
    total_checked: p.total_checked || 0,
    mismatches_found: p.mismatches_found || 0,
    auto_fixed: p.auto_fixed || 0,
    manual_review_needed: p.manual_review_needed || 0,
    summary: p.summary || {},
    started_at: p.started_at,
    completed_at: new Date().toISOString(),
    correlation_id: p.correlation_id,
  });

  return { processed: 'reconciliation', mismatches: p.mismatches_found || 0 };
}

async function handleGenericCallback(supabase: any, p: any) {
  if (p.shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id: p.shipment_id,
      event_type: 'external_update',
      description: p.description || 'Generic external update via Make.com',
      attribution: 'make.com',
      metadata: p,
    });
  }
  return { processed: 'generic' };
}

// ─── INTERNAL EVENT TRIGGERS ──────────────────────────────────

async function dispatchInternalEvent(supabase: any, eventType: string, shipmentId: string, workspaceId: string | null) {
  // Record as a shipment event for traceability
  await supabase.from('shipment_events').insert({
    shipment_id: shipmentId,
    event_type: eventType,
    description: `Internal recalculation triggered: ${eventType}`,
    attribution: 'system',
    metadata: { triggered_by: 'make_callback', workspace_id: workspaceId },
  });
}

// ─── HELPERS ──────────────────────────────────────────────────

async function updateWebhookLog(supabase: any, id: string, status: string, errorMsg?: string) {
  await supabase.from('inbound_webhook_log')
    .update({
      processing_status: status,
      error_message: errorMsg || null,
      processed_at: status === 'processed' ? new Date().toISOString() : null,
    })
    .eq('id', id);
}

async function updateConnectorHealth(supabase: any, workspaceId: string | null, connectorName: string, success: boolean, errorMsg?: string) {
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
    await supabase.from('connector_health_status').insert({ workspace_id: workspaceId, connector_name: connectorName, ...updates });
  }
}

async function logIntegrationError(supabase: any, workspaceId: string | null, source: string, eventType: string | null, code: string, message: string, payload?: any) {
  await supabase.from('integration_error_log').insert({
    workspace_id: workspaceId, source, event_type: eventType,
    error_code: code, error_message: message, payload: payload || null,
  });
}

async function computeSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
