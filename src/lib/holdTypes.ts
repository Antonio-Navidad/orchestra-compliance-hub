import type { AlertDrawerData } from './alertDrawerContent';

export interface HoldType {
  value: string;
  label: string;
  severity: 'critical' | 'high' | 'medium';
}

export const HOLD_TYPES: HoldType[] = [
  { value: 'manifest_hold', label: 'Manifest Hold', severity: 'critical' },
  { value: 'commercial_enforcement', label: 'Commercial Enforcement Hold', severity: 'critical' },
  { value: 'statistical_validation', label: 'Statistical Validation Hold', severity: 'high' },
  { value: 'cet_hold', label: 'CET Hold', severity: 'high' },
  { value: 'pga_hold', label: 'PGA Hold', severity: 'critical' },
  { value: 'vacis_xray', label: 'VACIS X-Ray Exam', severity: 'high' },
  { value: 'tailgate_exam', label: 'Tailgate Exam', severity: 'medium' },
  { value: 'intensive_exam', label: 'Intensive/Devanning Exam', severity: 'critical' },
  { value: 'usda_exam', label: 'USDA Exam', severity: 'high' },
  { value: 'fda_exam', label: 'FDA Exam', severity: 'high' },
];

export const HOLD_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated_to_exam', label: 'Escalated to Exam' },
];

export interface ShipmentHold {
  id: string;
  shipment_id: string;
  hold_type: string;
  hold_received_date: string | null;
  port_ces_location: string | null;
  free_time_expires: string | null;
  demurrage_total: number;
  documents_submitted: Array<{ name: string; date: string }>;
  hold_status: string;
  resolution_date: string | null;
  notes: string | null;
}

