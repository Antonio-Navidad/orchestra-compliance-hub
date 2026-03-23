import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedDocData, CrossRefResult } from "@/hooks/useDocExtraction";

interface AIVerificationTabProps {
  extractedDocs: Record<string, ExtractedDocData>;
  crossRefResults: CrossRefResult[];
  onOpenDrawer?: (alertId: string, context?: Record<string, any>) => void;
}

const DOC_LABELS: Record<string, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  air_waybill: "Air Waybill",
  isf_filing: "ISF 10+2 Filing",
  certificate_of_origin: "Certificate of Origin",
  fta_certificate: "FTA Certificate",
  entry_summary: "Entry Summary (7501)",
  customs_bond: "Customs Bond",
  insurance_certificate: "Insurance Certificate",
  freight_invoice: "Freight Invoice",
};

function docLabel(id: string) {
  return DOC_LABELS[id] || id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

type CoherenceRow = {
  docA: string;
  docB: string;
  field: string;
  result: "match" | "partial" | "mismatch";
  finding?: string;
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/90 text-white",
  medium: "bg-amber-500/90 text-white",
  low: "bg-muted text-muted-foreground",
};

const CHECK_PAIRS: Array<{ a: string; b: string; fields: string[] }> = [
  { a: "commercial_invoice", b: "packing_list", fields: ["declared value", "total weight", "carton count", "line item descriptions"] },
  { a: "commercial_invoice", b: "bill_of_lading", fields: ["consignee name", "cargo description", "notify party"] },
  { a: "isf_filing", b: "bill_of_lading", fields: ["container numbers", "seal numbers", "HTS 6-digit codes"] },
  { a: "isf_filing", b: "commercial_invoice", fields: ["country of origin", "manufacturer address"] },
  { a: "fta_certificate", b: "commercial_invoice", fields: ["country of origin", "certificate expiry"] },
  { a: "certificate_of_origin", b: "commercial_invoice", fields: ["country of origin", "certificate expiry"] },
  { a: "entry_summary", b: "commercial_invoice", fields: ["declared value", "HTS codes", "importer name"] },
];

export function AIVerificationTab({ extractedDocs, crossRefResults, onOpenDrawer }: AIVerificationTabProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set());

  const docIds = Object.keys(extractedDocs);
  const hasData = docIds.length >= 1;

  // Build coherence matrix rows — uses saved crossref_results as source of truth
  const coherenceRows = useMemo<CoherenceRow[]>(() => {
    const rows: CoherenceRow[] = [];
    const uploadedSet = new Set(docIds);
    // Index crossref results by doc pair for efficient lookup
    const crByPair = new Map<string, typeof crossRefResults>();
    for (const cr of crossRefResults) {
      const keyAB = `${cr.document_a}|${cr.document_b}`;
      const keyBA = `${cr.document_b}|${cr.document_a}`;
      if (!crByPair.has(keyAB)) crByPair.set(keyAB, []);
      crByPair.get(keyAB)!.push(cr);
      if (!crByPair.has(keyBA)) crByPair.set(keyBA, []);
      crByPair.get(keyBA)!.push(cr);
    }

    for (const pair of CHECK_PAIRS) {
      if (!uploadedSet.has(pair.a) && !uploadedSet.has(pair.b)) continue;
      const bothPresent = uploadedSet.has(pair.a) && uploadedSet.has(pair.b);
      const pairResults = crByPair.get(`${pair.a}|${pair.b}`) || [];

      for (const field of pair.fields) {
        // Match: check if any crossref finding relates to this field
        const fieldWords = field.toLowerCase().split(/\s+/);
        const issue = pairResults.find(cr => {
          const checked = cr.field_checked.toLowerCase();
          // Match if any word from the field label appears in the field_checked,
          // or if field_checked contains the full field name
          return fieldWords.some(w => w.length > 2 && checked.includes(w)) || checked.includes(field.toLowerCase());
        });

        // Also check if the finding text mentions this field
        const findingIssue = !issue ? pairResults.find(cr => {
          const finding = cr.finding.toLowerCase();
          return fieldWords.some(w => w.length > 3 && finding.includes(w));
        }) : null;

        const matched = issue || findingIssue;

        if (matched) {
          // Only show as "match" if the finding is explicitly a pass (no action needed)
          const isPass = (matched.finding + ' ' + matched.recommendation).toLowerCase().includes('no action needed');
          if (isPass) {
            rows.push({ docA: pair.a, docB: pair.b, field, result: "match" });
          } else {
            rows.push({
              docA: pair.a, docB: pair.b, field,
              result: matched.severity === "critical" || matched.severity === "high" ? "mismatch" : "partial",
              finding: matched.finding,
            });
          }
        } else if (bothPresent) {
          rows.push({ docA: pair.a, docB: pair.b, field, result: "match" });
        }
      }
    }

    // Add any crossref results that don't match any CHECK_PAIRS field (catch-all)
    const coveredPairFields = new Set(rows.map(r => `${r.docA}|${r.docB}|${r.field}`));
    for (const cr of crossRefResults) {
      const isPassCheck = (cr.finding + ' ' + (cr.recommendation || '')).toLowerCase();
      if (isPassCheck.includes('no action needed') || isPassCheck.includes('no discrepancy')) continue;
      
      const alreadyCovered = rows.some(r =>
        ((r.docA === cr.document_a && r.docB === cr.document_b) || (r.docA === cr.document_b && r.docB === cr.document_a)) &&
        r.finding === cr.finding
      );
      if (!alreadyCovered) {
        rows.push({
          docA: cr.document_a, docB: cr.document_b,
          field: cr.field_checked,
          result: cr.severity === "critical" || cr.severity === "high" ? "mismatch" : "partial",
          finding: cr.finding,
        });
      }
    }

    return rows;
  }, [docIds, crossRefResults]);

  // Sort recommendations by severity, filtering out passing checks
  const sortedRecommendations = useMemo(() => {
    return [...crossRefResults]
      .filter(r => {
        const lower = (r.finding + ' ' + r.recommendation).toLowerCase();
        return !lower.includes('no action needed') && !lower.includes('match') && !lower.includes('no discrepancy');
      })
      .sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      );
  }, [crossRefResults]);

  const handleResolve = (idx: number) => {
    setResolvedIds(prev => new Set(prev).add(idx));
  };

  if (!hasData) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="mx-auto mb-3 text-muted-foreground" size={32} />
            <p className="text-sm font-semibold text-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Upload documents in the Documents tab. Once two or more documents are uploaded,
              Orchestra's AI will cross-reference all data points and surface discrepancies here.
            </p>
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Panel 1: Document Coherence Matrix ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            Document Coherence Matrix
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Cross-reference results for {docIds.length} uploaded document{docIds.length !== 1 ? "s" : ""}
            {" · "}{coherenceRows.length} data points checked
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {coherenceRows.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-muted-foreground">
              Upload at least two documents to see cross-reference analysis.
            </div>
          ) : (
            <div className="overflow-auto max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold w-[22%]">Document A</TableHead>
                    <TableHead className="text-[11px] font-semibold w-[22%]">Document B</TableHead>
                    <TableHead className="text-[11px] font-semibold w-[26%]">Data Point Checked</TableHead>
                    <TableHead className="text-[11px] font-semibold w-[30%]">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coherenceRows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        "cursor-pointer transition-colors",
                        row.result === "mismatch" && "bg-destructive/5 hover:bg-destructive/10",
                        row.result === "partial" && "bg-amber-500/5 hover:bg-amber-500/10"
                      )}
                      onClick={() => {
                        if (row.result !== "match" && onOpenDrawer) {
                          onOpenDrawer("cross_ref_mismatch", {
                            docA: docLabel(row.docA),
                            docB: docLabel(row.docB),
                            field: row.field,
                            finding: row.finding,
                          });
                        }
                      }}
                    >
                      <TableCell className="text-xs font-medium py-2.5">{docLabel(row.docA)}</TableCell>
                      <TableCell className="text-xs font-medium py-2.5">{docLabel(row.docB)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5 capitalize">{row.field}</TableCell>
                      <TableCell className="py-2.5">
                        <ResultBadge result={row.result} finding={row.finding} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Panel 2: AI Recommendations ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            AI Recommendations
            {sortedRecommendations.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {sortedRecommendations.length - resolvedIds.size} open
              </Badge>
            )}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Prioritized issues sorted by regulatory severity and financial impact
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedRecommendations.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={28} />
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                No discrepancies detected across uploaded documents. Continue uploading remaining documents for a complete verification.
              </p>
            </div>
          ) : (
            sortedRecommendations.map((rec, i) => {
              const isResolved = resolvedIds.has(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3.5 transition-all",
                    isResolved
                      ? "opacity-50 border-border bg-muted/30"
                      : rec.severity === "critical"
                        ? "border-destructive/40 bg-destructive/5"
                        : rec.severity === "high"
                          ? "border-orange-500/30 bg-orange-500/5"
                          : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-muted-foreground/70 w-5 shrink-0">
                          {i + 1}.
                        </span>
                        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", SEVERITY_COLORS[rec.severity])}>
                          {rec.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {docLabel(rec.document_a)} ↔ {docLabel(rec.document_b)}: {rec.field_checked}
                        </span>
                      </div>

                      <p className="text-[12px] leading-relaxed text-foreground/80 ml-7">
                        {rec.finding}. {rec.recommendation}
                      </p>

                      {rec.estimated_financial_impact_usd > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 ml-7">
                          <DollarSign size={12} className="text-destructive" />
                          <span className="text-[11px] font-semibold text-destructive">
                            Estimated financial impact: ${rec.estimated_financial_impact_usd.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant={isResolved ? "ghost" : "outline"}
                      size="sm"
                      className={cn("text-[10px] h-7 px-2.5 shrink-0", isResolved && "pointer-events-none")}
                      onClick={() => handleResolve(i)}
                      disabled={isResolved}
                    >
                      {isResolved ? (
                        <><Check size={10} className="mr-1" /> Resolved</>
                      ) : (
                        "Mark resolved"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}

function ResultBadge({ result, finding }: { result: CoherenceRow["result"]; finding?: string }) {
  if (result === "match") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={13} /> Match
      </span>
    );
  }
  if (result === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400" title={finding}>
        <AlertTriangle size={13} /> Partial
        {finding && <span className="text-[10px] font-normal text-muted-foreground truncate max-w-[140px]">— {finding}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-destructive" title={finding}>
      <XCircle size={13} /> Mismatch
      {finding && <span className="text-[10px] font-normal text-muted-foreground truncate max-w-[140px]">— {finding}</span>}
    </span>
  );
}

function Disclaimer() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-start gap-2.5">
      <Sparkles size={14} className="text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Analysis powered by Claude claude-sonnet-4-6. All extracted data should be verified against
        original documents before filing. The broker retains final filing responsibility as the
        importer's legal representative.
      </p>
    </div>
  );
}
