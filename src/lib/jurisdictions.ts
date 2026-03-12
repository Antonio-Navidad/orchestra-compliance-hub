// ===== Global Expected-Loss Engine =====
// Expected Loss = (P_hold × Hold Cost) + (P_penalty × Penalty) + (P_legal × Legal) + (P_rework × Rework)

export interface JurisdictionAdapter {
  code: string;
  name: string;
  currency: string;
  holdDailyRate: number;
  storageDailyRate: number;
  avgPenaltyPercent: number;
  legalEscalationCost: number;
  reworkCost: number;
  notes: string;
}

// ===== EU Core Adapter =====
export interface EUCoreFields {
  region: string;
  member_state?: string;
  flow_type: string;
  mode: string;
  ucc_procedure_type: string;
  declaration_type: string;
  customs_status: string;
  importer_role: string;
  exporter_role: string;
  representative_type: string;
  economic_operator_identifiers: string[];
  commodity_code_system: string;
  origin_type: string;
  incoterm: string;
  customs_value_method: string;
  duty_estimation_model: string;
  document_completeness_score: number;
  document_consistency_score: number;
  hs_confidence_score: number;
  valuation_risk_score: number;
  origin_risk_score: number;
  license_risk_score: number;
  sanctions_risk_score: number;
  overall_hold_probability: number;
  overall_expected_delay_days: number;
  expected_loss_model_version: string;
  requires_invoice: boolean;
  requires_packing_list: boolean;
  requires_transport_doc: boolean;
  requires_origin_supporting_doc_if_claimed: boolean;
  requires_dual_use_check: boolean;
  requires_ens_security_data: boolean;
  ics2_applicable: boolean;
  ioss_low_value_possible: boolean;
  vat_special_scheme_possible: boolean;
}

// ===== Member State Overlay =====
export interface MemberStateOverlay {
  code: string;
  name: string;
  member_state_penalty_model: string;
  penalty_severity_multiplier: number;
  penalty_type_options: string[];
  settlement_likelihood_factor: number;
  confiscation_or_additional_sanction_flag: boolean;
  member_state_enforcement_intensity_score: number;
  customs_authority_name: string;
  dual_use_competent_authority: string;
  national_control_measures_present: boolean;
  escalation_contact_path: string;
  local_broker_representation_norms: string;
  member_state_hold_risk_multiplier: number;
  port_airport_border_risk_profile: string;
  local_clearance_time_baseline: number;
  local_document_nuance_flags: string[];
  local_vat_import_handling_profile: string;
  language_or_formatting_nuance_flags: string[];
  inspection_probability_modifier: number;
  post_entry_amendment_tolerance_profile: string;
  delay_cost_profile_by_member_state: number;
  broker_performance_weight_by_member_state: number;
  local_sla_baseline: number;
  country_specific_confidence_adjustment: number;
}

// EU Core default values
export const euCoreDefaults: EUCoreFields = {
  region: "EU",
  flow_type: "import",
  mode: "sea",
  ucc_procedure_type: "standard",
  declaration_type: "H1",
  customs_status: "T1",
  importer_role: "declarant",
  exporter_role: "exporter",
  representative_type: "direct",
  economic_operator_identifiers: ["EORI"],
  commodity_code_system: "CN8",
  origin_type: "non-preferential",
  incoterm: "CIF",
  customs_value_method: "transaction_value",
  duty_estimation_model: "standard_tariff",
  document_completeness_score: 100,
  document_consistency_score: 100,
  hs_confidence_score: 100,
  valuation_risk_score: 0,
  origin_risk_score: 0,
  license_risk_score: 0,
  sanctions_risk_score: 0,
  overall_hold_probability: 0,
  overall_expected_delay_days: 0,
  expected_loss_model_version: "2.0",
  requires_invoice: true,
  requires_packing_list: true,
  requires_transport_doc: true,
  requires_origin_supporting_doc_if_claimed: true,
  requires_dual_use_check: true,
  requires_ens_security_data: true,
  ics2_applicable: true,
  ioss_low_value_possible: false,
  vat_special_scheme_possible: false,
};

