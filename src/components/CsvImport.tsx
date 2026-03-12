import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const IMPORTABLE_FIELDS = [
  "shipment_id", "broker_name", "origin_country", "destination_country", "mode",
  "declared_value", "hs_code", "description", "consignee", "risk_score",
  "issue_type", "hold", "delay_days", "status", "responsible_party",
];

interface CsvImportProps {
  onComplete?: () => void;
}

export function CsvImport({ onComplete }: CsvImportProps) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      if (lines.length < 2) { toast.error("CSV must have header + data rows"); return; }
      setHeaders(lines[0]);
      setRows(lines.slice(1).filter((r) => r.some((c) => c)));
      // Auto-map by name similarity
      const autoMap: Record<number, string> = {};
      lines[0].forEach((h, i) => {
        const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const match = IMPORTABLE_FIELDS.find((f) => normalized.includes(f) || f.includes(normalized));
        if (match) autoMap[i] = match;
      });
      setMapping(autoMap);
      setResult(null);
    };
    reader.readAsText(file);
  }, []);

  const runImport = async () => {
    setImporting(true);
    let success = 0, errors = 0;

    // Get brokers for name normalization
    const { data: brokers } = await supabase.from("brokers").select("id, canonical_name, aliases");

    const findBroker = (name: string) => {
      if (!name || !brokers) return null;
      const lower = name.toLowerCase();
      return brokers.find((b) =>
        b.canonical_name.toLowerCase() === lower ||
        (b.aliases as string[]).some((a) => a.toLowerCase() === lower)
      );
    };

    for (const row of rows) {
      try {
        const mapped: Record<string, string> = {};
        Object.entries(mapping).forEach(([col, field]) => {
          mapped[field] = row[parseInt(col)] || "";
        });

        if (!mapped.shipment_id) { errors++; continue; }

        const broker = mapped.broker_name ? findBroker(mapped.broker_name) : null;
        const mode = (mapped.mode || "sea").toLowerCase();
        const validMode = ["air", "sea", "land"].includes(mode) ? mode : "sea";

        const { error } = await supabase.from("shipments").upsert({
          shipment_id: mapped.shipment_id,
          consignee: mapped.consignee || "Imported",
          description: mapped.description || "Imported shipment",
          hs_code: mapped.hs_code || "0000.00",
          mode: validMode as any,
          declared_value: parseFloat(mapped.declared_value) || 0,
          risk_score: parseInt(mapped.risk_score) || 0,
          origin_country: mapped.origin_country || null,
          destination_country: mapped.destination_country || null,
          assigned_broker: mapped.broker_name || null,
          broker_id: broker?.id || null,
          status: (mapped.status as any) || "new",
        }, { onConflict: "shipment_id" });

        if (error) { errors++; } else {
          success++;
          // Log import event
          if (mapped.issue_type || mapped.hold === "yes") {
            await supabase.from("shipment_events").insert({
              shipment_id: mapped.shipment_id,
              event_type: mapped.issue_type || "historical_import",
              description: `Imported: ${mapped.issue_type || "backfill"}${mapped.delay_days ? ` (${mapped.delay_days}d delay)` : ""}`,
              broker_id: broker?.id || null,
              evidence_quality: "user-entered",
              attribution: mapped.responsible_party || "unknown",
              confidence_level: 70,
            });
          }
        }
      } catch {
        errors++;
      }
    }

    setResult({ success, errors });
    setImporting(false);
    toast.success(`Imported ${success} shipments${errors > 0 ? `, ${errors} errors` : ""}`);
    onComplete?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-8 text-center">
        <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-3">Upload CSV file with historical shipment data</p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
        />
      </div>

      {headers.length > 0 && (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-mono text-xs text-muted-foreground mb-3">FIELD MAPPING — {rows.length} rows detected</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-32 truncate font-mono">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={mapping[i] || ""} onValueChange={(v) => setMapping((p) => ({ ...p, [i]: v }))}>
                    <SelectTrigger className="h-7 text-xs font-mono flex-1">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">Skip</SelectItem>
                      {IMPORTABLE_FIELDS.map((f) => (
                        <SelectItem key={f} value={f} className="text-xs font-mono">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
            <h3 className="font-mono text-xs text-muted-foreground mb-2">PREVIEW (first 3 rows)</h3>
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h, i) => (
                    <th key={i} className="p-1 text-left font-mono text-muted-foreground">{mapping[i] || <span className="opacity-30">{h}</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`p-1 font-mono ${mapping[ci] ? "" : "opacity-30"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={runImport} disabled={importing || !Object.values(mapping).includes("shipment_id")} className="gap-1.5">
            <FileText size={14} />
            {importing ? "Importing..." : `Import ${rows.length} rows`}
          </Button>
        </>
      )}

      {result && (
        <div className={`rounded-lg border p-4 flex items-center gap-3 ${result.errors > 0 ? "border-risk-medium/30 bg-risk-medium/5" : "border-risk-safe/30 bg-risk-safe/5"}`}>
          {result.errors > 0 ? <AlertTriangle size={18} className="text-risk-medium" /> : <CheckCircle size={18} className="text-risk-safe" />}
          <div>
            <p className="text-sm font-medium">{result.success} imported successfully</p>
            {result.errors > 0 && <p className="text-xs text-muted-foreground">{result.errors} rows had errors</p>}
          </div>
        </div>
      )}
    </div>
  );
}
