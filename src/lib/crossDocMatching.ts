import type { UploadedDocument, ExtractedField } from "./validationExport";

export interface CrossDocMismatch {
  fieldName: string;
  severity: "critical" | "high" | "medium" | "low";
  mismatchType: "true_conflict" | "semantic_variant" | "unit_conversion" | "expected_difference" | "port_gateway";
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

// ── Port gateway clusters ────────────────────────────────────────────
// Ports that belong to the same logistics gateway/complex

const PORT_GATEWAY_CLUSTERS: string[][] = [
  // US West Coast
  ["los angeles", "long beach", "la/lb", "la", "lb", "san pedro bay", "port of los angeles", "port of long beach"],
  ["oakland", "san francisco"],
  ["seattle", "tacoma", "northwest seaport alliance"],
  // US East Coast
  ["new york", "newark", "elizabeth", "ny/nj", "port newark"],
  ["norfolk", "portsmouth", "newport news", "hampton roads"],
  ["savannah", "garden city"],
  // China
  ["shanghai", "yangshan", "waigaoqiao"],
  ["shenzhen", "yantian", "shekou", "chiwan", "nansha"],
  ["ningbo", "zhoushan", "ningbo-zhoushan"],
  ["guangzhou", "nansha", "huangpu"],
  ["qingdao", "tsingtao"],
  // Europe
  ["rotterdam", "europoort", "maasvlakte"],
  ["antwerp", "zeebrugge"],
  ["hamburg", "bremerhaven"],
  ["felixstowe", "harwich"],
  // Asia
  ["singapore", "pasir panjang", "tanjong pagar"],
  ["busan", "pusan"],
  ["tokyo", "yokohama"],
  ["kaohsiung", "keelung"],
];

function normalizePortName(port: string): string {
  return port.trim().toLowerCase()
    .replace(/^port\s+of\s+/i, "")
    .replace(/[,.\-\/\\()'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function portsInSameGateway(a: string, b: string): boolean {
  const na = normalizePortName(a);
  const nb = normalizePortName(b);
  if (na === nb) return true;
  for (const cluster of PORT_GATEWAY_CLUSTERS) {
    const hasA = cluster.some((p) => na.includes(p) || p.includes(na));
    const hasB = cluster.some((p) => nb.includes(p) || p.includes(nb));
    if (hasA && hasB) return true;
  }
  return false;
}

function isPortField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["port", "discharge", "loading", "destination_port", "origin_port", "pod", "pol", "arrival_port", "departure_port"].some((k) => fn.includes(k));
}

// ── Port-role awareness ──────────────────────────────────────────────
// "final destination" vs "port of discharge" are different logistics concepts

const PORT_ROLE_PAIRS = new Set([
  "final_destination|port_of_discharge",
  "port_of_discharge|final_destination",
  "place_of_delivery|port_of_discharge",
  "port_of_discharge|place_of_delivery",
  "final_destination|place_of_delivery",
  "place_of_delivery|final_destination",
]);

function arePortRoleDifferent(fieldA: string, fieldB: string): boolean {
  const a = fieldA.toLowerCase().replace(/\s+/g, "_");
  const b = fieldB.toLowerCase().replace(/\s+/g, "_");
  // Check if these are conceptually different port-role fields grouped under one name
  for (const pair of PORT_ROLE_PAIRS) {
    const [pa, pb] = pair.split("|");
    if ((a.includes(pa) && b.includes(pb)) || (a.includes(pb) && b.includes(pa))) return true;
  }
  return false;
}

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
  const units = new Set(parsed.map((p) => p.unit));
  if (units.size === 1) return false;
  const sorted = [...parsed].sort((a, b) => a.value - b.value);
  const smallest = sorted[0];
  const largest = sorted[sorted.length - 1];
  if (smallest.value === 0) return false;
  const ratio = largest.value / smallest.value;
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

function descriptionsMatch(values: string[]): boolean {
  if (values.length < 2) return true;
  const tokenSets = values.map(tokenize);
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
      const docTypes = new Set(entries.map((e) => e.docType));
      if (docTypes.size > 1) continue;
    }

    // Check if values actually differ
    const normalized = entries.map((e) => normalizeText(e.value));
    const unique = new Set(normalized);
    if (unique.size <= 1) continue;

    // ── Port gateway reconciliation ──
    if (isPortField(fieldName)) {
      const values = entries.map((e) => e.value);
      const allSameGateway = values.every((v, _, arr) => portsInSameGateway(v, arr[0]));
      if (allSameGateway) {
        mismatches.push({
          fieldName,
          severity: "low",
          mismatchType: "port_gateway",
          documents: entries,
          description: `"${fieldName.replace(/_/g, " ")}" references different ports within the same gateway complex`,
          reason: `These ports (e.g., Los Angeles / Long Beach) are part of the same port complex and are operationally interchangeable. No action required.`,
        });
        continue;
      }
    }

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
      if (numericValuesMatch(rawValues)) continue;
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
  const typeOrder: Record<string, number> = { true_conflict: 0, unit_conversion: 1, port_gateway: 2, semantic_variant: 3, expected_difference: 4 };
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  mismatches.sort((a, b) => (typeOrder[a.mismatchType] ?? 5) - (typeOrder[b.mismatchType] ?? 5) || sevOrder[a.severity] - sevOrder[b.severity]);

  return mismatches;
}
