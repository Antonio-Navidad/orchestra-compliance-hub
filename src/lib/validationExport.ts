import { type ExportColumn } from "./excelExport";

export const VALIDATION_DETAIL_COLUMNS: ExportColumn[] = [
  { header: "Shipment ID", key: "shipmentId" },
  { header: "Packet Hash", key: "packetHash" },
  { header: "Rules Version", key: "rulesVersion" },
  { header: "Model Version", key: "modelVersion" },
  { header: "Workflow Stage", key: "workflowStage" },
  { header: "Validation ID", key: "validationId" },
  { header: "Document Type", key: "documentType" },
  { header: "Field Name", key: "fieldName" },
  { header: "Extracted Value", key: "value" },
  { header: "Source Document", key: "sourceDocument" },
  { header: "Confidence", key: "confidence", transform: (v) => v != null ? `${Math.round(v * 100)}%` : "" },
  { header: "Validation Status", key: "validationStatus" },
  { header: "Issue Type", key: "issueType" },
  { header: "Issue Category", key: "issueCategory" },
  { header: "Severity", key: "severity" },
  { header: "Evidence Source", key: "evidenceSource" },
  { header: "Origin", key: "origin" },
  { header: "Destination", key: "destination" },
  { header: "Mode", key: "mode" },
  { header: "Notes", key: "notes" },
  { header: "Timestamp", key: "timestamp", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const VALIDATION_SUMMARY_COLUMNS: ExportColumn[] = [
  { header: "Shipment ID", key: "shipmentId" },
  { header: "Packet Completeness", key: "completenessScore", transform: (v) => v != null ? `${v}%` : "" },
  { header: "Consistency Score", key: "consistencyScore", transform: (v) => v != null ? `${v}%` : "" },
  { header: "Overall Readiness", key: "overallReadiness" },
  { header: "Documents Uploaded", key: "documentsUploaded" },
  { header: "Missing Documents", key: "missingDocCount" },
  { header: "Critical Issues", key: "criticalIssues" },
  { header: "High Issues", key: "highIssues" },
  { header: "Medium Issues", key: "mediumIssues" },
  { header: "Approved Fields", key: "approvedFields" },
  { header: "Flagged Fields", key: "flaggedFields" },
  { header: "Origin", key: "origin" },
  { header: "Destination", key: "destination" },
  { header: "Mode", key: "mode" },
  { header: "Timestamp", key: "timestamp", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  sourceLocation?: string;
  sourceDocumentType?: string;
}

export interface DetectedDocument {
  documentType: string;
  pageRange?: string;
  confidence: number;
  detectionMethod: "direct" | "inferred" | "partial";
}

export interface UploadedDocument {
  id: string;
  file: File;
  type: string;
  name: string;
  status: "uploading" | "extracting" | "extracted" | "error";
  extractedFields: ExtractedField[];
  detectedType?: string;
  overallQuality?: string;
  parseWarnings?: string[];
  rawTextSummary?: string;
  extractionId?: string;
  error?: string;
  isMultiDocument?: boolean;
  detectedDocuments?: DetectedDocument[];
  /** For virtual sub-documents split from a combined packet */
  parentUploadId?: string;
}

export function buildDetailExportRows(
  documents: UploadedDocument[],
  validationResult: any,
  context: { shipmentId: string; origin: string; destination: string; mode: string }
): Record<string, any>[] {
  const now = new Date().toISOString();
  const rows: Record<string, any>[] = [];

  for (const doc of documents) {
    for (const field of doc.extractedFields) {
      const matchingIssue = validationResult?.issues?.find(
        (i: any) => i.field?.toLowerCase() === field.fieldName.toLowerCase()
      );
      rows.push({
        shipmentId: context.shipmentId || "N/A",
        validationId: doc.extractionId || doc.id,
        documentType: doc.detectedType || doc.type,
        fieldName: field.fieldName,
        value: field.value,
        sourceDocument: doc.name || doc.file.name,
        confidence: field.confidence,
        validationStatus: matchingIssue ? "flagged" : field.confidence >= 0.8 ? "approved" : "review",
        issueType: matchingIssue?.severity || "",
        severity: matchingIssue?.severity || "",
        origin: context.origin,
        destination: context.destination,
        mode: context.mode,
        notes: matchingIssue?.description || "",
        timestamp: now,
      });
    }
  }
  return rows;
}

export function buildSummaryExportRow(
  documents: UploadedDocument[],
  validationResult: any,
  context: { shipmentId: string; origin: string; destination: string; mode: string }
): Record<string, any> {
  const allFields = documents.flatMap((d) => d.extractedFields);
  const issues = validationResult?.issues || [];
  return {
    shipmentId: context.shipmentId || "N/A",
    completenessScore: validationResult?.completenessScore ?? "",
    consistencyScore: validationResult?.consistencyScore ?? "",
    overallReadiness: validationResult?.overallReadiness ?? "",
    documentsUploaded: documents.length,
    missingDocCount: validationResult?.missingDocuments?.length ?? 0,
    criticalIssues: issues.filter((i: any) => i.severity === "critical").length,
    highIssues: issues.filter((i: any) => i.severity === "high").length,
    mediumIssues: issues.filter((i: any) => i.severity === "medium").length,
    approvedFields: allFields.filter((f) => f.confidence >= 0.8).length,
    flaggedFields: allFields.filter((f) => f.confidence < 0.8).length,
    origin: context.origin,
    destination: context.destination,
    mode: context.mode,
    timestamp: new Date().toISOString(),
  };
}