// Member State overlays
export const memberStateOverlays: Record<string, MemberStateOverlay> = {
  ES: {
    code: "ES",
    name: "Spain",
    member_state_penalty_model: "graduated_fine",
    penalty_severity_multiplier: 1.1,
    penalty_type_options: ["administrative_fine", "surcharge", "seizure"],
    settlement_likelihood_factor: 0.65,
    confiscation_or_additional_sanction_flag: false,
    member_state_enforcement_intensity_score: 72,
    customs_authority_name: "Agencia Tributaria (AEAT)",
    dual_use_competent_authority: "Secretaría de Estado de Comercio",
    national_control_measures_present: true,
    escalation_contact_path: "AEAT → Subdirección de Aduanas",
    local_broker_representation_norms: "Licensed customs agent (agente de aduanas) required",
    member_state_hold_risk_multiplier: 1.05,
    port_airport_border_risk_profile: "High volume: Barcelona, Valencia, Algeciras",
    local_clearance_time_baseline: 2.5,
    local_document_nuance_flags: ["DUA form required", "Spanish translations preferred"],
    local_vat_import_handling_profile: "Standard 21% VAT on import, reduced for some goods",
    language_or_formatting_nuance_flags: ["Spanish", "Catalan in Catalonia"],
    inspection_probability_modifier: 1.0,
    post_entry_amendment_tolerance_profile: "Moderate — amendment within 30 days",
    delay_cost_profile_by_member_state: 2000,
    broker_performance_weight_by_member_state: 1.0,
    local_sla_baseline: 48,
    country_specific_confidence_adjustment: 0,
  },
  FR: {
    code: "FR",
    name: "France",
    member_state_penalty_model: "graduated_fine",
    penalty_severity_multiplier: 1.2,
    penalty_type_options: ["administrative_fine", "criminal_prosecution", "seizure"],
    settlement_likelihood_factor: 0.55,
    confiscation_or_additional_sanction_flag: true,
    member_state_enforcement_intensity_score: 80,
    customs_authority_name: "Direction Générale des Douanes et Droits Indirects (DGDDI)",
    dual_use_competent_authority: "Service des Biens à Double Usage (SBDU)",
    national_control_measures_present: true,
    escalation_contact_path: "DGDDI → Bureau de la politique tarifaire",
    local_broker_representation_norms: "Commissionnaire en douane agréé",
    member_state_hold_risk_multiplier: 1.15,
    port_airport_border_risk_profile: "High volume: Le Havre, Marseille, CDG Airport",
    local_clearance_time_baseline: 2.0,
    local_document_nuance_flags: ["French language preferred", "DELTA system"],
    local_vat_import_handling_profile: "Standard 20% TVA, autoliquidation available for AEO",
    language_or_formatting_nuance_flags: ["French mandatory for official docs"],
    inspection_probability_modifier: 1.1,
    post_entry_amendment_tolerance_profile: "Strict — corrections must be justified",
    delay_cost_profile_by_member_state: 2400,
    broker_performance_weight_by_member_state: 1.1,
    local_sla_baseline: 36,
    country_specific_confidence_adjustment: -2,
  },
  IT: {
    code: "IT",
    name: "Italy",
    member_state_penalty_model: "proportional_fine",
    penalty_severity_multiplier: 1.0,
    penalty_type_options: ["administrative_fine", "surcharge", "temporary_suspension"],
    settlement_likelihood_factor: 0.70,
    confiscation_or_additional_sanction_flag: false,
    member_state_enforcement_intensity_score: 68,
    customs_authority_name: "Agenzia delle Dogane e dei Monopoli (ADM)",
    dual_use_competent_authority: "Ministero degli Affari Esteri",
    national_control_measures_present: true,
    escalation_contact_path: "ADM → Direzione Regionale",
    local_broker_representation_norms: "Spedizioniere doganale required",
    member_state_hold_risk_multiplier: 1.0,
    port_airport_border_risk_profile: "High volume: Genoa, La Spezia, Trieste",
    local_clearance_time_baseline: 3.0,
    local_document_nuance_flags: ["Italian preferred", "AIDA system"],
    local_vat_import_handling_profile: "Standard 22% IVA, reverse charge for certain goods",
    language_or_formatting_nuance_flags: ["Italian"],
    inspection_probability_modifier: 0.95,
    post_entry_amendment_tolerance_profile: "Moderate — corrections allowed within 60 days",
    delay_cost_profile_by_member_state: 1800,
    broker_performance_weight_by_member_state: 0.95,
    local_sla_baseline: 48,
    country_specific_confidence_adjustment: 0,
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    member_state_penalty_model: "flat_and_graduated",
    penalty_severity_multiplier: 0.9,
    penalty_type_options: ["administrative_fine", "additional_assessment"],
    settlement_likelihood_factor: 0.75,
    confiscation_or_additional_sanction_flag: false,
    member_state_enforcement_intensity_score: 85,
    customs_authority_name: "Douane Nederland",
    dual_use_competent_authority: "Centraal Dienst In- en Uitvoer (CDIU)",
    national_control_measures_present: true,
    escalation_contact_path: "Douane NL → Douanekantoor Rotterdam",
    local_broker_representation_norms: "AEO-certified forwarder preferred",
    member_state_hold_risk_multiplier: 0.85,
    port_airport_border_risk_profile: "Highest EU volume: Rotterdam, Schiphol",
    local_clearance_time_baseline: 1.5,
    local_document_nuance_flags: ["English widely accepted", "AGS system"],
    local_vat_import_handling_profile: "Standard 21% BTW, Article 23 deferment common",
    language_or_formatting_nuance_flags: ["Dutch", "English accepted"],
    inspection_probability_modifier: 0.9,
    post_entry_amendment_tolerance_profile: "Flexible — self-correction encouraged for AEO",
    delay_cost_profile_by_member_state: 2600,
    broker_performance_weight_by_member_state: 1.15,
    local_sla_baseline: 24,
    country_specific_confidence_adjustment: 3,
  },
};

