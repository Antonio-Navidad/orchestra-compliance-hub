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

export interface FieldComparisonLog {
  canonicalField: string;
  entries: { docName: string; originalKey: string; value: string }[];
  result: "match" | "mismatch" | "skipped" | "single_doc";
  note?: string;
}

// ── Semantic field aliases ────────────────────────────────────────────
// Maps variant field names to a single canonical name for comparison

const FIELD_ALIAS_MAP: Record<string, string> = {
  // Value fields
  total_invoice_value: "declared_value",
  total_value: "declared_value",
  invoice_total: "declared_value",
  fob_value: "declared_value",
  cif_value: "declared_value",
  invoice_value: "declared_value",
  total_amount: "declared_value",
  // Party names
  shipper_name: "exporter_name",
  seller_name: "exporter_name",
  supplier_name: "exporter_name",
  manufacturer_name: "exporter_name",
  buyer_name: "consignee_name",
  importer_name: "consignee_name",
  // Descriptions
  product_description: "item_description",
  goods_description: "item_description",
  commodity_description: "item_description",
  description: "item_description",
  // Ports
  loading_port: "port_of_loading",
  pol: "port_of_loading",
  origin_port: "port_of_loading",
  pod: "port_of_discharge",
  discharge_port: "port_of_discharge",
  destination_port: "port_of_discharge",
  arrival_port: "port_of_discharge",
  // Aggregate quantities (totals only — line-item "quantity" is excluded)
  total_pieces: "total_quantity",
  total_qty: "total_quantity",
  number_of_pieces: "total_quantity",
  total_quantity: "total_quantity",
  total_packages: "total_quantity",
  package_count: "total_quantity",
  // Weights
  total_gross_weight_kg: "gross_weight_kg",
  total_net_weight_kg: "net_weight_kg",
  weight_kg: "gross_weight_kg",
  // Other
  country_of_origin: "origin_country",
  bl_number: "bill_of_lading_number",
  container_no: "container_number",
};

function canonicalFieldName(raw: string): string {
  const key = raw.toLowerCase().trim();
  return FIELD_ALIAS_MAP[key] ?? key;
}

// ── Field classification ──────────────────────────────────────────────

const HIGH_SEVERITY_FIELDS = [
  "declared_value", "total_price", "unit_price", "subtotal",
  "hs_code", "consignee_name", "exporter_name", "origin_country",
  "destination_country", "total_quantity", "quantity", "package_count",
  "gross_weight_kg", "net_weight_kg",
  "container_number",
];

const MEDIUM_SEVERITY_FIELDS = [
  "invoice_number", "bill_of_lading_number",
  "incoterms", "currency", "transport_mode",
  "port_of_loading", "port_of_discharge",
];

const EXPECTED_DIFFERENT_FIELDS = new Set([
  "issue_date", "document_date", "date", "invoice_date",
  "bl_date", "packing_date", "coo_date", "certificate_date",
  "page_range", "document_number", "packing_list_number",
  "prepared_by", "verified_by", "prepared_by_title", "verified_by_title",
  "authorized_signature_name", "authorized_signature_title", "authorized_signature_date",
]);

// ── Customs impact notes ─────────────────────────────────────────────

const CUSTOMS_IMPACT: Record<string, string> = {
  declared_value: "Declared value discrepancy may trigger customs hold or additional duties assessment.",
  total_price: "Total price mismatch can trigger additional duties or penalties.",
  unit_price: "Unit price discrepancy across documents may indicate valuation fraud risk.",
  subtotal: "Subtotal mismatch affects duty calculation.",
  hs_code: "HS code mismatch may result in wrong duty rate, seizure, or classification dispute.",
  consignee_name: "Consignee name mismatch may trigger sanctions screening or shipment hold.",
  exporter_name: "Shipper/exporter name inconsistency may flag sanctions or denied-party concerns.",
  origin_country: "Origin country mismatch affects preferential duty rates and trade agreement eligibility.",
  destination_country: "Destination mismatch can result in wrong regulatory requirements being applied.",
  total_quantity: "Quantity discrepancy may trigger physical inspection or cargo examination.",
  quantity: "Quantity discrepancy may trigger physical inspection or cargo examination.",
  gross_weight_kg: "Weight discrepancy may trigger physical verification and delays.",
  net_weight_kg: "Net weight mismatch affects duty calculation for weight-based tariffs.",
  container_number: "Container number mismatch is a critical logistics discrepancy that may prevent release.",
};

// ── Port gateway clusters ────────────────────────────────────────────

