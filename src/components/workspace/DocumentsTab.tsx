import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ScoreBanner } from "./ScoreBanner";
import { DocumentCard, type DocumentCardData, type DocCardState } from "./DocumentCard";
import { DocRequirementDrawer } from "./DocRequirementDrawer";
import type { ModeDocProfile, DocRequirement } from "@/lib/shipmentModes";
import type { ShipmentModeId } from "@/lib/shipmentModes";

// Phase definitions for customs broker workflow
const PHASES: Array<{
  key: string;
  label: string;
  docIds: string[];
}> = [
  {
    key: 'phase_0',
    label: 'Phase 0 — Authority & Bond',
    docIds: ['power_of_attorney', 'importer_registration', 'customs_bond', 'ach_authorization', 'reconciliation_rider'],
  },
  {
    key: 'phase_1_2',
    label: 'Phase 1–2 — Commercial & Transport',
    docIds: [
      'commercial_invoice', 'packing_list', 'bill_of_lading', 'air_waybill',
      'freight_invoice', 'insurance_certificate', 'pro_forma_invoice', 'purchase_order',
    ],
  },
  {
    key: 'phase_2b',
    label: 'Phase 2B — Pre-Arrival (Ocean)',
    docIds: ['isf_filing', 'isf_bond', 'ams_verification', 'arrival_notice'],
  },
  {
    key: 'phase_3',
    label: 'Phase 3 — Entry Filing',
    docIds: ['entry_3461', 'entry_summary_7501', 'hts_worksheet', 'delivery_order', 'ach_duty_payment'],
  },
  {
    key: 'phase_4',
    label: 'Phase 4 — Origin & Compliance',
    docIds: [
      'country_of_origin', 'fta_certificate', 'manufacturer_affidavit',
      'transfer_pricing', 'adcvd_check', 'section_301',
    ],
  },
  {
    key: 'phase_5',
    label: 'Phase 5 — PGA Filings',
    docIds: [
      'fda_prior_notice', 'fda_affirmation', 'usda_permit', 'phytosanitary',
      'fumigation_cert', 'cites_permit', 'epa_tsca', 'epa_3520',
      'fcc_declaration', 'cpsc_cert', 'atf_form_6', 'sima_license',
      'textile_visa', 'sds_msds',
    ],
  },
  {
    key: 'phase_6',
    label: 'Phase 6 — Post-Release',
    docIds: ['restricted_party_screening', 'denied_party_cert'],
  },
  {
    key: 'phase_7',
    label: 'Phase 7 — Fees (Auto-Calculated)',
    docIds: ['mpf_calc', 'hmf_calc', 'estimated_duties'],
  },
];

