import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Shipment } from "@/types/orchestra";
import { RiskBadge } from "@/components/RiskBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { getStatusColor, getStatusLabel } from "@/components/StatusWorkflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Filter, Search, Activity } from "lucide-react";

const REVIEW_STATUSES = ["all", "new", "in_review", "waiting_docs", "flagged", "customs_hold", "escalated", "sent_to_broker"];
const MODES = ["all", "air", "sea", "land"];
const RISK_FILTERS = [
  { value: "all", label: "All Risk" },
  { value: "critical", label: "Critical (85+)" },
  { value: "high", label: "High (60-84)" },
  { value: "medium", label: "Medium (40-59)" },
  { value: "low", label: "Low (<40)" },
];

type SortOption = "risk_desc" | "risk_asc" | "value_desc" | "value_asc" | "az" | "za" | "newest" | "oldest";

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("risk_desc");

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

  const filtered = useMemo(() => {
    let result = shipments;

    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    if (modeFilter !== "all") result = result.filter(s => s.mode === modeFilter);
    if (riskFilter === "critical") result = result.filter(s => s.risk_score >= 85);
    else if (riskFilter === "high") result = result.filter(s => s.risk_score >= 60 && s.risk_score < 85);
    else if (riskFilter === "medium") result = result.filter(s => s.risk_score >= 40 && s.risk_score < 60);
    else if (riskFilter === "low") result = result.filter(s => s.risk_score < 40);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.shipment_id.toLowerCase().includes(q) ||
        s.consignee.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.hs_code.includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "risk_desc": return b.risk_score - a.risk_score;
        case "risk_asc": return a.risk_score - b.risk_score;
        case "value_desc": return b.declared_value - a.declared_value;
        case "value_asc": return a.declared_value - b.declared_value;
        case "az": return a.shipment_id.localeCompare(b.shipment_id);
        case "za": return b.shipment_id.localeCompare(a.shipment_id);
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });

    return result;
  }, [shipments, statusFilter, modeFilter, riskFilter, search, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h1 className="text-lg font-bold font-mono">REVIEW QUEUE</h1>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] ml-auto">
            {filtered.length} SHIPMENTS
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-muted-foreground" />
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-7 h-8 w-48 text-xs font-mono bg-secondary/30 border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-mono bg-secondary/30 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs font-mono">
                  {s === "all" ? "All Status" : s.replace(/_/g, " ").toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-[100px] h-8 text-xs font-mono bg-secondary/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map(m => (
                <SelectItem key={m} value={m} className="text-xs font-mono">
                  {m === "all" ? "All Modes" : m.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-mono bg-secondary/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISK_FILTERS.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs font-mono">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px] h-8 text-xs font-mono bg-secondary/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk_desc" className="text-xs font-mono">Highest Risk</SelectItem>
              <SelectItem value="risk_asc" className="text-xs font-mono">Lowest Risk</SelectItem>
              <SelectItem value="value_desc" className="text-xs font-mono">Highest Value</SelectItem>
              <SelectItem value="value_asc" className="text-xs font-mono">Lowest Value</SelectItem>
              <SelectItem value="az" className="text-xs font-mono">A → Z</SelectItem>
              <SelectItem value="za" className="text-xs font-mono">Z → A</SelectItem>
              <SelectItem value="newest" className="text-xs font-mono">Newest First</SelectItem>
              <SelectItem value="oldest" className="text-xs font-mono">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-mono text-xs text-muted-foreground">ID</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground">MODE</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground">CONSIGNEE</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground">HS CODE</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground text-right">VALUE</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground text-center">RISK</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No shipments match filters.</TableCell></TableRow>
              ) : (
                filtered.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/shipment/${s.shipment_id}`)}>
                    <TableCell className="font-mono text-sm font-semibold text-primary">{s.shipment_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1"><ModeIcon mode={s.mode} size={14} className="text-muted-foreground" /><span className="font-mono text-xs uppercase">{s.mode}</span></div>
                    </TableCell>
                    <TableCell className="text-sm">{s.consignee}</TableCell>
                    <TableCell className="font-mono text-sm">{s.hs_code}</TableCell>
                    <TableCell className="font-mono text-sm text-right">${s.declared_value.toLocaleString()}</TableCell>
                    <TableCell className="text-center"><RiskBadge score={s.risk_score} size="sm" /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] ${getStatusColor(s.status)}`}>
                        {getStatusLabel(s.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