// Base jurisdiction adapters
export const jurisdictionAdapters: Record<string, JurisdictionAdapter> = {
  US: {
    code: "US", name: "United States", currency: "USD",
    holdDailyRate: 2500, storageDailyRate: 350, avgPenaltyPercent: 4,
    legalEscalationCost: 25000, reworkCost: 5000,
    notes: "CBP penalties under 19 USC 1592. Liquidated damages common for bonds.",
  },
  MX: {
    code: "MX", name: "Mexico", currency: "USD",
    holdDailyRate: 1800, storageDailyRate: 200, avgPenaltyPercent: 5,
    legalEscalationCost: 15000, reworkCost: 3500,
    notes: "SAT/Aduana fines. IMMEX program compliance critical. USMCA origin verification.",
  },
  EU: {
    code: "EU", name: "European Union", currency: "EUR",
    holdDailyRate: 2200, storageDailyRate: 300, avgPenaltyPercent: 3.5,
    legalEscalationCost: 20000, reworkCost: 4500,
    notes: "UCC (Union Customs Code). CBAM carbon border tariffs effective 2026. AEO benefits.",
  },
  CO: {
    code: "CO", name: "Colombia", currency: "USD",
    holdDailyRate: 1200, storageDailyRate: 150, avgPenaltyPercent: 6,
    legalEscalationCost: 10000, reworkCost: 2500,
    notes: "DIAN enforcement. Anti-dumping duties on steel/textiles. FTA compliance with US/EU.",
  },
  BR: {
    code: "BR", name: "Brazil", currency: "USD",
    holdDailyRate: 1500, storageDailyRate: 250, avgPenaltyPercent: 7,
    legalEscalationCost: 18000, reworkCost: 4000,
    notes: "Receita Federal. Complex ICMS/IPI tax structure. Strict Siscomex documentation.",
  },
  PA: {
    code: "PA", name: "Panama", currency: "USD",
    holdDailyRate: 1000, storageDailyRate: 180, avgPenaltyPercent: 4.5,
    legalEscalationCost: 12000, reworkCost: 2800,
    notes: "Colon Free Zone rules. ANA customs authority. Panama Canal transit documentation. TPA with US.",
  },
};

