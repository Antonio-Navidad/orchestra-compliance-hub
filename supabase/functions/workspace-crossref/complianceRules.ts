/**
 * complianceRules.ts
 * US Customs compliance brain for Orchestra Compliance Hub.
 * All rules are grounded in CBP regulations current as of 2025.
 * Field names must match the extraction schemas in workspace-extract/index.ts.
 */

export type Severity = "critical" | "high" | "medium" | "low";
export type TransportMode = "ocean" | "air" | "land_mexico" | "land_canada" | "land";

// ─── Field-level comparison rule between two documents ───────────────────────

export interface FieldComparison {
  /** Field name as it appears in document A's extracted_data */
  fieldA: string;
  /** Field name as it appears in document B's extracted_data (may differ from fieldA) */
  fieldB: string;
  severity: Severity;
  /**
   * Plain-English rule for the AI. Always includes the implicit rule that
   * if the field is null/absent in EITHER document the check is skipped.
   */
  tolerance: string;
  /** CBP regulation or policy basis */
  regulation: string;
}

export interface DocumentPairRule {
  documentA: string;  // snake_case, matches document_library.document_type
  documentB: string;
  fields: FieldComparison[];
  /** Fields the AI must never flag on this pair (avoids false positives) */
  explicitSkipFields: string[];
}

// ─── Required-field check for a single document ──────────────────────────────

export interface RequiredFieldRule {
  field: string;
  description: string;
  regulation: string;
}

export interface DocumentSpec {
  documentType: string;
  requiredFields: RequiredFieldRule[];
  regulationSummary: string;
}

// ─── 2025 tariff / compliance alert ──────────────────────────────────────────

export interface ComplianceAlert {
  id: string;
  severity: Severity;
  /** Condition description shown to the AI so it can decide if it applies */
  condition: string;
  message: string;
  regulation: string;
  effectiveDate: string;
}

// ─── Fee schedule ─────────────────────────────────────────────────────────────

export interface FeeSchedule {
  mpf_rate: number;
  mpf_min_usd: number;
  mpf_max_usd: number;
  hmf_rate: number | null;  // null = does not apply for this mode
  notes: string[];
}

// ─── Top-level mode rules ─────────────────────────────────────────────────────

export interface ModeComplianceRules {
  mode: TransportMode;
  displayName: string;
  documentPairs: DocumentPairRule[];
  documentSpecs: DocumentSpec[];
  feeSchedule: FeeSchedule;
  entryNotes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// OCEAN IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const OCEAN_IMPORT_RULES: ModeComplianceRules = {
  mode: "ocean",
  displayName: "Ocean Import",

  documentPairs: [
    // ── Commercial Invoice vs Bill of Lading ──────────────────────────────────
    {
      documentA: "commercial_invoice",
      documentB: "bill_of_lading",
      fields: [
        {
          fieldA: "seller_name",
          fieldB: "shipper",
          severity: "critical",
          tolerance: "Names must refer to the same legal entity. Acceptable: abbreviations, punctuation differences, trade name vs legal name. Not acceptable: completely different company names.",
          regulation: "19 CFR 141.86(a) — invoice must identify seller; 19 CFR 141.86(d) — shipper on BOL must match invoice seller",
        },
        {
          fieldA: "buyer_name",
          fieldB: "consignee",
          severity: "critical",
          tolerance: "Names must refer to the same legal entity. Acceptable: abbreviations, c/o language. Not acceptable: different companies.",
          regulation: "19 CFR 141.86(a) — invoice must identify consignee; CBP entry requires consignee identity match",
        },
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. Any COO discrepancy between invoice and BOL triggers a 19 CFR 134 country-of-origin marking violation.",
          regulation: "19 CFR 134.11 — every article of foreign origin must be marked with country of origin. BOL and invoice must agree.",
        },
        {
          fieldA: "total_cartons",
          fieldB: "total_packages",
          severity: "high",
          tolerance: "Must match exactly. A difference in package count between invoice and BOL creates an entry discrepancy that CBP will flag at exam.",
          regulation: "19 CFR 141.86(e) — invoice must show quantities matching transport documents",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "gross_weight_kg",
          severity: "medium",
          tolerance: "Flag only if difference exceeds 5%. Minor variance from measurement method is acceptable per CBP practice.",
          regulation: "CBP standard practice — weight variances under 5% generally accepted without examination",
        },
        {
          fieldA: "line_items",
          fieldB: "commodity_description",
          severity: "medium",
          tolerance: "Semantic match — BOL cargo description may be more general than invoice line items. Flag only if the BOL description is clearly inconsistent with the invoice goods (e.g., invoice says electronics, BOL says furniture).",
          regulation: "19 CFR 141.86(b) — goods description must be sufficient for CBP classification",
        },
      ],
      explicitSkipFields: [
        "declared_value_usd",
        "unit_prices",
        "payment_terms",
        "freight_charges",
        "bank_details",
        "letter_of_credit",
        "invoice_number",
        "invoice_date",
      ],
    },