// Extended document definitions covering all phases
const ALL_DOCUMENT_DEFS: Record<string, { name: string; phase: string; applicableModes?: ShipmentModeId[]; conditional?: boolean; commodityTriggers?: string[]; autoCalc?: boolean }> = {
  // Phase 0
  power_of_attorney: { name: 'Power of Attorney', phase: 'phase_0' },
  importer_registration: { name: 'Importer of Record Registration', phase: 'phase_0' },
  customs_bond: { name: 'Continuous Customs Bond (CBP Form 301)', phase: 'phase_0' },
  ach_authorization: { name: 'ACH Payment Authorization', phase: 'phase_0' },
  reconciliation_rider: { name: 'Reconciliation Bond Rider', phase: 'phase_0', conditional: true },
  // Phase 1-2
  commercial_invoice: { name: 'Commercial Invoice', phase: 'phase_1_2' },
  packing_list: { name: 'Packing List', phase: 'phase_1_2' },
  bill_of_lading: { name: 'Bill of Lading (B/L)', phase: 'phase_1_2', applicableModes: ['ocean_import'] },
  air_waybill: { name: 'Air Waybill (AWB)', phase: 'phase_1_2', applicableModes: ['air_import'] },
  freight_invoice: { name: 'Freight Invoice', phase: 'phase_1_2', conditional: true },
  insurance_certificate: { name: 'Insurance Certificate', phase: 'phase_1_2', conditional: true },
  pro_forma_invoice: { name: 'Pro Forma Invoice', phase: 'phase_1_2', conditional: true },
  purchase_order: { name: 'Purchase Order / Sales Contract', phase: 'phase_1_2' },
  // Phase 2B
  isf_filing: { name: 'ISF 10+2 Filing', phase: 'phase_2b', applicableModes: ['ocean_import'] },
  isf_bond: { name: 'ISF Bond Confirmation', phase: 'phase_2b', applicableModes: ['ocean_import'] },
  ams_verification: { name: 'AMS Data Match Verification', phase: 'phase_2b', applicableModes: ['ocean_import'] },
  arrival_notice: { name: 'Arrival Notice', phase: 'phase_2b', applicableModes: ['ocean_import'] },
  // Phase 3
  entry_3461: { name: 'CBP Form 3461 — Entry/Immediate Delivery', phase: 'phase_3' },
  entry_summary_7501: { name: 'CBP Form 7501 — Entry Summary', phase: 'phase_3' },
  hts_worksheet: { name: 'HTS Classification Worksheet', phase: 'phase_3' },
  delivery_order: { name: 'Delivery Order', phase: 'phase_3' },
  ach_duty_payment: { name: 'ACH Duty Payment Authorization', phase: 'phase_3' },
  // Phase 4
  country_of_origin: { name: 'Country of Origin Declaration', phase: 'phase_4' },
  fta_certificate: { name: 'USMCA / FTA Certificate of Origin', phase: 'phase_4', conditional: true },
  manufacturer_affidavit: { name: "Manufacturer's Affidavit / Supplier Declaration", phase: 'phase_4' },
  transfer_pricing: { name: 'Transfer Pricing Documentation', phase: 'phase_4', conditional: true },
  adcvd_check: { name: 'AD/CVD Order Check', phase: 'phase_4' },
  section_301: { name: 'Section 301 Determination', phase: 'phase_4', conditional: true },
  // Phase 5
  fda_prior_notice: { name: 'FDA Prior Notice', phase: 'phase_5', commodityTriggers: ['food', 'supplements', 'cosmetics', 'drugs', 'medical'] },
  fda_affirmation: { name: 'FDA Entry Affirmation of Compliance', phase: 'phase_5', commodityTriggers: ['medical', 'pharmaceutical'] },
  usda_permit: { name: 'USDA/APHIS Import Permit', phase: 'phase_5', commodityTriggers: ['agricultural', 'animals', 'plants'] },
  phytosanitary: { name: 'Phytosanitary Certificate', phase: 'phase_5', commodityTriggers: ['agricultural', 'plants', 'wood'] },
  fumigation_cert: { name: 'Fumigation Certificate / ISPM-15', phase: 'phase_5', applicableModes: ['ocean_import'] },
  cites_permit: { name: 'CITES Permit', phase: 'phase_5', commodityTriggers: ['wildlife', 'exotic', 'timber'] },
  epa_tsca: { name: 'EPA TSCA Certification', phase: 'phase_5', commodityTriggers: ['chemicals'] },
  epa_3520: { name: 'EPA Form 3520', phase: 'phase_5', commodityTriggers: ['vehicles', 'engines'] },
  fcc_declaration: { name: 'FCC Declaration', phase: 'phase_5', commodityTriggers: ['electronics', 'telecom'] },
  cpsc_cert: { name: 'CPSC Compliance Certificate', phase: 'phase_5', commodityTriggers: ['children', 'consumer'] },
  atf_form_6: { name: 'ATF Form 6', phase: 'phase_5', commodityTriggers: ['firearms', 'ammunition'] },
  sima_license: { name: 'SIMA Steel Import License', phase: 'phase_5', commodityTriggers: ['steel'] },
  textile_visa: { name: 'Textile Visa / Quota Documentation', phase: 'phase_5', commodityTriggers: ['textiles', 'apparel'] },
  sds_msds: { name: 'SDS / MSDS Safety Data Sheets', phase: 'phase_5', commodityTriggers: ['chemicals', 'hazmat', 'batteries'] },
  // Phase 6
  restricted_party_screening: { name: 'Restricted Party Screening Record', phase: 'phase_6' },
  denied_party_cert: { name: 'Denied Party Screening Certificate', phase: 'phase_6', applicableModes: ['us_export'] },
  // Phase 7 (auto-calculated)
  mpf_calc: { name: 'Merchandise Processing Fee (MPF)', phase: 'phase_7', autoCalc: true },
  hmf_calc: { name: 'Harbor Maintenance Fee (HMF)', phase: 'phase_7', autoCalc: true, applicableModes: ['ocean_import'] },
  estimated_duties: { name: 'Estimated Duties', phase: 'phase_7', autoCalc: true },
};

