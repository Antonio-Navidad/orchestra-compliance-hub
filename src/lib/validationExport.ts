import { type ExportColumn } from "./excelExport";
import type { RuleEngineResult, RuleIssue } from "./validationRules";

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
  { header: "Review Status", key: "reviewStatus" },
  { header: "Review Action", key: "reviewAction" },
  { header: "Review Note", key: "reviewNote" },
  { header: "Reviewed By", key: "reviewedBy" },
  { header: "Reviewed At", key: "reviewedAt", transform: (v) => v ? new Date(v).toLocaleString() : "" },
  { header: "Timestamp", key: "timestamp", transform: (v) => v ? new Date(v).toLocaleString() : "" },
];

export const VALIDATION_SUMMARY_COLUMNS: ExportColumn[] = [
  { header: "Shipment ID", key: "shipmentId" },
  { header: "Packet Hash", key: "packetHash" },
  { header: "Rules Version", key: "rulesVersion" },
  { header: "Model Version", key: "modelVersion" },
  { header: "Workflow Stage", key: "workflowStage" },
  { header: "Packet Completeness", key: "completenessScore", transform: (v) => v != null ? `${v}%` : "" },
  { header: "Consistency Score", key: "consistencyScore", transform: (v) => v != null ? `${v}%` : "" },
  { header: "Packet Integrity", key: "packetIntegrity" },
  { header: "Compliance Readiness", key: "complianceReadiness" },
  { header: "Packet Label", key: "packetLabel" },
  { header: "Compliance Label", key: "complianceLabel" },
  { header: "Documents Uploaded", key: "documentsUploaded" },
  { header: "Missing Packet Docs", key: "missingPacketDocs" },
  { header: "External Filings", key: "externalFilings" },
  { header: "Regulatory Advisories", key: "regulatoryAdvisories" },
  { header: "Later-Stage Docs", key: "laterStageDocs" },
  { header: "Recommended Optional", key: "recommendedOptional" },
  { header: "Critical Issues", key: "criticalIssues" },
  { header: "High Issues", key: "highIssues" },
  { header: "Medium Issues", key: "mediumIssues" },
  { header: "Approved Fields", key: "approvedFields" },
  { header: "Flagged Fields", key: "flaggedFields" },
  { header: "Total Issues", key: "totalIssues" },
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
  parentUploadId?: string;
}

// ── Audit-aware context for exports ───────────────────────────────────

export interface ExportAuditContext {
  shipmentId: string;
  origin: string;
  destination: string;
  mode: string;
  packetHash?: string;
  rulesVersion?: string;
  modelVersion?: string;
  workflowStage?: string;
}

// ── Detail export: one row per extracted field ────────────────────────

export interface FindingReviewExport {
  rule_id: string;
  status: string;
  action: string;
  note: string | null;
  user_email: string | null;
  created_at: string;
}

export function buildDetailExportRows(
  documents: UploadedDocument[],
  ruleResult: RuleEngineResult | null,
  context: ExportAuditContext,
  reviews?: FindingReviewExport[],
): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const timestamp = ruleResult?.timestamp || new Date().toISOString();

  // Build a lookup: field name → matching rule issue
  const issuesByField = new Map<string, RuleIssue>();
  if (ruleResult) {
    for (const issue of ruleResult.issues) {
      if (issue.documentType) {
        issuesByField.set(issue.documentType.toLowerCase(), issue);
      }
    }
  }

  for (const doc of documents) {
    if (doc.isMultiDocument) continue;
    const docType = doc.detectedType || doc.type;

    for (const field of doc.extractedFields) {
      const matchingIssue = issuesByField.get(field.fieldName.toLowerCase());
      rows.push({
        shipmentId: context.shipmentId || "N/A",
        packetHash: context.packetHash || "",
        rulesVersion: context.rulesVersion || "",
        modelVersion: context.modelVersion || "",
        workflowStage: context.workflowStage || "",
        validationId: doc.extractionId || doc.id,
        documentType: docType,
        fieldName: field.fieldName,
        value: field.value,
        sourceDocument: doc.name || doc.file?.name || "",
        confidence: field.confidence,
        validationStatus: matchingIssue ? "flagged" : field.confidence >= 0.8 ? "approved" : "review",
        issueType: matchingIssue?.ruleName || "",
        issueCategory: matchingIssue?.category || "",
        severity: matchingIssue?.severity || "",
        evidenceSource: docType,
        origin: context.origin,
        destination: context.destination,
        mode: context.mode,
        notes: matchingIssue?.description || "",
        timestamp,
      });
    }
  }

  // Also export rule issues that are not field-level (missing docs, filings, advisories)
  if (ruleResult) {
    for (const issue of ruleResult.issues) {
      rows.push({
        shipmentId: context.shipmentId || "N/A",
        packetHash: context.packetHash || "",
        rulesVersion: context.rulesVersion || "",
        modelVersion: context.modelVersion || "",
        workflowStage: context.workflowStage || "",
        validationId: "",
        documentType: issue.documentType || "",
        fieldName: "",
        value: "",
        sourceDocument: "",
        confidence: "",
        validationStatus: "rule_finding",
        issueType: issue.ruleName,
        issueCategory: issue.category,
        severity: issue.severity,
        evidenceSource: issue.evidenceDocTypes?.join(", ") || "",
        origin: context.origin,
        destination: context.destination,
        mode: context.mode,
        notes: `${issue.description} | ${issue.triggeredBecause}`,
        timestamp,
      });
    }
  }

  return rows;
}

// ── Summary export: one row per validation run ────────────────────────

export function buildSummaryExportRow(
  documents: UploadedDocument[],
  ruleResult: RuleEngineResult,
  context: ExportAuditContext,
): Record<string, any> {
  const nonPacketDocs = documents.filter(d => !d.isMultiDocument);
  const allFields = nonPacketDocs.flatMap((d) => d.extractedFields);

  return {
    shipmentId: context.shipmentId || "N/A",
    packetHash: context.packetHash || "",
    rulesVersion: ruleResult.rulesVersion,
    modelVersion: context.modelVersion || "",
    workflowStage: ruleResult.workflowStage,
    completenessScore: ruleResult.completenessScore,
    consistencyScore: ruleResult.consistencyScore,
    packetIntegrity: ruleResult.packetIntegrity,
    complianceReadiness: ruleResult.complianceReadiness,
    packetLabel: ruleResult.packetLabel,
    complianceLabel: ruleResult.complianceLabel,
    documentsUploaded: nonPacketDocs.length,
    missingPacketDocs: ruleResult.packetRequirements.length,
    externalFilings: ruleResult.externalFilings.length,
    regulatoryAdvisories: ruleResult.regulatoryAdvisories.length,
    laterStageDocs: ruleResult.laterStageDocuments.length,
    recommendedOptional: ruleResult.recommendedOptional.length,
    criticalIssues: ruleResult.issues.filter(i => i.severity === "critical").length,
    highIssues: ruleResult.issues.filter(i => i.severity === "high").length,
    mediumIssues: ruleResult.issues.filter(i => i.severity === "medium").length,
    totalIssues: ruleResult.issues.length,
    approvedFields: allFields.filter((f) => f.confidence >= 0.8).length,
    flaggedFields: allFields.filter((f) => f.confidence < 0.8).length,
    origin: context.origin,
    destination: context.destination,
    mode: context.mode,
    timestamp: ruleResult.timestamp,
  };
}
