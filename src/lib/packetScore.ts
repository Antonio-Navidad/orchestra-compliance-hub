/**
 * Document Packet Completeness Score Engine
 * 5-layer weighted scoring model:
 *   Layer 1: Global Core (30%)
 *   Layer 2: Mode-Specific (20%)
 *   Layer 3: Jurisdiction (20%)
 *   Layer 4: Commodity/Regulatory (15%)
 *   Layer 5: Quality/Consistency (15%)
 */

export type DocStatus = 'present' | 'missing' | 'optional_present' | 'inconsistent' | 'low_confidence' | 'not_applicable';

export interface DocItem {
  name: string;
  type: string;
  status: DocStatus;
  required: boolean;
  notes?: string;
}

export interface PacketLayer {
  label: string;
  weight: number;
  items: DocItem[];
  score: number;
}

export interface PacketScoreResult {
  overallScore: number;
  presenceScore: number;
  filingReadiness: 'ready' | 'needs_review' | 'not_ready';
  layers: PacketLayer[];
  topMissing: string[];
  topInconsistencies: string[];
}

type TransportMode = 'air' | 'sea' | 'land';

const CORE_DOCS = [
  { name: 'Commercial Invoice', type: 'commercial_invoice', required: true },
  { name: 'Packing List', type: 'packing_list', required: true },
  { name: 'Transport Document', type: 'bill_of_lading', required: true },
  { name: 'Commodity Description', type: '_field_commodity', required: true },
  { name: 'Quantity & Weights', type: '_field_quantity', required: true },
  { name: 'Value / Currency', type: '_field_value', required: true },
  { name: 'Origin Information', type: 'certificate_of_origin', required: false },
  { name: 'Broker Assignment', type: '_field_broker', required: false },
];

function getModeDocs(mode: TransportMode): Array<{ name: string; type: string; required: boolean }> {
  switch (mode) {
    case 'air':
      return [
        { name: 'Air Waybill (AWB/e-AWB)', type: 'air_waybill', required: true },
        { name: 'Dangerous Goods Declaration', type: 'dangerous_goods_declaration', required: false },
      ];
    case 'sea':
      return [
        { name: 'Bill of Lading', type: 'bill_of_lading', required: true },
      ];
    case 'land':
      return [
        { name: 'Road/Freight Transport Doc', type: 'multimodal_transport_doc', required: true },
      ];
    default:
      return [];
  }
}

