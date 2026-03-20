import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export interface WorkflowShipment {
  shipment_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  mode: string;
  importer: string;
  origin_country: string;
  port_of_entry: string;
  commodity_type: string;
  hts_codes: string;
  declared_value: number;
  fta_program: string;
  advcd_applicable: boolean;
  section_301: boolean;
  estimated_duties: number;
  mpf: number;
  hmf: number;
  isf_filed: string;
  entry_type: string;
  cbp_hold: boolean;
  pga_agencies: string[];
  docs_uploaded: number;
  docs_required: number;
  discrepancies: number;
  score: number;
  status: string;
  notes: string;
}

// Document timeline event for export
interface DocEvent {
  shipment_id: string;
  document_type: string;
  event: string;
  timestamp: string;
  details: string;
}

// AI recommendation for export
interface AIRec {
  shipment_id: string;
  severity: string;
  title: string;
  finding: string;
  recommendation: string;
  financial_impact: number;
  resolved: boolean;
}

// Discrepancy for export
interface Discrepancy {
  shipment_id: string;
  doc_a: string;
  doc_b: string;
  field: string;
  finding: string;
  severity: string;
  resolved: boolean;
  resolution_note: string;
}

type SortDir = "asc" | "desc" | null;
type SortCol = string;

interface WorkflowLogTabProps {
  shipments: WorkflowShipment[];
  docEvents?: DocEvent[];
  aiRecs?: AIRec[];
  discrepancies?: Discrepancy[];
  onShipmentClick?: (id: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  currentShipmentId?: string;
}

const COLUMNS: Array<{ key: keyof WorkflowShipment; label: string; width?: string; format?: "currency" | "percent" | "bool" | "date" | "tags" }> = [
  { key: "shipment_id", label: "Shipment ID", width: "w-[100px]" },
  { key: "title", label: "Title", width: "w-[140px]" },
  { key: "created_at", label: "Created", format: "date", width: "w-[90px]" },
  { key: "updated_at", label: "Updated", format: "date", width: "w-[90px]" },
  { key: "mode", label: "Mode", width: "w-[80px]" },
  { key: "importer", label: "Importer", width: "w-[120px]" },
  { key: "origin_country", label: "Origin", width: "w-[70px]" },
  { key: "port_of_entry", label: "Port", width: "w-[90px]" },
  { key: "commodity_type", label: "Commodity", width: "w-[100px]" },
  { key: "hts_codes", label: "HTS", width: "w-[100px]" },
  { key: "declared_value", label: "Value USD", format: "currency", width: "w-[90px]" },
  { key: "fta_program", label: "FTA", width: "w-[70px]" },
  { key: "advcd_applicable", label: "AD/CVD", format: "bool", width: "w-[60px]" },
  { key: "section_301", label: "§301", format: "bool", width: "w-[50px]" },
  { key: "estimated_duties", label: "Duties $", format: "currency", width: "w-[80px]" },
  { key: "mpf", label: "MPF $", format: "currency", width: "w-[70px]" },
  { key: "hmf", label: "HMF $", format: "currency", width: "w-[70px]" },
  { key: "isf_filed", label: "ISF Filed", format: "date", width: "w-[90px]" },
  { key: "entry_type", label: "Entry", width: "w-[60px]" },
  { key: "cbp_hold", label: "Hold", format: "bool", width: "w-[50px]" },
  { key: "pga_agencies", label: "PGA", format: "tags", width: "w-[90px]" },
  { key: "docs_uploaded", label: "Docs ↑", width: "w-[50px]" },
  { key: "docs_required", label: "Docs Req", width: "w-[55px]" },
  { key: "discrepancies", label: "Discrep.", width: "w-[55px]" },
  { key: "score", label: "Score %", format: "percent", width: "w-[60px]" },
  { key: "status", label: "Status", width: "w-[90px]" },
  { key: "notes", label: "Notes", width: "w-[140px]" },
];

const STATUS_OPTIONS = ["All", "Draft", "Documents Pending", "Under Review", "Ready to File", "Filed", "Customs Hold", "Cleared", "Archived"];
const MODE_OPTIONS = ["All", "Ocean Import", "Air Import", "U.S. Export", "In-Bond / T&E"];

function formatDate(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }); } catch { return d; }
}

