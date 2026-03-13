import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCcw, Activity, Zap, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

const EVENT_TYPES = [
  'shipment.created', 'shipment.updated', 'shipment.checkpoint_reached',
  'shipment.delivered', 'document.packet.validated', 'compliance.blocked',
  'eta.changed', 'decision_twin.evaluated', 'decision_twin.approval_requested',
  'decision_twin.approved', 'notification.failed',
];

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  delivered: { icon: CheckCircle2, color: 'text-risk-safe' },
  pending: { icon: Clock, color: 'text-muted-foreground' },
  retrying: { icon: RefreshCw, color: 'text-risk-medium' },
  dead_letter: { icon: XCircle, color: 'text-destructive' },
  skipped: { icon: XCircle, color: 'text-muted-foreground' },
  filtered: { icon: XCircle, color: 'text-muted-foreground' },
};

export default function MakeIntegrationPanel() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [webhookUrl, setWebhookUrl] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");

  // Fetch integration settings
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

  // Outbound queue
  const { data: outboundEvents = [] } = useQuery({
    queryKey: ["outbound-events", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_event_queue")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
    refetchInterval: 10000,
  });

  // Inbound webhooks
  const { data: inboundLogs = [] } = useQuery({
    queryKey: ["inbound-webhooks", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_webhook_log")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  // Error log
  const { data: errorLogs = [] } = useQuery({
    queryKey: ["integration-errors", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_error_log")
        .select("*")
        .eq("workspace_id", wsId!)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  // Integration runs
  const { data: runs = [] } = useQuery({
    queryKey: ["integration-runs", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_runs")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wsId) throw new Error("No workspace selected");
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
        const { error } = await supabase
          .from("workspace_integration_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_integration_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      toast.success("Integration settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle enabled
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!settings?.id) {
        // Create new settings
        const { error } = await supabase.from("workspace_integration_settings").insert({
          workspace_id: wsId,
          provider: 'make',
          enabled,
          webhook_url: webhookUrl,
          shared_secret: sharedSecret,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workspace_integration_settings")
          .update({ enabled })
          .eq("id", settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      toast.success("Integration toggled");
    },
  });

  // Replay mutation
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
      toast.success(`${data.replayed} events queued for replay`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Process queue mutation
  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('make-dispatch', {
        body: { action: 'process_queue', batch_size: 10 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["outbound-events"] });
      toast.success(`Processed ${data.processed} events`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deadLetterEvents = outboundEvents.filter((e: any) => e.status === 'dead_letter');
  const retryingEvents = outboundEvents.filter((e: any) => e.status === 'retrying');
  const deliveredCount = outboundEvents.filter((e: any) => e.status === 'delivered').length;

  const healthColor = settings?.health_status === 'healthy'
    ? 'text-risk-safe'
    : settings?.health_status === 'degraded'
      ? 'text-risk-medium'
      : 'text-muted-foreground';

  if (!wsId) {
    return <p className="text-sm text-muted-foreground">Select a workspace to configure integrations.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header / Health */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-primary" />
          <h3 className="font-mono text-xs text-muted-foreground">MAKE.COM ORCHESTRATION</h3>
          <Badge variant="outline" className={`text-[10px] ${healthColor}`}>
            {settings?.health_status?.toUpperCase() || 'NOT CONFIGURED'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Enabled</span>
          <Switch
            checked={settings?.enabled || false}
            onCheckedChange={(v) => toggleMutation.mutate(v)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Delivered', value: deliveredCount, icon: CheckCircle2, color: 'text-risk-safe' },
          { label: 'Retrying', value: retryingEvents.length, icon: RefreshCw, color: 'text-risk-medium' },
          { label: 'Dead Letter', value: deadLetterEvents.length, icon: XCircle, color: 'text-destructive' },
          { label: 'Errors', value: errorLogs.length, icon: AlertTriangle, color: 'text-risk-high' },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-secondary/30 p-3 text-center">
            <s.icon size={14} className={`mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="config">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="config" className="font-mono text-xs">CONFIG</TabsTrigger>
          <TabsTrigger value="outbound" className="font-mono text-xs">
            <ArrowUpRight size={10} className="mr-1" /> OUTBOUND
          </TabsTrigger>
          <TabsTrigger value="inbound" className="font-mono text-xs">
            <ArrowDownLeft size={10} className="mr-1" /> INBOUND
          </TabsTrigger>
          <TabsTrigger value="errors" className="font-mono text-xs">ERRORS</TabsTrigger>
          <TabsTrigger value="runs" className="font-mono text-xs">
            <Activity size={10} className="mr-1" /> RUNS
          </TabsTrigger>
        </TabsList>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Make.com Webhook URL</label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hook.make.com/..." className="bg-secondary/50 font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shared Secret (for signature verification)</label>
              <Input type="password" value={sharedSecret} onChange={(e) => setSharedSecret(e.target.value)} placeholder="your-shared-secret" className="bg-secondary/50 font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Last Successful Sync</label>
              <p className="text-sm font-mono">{settings?.last_successful_sync ? new Date(settings.last_successful_sync).toLocaleString() : '—'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Subscribed Event Types</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {EVENT_TYPES.map((et) => (
                  <Badge key={et} variant="outline" className="text-[10px] font-mono">{et}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">Save Settings</Button>
          </div>
        </TabsContent>

        {/* Outbound Tab */}
        <TabsContent value="outbound" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => processQueueMutation.mutate()} disabled={processQueueMutation.isPending} className="gap-1 text-xs">
              <RefreshCw size={12} /> Process Queue
            </Button>
            {deadLetterEvents.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => replayMutation.mutate(deadLetterEvents.map((e: any) => e.id))} disabled={replayMutation.isPending} className="gap-1 text-xs text-destructive">
                <RotateCcw size={12} /> Replay {deadLetterEvents.length} Dead Letters
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {outboundEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No outbound events yet.</p>
            ) : outboundEvents.map((ev: any) => {
              const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={12} className={cfg.color} />
                    <span className="font-mono truncate">{ev.event_type}</span>
                    {ev.shipment_id && <span className="text-muted-foreground truncate">{ev.shipment_id}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{ev.status}</Badge>
                    <span className="text-muted-foreground text-[10px]">{new Date(ev.created_at).toLocaleTimeString()}</span>
                    {ev.status === 'dead_letter' && (
                      <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => replayMutation.mutate([ev.id])}>
                        <RotateCcw size={10} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Inbound Tab */}
        <TabsContent value="inbound" className="mt-4">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {inboundLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No inbound callbacks received.</p>
            ) : inboundLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft size={12} className="text-primary" />
                  <span className="font-mono">{log.callback_type}</span>
                  {log.shipment_id && <span className="text-muted-foreground">{log.shipment_id}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${log.signature_valid ? 'text-risk-safe' : 'text-destructive'}`}>
                    {log.processing_status}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-4">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {errorLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No unresolved errors.</p>
            ) : errorLogs.map((err: any) => (
              <div key={err.id} className="p-3 rounded-md bg-destructive/5 border border-destructive/20 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-destructive">{err.error_code || 'ERROR'}</span>
                  <span className="text-muted-foreground text-[10px]">{new Date(err.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground">{err.error_message}</p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">{err.source}</Badge>
                  {err.event_type && <Badge variant="outline" className="text-[10px]">{err.event_type}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="mt-4">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No integration runs recorded.</p>
            ) : runs.map((run: any) => (
              <div key={run.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-primary" />
                  <span className="font-mono">{run.scenario_name}</span>
                  <Badge variant="outline" className="text-[10px]">{run.event_type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${run.status === 'completed' ? 'text-risk-safe' : run.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">{new Date(run.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
