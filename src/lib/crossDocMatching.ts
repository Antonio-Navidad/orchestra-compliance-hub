import type { UploadedDocument, ExtractedField } from "./validationExport";
import type { LibraryDocument } from "@/hooks/useDocumentLibrary";

export interface CrossDocMismatch {
  fieldName: string;
  severity: "high" | "medium" | "low";
  mismatchType: "true_conflict" | "semantic_variant" | "unit_conversion" | "expected_difference" | "port_gateway";
  documents: { docName: string; docType: string; value: string; confidence: number }[];
  description: string;
  reason: string;
  customsImpact?: string;
  valueDifference?: string;
}

// ── Field classification ──────────────────────────────────────────────

const HIGH_SEVERITY_FIELDS = [
  "declared_value", "total_value", "invoice_value", "fob_value",
  "cif_value", "total_invoice_value", "unit_price", "total_price",
  "hs_code", "consignee_name", "shipper_name", "origin_country",
  "destination_country", "quantity", "package_count",
  "gross_weight_kg", "net_weight_kg", "weight_kg",
  "container_number", "container_no",
];

const MEDIUM_SEVERITY_FIELDS = [
  "invoice_number", "bill_of_lading_number",
  "incoterms", "currency", "transport_mode",
  "port_of_loading", "port_of_discharge",
  "destination_port", "origin_port",
];

// Fields where cross-document differences are EXPECTED
const EXPECTED_DIFFERENT_FIELDS = new Set([
  "issue_date", "document_date", "date", "invoice_date",
  "bl_date", "packing_date", "coo_date", "certificate_date",
  "page_range", "document_number",
]);

// ── Customs impact notes ─────────────────────────────────────────────

const CUSTOMS_IMPACT: Record<string, string> = {
  declared_value: "Declared value discrepancy may trigger customs hold or additional duties assessment.",
  total_value: "Total value mismatch across documents can result in undervaluation investigation.",
  invoice_value: "Invoice value inconsistency may delay customs clearance and trigger audit.",
  fob_value: "FOB value mismatch affects duty calculation and may trigger valuation review.",
  cif_value: "CIF value discrepancy directly impacts duty assessment at destination.",
  total_invoice_value: "Invoice total mismatch may result in customs hold pending reconciliation.",
  unit_price: "Unit price discrepancy across documents may indicate valuation fraud risk.",
  total_price: "Total price mismatch can trigger additional duties or penalties.",
  hs_code: "HS code mismatch may result in wrong duty rate, seizure, or classification dispute.",
  consignee_name: "Consignee name mismatch may trigger sanctions screening or shipment hold.",
  shipper_name: "Shipper name inconsistency may flag sanctions or denied-party concerns.",
  origin_country: "Origin country mismatch affects preferential duty rates and trade agreement eligibility.",
  destination_country: "Destination mismatch can result in wrong regulatory requirements being applied.",
  quantity: "Quantity discrepancy may trigger physical inspection or cargo examination.",
  package_count: "Package count mismatch between documents may result in cargo hold at port.",
  gross_weight_kg: "Weight discrepancy may trigger physical verification and delays.",
  net_weight_kg: "Net weight mismatch affects duty calculation for weight-based tariffs.",
  container_number: "Container number mismatch is a critical logistics discrepancy that may prevent release.",
};

// ── Port gateway clusters ────────────────────────────────────────────

const PORT_GATEWAY_CLUSTERS: string[][] = [
  ["los angeles", "long beach", "la/lb", "la", "lb", "san pedro bay"],
  ["new york", "newark", "elizabeth", "ny/nj", "port newark"],
  ["seattle", "tacoma", "northwest seaport alliance"],
  ["shanghai", "yangshan", "waigaoqiao"],
  ["shenzhen", "yantian", "shekou", "chiwan"],
  ["ningbo", "zhoushan", "ningbo-zhoushan"],
  ["rotterdam", "europoort", "maasvlakte"],
  ["antwerp", "zeebrugge"],
  ["singapore", "pasir panjang", "tanjong pagar"],
  ["busan", "pusan"],
  ["tokyo", "yokohama"],
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
  return ["port", "discharge", "loading", "destination_port", "origin_port", "pod", "pol"].some((k) => fn.includes(k));
}

// ── Value parsing ────────────────────────────────────────────────────

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function extractMonetaryValue(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,\-]/g, "").trim();
  if (!cleaned) return null;
  const n = parseNum(cleaned);
  return isNaN(n) ? null : n;
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Quantity / unit normalisation ─────────────────────────────────────

const UNIT_PATTERNS: { pattern: RegExp; extract: (m: RegExpMatchArray) => { value: number; unit: string } }[] = [
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(pcs?|pieces?|units?|items?|ea(?:ch)?)?$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "unit" }) },
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(cartons?|ctns?|cases?|boxes?|pkgs?|packages?)$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "carton" }) },
  { pattern: /^([\d,]+(?:\.\d+)?)\s*(pallets?)$/i, extract: (m) => ({ value: parseNum(m[1]), unit: "pallet" }) },
];

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

// ── Field type detection ─────────────────────────────────────────────

function isMonetaryField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["value", "price", "amount", "cost", "total", "fob", "cif", "invoice_value"].some((k) => fn.includes(k));
}

function isNumericField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["value", "weight", "quantity", "count", "amount", "price", "total"].some((k) => fn.includes(k));
}

function isDescriptionField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["description", "product_name", "item_name", "goods_description", "commodity"].some((k) => fn.includes(k));
}

