/**
 * Mode-specific document phase definitions.
 * Each shipment mode generates a distinct set of phases and document cards.
 */
import type { ShipmentModeId } from './shipmentModes';

export interface PhaseDefinition {
  key: string;
  label: string;
  docIds: string[];
}

export interface DocDef {
  name: string;
  phase: string;
  conditional?: boolean;
  autoCalc?: boolean;
  commodityTriggers?: string[];
  /** Override the default status line text */
  statusOverride?: string;
  /** Informational note shown instead of upload */
  infoNote?: string;
}

/** Generate the subtitle for the score banner based on mode */
export function getModeSubtitle(
  mode: ShipmentModeId,
  originCountry: string,
  destinationCountry: string,
  commodity: string,
): string {
  const c = commodity ? commodity.slice(0, 40) : 'No commodity';
  const LABELS: Record<ShipmentModeId, string> = {
    ocean_import: `Ocean Import · ${originCountry || '—'} · ${c}`,
    air_import: `Air Import · ${originCountry || '—'} · ${c}`,
    land_import_mexico: `Land Freight MX Import · ${originCountry || '—'} · ${c}`,
    land_import_canada: `Land Freight CA Import · ${originCountry || '—'} · ${c}`,
    ocean_export: `U.S. Ocean Export · ${destinationCountry || '—'} · ${c}`,
    air_export: `U.S. Air Export · ${destinationCountry || '—'} · ${c}`,
    land_export_mexico: `Land Freight MX Export · ${destinationCountry || '—'} · ${c}`,
    land_export_canada: `Land Freight CA Export · ${destinationCountry || '—'} · ${c} · EEI exempt`,
    us_export: `U.S. Export · ${destinationCountry || '—'} · ${c}`,
    in_bond: `In-Bond / T&E · ${c}`,
  };
  return LABELS[mode] || c;
}

// ─── Helper: common import Phase 0 ───
function addImportPhase0(docs: Record<string, DocDef>): string[] {
  const ids = ['power_of_attorney', 'importer_registration', 'customs_bond', 'ach_authorization', 'reconciliation_rider'];
  docs['power_of_attorney'] = { name: 'Power of Attorney', phase: 'phase_0' };
  docs['importer_registration'] = { name: 'Importer of Record Registration', phase: 'phase_0' };
  docs['customs_bond'] = { name: 'Continuous Customs Bond (CBP Form 301)', phase: 'phase_0' };
  docs['ach_authorization'] = { name: 'ACH Payment Authorization', phase: 'phase_0' };
  docs['reconciliation_rider'] = { name: 'Reconciliation Bond Rider', phase: 'phase_0', conditional: true };
  return ids;
}

// ─── Helper: common import Phase 3 ───
function addImportPhase3(docs: Record<string, DocDef>): string[] {
  const ids = ['entry_3461', 'entry_summary_7501', 'hts_worksheet', 'ach_duty_payment', 'delivery_order'];
  docs['entry_3461'] = { name: 'CBP Form 3461 — Entry/Immediate Delivery', phase: 'phase_3' };
  docs['entry_summary_7501'] = { name: 'CBP Form 7501 — Entry Summary', phase: 'phase_3' };
  docs['hts_worksheet'] = { name: 'HTS Classification Worksheet', phase: 'phase_3' };
  docs['ach_duty_payment'] = { name: 'ACH Duty Payment Authorization', phase: 'phase_3' };
  docs['delivery_order'] = { name: 'Delivery Order', phase: 'phase_3' };
  return ids;
}