// Get adapter with Member State overlay applied
export function getEffectiveAdapter(
  jurisdictionCode: string,
  memberState?: string
): JurisdictionAdapter & { appliedOverlay?: MemberStateOverlay; logicLabel: string } {
  const base = jurisdictionAdapters[jurisdictionCode] || jurisdictionAdapters.US;

  if (jurisdictionCode === "EU" && memberState && memberStateOverlays[memberState]) {
    const overlay = memberStateOverlays[memberState];
    return {
      ...base,
      name: `${overlay.name} (EU)`,
      holdDailyRate: Math.round(base.holdDailyRate * overlay.member_state_hold_risk_multiplier),
      avgPenaltyPercent: +(base.avgPenaltyPercent * overlay.penalty_severity_multiplier).toFixed(1),
      legalEscalationCost: Math.round(base.legalEscalationCost * overlay.penalty_severity_multiplier),
      storageDailyRate: Math.round(overlay.delay_cost_profile_by_member_state || base.storageDailyRate),
      appliedOverlay: overlay,
      logicLabel: `EU Base + ${overlay.name} Overlay`,
    };
  }

  return {
    ...base,
    logicLabel: jurisdictionCode === "EU" ? "EU Generalized Logic" : base.name,
  };
}

export interface ExposureCalculation {
  holdProbability: number;
  penaltyProbability: number;
  legalEscalationProbability: number;
  reworkProbability: number;
  expectedDelayDays: number;
  holdCost: number;
  penaltyCost: number;
  legalCost: number;
  reworkCost: number;
  totalExpectedLoss: number;
  avoidedExposure: number;
  logicLabel: string;
}

export function calculateExposure(
  riskScore: number,
  declaredValue: number,
  jurisdictionCode: string,
  memberState?: string
): ExposureCalculation {
  const effective = getEffectiveAdapter(jurisdictionCode, memberState);

  const holdProbability = Math.min(riskScore / 100, 1);
  const penaltyProbability = Math.min((riskScore - 20) / 100, 1) * (riskScore > 20 ? 1 : 0);
  const legalEscalationProbability = Math.min((riskScore - 60) / 100, 1) * (riskScore > 60 ? 1 : 0);
  const reworkProbability = Math.min(riskScore / 80, 1);
  const expectedDelayDays = Math.round(riskScore * 0.15);

  const holdCost = holdProbability * (expectedDelayDays * (effective.holdDailyRate + effective.storageDailyRate));
  const penaltyCost = penaltyProbability * (declaredValue * effective.avgPenaltyPercent / 100);
  const legalCost = legalEscalationProbability * effective.legalEscalationCost;
  const reworkCostCalc = reworkProbability * effective.reworkCost;

  const totalExpectedLoss = holdCost + penaltyCost + legalCost + reworkCostCalc;
  const avoidedExposure = totalExpectedLoss * 0.85;

  return {
    holdProbability: Math.round(holdProbability * 100),
    penaltyProbability: Math.round(penaltyProbability * 100),
    legalEscalationProbability: Math.round(legalEscalationProbability * 100),
    reworkProbability: Math.round(reworkProbability * 100),
    expectedDelayDays,
    holdCost: Math.round(holdCost),
    penaltyCost: Math.round(penaltyCost),
    legalCost: Math.round(legalCost),
    reworkCost: Math.round(reworkCostCalc),
    totalExpectedLoss: Math.round(totalExpectedLoss),
    avoidedExposure: Math.round(avoidedExposure),
    logicLabel: effective.logicLabel,
  };
}
