import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle,
  RotateCcw, Activity, Zap, ArrowUpRight, ArrowDownLeft,
  Heart, Shield, GitCompare, Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

// ─── Constants ────────────────────────────────────────────────

const EVENT_TYPES = [
  'shipment.created', 'shipment.updated', 'shipment.status_changed',
  'shipment.checkpoint_reached', 'shipment.delivered',
  'document.packet.created', 'document.packet.validated',
  'document.packet.incomplete', 'document.issue.created',
  'product.classification.completed', 'product.classification.accepted',
  'product.classification.overridden',
  'route.generated', 'route.selected', 'route.changed',
  'compliance.check.completed', 'compliance.blocked', 'compliance.escalated',
  'eta.generated', 'eta.changed',
  'decision_twin.evaluated', 'decision_twin.state_changed',
  'decision_twin.approval_requested', 'decision_twin.approved', 'decision_twin.rejected',
  'approval.requested', 'approval.completed',
  'notification.requested', 'notification.failed',
  'shipment.actual_outcome_captured',
];

const SCENARIO_GROUPS: Record<string, string[]> = {
  'Notification Fan-out': [
    'document.packet.incomplete', 'document.issue.created', 'product.classification.overridden',
    'route.changed', 'compliance.blocked', 'compliance.escalated', 'eta.changed',
    'decision_twin.evaluated', 'decision_twin.state_changed', 'decision_twin.approval_requested',
    'decision_twin.rejected', 'approval.requested', 'notification.requested', 'notification.failed',
  ],
  'Ops / CRM Sync': [
    'shipment.created', 'shipment.updated', 'shipment.status_changed', 'shipment.delivered',
    'document.packet.created', 'document.packet.validated',
    'product.classification.completed', 'product.classification.accepted',
    'route.generated', 'route.selected', 'decision_twin.approved', 'approval.completed',
  ],
  'Tracking Ingestion': ['shipment.checkpoint_reached'],
  'Compliance Refresh': ['compliance.check.completed'],
  'Reconciliation': ['shipment.actual_outcome_captured'],
};

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  delivered: { icon: CheckCircle2, color: 'text-risk-safe' },
  queued: { icon: Clock, color: 'text-muted-foreground' },
  pending: { icon: Clock, color: 'text-muted-foreground' },
  dispatching: { icon: RefreshCw, color: 'text-primary' },
  failed_retryable: { icon: RefreshCw, color: 'text-risk-medium' },
  failed_terminal: { icon: XCircle, color: 'text-destructive' },
  skipped: { icon: XCircle, color: 'text-muted-foreground/50' },
  filtered: { icon: XCircle, color: 'text-muted-foreground/50' },
};

const HEALTH_STYLES: Record<string, string> = {
  healthy: 'text-risk-safe border-risk-safe/30 bg-risk-safe/10',
  degraded: 'text-risk-medium border-risk-medium/30 bg-risk-medium/10',
  unhealthy: 'text-destructive border-destructive/30 bg-destructive/10',
  unknown: 'text-muted-foreground border-border bg-secondary/30',
};

// ─── Component ────────────────────────────────────────────────

