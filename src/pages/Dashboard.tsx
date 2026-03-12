import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShipmentTable } from "@/components/ShipmentTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Ship, Truck, Activity, AlertTriangle, ShieldCheck, Package, CreditCard, Lightbulb, LogOut, ClipboardList, BarChart3, Users, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Shipment, TransportMode } from "@/types/orchestra";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [activeMode, setActiveMode] = useState<string>("all");
  const { signOut } = useAuth();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Shipment[];
    },
  });

  const stats = {
    total: shipments.length,
    critical: shipments.filter((s) => s.risk_score >= 85).length,
    flagged: shipments.filter((s) => s.status === "flagged" || s.status === "customs_hold").length,
    cleared: shipments.filter((s) => s.status === "cleared").length,
  };

  const statCards = [
    { label: "TOTAL SHIPMENTS", value: stats.total, icon: Package, color: "text-primary" },
    { label: "CRITICAL RISK", value: stats.critical, icon: AlertTriangle, color: "text-risk-critical" },
    { label: "FLAGGED / HOLD", value: stats.flagged, icon: Activity, color: "text-risk-medium" },
    { label: "CLEARED", value: stats.cleared, icon: ShieldCheck, color: "text-risk-safe" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">ORCHESTRA</h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">LOGISTICS COMPLIANCE PLATFORM</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 md:gap-4 flex-wrap">
            <Link to="/intake" className="text-xs font-mono text-primary hover:text-primary/80 transition-colors flex items-center gap-1 border border-primary/30 rounded px-2 py-1">
              <Plus size={12} /> NEW SHIPMENT
            </Link>
            <Link to="/pricing" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <CreditCard size={12} /> PLANS
            </Link>
            <Link to="/hints" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Lightbulb size={12} /> GUIDE
            </Link>
            <Link to="/review" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ClipboardList size={12} /> REVIEW
            </Link>
            <Link to="/analytics" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <BarChart3 size={12} /> ROI
            </Link>
            <Link to="/brokers" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Users size={12} /> BROKERS
            </Link>
            <Link to="/admin" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              ADMIN
            </Link>
            <Link to="/legal" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              LEGAL DB
            </Link>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-xs font-mono text-muted-foreground hover:text-foreground h-auto p-1">
              <LogOut size={12} />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 glow-blue">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{s.label}</span>
                <s.icon size={14} className={s.color} />
              </div>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>
                {isLoading ? "—" : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Shipment Table with Mode Tabs */}
        <Tabs value={activeMode} onValueChange={setActiveMode}>
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="all" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              ALL
            </TabsTrigger>
            <TabsTrigger value="air" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Plane size={12} className="mr-1" /> AIR
            </TabsTrigger>
            <TabsTrigger value="sea" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ship size={12} className="mr-1" /> SEA
            </TabsTrigger>
            <TabsTrigger value="land" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Truck size={12} className="mr-1" /> LAND
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ShipmentTable shipments={shipments} />
          </TabsContent>
          <TabsContent value="air" className="mt-4">
            <ShipmentTable shipments={shipments} mode="air" />
          </TabsContent>
          <TabsContent value="sea" className="mt-4">
            <ShipmentTable shipments={shipments} mode="sea" />
          </TabsContent>
          <TabsContent value="land" className="mt-4">
            <ShipmentTable shipments={shipments} mode="land" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