const PORT_GATEWAY_CLUSTERS: string[][] = [
  ["los angeles", "long beach", "la/lb", "la", "lb", "san pedro bay", "uslax"],
  ["new york", "newark", "elizabeth", "ny/nj", "port newark"],
  ["seattle", "tacoma", "northwest seaport alliance"],
  ["shanghai", "yangshan", "waigaoqiao"],
  ["shenzhen", "yantian", "shekou", "chiwan"],
  ["ningbo", "zhoushan", "ningbo-zhoushan"],
  ["rotterdam", "europoort", "maasvlakte"],
  ["antwerp", "zeebrugge"],
  ["singapore", "pasir panjang", "tanjong pagar"],
  ["busan", "pusan"],
  ["cartagena", "coctg"],
];

function normalizePortName(port: string): string {
  return port.trim().toLowerCase()
    .replace(/^port\s+of\s+/i, "")
    .replace(/\([^)]*\)/g, " ")  // strip parenthesized codes like (USLAX)
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

// ── Text similarity ──────────────────────────────────────────────────

function normalizeText(v: string): string {
  return v.trim().toLowerCase()
    .replace(/[,.\-\/\\()'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textsAreFuzzyEqual(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  // Check if one contains the other (handles "S.A.S." vs "S.A.S" etc.)
  if (na.includes(nb) || nb.includes(na)) return true;
  // Jaccard similarity for longer texts
  const tokA = new Set(na.split(" ").filter((w) => w.length > 1));
  const tokB = new Set(nb.split(" ").filter((w) => w.length > 1));
  if (tokA.size === 0 && tokB.size === 0) return true;
  const intersection = new Set([...tokA].filter((x) => tokB.has(x)));
  const union = new Set([...tokA, ...tokB]);
  return union.size > 0 && intersection.size / union.size >= 0.7;
}

// ── Field type detection ─────────────────────────────────────────────

function isMonetaryField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["value", "price", "amount", "cost", "total", "fob", "cif", "subtotal", "declared_value"].some((k) => fn.includes(k));
}

function isNameField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["name", "consignee", "exporter", "shipper", "seller", "buyer"].some((k) => fn.includes(k));
}