export default function MakeIntegrationPanel() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [webhookUrl, setWebhookUrl] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["integration-settings", wsId],
    queryFn: async () => {
      if (!wsId) return null;
      const { data, error } = await supabase
        .from("workspace_integration_settings")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("provider", "make")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setWebhookUrl(data.webhook_url || "");
        setSharedSecret(data.shared_secret || "");
      }
      return data;
    },
    enabled: !!wsId,
  });

  const { data: outboundEvents = [] } = useQuery({
    queryKey: ["outbound-events", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_event_queue")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
    refetchInterval: 15000,
  });

  const { data: inboundLogs = [] } = useQuery({
    queryKey: ["inbound-webhooks", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_webhook_log")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  const { data: errorLogs = [] } = useQuery({
    queryKey: ["integration-errors", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_error_log")
        .select("*")
        .eq("workspace_id", wsId!)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  const { data: connectorHealth = [] } = useQuery({
    queryKey: ["connector-health", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_health_status")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("connector_name");
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  const { data: replayQueue = [] } = useQuery({
    queryKey: ["replay-queue", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("replay_queue")
        .select("*")
        .eq("workspace_id", wsId!)
        .in("replay_status", ["requested", "awaiting_review", "replaying"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["integration-runs", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_runs")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  const { data: reconciliationJobs = [] } = useQuery({
    queryKey: ["reconciliation-jobs", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_jobs")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  // ─── Mutations ────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wsId) throw new Error("No workspace");
      const payload = {
        workspace_id: wsId,
        provider: 'make' as const,
        enabled: settings?.enabled ?? false,
        webhook_url: webhookUrl,
        shared_secret: sharedSecret,
        scenario_mapping: settings?.scenario_mapping || {},
        event_filters: settings?.event_filters || [],
      };
      if (settings?.id) {
        const { error } = await supabase.from("workspace_integration_settings")
          .update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workspace_integration_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["integration-settings"] }); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!settings?.id) {
        const { error } = await supabase.from("workspace_integration_settings").insert({
          workspace_id: wsId, provider: 'make', enabled, webhook_url: webhookUrl, shared_secret: sharedSecret,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workspace_integration_settings")
          .update({ enabled }).eq("id", settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["integration-settings"] }); toast.success("Integration toggled"); },
  });

  const replayMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('make-dispatch', {
        body: { action: 'replay', event_ids: eventIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["outbound-events"] });
      queryClient.invalidateQueries({ queryKey: ["replay-queue"] });
      toast.success(`${data.replayed} events replayed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('make-dispatch', {
        body: { action: 'process_queue', batch_size: 20 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["outbound-events"] });
      toast.success(`Processed ${data.processed} events (${data.delivered || 0} delivered)`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resolveErrorMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const { data, error } = await supabase.functions.invoke('make-admin', {
        body: { action: 'resolve_error', workspace_id: wsId, error_id: errorId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-errors"] });
      toast.success("Error resolved");
    },
  });

  // ─── Computed ─────────────────────────────────────────────

  const deliveredCount = outboundEvents.filter((e: any) => e.status === 'delivered').length;
  const retryingCount = outboundEvents.filter((e: any) => e.status === 'failed_retryable').length;
  const terminalCount = outboundEvents.filter((e: any) => e.status === 'failed_terminal').length;
  const queuedCount = outboundEvents.filter((e: any) => ['queued', 'pending'].includes(e.status)).length;

  const overallHealth = settings?.health_status || 'unknown';
  const healthStyle = HEALTH_STYLES[overallHealth] || HEALTH_STYLES.unknown;

  if (!wsId) {
    return <p className="text-sm text-muted-foreground">Select a workspace to configure integrations.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-primary" />
          <h3 className="font-mono text-xs text-muted-foreground">MAKE.COM ORCHESTRATION</h3>
          <Badge variant="outline" className={`text-[10px] ${healthStyle}`}>
            {overallHealth.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Enabled</span>
          <Switch checked={settings?.enabled || false} onCheckedChange={(v) => toggleMutation.mutate(v)} />
        </div>
      </div>

      {/* ─── Stats Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {[
          { label: 'Delivered', value: deliveredCount, icon: CheckCircle2, color: 'text-risk-safe' },
          { label: 'Queued', value: queuedCount, icon: Clock, color: 'text-muted-foreground' },
          { label: 'Retrying', value: retryingCount, icon: RefreshCw, color: 'text-risk-medium' },
          { label: 'Terminal', value: terminalCount, icon: XCircle, color: 'text-destructive' },
          { label: 'Errors', value: errorLogs.length, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Replay Queue', value: replayQueue.length, icon: RotateCcw, color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-secondary/30 p-2.5 text-center">
            <s.icon size={12} className={`mx-auto mb-0.5 ${s.color}`} />
            <p className="text-base font-bold">{s.value}</p>
            <p className="text-[9px] text-muted-foreground font-mono">{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* ─── Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="config">
        <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="config" className="font-mono text-[10px] h-7">CONFIG</TabsTrigger>
          <TabsTrigger value="outbound" className="font-mono text-[10px] h-7">
            <ArrowUpRight size={9} className="mr-0.5" /> OUTBOUND
          </TabsTrigger>
          <TabsTrigger value="inbound" className="font-mono text-[10px] h-7">
            <ArrowDownLeft size={9} className="mr-0.5" /> INBOUND
          </TabsTrigger>
          <TabsTrigger value="health" className="font-mono text-[10px] h-7">
            <Heart size={9} className="mr-0.5" /> HEALTH
          </TabsTrigger>
          <TabsTrigger value="errors" className="font-mono text-[10px] h-7">ERRORS</TabsTrigger>
          <TabsTrigger value="replay" className="font-mono text-[10px] h-7">
            <RotateCcw size={9} className="mr-0.5" /> REPLAY
          </TabsTrigger>
          <TabsTrigger value="runs" className="font-mono text-[10px] h-7">
            <Activity size={9} className="mr-0.5" /> RUNS
          </TabsTrigger>
          <TabsTrigger value="mapping" className="font-mono text-[10px] h-7">
            <GitCompare size={9} className="mr-0.5" /> MAPPING
          </TabsTrigger>
        </TabsList>

        {/* ─── Config Tab ──────────────────────────────────── */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Make.com Webhook URL</label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.make.com/..." className="bg-secondary/50 font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shared Secret (HMAC Verification)</label>
              <Input type="password" value={sharedSecret} onChange={(e) => setSharedSecret(e.target.value)}
                placeholder="your-shared-secret" className="bg-secondary/50 font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Last Successful Sync</span>
                <p className="font-mono mt-0.5">{settings?.last_successful_sync ? new Date(settings.last_successful_sync).toLocaleString() : '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Failed Sync</span>
                <p className="font-mono mt-0.5">{settings?.last_failed_sync ? new Date(settings.last_failed_sync).toLocaleString() : '—'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">Save Settings</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Outbound Tab ────────────────────────────────── */}
        <TabsContent value="outbound" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => processQueueMutation.mutate()}
              disabled={processQueueMutation.isPending} className="gap-1 text-xs">
              <RefreshCw size={12} /> Process Queue
            </Button>
            {terminalCount > 0 && (
              <Button size="sm" variant="outline"
                onClick={() => replayMutation.mutate(outboundEvents.filter((e: any) => e.status === 'failed_terminal').map((e: any) => e.id))}
                disabled={replayMutation.isPending} className="gap-1 text-xs text-destructive">
                <RotateCcw size={12} /> Replay {terminalCount} Terminal
              </Button>
            )}
          </div>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {outboundEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No outbound events.</p>
            ) : outboundEvents.map((ev: any) => {
              const cfg = STATUS_ICON[ev.status] || STATUS_ICON.queued;
              const Icon = cfg.icon;
              const isExpanded = expandedEventId === ev.id;
              return (
                <div key={ev.id} className="rounded-md bg-secondary/30 border border-border text-xs">
                  <div className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={11} className={cfg.color} />
                      <span className="font-mono truncate">{ev.event_type}</span>
                      {ev.shipment_id && <span className="text-muted-foreground truncate text-[10px]">{ev.shipment_id}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>{ev.status}</Badge>
                      {ev.attempts > 0 && <span className="text-[9px] text-muted-foreground">×{ev.attempts}</span>}
                      <span className="text-muted-foreground text-[9px]">{new Date(ev.created_at).toLocaleTimeString()}</span>
                      {ev.status === 'failed_terminal' && (
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); replayMutation.mutate([ev.id]); }}>
                          <RotateCcw size={9} />
                        </Button>
                      )}
                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border p-2 space-y-1 text-[10px] bg-background/50">
                      {ev.correlation_id && <p><span className="text-muted-foreground">Correlation:</span> <span className="font-mono">{ev.correlation_id}</span></p>}
                      {ev.idempotency_key && <p><span className="text-muted-foreground">Idempotency:</span> <span className="font-mono">{ev.idempotency_key.slice(0, 40)}...</span></p>}
                      {ev.last_error && <p className="text-destructive">{ev.last_error}</p>}
                      {ev.dispatched_at && <p><span className="text-muted-foreground">Dispatched:</span> {new Date(ev.dispatched_at).toLocaleString()}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Inbound Tab ─────────────────────────────────── */}
        <TabsContent value="inbound" className="mt-4">
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {inboundLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No inbound callbacks.</p>
            ) : inboundLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft size={11} className="text-primary" />
                  <span className="font-mono">{log.callback_type}</span>
                  {log.source_name && log.source_name !== 'make' && (
                    <Badge variant="outline" className="text-[9px]">{log.source_name}</Badge>
                  )}
                  {log.shipment_id && <span className="text-muted-foreground text-[10px]">{log.shipment_id}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[9px] ${log.signature_valid ? 'text-risk-safe' : 'text-destructive'}`}>
                    {log.signature_valid ? <Shield size={8} className="mr-0.5" /> : null}
                    {log.processing_status}
                  </Badge>
                  <span className="text-muted-foreground text-[9px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Health Tab ──────────────────────────────────── */}
        <TabsContent value="health" className="mt-4 space-y-3">
          {connectorHealth.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No connector health data. Events must be dispatched first.</p>
          ) : connectorHealth.map((c: any) => {
            const style = HEALTH_STYLES[c.status] || HEALTH_STYLES.unknown;
            return (
              <div key={c.id} className={`rounded-md border p-3 text-xs ${style}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Heart size={12} />
                    <span className="font-mono font-medium">{c.connector_name}</span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${style}`}>{c.status.toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div>
                    <span>Last Success</span>
                    <p className="font-mono">{c.last_success_at ? new Date(c.last_success_at).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <span>Last Failure</span>
                    <p className="font-mono">{c.last_failure_at ? new Date(c.last_failure_at).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <span>Consecutive Failures</span>
                    <p className="font-mono">{c.consecutive_failures}</p>
                  </div>
                </div>
                {c.last_error && <p className="text-[10px] text-destructive mt-1 truncate">{c.last_error}</p>}
              </div>
            );
          })}

          {/* Reconciliation Jobs */}
          {reconciliationJobs.length > 0 && (
            <div className="mt-4">
              <h4 className="font-mono text-[10px] text-muted-foreground mb-2">RECONCILIATION JOBS</h4>
              {reconciliationJobs.map((job: any) => (
                <div key={job.id} className="rounded-md border border-border bg-secondary/30 p-2 text-xs mb-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{job.job_type}</span>
                    <Badge variant="outline" className={`text-[9px] ${job.status === 'completed' ? 'text-risk-safe' : 'text-muted-foreground'}`}>{job.status}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[9px] text-muted-foreground mt-1">
                    <span>Checked: {job.total_checked}</span>
                    <span>Mismatches: {job.mismatches_found}</span>
                    <span>Auto-fixed: {job.auto_fixed}</span>
                    <span>Review: {job.manual_review_needed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Errors Tab ──────────────────────────────────── */}
        <TabsContent value="errors" className="mt-4">
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {errorLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No unresolved errors. ✓</p>
            ) : errorLogs.map((err: any) => (
              <div key={err.id} className="p-3 rounded-md bg-destructive/5 border border-destructive/20 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-destructive">{err.error_code || 'ERROR'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[9px]">{new Date(err.created_at).toLocaleString()}</span>
                    <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5"
                      onClick={() => resolveErrorMutation.mutate(err.id)}>
                      <CheckCircle2 size={9} className="mr-0.5" /> Resolve
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground">{err.error_message}</p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[9px]">{err.source}</Badge>
                  {err.event_type && <Badge variant="outline" className="text-[9px]">{err.event_type}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Replay Tab ──────────────────────────────────── */}
        <TabsContent value="replay" className="mt-4">
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {replayQueue.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No items in replay queue.</p>
            ) : replayQueue.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <RotateCcw size={11} className="text-primary" />
                  <span className="font-mono">{item.event_type}</span>
                  <Badge variant="outline" className="text-[9px]">{item.replay_status}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[9px]">{new Date(item.created_at).toLocaleString()}</span>
                  {item.replay_status === 'awaiting_review' && item.failed_event_id && (
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 gap-0.5"
                      onClick={() => replayMutation.mutate([item.failed_event_id])}>
                      <RotateCcw size={8} /> Replay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Runs Tab ────────────────────────────────────── */}
        <TabsContent value="runs" className="mt-4">
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No integration runs.</p>
            ) : runs.map((run: any) => (
              <div key={run.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <Activity size={11} className="text-primary" />
                  <span className="font-mono">{run.scenario_name}</span>
                  <Badge variant="outline" className="text-[9px]">{run.event_type}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[9px] ${run.status === 'completed' ? 'text-risk-safe' : run.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground text-[9px]">{new Date(run.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Mapping Tab ─────────────────────────────────── */}
        <TabsContent value="mapping" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Event types are organized by Make.com scenario groups. Each group corresponds to a recommended Make scenario.
          </p>
          {Object.entries(SCENARIO_GROUPS).map(([group, events]) => (
            <div key={group} className="rounded-md border border-border bg-secondary/30">
              <button
                className="w-full flex items-center justify-between p-2.5 text-xs font-mono hover:bg-secondary/50 transition-colors"
                onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
              >
                <div className="flex items-center gap-2">
                  <GitCompare size={11} className="text-primary" />
                  <span>{group.toUpperCase()}</span>
                  <Badge variant="outline" className="text-[9px]">{events.length} events</Badge>
                </div>
                {expandedGroup === group ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {expandedGroup === group && (
                <div className="border-t border-border p-2 space-y-1">
                  {events.map((et) => (
                    <div key={et} className="flex items-center gap-2 text-[10px] py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                      <span className="font-mono text-muted-foreground">{et}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