function formatCurrency(v: number) {
  if (!v && v !== 0) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function WorkflowLogTab({
  shipments,
  docEvents = [],
  aiRecs = [],
  discrepancies = [],
  onShipmentClick,
  onNotesChange,
  currentShipmentId,
}: WorkflowLogTabProps) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMode, setFilterMode] = useState("All");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortDir === "desc") { setSortCol(""); setSortDir(null); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let rows = [...shipments];
    if (filterStatus !== "All") rows = rows.filter(r => r.status === filterStatus);
    if (filterMode !== "All") rows = rows.filter(r => r.mode === filterMode);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
      );
    }
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const av = (a as any)[sortCol];
        const bv = (b as any)[sortCol];
        const cmp = typeof av === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [shipments, search, sortCol, sortDir, filterStatus, filterMode]);

  const exportToExcel = (singleShipmentId?: string) => {
    const rows = singleShipmentId ? shipments.filter(s => s.shipment_id === singleShipmentId) : filtered;
    const ids = new Set(rows.map(r => r.shipment_id));

    // Sheet 1: Shipment Summary
    const sheet1Data = rows.map(r => ({
      "Shipment ID": r.shipment_id,
      "Title": r.title,
      "Date Created": r.created_at,
      "Date Updated": r.updated_at,
      "Mode": r.mode,
      "Importer of Record": r.importer,
      "Country of Origin": r.origin_country,
      "Port of Entry": r.port_of_entry,
      "Commodity Type": r.commodity_type,
      "HTS Codes": r.hts_codes,
      "Declared Value USD": r.declared_value,
      "FTA Program": r.fta_program,
      "AD/CVD Applicable": r.advcd_applicable ? "Yes" : "No",
      "Section 301": r.section_301 ? "Yes" : "No",
      "Estimated Duties $": r.estimated_duties,
      "MPF $": r.mpf,
      "HMF $": r.hmf,
      "ISF Filed": r.isf_filed,
      "Entry Type": r.entry_type,
      "CBP Hold": r.cbp_hold ? "Yes" : "No",
      "PGA Agencies": (r.pga_agencies || []).join(", "),
      "Documents Uploaded": r.docs_uploaded,
      "Documents Required": r.docs_required,
      "Discrepancies Found": r.discrepancies,
      "Score %": r.score,
      "Status": r.status,
      "Notes": r.notes,
    }));

    // Sheet 2: Document Timeline
    const sheet2Data = docEvents
      .filter(e => ids.has(e.shipment_id))
      .map(e => ({
        "Shipment ID": e.shipment_id,
        "Document Type": e.document_type,
        "Event": e.event,
        "Timestamp": e.timestamp,
        "Details": e.details,
      }));

    // Sheet 3: AI Analysis Log
    const sheet3Data = aiRecs
      .filter(r => ids.has(r.shipment_id))
      .map(r => ({
        "Shipment ID": r.shipment_id,
        "Severity": r.severity,
        "Title": r.title,
        "Finding": r.finding,
        "Recommendation": r.recommendation,
        "Financial Impact $": r.financial_impact,
        "Resolved": r.resolved ? "Yes" : "No",
      }));

    // Sheet 4: Discrepancy Log
    const sheet4Data = discrepancies
      .filter(d => ids.has(d.shipment_id))
      .map(d => ({
        "Shipment ID": d.shipment_id,
        "Document A": d.doc_a,
        "Document B": d.doc_b,
        "Field": d.field,
        "Finding": d.finding,
        "Severity": d.severity,
        "Resolved": d.resolved ? "Yes" : "No",
        "Resolution Note": d.resolution_note,
      }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data.length ? sheet1Data : [{ "No data": "" }]);
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data.length ? sheet2Data : [{ "No document events recorded": "" }]);
    const ws3 = XLSX.utils.json_to_sheet(sheet3Data.length ? sheet3Data : [{ "No AI recommendations": "" }]);
    const ws4 = XLSX.utils.json_to_sheet(sheet4Data.length ? sheet4Data : [{ "No discrepancies": "" }]);

    // Set column widths
    const setWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
      ws["!cols"] = widths.map(w => ({ wch: w }));
    };
    setWidths(ws1, [14, 20, 12, 12, 14, 20, 10, 14, 14, 16, 14, 10, 10, 8, 12, 8, 8, 14, 8, 8, 16, 8, 8, 10, 8, 12, 30]);
    setWidths(ws2, [14, 20, 16, 20, 40]);
    setWidths(ws3, [14, 10, 30, 40, 40, 14, 8]);
    setWidths(ws4, [14, 20, 20, 16, 40, 10, 8, 40]);

    XLSX.utils.book_append_sheet(wb, ws1, "Shipment Summary");
    XLSX.utils.book_append_sheet(wb, ws2, "Document Timeline");
    XLSX.utils.book_append_sheet(wb, ws3, "AI Analysis Log");
    XLSX.utils.book_append_sheet(wb, ws4, "Discrepancy Log");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = singleShipmentId
      ? `Orchestra_${singleShipmentId}_${dateStr}.xlsx`
      : `Orchestra_Workflow_Log_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const renderCellValue = (row: WorkflowShipment, col: typeof COLUMNS[number]) => {
    const val = row[col.key];
    if (col.key === "notes") {
      if (editingNotes === row.shipment_id) {
        return (
          <Input
            value={notesDraft}
            onChange={e => setNotesDraft(e.target.value)}
            onBlur={() => {
              onNotesChange?.(row.shipment_id, notesDraft);
              setEditingNotes(null);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                onNotesChange?.(row.shipment_id, notesDraft);
                setEditingNotes(null);
              }
            }}
            className="h-6 text-[11px] px-1.5"
            autoFocus
          />
        );
      }
      return (
        <span
          className="cursor-text hover:bg-muted/50 rounded px-1 py-0.5 block truncate"
          onClick={e => {
            e.stopPropagation();
            setEditingNotes(row.shipment_id);
            setNotesDraft(String(val ?? ""));
          }}
          title="Click to edit"
        >
          {val || <span className="text-muted-foreground/50 italic">Add note…</span>}
        </span>
      );
    }
    if (col.format === "currency") return formatCurrency(val as number);
    if (col.format === "percent") {
      const n = val as number;
      return (
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
          n >= 90 ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" :
          n >= 50 ? "border-amber-500/40 text-amber-600 dark:text-amber-400" :
          "border-destructive/40 text-destructive"
        )}>
          {n}%
        </Badge>
      );
    }
    if (col.format === "bool") {
      return val ? <span className="text-destructive font-semibold">Yes</span> : <span className="text-muted-foreground">No</span>;
    }
    if (col.format === "date") return formatDate(val as string);
    if (col.format === "tags") {
      const arr = val as string[];
      if (!arr?.length) return "—";
      return <span className="text-[10px]">{arr.join(", ")}</span>;
    }
    if (col.key === "shipment_id") {
      return <span className="text-primary font-semibold cursor-pointer hover:underline">{val}</span>;
    }
    if (col.key === "status") {
      const s = val as string;
      return (
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
          s === "Cleared" ? "border-emerald-500/40 text-emerald-600" :
          s === "Customs Hold" ? "border-destructive/40 text-destructive" :
          s === "Ready to File" ? "border-primary/40 text-primary" :
          "border-border"
        )}>
          {s}
        </Badge>
      );
    }
    return String(val ?? "—");
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col || !sortDir) return <ArrowUpDown size={10} className="text-muted-foreground/40" />;
    return sortDir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-primary" />
              Workflow Log
              <Badge variant="outline" className="text-[10px] ml-1">{filtered.length} shipments</Badge>
            </CardTitle>
            <div className="flex gap-2">
              {currentShipmentId && (
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1.5" onClick={() => exportToExcel(currentShipmentId)}>
                  <Download size={10} /> Export Current
                </Button>
              )}
              <Button size="sm" className="text-[10px] h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => exportToExcel()}>
                <Download size={10} /> Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shipments…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 text-[11px] pl-7"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map(m => <SelectItem key={m} value={m} className="text-[11px]">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-auto max-h-[520px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {COLUMNS.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn("text-[10px] font-semibold cursor-pointer select-none whitespace-nowrap px-2 py-2", col.width)}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center py-12 text-xs text-muted-foreground">
                    No shipments match your filters. Create a new shipment to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(row => (
                  <TableRow
                    key={row.shipment_id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      row.shipment_id === currentShipmentId && "bg-primary/5"
                    )}
                    onClick={() => onShipmentClick?.(row.shipment_id)}
                  >
                    {COLUMNS.map(col => (
                      <TableCell key={col.key} className="text-[11px] px-2 py-1.5 whitespace-nowrap">
                        {renderCellValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
