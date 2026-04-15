/**
 * complianceRules.ts
 * US Customs compliance brain for Orchestra Compliance Hub.
 * Scoped to US-Mexico land freight (primary pilot corridor).
 * All rules grounded in CBP regulations current as of 2025.
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
  requiredFields: RequiredFieldRule[] | string[];
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
// LAND IMPORT — MEXICO
// Primary pilot corridor. USMCA + IEEPA + PAPS + Pedimento rules.
// ═══════════════════════════════════════════════════════════════════════════════

export const LAND_MEXICO_RULES: ModeComplianceRules = {
  mode: "land_mexico",
  displayName: "Land Import — Mexico",

  documentPairs: [
    // ── 1. Commercial Invoice vs Packing List ─────────────────────────────────
    {
      documentA: "commercial_invoice",
      documentB: "packing_list",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. Mexico (MX) must appear identically on both documents.",
          regulation: "19 CFR 134 — country of origin marking",
        },
        {
          fieldA: "total_cartons",
          fieldB: "total_cartons",
          severity: "critical",
          tolerance: "Exact match required. Carton count discrepancy triggers CBP exam.",
          regulation: "19 CFR 141.86(c)",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "total_gross_weight_kg",
          severity: "high",
          tolerance: "Within 5% variance allowed. Larger difference = hold for re-weigh.",
          regulation: "19 CFR 141.86(d)",
        },
        {
          fieldA: "total_value",
          fieldB: "total_value",
          severity: "critical",
          tolerance: "Invoice total must match packing list declared value if stated. Discrepancy is undervaluation indicator.",
          regulation: "19 USC 1592 — penalties for fraud/negligence",
        },
        {
          fieldA: "seller_name",
          fieldB: "seller_name",
          severity: "medium",
          tolerance: "Abbreviations acceptable. Different legal entity names are high risk.",
          regulation: "19 CFR 141.86",
        },
        {
          fieldA: "buyer_name",
          fieldB: "buyer_name",
          severity: "medium",
          tolerance: "Abbreviations acceptable. Different legal entity names are high risk.",
          regulation: "19 CFR 141.86",
        },
      ],
      explicitSkipFields: ["payment_terms", "bank_details", "invoice_number", "marks_and_numbers", "packing_list_number", "fta_program"],
    },

    // ── 2. Commercial Invoice vs Truck BoL / PAPS Manifest ──────────────────
    {
      documentA: "commercial_invoice",
      documentB: "truck_bol_carrier_manifest",
      fields: [
        {
          fieldA: "seller_name",
          fieldB: "shipper",
          severity: "high",
          tolerance: "Invoice seller and BoL shipper must refer to same entity. Different names are a CBP red flag.",
          regulation: "19 CFR 141.86",
        },
        {
          fieldA: "buyer_name",
          fieldB: "consignee",
          severity: "critical",
          tolerance: "Invoice buyer and BoL consignee must be identical. Mismatch may indicate diversion or fraud.",
          regulation: "19 CFR 141.86; 19 USC 1592",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "gross_weight_kg",
          severity: "high",
          tolerance: "Within 5% variance. Larger variance triggers hold for re-weigh under 19 CFR 163.",
          regulation: "19 CFR 141.86(d)",
        },
        {
          fieldA: "total_cartons",
          fieldB: "total_packages",
          severity: "critical",
          tolerance: "Exact match required. Package count on BoL vs invoice must agree.",
          regulation: "19 CFR 141.86(c)",
        },
        {
          fieldA: "total_value",
          fieldB: "declared_value_usd",
          severity: "critical",
          tolerance: "Invoice total and BoL declared value must match exactly. CBP assesses duty on invoice value per 19 CFR 152.",
          regulation: "19 CFR 152; 19 USC 1592",
        },
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. Mexico (MX) must appear identically on both.",
          regulation: "19 CFR 134",
        },
      ],
      explicitSkipFields: ["payment_terms", "bank_details", "invoice_number", "bl_number", "paps_number", "seal_numbers", "eta", "etd", "freight_terms"],
    },

    // ── 3. Commercial Invoice vs USMCA Certification of Origin ───────────────
    {
      documentA: "commercial_invoice",
      documentB: "usmca_certification",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. USMCA cert must state Mexico (MX) as origin to qualify for duty-free treatment.",
          regulation: "USMCA Article 5; 19 CFR 182",
        },
        {
          fieldA: "seller_name",
          fieldB: "certifier_name",
          severity: "critical",
          tolerance: "USMCA certifier must be invoice seller, producer, or authorized exporter. Mismatch invalidates USMCA claim.",
          regulation: "USMCA Article 5.2 — who may certify",
        },
        {
          fieldA: "buyer_name",
          fieldB: "importer_name",
          severity: "high",
          tolerance: "USMCA importer must match invoice buyer. Discrepancy may invalidate preferential claim.",
          regulation: "USMCA Annex 5-A",
        },
        {
          fieldA: "line_items[].hts_6digit",
          fieldB: "hts_codes",
          severity: "critical",
          tolerance: "HTS codes on invoice must match USMCA cert exactly. Mismatch = USMCA claim fails = 25% IEEPA tariff exposure.",
          regulation: "USMCA Rules of Origin; 19 USC 1592",
        },
        {
          fieldA: "invoice_date",
          fieldB: "certification_date",
          severity: "high",
          tolerance: "USMCA cert must not be expired (max 12-month validity). Cert must predate or match invoice date.",
          regulation: "USMCA Article 5.2 — blanket period max 12 months",
        },
      ],
      explicitSkipFields: ["payment_terms", "bank_details", "invoice_number", "total_value", "total_cartons", "marks_and_numbers"],
    },

    // ── 4. Packing List vs Truck BoL / PAPS Manifest ────────────────────────
    {
      documentA: "packing_list",
      documentB: "truck_bol_carrier_manifest",
      fields: [
        {
          fieldA: "total_cartons",
          fieldB: "total_packages",
          severity: "critical",
          tolerance: "Exact match required. Physical piece count must agree across all transport documents.",
          regulation: "19 CFR 141.86(c)",
        },
        {
          fieldA: "total_gross_weight_kg",
          fieldB: "gross_weight_kg",
          severity: "high",
          tolerance: "Within 5% variance. Larger variance triggers CBP hold for physical re-weigh.",
          regulation: "19 CFR 141.86(d)",
        },
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required on all transport documents.",
          regulation: "19 CFR 134",
        },
      ],
      explicitSkipFields: ["packing_list_number", "bl_number", "paps_number", "seal_numbers", "marks_and_numbers", "eta", "etd", "freight_terms", "total_net_weight_kg", "total_cbm"],
    },

    // ── 5. USMCA Certification vs Packing List ───────────────────────────────
    {
      documentA: "usmca_certification",
      documentB: "packing_list",
      fields: [
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "USMCA cert and packing list must show identical origin country. Mismatch invalidates duty preference.",
          regulation: "USMCA Article 5; 19 CFR 134",
        },
        {
          fieldA: "description_of_goods",
          fieldB: "line_items[].description",
          severity: "high",
          tolerance: "Goods description must be consistent. Vague USMCA description vs specific packing list = CBP challenge risk.",
          regulation: "USMCA Annex 5-A — minimum data requirements",
        },
      ],
      explicitSkipFields: ["certifier_name", "importer_name", "certification_date", "hts_codes", "total_cartons", "total_gross_weight_kg"],
    },

    // ── 6. Customs Bond vs Commercial Invoice ────────────────────────────────
    {
      documentA: "customs_bond",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "principal_name",
          fieldB: "buyer_name",
          severity: "critical",
          tolerance: "Bond principal must be the importer of record on the invoice. Mismatch = bond cannot cover this entry.",
          regulation: "19 USC 1623; 19 CFR 113",
        },
        {
          fieldA: "bond_amount_usd",
          fieldB: "total_value",
          severity: "critical",
          tolerance: "Single-entry bond must be ≥ total entered value. Continuous bond amount should comfortably exceed entered value × annual frequency.",
          regulation: "19 USC 1623(b) — bond sufficiency",
        },
      ],
      explicitSkipFields: ["surety_company", "bond_number", "expiration_date", "entry_number", "payment_terms", "bank_details"],
    },

    // ── 7. Pedimento vs Commercial Invoice (when available) ──────────────────
    {
      documentA: "pedimento",
      documentB: "commercial_invoice",
      fields: [
        {
          fieldA: "declared_value_usd",
          fieldB: "total_value",
          severity: "critical",
          tolerance: "Pedimento declared value and US invoice value must match. Discrepancy = undervaluation under both Mexican and US customs law.",
          regulation: "19 USC 1592; Ley Aduanera Mexico Art. 64",
        },
        {
          fieldA: "exporter_name",
          fieldB: "seller_name",
          severity: "high",
          tolerance: "Mexican exporter on Pedimento must match invoice seller. Mismatch is a CBP red flag for transshipment.",
          regulation: "19 CFR 141.86; 19 CFR 134",
        },
        {
          fieldA: "hts_mexico",
          fieldB: "line_items[].hts_6digit",
          severity: "high",
          tolerance: "HS code used in Mexico Pedimento should align with US HTS classification at 6-digit level. Divergence may indicate mis-description.",
          regulation: "19 USC 1592 — false statements",
        },
        {
          fieldA: "country_of_origin",
          fieldB: "country_of_origin",
          severity: "critical",
          tolerance: "Exact match required. Both must show Mexico (MX).",
          regulation: "19 CFR 134; USMCA Article 5",
        },
      ],
      explicitSkipFields: ["pedimento_number", "aduana", "regime_code", "payment_method", "invoice_number", "payment_terms"],
    },
  ],

  documentSpecs: [
    {
      documentType: "commercial_invoice",
      regulationSummary: "19 CFR 141.86 — required data elements for formal CBP entry. Must include seller, buyer, description, country of origin, HTS, total value in USD.",
      requiredFields: [
        "seller_name", "seller_address", "buyer_name", "buyer_address",
        "invoice_number", "invoice_date", "currency", "total_value",
        "country_of_origin", "total_cartons", "total_gross_weight_kg",
        "line_items", "incoterms",
      ],
    },
    {
      documentType: "packing_list",
      regulationSummary: "19 CFR 141.86 — must reconcile with invoice carton count, weight, and goods description.",
      requiredFields: [
        "total_cartons", "total_gross_weight_kg", "total_net_weight_kg",
        "country_of_origin", "line_items",
      ],
    },
    {
      documentType: "truck_bol_carrier_manifest",
      regulationSummary: "49 CFR 373 — Truck Bill of Lading. PAPS (Pre-Arrival Processing System) manifest for ACE truck entry from Mexico.",
      requiredFields: [
        "shipper", "consignee", "total_packages", "gross_weight_kg",
        "commodity_description", "declared_value_usd",
      ],
    },
    {
      documentType: "usmca_certification",
      regulationSummary: "USMCA Article 5 / 19 CFR 182 — Certification of Origin required for duty-free treatment on Mexican goods. Valid up to 12 months (blanket cert).",
      requiredFields: [
        "certifier_name", "certifier_role", "importer_name", "producer_name",
        "country_of_origin", "description_of_goods", "hts_codes",
        "certification_date", "blanket_period_start", "blanket_period_end",
      ],
    },
    {
      documentType: "pedimento",
      regulationSummary: "Ley Aduanera Mexico — Mexican customs export declaration. Required for all commercial exports from Mexico. Contains pedimento number, declared value, exporter, and HTS.",
      requiredFields: [
        "pedimento_number", "exporter_name", "declared_value_usd",
        "country_of_origin", "aduana",
      ],
    },
    {
      documentType: "customs_bond",
      regulationSummary: "19 USC 1623 — Single Entry Bond or Continuous Bond required for formal entry. Bond amount must ≥ total entered value for single-entry bonds.",
      requiredFields: [
        "principal_name", "bond_amount_usd", "bond_type",
      ],
    },
  ],

  feeSchedule: {
    mpf_rate: 0.003464,
    mpf_min_usd: 27.75,
    mpf_max_usd: 538.40,
    hmf_rate: null,
    notes: [
      "MPF (Merchandise Processing Fee): 0.3464% of entered value — EXEMPT for USMCA-qualifying Mexican goods",
      "HMF (Harbor Maintenance Fee): NOT applicable to land imports",
      "IEEPA 25% tariff: applies to ALL non-USMCA qualifying Mexican goods effective March 4 2025 (EO 14194)",
      "USMCA-qualifying goods: zero duty + MPF exempt — USMCA cert must be on file",
      "Section 232: 25% steel / 25% aluminum regardless of USMCA status",
      "Automotive: USMCA Regional Value Content ≥75% required for passenger vehicles; ≥70% for parts",
      "De minimis $800 informal entry: no longer available for IEEPA-subject goods as of Aug 29 2025",
    ],
  },

  entryNotes: [
    "USMCA Certificate of Origin REQUIRED for duty-free treatment — file must be on record at time of entry.",
    "IEEPA 25% tariff on ALL non-USMCA qualifying goods from Mexico effective March 4 2025. Verify USMCA cert covers every line item.",
    "PAPS (Pre-Arrival Processing System): carrier must transmit ACE manifest before truck arrives at US port. Late PAPS = CBP hold.",
    "Pedimento (Mexican export declaration) must accompany shipment — CBP cross-references pedimento number on US entry.",
    "NO ISF required for land entries (ISF is ocean-only under 19 CFR 149).",
    "NO HMF for land entries (Harbor Maintenance Fee is port-only).",
    "MPF exempt for USMCA-qualifying imports — ensure USMCA cert is valid and covers shipment date.",
    "Formal entry (CBP 3461/7501) required for shipments valued >$800 (19 USC 1321 de minimis).",
    "Customs bond required: single-entry bond ≥ entered value, or importer must have continuous bond on file.",
    "Section 232 steel/aluminum tariffs apply regardless of USMCA status — no Mexico exemption.",
    "C-TPAT participation reduces exam frequency at Mexico land border — flag if importer is not C-TPAT certified.",
    "FDA Prior Notice required for food, beverages, supplements — file via OASIS/ACE before truck arrival.",
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
    message: "Section 232 tariffs apply: 25% on steel and 25% on aluminum imports from most countries. Verify HTS classification under Chapter 72-76. If origin is exempt country (Canada, Mexico under product exclusion), confirm product exclusion is current.",
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
// LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getRulesForMode(_mode: string): ModeComplianceRules {
  // Mexico land is the only active pilot corridor.
  // All modes route here until additional corridors are built out.
  return LAND_MEXICO_RULES;
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