    // ── Commercial Invoice vs Packing List ────────────────────────────────────
    {
      documentA: "commercial_invoice",
      documentB: "packing_list",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. COO discrepancy between invoice and packing list is a 19 CFR 134 violation.",
          regulation: "19 CFR 134.11 — origin marking must be consistent across all shipping documents",
        },
        {
          fieldA: "total_cartons",
          fieldB: "total_cartons",
          severity: "high",
          tolerance: "Must match exactly. Carton count discrepancy creates manifest shortage or overage at port.",
          regulation: "19 CFR 141.86(e) — quantities must agree between invoice and packing documentation",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "total_gross_weight_kg",
          severity: "medium",
          tolerance: "Flag only if difference exceeds 5%. Rounding differences between invoice and packing list are common and accepted.",
          regulation: "CBP standard practice — minor weight variances acceptable",
        },
        {
          fieldA: "total_net_weight_kg",
          fieldB: "total_net_weight_kg",
          severity: "medium",
          tolerance: "Flag only if difference exceeds 5%.",
          regulation: "CBP standard practice",
        },
        {
          fieldA: "line_items",
          fieldB: "line_items",
          severity: "medium",
          tolerance: "Goods descriptions should be semantically consistent. Flag only if an invoice line item has no corresponding packing list entry or if descriptions are clearly contradictory.",
          regulation: "19 CFR 141.86(b) — goods description must be sufficient for classification",
        },
      ],
      explicitSkipFields: [
        "unit_prices",
        "total_value",
        "payment_terms",
        "bank_details",
        "invoice_number",
        "currency",
        "freight_charges",
      ],
    },

    // ── Bill of Lading vs Packing List ────────────────────────────────────────
    {
      documentA: "bill_of_lading",
      documentB: "packing_list",
      fields: [
        {
          fieldA: "total_packages",
          fieldB: "total_cartons",
          severity: "high",
          tolerance: "Must match exactly. Package count on the BOL must equal total cartons on the packing list.",
          regulation: "CBP Form 3461 — package count must be consistent across manifest and packing documentation",
        },
        {
          fieldA: "gross_weight_kg",
          fieldB: "total_gross_weight_kg",
          severity: "medium",
          tolerance: "Flag only if difference exceeds 5%.",
          regulation: "CBP standard practice",
        },
        {
          fieldA: "port_of_loading",
          fieldB: "port_of_loading",
          severity: "high",
          tolerance: "Must match. Port of loading discrepancy can indicate transshipment or document substitution.",
          regulation: "19 CFR 4.7 — vessel manifest must accurately reflect port of lading",
        },
        {
          fieldA: "port_of_discharge",
          fieldB: "port_of_discharge",
          severity: "high",
          tolerance: "Must match. Port of discharge must be consistent across transport and packing documentation.",
          regulation: "19 CFR 4.7 — vessel manifest must accurately reflect port of unlading",
        },
      ],
      explicitSkipFields: [
        "declared_value_usd",
        "freight_charges",
        "payment_terms",
      ],
    },

    // ── ISF 10+2 vs Commercial Invoice ────────────────────────────────────────
    {
      documentA: "isf_filing",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. ISF COO must match invoice COO. Discrepancy triggers CBP exam and potential $5,000 ISF penalty.",
          regulation: "19 CFR 149.2 — ISF must include accurate country of origin; $5,000 per violation",
        },
        {
          fieldA: "manufacturer_name",
          fieldB: "seller_name",
          severity: "high",
          tolerance: "Must refer to the same entity or a related manufacturer. Abbreviations acceptable.",
          regulation: "19 CFR 149.2(b)(1) — ISF must identify manufacturer/supplier",
        },
        {
          fieldA: "hts_codes",
          fieldB: "line_items",
          severity: "high",
          tolerance: "HTS codes on ISF (6-digit minimum) must be consistent with the goods described on the commercial invoice.",
          regulation: "19 CFR 149.2(b)(5) — ISF must include commodity HTS number at 6-digit level",
        },
      ],
      explicitSkipFields: ["declared_value_usd", "payment_terms", "bank_details"],
    },

    // ── ISF 10+2 vs Bill of Lading ────────────────────────────────────────────
    {
      documentA: "isf_filing",
      documentB: "bill_of_lading",
      fields: [
        {
          fieldA: "container_numbers",
          fieldB: "container_numbers",
          severity: "critical",
          tolerance: "Exact match required. Container numbers on ISF must match BOL. Mismatch = ISF inaccuracy = $5,000 penalty.",
          regulation: "19 CFR 149.2 — ISF must accurately reflect container numbers; CBP holds shipment if ISF container does not match manifest",
        },
        {
          fieldA: "vessel_name",
          fieldB: "vessel_name",
          severity: "high",
          tolerance: "Must match. Vessel name discrepancy indicates ISF was not updated after transshipment.",
          regulation: "19 CFR 149.4 — ISF must be updated when vessel or voyage changes",
        },
      ],
      explicitSkipFields: ["declared_value_usd", "freight_charges"],
    },

    // ── FTA Certificate vs Commercial Invoice ─────────────────────────────────
    {
      documentA: "fta_certificate",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. FTA certificate COO must match invoice COO or preferential duty claim is invalid.",
          regulation: "19 CFR 10.413 (USMCA) / applicable FTA regulations — COO must be consistent to claim preferential treatment",
        },
        {
          fieldA: "expiry_date",
          fieldB: "invoice_date",
          severity: "critical",
          tolerance: "FTA certificate must not be expired as of the invoice date. An expired certificate means duty preference is lost.",
          regulation: "USMCA Article 5.2 — certification of origin must be valid at time of importation",
        },
        {
          fieldA: "importer",
          fieldB: "buyer_name",
          severity: "high",
          tolerance: "Must refer to the same entity. Abbreviations acceptable.",
          regulation: "FTA regulations — certificate must name the correct importer of record",
        },
      ],
      explicitSkipFields: ["unit_prices", "payment_terms", "bank_details"],
    },

    // ── Certificate of Origin vs Commercial Invoice ──────────────────────────
    {
      documentA: "certificate_of_origin",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Must match for ALL line items. If certificate shows multiple origins (e.g., China AND Vietnam for different items), the invoice must reflect the same split. A blanket 'CHINA' on the invoice when some items are from Vietnam is a 19 CFR 134 violation.",
          regulation: "19 CFR 134.11 — country of origin marking must be accurate per item; false COO declaration = 19 USC 1592 penalty",
        },
        {
          fieldA: "hts_codes",
          fieldB: "hts_codes",
          severity: "critical",
          tolerance: "HTS codes on certificate must match invoice HTS codes for the same goods. Different HTS = different duty rates = potential duty shortfall. Flag ANY difference.",
          regulation: "19 USC 1592 — misclassification penalty up to 4× duty shortfall",
        },
        {
          fieldA: "total_quantity",
          fieldB: "total_quantity",
          severity: "medium",
          tolerance: "Quantities must match. Flag any difference — indicates goods were added or removed after certificate was issued.",
          regulation: "CBP requirement — certificate must accurately describe the goods being imported",
        },
      ],
      explicitSkipFields: ["payment_terms", "bank_details", "freight_charges"],
    },

    // ── Certificate of Origin vs Packing List ────────────────────────────────
    {
      documentA: "certificate_of_origin",
      documentB: "packing_list",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Must match per item. If packing list shows different origin countries per line item, certificate must reflect the same split.",
          regulation: "19 CFR 134.11 — origin marking consistency across all shipping documents",
        },
        {
          fieldA: "total_quantity",
          fieldB: "total_quantity",
          severity: "medium",
          tolerance: "Total pieces must match. Certificate of origin quantity must equal packing list quantity.",
          regulation: "CBP exam best practice — quantities must be reconcilable across documents",
        },
      ],
      explicitSkipFields: ["unit_prices", "payment_terms"],
    },

    // ── Certificate of Origin vs ISF ─────────────────────────────────────────
    {
      documentA: "certificate_of_origin",
      documentB: "isf_filing",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "ISF Element 9 (country of origin) must match certificate. If certificate shows multiple origins, ISF must list all of them. Single-origin ISF for a multi-origin shipment is an ISF inaccuracy ($5,000 per element).",
          regulation: "19 CFR 149.2(b)(5) — ISF must include accurate country of origin; $5,000 per violation",
        },
        {
          fieldA: "manufacturer_name",
          fieldB: "manufacturer_name",
          severity: "high",
          tolerance: "ISF Element 3 (manufacturer) must include ALL manufacturers listed on the certificate. If certificate shows goods from different factories, ISF must disclose each one.",
          regulation: "19 CFR 149.2(b)(1) — ISF must identify manufacturer/supplier for each item",
        },
        {
          fieldA: "hts_codes",
          fieldB: "hts_codes",
          severity: "critical",
          tolerance: "ISF Element 10 (HTS) must match certificate HTS codes. Any difference = ISF inaccuracy.",
          regulation: "19 CFR 149.2(b)(4) — ISF must include commodity HTS number at 6-digit level; $5,000 penalty per violation",
        },
      ],
      explicitSkipFields: [],
    },

    // ── Customs Bond vs Commercial Invoice ───────────────────────────────────
    {
      documentA: "customs_bond",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "bond_amount_usd",
          fieldB: "total_value",
          severity: "critical",
          tolerance: "For a single-entry bond, the bond amount MUST equal or exceed the total entered value of the merchandise. If bond amount < invoice total, flag as CRITICAL with exact shortfall. CBP will reject entry if bond is insufficient per 19 U.S.C. 1623.",
          regulation: "19 U.S.C. 1623 — failure to maintain adequate bond results in entry rejection; 19 CFR 113.13 — bond must cover duties, taxes, and fees",
        },
        {
          fieldA: "importer_name",
          fieldB: "buyer_name",
          severity: "high",
          tolerance: "Must refer to the same entity. Bond principal must be the importer of record.",
          regulation: "19 CFR 113.11 — bond must identify the correct principal",
        },
      ],
      explicitSkipFields: [],
    },

    // ── Arrival Notice vs Bill of Lading ─────────────────────────────────────
    {
      documentA: "arrival_notice",
      documentB: "bill_of_lading",
      fields: [
        {
          fieldA: "gross_weight_kg",
          fieldB: "gross_weight_kg",
          severity: "medium",
          tolerance: "Must match. Weight discrepancy between arrival notice and BOL may indicate cargo was added or removed in transit.",
          regulation: "CBP manifest accuracy requirement",
        },
        {
          fieldA: "container_numbers",
          fieldB: "container_numbers",
          severity: "critical",
          tolerance: "Must match exactly. Container number discrepancy indicates possible transshipment or document substitution.",
          regulation: "19 CFR 4.7a — container numbers on manifest must match actual containers",
        },
      ],
      explicitSkipFields: ["freight_charges", "demurrage_rate"],
    },
  ],

  documentSpecs: [
    {
      documentType: "commercial_invoice",
      regulationSummary: "19 CFR 141.86 — Required elements of a commercial invoice for CBP entry",
      requiredFields: [
        { field: "seller_name", description: "Full legal name of the seller/exporter", regulation: "19 CFR 141.86(a)(1)" },
        { field: "seller_address", description: "Complete address of the seller", regulation: "19 CFR 141.86(a)(1)" },
        { field: "buyer_name", description: "Full legal name of the buyer/consignee", regulation: "19 CFR 141.86(a)(2)" },
        { field: "buyer_address", description: "Complete address of the buyer", regulation: "19 CFR 141.86(a)(2)" },
        { field: "country_of_origin", description: "Country where goods were manufactured or substantially transformed", regulation: "19 CFR 141.86(a)(4)" },
        { field: "invoice_date", description: "Date invoice was issued", regulation: "19 CFR 141.86(a)(3)" },
        { field: "currency", description: "Currency of transaction (ISO 4217 code)", regulation: "19 CFR 141.86(a)(10)" },
        { field: "total_value", description: "Total invoice value in transaction currency", regulation: "19 CFR 141.86(a)(7)" },
        { field: "line_items", description: "Itemized list of goods with quantity, unit price, and description sufficient for CBP classification", regulation: "19 CFR 141.86(a)(5)(6)(7)" },
      ],
    },
    {
      documentType: "bill_of_lading",
      regulationSummary: "46 CFR Part 520 and CBP vessel manifest requirements under 19 CFR Part 4",
      requiredFields: [
        { field: "shipper", description: "Full name of the shipper/exporter", regulation: "19 CFR 4.7(b)(1)" },
        { field: "consignee", description: "Full name of the consignee/importer", regulation: "19 CFR 4.7(b)(2)" },
        { field: "notify_party", description: "Notify party for cargo arrival", regulation: "Industry standard; required for LC transactions" },
        { field: "vessel_name", description: "Name of the carrying vessel", regulation: "19 CFR 4.7(b)(4)" },
        { field: "voyage_number", description: "Voyage number", regulation: "19 CFR 4.7(b)(4)" },
        { field: "port_of_loading", description: "Port where cargo was loaded", regulation: "19 CFR 4.7(b)(5)" },
        { field: "port_of_discharge", description: "Port of unlading in the US", regulation: "19 CFR 4.7(b)(6)" },
        { field: "container_numbers", description: "Container identification numbers", regulation: "19 CFR 4.7a(c)(2) — required for AMS filing" },
        { field: "seal_numbers", description: "Container seal numbers", regulation: "CBP AMS requirement" },
        { field: "total_packages", description: "Total number of packages/cartons", regulation: "19 CFR 4.7(b)(9)" },
        { field: "gross_weight_kg", description: "Total gross weight", regulation: "19 CFR 4.7(b)(9)" },
      ],
    },
    {
      documentType: "isf_filing",
      regulationSummary: "19 CFR Part 149 — Importer Security Filing (ISF 10+2). Must be filed 24 hours before vessel departure from last foreign port. Penalty: $5,000 per violation, up to $10,000 per shipment.",
      requiredFields: [
        { field: "importer_of_record", description: "IRS/EIN or CBP-assigned number of the importer of record", regulation: "19 CFR 149.2(b)(9)" },
        { field: "consignee", description: "IRS/EIN or CBP-assigned number of the consignee", regulation: "19 CFR 149.2(b)(10)" },
        { field: "manufacturer_name", description: "Name and address of manufacturer or supplier", regulation: "19 CFR 149.2(b)(1)" },
        { field: "seller_name", description: "Name and address of seller (party from whom goods are purchased)", regulation: "19 CFR 149.2(b)(2)" },
        { field: "country_of_origin", description: "Country of origin of the goods", regulation: "19 CFR 149.2(b)(5)" },
        { field: "hts_codes", description: "Commodity HTS number at 6-digit level", regulation: "19 CFR 149.2(b)(4)" },
        { field: "container_numbers", description: "Container stuffing location and container numbers", regulation: "19 CFR 149.2(b)(7)(8) — carrier elements" },
      ],
    },
    {
      documentType: "packing_list",
      regulationSummary: "Not required by regulation but strongly recommended and expected by CBP at exam. Must be consistent with invoice and BOL.",
      requiredFields: [
        { field: "total_cartons", description: "Total number of cartons/packages", regulation: "CBP exam best practice" },
        { field: "total_gross_weight_kg", description: "Total gross weight in KG", regulation: "CBP exam best practice" },
        { field: "line_items", description: "Itemized list matching invoice line items with quantities, weights, and dimensions", regulation: "CBP exam best practice" },
      ],
    },
    {
      documentType: "certificate_of_origin",
      regulationSummary: "Certificate certifying the country of origin for all goods in the shipment. Required for duty preference claims and COO marking compliance under 19 CFR 134.",
      requiredFields: [
        { field: "country_of_origin", description: "Country of origin per item — must be accurate for duty classification", regulation: "19 CFR 134.11" },
        { field: "hts_codes", description: "HTS codes per item — must match invoice and ISF", regulation: "CBP classification requirement" },
        { field: "total_quantity", description: "Total quantity of goods", regulation: "Certificate accuracy" },
        { field: "exporter_name", description: "Name of exporter/manufacturer", regulation: "Certificate accuracy" },
        { field: "importer_name", description: "Name of importer", regulation: "Certificate accuracy" },
      ],
    },
    {
      documentType: "customs_bond",
      regulationSummary: "19 U.S.C. 1623 — Customs bond required for formal entries. Single-entry bond must equal or exceed total entered value. Insufficient bond = entry rejection.",
      requiredFields: [
        { field: "bond_amount_usd", description: "Bond face amount in USD", regulation: "19 U.S.C. 1623 — bond must be sufficient to cover duties, taxes, and fees" },
        { field: "bond_type", description: "Single entry or continuous", regulation: "19 CFR 113.11" },
        { field: "importer_name", description: "Principal (importer of record)", regulation: "19 CFR 113.11" },
        { field: "surety_company", description: "CBP-approved surety issuer", regulation: "19 CFR 113.12" },
        { field: "port_of_entry", description: "Port where bond is filed", regulation: "19 CFR 113.13" },
      ],
    },
    {
      documentType: "arrival_notice",
      regulationSummary: "Carrier-issued notice of vessel arrival. Contains critical deadlines for ISF filing, formal entry, last free day, and demurrage/detention charges.",
      requiredFields: [
        { field: "vessel_name", description: "Carrying vessel name", regulation: "Carrier notification" },
        { field: "eta_date", description: "Estimated time of arrival at US port", regulation: "Carrier notification" },
        { field: "last_free_day", description: "Last free day before demurrage/detention charges begin", regulation: "Terminal/carrier schedule" },
        { field: "container_numbers", description: "Container identification numbers", regulation: "Carrier notification" },
        { field: "bl_number", description: "Bill of lading reference", regulation: "Carrier notification" },
      ],
    },
  ],

  feeSchedule: {
    mpf_rate: 0.003464,
    mpf_min_usd: 27.75,
    mpf_max_usd: 538.40,
    hmf_rate: 0.00125,
    notes: [
      "MPF (Merchandise Processing Fee): 0.3464% of declared value, min $27.75, max $538.40 per entry (19 CFR 24.23)",
      "HMF (Harbor Maintenance Fee): 0.125% of declared value — ocean imports only (26 USC 4461)",
      "Both fees collected on CBP Form 7501 at time of entry",
      "MPF exempt for USMCA-qualifying goods from Canada/Mexico",
      "HMF applies to all ocean imports regardless of FTA status",
    ],
  },

  entryNotes: [
    "Formal entry required for shipments exceeding $800 de minimis threshold (19 USC 1321). De minimis exclusion for China-origin goods eliminated effective August 2025.",
    "ISF 10+2 must be filed 24 hours before vessel departure from last foreign port (19 CFR 149.4). $5,000 penalty per violation.",
    "Entry must be filed within 15 calendar days of arrival at US port (19 CFR 141.68).",
    "Continuous bond recommended for importers exceeding $50,000/year in duties, taxes, and fees.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// AIR IMPORT (stub — expand as needed)
// ═══════════════════════════════════════════════════════════════════════════════

export const AIR_IMPORT_RULES: ModeComplianceRules = {
  mode: "air",
  displayName: "Air Import",

  documentPairs: [
    {
      documentA: "commercial_invoice",
      documentB: "air_waybill",
      fields: [
        {
          fieldA: "seller_name",
          fieldB: "shipper",
          severity: "critical",
          tolerance: "Must refer to the same legal entity. Abbreviations acceptable.",
          regulation: "19 CFR 141.86(a)(1)",
        },
        {
          fieldA: "buyer_name",
          fieldB: "consignee",
          severity: "critical",
          tolerance: "Must refer to the same legal entity.",
          regulation: "19 CFR 141.86(a)(2)",
        },
        {
          fieldA: "total_cartons",
          fieldB: "total_packages",
          severity: "high",
          tolerance: "Must match exactly.",
          regulation: "19 CFR 141.86(e)",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "gross_weight_kg",
          severity: "medium",
          tolerance: "Flag only if difference exceeds 5%.",
          regulation: "CBP standard practice",
        },
      ],
      explicitSkipFields: ["declared_value_usd", "freight_charges", "payment_terms"],
    },
  ],

  documentSpecs: [
    {
      documentType: "commercial_invoice",
      regulationSummary: "19 CFR 141.86 — same requirements as ocean import",
      requiredFields: OCEAN_IMPORT_RULES.documentSpecs.find(d => d.documentType === "commercial_invoice")!.requiredFields,
    },
    {
      documentType: "air_waybill",
      regulationSummary: "IATA and CBP air cargo manifest requirements. Air entry must be filed within 15 calendar days of arrival (19 CFR 141.68).",
      requiredFields: [
        { field: "shipper", description: "Name and address of shipper", regulation: "IATA AWB standard" },
        { field: "consignee", description: "Name and address of consignee", regulation: "IATA AWB standard" },
        { field: "origin_airport", description: "Airport of departure", regulation: "CBP air manifest" },
        { field: "destination_airport", description: "Airport of destination", regulation: "CBP air manifest" },
        { field: "total_pieces", description: "Total number of pieces", regulation: "CBP air manifest" },
        { field: "gross_weight_kg", description: "Gross weight", regulation: "IATA AWB standard" },
        { field: "goods_description", description: "Description of goods", regulation: "19 CFR 141.86(b)" },
      ],
    },
  ],

  feeSchedule: {
    mpf_rate: 0.003464,
    mpf_min_usd: 27.75,
    mpf_max_usd: 538.40,
    hmf_rate: null,
    notes: [
      "MPF applies to air imports: 0.3464% of declared value, min $27.75, max $538.40",
      "HMF does NOT apply to air imports — ocean-only fee",
      "No ISF requirement for air shipments",
      "Entry must be filed within 15 calendar days of arrival (19 CFR 141.68)",
    ],
  },

  entryNotes: [
    "No ISF requirement for air imports.",
    "No Harbor Maintenance Fee (HMF) for air imports.",
    "Entry due within 15 calendar days of arrival.",
    "Informal entry available for shipments $800–$2,500 with CBP Form 7501.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAND IMPORT — CANADA (stub)
// ═══════════════════════════════════════════════════════════════════════════════

export const LAND_CANADA_RULES: ModeComplianceRules = {
  mode: "land_canada",
  displayName: "Land Import — Canada",

  documentPairs: [
    {
      documentA: "commercial_invoice",
      documentB: "usmca_certification",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required for USMCA duty preference claim.",
          regulation: "USMCA Article 5 — certification must match invoice COO",
        },
        {
          fieldA: "buyer_name",
          fieldB: "importer",
          severity: "high",
          tolerance: "Must refer to the same entity. Abbreviations acceptable.",
          regulation: "USMCA Article 5.2(b)",
        },
      ],
      explicitSkipFields: ["declared_value_usd", "payment_terms", "bank_details"],
    },
  ],

  documentSpecs: [
    {
      documentType: "commercial_invoice",
      regulationSummary: "19 CFR 141.86 — same requirements as ocean import",
      requiredFields: OCEAN_IMPORT_RULES.documentSpecs.find(d => d.documentType === "commercial_invoice")!.requiredFields,
    },
    {
      documentType: "usmca_certification",
      regulationSummary: "USMCA Article 5 — certification of origin. Required to claim preferential tariff treatment for qualifying Canadian-origin goods.",
      requiredFields: [
        { field: "certifying_party", description: "Exporter, producer, or importer certifying origin", regulation: "USMCA Annex 5-A" },
        { field: "country_of_origin", description: "Country of origin of certified goods", regulation: "USMCA Article 5" },
        { field: "expiry_date", description: "Blanket period end date (if blanket certification)", regulation: "USMCA Article 5.2(f)" },
        { field: "hts_codes_covered", description: "HTS codes covered by this certification", regulation: "USMCA Annex 5-A" },
      ],
    },
  ],

  feeSchedule: {
    mpf_rate: 0.003464,
    mpf_min_usd: 27.75,
    mpf_max_usd: 538.40,
    hmf_rate: null,
    notes: [
      "MPF exempt for USMCA-qualifying goods from Canada (19 CFR 24.23(c)(1)(iv))",
      "HMF does NOT apply to land imports",
      "Canada IEEPA tariff: 25% on non-USMCA qualifying goods, effective March 4 2025 — reduced to 25% on most goods, 0% on USMCA qualifying goods",
      "Electronics and tech components from Canada subject to additional scrutiny for USMCA content requirements",
    ],
  },

  entryNotes: [
    "USMCA certificate or certification of origin required to claim duty preference for Canadian goods.",
    "Canada IEEPA: 25% tariff on non-USMCA qualifying goods effective March 4 2025. Goods meeting USMCA rules of origin are exempt.",
    "PARS (Pre-Arrival Review System) filing required for truck entries into the US from Canada.",
    "ACI eManifest required for carriers entering the US from Canada.",
    "No ISF, No HMF for land entries.",
    "MPF exempt for USMCA-qualifying imports from Canada.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAND IMPORT — MEXICO (stub)
// ═══════════════════════════════════════════════════════════════════════════════

export const LAND_MEXICO_RULES: ModeComplianceRules = {
  mode: "land_mexico",
  displayName: "Land Import — Mexico",

  documentPairs: [
    {
      documentA: "commercial_invoice",
      documentB: "usmca_certification",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required for USMCA duty preference claim.",
          regulation: "USMCA Article 5",
        },
      ],
      explicitSkipFields: ["declared_value_usd", "payment_terms", "bank_details"],
    },
  ],

  documentSpecs: [
    {
      documentType: "commercial_invoice",
      regulationSummary: "19 CFR 141.86 — same requirements as ocean import",
      requiredFields: OCEAN_IMPORT_RULES.documentSpecs.find(d => d.documentType === "commercial_invoice")!.requiredFields,
    },
    {
      documentType: "usmca_certification",
      regulationSummary: "USMCA Article 5 — certification of origin for Mexican goods.",
      requiredFields: LAND_CANADA_RULES.documentSpecs.find(d => d.documentType === "usmca_certification")!.requiredFields,
    },
  ],

  feeSchedule: {
    mpf_rate: 0.003464,
    mpf_min_usd: 27.75,
    mpf_max_usd: 538.40,
    hmf_rate: null,
    notes: [
      "MPF exempt for USMCA-qualifying goods from Mexico",
      "HMF does NOT apply to land imports",
      "Mexico IEEPA tariff: 25% on non-USMCA qualifying goods effective March 4 2025",
      "Automotive parts from Mexico subject to specific USMCA regional value content requirements",
    ],
  },

  entryNotes: [
    "USMCA certificate or certification of origin required for duty preference on Mexican goods.",
    "Mexico IEEPA: 25% tariff on non-USMCA qualifying goods effective March 4 2025. USMCA-qualifying goods are exempt.",
    "PAPS (Pre-Arrival Processing System) filing required for truck entries from Mexico.",
    "Pedimento required from Mexican side for all commercial exports to the US.",
    "No ISF, No HMF for land entries.",
    "MPF exempt for USMCA-qualifying imports from Mexico.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2025 TARIFF & COMPLIANCE ALERTS
// Applied dynamically based on shipment's country_of_origin and commodity
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPLIANCE_ALERTS_2025: ComplianceAlert[] = [
  {
    id: "china_ieepa_125",
    severity: "critical",
    condition: "country_of_origin is China (CN) or the People's Republic of China",
    message: "125% IEEPA tariff applies to Chinese-origin goods as of April 9 2025 (Executive Order). Combined with existing Section 301 duties (7.5%–25%) and 20% IEEPA fentanyl tariff, total additional tariffs may reach 145%+ depending on HTS classification. Formal entry required regardless of value. Verify all origin documentation. First Sale valuation may apply if applicable.",
    regulation: "IEEPA Executive Order April 9 2025; Section 301 Trade Act of 1974; 19 USC 1304 (origin marking)",
    effectiveDate: "2025-04-09",
  },
  {
    id: "china_de_minimis_eliminated",
    severity: "critical",
    condition: "country_of_origin is China (CN) and shipment value is under $800",
    message: "De minimis exemption eliminated for Chinese-origin goods effective May 2 2025. Formal entry and duty payment required for ALL China-origin shipments regardless of value. Previously $800 threshold no longer applies.",
    regulation: "Presidential Proclamation May 2 2025 eliminating 19 USC 1321 de minimis for IEEPA-subject goods",
    effectiveDate: "2025-05-02",
  },
  {
    id: "hong_kong_ieepa",
    severity: "critical",
    condition: "country_of_origin is Hong Kong (HK)",
    message: "Hong Kong-origin goods are treated the same as Chinese-origin goods under IEEPA. 125% tariff applies. CBP is scrutinizing Hong Kong origin claims — documentary evidence of manufacturing in HK (not transshipment from mainland China) is required.",
    regulation: "Executive Order on Hong Kong Normalization; IEEPA 2025",
    effectiveDate: "2025-04-09",
  },
  {
    id: "vietnam_transshipment",
    severity: "high",
    condition: "country_of_origin is Vietnam (VN) AND goods description includes electronics, semiconductors, tech components, circuit boards, displays, batteries, solar panels, or similar technology goods",
    message: "CBP is actively investigating Vietnam transshipment of Chinese-origin goods. Origin certificates from Vietnamese manufacturers are required. If goods contain Chinese-manufactured components exceeding de minimis thresholds, substantial transformation analysis is needed. Failure to comply may result in seizure and 125% IEEPA tariff assessment retroactively.",
    regulation: "CBP CSMS #59564286 — Vietnam transshipment enforcement; 19 CFR 102 — rules of origin for IEEPA",
    effectiveDate: "2025-01-01",
  },
  {
    id: "de_minimis_formal_entry",
    severity: "high",
    condition: "shipment declared_value is greater than $800",
    message: "Formal entry required. De minimis informal entry threshold is $800 (19 USC 1321). All shipments over $800 require CBP Form 7501, payment of duties, MPF, and HMF (if ocean). Ensure continuous bond is in place or single-entry bond is obtained.",
    regulation: "19 USC 1321(a)(2)(C) — de minimis; 19 CFR 141.68 — entry filing requirements",
    effectiveDate: "2016-02-24",
  },
  {
    id: "canada_ieepa_25",
    severity: "high",
    condition: "country_of_origin is Canada (CA) and goods do not qualify for USMCA",
    message: "25% IEEPA tariff applies to non-USMCA-qualifying Canadian goods effective March 4 2025. Energy and energy resources subject to 10% rate. Goods meeting USMCA rules of origin are exempt. Verify USMCA certification covers all line items.",
    regulation: "IEEPA Proclamation March 4 2025 — Canada tariffs",
    effectiveDate: "2025-03-04",
  },
  {
    id: "mexico_ieepa_25",
    severity: "high",
    condition: "country_of_origin is Mexico (MX) and goods do not qualify for USMCA",
    message: "25% IEEPA tariff applies to non-USMCA-qualifying Mexican goods effective March 4 2025. Fentanyl-related tariffs may also apply. USMCA-qualifying goods are exempt. Verify USMCA certification is current and covers all line items.",
    regulation: "IEEPA Proclamation March 4 2025 — Mexico tariffs",
    effectiveDate: "2025-03-04",
  },
  {
    id: "steel_aluminum_232",
    severity: "high",
    condition: "goods description includes steel, aluminum, or metal mill products",
    message: "Section 232 tariffs apply: 25% on steel and 10% (recently increased to 25%) on aluminum imports from most countries. Verify HTS classification under Chapter 72-76. If origin is exempt country (Canada, Mexico under product exclusion), confirm product exclusion is current.",
    regulation: "Section 232 Trade Expansion Act of 1962; Presidential Proclamations 9704, 9705",
    effectiveDate: "2018-03-23",
  },
  {
    id: "fentanyl_tariff_20",
    severity: "high",
    condition: "country_of_origin is China and goods may be used in pharmaceutical or chemical manufacturing",
    message: "20% IEEPA fentanyl tariff applies on top of Section 301 and 125% IEEPA tariffs. This tariff is applied to all Chinese-origin goods absent specific exemption. Total tariff burden must be accurately declared.",
    regulation: "Executive Order February 2025 — IEEPA fentanyl tariff",
    effectiveDate: "2025-02-04",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function getRulesForMode(mode: string): ModeComplianceRules {
  const normalized = (mode || "ocean").toLowerCase().replace(/[^a-z_]/g, "");
  if (normalized.includes("air")) return AIR_IMPORT_RULES;
  if (normalized.includes("canada")) return LAND_CANADA_RULES;
  if (normalized.includes("mexico") || normalized.includes("land_mexico")) return LAND_MEXICO_RULES;
  if (normalized.includes("land")) return LAND_CANADA_RULES;  // default land to Canada rules
  return OCEAN_IMPORT_RULES;  // default
}

/**
 * Returns all 2025 compliance alerts relevant to a given shipment.
 * Pass country_of_origin (ISO-2 or full name) and a goods description.
 */
export function getApplicableAlerts(
  countryOfOrigin: string,
  goodsDescription: string,
  declaredValueUsd: number,
): ComplianceAlert[] {
  const origin = (countryOfOrigin || "").toLowerCase();
  const goods = (goodsDescription || "").toLowerCase();
  const alerts: ComplianceAlert[] = [];

  const isChina = origin.includes("china") || origin === "cn" || origin.includes("people's republic");
  const isHongKong = origin.includes("hong kong") || origin === "hk";
  const isVietnam = origin.includes("vietnam") || origin === "vn";
  const isCanada = origin.includes("canada") || origin === "ca";
  const isMexico = origin.includes("mexico") || origin === "mx";

  const isTech = /electronics|semiconductor|tech|circuit|pcb|display|battery|batteries|solar|chip|processor|module|component/.test(goods);
  const isSteelAluminum = /steel|alumin|metal mill|coil|sheet|plate|bar|rod|tube|pipe/.test(goods);
  const isPharmChem = /pharmaceutical|chemical|precursor|fentanyl|pill|powder|lab/.test(goods);

  if (isChina) {
    alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "china_ieepa_125")!);
    if (declaredValueUsd < 800) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "china_de_minimis_eliminated")!);
    if (isPharmChem) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "fentanyl_tariff_20")!);
  }
  if (isHongKong) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "hong_kong_ieepa")!);
  if (isVietnam && isTech) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "vietnam_transshipment")!);
  if (isCanada) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "canada_ieepa_25")!);
  if (isMexico) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "mexico_ieepa_25")!);
  if (isSteelAluminum) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "steel_aluminum_232")!);
  if (declaredValueUsd > 800) alerts.push(COMPLIANCE_ALERTS_2025.find(a => a.id === "de_minimis_formal_entry")!);

  return alerts.filter(Boolean);
}

/**
 * Converts a DocumentPairRule into the check instruction string format
 * expected by the workspace-crossref AI prompt.
 */
export function buildCheckInstructions(pairs: DocumentPairRule[], presentDocTypes: string[]): string {
  return pairs
    .filter(p => presentDocTypes.includes(p.documentA) && presentDocTypes.includes(p.documentB))
    .map(pair => {
      const fieldList = pair.fields.map(f =>
        `  - ${f.fieldA}${f.fieldA !== f.fieldB ? ` (= ${f.fieldB} in the other doc)` : ""} | severity: ${f.severity} | rule: ${f.tolerance} | ref: ${f.regulation}`
      ).join("\n");
      const skipList = pair.explicitSkipFields.length > 0
        ? `\n  SKIP THESE FIELDS ENTIRELY: ${pair.explicitSkipFields.join(", ")}`
        : "";
      return `${pair.documentA.replace(/_/g, " ").toUpperCase()} vs ${pair.documentB.replace(/_/g, " ").toUpperCase()}:\n${fieldList}${skipList}`;
    })
    .join("\n\n");
}