function isDescriptionField(fieldName: string): boolean {
  const fn = fieldName.toLowerCase();
  return ["description", "product_name", "item_name", "goods_description", "commodity"].some((k) => fn.includes(k));
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

// ── Entry type for field map ─────────────────────────────────────────

interface FieldEntry {
  docName: string;
  docType: string;
  value: string;
  confidence: number;
  originalKey: string;
}

// ── Main comparison engine (from UploadedDocument[]) ─────────────────

export function detectCrossDocMismatches(documents: UploadedDocument[]): CrossDocMismatch[] {
  const extracted = documents.filter((d) => d.status === "extracted" && d.extractedFields.length > 0);
  if (extracted.length < 2) return [];

  const fieldMap = new Map<string, FieldEntry[]>();

  for (const doc of extracted) {
    for (const field of doc.extractedFields) {
      const canonical = canonicalFieldName(field.fieldName);
      if (!fieldMap.has(canonical)) fieldMap.set(canonical, []);
      fieldMap.get(canonical)!.push({
        docName: doc.name || doc.file.name,
        docType: doc.detectedType || doc.type,
        value: field.value,
        confidence: field.confidence,
        originalKey: field.fieldName,
      });
    }
  }

  return runComparison(fieldMap).mismatches;
}

// ── Comparison from LibraryDocument[] ────────────────────────────────

export interface ComparisonResult {
  mismatches: CrossDocMismatch[];
  debugLog: FieldComparisonLog[];
}

export function detectLibraryDocMismatches(documents: LibraryDocument[]): ComparisonResult {
  const extracted = documents.filter((d) => d.extraction_status === "complete" && d.extracted_fields && Object.keys(d.extracted_fields).length > 0);
  if (extracted.length < 2) return { mismatches: [], debugLog: [] };

  const fieldMap = new Map<string, FieldEntry[]>();

  for (const doc of extracted) {
    const fields = doc.extracted_fields;
    if (Array.isArray(fields)) {
      for (const f of fields) {
        const rawKey = (f.fieldName || f.field_name || f.name || "").toLowerCase();
        if (!rawKey) continue;
        const val = String(f.value ?? f.extractedValue ?? "");
        if (!val) continue;
        const canonical = canonicalFieldName(rawKey);
        if (!fieldMap.has(canonical)) fieldMap.set(canonical, []);
        fieldMap.get(canonical)!.push({
          docName: doc.file_name,
          docType: doc.document_type || "unknown",
          value: val,
          confidence: f.confidence ?? 0.8,
          originalKey: rawKey,
        });
      }
    } else if (typeof fields === "object") {
      for (const [rawKey, rawVal] of Object.entries(fields)) {
        const k = rawKey.toLowerCase();
        // extracted_fields values can be { value, confidence, ... } or plain strings
        let val: string;
        if (rawVal && typeof rawVal === "object" && "value" in (rawVal as any)) {
          val = String((rawVal as any).value ?? "");
        } else {
          val = String(rawVal ?? "");
        }
        if (!val) continue;
        const canonical = canonicalFieldName(k);
        if (!fieldMap.has(canonical)) fieldMap.set(canonical, []);
        fieldMap.get(canonical)!.push({
          docName: doc.file_name,
          docType: doc.document_type || "unknown",
          value: val,
          confidence: (rawVal && typeof rawVal === "object" && "confidence" in (rawVal as any)) ? Number((rawVal as any).confidence) : 0.8,
          originalKey: k,
        });
      }
    }
  }

  return runComparison(fieldMap);
}

// ── Shared comparison logic ──────────────────────────────────────────

function runComparison(fieldMap: Map<string, FieldEntry[]>): ComparisonResult {
  const mismatches: CrossDocMismatch[] = [];
  const debugLog: FieldComparisonLog[] = [];

  for (const [fieldName, entries] of fieldMap) {
    const logEntry: FieldComparisonLog = {
      canonicalField: fieldName,
      entries: entries.map((e) => ({ docName: e.docName, originalKey: e.originalKey, value: e.value })),
      result: "single_doc",
    };

    // Need entries from at least 2 different documents
    const uniqueDocs = new Set(entries.map((e) => e.docName));
    if (uniqueDocs.size < 2) {
      logEntry.result = "single_doc";
      logEntry.note = "Field only found in one document";
      debugLog.push(logEntry);
      continue;
    }

    // Skip expected-different fields
    if (EXPECTED_DIFFERENT_FIELDS.has(fieldName)) {
      logEntry.result = "skipped";
      logEntry.note = "Expected to differ across documents";
      debugLog.push(logEntry);
      continue;
    }
    if (isDateField(fieldName)) {
      const docTypes = new Set(entries.map((e) => e.docType));
      if (docTypes.size > 1) {
        logEntry.result = "skipped";
        logEntry.note = "Date field from different doc types — expected to differ";
        debugLog.push(logEntry);
        continue;
      }
    }

    // ── Monetary field comparison (exact numeric) ──
    if (isMonetaryField(fieldName)) {
      const nums = entries.map((e) => ({ ...e, numVal: extractMonetaryValue(e.value) }));
      const validNums = nums.filter((n) => n.numVal !== null);
      if (validNums.length >= 2) {
        const values = validNums.map((n) => n.numVal!);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const diff = max - min;

        if (diff <= 1.0) {
          logEntry.result = "match";
          logEntry.note = `Monetary values match (diff: $${diff.toFixed(2)})`;
          debugLog.push(logEntry);
          continue;
        }

        // It's a mismatch
        const severity: CrossDocMismatch["severity"] = diff > 500 ? "high" : "medium";
        const customsImpact = severity === "high" ? getCustomsImpact(fieldName) : undefined;

        mismatches.push({
          fieldName,
          severity,
          mismatchType: "true_conflict",
          documents: entries.map((e) => ({ docName: e.docName, docType: e.docType, value: e.value, confidence: e.confidence })),
          description: `"${fieldName.replace(/_/g, " ")}" has conflicting monetary values across documents`,
          reason: `Difference of $${formatMoney(diff)} detected between documents.`,
          customsImpact,
          valueDifference: `$${formatMoney(diff)}`,
        });

        logEntry.result = "mismatch";
        logEntry.note = `Monetary diff: $${formatMoney(diff)} → ${severity} severity`;
        debugLog.push(logEntry);
        continue;
      }
    }

    // ── Name / party field comparison (fuzzy) ──
    if (isNameField(fieldName)) {
      const values = entries.map((e) => e.value);
      const allMatch = values.every((v) => textsAreFuzzyEqual(v, values[0]));
      if (allMatch) {
        logEntry.result = "match";
        logEntry.note = "Name fields match (fuzzy)";
        debugLog.push(logEntry);
        continue;
      }
    }

    // ── Description field comparison (fuzzy) ──
    if (isDescriptionField(fieldName)) {
      const values = entries.map((e) => e.value);
      const allMatch = values.every((v) => textsAreFuzzyEqual(v, values[0]));
      if (allMatch) {
        logEntry.result = "match";
        logEntry.note = "Descriptions match (fuzzy)";
        debugLog.push(logEntry);
        continue;
      }
    }

    // ── Port gateway reconciliation ──
    if (isPortField(fieldName)) {
      const values = entries.map((e) => e.value);
      const allSameGateway = values.every((v) => portsInSameGateway(v, values[0]));
      if (allSameGateway) {
        mismatches.push({
          fieldName,
          severity: "low",
          mismatchType: "port_gateway",
          documents: entries.map((e) => ({ docName: e.docName, docType: e.docType, value: e.value, confidence: e.confidence })),
          description: `"${fieldName.replace(/_/g, " ")}" references ports within the same gateway complex`,
          reason: `These ports are part of the same port complex and are operationally interchangeable.`,
        });
        logEntry.result = "mismatch";
        logEntry.note = "Port gateway variant (low severity)";
        debugLog.push(logEntry);
        continue;
      }
    }

    // ── General text comparison ──
    const normalized = entries.map((e) => normalizeText(e.value));
    const unique = new Set(normalized);
    if (unique.size <= 1) {
      logEntry.result = "match";
      logEntry.note = "Exact match after normalization";
      debugLog.push(logEntry);
      continue;
    }

    // True conflict
    const baseSeverity = getBaseSeverity(fieldName);
    const customsImpact = baseSeverity === "high" ? getCustomsImpact(fieldName) : undefined;

    mismatches.push({
      fieldName,
      severity: baseSeverity,
      mismatchType: "true_conflict",
      documents: entries.map((e) => ({ docName: e.docName, docType: e.docType, value: e.value, confidence: e.confidence })),
      description: `"${fieldName.replace(/_/g, " ")}" has ${unique.size} conflicting values across ${entries.length} documents`,
      reason: `Material discrepancy detected. Review recommended.`,
      customsImpact,
    });

    logEntry.result = "mismatch";
    logEntry.note = `True conflict — ${baseSeverity} severity`;
    debugLog.push(logEntry);
  }

  // ── HS code vs product description cross-validation ──
  // Check if HS codes and descriptions within the same document set are semantically consistent
  const hsCodes = fieldMap.get("hs_code");
  const descriptions = fieldMap.get("item_description");
  if (hsCodes && descriptions) {
    const hsDescMismatches = detectHsDescriptionMismatches(hsCodes, descriptions);
    mismatches.push(...hsDescMismatches);
  }

  // Sort: high first, then medium, then low
  const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const typeOrder: Record<string, number> = { true_conflict: 0, unit_conversion: 1, port_gateway: 2, semantic_variant: 3, expected_difference: 4 };
  mismatches.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || (typeOrder[a.mismatchType] ?? 5) - (typeOrder[b.mismatchType] ?? 5));

  return { mismatches, debugLog };
}