// ─── Helper: common PGA Phase 5 ───
function addPgaPhase5(docs: Record<string, DocDef>): string[] {
  const ids = [
    'fda_prior_notice', 'fda_affirmation', 'usda_permit', 'phytosanitary',
    'fumigation_cert', 'epa_tsca', 'epa_3520', 'fcc_declaration',
    'cpsc_cert', 'sds_msds', 'sima_license', 'cites_permit',
    'atf_form_6', 'textile_visa',
  ];
  docs['fda_prior_notice'] = { name: 'FDA Prior Notice', phase: 'phase_5', commodityTriggers: ['food', 'supplements', 'cosmetics', 'drugs', 'medical'] };
  docs['fda_affirmation'] = { name: 'FDA Entry Affirmation of Compliance', phase: 'phase_5', commodityTriggers: ['medical', 'pharmaceutical'] };
  docs['usda_permit'] = { name: 'USDA/APHIS Import Permit', phase: 'phase_5', commodityTriggers: ['agricultural', 'animals', 'plants'] };
  docs['phytosanitary'] = { name: 'Phytosanitary Certificate', phase: 'phase_5', commodityTriggers: ['agricultural', 'plants', 'wood', 'produce'] };
  docs['fumigation_cert'] = { name: 'Fumigation Certificate / ISPM-15', phase: 'phase_5', commodityTriggers: ['wood'] };
  docs['epa_tsca'] = { name: 'EPA TSCA Certification', phase: 'phase_5', commodityTriggers: ['chemicals'] };
  docs['epa_3520'] = { name: 'EPA Form 3520', phase: 'phase_5', commodityTriggers: ['vehicles', 'engines'] };
  docs['fcc_declaration'] = { name: 'FCC Declaration', phase: 'phase_5', commodityTriggers: ['electronics', 'telecom'] };
  docs['cpsc_cert'] = { name: 'CPSC Compliance Certificate', phase: 'phase_5', commodityTriggers: ['children', 'consumer'] };
  docs['sds_msds'] = { name: 'SDS / MSDS Safety Data Sheets', phase: 'phase_5', commodityTriggers: ['chemicals', 'hazmat', 'batteries'] };
  docs['sima_license'] = { name: 'SIMA Steel Import License', phase: 'phase_5', commodityTriggers: ['steel'] };
  docs['cites_permit'] = { name: 'CITES Permit', phase: 'phase_5', commodityTriggers: ['wildlife', 'exotic', 'timber'] };
  docs['atf_form_6'] = { name: 'ATF Form 6', phase: 'phase_5', commodityTriggers: ['firearms', 'ammunition'] };
  docs['textile_visa'] = { name: 'Textile Visa / Quota Documentation', phase: 'phase_5', commodityTriggers: ['textiles', 'apparel'] };
  return ids;
}

// ─── Helper: common Phase 4 ───
function addImportPhase4(
  docs: Record<string, DocDef>,
  isChina: boolean,
  isLandNorthAmerica: boolean,
): string[] {
  const ids = ['country_of_origin', 'fta_certificate', 'manufacturer_affidavit', 'transfer_pricing', 'adcvd_check'];
  docs['country_of_origin'] = { name: 'Country of Origin Declaration', phase: 'phase_4' };
  docs['fta_certificate'] = {
    name: 'USMCA / FTA Certificate of Origin',
    phase: 'phase_4',
    conditional: true,
    ...(isLandNorthAmerica ? { statusOverride: 'Strongly recommended — duty savings at risk if missing' } : {}),
  };
  docs['manufacturer_affidavit'] = { name: "Manufacturer's Affidavit / Supplier Declaration", phase: 'phase_4' };
  docs['transfer_pricing'] = { name: 'Transfer Pricing Documentation', phase: 'phase_4', conditional: true };
  docs['adcvd_check'] = { name: 'AD/CVD Order Check', phase: 'phase_4' };
  if (isChina) {
    ids.push('section_301');
    docs['section_301'] = { name: 'Section 301 Determination', phase: 'phase_4' };
  }
  return ids;
}

// ─── Helper: Phase 6 Post-Release ───
function addPostRelease(docs: Record<string, DocDef>): string[] {
  const ids = ['restricted_party_screening', 'denied_party_cert'];
  docs['restricted_party_screening'] = { name: 'Restricted Party Screening Record', phase: 'phase_6' };
  docs['denied_party_cert'] = { name: 'Denied Party Screening Certificate', phase: 'phase_6' };
  return ids;
}

// ─── Helper: Phase 7 import fees ───
function addImportFees(
  docs: Record<string, DocDef>,
  includeHmf: boolean,
  isCanadaUsmca: boolean,
): string[] {
  const ids = ['mpf_calc'];
  if (isCanadaUsmca) {
    docs['mpf_calc'] = { name: 'Merchandise Processing Fee (MPF)', phase: 'phase_7', autoCalc: true, statusOverride: 'Exempt under USMCA for qualifying goods' };
  } else {
    docs['mpf_calc'] = { name: 'Merchandise Processing Fee (MPF)', phase: 'phase_7', autoCalc: true };
  }
  if (includeHmf) {
    ids.push('hmf_calc');
    docs['hmf_calc'] = { name: 'Harbor Maintenance Fee (HMF)', phase: 'phase_7', autoCalc: true };
  }
  ids.push('estimated_duties');
  docs['estimated_duties'] = { name: 'Estimated Duties', phase: 'phase_7', autoCalc: true };
  return ids;
}

