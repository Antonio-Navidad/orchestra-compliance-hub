/**
 * LAYER 2 — CANONICAL NORMALIZATION
 * 
 * Transforms raw extracted fields into a stable business schema
 * before rule evaluation. Pure deterministic logic, no AI.
 */

import type { ExtractedField } from "./validationExport";

export interface NormalizedField {
  fieldName: string;
  canonicalName: string;
  rawValue: string;
  normalizedValue: string;
  unit?: string;
  numericValue?: number;
  confidence: number;
  sourceDocumentType: string;
  normalizationApplied: string[];
}

export interface NormalizedDocument {
  docId: string;
  docName: string;
  canonicalDocType: string;
  rawDocType: string;
  fields: NormalizedField[];
}

// ── Document type canonicalization ────────────────────────────────────

const DOC_TYPE_MAP: Record<string, string> = {
  commercial_invoice: "commercial_invoice",
  invoice: "commercial_invoice",
  factura: "commercial_invoice",
  factura_comercial: "commercial_invoice",
  packing_list: "packing_list",
  pack_list: "packing_list",
  packing: "packing_list",
  bill_of_lading: "bill_of_lading",
  bol: "bill_of_lading",
  bl: "bill_of_lading",
  ocean_bill: "bill_of_lading",
  air_waybill: "air_waybill",
  awb: "air_waybill",
  airway_bill: "air_waybill",
  certificate_of_origin: "certificate_of_origin",
  coo: "certificate_of_origin",
  origin_certificate: "certificate_of_origin",
  customs_declaration: "customs_declaration",
  export_license: "export_license",
  import_permit: "import_permit",
  insurance_certificate: "insurance_certificate",
  inspection_certificate: "inspection_certificate",
  phytosanitary_certificate: "phytosanitary_certificate",
  fumigation_certificate: "fumigation_certificate",
  dangerous_goods_declaration: "dangerous_goods_declaration",
  dg_declaration: "dangerous_goods_declaration",
  multi_document_packet: "multi_document_packet",
};

export function canonicalizeDocType(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return DOC_TYPE_MAP[normalized] || normalized;
}

// ── Field name canonicalization ───────────────────────────────────────

const FIELD_NAME_MAP: Record<string, string> = {
  // Quantity variants
  qty: "quantity",
  total_qty: "quantity",
  total_quantity: "quantity",
  number_of_units: "quantity",
  units: "quantity",
  pieces: "quantity",
  pcs: "quantity",
  // Package count variants
  cartons: "package_count",
  ctns: "package_count",
  cases: "package_count",
  boxes: "package_count",
  packages: "package_count",
  pkgs: "package_count",
  number_of_packages: "package_count",
  // Weight variants
  weight: "gross_weight_kg",
  total_weight: "gross_weight_kg",
  gross_weight: "gross_weight_kg",
  net_weight: "net_weight_kg",
  // Value variants
  total_amount: "total_value",
  invoice_amount: "total_value",
  invoice_total: "total_value",
  declared_value: "total_value",
  fob_value: "total_value",
  // Description variants
  goods_description: "product_description",
  commodity: "product_description",
  commodity_description: "product_description",
  item_description: "product_description",
  product_name: "product_description",
  // Port variants
  pol: "port_of_loading",
  port_of_load: "port_of_loading",
  loading_port: "port_of_loading",
  pod: "port_of_discharge",
  discharge_port: "port_of_discharge",
  destination_port: "port_of_discharge",
  // Entity variants
  exporter: "shipper_name",
  seller: "shipper_name",
  supplier: "shipper_name",
  buyer: "consignee_name",
  importer: "consignee_name",
  notify_party: "notify_party",
  // Date - keep doc-specific
  date: "document_date",
  issued: "document_date",
};

function canonicalizeFieldName(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return FIELD_NAME_MAP[normalized] || normalized;
}

// ── Value normalization ───────────────────────────────────────────────

