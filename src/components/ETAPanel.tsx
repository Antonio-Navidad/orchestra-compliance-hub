import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ETAPanelProps {
  shipmentId: string;
  workspaceId?: string | null;
}

export function ETAPanel({ shipmentId, workspaceId }: ETAPanelProps) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["eta-predictions", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eta_predictions")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const latest = predictions[0];
  const prior = predictions[1];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("eta-predict", {
        body: { shipment_id: shipmentId, workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eta-predictions", shipmentId] });
      toast.success("ETA prediction generated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate ETA prediction");
    },
  });

  const getConfidenceColor = (c: number | null) => {
    if (!c) return "text-muted-foreground";
    if (c >= 0.8) return "text-emerald-500";
    if (c >= 0.6) return "text-amber-500";
    return "text-red-500";
  };

  const getDriftHours = () => {
    if (!latest?.predicted_latest || !prior?.predicted_latest) return null;
    const diff =
      (new Date(latest.predicted_latest).getTime() -
        new Date(prior.predicted_latest).getTime()) /
      (1000 * 60 * 60);
    return Math.round(diff);
  };

  const driftHours = getDriftHours();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Clock size={14} /> ETA PREDICTION
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="font-mono text-xs"
        >
          <RefreshCw size={12} className={generateMutation.isPending ? "animate-spin mr-1" : "mr-1"} />
          {latest ? "REFRESH ETA" : "GENERATE ETA"}
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading predictions...</p>
        </div>
      ) : !latest ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
          <Clock size={24} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No ETA prediction yet. Click "Generate ETA" to create one.
          </p>
        </div>
      ) : (
        <>
          {/* Main prediction card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Earliest */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">EARLIEST</span>
                <p className="text-lg font-mono font-semibold">
                  {latest.predicted_earliest
                    ? format(new Date(latest.predicted_earliest), "MMM dd, yyyy")
                    : "—"}
                </p>
                {latest.predicted_earliest && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latest.predicted_earliest), "HH:mm")} UTC
                  </p>
                )}
              </div>

              {/* Latest */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">LATEST</span>
                <p className="text-lg font-mono font-semibold">
                  {latest.predicted_latest
                    ? format(new Date(latest.predicted_latest), "MMM dd, yyyy")
                    : "—"}
                </p>
                {latest.predicted_latest && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latest.predicted_latest), "HH:mm")} UTC
                  </p>
                )}
              </div>

              {/* Confidence + Drift */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">CONFIDENCE</span>
                <p className={`text-lg font-mono font-semibold ${getConfidenceColor(latest.confidence)}`}>
                  {latest.confidence != null
                    ? `${Math.round(latest.confidence * 100)}%`
                    : "—"}
                </p>
                {driftHours !== null && driftHours !== 0 && (
                  <div className="flex items-center gap-1">
                    {driftHours > 0 ? (
                      <TrendingDown size={12} className="text-red-500" />
                    ) : (
                      <TrendingUp size={12} className="text-emerald-500" />
                    )}
                    <span
                      className={`text-xs font-mono ${
                        driftHours > 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {driftHours > 0 ? "+" : ""}
                      {driftHours}h vs prior
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Drift warning */}
            {driftHours !== null && Math.abs(driftHours) > 48 && (
              <div className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 p-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs text-amber-500">
                  Significant ETA drift of {Math.abs(driftHours)} hours detected since last prediction.
                </span>
              </div>
            )}

            {/* Factors */}
            {Array.isArray(latest.factors) && (latest.factors as any[]).length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-mono">CONTRIBUTING FACTORS</span>
                <div className="space-y-1">
                  {(latest.factors as any[]).map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs rounded bg-secondary/30 px-2 py-1.5">
                      <span className="text-foreground">{f.factor}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono ${
                            f.impact_hours > 0
                              ? "text-red-500"
                              : f.impact_hours < 0
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {f.impact_hours > 0 ? "+" : ""}
                          {f.impact_hours}h
                        </span>
                        {f.source && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {f.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-1 border-t border-border">
              <span>Model: {latest.model_version || "—"}</span>
              <span>Generated: {format(new Date(latest.created_at), "MMM dd HH:mm")}</span>
              {latest.route_version_id && <span>Route: {latest.route_version_id.slice(0, 8)}</span>}
            </div>
          </div>

          {/* History toggle */}
          {predictions.length > 1 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
              >
                {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {predictions.length - 1} PRIOR PREDICTION{predictions.length > 2 ? "S" : ""}
              </button>

              {showHistory && (
                <div className="space-y-2">
                  {predictions.slice(1).map((p) => (
                    <div
                      key={p.id}
                      className="rounded border border-border bg-card/50 p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-muted-foreground">
                          {format(new Date(p.created_at), "MMM dd HH:mm")}
                        </span>
                        <span>
                          {p.predicted_earliest
                            ? format(new Date(p.predicted_earliest), "MMM dd")
                            : "?"}
                          {" – "}
                          {p.predicted_latest
                            ? format(new Date(p.predicted_latest), "MMM dd")
                            : "?"}
                        </span>
                      </div>
                      <span className={getConfidenceColor(p.confidence)}>
                        {p.confidence != null
                          ? `${Math.round(p.confidence * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
