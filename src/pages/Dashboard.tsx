/**
 * Dashboard — Shipments command center
 *
 * 4 stat cards: Total / Blocked / Cleared / Avg Readiness
 * Shipments table with AI findings, severity badges, expandable exceptions panel
 */
import React, { useState, useMemo, useRef, useCallback } from "react";
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
  ChevronDown, ChevronRight, ArrowUpDown, Ship, Plane, Truck, Trash2, PlayCircle,
  Pencil, Check, X, Clock, AlertOctagon, CalendarDays, AlertCircle, FileWarning,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Shipment {
  shipment_id:           string;
  shipment_name:         string | null;
  display_name:          string | null;
  consignee:             string;
  origin_location:       string | null;
  dest_location:         string | null;
  mode:                  string | null;
  status:                string;
  readiness_score:       number | null;
  created_at:            string;
  expected_ship_date:    string | null;
  expected_arrival_date: string | null;
}

interface Exception {
  id: string;
  shipment_id: string;
  severity: string;
  category: string | null;
  field_name: string | null;
  source_document: string | null;
  found_value: string | null;
  expected_value: string | null;
  description: string | null;
  is_blocker: boolean;
  resolved: boolean;
}

interface ValidationRun {
  id: string;
  shipment_id: string;
  overall_status: string | null;
  readiness_score: number | null;
  triggered_at: string;
}

type UrgencyTier = "overdue" | "arriving_today" | "critical_24h" | "urgent_48h" | "warn_72h" | "watch_7d" | "normal" | "unknown";

function getUrgencyTier(arrivalDate: string | null): UrgencyTier {
  if (!arrivalDate) return "unknown";
  const today = new Date(); today.setHours(0,0,0,0);
  const arrival = new Date(arrivalDate + "T00:00:00");
  const diffDays = Math.round((arrival.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)  return "overdue";
  if (diffDays === 0) return "arriving_today";
  if (diffDays <= 1) return "critical_24h";
  if (diffDays <= 2) return "urgent_48h";
  if (diffDays <= 3) return "warn_72h";
  if (diffDays <= 7) return "watch_7d";
  return "normal";
}

const URGENCY_CFG: Record<UrgencyTier, { label: string; cls: string; icon?: any } | null> = {
  overdue:       { label: "OVERDUE",    cls: "bg-red-900/50 text-red-300 border-red-700",     icon: AlertOctagon },
  arriving_today:{ label: "TODAY",      cls: "bg-red-900/40 text-red-300 border-red-700",     icon: AlertOctagon },
  critical_24h:  { label: "< 24h",     cls: "bg-red-900/40 text-red-300 border-red-700",     icon: Clock },
  urgent_48h:    { label: "< 48h",     cls: "bg-amber-900/40 text-amber-300 border-amber-700", icon: Clock },
  warn_72h:      { label: "< 72h",     cls: "bg-amber-900/30 text-amber-400 border-amber-800", icon: Clock },
  watch_7d:      { label: "< 7 days",  cls: "bg-blue-900/30 text-blue-400 border-blue-800",   icon: CalendarDays },
  normal:        null,
  unknown:       null,
};

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
  clear:  { label: "Cleared",     cls: "bg-emerald-900/30 text-emerald-400 border-emerald-700", dot: "bg-emerald-500" },
  review: { label: "Review",      cls: "bg-amber-900/30   text-amber-400   border-amber-700",   dot: "bg-amber-500"   },
  hold:   { label: "Blocked",     cls: "bg-red-900/30     text-red-400     border-red-700",     dot: "bg-red-500"     },
  draft:  { label: "Draft",       cls: "bg-slate-800/50   text-slate-400   border-slate-600",   dot: "bg-slate-500"   },
};

const MODE_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  ocean: { label: "Sea",   icon: Ship,  cls: "bg-blue-900/30 text-blue-400 border-blue-700" },
  air:   { label: "Air",   icon: Plane, cls: "bg-purple-900/30 text-purple-400 border-purple-700" },
  land:  { label: "Land",  icon: Truck, cls: "bg-orange-900/30 text-orange-400 border-orange-700" },
};

