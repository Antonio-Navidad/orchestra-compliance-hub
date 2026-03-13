import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Notify edge function — fan-out notification engine.
 * 
 * Accepts an event payload and creates in-app notifications for
 * relevant users based on alert_rules and notification_preferences.
 * 
 * Payload: {
 *   event_type: string,          // e.g. "compliance_block", "eta_worsened", "approval_requested"
 *   severity: "info" | "warning" | "critical",
 *   title: string,
 *   body?: string,
 *   shipment_id?: string,
 *   workspace_id?: string,
 *   link?: string,
 *   target_user_ids?: string[],  // if set, notify only these users
 *   metadata?: Record<string, unknown>,
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      event_type,
      severity = "info",
      title,
      body,
      shipment_id,
      workspace_id,
      link,
      target_user_ids,
      metadata,
    } = payload;

    if (!event_type || !title) {
      return new Response(
        JSON.stringify({ error: "event_type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine target users
    let userIds: string[] = [];

    if (target_user_ids?.length) {
      userIds = target_user_ids;
    } else if (workspace_id) {
      // Get all workspace members
      const { data: members } = await adminClient
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id);
      userIds = (members || []).map((m: any) => m.user_id);
    }

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no target users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check alert rules — filter users who have matching enabled rules
    const { data: alertRules } = await adminClient
      .from("alert_rules")
      .select("user_id, severity_threshold, channels, quiet_hours, enabled")
      .eq("event_type", event_type)
      .eq("enabled", true)
      .in("user_id", userIds);

    // Check notification preferences for quiet hours & critical override
    const { data: prefs } = await adminClient
      .from("notification_preferences")
      .select("user_id, quiet_hours, critical_override, channel_preferences")
      .in("user_id", userIds);

    const prefsMap = new Map((prefs || []).map((p: any) => [p.user_id, p]));
    const rulesMap = new Map<string, any>();
    for (const rule of alertRules || []) {
      if (rule.user_id) rulesMap.set(rule.user_id, rule);
    }

    const now = new Date();
    const currentHour = now.getUTCHours();

    // Filter users based on preferences and rules
    const eligibleUserIds = userIds.filter((uid) => {
      const pref = prefsMap.get(uid);

      // Check quiet hours (skip if critical and critical_override is on)
      if (pref?.quiet_hours && severity !== "critical") {
        const qh = pref.quiet_hours as any;
        if (qh.start !== undefined && qh.end !== undefined) {
          const start = parseInt(qh.start);
          const end = parseInt(qh.end);
          if (start <= end) {
            if (currentHour >= start && currentHour < end) return false;
          } else {
            if (currentHour >= start || currentHour < end) return false;
          }
        }
      }

      // If critical + critical_override, always send
      if (severity === "critical" && pref?.critical_override !== false) {
        return true;
      }

      // Check severity threshold from alert rules
      const rule = rulesMap.get(uid);
      if (rule) {
        const severityOrder: Record<string, number> = { info: 0, warning: 1, critical: 2 };
        const threshold = severityOrder[rule.severity_threshold || "info"] || 0;
        const current = severityOrder[severity] || 0;
        if (current < threshold) return false;
      }

      return true;
    });

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "all users filtered by preferences/rules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication: check for existing unread notification with same event_type + shipment_id within 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    let alreadyNotifiedUsers: Set<string> = new Set();

    if (shipment_id) {
      const { data: existing } = await adminClient
        .from("notifications")
        .select("user_id")
        .eq("event_type", event_type)
        .eq("shipment_id", shipment_id)
        .eq("is_read", false)
        .gte("created_at", oneHourAgo)
        .in("user_id", eligibleUserIds);

      alreadyNotifiedUsers = new Set((existing || []).map((e: any) => e.user_id));
    }

    const finalUserIds = eligibleUserIds.filter((uid) => !alreadyNotifiedUsers.has(uid));

    if (finalUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "deduplicated — recent notifications exist" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications
    const notificationRows = finalUserIds.map((uid) => ({
      user_id: uid,
      title,
      body: body || null,
      event_type,
      severity,
      shipment_id: shipment_id || null,
      link: link || (shipment_id ? `/shipment/${shipment_id}` : null),
      metadata: metadata || {},
      is_read: false,
    }));

    const { data: inserted, error: insertErr } = await adminClient
      .from("notifications")
      .insert(notificationRows)
      .select("id");

    if (insertErr) {
      console.error("Failed to insert notifications:", insertErr);
      throw new Error("Failed to create notifications");
    }

    // Future: webhook fan-out would go here
    // Check webhook_subscriptions for matching event_types and POST to target_url

    return new Response(
      JSON.stringify({
        sent: inserted?.length || 0,
        event_type,
        severity,
        users_notified: finalUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