/**
 * Main entry point: returns mode-specific phases and document definitions.
 */
export function getModeDocumentConfig(
  mode: ShipmentModeId,
  originCountry: string = '',
): { phases: PhaseDefinition[]; docs: Record<string, DocDef> } {
  const docs: Record<string, DocDef> = {};
  const phases: PhaseDefinition[] = [];
  const isChina = ['cn', 'china'].includes(originCountry.toLowerCase());
  const isLandNA = mode.includes('land_');
  const isMexico = mode.includes('mexico');
  const isCanada = mode.includes('canada');

  // ════════════════════════════════════════
  // IN-BOND
  // ════════════════════════════════════════
  if (mode === 'in_bond') {
    // Phase 0
    docs['power_of_attorney'] = { name: 'Power of Attorney', phase: 'phase_0' };
    docs['customs_bond'] = { name: 'Customs Bond (CBP Form 301)', phase: 'phase_0' };
    phases.push({ key: 'phase_0', label: 'Phase 0 — Authority & Bond', docIds: ['power_of_attorney', 'customs_bond'] });

    // Phase 2B — In-Bond Movement
    docs['cbp_form_7512'] = { name: 'CBP Form 7512 — In-Bond Application', phase: 'phase_2b' };
    docs['in_bond_arrival_notice'] = { name: 'In-Bond Entry / Arrival Notice', phase: 'phase_2b' };
    docs['bonded_carrier_auth'] = { name: 'Bonded Carrier Authorization', phase: 'phase_2b' };
    phases.push({ key: 'phase_2b', label: 'Phase 2B — In-Bond Movement', docIds: ['cbp_form_7512', 'in_bond_arrival_notice', 'bonded_carrier_auth'] });

    // Transport
    docs['bill_of_lading'] = { name: 'Bill of Lading / Air Waybill', phase: 'phase_1_2' };
    phases.push({ key: 'phase_1_2', label: 'Phase 1 — Transport Document', docIds: ['bill_of_lading'] });

    return { phases, docs };
  }

  // ════════════════════════════════════════
  // IMPORT MODES
  // ════════════════════════════════════════
  if (['ocean_import', 'air_import', 'land_import_mexico', 'land_import_canada'].includes(mode)) {
    // Phase 0
    phases.push({ key: 'phase_0', label: 'Phase 0 — Authority & Bond', docIds: addImportPhase0(docs) });

    // Phase 1-2 — Commercial & Transport
    const phase12: string[] = ['commercial_invoice', 'packing_list'];

    if (isMexico) {
      docs['commercial_invoice'] = { name: 'Commercial Invoice', phase: 'phase_1_2', statusOverride: 'Required — must also be available in Spanish for Mexican broker' };
    } else {
      docs['commercial_invoice'] = { name: 'Commercial Invoice', phase: 'phase_1_2' };
    }
    docs['packing_list'] = { name: 'Packing List', phase: 'phase_1_2' };

    if (mode === 'ocean_import') {
      phase12.push('bill_of_lading');
      docs['bill_of_lading'] = { name: 'Bill of Lading (B/L)', phase: 'phase_1_2' };
    } else if (mode === 'air_import') {
      phase12.push('air_waybill');
      docs['air_waybill'] = { name: 'Air Waybill (AWB)', phase: 'phase_1_2' };
    } else {
      phase12.push('truck_bol');
      docs['truck_bol'] = { name: 'Truck BOL / Carrier Manifest', phase: 'phase_1_2' };
    }

    phase12.push('purchase_order', 'freight_invoice', 'insurance_certificate', 'pro_forma_invoice');
    docs['purchase_order'] = { name: 'Purchase Order / Sales Contract', phase: 'phase_1_2' };
    docs['freight_invoice'] = { name: 'Freight Invoice', phase: 'phase_1_2', conditional: true };
    docs['insurance_certificate'] = { name: 'Insurance Certificate', phase: 'phase_1_2', conditional: true };
    docs['pro_forma_invoice'] = { name: 'Pro Forma Invoice', phase: 'phase_1_2', conditional: true };

    phases.push({ key: 'phase_1_2', label: 'Phase 1–2 — Commercial & Transport', docIds: phase12 });

    // Mexico-Side Documents (Mexico Import only)
    if (mode === 'land_import_mexico') {
      docs['pedimento'] = { name: 'Pedimento de Importación (Mexican Customs Declaration)', phase: 'phase_2_mx' };
      docs['carta_porte'] = { name: 'Carta Porte / CFDI with Complemento Carta Porte (CCP v3.1)', phase: 'phase_2_mx' };
      docs['doda'] = { name: 'DODA (Documento de Operación para Despacho Aduanero)', phase: 'phase_2_mx' };
      phases.push({ key: 'phase_2_mx', label: 'Phase 2 — Mexico-Side Documents', docIds: ['pedimento', 'carta_porte', 'doda'] });
    }

    // Phase 2B — Pre-Arrival (mode-specific)
    if (mode === 'ocean_import') {
      docs['isf_filing'] = { name: 'ISF 10+2 Filing', phase: 'phase_2b' };
      docs['isf_bond'] = { name: 'ISF Bond Confirmation', phase: 'phase_2b' };
      docs['ams_verification'] = { name: 'AMS Data Match Verification', phase: 'phase_2b' };
      docs['arrival_notice'] = { name: 'Arrival Notice', phase: 'phase_2b' };
      phases.push({ key: 'phase_2b', label: 'Phase 2B — Pre-Arrival (Ocean)', docIds: ['isf_filing', 'isf_bond', 'ams_verification', 'arrival_notice'] });
    } else if (mode === 'land_import_mexico') {
      docs['paps_document'] = { name: 'PAPS Document (Pre-Arrival Processing System)', phase: 'phase_2b' };
      docs['inward_cargo_manifest'] = { name: 'Inward Cargo Manifest', phase: 'phase_2b' };
      docs['letter_of_instructions'] = { name: 'Letter of Instructions (Carta de Instrucciones)', phase: 'phase_2b', conditional: true };
      phases.push({ key: 'phase_2b', label: 'Phase 2B — Pre-Arrival (Mexico Land)', docIds: ['paps_document', 'inward_cargo_manifest', 'letter_of_instructions'] });
    } else if (mode === 'land_import_canada') {
      docs['pars_document'] = { name: 'PARS Document (Pre-Arrival Review System)', phase: 'phase_2b' };
      docs['aci_emanifest'] = { name: 'ACI eManifest Confirmation', phase: 'phase_2b' };
      docs['inward_cargo_manifest'] = { name: 'Inward Cargo Manifest', phase: 'phase_2b' };
      docs['aci_lead_sheet'] = { name: 'ACI Lead Sheet', phase: 'phase_2b' };
      docs['carm_registration'] = { name: 'CARM Registration Confirmation', phase: 'phase_2b', conditional: true };
      phases.push({ key: 'phase_2b', label: 'Phase 2B — Pre-Arrival (Canada Land)', docIds: ['pars_document', 'aci_emanifest', 'inward_cargo_manifest', 'aci_lead_sheet', 'carm_registration'] });
    }
    // Air Import: NO Phase 2B — ISF not required

    // Phase 3 — Entry Filing
    phases.push({ key: 'phase_3', label: 'Phase 3 — Entry Filing', docIds: addImportPhase3(docs) });

    // Phase 4 — Origin & Compliance
    phases.push({ key: 'phase_4', label: 'Phase 4 — Origin & Compliance', docIds: addImportPhase4(docs, isChina, isLandNA) });

    // Phase 5 — PGA Filings
    phases.push({ key: 'phase_5', label: 'Phase 5 — PGA Filings', docIds: addPgaPhase5(docs) });

    // Phase 6 — Post-Release
    phases.push({ key: 'phase_6', label: 'Phase 6 — Post-Release', docIds: addPostRelease(docs) });

    // Phase 7 — Fees
    const includeHmf = mode === 'ocean_import';
    phases.push({ key: 'phase_7', label: 'Phase 7 — Fees (Auto-Calculated)', docIds: addImportFees(docs, includeHmf, isCanada) });

    return { phases, docs };
  }

  // ════════════════════════════════════════
  // EXPORT MODES
  // ════════════════════════════════════════
  if (['ocean_export', 'air_export', 'land_export_mexico', 'land_export_canada', 'us_export'].includes(mode)) {
    const isOceanExp = mode === 'ocean_export' || mode === 'us_export';
    const isAirExp = mode === 'air_export';
    const isLandMxExp = mode === 'land_export_mexico';
    const isLandCaExp = mode === 'land_export_canada';

    // Phase 1 — Commercial Documents
    const phase1: string[] = ['commercial_invoice', 'packing_list'];

    if (isLandMxExp) {
      docs['commercial_invoice'] = { name: 'Commercial Invoice', phase: 'phase_1', statusOverride: 'Required — must be in Spanish for Mexican customs' };
    } else {
      docs['commercial_invoice'] = { name: 'Commercial Invoice', phase: 'phase_1' };
    }
    docs['packing_list'] = { name: 'Packing List', phase: 'phase_1' };

    if (isOceanExp) {
      phase1.push('bill_of_lading');
      docs['bill_of_lading'] = { name: 'Bill of Lading (B/L)', phase: 'phase_1' };
    } else if (isAirExp) {
      phase1.push('air_waybill');
      docs['air_waybill'] = { name: 'Air Waybill (AWB)', phase: 'phase_1' };
    } else {
      phase1.push('truck_bol');
      docs['truck_bol'] = { name: 'Truck BOL / Carrier Manifest', phase: 'phase_1' };
    }

    phases.push({ key: 'phase_1', label: 'Phase 1 — Commercial Documents', docIds: phase1 });

    // Phase 1B — Export Filing
    let phase1bLabel = 'Phase 1B — U.S. Export Filing';
    if (isLandMxExp) phase1bLabel = 'Phase 1B — U.S. Export & Mexico Coordination';
    if (isLandCaExp) phase1bLabel = 'Phase 1B — Canada Export Coordination';

    const phase1b: string[] = [];

    // EEI/AES — NOT required for Canada exports (15 CFR Part 30 exemption)
    if (!isLandCaExp) {
      phase1b.push('eei_aes');
      const eeiTiming = isAirExp
        ? 'File 2 hours before aircraft departure'
        : isOceanExp
          ? 'File 24 hours before vessel loading at U.S. port'
          : 'File before departure — required for Mexico, no exemption';
      docs['eei_aes'] = { name: 'EEI via AES — ITN Required', phase: 'phase_1b', statusOverride: `Required — ${eeiTiming}` };

      phase1b.push('schedule_b_worksheet');
      docs['schedule_b_worksheet'] = { name: 'Schedule B Classification Worksheet', phase: 'phase_1b' };
    }

    phase1b.push('shipper_letter_of_instructions');
    docs['shipper_letter_of_instructions'] = { name: "Shipper's Letter of Instructions", phase: 'phase_1b' };

    phase1b.push('denied_party_screening');
    docs['denied_party_screening'] = { name: 'Denied Party Screening Record (BIS, OFAC, State Dept, Entity List, Unverified List)', phase: 'phase_1b' };

    phase1b.push('export_license');
    docs['export_license'] = { name: 'Export License or License Exception (EAR99/NLR)', phase: 'phase_1b' };

    if (isOceanExp || isAirExp) {
      phase1b.push('destination_control');
      docs['destination_control'] = { name: 'Destination Control Statement Verification', phase: 'phase_1b', conditional: true };
    }

    // Mexico export coordination
    if (isLandMxExp) {
      phase1b.push('pedimento_export', 'carta_porte_export');
      docs['pedimento_export'] = { name: 'Pedimento de Exportación (Mexican broker files in VUCEM)', phase: 'phase_1b' };
      docs['carta_porte_export'] = { name: 'Carta Porte UUID (Mexican carrier issues)', phase: 'phase_1b' };
    }

    // Canada export coordination
    if (isLandCaExp) {
      phase1b.push('aci_emanifest_export', 'carm_registration_export', 'usmca_export');
      docs['aci_emanifest_export'] = { name: 'ACI eManifest Confirmation (Canadian carrier — 1h before border)', phase: 'phase_1b' };
      docs['carm_registration_export'] = { name: 'CARM Registration Confirmation (Canadian importer)', phase: 'phase_1b', conditional: true };
      docs['usmca_export'] = { name: 'USMCA Certificate of Origin', phase: 'phase_1b', statusOverride: 'Strongly recommended — duty savings at risk if missing' };
    }

    phases.push({ key: 'phase_1b', label: phase1bLabel, docIds: phase1b });

    // Phase 7 — Export Fees (informational)
    docs['no_export_fees'] = {
      name: 'No MPF or HMF on Exports',
      phase: 'phase_7_exp',
      autoCalc: true,
      statusOverride: 'Export shipments are exempt from Merchandise Processing Fee and Harbor Maintenance Fee',
    };
    phases.push({ key: 'phase_7_exp', label: 'Phase 7 — Fees', docIds: ['no_export_fees'] });

    return { phases, docs };
  }

  // Fallback: return empty
  return { phases, docs };
}