// ── HS code vs description mismatch detection ─────────────────────────
// Known HS code category prefixes mapped to expected product keywords
const HS_CATEGORY_KEYWORDS: Record<string, { category: string; keywords: string[] }> = {
  "01": { category: "live animals", keywords: ["animal", "livestock", "horse", "cattle", "pig", "poultry", "sheep"] },
  "02": { category: "meat", keywords: ["meat", "beef", "pork", "chicken", "lamb", "poultry"] },
  "03": { category: "fish/seafood", keywords: ["fish", "seafood", "shrimp", "salmon", "tuna", "lobster", "crab"] },
  "06": { category: "plants/flowers", keywords: ["plant", "flower", "bulb", "seed", "tree"] },
  "07": { category: "vegetables", keywords: ["vegetable", "potato", "tomato", "onion", "carrot", "legume"] },
  "08": { category: "fruit/nuts", keywords: ["fruit", "apple", "banana", "orange", "nut", "almond", "walnut"] },
  "09": { category: "coffee/tea/spices", keywords: ["coffee", "tea", "spice", "pepper", "cinnamon", "vanilla"] },
  "10": { category: "cereals", keywords: ["wheat", "rice", "corn", "maize", "barley", "oat", "cereal", "grain"] },
  "22": { category: "beverages", keywords: ["wine", "beer", "spirit", "juice", "water", "beverage", "alcohol"] },
  "27": { category: "mineral fuels/oils", keywords: ["oil", "petroleum", "gas", "fuel", "coal", "bitumen"] },
  "30": { category: "pharmaceuticals", keywords: ["pharmaceutical", "medicine", "drug", "tablet", "capsule", "vaccine"] },
  "39": { category: "plastics", keywords: ["plastic", "polymer", "polyethylene", "PVC", "resin"] },
  "44": { category: "wood", keywords: ["wood", "timber", "lumber", "plywood", "furniture", "wooden"] },
  "48": { category: "paper", keywords: ["paper", "cardboard", "carton", "tissue"] },
  "50": { category: "silk", keywords: ["silk"] },
  "52": { category: "cotton", keywords: ["cotton"] },
  "61": { category: "knitted apparel", keywords: ["shirt", "t-shirt", "sweater", "jersey", "blouse", "dress", "knit", "apparel", "clothing", "garment"] },
  "62": { category: "woven apparel", keywords: ["suit", "jacket", "coat", "trouser", "skirt", "dress", "woven", "apparel", "clothing"] },
  "64": { category: "footwear", keywords: ["shoe", "boot", "sandal", "slipper", "footwear", "sneaker"] },
  "71": { category: "precious stones/metals", keywords: ["gold", "silver", "diamond", "jewelry", "jewellery", "precious", "pearl"] },
  "72": { category: "iron/steel", keywords: ["iron", "steel", "metal"] },
  "73": { category: "iron/steel articles", keywords: ["pipe", "tube", "wire", "nail", "screw", "bolt", "steel", "iron"] },
  "84": { category: "machinery", keywords: ["machine", "engine", "pump", "compressor", "turbine", "machinery", "equipment", "industrial"] },
  "85": { category: "electrical equipment", keywords: ["electric", "electronic", "circuit", "battery", "transformer", "motor", "led", "cable", "wire", "semiconductor", "chip"] },
  "87": { category: "vehicles", keywords: ["car", "vehicle", "automobile", "truck", "bus", "motorcycle", "tractor", "trailer"] },
  "8471": { category: "computers/laptops", keywords: ["computer", "laptop", "notebook", "desktop", "server", "processing"] },
  "8517": { category: "telephones", keywords: ["phone", "telephone", "smartphone", "mobile", "cellular"] },
  "9401": { category: "seats/chairs", keywords: ["seat", "chair", "sofa", "couch", "stool"] },
  "9403": { category: "furniture", keywords: ["furniture", "desk", "table", "cabinet", "shelf", "wardrobe", "bed"] },
};

