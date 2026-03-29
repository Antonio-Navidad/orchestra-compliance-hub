/**
 * Dashboard — Shipments command center
 *
 * 4 stat cards: Total / Blocked / Cleared / Avg Readiness
 * Shipments table: Name, Lane, Mode, Status, Readiness %, Date, Actions
 * Excel export via SheetJS
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard, Plus, Search, Download, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Shield,
  ChevronDown, ArrowUpDown, Ship, Plane, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Shipment {
  shipment_id:    string;
  shipment_name:  string | null;
  consignee:      string;
  origin_location:string | null;
  dest_location:  string | null;
  mode:           string | null;
  status:         string;
  readiness_score:number | null;
  created_at:     string;
}

type DerivedStatus = "clear" | "review" | "hold" | "draft";

function deriveStatus(s: Shipment): DerivedStatus {
  if (s.status === "cleared") return "clear";
  if (s.status === "hold")    return "hold";
  if (s.status === "new" || s.status === "draft") return "draft";
  if (s.readiness_score != null) {
    if (s.readiness_score >= 70) return "hold";
    if (s.readiness_score >= 40) return "review";
    return "clear";
  }
  return "draft";
}

const STATUS_CFG: Record<DerivedStatus, { label: string; cls: string; dot: string }> = {
  clear:  { label: "Cleared",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  review: { label: "Review",      cls: "bg-amber-50   text-amber-700   border-amber-200",   dot: "bg-amber-500"   },
  hold:   { label: "Blocked",     cls: "bg-red-50     text-red-700     border-red-200",     dot: "bg-red-500"     },
  draft:  { label: "Draft",       cls: "bg-slate-50   text-slate-500   border-slate-200",   dot: "bg-slate-400"   },
};

const MODE_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  ocean: { label: "Sea",   icon: Ship,  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  air:   { label: "Air",   icon: Plane, cls: "bg-purple-50 text-purple-700 border-purple-200" },
  land:  { label: "Land",  icon: Truck, cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: "blue" | "red" | "green" | "amber" }) {
  const colors = {
    blue:  "text-blue-600   bg-blue-50   border-blue-100",
    red:   "text-red-600    bg-red-50    border-red-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600  bg-amber-50  border-amber-100",
  };
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold", colors[color].split(" ")[0])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Export helper ─────────────────────────────────────────────────────────────
async function exportToExcel(rows: Shipment[]) {
  // @ts-ignore
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs");
  const data = rows.map(r => ({
    "Shipment Name": r.shipment_name || r.consignee,
    "Consignee":     r.consignee,
    "Origin":        r.origin_location || "—",
    "Destination":   r.dest_location   || "—",
    "Mode":          r.mode            || "—",
    "Status":        deriveStatus(r),
    "Readiness %":   r.readiness_score ?? "—",
    "Date":          format(new Date(r.created_at), "yyyy-MM-dd"),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Shipments");
  XLSX.writeFile(wb, `orchestra-shipments-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<DerivedStatus | "all">("all");
  const [exporting, setExporting] = useState(false);

  const { data: shipments = [], isLoading, refetch } = useQuery<Shipment[]>({
    queryKey: ["shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("shipment_id, shipment_name, consignee, origin_location, dest_location, mode, status, readiness_score, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Shipment[];
    },
    enabled: !!user?.id,
  });

  // Stats
  const stats = useMemo(() => {
    const total   = shipments.length;
    const blocked = shipments.filter(s => deriveStatus(s) === "hold").length;
    const cleared = shipments.filter(s => deriveStatus(s) === "clear").length;
    const scores  = shipments.map(s => s.readiness_score).filter(Boolean) as number[];
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total, blocked, cleared, avgScore };
  }, [shipments]);

  // Filtered + searched rows
  const rows = useMemo(() => {
    return shipments.filter(s => {
      const matchStatus = filter === "all" || deriveStatus(s) === filter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || (s.shipment_name || s.consignee).toLowerCase().includes(q)
        || s.consignee.toLowerCase().includes(q)
        || (s.origin_location || "").toLowerCase().includes(q)
        || (s.dest_location || "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [shipments, filter, search]);

  const handleExport = async () => {
    setExporting(true);
    try { await exportToExcel(rows); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">

      {/* Page header */}
      <div className="border-b bg-card/50 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Shipments</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || rows.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting…" : "Export Excel"}
          </Button>
          <Button size="sm" onClick={() => navigate("/validate")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Validation
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl"/>) : (
            <>
              <StatCard label="Total Shipments" value={stats.total}   color="blue"  sub={`${rows.length} shown`} />
              <StatCard label="Blocked"          value={stats.blocked} color="red"   sub="Requires action" />
              <StatCard label="Cleared"          value={stats.cleared} color="green" sub="Ready to file" />
              <StatCard label="Avg Readiness"    value={`${stats.avgScore}%`} color="amber" sub="Across all shipments" />
            </>
          )}
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shipments…" className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all","clear","review","hold","draft"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {f === "all" ? "All" : STATUS_CFG[f]?.label ?? f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12"/>)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No shipments yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload documents on the Validate page to get started.</p>
              <Button size="sm" className="mt-4 gap-1.5" onClick={() => navigate("/validate")}><Plus className="h-3.5 w-3.5"/>New Validation</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Shipment Name","Lane","Mode","Status","Readiness","Date",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(s => {
                  const status  = deriveStatus(s);
                  const cfg     = STATUS_CFG[status];
                  const modeCfg = s.mode ? MODE_CFG[s.mode] : null;
                  const ModeIcon= modeCfg?.icon;
                  const lane    = [s.origin_location, s.dest_location].filter(Boolean).join(" → ") || "—";
                  const name    = s.shipment_name || s.consignee || `SHP-${s.shipment_id.slice(0,8).toUpperCase()}`;

                  return (
                    <tr key={s.shipment_id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/shipment/${s.shipment_id}`)}>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap max-w-[200px] truncate">{name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{lane}</td>
                      <td className="px-4 py-3">
                        {modeCfg ? (
                          <Badge variant="outline" className={cn("gap-1 text-[11px]", modeCfg.cls)}>
                            {ModeIcon && <ModeIcon className="h-3 w-3"/>}{modeCfg.label}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold", cfg.cls)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.readiness_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.readiness_score}%`,
                                  backgroundColor: s.readiness_score >= 80 ? "#10b981" : s.readiness_score >= 50 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{s.readiness_score}%</span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(s.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={e => { e.stopPropagation(); navigate(`/shipment/${s.shipment_id}`); }}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {rows.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">{rows.length} shipment{rows.length !== 1 ? "s" : ""} · Click any row to open details</p>
        )}
      </div>
    </div>
  );
}
