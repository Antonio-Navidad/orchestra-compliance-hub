import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-make-signature, x-idempotency-key, x-callback-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_CALLBACK_TYPES = [
  'notification', 'tracking', 'compliance', 'crm_task', 'approval', 'error', 'generic',
];

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

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const workspaceId = payload.workspace_id || null;
    const shipmentId = payload.shipment_id || null;

    // 1. Verify signature
    let signatureValid = false;
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
      } else if (!settings?.shared_secret) {
        signatureValid = true; // No secret configured, skip verification
      }
    } else {
      signatureValid = true; // No workspace context
    }

    // 2. Log the inbound webhook
    const { data: logEntry, error: logError } = await supabase
      .from('inbound_webhook_log')
      .insert({
        callback_type: callbackType,
        workspace_id: workspaceId,
        shipment_id: shipmentId,
        payload,
        idempotency_key: idempotencyKey || null,
        signature_valid: signatureValid,
        processing_status: 'received',
      })
      .select('id')
      .single();

    if (logError) throw logError;
    webhookLogId = logEntry.id;

    // 3. Reject invalid signatures
    if (!signatureValid) {
      await supabase.from('inbound_webhook_log')
        .update({ processing_status: 'rejected', error_message: 'Invalid signature' })
        .eq('id', webhookLogId);

      await supabase.from('integration_error_log').insert({
        workspace_id: workspaceId,
        source: 'make-callback',
        event_type: callbackType,
        error_code: 'INVALID_SIGNATURE',
        error_message: 'Webhook signature verification failed',
        payload,
      });

      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Check idempotency
    if (idempotencyKey) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('id, result')
        .eq('key', idempotencyKey)
        .eq('scope', 'inbound')
        .maybeSingle();

      if (existingKey) {
        await supabase.from('inbound_webhook_log')
          .update({ processing_status: 'duplicate' })
          .eq('id', webhookLogId);

        return new Response(JSON.stringify({ duplicate: true, result: existingKey.result }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 5. Validate callback type
    if (!VALID_CALLBACK_TYPES.includes(callbackType)) {
      await supabase.from('inbound_webhook_log')
        .update({ processing_status: 'rejected', error_message: `Unknown callback type: ${callbackType}` })
        .eq('id', webhookLogId);

      return new Response(JSON.stringify({ error: `Invalid callback_type. Must be one of: ${VALID_CALLBACK_TYPES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Process callback by type
    let result: any;
    switch (callbackType) {
      case 'notification':
        result = await handleNotificationCallback(supabase, payload);
        break;
      case 'tracking':
        result = await handleTrackingCallback(supabase, payload);
        break;
      case 'compliance':
        result = await handleComplianceCallback(supabase, payload);
        break;
      case 'crm_task':
        result = await handleCrmTaskCallback(supabase, payload);
        break;
      case 'approval':
        result = await handleApprovalCallback(supabase, payload);
        break;
      case 'error':
        result = await handleErrorCallback(supabase, payload);
        break;
      default:
        result = await handleGenericCallback(supabase, payload);
    }

    // 7. Record idempotency key
    if (idempotencyKey) {
      await supabase.from('idempotency_keys').insert({
        key: idempotencyKey,
        scope: 'inbound',
        result: result,
      });
    }

    // 8. Update webhook log as processed
    await supabase.from('inbound_webhook_log')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', webhookLogId);

    // 9. Record integration run
    await supabase.from('integration_runs').insert({
      workspace_id: workspaceId,
      scenario_name: `callback:${callbackType}`,
      event_type: callbackType,
      status: 'completed',
      output_summary: result,
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Callback processing error:', error);

    if (webhookLogId) {
      await supabase.from('inbound_webhook_log')
        .update({ processing_status: 'error', error_message: error.message })
        .eq('id', webhookLogId);
    }

    await supabase.from('integration_error_log').insert({
      source: 'make-callback',
      error_message: error.message || 'Unknown callback error',
      payload: { webhook_log_id: webhookLogId },
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// --- Callback Handlers ---

async function handleNotificationCallback(supabase: any, payload: any) {
  const { notification_id, delivery_status, channel, error_message } = payload;

  if (notification_id) {
    await supabase.from('notification_delivery_log').insert({
      notification_id,
      channel: channel || 'external',
      status: delivery_status || 'delivered',
      error_message: error_message || null,
      delivered_at: delivery_status === 'delivered' ? new Date().toISOString() : null,
    });
  }

  return { processed: 'notification', notification_id };
}

async function handleTrackingCallback(supabase: any, payload: any) {
  const { shipment_id, checkpoint, location, timestamp, carrier, external_tracking_id } = payload;

  if (!shipment_id) throw new Error('shipment_id required for tracking callback');

  // Record shipment event
  await supabase.from('shipment_events').insert({
    shipment_id,
    event_type: 'tracking_update',
    description: checkpoint || 'External tracking update',
    metadata: { location, carrier, external_tracking_id, timestamp },
    attribution: 'make.com',
  });

  // Link external tracking ID if provided
  if (external_tracking_id && payload.workspace_id) {
    await supabase.from('external_object_links').upsert({
      workspace_id: payload.workspace_id,
      internal_entity_type: 'shipment',
      internal_entity_id: shipment_id,
      external_system: carrier || 'carrier',
      external_entity_id: external_tracking_id,
      metadata: { last_checkpoint: checkpoint, last_update: timestamp },
    }, { onConflict: 'workspace_id,internal_entity_type,internal_entity_id,external_system' });
  }

  return { processed: 'tracking', shipment_id };
}

async function handleComplianceCallback(supabase: any, payload: any) {
  const { shipment_id, check_type, status, severity, findings, workspace_id } = payload;

  if (!shipment_id) throw new Error('shipment_id required for compliance callback');

  await supabase.from('compliance_checks').insert({
    shipment_id,
    check_type: check_type || 'external_compliance',
    status: status || 'pending',
    severity: severity || 'info',
    findings: findings || [],
    workspace_id: workspace_id || null,
    source_freshness: new Date().toISOString(),
  });

  return { processed: 'compliance', shipment_id };
}

async function handleCrmTaskCallback(supabase: any, payload: any) {
  const { shipment_id, external_task_id, task_status, workspace_id } = payload;

  if (external_task_id && shipment_id && workspace_id) {
    await supabase.from('external_object_links').upsert({
      workspace_id,
      internal_entity_type: 'shipment',
      internal_entity_id: shipment_id,
      external_system: 'crm',
      external_entity_id: external_task_id,
      metadata: { task_status, updated_at: new Date().toISOString() },
    }, { onConflict: 'workspace_id,internal_entity_type,internal_entity_id,external_system' });
  }

  if (shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id,
      event_type: 'crm_update',
      description: `CRM task ${task_status || 'updated'}: ${external_task_id || 'unknown'}`,
      attribution: 'make.com',
    });
  }

  return { processed: 'crm_task', external_task_id };
}

async function handleApprovalCallback(supabase: any, payload: any) {
  const { twin_id, scenario_id, action, actor_name, comment } = payload;

  if (!twin_id) throw new Error('twin_id required for approval callback');

  // We don't have the actor's actual user ID from external, record as event
  await supabase.from('shipment_events').insert({
    shipment_id: payload.shipment_id || 'unknown',
    event_type: 'external_approval',
    description: `External approval action: ${action || 'unknown'} by ${actor_name || 'external'}`,
    metadata: { twin_id, scenario_id, action, actor_name, comment },
    attribution: 'make.com',
  });

  return { processed: 'approval', twin_id, action };
}

async function handleErrorCallback(supabase: any, payload: any) {
  const { error_code, error_message, scenario_name, event_id } = payload;

  await supabase.from('integration_error_log').insert({
    workspace_id: payload.workspace_id || null,
    source: 'make-scenario',
    event_type: scenario_name || 'unknown',
    event_id: event_id || null,
    error_code: error_code || 'MAKE_SCENARIO_ERROR',
    error_message: error_message || 'Unknown Make.com error',
    payload,
  });

  // If event_id is provided, mark it as failed
  if (event_id) {
    await supabase.from('outbound_event_queue')
      .update({ status: 'dead_letter', last_error: error_message })
      .eq('id', event_id);
  }

  return { processed: 'error', error_code };
}

async function handleGenericCallback(supabase: any, payload: any) {
  // Generic handler - just log and create shipment event if applicable
  if (payload.shipment_id) {
    await supabase.from('shipment_events').insert({
      shipment_id: payload.shipment_id,
      event_type: 'external_update',
      description: payload.description || 'External system update via Make.com',
      metadata: payload,
      attribution: 'make.com',
    });
  }

  return { processed: 'generic' };
}

async function computeSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
