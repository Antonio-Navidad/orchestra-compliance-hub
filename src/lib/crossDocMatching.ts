import type { UploadedDocument, ExtractedField } from "./validationExport";

export interface CrossDocMismatch {
  fieldName: string;
  severity: "critical" | "high" | "medium" | "low";
  mismatchType: "true_conflict" | "semantic_variant" | "unit_conversion" | "expected_difference";
  documents: { docName: string; docType: string; value: string; confidence: number }[];
  description: string;
  reason: string;
}

// ── Field classification ──────────────────────────────────────────────

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

// Fields where cross-document differences are EXPECTED and should not be flagged
const EXPECTED_DIFFERENT_FIELDS = new Set([
  "issue_date", "document_date", "date", "invoice_date",
  "bl_date", "packing_date", "coo_date", "certificate_date",
  "page_range", "document_number",
]);

// ── Date fields that are document-role-specific ───────────────────────

const DATE_FIELD_PATTERNS = [
  "date", "issued", "issue_date", "document_date", "invoice_date",
  "bl_date", "packing_date", "coo_date", "certificate_date",
  "shipped_on_board_date", "expiry_date",
];

function isDateField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return DATE_FIELD_PATTERNS.some((p) => fn.includes(p));
}

// ── Quantity / unit normalisation ─────────────────────────────────────

const UNIT_PATTERNS: { pattern: RegExp; extract: (m: RegExpMatchArray) => { value: number; unit: string } }[] = [
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(pcs?|pieces?|units?|items?|ea(?:ch)?)?$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "unit" }) },
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(cartons?|ctns?|cases?|boxes?|pkgs?|packages?)$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "carton" }) },
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(pallets?)$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "pallet" }) },
];

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

interface ParsedQty { value: number; unit: string; raw: string }

function parseQuantity(raw: string): ParsedQty | null {
  const trimmed = raw.trim();
  for (const { pattern, extract } of UNIT_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) return { ...extract(m), raw: trimmed };
  }
  const n = parseNum(trimmed);
  if (!isNaN(n)) return { value: n, unit: "unit", raw: trimmed };
  return null;
}

function quantitiesReconcile(entries: { value: string }[]): boolean {
  const parsed = entries.map((e) => parseQuantity(e.value)).filter(Boolean) as ParsedQty[];
  if (parsed.length < 2) return false;

  // If all same unit, must match value
  const units = new Set(parsed.map((p) => p.unit));
  if (units.size === 1) return false; // same unit, different values → real mismatch (caller already checked values differ)

  // Different units: check if smaller count × reasonable multiplier ≈ larger count
  const sorted = [...parsed].sort((a, b) => a.value - b.value);
  const smallest = sorted[0];
  const largest = sorted[sorted.length - 1];

  if (smallest.value === 0) return false;
  const ratio = largest.value / smallest.value;
  // Accept common carton/unit ratios (integer, 2–500 range)
  return Number.isInteger(ratio) && ratio >= 2 && ratio <= 500;
}

// ── Text similarity ──────────────────────────────────────────────────

function normalizeText(v: string): string {
  return v.trim().toLowerCase()
    .replace(/[,.\-\/\\()'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): Set<string> {
  const stopWords = new Set(["the", "a", "an", "of", "for", "and", "or", "in", "on", "to", "with", "is", "are", "as", "at", "by"]);
  return new Set(
    normalizeText(s).split(" ").filter((w) => w.length > 1 && !stopWords.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

/** Returns true if descriptions are semantically similar enough */
function descriptionsMatch(values: string[]): boolean {
  if (values.length < 2) return true;
  const tokenSets = values.map(tokenize);
  // Check all pairs – if any pair has >0.4 Jaccard, consider them matching
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      if (jaccardSimilarity(tokenSets[i], tokenSets[j]) < 0.35) return false;
    }
  }
  return true;
}

// ── Numeric value comparison ─────────────────────────────────────────

function isNumericField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["value", "weight", "quantity", "count", "amount", "price", "total"].some((k) => fn.includes(k));
}

function numericValuesMatch(values: string[]): boolean {
  const nums = values.map((v) => parseNum(v.replace(/[^0-9.,\-]/g, ""))).filter((n) => !isNaN(n));
  if (nums.length < 2) return true;
  // Allow 1% tolerance for rounding
  const base = nums[0];
  return nums.every((n) => Math.abs(n - base) / Math.max(Math.abs(base), 1) < 0.01);
}

// ── Description field detection ──────────────────────────────────────

function isDescriptionField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["description", "product_name", "item_name", "goods_description", "commodity"].some((k) => fn.includes(k));
}

function isQuantityField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["quantity", "qty", "package_count", "packages", "cartons", "units", "pieces"].some((k) => fn.includes(k));
}

