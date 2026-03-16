import type { UploadedDocument, ExtractedField } from "./validationExport";

export interface CrossDocMismatch {
  fieldName: string;
  severity: "critical" | "high" | "medium" | "low";
  documents: { docName: string; docType: string; value: string; confidence: number }[];
  description: string;
}

const CRITICAL_MATCH_FIELDS = [
  "hs_code", "consignee_name", "shipper_name", "origin_country",
  "destination_country", "declared_value", "total_value",
];

const HIGH_MATCH_FIELDS = [
  "quantity", "package_count", "gross_weight_kg", "net_weight_kg",
  "weight_kg", "invoice_number", "bill_of_lading_number",
];

const MEDIUM_MATCH_FIELDS = [
  "product_name", "product_description", "item_description",
  "incoterms", "currency", "transport_mode",
];

function normalizeValue(v: string): string {
  return v.trim().toLowerCase().replace(/[,.\-\s]+/g, " ").replace(/\s+/g, " ");
}

function getSeverity(fieldName: string): CrossDocMismatch["severity"] {
  const fn = fieldName.toLowerCase();
  if (CRITICAL_MATCH_FIELDS.some((f) => fn.includes(f))) return "critical";
  if (HIGH_MATCH_FIELDS.some((f) => fn.includes(f))) return "high";
  if (MEDIUM_MATCH_FIELDS.some((f) => fn.includes(f))) return "medium";
  return "low";
}

export function detectCrossDocMismatches(documents: UploadedDocument[]): CrossDocMismatch[] {
  const extracted = documents.filter((d) => d.status === "extracted" && d.extractedFields.length > 0);
  if (extracted.length < 2) return [];

  // Build field -> [{docName, value, confidence}]
  const fieldMap = new Map<string, { docName: string; docType: string; value: string; confidence: number }[]>();

  for (const doc of extracted) {
    for (const field of doc.extractedFields) {
      const key = field.fieldName.toLowerCase();
      if (!fieldMap.has(key)) fieldMap.set(key, []);
      fieldMap.get(key)!.push({
        docName: doc.name || doc.file.name,
        docType: doc.detectedType || doc.type,
        value: field.value,
        confidence: field.confidence,
      });
    }
  }

  const mismatches: CrossDocMismatch[] = [];

  for (const [fieldName, entries] of fieldMap) {
    if (entries.length < 2) continue;

    const normalized = entries.map((e) => normalizeValue(e.value));
    const unique = new Set(normalized);
    if (unique.size > 1) {
      mismatches.push({
        fieldName,
        severity: getSeverity(fieldName),
        documents: entries,
        description: `"${fieldName.replace(/_/g, " ")}" has ${unique.size} different values across ${entries.length} documents`,
      });
    }
  }

  // Sort by severity
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  mismatches.sort((a, b) => order[a.severity] - order[b.severity]);

  return mismatches;
}