interface DocumentsTabProps {
  shipmentMode: ShipmentModeId;
  uploadedDocTypes: string[];
  commodityType: string;
  originCountry: string;
  incoterm: string;
  declaredValue: string;
  hsCode: string;
  shipmentSubtitle: string;
  onViewAIAnalysis?: () => void;
  onUploadDoc?: (docId: string, files: FileList) => void;
}

function isDocApplicable(
  docId: string,
  def: typeof ALL_DOCUMENT_DEFS[string],
  mode: ShipmentModeId,
  commodityType: string,
  originCountry: string,
  incoterm: string,
): 'required' | 'conditional' | 'not_applicable' {
  // Mode filter
  if (def.applicableModes && !def.applicableModes.includes(mode)) return 'not_applicable';

  // Commodity filter for PGA
  if (def.commodityTriggers) {
    const lowerCommodity = commodityType.toLowerCase();
    const matches = def.commodityTriggers.some(t => lowerCommodity.includes(t));
    if (!matches) return 'not_applicable';
  }

  // Conditional checks
  if (def.conditional) {
    if (docId === 'freight_invoice' || docId === 'insurance_certificate') {
      if (['CIF', 'CIP'].includes(incoterm.toUpperCase())) return 'required';
      return 'conditional';
    }
    if (docId === 'section_301') {
      return originCountry.toLowerCase().includes('china') || originCountry.toUpperCase() === 'CN' ? 'required' : 'not_applicable';
    }
    if (docId === 'fta_certificate') return 'conditional';
    if (docId === 'transfer_pricing') return 'conditional';
    if (docId === 'reconciliation_rider') return 'conditional';
    return 'conditional';
  }

  return 'required';
}

function calcFees(declaredValue: string, mode: ShipmentModeId): Record<string, string> {
  const val = parseFloat(declaredValue) || 0;
  const mpf = Math.min(Math.max(val * 0.003464, 31.67), 614.35);
  const hmf = val * 0.00125;
  return {
    mpf_calc: `$${mpf.toFixed(2)} (0.3464% of $${val.toLocaleString()}, min $31.67, max $614.35)`,
    hmf_calc: mode === 'ocean_import' ? `$${hmf.toFixed(2)} (0.125% of $${val.toLocaleString()})` : 'N/A — Ocean only',
    estimated_duties: val > 0 ? 'Calculated per HTS code × declared value' : 'Enter declared value to calculate',
  };
}