function getJurisdictionDocs(jurisdiction: string): Array<{ name: string; type: string; required: boolean }> {
  const docs: Array<{ name: string; type: string; required: boolean }> = [];
  
  if (jurisdiction.startsWith('EU') || ['ES', 'FR', 'IT', 'NL'].includes(jurisdiction)) {
    docs.push(
      { name: 'ENS Security Data', type: '_field_ens', required: true },
      { name: 'Customs Declaration', type: 'customs_declaration', required: true },
      { name: 'Origin Support (if preferential)', type: 'certificate_of_origin', required: false },
    );
  } else if (jurisdiction === 'US') {
    docs.push(
      { name: 'Customs Entry (CBP)', type: 'customs_declaration', required: true },
      { name: 'ISF Filing (sea)', type: '_field_isf', required: false },
    );
  } else if (jurisdiction === 'MX') {
    docs.push(
      { name: 'Pedimento', type: 'customs_declaration', required: true },
      { name: 'USMCA Certificate', type: 'certificate_of_origin', required: false },
    );
  } else if (jurisdiction === 'CA') {
    docs.push(
      { name: 'CBSA Customs Entry (CAD)', type: 'customs_declaration', required: true },
      { name: 'PARS Document', type: 'pars_document', required: true },
      { name: 'ACI eManifest Confirmation', type: 'aci_emanifest', required: true },
      { name: 'CARM Registration Confirmation', type: 'carm_registration', required: false },
      { name: 'USMCA Certificate', type: 'certificate_of_origin', required: false },
    );
  } else {
    docs.push(
      { name: 'Import/Export Declaration', type: 'customs_declaration', required: false },
    );
  }
  return docs;
}
function getRegulatoryDocs(hsCode?: string): Array<{ name: string; type: string; required: boolean }> {
  const docs: Array<{ name: string; type: string; required: boolean }> = [];
  if (!hsCode) return docs;

  const ch = parseInt(hsCode.substring(0, 2));
  if (isNaN(ch)) return docs;

  // Food/agri (01-24): phytosanitary + FDA prior notice
  if (ch >= 1 && ch <= 24) {
    docs.push({ name: 'Phytosanitary Certificate', type: 'phytosanitary_certificate', required: true });
    docs.push({ name: 'FDA Prior Notice', type: 'fda_prior_notice', required: true });
    docs.push({ name: 'Fumigation Certificate / ISPM-15', type: 'fumigation_certificate', required: true });
  }
  // Chemicals (28-38): SDS/MSDS + EPA TSCA
  if (ch >= 28 && ch <= 38) {
    docs.push({ name: 'SDS / MSDS', type: 'dangerous_goods_declaration', required: true });
    docs.push({ name: 'EPA TSCA Certification', type: 'epa_tsca', required: true });
  }
  // Pharma/medical (29-30, 90): FDA entry affirmation
  if (ch === 29 || ch === 30 || ch === 90) {
    docs.push({ name: 'FDA Entry Affirmation', type: 'fda_affirmation', required: true });
  }
  // Electronics/telecom (84-85): FCC declaration
  if (ch === 84 || ch === 85) {
    docs.push({ name: 'FCC Declaration', type: 'fcc_declaration', required: true });
  }
  // Steel/aluminum (72-76): SIMA license
  if (ch >= 72 && ch <= 76) {
    docs.push({ name: 'SIMA Steel Import License', type: 'sima_license', required: true });
  }
  // Textiles/apparel (50-63): textile visa
  if (ch >= 50 && ch <= 63) {
    docs.push({ name: 'Textile Visa / Quota Documentation', type: 'textile_visa', required: false });
  }
  // Firearms/ammunition (93): ATF Form 6
  if (ch === 93) {
    docs.push({ name: 'ATF Form 6 — Import Permit', type: 'atf_form_6', required: true });
  }
  // Wildlife (01, 03, 44): CITES permit
  if (ch === 1 || ch === 3 || ch === 44) {
    docs.push({ name: 'CITES Permit', type: 'cites_permit', required: false });
  }

  // Always add inspection and export license as optional
  docs.push({ name: 'Inspection Certificate', type: 'inspection_certificate', required: false });
  docs.push({ name: 'Export License', type: 'export_license', required: false });

  return docs;
}
function scoreLayer(items: DocItem[]): number {
  const required = items.filter(i => i.required);
  const optional = items.filter(i => !i.required);
  if (required.length === 0 && optional.length === 0) return 100;

  let score = 0;
  let total = 0;

  for (const item of required) {
    total += 1;
    if (item.status === 'present') score += 1;
    else if (item.status === 'inconsistent') score += 0.5;
    else if (item.status === 'low_confidence') score += 0.6;
    else if (item.status === 'not_applicable') { total -= 1; }
  }

  for (const item of optional) {
    total += 0.3;
    if (item.status === 'present' || item.status === 'optional_present') score += 0.3;
    else if (item.status === 'not_applicable') { total -= 0.3; }
  }

  return total > 0 ? Math.round((score / total) * 100) : 100;
}