function detectHsDescriptionMismatches(
  hsCodes: FieldEntry[],
  descriptions: FieldEntry[]
): CrossDocMismatch[] {
  const mismatches: CrossDocMismatch[] = [];

  for (const hsEntry of hsCodes) {
    const code = hsEntry.value.replace(/[^0-9]/g, "");
    if (code.length < 2) continue;

    // Find the description from the same document
    const sameDocDesc = descriptions.find(d => d.docName === hsEntry.docName);
    if (!sameDocDesc) continue;

    const descLower = sameDocDesc.value.toLowerCase();

    // Check against known categories - try most specific prefix first
    const prefixes = [code.slice(0, 4), code.slice(0, 2)];
    let matched = false;
    let categoryInfo: { category: string; keywords: string[] } | null = null;

    for (const prefix of prefixes) {
      if (HS_CATEGORY_KEYWORDS[prefix]) {
        categoryInfo = HS_CATEGORY_KEYWORDS[prefix];
        const hasKeyword = categoryInfo.keywords.some(kw => descLower.includes(kw));
        if (hasKeyword) {
          matched = true;
          break;
        }
      }
    }

    // If we found a category mapping but no keyword match, it's a mismatch
    if (categoryInfo && !matched) {
      mismatches.push({
        fieldName: "hs_code_description_match",
        severity: "high",
        mismatchType: "true_conflict",
        documents: [
          { docName: hsEntry.docName, docType: hsEntry.docType, value: `HS ${hsEntry.value} (${categoryInfo.category})`, confidence: hsEntry.confidence },
          { docName: sameDocDesc.docName, docType: sameDocDesc.docType, value: sameDocDesc.value, confidence: sameDocDesc.confidence },
        ],
        description: `HS code ${hsEntry.value} (${categoryInfo.category}) does not match product description`,
        reason: `The HS code classifies this as "${categoryInfo.category}" but the product description does not contain expected keywords for this category.`,
        customsImpact: "HS code does not match product description — may trigger customs examination.",
      });
    }
  }

  return mismatches;
}