export function DocumentsTab({
  shipmentMode, uploadedDocTypes, commodityType, originCountry, incoterm,
  declaredValue, hsCode, shipmentSubtitle, onViewAIAnalysis, onUploadDoc,
}: DocumentsTabProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [alertDrawerDoc, setAlertDrawerDoc] = useState<DocRequirement | null>(null);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);

  const fees = calcFees(declaredValue, shipmentMode);

  // Build document cards
  const allCards: DocumentCardData[] = [];
  let totalRequired = 0;
  let verified = 0;
  let issuesFlagged = 0;
  let missing = 0;

  for (const [docId, def] of Object.entries(ALL_DOCUMENT_DEFS)) {
    const applicability = isDocApplicable(docId, def, shipmentMode, commodityType, originCountry, incoterm);

    if (applicability === 'not_applicable' && !showOptional && def.phase === 'phase_5') continue;

    let state: DocCardState;
    let statusLine: string;

    if (applicability === 'not_applicable') {
      state = 'not_applicable';
      statusLine = 'Not required for this shipment type';
    } else if (def.autoCalc) {
      state = 'verified';
      statusLine = fees[docId] || 'Auto-calculated';
    } else if (uploadedDocTypes.includes(docId)) {
      // For now, mark as verified; in production, AI verification status would come from DB
      state = 'verified';
      statusLine = 'Uploaded · AI verified';
      verified++;
      totalRequired++;
    } else if (applicability === 'required') {
      state = 'missing';
      statusLine = 'Required — not yet uploaded';
      missing++;
      totalRequired++;
    } else {
      state = 'missing';
      statusLine = 'Conditional — may be required';
      missing++;
      totalRequired++;
    }

    allCards.push({
      id: docId,
      name: def.name,
      phase: def.phase,
      state,
      statusLine,
      extractedFields: state === 'verified' && !def.autoCalc ? [
        { label: 'Document type', value: def.name, status: 'verified' },
      ] : undefined,
    });
  }

  const score = totalRequired > 0 ? Math.round((verified / totalRequired) * 100) : 0;

  // Build status pills from top issues
  const statusPills: Array<{ label: string; type: 'green' | 'amber' | 'red'; onClick?: () => void }> = [];
  const verifiedCards = allCards.filter(c => c.state === 'verified' && !ALL_DOCUMENT_DEFS[c.id]?.autoCalc);
  const missingCards = allCards.filter(c => c.state === 'missing');
  const issueCards = allCards.filter(c => c.state === 'issue');

  if (verifiedCards.length > 0) statusPills.push({ label: `${verifiedCards.length} verified`, type: 'green' });
  if (issueCards.length > 0) statusPills.push({ label: `${issueCards.length} issues`, type: 'amber' });
  if (missingCards.length > 0) statusPills.push({ label: `${missingCards.length} missing`, type: 'red' });

  return (
    <div className="space-y-4">
      <ScoreBanner
        score={score}
        totalRequired={totalRequired}
        verified={verified}
        issuesFlagged={issuesFlagged}
        missing={missing}
        shipmentSubtitle={shipmentSubtitle}
        statusPills={statusPills}
        onViewAIAnalysis={onViewAIAnalysis}
      />

      {/* Phased document sections */}
      {PHASES.map(phase => {
        const phaseCards = allCards.filter(c => c.phase === phase.key);
        const visible = phaseCards.filter(c => c.state !== 'not_applicable' || showOptional);
        if (visible.length === 0) return null;

        return (
          <div key={phase.key} className="space-y-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pt-2">
              {phase.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {visible.map(card => (
                <DocumentCard
                  key={card.id}
                  doc={card}
                  onUpload={onUploadDoc}
                  onClickAlert={(id, msg) => {
                    // Could open alert drawer
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Show optional toggle */}
      <div className="flex items-center gap-2 px-1 pt-2 pb-1">
        <Switch
          id="show-optional"
          checked={showOptional}
          onCheckedChange={setShowOptional}
        />
        <Label htmlFor="show-optional" className="text-[11px] text-muted-foreground cursor-pointer">
          Show all optional & non-applicable documents
        </Label>
      </div>

      <DocRequirementDrawer open={alertDrawerOpen} onOpenChange={setAlertDrawerOpen} doc={alertDrawerDoc} />
    </div>
  );
}