const SEVERITY_CFG: Record<string, { cls: string; dot: string; label: string }> = {
  critical: { cls: "bg-red-900/40 text-red-300 border-red-700",       dot: "bg-red-500",    label: "Critical" },
  high:     { cls: "bg-orange-900/40 text-orange-300 border-orange-700", dot: "bg-orange-500", label: "High"   },
  medium:   { cls: "bg-amber-900/40 text-amber-300 border-amber-700",  dot: "bg-amber-500",  label: "Medium"   },
  low:      { cls: "bg-blue-900/30 text-blue-300 border-blue-700",     dot: "bg-blue-400",   label: "Low"      },
  info:     { cls: "bg-slate-800/50 text-slate-400 border-slate-600",  dot: "bg-slate-400",  label: "Info"     },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, onClick, active,
}: {
  label: string; value: string | number; sub?: string;
  color: "blue" | "red" | "green" | "amber";
  onClick?: () => void;
  active?: boolean;
}) {
  const colors = {
    blue:  { text: "text-blue-400",    ring: "ring-blue-700",    activeBg: "bg-blue-900/30"    },
    red:   { text: "text-red-400",     ring: "ring-red-700",     activeBg: "bg-red-900/30"     },
    green: { text: "text-emerald-400", ring: "ring-emerald-700", activeBg: "bg-emerald-900/30" },
    amber: { text: "text-amber-400",   ring: "ring-amber-700",   activeBg: "bg-amber-900/30"   },
  };
  const c = colors[color];
  return (
    <div
      onClick={onClick}
      className={cn(
        "border rounded-xl p-5 flex flex-col gap-1 transition-all",
        onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : "",
        active  ? `${c.activeBg} ring-2 ${c.ring}` : "bg-card",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold", c.text)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {onClick && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{active ? "↑ Filtering" : "Click to filter"}</p>}
    </div>
  );
}

// ── Export helper ─────────────────────────────────────────────────────────────
async function exportToExcel(rows: Shipment[]) {
  // @ts-ignore
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs");
  const data = rows.map(r => ({
    "Shipment Name":     r.display_name || r.shipment_name || r.consignee,
    "Consignee":         r.consignee,
    "Origin":            r.origin_location || "—",
    "Destination":       r.dest_location   || "—",
    "Mode":              r.mode            || "—",
    "Status":            deriveStatus(r),
    "Readiness %":       r.readiness_score ?? "—",
    "Expected Ship Date":r.expected_ship_date    || "—",
    "Expected Arrival":  r.expected_arrival_date || "—",
    "Urgency":           r.expected_arrival_date ? getUrgencyTier(r.expected_arrival_date) : "—",
    "Created":           format(new Date(r.created_at), "yyyy-MM-dd"),
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
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<DerivedStatus | "all">("all");
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Rename state
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const toggleRow = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: shipments = [], isLoading, refetch } = useQuery<Shipment[]>({
    queryKey: ["shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("shipment_id, shipment_name, display_name, consignee, origin_location, dest_location, mode, status, readiness_score, created_at, expected_ship_date, expected_arrival_date")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Shipment[];
    },
    enabled: !!user?.id,
  });

  const { data: allExceptions = [] } = useQuery<Exception[]>({
    queryKey: ["exceptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exceptions")
        .select("id, shipment_id, severity, category, field_name, source_document, found_value, expected_value, description, is_blocker, resolved")
        .order("severity");
      if (error) throw error;
      return (data ?? []) as Exception[];
    },
    enabled: !!user?.id,
  });

  const { data: validationRuns = [] } = useQuery<ValidationRun[]>({
    queryKey: ["validation_runs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_runs")
        .select("id, shipment_id, overall_status, readiness_score, triggered_at")
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ValidationRun[];
    },
    enabled: !!user?.id,
  });

  // ── Derived maps ─────────────────────────────────────────────────────────
  const exceptionsByShipment = useMemo(() => {
    const map = new Map<string, Exception[]>();
    for (const ex of allExceptions) {
      const list = map.get(ex.shipment_id) ?? [];
      list.push(ex);
      map.set(ex.shipment_id, list);
    }
    return map;
  }, [allExceptions]);

  const latestRunByShipment = useMemo(() => {
    const map = new Map<string, ValidationRun>();
    for (const run of validationRuns) {
      if (!map.has(run.shipment_id)) map.set(run.shipment_id, run);
    }
    return map;
  }, [validationRuns]);

  // ── Rename handlers ───────────────────────────────────────────────────────
  const startRename = useCallback((s: Shipment, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(s.shipment_id);
    setRenameValue(s.display_name || s.shipment_name || "");
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, []);

  const commitRename = useCallback(async () => {
    if (!renamingId) return;
    setSavingRename(true);
    try {
      await supabase.from("shipments")
        .update({ display_name: renameValue.trim() || null } as any)
        .eq("shipment_id", renamingId);
      await refetch();
    } finally {
      setSavingRename(false);
      setRenamingId(null);
    }
  }, [renamingId, renameValue, refetch]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = shipments.length;
    const blocked = shipments.filter(s => deriveStatus(s) === "hold").length;
    const cleared = shipments.filter(s => deriveStatus(s) === "clear").length;
    const scores  = shipments.map(s => s.readiness_score).filter(Boolean) as number[];
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total, blocked, cleared, avgScore };
  }, [shipments]);

  // ── Filtered + searched rows ──────────────────────────────────────────────
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from("documents").delete().eq("shipment_id", deleteTarget.shipment_id);
      await supabase.from("exceptions").delete().eq("shipment_id", deleteTarget.shipment_id);
      const { error } = await supabase.from("shipments").delete().eq("shipment_id", deleteTarget.shipment_id);
      if (error) throw error;
      await refetch();
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
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
              <StatCard label="Total Shipments" value={stats.total}   color="blue"  sub={`${rows.length} shown`}
                onClick={() => setFilter("all")} active={filter === "all"} />
              <StatCard label="Blocked"          value={stats.blocked} color="red"   sub="Requires action"
                onClick={() => setFilter(filter === "hold" ? "all" : "hold")} active={filter === "hold"} />
              <StatCard label="Cleared"          value={stats.cleared} color="green" sub="Ready to file"
                onClick={() => setFilter(filter === "clear" ? "all" : "clear")} active={filter === "clear"} />
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
                  {["","Shipment Name","Lane","Mode","Status","Readiness","ETA / Urgency","Findings",""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(s => {
                  const run        = latestRunByShipment.get(s.shipment_id);
                  const exceptions = exceptionsByShipment.get(s.shipment_id) ?? [];
                  const isExpanded = expandedRows.has(s.shipment_id);

                  // Use AI status if available, fall back to derived
                  const aiStatus: DerivedStatus =
                    run?.overall_status === "hold"   ? "hold"   :
                    run?.overall_status === "review" ? "review" :
                    run?.overall_status === "clear"  ? "clear"  :
                    deriveStatus(s);

                  const readiness = run?.readiness_score ?? s.readiness_score;
                  const cfg       = STATUS_CFG[aiStatus];
                  const modeCfg   = s.mode ? MODE_CFG[s.mode] : null;
                  const ModeIcon  = modeCfg?.icon;
                  const lane      = [s.origin_location, s.dest_location].filter(Boolean).join(" → ") || "—";
                  const name      = s.display_name || s.shipment_name || s.consignee || `SHP-${s.shipment_id.slice(0,8).toUpperCase()}`;
                  const urgency   = getUrgencyTier(s.expected_arrival_date);
                  const urgencyCfg= URGENCY_CFG[urgency];
                  const isRenaming= renamingId === s.shipment_id;

                  const rowBorder = aiStatus === "hold"   ? "border-l-4 border-l-red-500"
                                  : aiStatus === "review" ? "border-l-4 border-l-amber-500"
                                  : aiStatus === "clear"  ? "border-l-4 border-l-emerald-500"
                                  : "border-l-4 border-l-transparent";

                  const urgencyBg = (urgency === "overdue" || urgency === "arriving_today" || urgency === "critical_24h")
                    ? "bg-red-950/20" : "";

                  // Severity counts for badge summary
                  const activeExceptions = exceptions.filter(e => !e.resolved);
                  const criticalCount = activeExceptions.filter(e => e.severity === "critical").length;
                  const highCount     = activeExceptions.filter(e => e.severity === "high").length;
                  const mediumCount   = activeExceptions.filter(e => e.severity === "medium").length;
                  const totalCount    = activeExceptions.length;

                  return (
                    <React.Fragment key={s.shipment_id}>
                      <tr
                        className={cn("hover:bg-muted/30 transition-colors cursor-pointer", rowBorder, urgencyBg)}
                        onClick={() => !isRenaming && navigate(`/shipment/${s.shipment_id}`)}
                      >
                        {/* Expand toggle */}
                        <td className="px-2 py-3 w-8">
                          {totalCount > 0 && (
                            <button
                              onClick={(e) => toggleRow(s.shipment_id, e)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={isExpanded ? "Hide findings" : "Show findings"}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                              }
                            </button>
                          )}
                        </td>

                        {/* Shipment Name — inline rename */}
                        <td className="px-4 py-3 font-medium text-foreground max-w-[220px]">
                          {isRenaming ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                                className="h-7 text-xs px-2 py-0 w-36"
                              />
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600" onClick={commitRename} disabled={savingRename}>
                                <Check className="h-3.5 w-3.5"/>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setRenamingId(null)}>
                                <X className="h-3.5 w-3.5"/>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="truncate max-w-[160px]">{name}</span>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                onClick={e => startRename(s, e)}
                                title="Rename shipment"
                              >
                                <Pencil className="h-3 w-3"/>
                              </button>
                            </div>
                          )}
                        </td>

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
                          {readiness != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${readiness}%`,
                                  backgroundColor: readiness >= 80 ? "#10b981" : readiness >= 50 ? "#f59e0b" : "#ef4444",
                                }}/>
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">{readiness}%</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>

                        {/* ETA + Urgency */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {s.expected_arrival_date ? (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(s.expected_arrival_date + "T00:00:00"), "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">No ETA set</span>
                            )}
                            {urgencyCfg && (
                              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold w-fit", urgencyCfg.cls)}>
                                {urgencyCfg.icon && <urgencyCfg.icon className="h-2.5 w-2.5"/>}
                                {urgencyCfg.label}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Findings summary badges */}
                        <td className="px-4 py-3">
                          {totalCount > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {criticalCount > 0 && (
                                <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold", SEVERITY_CFG.critical.cls)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CFG.critical.dot)} />
                                  {criticalCount}
                                </span>
                              )}
                              {highCount > 0 && (
                                <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold", SEVERITY_CFG.high.cls)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CFG.high.dot)} />
                                  {highCount}
                                </span>
                              )}
                              {mediumCount > 0 && (
                                <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold", SEVERITY_CFG.medium.cls)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CFG.medium.dot)} />
                                  {mediumCount}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {aiStatus === "draft" ? (
                              <Button variant="outline" size="sm"
                                className="h-7 text-xs px-2.5 gap-1 text-primary border-primary/40 hover:bg-primary/10"
                                onClick={e => { e.stopPropagation(); navigate(`/validate?draft=${s.shipment_id}`); }}>
                                <PlayCircle className="h-3 w-3" /> Continue
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                                onClick={e => { e.stopPropagation(); navigate(`/shipment/${s.shipment_id}`); }}>
                                View
                              </Button>
                            )}
                            <Button variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={e => { e.stopPropagation(); setDeleteTarget(s); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable exceptions panel */}
                      {isExpanded && totalCount > 0 && (
                        <tr className={cn("bg-muted/10", rowBorder)}>
                          <td colSpan={9} className="px-6 py-4">
                            <div className="rounded-lg border border-border/50 overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/50">
                                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  AI Findings · {totalCount} issue{totalCount !== 1 ? "s" : ""} detected
                                </span>
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/30 bg-muted/10">
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Field</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Found</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expected</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                  {activeExceptions.map(ex => {
                                    const sev = SEVERITY_CFG[ex.severity] ?? SEVERITY_CFG.info;
                                    return (
                                      <tr key={ex.id} className="hover:bg-muted/20">
                                        <td className="px-3 py-2">
                                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold", sev.cls)}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                                            {sev.label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">{ex.category || "—"}</td>
                                        <td className="px-3 py-2 font-mono text-muted-foreground">{ex.field_name || "—"}</td>
                                        <td className="px-3 py-2 text-foreground max-w-[280px]">
                                          <span className="line-clamp-2">{ex.description || "—"}</span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-red-400 max-w-[120px]">
                                          <span className="truncate block">{ex.found_value || "—"}</span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-emerald-400 max-w-[120px]">
                                          <span className="truncate block">{ex.expected_value || "—"}</span>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground/70">
                                          <div className="flex items-center gap-1">
                                            <FileWarning className="h-3 w-3 shrink-0" />
                                            <span className="truncate max-w-[100px]">{ex.source_document || "—"}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {rows.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">{rows.length} shipment{rows.length !== 1 ? "s" : ""} · Click any row to open details · Click arrow to expand AI findings</p>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.shipment_name || deleteTarget?.consignee || "this shipment"}
              </span>{" "}
              and all associated documents and exceptions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete Shipment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