export function getHoldDrawer(holdType: string): AlertDrawerData {
  const HOLD_DRAWERS: Record<string, AlertDrawerData> = {
    manifest_hold: {
      id: 'hold_manifest',
      title: 'Manifest Hold',
      severity: 'critical',
      whatIsThis: 'A Manifest Hold means CBP has flagged a discrepancy between the vessel manifest data (provided by the carrier) and the entry data (provided by the broker). The cargo cannot be released until the discrepancy is resolved.',
      whyItMatters: 'Manifest holds are among the most common CBP holds. They typically delay cargo 1–5 days and generate demurrage charges of $150–$350/container/day. The hold will not be lifted until CBP is satisfied that the manifest and entry data match.',
      whatToDo: [
        'Compare your entry data against the vessel manifest — check B/L number, container numbers, weight, and piece count.',
        'If the carrier manifest is wrong, request an amendment from the shipping line.',
        'If your entry data is wrong, file a correction through your broker.',
        'Contact CBP at the port of entry to confirm what specific data point triggered the hold.',
      ],
      quickActions: [
        { label: 'Upload corrected doc', type: 'upload' },
        { label: 'Request B/L amendment', type: 'request' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: '19 CFR 4.7',
      financialImpact: '$150–$350/container/day demurrage',
    },
    commercial_enforcement: {
      id: 'hold_commercial',
      title: 'Commercial Enforcement Hold',
      severity: 'critical',
      whatIsThis: 'A Commercial Enforcement Hold is placed by CBP\'s Centers of Excellence and Expertise (CEE) or Trade Operations when there is a suspected issue with classification, valuation, country of origin, or AD/CVD liability. This is a targeted hold based on risk assessment.',
      whyItMatters: 'This hold indicates CBP suspects a compliance violation. It can escalate to a penalty case under 19 U.S.C. 1592. Resolution requires providing documentation that satisfies CBP\'s concerns — typically 2–7 days but can extend to weeks for complex cases.',
      whatToDo: [
        'Contact your assigned CBP import specialist to determine what triggered the hold.',
        'Prepare and submit all requested documentation: invoices, manufacturer declarations, lab reports, or classification rulings.',
        'If the issue is classification-related, consider obtaining a binding ruling from CBP.',
        'Document all communications and response timelines for your records.',
      ],
      quickActions: [
        { label: 'Upload supporting docs', type: 'upload' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: '19 U.S.C. 1499',
      financialImpact: 'Potential 1592 penalty + demurrage',
    },
    statistical_validation: {
      id: 'hold_statistical',
      title: 'Statistical Validation Hold',
      severity: 'high',
      whatIsThis: 'A Statistical Validation Hold means CBP has flagged the entry for review of statistical reporting accuracy — typically the HTS code, country of origin, or quantity/value data used for trade statistics.',
      whyItMatters: 'While less severe than enforcement holds, statistical holds still delay cargo release. They are usually resolved within 1–3 days once the correct data is provided. Repeated statistical errors can trigger enhanced scrutiny on future entries.',
      whatToDo: [
        'Review the HTS classification on your entry and verify it matches the actual goods.',
        'Confirm the quantity and unit of measure are reported correctly.',
        'Submit any corrections through your broker via ABI.',
        'Respond promptly — these are typically quick to resolve.',
      ],
      quickActions: [
        { label: 'Upload corrected entry', type: 'upload' },
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: '1–3 day delay + storage charges',
    },
    cet_hold: {
      id: 'hold_cet',
      title: 'CET Hold (Cargo Enforcement Team)',
      severity: 'high',
      whatIsThis: 'A CET Hold is placed by CBP\'s Cargo Enforcement Team for anti-terrorism and trade enforcement screening. CET officers physically inspect cargo based on intelligence-driven targeting.',
      whyItMatters: 'CET holds are intelligence-driven and may indicate your shipment profile matches risk indicators. The exam is typically non-intrusive (document review) but can escalate to physical inspection. Cooperation and rapid document submission shortens resolution.',
      whatToDo: [
        'Provide all requested documents to the CET team immediately.',
        'Be transparent — CET holds are security-related and non-cooperation raises suspicion.',
        'Your broker should coordinate directly with the CET team at the port.',
        'Maintain complete records of all communications and documents submitted.',
      ],
      quickActions: [
        { label: 'Upload docs', type: 'upload' },
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: 'Variable — depends on exam scope',
    },
    pga_hold: {
      id: 'hold_pga',
      title: 'PGA Hold (Partner Government Agency)',
      severity: 'critical',
      whatIsThis: 'A PGA Hold means a Partner Government Agency (FDA, USDA, EPA, CPSC, FCC, ATF, etc.) has flagged your shipment for review. This is separate from CBP\'s own hold and requires satisfying the specific PGA\'s requirements.',
      whyItMatters: 'PGA holds can be the most complex to resolve because each agency has different requirements and timelines. FDA holds can last weeks if lab testing is required. USDA holds may require fumigation. The cargo cannot move until the PGA releases it.',
      whatToDo: [
        'Identify which PGA placed the hold (check ACE or ask your broker).',
        'Review the specific PGA requirements for your product type.',
        'Submit required filings, certificates, or test results to the PGA.',
        'If FDA: check Prior Notice status and product registration. If USDA: check phytosanitary certification.',
      ],
      quickActions: [
        { label: 'Upload PGA docs', type: 'upload' },
        { label: 'Request from supplier', type: 'request' },
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: 'Days to weeks delay + potential refusal',
    },
    vacis_xray: {
      id: 'hold_vacis',
      title: 'VACIS X-Ray Exam',
      severity: 'high',
      whatIsThis: 'A VACIS (Vehicle and Cargo Inspection System) exam uses large-scale X-ray imaging to scan the container without opening it. This is a non-intrusive exam (NII) that typically takes 1–2 hours but requires the container to be transported to the exam site.',
      whyItMatters: 'VACIS exams are relatively quick but incur drayage costs to the exam facility ($200–$500) and potential delays of 1–2 days. If the X-ray shows anomalies, it can escalate to an intensive exam.',
      whatToDo: [
        'Coordinate with the terminal/CES to schedule the VACIS exam.',
        'Arrange drayage to the VACIS facility if required.',
        'Ensure your packing list accurately reflects container contents — anomalies trigger escalation.',
        'Monitor ACE for exam results — VACIS results are usually available within hours.',
      ],
      quickActions: [
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: '$200–$500 drayage + 1–2 day delay',
    },
    tailgate_exam: {
      id: 'hold_tailgate',
      title: 'Tailgate Exam',
      severity: 'medium',
      whatIsThis: 'A Tailgate Exam involves CBP officers opening the container doors and visually inspecting the cargo without unloading. They check marks and numbers, verify description matches, and may pull samples.',
      whyItMatters: 'Tailgate exams are less costly than intensive exams but still delay cargo 1–2 days. Exam fees are typically $300–$500. If the exam reveals inconsistencies, it can escalate to a full devanning.',
      whatToDo: [
        'Ensure marks and numbers on your cargo match the packing list exactly.',
        'Your broker or freight forwarder should coordinate the exam scheduling.',
        'Be available for questions — CBP may contact the broker during the exam.',
        'Monitor ACE for exam results.',
      ],
      quickActions: [
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: '$300–$500 exam fee + 1–2 days',
    },
    intensive_exam: {
      id: 'hold_intensive',
      title: 'Intensive/Devanning Exam',
      severity: 'critical',
      whatIsThis: 'An Intensive or Devanning Exam requires the entire container to be unloaded at a Centralized Examination Station (CES). CBP officers physically inspect all cargo, count pieces, weigh items, and may take samples for lab testing.',
      whyItMatters: 'This is the most expensive and time-consuming exam type. Costs range from $2,000 to $8,000+ including unloading, labor, repacking, and CES facility charges. Timeline: 3–7 business days. The importer pays all costs regardless of the exam outcome.',
      whatToDo: [
        'Coordinate with the CES facility for scheduling.',
        'Ensure someone (broker or representative) is present during the exam if required.',
        'Provide any documents CBP requests during the exam process.',
        'After the exam, verify the cargo was repacked correctly and no damage occurred.',
        'File any claims for damage during exam through CBP\'s tort claims process.',
      ],
      quickActions: [
        { label: 'Upload docs', type: 'upload' },
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: '$2,000–$8,000+ exam costs + 3–7 day delay',
    },
    usda_exam: {
      id: 'hold_usda',
      title: 'USDA Exam',
      severity: 'high',
      whatIsThis: 'A USDA (United States Department of Agriculture) exam is conducted by APHIS inspectors to check for pests, diseases, or non-compliant wood packaging. Agricultural products, plants, and animal products are primary targets.',
      whyItMatters: 'USDA can refuse entry, require treatment (fumigation, re-export), or destroy cargo that fails inspection. Treatment costs $500–$3,000 per container. If pests are found, the importer may be placed on a heightened scrutiny list for future shipments.',
      whatToDo: [
        'Ensure phytosanitary certificates are complete and accurate.',
        'Verify all wood packaging meets ISPM-15 requirements.',
        'Have treatment options pre-arranged in case USDA requires fumigation.',
        'If agricultural products: confirm all permits and registrations are current.',
      ],
      quickActions: [
        { label: 'Upload phyto cert', type: 'upload', docId: 'phytosanitary' },
        { label: 'Add note', type: 'note' },
      ],
      financialImpact: '$500–$3,000 treatment + potential refusal',
    },
    fda_exam: {
      id: 'hold_fda',
      title: 'FDA Exam',
      severity: 'high',
      whatIsThis: 'An FDA exam or detention occurs when the Food and Drug Administration flags your shipment for review. FDA may request lab samples, review labeling, or verify compliance with food safety, drug, cosmetic, or medical device regulations.',
      whyItMatters: 'FDA detentions can last weeks if lab testing is required. FDA can issue an Import Alert placing your product on automatic detention for future shipments. Refused products must be re-exported or destroyed at the importer\'s expense.',
      whatToDo: [
        'Verify Prior Notice was filed correctly and on time.',
        'Check if your product is on any active Import Alerts at FDA\'s website.',
        'If lab samples are requested, cooperate immediately to shorten the timeline.',
        'Review labeling for compliance with 21 CFR requirements.',
        'Consider hiring an FDA regulatory consultant if the detention is complex.',
      ],
      quickActions: [
        { label: 'Upload FDA docs', type: 'upload', docId: 'fda_prior_notice' },
        { label: 'Check Import Alerts', type: 'link', href: 'https://www.accessdata.fda.gov/cms_ia/ialist.html' },
        { label: 'Add note', type: 'note' },
      ],
      regulation: '21 U.S.C. 381',
      financialImpact: 'Weeks delay + potential refusal/destruction',
    },
  };

  return HOLD_DRAWERS[holdType] || {
    id: `hold_${holdType}`,
    title: holdType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    severity: 'high',
    whatIsThis: 'A CBP hold has been placed on this shipment. The specific reason and required resolution depend on the hold type.',
    whyItMatters: 'Holds delay cargo release and generate demurrage/storage charges. Resolution requires providing documentation or corrections to satisfy CBP requirements.',
    whatToDo: [
      'Contact your broker to determine the exact reason for the hold.',
      'Gather and submit any requested documentation.',
      'Monitor ACE for status updates.',
    ],
    quickActions: [{ label: 'Add note', type: 'note' }],
  };
}