function normalizeCountryName(raw: string): { value: string; applied: string[] } {
  const map: Record<string, string> = {
    us: "United States", usa: "United States", "united states of america": "United States",
    "united states": "United States",
    cn: "China", prc: "China", "people's republic of china": "China",
    "peoples republic of china": "China",
    uk: "United Kingdom", gb: "United Kingdom", "great britain": "United Kingdom",
    de: "Germany", fr: "France", es: "Spain", it: "Italy", nl: "Netherlands",
    co: "Colombia", mx: "Mexico", br: "Brazil", jp: "Japan", kr: "South Korea",
    tw: "Taiwan", sg: "Singapore", hk: "Hong Kong",
  };
  const lower = raw.trim().toLowerCase();
  if (map[lower]) return { value: map[lower], applied: ["country_code_expansion"] };
  return { value: raw.trim(), applied: [] };
}

function normalizeNumericValue(raw: string): { value: string; numeric?: number; unit?: string; applied: string[] } {
  const cleaned = raw.replace(/[,$\s]/g, "").replace(/USD|EUR|CNY|GBP/gi, "").trim();
  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    // Detect unit suffix
    const unitMatch = raw.match(/(kg|lbs?|mt|tons?|cartons?|ctns?|pcs|pieces|units|pallets?)/i);
    return {
      value: num.toString(),
      numeric: num,
      unit: unitMatch ? unitMatch[1].toLowerCase() : undefined,
      applied: ["numeric_extraction"],
    };
  }
  return { value: raw.trim(), applied: [] };
}

function normalizePortName(raw: string): { value: string; applied: string[] } {
  const cleaned = raw.trim()
    .replace(/^port\s+of\s+/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Title case
  const titled = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  if (titled !== raw.trim()) {
    return { value: titled, applied: ["port_name_normalization"] };
  }
  return { value: titled, applied: [] };
}

// ── Main normalization pipeline ───────────────────────────────────────

export function normalizeExtractedFields(
  fields: ExtractedField[],
  docType: string,
  docId: string,
  docName: string
): NormalizedDocument {
  const canonicalType = canonicalizeDocType(docType);
  const normalizedFields: NormalizedField[] = [];

  for (const field of fields) {
    const canonicalName = canonicalizeFieldName(field.fieldName);
    const allApplied: string[] = [];

    let normalizedValue = field.value;
    let numericValue: number | undefined;
    let unit: string | undefined;

    // Apply type-specific normalization
    if (canonicalName.includes("country")) {
      const r = normalizeCountryName(field.value);
      normalizedValue = r.value;
      allApplied.push(...r.applied);
    } else if (canonicalName.includes("port") || canonicalName.includes("loading") || canonicalName.includes("discharge")) {
      const r = normalizePortName(field.value);
      normalizedValue = r.value;
      allApplied.push(...r.applied);
    } else if (
      canonicalName.includes("value") || canonicalName.includes("weight") ||
      canonicalName.includes("quantity") || canonicalName.includes("count") ||
      canonicalName.includes("price") || canonicalName.includes("amount")
    ) {
      const r = normalizeNumericValue(field.value);
      normalizedValue = r.value;
      numericValue = r.numeric;
      unit = r.unit;
      allApplied.push(...r.applied);
    }

    if (canonicalName !== field.fieldName.toLowerCase()) {
      allApplied.push("field_name_canonicalized");
    }
    if (canonicalType !== docType.toLowerCase()) {
      allApplied.push("doc_type_canonicalized");
    }

    normalizedFields.push({
      fieldName: field.fieldName,
      canonicalName,
      rawValue: field.value,
      normalizedValue,
      unit,
      numericValue,
      confidence: field.confidence,
      sourceDocumentType: field.sourceDocumentType || canonicalType,
      normalizationApplied: allApplied,
    });
  }

  return {
    docId,
    docName,
    canonicalDocType: canonicalType,
    rawDocType: docType,
    fields: normalizedFields,
  };
}

// ── Build unique doc type set from normalized documents ───────────────

export function getUploadedDocTypes(normalizedDocs: NormalizedDocument[]): Set<string> {
  const types = new Set<string>();
  for (const doc of normalizedDocs) {
    if (doc.canonicalDocType !== "multi_document_packet") {
      types.add(doc.canonicalDocType);
    }
  }
  return types;
}

// ── Build field name set ──────────────────────────────────────────────

export function getExtractedFieldNames(normalizedDocs: NormalizedDocument[]): Set<string> {
  const names = new Set<string>();
  for (const doc of normalizedDocs) {
    for (const field of doc.fields) {
      names.add(field.canonicalName);
    }
  }
  return names;
}