// ── Severity determination ───────────────────────────────────────────

function getBaseSeverity(fieldName: string): CrossDocMismatch["severity"] {
  const fn = fieldName.toLowerCase();
  if (CRITICAL_MATCH_FIELDS.some((f) => fn.includes(f))) return "critical";
  if (HIGH_MATCH_FIELDS.some((f) => fn.includes(f))) return "high";
  if (MEDIUM_MATCH_FIELDS.some((f) => fn.includes(f))) return "medium";
  return "low";
}

// ── Main comparison engine ───────────────────────────────────────────

export function detectCrossDocMismatches(documents: UploadedDocument[]): CrossDocMismatch[] {
  const extracted = documents.filter((d) => d.status === "extracted" && d.extractedFields.length > 0);
  if (extracted.length < 2) return [];

  // Build field → entries map
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

    // ── Skip expected-different fields (dates from different docs) ──
    if (EXPECTED_DIFFERENT_FIELDS.has(fieldName)) continue;
    if (isDateField(fieldName)) {
      // Only flag if same-role date fields differ (e.g. two invoices with different invoice_date)
      const docTypes = new Set(entries.map((e) => e.docType));
      if (docTypes.size > 1) continue; // Different doc types → expected
    }

    // Check if values actually differ
    const normalized = entries.map((e) => normalizeText(e.value));
    const unique = new Set(normalized);
    if (unique.size <= 1) continue;

    // ── Quantity reconciliation ──
    if (isQuantityField(fieldName)) {
      if (quantitiesReconcile(entries)) {
        mismatches.push({
          fieldName,
          severity: "low",
          mismatchType: "unit_conversion",
          documents: entries,
          description: `"${fieldName.replace(/_/g, " ")}" values use different units but reconcile mathematically`,
          reason: `Values represent the same quantity in different packaging units (e.g., cartons vs. individual units). No action required.`,
        });
        continue;
      }
    }

    // ── Description semantic matching ──
    if (isDescriptionField(fieldName)) {
      const rawValues = entries.map((e) => e.value);
      if (descriptionsMatch(rawValues)) {
        mismatches.push({
          fieldName,
          severity: "low",
          mismatchType: "semantic_variant",
          documents: entries,
          description: `"${fieldName.replace(/_/g, " ")}" wording differs but descriptions are semantically equivalent`,
          reason: `Documents use different phrasing for the same product. This is normal across commercial invoice, packing list, and transport documents.`,
        });
        continue;
      }
    }

    // ── Numeric tolerance ──
    if (isNumericField(fieldName)) {
      const rawValues = entries.map((e) => e.value);
      if (numericValuesMatch(rawValues)) continue; // within rounding tolerance
    }

    // True conflict
    const baseSeverity = getBaseSeverity(fieldName);
    mismatches.push({
      fieldName,
      severity: baseSeverity,
      mismatchType: "true_conflict",
      documents: entries,
      description: `"${fieldName.replace(/_/g, " ")}" has ${unique.size} conflicting values across ${entries.length} documents`,
      reason: `Material discrepancy detected. Values differ beyond acceptable tolerance and could cause customs issues. Review recommended.`,
    });
  }

  // Sort: true conflicts first, then by severity
  const typeOrder: Record<string, number> = { true_conflict: 0, unit_conversion: 1, semantic_variant: 2, expected_difference: 3 };
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  mismatches.sort((a, b) => typeOrder[a.mismatchType] - typeOrder[b.mismatchType] || sevOrder[a.severity] - sevOrder[b.severity]);

  return mismatches;
}
