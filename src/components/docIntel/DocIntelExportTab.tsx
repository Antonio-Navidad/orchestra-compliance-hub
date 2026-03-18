import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { useValidationHistory, type ValidationSession } from "@/hooks/useValidationHistory";
import { useLanguage } from "@/hooks/useLanguage";
import * as XLSX from "xlsx";

export function DocIntelExportTab() {
  const { sessions, loading, fetchSessions } = useValidationHistory();
  const [selectedSessionId, setSelectedSessionId] = useState("");

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const exportSession = (session: ValidationSession) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Document Inventory
    const docs = Array.isArray(session.documents) ? session.documents : [];
    const inventoryRows = docs.map((d: any, i: number) => ({
      "#": i + 1,
      "File Name": d.name || "—",
      "Type": d.type || d.detectedType || "—",
      "Quality": d.overallQuality || "—",
      "Fields Extracted": (d.extractedFields || []).length,
      "Warnings": (d.parseWarnings || []).length,
    }));
    const ws1 = XLSX.utils.json_to_sheet(inventoryRows.length ? inventoryRows : [{ Note: "No documents" }]);
    XLSX.utils.book_append_sheet(wb, ws1, "Document Inventory");

    // Sheet 2: Extracted Fields
    const fieldRows: any[] = [];
    docs.forEach((d: any) => {
      (d.extractedFields || []).forEach((f: any) => {
        fieldRows.push({
          "Document": d.name || "—",
          "Field": f.fieldName || "—",
          "Value": f.value || "—",
          "Confidence": f.confidence != null ? `${Math.round(f.confidence * 100)}%` : "—",
          "Source Type": f.sourceDocumentType || "—",
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(fieldRows.length ? fieldRows : [{ Note: "No fields" }]);
    XLSX.utils.book_append_sheet(wb, ws2, "Extracted Fields");

    // Sheet 3: Mismatch Flags
    const mismatches = Array.isArray(session.cross_doc_mismatches) ? session.cross_doc_mismatches : [];
    const mismatchRows = mismatches.map((m: any) => {
      const docs = m.documents;
      if (Array.isArray(docs) && docs.length >= 2) {
        return {
          "Field": m.fieldName || m.field || "—",
          "Doc A": docs[0].docName || docs[0].docType || "—",
          "Value A": String(docs[0].value ?? "—"),
          "Doc B": docs[1].docName || docs[1].docType || "—",
          "Value B": String(docs[1].value ?? "—"),
          "Severity": m.severity || "—",
        };
      }
      return {
        "Field": m.field || m.fieldName || "—",
        "Doc A": m.docA || m.sourceA || "—",
        "Value A": String(m.valueA ?? m.docAValue ?? "—"),
        "Doc B": m.docB || m.sourceB || "—",
        "Value B": String(m.valueB ?? m.docBValue ?? "—"),
        "Severity": m.severity || "—",
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(mismatchRows.length ? mismatchRows : [{ Note: "No mismatches" }]);
    XLSX.utils.book_append_sheet(wb, ws3, "Mismatch Flags");

    // Sheet 4: Workflow Values
    const workflowRows = [{
      "Shipment ID": session.shipment_id || "—",
      "Mode": session.shipment_mode || "—",
      "Origin": session.origin_country || "—",
      "Destination": session.destination_country || "—",
      "HS Code": session.hs_code || "—",
      "Declared Value": session.declared_value || "—",
      "Completeness": session.completeness_score != null ? `${session.completeness_score}%` : "—",
      "Consistency": session.consistency_score != null ? `${session.consistency_score}%` : "—",
      "Readiness": session.overall_readiness || "—",
      "Disposition": session.disposition || "—",
    }];
    const ws4 = XLSX.utils.json_to_sheet(workflowRows);
    XLSX.utils.book_append_sheet(wb, ws4, "Workflow Values");

    // Sheet 5: Audit Log
    const auditMeta = session.notes ? (() => {
      try { return JSON.parse(session.notes); } catch { return null; }
    })() : null;
    const auditRows = auditMeta ? [{
      "Packet Hash": auditMeta.packetHash || "—",
      "Rules Version": auditMeta.rulesVersion || "—",
      "Engine ID": auditMeta.engineId || "—",
      "Model Version": auditMeta.modelVersion || "—",
      "Workflow Stage": auditMeta.workflowStage || "—",
      "Validation Timestamp": auditMeta.validationTimestamp || "—",
      "Field Count": auditMeta.fieldCount ?? "—",
      "Doc Count": auditMeta.docCount ?? "—",
    }] : [{ Note: "No audit metadata" }];
    const ws5 = XLSX.utils.json_to_sheet(auditRows);
    XLSX.utils.book_append_sheet(wb, ws5, "Audit Log");

    const filename = `DocIntel_${session.shipment_id || session.id}_${new Date().toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-primary" />
            Structured Export
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-[10px] font-mono text-muted-foreground">
            Export a validation session as a multi-sheet Excel workbook: Document Inventory, Extracted Fields, 
            Mismatch Flags, Workflow Values, and Audit Log.
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted-foreground block mb-1">Select Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder={loading ? "Loading..." : "Choose a session"} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs font-mono">
                      {s.shipment_id || s.id.slice(0, 8)} — {s.origin_country} → {s.destination_country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              size="sm"
              disabled={!selectedSession}
              onClick={() => selectedSession && exportSession(selectedSession)}
              className="text-xs font-mono gap-1.5"
            >
              <Download size={12} />
              Export XLSX
            </Button>
          </div>

          {selectedSession && (
            <div className="text-[10px] font-mono text-muted-foreground border rounded p-2 bg-muted/10">
              <p><strong>Mode:</strong> {selectedSession.shipment_mode} · <strong>Lane:</strong> {selectedSession.origin_country} → {selectedSession.destination_country}</p>
              <p><strong>Docs:</strong> {Array.isArray(selectedSession.documents) ? selectedSession.documents.length : 0} · 
                <strong> Mismatches:</strong> {Array.isArray(selectedSession.cross_doc_mismatches) ? selectedSession.cross_doc_mismatches.length : 0}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