function isQuantityField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["quantity", "qty", "package_count", "packages", "cartons", "units", "pieces"].some((k) => fn.includes(k));
}

function isDateField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["date", "issued", "issue_date", "document_date", "invoice_date", "bl_date", "packing_date"].some((p) => fn.includes(p));
}

// ── Severity determination ───────────────────────────────────────────

function getBaseSeverity(fieldName: string): CrossDocMismatch["severity"] {
  const fn = fieldName.toLowerCase();
  if (HIGH_SEVERITY_FIELDS.some((f) => fn.includes(f))) return "high";
  if (MEDIUM_SEVERITY_FIELDS.some((f) => fn.includes(f))) return "medium";
  return "low";
}

function getCustomsImpact(fieldName: string): string | undefined {
  const fn = fieldName.toLowerCase();
  for (const [key, impact] of Object.entries(CUSTOMS_IMPACT)) {
    if (fn.includes(key)) return impact;
  }
  return undefined;
}

// ── Main comparison engine (from UploadedDocument[]) ─────────────────

export function detectCrossDocMismatches(documents: UploadedDocument[]): CrossDocMismatch[] {
  const extracted = documents.filter((d) => d.status === "extracted" && d.extractedFields.length > 0);
  if (extracted.length < 2) return [];

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

  return runComparison(fieldMap);
}

// ── Comparison from LibraryDocument[] ────────────────────────────────

export function detectLibraryDocMismatches(documents: LibraryDocument[]): CrossDocMismatch[] {
  const extracted = documents.filter((d) => d.extraction_status === "complete" && d.extracted_fields && Object.keys(d.extracted_fields).length > 0);
  if (extracted.length < 2) return [];

  const fieldMap = new Map<string, { docName: string; docType: string; value: string; confidence: number }[]>();

  for (const doc of extracted) {
    const fields = doc.extracted_fields;
    // extracted_fields can be { fieldName: value } or an array
    if (Array.isArray(fields)) {
      for (const f of fields) {
        const key = (f.fieldName || f.field_name || f.name || "").toLowerCase();
        if (!key) continue;
        const val = String(f.value ?? f.extractedValue ?? "");
        if (!val) continue;
        if (!fieldMap.has(key)) fieldMap.set(key, []);
        fieldMap.get(key)!.push({
          docName: doc.file_name,
          docType: doc.document_type || "unknown",
          value: val,
          confidence: f.confidence ?? 0.8,
        });
      }
    } else if (typeof fields === "object") {
      for (const [key, val] of Object.entries(fields)) {
        const k = key.toLowerCase();
        const v = String(val ?? "");
        if (!v) continue;
        if (!fieldMap.has(k)) fieldMap.set(k, []);
        fieldMap.get(k)!.push({
          docName: doc.file_name,
          docType: doc.document_type || "unknown",
          value: v,
          confidence: 0.8,
        });
      }
    }
  }

  return runComparison(fieldMap);
}

// ── Shared comparison logic ──────────────────────────────────────────

function runComparison(fieldMap: Map<string, { docName: string; docType: string; value: string; confidence: number }[]>): CrossDocMismatch[] {
  const mismatches: CrossDocMismatch[] = [];

  for (const [fieldName, entries] of fieldMap) {
    if (entries.length < 2) continue;

    // Skip expected-different fields
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
          reason: `These ports are part of the same port complex and are operationally interchangeable.`,
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
          reason: `Values represent the same quantity in different packaging units.`,
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
          reason: `Documents use different phrasing for the same product. Normal across trade documents.`,
        });
        continue;
      }
    }

    // ── Numeric tolerance (1% for non-monetary) ──
    if (isNumericField(fieldName) && !isMonetaryField(fieldName)) {
      const nums = entries.map((e) => extractMonetaryValue(e.value)).filter((n) => n !== null) as number[];
      if (nums.length >= 2) {
        const base = nums[0];
        const allClose = nums.every((n) => Math.abs(n - base) / Math.max(Math.abs(base), 1) < 0.01);
        if (allClose) continue;
      }
    }

    // ── True conflict ──
    const baseSeverity = getBaseSeverity(fieldName);
    const customsImpact = getCustomsImpact(fieldName);

    // Build value difference string for monetary fields
    let valueDifference: string | undefined;
    if (isMonetaryField(fieldName) && entries.length >= 2) {
      const nums = entries.map((e) => extractMonetaryValue(e.value)).filter((n) => n !== null) as number[];
      if (nums.length >= 2) {
        const sorted = [...nums].sort((a, b) => b - a);
        const diff = sorted[0] - sorted[sorted.length - 1];
        if (diff > 0) {
          valueDifference = `$${formatMoney(diff)}`;
        }
      }
    }

    mismatches.push({
      fieldName,
      severity: baseSeverity,
      mismatchType: "true_conflict",
      documents: entries,
      description: `"${fieldName.replace(/_/g, " ")}" has ${unique.size} conflicting values across ${entries.length} documents`,
      reason: `Material discrepancy detected. Review recommended.`,
      customsImpact: baseSeverity === "high" ? customsImpact : undefined,
      valueDifference,
    });
  }

  // Sort: high first, then medium, then low; true conflicts before variants
  const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const typeOrder: Record<string, number> = { true_conflict: 0, unit_conversion: 1, port_gateway: 2, semantic_variant: 3, expected_difference: 4 };
  mismatches.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || (typeOrder[a.mismatchType] ?? 5) - (typeOrder[b.mismatchType] ?? 5));

  return mismatches;
}