export function computePacketScore(
  uploadedDocTypes: string[],
  mode: TransportMode,
  jurisdictionCode: string,
  shipmentFields: {
    description?: string;
    quantity?: number;
    declared_value?: number;
    hs_code?: string;
    consignee?: string;
    shipper?: string;
    assigned_broker?: string;
    coo_status?: string;
    origin_country?: string;
  }
): PacketScoreResult {

  function resolveStatus(item: { name: string; type: string; required: boolean }): DocStatus {
    // Field-based checks
    if (item.type === '_field_commodity') return shipmentFields.description ? 'present' : 'missing';
    if (item.type === '_field_quantity') return (shipmentFields.quantity && shipmentFields.quantity > 0) ? 'present' : 'missing';
    if (item.type === '_field_value') return (shipmentFields.declared_value && shipmentFields.declared_value > 0) ? 'present' : 'missing';
    if (item.type === '_field_broker') return shipmentFields.assigned_broker ? 'present' : 'missing';
    if (item.type === '_field_ens') return 'not_applicable'; // Simplified
    if (item.type === '_field_isf') return 'not_applicable';

    // COO special
    if (item.type === 'certificate_of_origin') {
      if (shipmentFields.coo_status === 'attached' || uploadedDocTypes.includes('certificate_of_origin')) return 'present';
      if (shipmentFields.coo_status === 'not_required') return 'not_applicable';
      if (shipmentFields.coo_status === 'pending') return 'missing';
      return uploadedDocTypes.includes('certificate_of_origin') ? 'present' : 'missing';
    }

    // Doc-based checks
    return uploadedDocTypes.includes(item.type) ? 'present' : 'missing';
  }

  const coreItems: DocItem[] = CORE_DOCS.map(d => ({ ...d, status: resolveStatus(d) }));
  const modeItems: DocItem[] = getModeDocs(mode).map(d => ({ ...d, status: resolveStatus(d) }));
  const jurisdictionItems: DocItem[] = getJurisdictionDocs(jurisdictionCode).map(d => ({ ...d, status: resolveStatus(d) }));
  const regulatoryItems: DocItem[] = getRegulatoryDocs(shipmentFields.hs_code).map(d => ({ ...d, status: resolveStatus(d) }));

  // Layer 5: Quality/Consistency (simplified field checks)
  const qualityItems: DocItem[] = [
    { name: 'Consignee Specified', type: '_q_consignee', required: true, status: shipmentFields.consignee ? 'present' : 'missing' },
    { name: 'HS Code Confidence', type: '_q_hs', required: true, status: shipmentFields.hs_code ? 'present' : 'missing' },
    { name: 'Origin Country Specified', type: '_q_origin', required: true, status: shipmentFields.origin_country ? 'present' : 'missing' },
    { name: 'Description Quality', type: '_q_desc', required: true, status: (shipmentFields.description && shipmentFields.description.length > 10) ? 'present' : 'low_confidence' },
  ];

  const layers: PacketLayer[] = [
    { label: 'Core Documents', weight: 0.30, items: coreItems, score: scoreLayer(coreItems) },
    { label: 'Mode Requirements', weight: 0.20, items: modeItems, score: scoreLayer(modeItems) },
    { label: 'Jurisdiction Requirements', weight: 0.20, items: jurisdictionItems, score: scoreLayer(jurisdictionItems) },
    { label: 'Commodity / Regulatory', weight: 0.15, items: regulatoryItems, score: scoreLayer(regulatoryItems) },
    { label: 'Quality / Consistency', weight: 0.15, items: qualityItems, score: scoreLayer(qualityItems) },
  ];

  const overallScore = Math.round(
    layers.reduce((sum, l) => sum + l.score * l.weight, 0)
  );

  const presenceScore = Math.round(
    layers.slice(0, 4).reduce((sum, l) => {
      const present = l.items.filter(i => i.status === 'present' || i.status === 'optional_present' || i.status === 'not_applicable').length;
      return sum + (l.items.length > 0 ? (present / l.items.length) * 100 : 100);
    }, 0) / 4
  );

  const topMissing = layers
    .flatMap(l => l.items)
    .filter(i => i.status === 'missing' && i.required)
    .map(i => i.name);

  const topInconsistencies = layers
    .flatMap(l => l.items)
    .filter(i => i.status === 'inconsistent' || i.status === 'low_confidence')
    .map(i => i.name);

  const filingReadiness: PacketScoreResult['filingReadiness'] =
    overallScore >= 80 && topMissing.length === 0 ? 'ready'
    : overallScore >= 50 ? 'needs_review'
    : 'not_ready';

  return { overallScore, presenceScore, filingReadiness, layers, topMissing, topInconsistencies };
}
