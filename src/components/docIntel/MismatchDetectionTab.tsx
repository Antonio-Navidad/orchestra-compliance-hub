import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle, GitCompare, ArrowRight, ShieldAlert, Bug, ChevronDown } from "lucide-react";
import { HelpInfoIcon } from "@/components/HelpInfoIcon";
import { useDocumentLibrary, type LibraryDocument } from "@/hooks/useDocumentLibrary";
import { detectLibraryDocMismatches, type CrossDocMismatch, type FieldComparisonLog, type ComparisonResult } from "@/lib/crossDocMatching";
import { cn } from "@/lib/utils";

export function MismatchDetectionTab() {
  const { documents, loading, fetchDocuments } = useDocumentLibrary();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const extractedDocs = useMemo(
    () => documents.filter((d) => d.extraction_status === "complete" && d.extracted_fields && Object.keys(d.extracted_fields).length > 0),
    [documents]
  );

  const toggleDoc = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setComparisonResult(null);
  };

  const runComparison = () => {
    const selected = extractedDocs.filter((d) => selectedIds.has(d.id));
    if (selected.length < 2) return;
    const result = detectLibraryDocMismatches(selected);
    setComparisonResult(result);
  };

  const comparedMismatches = comparisonResult?.mismatches ?? null;
  const debugLog = comparisonResult?.debugLog ?? [];

  const severityColor = (s: string) => {
    switch (s) {
      case "high": return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    }
  };

  const severityIcon = (s: string) => {
    if (s === "high") return <ShieldAlert size={12} className="text-destructive" />;
    return null;
  };

  const debugResultColor = (r: string) => {
    switch (r) {
      case "match": return "text-emerald-400";
      case "mismatch": return "text-destructive";
      case "skipped": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Document selector */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <GitCompare size={14} className="text-primary" />
            Compare Documents
            <HelpInfoIcon helpKey="compare_documents" size={13} />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-[10px] font-mono text-muted-foreground mb-3">
            Select two or more extracted documents to run a fresh cross-document comparison.
          </p>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading documents...
            </div>
          ) : extractedDocs.length < 2 ? (
            <div className="py-8 text-center text-muted-foreground font-mono text-sm">
              Need at least 2 extracted documents to compare. Upload and extract documents first.
            </div>
          ) : (
            <>
              <div className="grid gap-2 max-h-[250px] overflow-y-auto mb-3">
                {extractedDocs.map((doc) => (
                  <label
                    key={doc.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-colors text-xs font-mono",
                      selectedIds.has(doc.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{doc.file_name}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {doc.document_type || "Unknown type"}
                        {doc.origin_country && doc.destination_country && ` · ${doc.origin_country} → ${doc.destination_country}`}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Extracted
                    </Badge>
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                onClick={runComparison}
                disabled={selectedIds.size < 2}
                className="w-full font-mono text-xs"
              >
                <GitCompare size={12} className="mr-1.5" />
                Compare {selectedIds.size} Document{selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mismatch Results */}
      {comparedMismatches !== null && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Comparison Results
              {comparedMismatches.length > 0 && (
                <Badge variant="outline" className="ml-auto text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                  {comparedMismatches.filter((m) => m.severity === "high").length} high ·{" "}
                  {comparedMismatches.filter((m) => m.severity === "medium").length} medium ·{" "}
                  {comparedMismatches.filter((m) => m.severity === "low").length} low
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {comparedMismatches.length === 0 ? (
              <div className="py-6 text-center flex flex-col items-center gap-2">
                <CheckCircle size={20} className="text-emerald-400" />
                <p className="text-xs font-mono text-muted-foreground">
                  No cross-document mismatches detected
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {comparedMismatches.map((m, i) => (
                  <div key={i} className={cn(
                    "border rounded p-3 space-y-2",
                    m.severity === "high" && "border-destructive/40 bg-destructive/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium capitalize flex items-center gap-1.5">
                        {severityIcon(m.severity)}
                        {m.fieldName.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {m.valueDifference && (
                          <Badge variant="outline" className="text-[9px] font-mono bg-destructive/10 text-destructive border-destructive/30">
                            Δ {m.valueDifference}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[9px] font-mono uppercase", severityColor(m.severity))}>
                          {m.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                      <div className="bg-muted/30 rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-0.5">{m.documents[0]?.docName}</p>
                        <p className="text-xs font-mono font-medium text-foreground">{m.documents[0]?.value}</p>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                      <div className="bg-muted/30 rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-0.5">{m.documents[1]?.docName}</p>
                        <p className="text-xs font-mono font-medium text-foreground">{m.documents[1]?.value}</p>
                      </div>
                    </div>
                    {m.customsImpact && (
                      <div className="flex items-start gap-1.5 bg-destructive/10 rounded px-2.5 py-1.5 border border-destructive/20">
                        <ShieldAlert size={11} className="text-destructive mt-0.5 shrink-0" />
                        <p className="text-[10px] font-mono text-destructive/90">
                          {m.customsImpact}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      {comparisonResult !== null && debugLog.length > 0 && (
        <Collapsible open={showDebug} onOpenChange={setShowDebug}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/20 transition-colors">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Bug size={14} className="text-muted-foreground" />
                  Debug: Field Comparison Log ({debugLog.length} fields)
                  <ChevronDown size={14} className={cn("ml-auto transition-transform text-muted-foreground", showDebug && "rotate-180")} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4">
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {debugLog.map((log, i) => (
                    <div key={i} className="border border-border/50 rounded p-2 text-[10px] font-mono">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{log.canonicalField}</span>
                        <span className={cn("uppercase font-bold", debugResultColor(log.result))}>
                          {log.result}
                        </span>
                      </div>
                      {log.entries.map((e, j) => (
                        <div key={j} className="flex gap-2 text-muted-foreground ml-2">
                          <span className="shrink-0 text-foreground/60">{e.docName}:</span>
                          <span className="text-foreground/80 truncate" title={e.value}>
                            {e.originalKey !== log.canonicalField && (
                              <span className="text-primary/60">[{e.originalKey}] </span>
                            )}
                            "{e.value}"
                          </span>
                        </div>
                      ))}
                      {log.note && (
                        <p className="text-muted-foreground/70 mt-0.5 ml-2 italic">{log.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
