import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspacePurpose, WORKSPACE_PURPOSES } from "@/hooks/useWorkspacePurpose";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Package, Map, FileText, Radio, ShoppingCart,
  Zap, Eye, Scale, ClipboardList, Users, BarChart3,
  ArrowRight, Activity, AlertTriangle, ShieldCheck,
  Route, Search, Fingerprint,
} from "lucide-react";
import type { Shipment } from "@/types/orchestra";

interface WorkflowCTA {
  label: string;
  url: string;
  icon: any;
  description: string;
}

const PURPOSE_CTAS: Record<string, WorkflowCTA[]> = {
  marketplace: [
    { label: "New Shipment", url: "/intake", icon: Plus, description: "Create a new shipment from an order" },
    { label: "New Route", url: "/creator-mode", icon: Route, description: "Build a custom delivery route" },
    { label: "Track Orders", url: "/review", icon: Package, description: "View and manage active shipments" },
    { label: "Seller Dashboard", url: "/seller-mode", icon: ShoppingCart, description: "Marketplace fulfillment view" },
  ],
  compliance: [
    { label: "New Document Review", url: "/validate-docs", icon: FileText, description: "Validate shipment documents" },
    { label: "New Compliance Check", url: "/dian-compliance", icon: Fingerprint, description: "Run regional compliance" },
    { label: "Classify Product", url: "/classify", icon: Search, description: "HS code classification" },
    { label: "New Shipment", url: "/intake", icon: Plus, description: "Start a new shipment intake" },
  ],
  route_planning: [
    { label: "New Route", url: "/creator-mode", icon: Eye, description: "Design a multimodal route on the map" },
    { label: "Route Builder", url: "/route-builder", icon: Map, description: "AI-powered route optimization" },
    { label: "Decision Twin", url: "/decision-twin", icon: Zap, description: "Run scenario analysis" },
    { label: "New Shipment", url: "/intake", icon: Plus, description: "Create a shipment for your route" },
  ],
  operations: [
    { label: "New Shipment", url: "/intake", icon: Plus, description: "Start a new shipment" },
    { label: "Watch Mode", url: "/watch-mode", icon: Radio, description: "Monitor live shipments" },
    { label: "Review Queue", url: "/review", icon: ClipboardList, description: "Handle pending actions" },
    { label: "New Route", url: "/creator-mode", icon: Route, description: "Plan a new logistics route" },
  ],
  enterprise: [
    { label: "New Shipment", url: "/intake", icon: Plus, description: "Create a new shipment" },
    { label: "Team Management", url: "/teams", icon: Users, description: "Manage workspace members" },
    { label: "Analytics", url: "/analytics", icon: BarChart3, description: "Review performance and ROI" },
    { label: "Watch Mode", url: "/watch-mode", icon: Radio, description: "Live operations monitoring" },
  ],
};

const PURPOSE_KPIS: Record<string, string[]> = {
  marketplace: ["Active Orders", "In Transit", "Pending Hand-off", "Delivered Today"],
  compliance: ["Pending Reviews", "Open Risks", "Cleared Today", "Audit Items"],
  route_planning: ["Active Routes", "Draft Routes", "Scenarios Run", "Avg ETA Accuracy"],
  operations: ["Active Shipments", "Exceptions", "Watch Alerts", "Escalations"],
  enterprise: ["Team Members", "Active Shipments", "Compliance Score", "Monthly Volume"],
};

export default function WorkspaceHome() {
  const { purpose } = useWorkspacePurpose();
  const currentPurpose = WORKSPACE_PURPOSES.find(p => p.id === purpose);
  const ctas = PURPOSE_CTAS[purpose || "operations"] || PURPOSE_CTAS.operations;
  const kpiLabels = PURPOSE_KPIS[purpose || "operations"] || PURPOSE_KPIS.operations;

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("shipment_id, status, mode")
        .limit(100);
      if (error) throw error;
      return data as unknown as Shipment[];
    },
  });

  const activeCount = shipments.filter(s => s.status === "in_transit" || s.status === "customs_hold").length;
  const pendingCount = shipments.filter(s => s.status === "new" || s.status === "waiting_docs").length;
  const clearedCount = shipments.filter(s => s.status === "cleared").length;
  const totalCount = shipments.length;

  const kpiValues = [
    String(activeCount || "—"),
    String(pendingCount || "—"),
    String(clearedCount || "—"),
    String(totalCount || "—"),
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{currentPurpose?.icon}</span>
            <h1 className="text-xl font-bold text-foreground">{currentPurpose?.label || "Home"}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{currentPurpose?.subtitle}</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="text-xs font-mono gap-1">
            <Activity size={12} /> Full Dashboard <ArrowRight size={12} />
          </Button>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiLabels.map((label, i) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{kpiValues[i]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start New Workflow */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus size={14} className="text-primary" />
          Start New Workflow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ctas.map((cta) => (
            <Link key={cta.url + cta.label} to={cta.url}>
              <Card className="bg-card border-border hover:border-primary/40 hover:bg-accent/30 transition-all cursor-pointer group h-full">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <cta.icon size={16} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {cta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {cta.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Shipments */}
      {shipments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package size={14} className="text-muted-foreground" />
              Recent Shipments
            </h2>
            <Link to="/review">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                View All <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shipments.slice(0, 6).map((s) => (
              <Link key={s.shipment_id} to={`/shipment/${s.shipment_id}`}>
                <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-foreground">{s.shipment_id}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {s.mode?.toUpperCase() || "—"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {shipments.length === 0 && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center">
            <Package size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No shipments yet. Start your first workflow above.</p>
            <Link to="/intake">
              <Button size="sm" className="gap-1">
                <Plus size={14} /> Create First Shipment
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
