/**
 * Shipment Mode definitions for customs broker workflows.
 * Each mode drives a specific document checklist, filing requirements, and compliance rules.
 */

export type ShipmentModeId =
  | 'ocean_import' | 'air_import' | 'land_import_mexico' | 'land_import_canada'
  | 'ocean_export' | 'air_export' | 'land_export_mexico' | 'land_export_canada'
  | 'us_export' | 'in_bond';

export type ShipmentModeGroup = 'import' | 'export' | 'other';

export interface ShipmentModeConfig {
  id: ShipmentModeId;
  label: string;
  shortLabel: string;
  icon: string; // emoji
  description: string;
  transportMode: 'sea' | 'air' | 'land';
  direction: 'inbound' | 'outbound' | 'transit';
  group: ShipmentModeGroup;
  placeholder?: boolean;
}

export const SHIPMENT_MODE_GROUPS: { key: ShipmentModeGroup; label: string }[] = [
  { key: 'import', label: 'Importing into the U.S.' },
  { key: 'export', label: 'Exporting from the U.S.' },
  { key: 'other', label: 'Other' },
];

export const SHIPMENT_MODES: ShipmentModeConfig[] = [
  // ── Import ──
  {
    id: 'ocean_import',
    label: 'Ocean Import',
    shortLabel: 'Ocean',
    icon: '🚢',
    description: '14 docs required + ISF mandatory',
    transportMode: 'sea',
    direction: 'inbound',
    group: 'import',
  },
  {
    id: 'air_import',
    label: 'Air Import',
    shortLabel: 'Air',
    icon: '✈️',
    description: '11 docs required, no ISF',
    transportMode: 'air',
    direction: 'inbound',
    group: 'import',
  },
  {
    id: 'land_import_mexico',
    label: 'Land / Truck Import — Mexico',
    shortLabel: 'Truck MX',
    icon: '🚛',
    description: 'PAPS + Pedimento required',
    transportMode: 'land',
    direction: 'inbound',
    group: 'import',
    placeholder: true,
  },
  {
    id: 'land_import_canada',
    label: 'Land / Truck Import — Canada',
    shortLabel: 'Truck CA',
    icon: '🚛',
    description: 'PARS + ACI eManifest required',
    transportMode: 'land',
    direction: 'inbound',
    group: 'import',
    placeholder: true,
  },
  // ── Export ──
  {
    id: 'ocean_export',
    label: 'Ocean Export',
    shortLabel: 'Ocean Exp',
    icon: '🚢',
    description: 'EEI/AES + ocean docs',
    transportMode: 'sea',
    direction: 'outbound',
    group: 'export',
  },
  {
    id: 'air_export',
    label: 'Air Export',
    shortLabel: 'Air Exp',
    icon: '✈️',
    description: 'EEI/AES + air docs',
    transportMode: 'air',
    direction: 'outbound',
    group: 'export',
  },
  {
    id: 'land_export_mexico',
    label: 'Land / Truck Export — Mexico',
    shortLabel: 'Truck MX Exp',
    icon: '🚛',
    description: 'EEI/AES + Pedimento coordination',
    transportMode: 'land',
    direction: 'outbound',
    group: 'export',
    placeholder: true,
  },
  {
    id: 'land_export_canada',
    label: 'Land / Truck Export — Canada',
    shortLabel: 'Truck CA Exp',
    icon: '🚛',
    description: 'EEI/AES + CARM coordination',
    transportMode: 'land',
    direction: 'outbound',
    group: 'export',
    placeholder: true,
  },
  // ── Other ──
  {
    id: 'us_export',
    label: 'U.S. Export (Legacy)',
    shortLabel: 'Export',
    icon: '📦',
    description: 'EEI/AES + 8 docs, denied party screening required',
    transportMode: 'sea',
    direction: 'outbound',
    group: 'export',
  },
  {
    id: 'in_bond',
    label: 'In-Bond / T&E',
    shortLabel: 'In-Bond',
    icon: '🔒',
    description: 'CBP Form 7512 workflow',
    transportMode: 'sea',
    direction: 'transit',
    group: 'other',
  },
];

export type DocRequirementStatus = 'required' | 'conditional' | 'optional';

export interface DocRequirement {
  id: string;
  name: string;
  status: DocRequirementStatus;
  /** Who creates/provides this document */
  source: string;
  /** Plain-English explanation */
  whatItIs: string;
  /** Why this specific mode requires it */
  whyRequired: string;
  /** What must be on the document */
  mustContain: string[];
  /** Top mistakes */
  commonMistakes: string[];
  /** Penalty for missing or incorrect */
  penalty: string;
  /** When this doc is conditionally required */
  condition?: string;
  /** Commodity types that trigger this requirement */
  commodityTriggers?: string[];
  /** Country-of-origin triggers */
  originTriggers?: string[];
}

export interface ModeDocProfile {
  modeId: ShipmentModeId;
  required: DocRequirement[];
  conditional: DocRequirement[];
  optional: DocRequirement[];
  filingDeadlines: FilingDeadline[];
  keyRisks: KeyRisk[];
}

export interface FilingDeadline {
  name: string;
  rule: string;
  penalty: string;
  /** Hours relative to departure (negative = before) or arrival (positive = after) */
  offsetHours: number;
  offsetFrom: 'departure' | 'arrival';
}

export interface KeyRisk {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  averageFine: string;
  preventionTip: string;
}

// ──────────────────────────────────────────
// Ocean Import Document Profile
// ──────────────────────────────────────────
const OCEAN_IMPORT_REQUIRED: DocRequirement[] = [
  {
    id: 'commercial_invoice',
    name: 'Commercial Invoice',
    status: 'required',
    source: 'Foreign supplier / exporter',
    whatItIs: 'The primary document establishing the transaction value between buyer and seller. CBP uses it to assess duties and verify the declared value of imported goods.',
    whyRequired: 'CBP requires a commercial invoice for every formal import entry (19 CFR 141.86). Without it, your entry cannot be filed and goods will be held at the port.',
    mustContain: [
      'Seller and buyer names and addresses',
      'Detailed description of merchandise (not just "goods" or "parts")',
      'Quantity with unit of measure',
      'Unit price and total value in transaction currency',
      'Currency of transaction',
      'Country of origin of goods',
      'Terms of sale (Incoterm)',
    ],
    commonMistakes: [
      'Vague descriptions like "assorted merchandise" or "samples" — CBP will reject',
      'Missing or incorrect Incoterm — affects how CBP calculates dutiable value',
      'Value stated in wrong currency without conversion rate',
    ],
    penalty: 'Entry cannot be filed. Goods held at port accruing storage charges ($150-300/day for containers).',
  },
  {
    id: 'packing_list',
    name: 'Packing List',
    status: 'required',
    source: 'Foreign supplier / exporter',
    whatItIs: 'Itemized list showing how goods are packed — quantities per carton, weights, dimensions. CBP uses it to verify cargo matches the invoice and to select examination targets.',
    whyRequired: 'Required for all ocean imports. CBP compares it against the commercial invoice and bill of lading to detect discrepancies that may indicate smuggling or fraud.',
    mustContain: [
      'Carton/case marks and numbers',
      'Contents of each carton with quantities',
      'Net and gross weights per carton',
      'Total number of packages',
      'Dimensions if volumetric billing applies',
    ],
    commonMistakes: [
      'Packing list totals don\'t match invoice totals — triggers examination',
      'Missing carton marks — CBP cannot locate specific cartons during exam',
      'Net weight vs gross weight confusion',
    ],
    penalty: 'Discrepancies between packing list and invoice trigger CBP intensive examination ($4,000-$8,000 exam fee).',
  },
  {
    id: 'bill_of_lading',
    name: 'Bill of Lading (B/L)',
    status: 'required',
    source: 'Ocean carrier / steamship line',
    whatItIs: 'Contract of carriage between shipper and ocean carrier. Acts as receipt for goods and document of title. The B/L number is used to track the shipment through CBP systems.',
    whyRequired: 'Required for all ocean imports. The Master B/L (or House B/L for LCL) must match the ISF filing and customs entry. CBP uses the B/L to verify carrier manifests.',
    mustContain: [
      'Shipper and consignee names matching invoice',
      'Notify party details',
      'Port of loading and port of discharge',
      'Container number(s) and seal number(s)',
      'Number of packages and description matching packing list',
      'Freight terms (prepaid or collect)',
    ],
    commonMistakes: [
      'Consignee on B/L doesn\'t match importer of record — entry rejected',
      'Container/seal mismatch between B/L and actual cargo — intensive exam',
      'Using "To Order" B/L without proper endorsement chain',
    ],
    penalty: 'Entry cannot be filed without valid B/L. Mismatch triggers hold and potential seizure for suspected smuggling.',
  },
  {
    id: 'isf_filing',
    name: 'ISF 10+2 Filing',
    status: 'required',
    source: 'Customs broker files on behalf of importer',
    whatItIs: 'Importer Security Filing — advance cargo security data submitted to CBP before vessel departure. Contains 10 data elements from the importer and 2 from the carrier.',
    whyRequired: 'Mandatory for ALL ocean imports since 2009 (19 CFR 149). Must be filed at least 24 hours before vessel departure from foreign port. This is a national security requirement.',
    mustContain: [
      'Manufacturer/supplier name and address',
      'Seller name and address',
      'Buyer name and address',
      'Ship-to name and address',
      'Container stuffing location',
      'Consolidator name and address',
      'HS code (6-digit minimum)',
      'Country of origin',
      'Importer of record number',
      'Consignee number',
    ],
    commonMistakes: [
      'Filed after vessel departure — automatic $5,000 penalty per violation',
      'HS code on ISF doesn\'t match entry — liquidated damages claim',
      'Using generic "manufacturer" when goods came from a trading company',
    ],
    penalty: '$5,000 per violation for late or inaccurate filing. Repeated violations: $10,000 per violation + cargo hold.',
  },
  {
    id: 'customs_bond',
    name: 'Customs Bond (CBP Form 301)',
    status: 'required',
    source: 'Surety company, arranged by customs broker',
    whatItIs: 'Financial guarantee ensuring the importer will pay all duties, taxes, and penalties. Either a single-entry bond (for one shipment) or continuous bond (covers all entries for a year).',
    whyRequired: 'Required for ALL formal entries (goods valued over $2,500). The bond amount must be sufficient to cover potential duties. CBP will not release goods without an active bond.',
    mustContain: [
      'Importer of record name and number',
      'Bond type (single entry or continuous)',
      'Bond amount (minimum 10% of duties paid in prior year)',
      'Surety company name and code',
      'Effective dates',
    ],
    commonMistakes: [
      'Bond has expired — entry rejected, goods held at port',
      'Bond amount insufficient for high-duty shipments — CBP requires additional security',
      'Wrong importer number on bond vs. entry — rejection',
    ],
    penalty: 'No bond = no entry filing = goods held. Storage charges accrue immediately ($150-300/day). Bond insufficiency: CBP holds goods until additional security posted.',
  },
  {
    id: 'entry_summary',
    name: 'Entry Summary (CBP Form 7501)',
    status: 'required',
    source: 'Customs broker prepares and files',
    whatItIs: 'The formal customs entry document filed with CBP. Contains the HS classification, declared value, duty rate, and calculated duties owed. This is the legal declaration.',
    whyRequired: 'The Entry Summary is the legal filing that determines duties owed. Must be filed within 10 working days of entry (15 calendar days for most entries). CBP uses it for duty assessment and trade statistics.',
    mustContain: [
      'Entry number and entry type',
      'Importer of record number',
      'HTS code(s) to 10-digit level',
      'Entered value (transaction value adjusted per Incoterm)',
      'Duty rate and calculated duty amount',
      'Country of origin',
      'Manufacturer ID (MID)',
    ],
    commonMistakes: [
      'Wrong HTS code — incorrect duty rate, potential penalty for negligence',
      'Entered value doesn\'t match invoice — triggers post-entry audit',
      'Missing or incorrect MID — CBP cannot verify manufacturer',
    ],
    penalty: 'Late filing: penalty up to domestic value of goods. Incorrect classification: 20% penalty for negligence, 40% for gross negligence, 80% for fraud.',
  },
];

const OCEAN_IMPORT_CONDITIONAL: DocRequirement[] = [
  {
    id: 'certificate_of_origin',
    name: 'Certificate of Origin',
    status: 'conditional',
    source: 'Exporter or chamber of commerce in origin country',
    whatItIs: 'Official document certifying where goods were manufactured or substantially transformed. Required to claim preferential duty rates under Free Trade Agreements.',
    whyRequired: 'Without a valid COO, you pay the general (MFN) duty rate instead of the preferential FTA rate. For many goods, this is the difference between 0% and 10-25% duty.',
    mustContain: [
      'Exporter and producer names',
      'HS code matching the entry',
      'Origin criteria met (wholly obtained, tariff shift, regional value content)',
      'Authorized signature and date',
      'Blanket period if covering multiple shipments',
    ],
    commonMistakes: [
      'COO HS code doesn\'t match entry HS code — FTA claim denied',
      'Signed by unauthorized person — invalid, duties assessed at full rate',
      'Blanket COO expired — must obtain new one for current shipment',
    ],
    penalty: 'Full MFN duty rate applied instead of preferential rate. On a $100,000 shipment with 15% duty difference, that\'s $15,000 in unnecessary duties.',
    condition: 'Required when claiming preferential duty rates under any FTA (USMCA, CTPA, KORUS, etc.)',
  },
  {
    id: 'fda_prior_notice',
    name: 'FDA Prior Notice',
    status: 'conditional',
    source: 'Customs broker or importer files via FDA FURLS system',
    whatItIs: 'Advance notification to FDA that a food, cosmetic, drug, or medical device shipment is arriving. FDA uses this to screen for safety risks before goods arrive.',
    whyRequired: 'Bioterrorism Act of 2002 requires prior notice for all FDA-regulated articles. Must be submitted before arrival — ocean: 8 hours before arrival for containers, 24 hours for bulk.',
    mustContain: [
      'FDA product code',
      'Manufacturer and shipper information',
      'Country of production',
      'Anticipated arrival information',
      'Description including FDA-recognized common name',
    ],
    commonMistakes: [
      'Filed after arrival — automatic refusal, goods sent back at importer expense',
      'Wrong FDA product code — refusal without physical exam',
      'Missing country of production — common for multi-country supply chains',
    ],
    penalty: 'Goods refused admission. Detention and re-export at importer\'s cost ($3,000-$15,000). Repeated violations: Import Alert listing.',
    condition: 'Required for food, beverages, cosmetics, drugs, medical devices, tobacco, and dietary supplements',
    commodityTriggers: ['food', 'beverage', 'cosmetic', 'pharmaceutical', 'medical_device', 'dietary_supplement'],
  },
  {
    id: 'lacey_act_declaration',
    name: 'Lacey Act Declaration',
    status: 'conditional',
    source: 'Importer completes declaration form',
    whatItIs: 'Declaration identifying the species, country of harvest, and quantity of plant/wood material in imported products. Combats illegal logging and wildlife trafficking.',
    whyRequired: 'Required for ALL products containing plant material — furniture, paper, musical instruments, packaging. Surprisingly broad scope catches many importers off guard.',
    mustContain: [
      'Scientific name of plant species',
      'Country of harvest',
      'Quantity and unit of measure',
      'Value of plant components',
    ],
    commonMistakes: [
      'Not filing because product "isn\'t wood" — paper, bamboo, cotton all qualify',
      'Using common name instead of scientific name',
      'Not knowing country of harvest for composite products',
    ],
    penalty: 'Civil penalty up to $10,000 per violation. Criminal penalties for trafficking: up to $250,000 and 5 years imprisonment.',
    condition: 'Required for products containing plant or wood materials (furniture, paper products, textiles from plant fibers)',
    commodityTriggers: ['wood', 'furniture', 'paper', 'lumber', 'bamboo', 'cotton'],
  },
  {
    id: 'tsca_certification',
    name: 'TSCA Certification',
    status: 'conditional',
    source: 'Importer certifies compliance',
    whatItIs: 'Toxic Substances Control Act certification that imported chemicals comply with EPA regulations. Two types: positive (chemical is subject to TSCA and complies) or negative (chemical is not subject).',
    whyRequired: 'EPA requires TSCA certification for ALL chemical imports at time of entry. Without it, EPA can refuse the shipment or impose penalties.',
    mustContain: [
      'Statement of compliance or non-applicability',
      'CAS registry number for each chemical',
      'Importer certification signature',
    ],
    commonMistakes: [
      'Not realizing the product contains regulated chemicals (paints, adhesives, plastics)',
      'Using negative cert when positive cert is required',
      'Missing CAS numbers for chemical mixtures',
    ],
    penalty: 'EPA civil penalty up to $37,500 per day per violation. Goods refused entry.',
    condition: 'Required for chemical substances, mixtures, and articles containing regulated chemicals',
    commodityTriggers: ['chemical', 'paint', 'adhesive', 'plastic', 'resin', 'solvent'],
  },
  {
    id: 'ad_cvd_certificate',
    name: 'AD/CVD Deposit Certificate',
    status: 'conditional',
    source: 'Customs broker calculates; CBP assesses',
    whatItIs: 'Certification and cash deposit for goods subject to Antidumping (AD) or Countervailing Duty (CVD) orders. These are penalty duties on goods sold below fair market value or subsidized by foreign governments.',
    whyRequired: 'If your goods fall under an active AD/CVD order, you must pay cash deposits at entry. Rates can range from 0% to over 300% of entered value. Missing this creates massive liability.',
    mustContain: [
      'AD/CVD case number',
      'Applicable duty rate',
      'Cash deposit amount',
      'Manufacturer/exporter identification',
    ],
    commonMistakes: [
      'Not checking if product is covered by an AD/CVD order — broker must verify',
      'Using wrong manufacturer rate (all-others rate vs. company-specific rate)',
      'Evasion through transshipment — CBP actively investigates, criminal penalties apply',
    ],
    penalty: 'Retroactive duty assessment up to 5 years. EAPA investigation for evasion. Criminal penalties for fraud.',
    condition: 'Required when importing goods subject to active Antidumping or Countervailing Duty orders',
    originTriggers: ['CN', 'VN', 'IN', 'KR', 'TW', 'TH'],
  },
];

const OCEAN_IMPORT_OPTIONAL: DocRequirement[] = [
  {
    id: 'insurance_certificate',
    name: 'Insurance Certificate',
    status: 'optional',
    source: 'Insurance company or freight forwarder',
    whatItIs: 'Proof of cargo insurance covering loss or damage during transit. Not required by CBP but strongly recommended for high-value shipments.',
    whyRequired: 'While not a CBP requirement, cargo insurance protects against total loss. Ocean carrier liability is limited to $500 per package under COGSA.',
    mustContain: ['Policy number', 'Insured value', 'Coverage type', 'Named perils or all-risk'],
    commonMistakes: ['Assuming carrier is liable for full value — they are not', 'Coverage doesn\'t extend to port storage period'],
    penalty: 'No CBP penalty, but financial risk: uninsured container loss averages $50,000-$200,000.',
  },
  {
    id: 'arrival_notice',
    name: 'Arrival Notice',
    status: 'optional',
    source: 'Ocean carrier or NVOCC',
    whatItIs: 'Notification from the carrier that the vessel has arrived or is approaching the port of discharge. Includes container availability date and free time details.',
    whyRequired: 'Not filed with CBP but critical for logistics coordination. Triggers the demurrage/detention clock.',
    mustContain: ['Vessel and voyage', 'Container numbers', 'Free time expiration', 'Port terminal information'],
    commonMistakes: ['Ignoring free time deadlines — demurrage starts immediately after', 'Not coordinating trucking with free time window'],
    penalty: 'No CBP penalty, but demurrage/detention charges: $150-$400/day per container after free time expires.',
  },
];

const OCEAN_IMPORT_DEADLINES: FilingDeadline[] = [
  { name: 'ISF 10+2', rule: 'Must be filed 24 hours before vessel departure from foreign port', penalty: '$5,000 per violation', offsetHours: -24, offsetFrom: 'departure' },
  { name: 'Customs Entry', rule: 'Must be filed within 15 calendar days of cargo arrival', penalty: 'Goods placed in General Order warehouse', offsetHours: 15 * 24, offsetFrom: 'arrival' },
  { name: 'Entry Summary', rule: 'Must be filed within 10 working days of entry', penalty: 'Liquidated damages and additional duty assessment', offsetHours: 14 * 24, offsetFrom: 'arrival' },
  { name: 'FDA Prior Notice', rule: '8 hours before arrival for containers, 24 hours for bulk', penalty: 'Goods refused admission at port', offsetHours: -8, offsetFrom: 'arrival' },
];

const OCEAN_IMPORT_RISKS: KeyRisk[] = [
  { title: 'Late ISF Filing', description: 'Filing the Importer Security Filing after the vessel has departed the foreign port', severity: 'critical', averageFine: '$5,000', preventionTip: 'File ISF as soon as booking is confirmed — do not wait for B/L' },
  { title: 'HS Code Misclassification', description: 'Incorrect tariff classification leading to wrong duty rate', severity: 'high', averageFine: '$2,000–$50,000', preventionTip: 'Use HS Assist to verify classification before filing entry' },
  { title: 'Value Discrepancy', description: 'Declared value on entry doesn\'t match commercial invoice', severity: 'high', averageFine: '20% of underpaid duties', preventionTip: 'Cross-reference invoice value with B/L and packing list totals' },
  { title: 'Missing AD/CVD Deposits', description: 'Failing to pay required antidumping or countervailing duty deposits', severity: 'critical', averageFine: 'Up to 300% of entered value', preventionTip: 'Check AD/CVD scope rulings for every HS code from high-risk origins' },
  { title: 'Country of Origin Fraud', description: 'Goods transshipped to avoid AD/CVD duties or Section 301 tariffs', severity: 'critical', averageFine: 'Criminal penalties + seizure', preventionTip: 'Verify manufacturer and confirm COO documentation is legitimate' },
];

// ──────────────────────────────────────────
// Air Import Document Profile
// ──────────────────────────────────────────
const AIR_IMPORT_REQUIRED: DocRequirement[] = [
  {
    id: 'commercial_invoice',
    name: 'Commercial Invoice',
    status: 'required',
    source: 'Foreign supplier / exporter',
    whatItIs: 'Primary transaction document for assessing duties. Same requirements as ocean but air shipments often have higher per-unit values.',
    whyRequired: 'Required for all formal entries (19 CFR 141.86). Air imports are processed faster, so invoice must be available before arrival.',
    mustContain: ['Seller/buyer names', 'Itemized descriptions', 'Quantities and values', 'Country of origin', 'Incoterm'],
    commonMistakes: ['Pro-forma invoice used instead of commercial — CBP rejects', 'Consolidated invoice covering multiple HAWB without breakdown'],
    penalty: 'Entry cannot be filed. Goods held in airline bonded warehouse ($0.50-$2.00/kg/day).',
  },
  {
    id: 'air_waybill',
    name: 'Air Waybill (AWB / HAWB)',
    status: 'required',
    source: 'Airline carrier (MAWB) or freight forwarder (HAWB)',
    whatItIs: 'Contract of carriage for air freight. Unlike ocean B/L, an air waybill is NOT a document of title — goods can be released to consignee without surrendering the original.',
    whyRequired: 'CBP requires the AWB number for all air entries. The MAWB/HAWB structure must be correctly declared to match carrier manifests.',
    mustContain: ['Shipper and consignee', 'Origin and destination airports', 'Number of pieces and weight', 'Nature and quantity of goods', 'AWB number (11 digits)'],
    commonMistakes: ['Using MAWB when HAWB should be declared (consolidated shipments)', 'Weight on AWB doesn\'t match packing list — triggers examination', 'Missing or incorrect airport codes'],
    penalty: 'Entry rejected. Goods held in airline bonded facility until corrected.',
  },
  {
    id: 'packing_list',
    name: 'Packing List',
    status: 'required',
    source: 'Foreign supplier / exporter',
    whatItIs: 'Itemized list of package contents. Especially critical for air freight where goods are often consolidated.',
    whyRequired: 'CBP uses packing list to verify goods match AWB and invoice. For consolidated air shipments, each HAWB must have its own packing list.',
    mustContain: ['Piece count matching AWB', 'Individual item descriptions', 'Weights per package', 'Marks and numbers if applicable'],
    commonMistakes: ['Single packing list for consolidated shipment with multiple HAWBs', 'Piece count mismatch with AWB'],
    penalty: 'Discrepancies trigger examination. Air cargo exam fees: $500-$2,000.',
  },
  {
    id: 'customs_bond',
    name: 'Customs Bond',
    status: 'required',
    source: 'Surety company',
    whatItIs: 'Same as ocean — financial guarantee for duties, taxes, and penalties. Required for formal entries over $2,500.',
    whyRequired: 'No bond = no entry. Air cargo moves faster, so bond must be confirmed before goods arrive.',
    mustContain: ['Importer of record number', 'Bond type', 'Sufficient amount', 'Active dates'],
    commonMistakes: ['Expired bond not caught until cargo arrives — overnight delay to obtain new bond', 'Insufficient bond amount for high-duty goods'],
    penalty: 'Entry cannot be filed. Airline warehouse charges accrue while bond issues resolved.',
  },
  {
    id: 'entry_summary',
    name: 'Entry Summary (CBP Form 7501)',
    status: 'required',
    source: 'Customs broker',
    whatItIs: 'Formal entry filing with CBP. For air imports, often filed simultaneously with entry to expedite release.',
    whyRequired: 'Legal requirement for all formal entries. Air cargo eligible for same-day release if entry filed before arrival.',
    mustContain: ['HTS codes', 'Entered value', 'Duty calculation', 'Country of origin', 'MID'],
    commonMistakes: ['Same as ocean — classification errors, value discrepancies'],
    penalty: 'Same as ocean — up to domestic value of goods for negligence.',
  },
];

const AIR_IMPORT_DEADLINES: FilingDeadline[] = [
  { name: 'ACAS Filing', rule: 'Advance air cargo screening data — required before loading at foreign airport', penalty: 'Cargo not loaded on aircraft', offsetHours: -4, offsetFrom: 'departure' },
  { name: 'Customs Entry', rule: 'Can be filed before arrival for same-day release', penalty: 'Goods held in airline bonded warehouse', offsetHours: 0, offsetFrom: 'arrival' },
  { name: 'Entry Summary', rule: '10 working days from entry date', penalty: 'Liquidated damages', offsetHours: 14 * 24, offsetFrom: 'arrival' },
];

const AIR_IMPORT_RISKS: KeyRisk[] = [
  { title: 'HAWB/MAWB Confusion', description: 'Filing entry against wrong air waybill number in consolidated shipments', severity: 'high', averageFine: '$1,000–$5,000', preventionTip: 'Always confirm with forwarder whether to use HAWB or MAWB for entry' },
  { title: 'DG Declaration Missing', description: 'Dangerous goods (batteries, chemicals) shipped without required IATA DG documentation', severity: 'critical', averageFine: '$10,000+', preventionTip: 'Screen all commodities for DG classification before booking air freight' },
  { title: 'FDA Prior Notice Late', description: 'FDA-regulated goods arriving by air without advance prior notice', severity: 'high', averageFine: '$3,000–$15,000', preventionTip: 'File FDA prior notice as soon as flight booking confirmed' },
];

// ──────────────────────────────────────────
// U.S. Export Document Profile
// ──────────────────────────────────────────
const US_EXPORT_REQUIRED: DocRequirement[] = [
  {
    id: 'commercial_invoice',
    name: 'Commercial Invoice',
    status: 'required',
    source: 'U.S. exporter',
    whatItIs: 'Invoice documenting the export transaction. Required by destination country\'s customs authority for import clearance.',
    whyRequired: 'While CBP doesn\'t require it for export filing, the destination country needs it. Missing invoice = goods stuck at destination.',
    mustContain: ['Exporter and consignee', 'Country of ultimate destination', 'Itemized descriptions with HS codes', 'Values and quantities', 'End-use statement if required'],
    commonMistakes: ['Not including destination country\'s required fields', 'Missing end-use certificate for dual-use goods'],
    penalty: 'Goods held at destination. Relationship damage with overseas buyer.',
  },
  {
    id: 'aes_filing',
    name: 'AES/EEI Filing (Electronic Export Information)',
    status: 'required',
    source: 'U.S. exporter or freight forwarder files via AESDirect',
    whatItIs: 'Electronic filing with Census Bureau reporting the export. Required for shipments over $2,500 per Schedule B code or any shipment requiring an export license.',
    whyRequired: 'Legal requirement under Foreign Trade Regulations (15 CFR 30). The Internal Transaction Number (ITN) must be provided to the carrier before export.',
    mustContain: ['USPPI (U.S. Principal Party in Interest)', 'Ultimate consignee', 'Schedule B number', 'Value and quantity', 'Country of ultimate destination', 'Export license info if applicable'],
    commonMistakes: ['Not filing because value is "close to $2,500" — each line item assessed separately', 'Wrong ECCN for dual-use technology exports', 'Filing after export date — routed transaction confusion'],
    penalty: '$10,000 per violation for late or missing filing. Criminal penalties up to $250,000 and 10 years for willful violations.',
  },
  {
    id: 'shipper_letter_of_instruction',
    name: 'Shipper\'s Letter of Instruction (SLI)',
    status: 'required',
    source: 'U.S. exporter provides to forwarder',
    whatItIs: 'Written instructions from the exporter to the freight forwarder authorizing them to act as agent for export filing and cargo handling.',
    whyRequired: 'Required when using a forwarder as agent for AES filing. Establishes the legal authority chain for export compliance.',
    mustContain: ['Exporter details', 'Consignee details', 'Commodity description', 'Authorization for forwarder to file AES', 'Special instructions'],
    commonMistakes: ['No SLI but forwarder files AES — compliance gap in routed export transactions', 'SLI details don\'t match AES filing'],
    penalty: 'Compliance gap that can result in penalties during BIS/Census audit.',
  },
];

const US_EXPORT_DEADLINES: FilingDeadline[] = [
  { name: 'AES/EEI Filing', rule: 'Must be filed and ITN obtained before cargo is delivered to carrier', penalty: '$10,000 per violation', offsetHours: -48, offsetFrom: 'departure' },
  { name: 'Export License', rule: 'Must be obtained BEFORE any export activity (marketing, shipping, technical data transfer)', penalty: 'Criminal penalties up to $250,000', offsetHours: -72, offsetFrom: 'departure' },
];

const US_EXPORT_RISKS: KeyRisk[] = [
  { title: 'Denied Party Screening Failure', description: 'Exporting to a person or entity on U.S. sanctions/denied party lists', severity: 'critical', averageFine: '$300,000+', preventionTip: 'Screen all parties against consolidated denied party lists before every shipment' },
  { title: 'Missing Export License', description: 'Exporting controlled goods without required BIS or DDTC license', severity: 'critical', averageFine: '$250,000+', preventionTip: 'Classify all goods under EAR/ITAR before booking — do not assume NLR' },
  { title: 'Destination Control Statement Missing', description: 'Shipping documents lack required DCS for controlled items', severity: 'high', averageFine: '$10,000', preventionTip: 'Add DCS to all commercial documents for items classified under EAR' },
];

// ──────────────────────────────────────────
// In-Bond / T&E Profile
// ──────────────────────────────────────────
const IN_BOND_REQUIRED: DocRequirement[] = [
  {
    id: 'in_bond_application',
    name: 'In-Bond Application (CBP Form 7512)',
    status: 'required',
    source: 'Customs broker files electronically',
    whatItIs: 'Application to move goods under customs bond from one port to another without paying duties at the first port. Covers IT (Immediate Transportation), T&E (Transportation & Exportation), and IE (Immediate Exportation).',
    whyRequired: 'Legal requirement to move bonded cargo. Without it, goods must be entered at the port of arrival and duties paid immediately.',
    mustContain: ['In-bond type (IT, T&E, or IE)', 'Port of origin and destination', 'Carrier information', 'Bond reference', 'Merchandise description', 'Quantities and values'],
    commonMistakes: ['Wrong in-bond type selected — IT vs T&E have different rules', 'Bond not sufficient to cover in-bond movement', 'Exceeding the in-bond time limit (30 days for IT, varies for T&E)'],
    penalty: 'Goods seized if moved without valid in-bond. Bond forfeiture for violations. Liquidated damages.',
  },
  {
    id: 'bill_of_lading',
    name: 'Bill of Lading / Air Waybill',
    status: 'required',
    source: 'Carrier',
    whatItIs: 'Transport document showing the cargo routing. For in-bond movements, the B/L or AWB should show the ultimate destination, not just the port of arrival.',
    whyRequired: 'CBP matches the in-bond movement against the carrier manifest. The transport document must support the in-bond routing.',
    mustContain: ['Ultimate destination matching in-bond application', 'Container/tracking details', 'Consignee information'],
    commonMistakes: ['B/L shows port of arrival as destination instead of in-bond destination', 'Split shipments not properly documented for in-bond'],
    penalty: 'In-bond application rejected. Goods must be entered at port of arrival.',
  },
  {
    id: 'customs_bond',
    name: 'Customs Bond',
    status: 'required',
    source: 'Surety company',
    whatItIs: 'Bond must cover the in-bond movement in addition to the eventual entry. Continuous bond strongly recommended for frequent in-bond movements.',
    whyRequired: 'CBP requires bond coverage for the entire in-bond transit. If goods are not delivered to the destination port within the time limit, the bond is forfeited.',
    mustContain: ['Activity code covering in-bond', 'Sufficient amount', 'Active dates'],
    commonMistakes: ['Bond doesn\'t cover in-bond activity code', 'Single entry bond doesn\'t cover in-bond movement — need separate bond or continuous'],
    penalty: 'Bond forfeiture if in-bond not closed within time limit. Full duty amount plus penalties.',
  },
];

const IN_BOND_DEADLINES: FilingDeadline[] = [
  { name: 'In-Bond Application', rule: 'Must be filed before goods are moved from port of arrival', penalty: 'Goods cannot be moved — must be entered at arrival port', offsetHours: 0, offsetFrom: 'arrival' },
  { name: 'In-Bond Arrival', rule: 'Goods must arrive at destination port within 30 days (IT) or before vessel departure (T&E)', penalty: 'Bond forfeiture + liquidated damages', offsetHours: 30 * 24, offsetFrom: 'arrival' },
];

const IN_BOND_RISKS: KeyRisk[] = [
  { title: 'In-Bond Time Limit Exceeded', description: 'Goods not delivered to destination port within 30-day IT window', severity: 'critical', averageFine: 'Full bond forfeiture', preventionTip: 'Track in-bond movements actively and close them promptly at destination' },
  { title: 'Diversion Without Amendment', description: 'Changing the in-bond destination without filing an amendment', severity: 'high', averageFine: '$5,000–$10,000', preventionTip: 'Always amend the in-bond before changing carrier routing' },
];

// ──────────────────────────────────────────
// Assembled profiles
// ──────────────────────────────────────────
const PLACEHOLDER_PROFILE = (modeId: ShipmentModeId): ModeDocProfile => ({
  modeId,
  required: [],
  conditional: [],
  optional: [],
  filingDeadlines: [],
  keyRisks: [],
});

export const MODE_DOC_PROFILES: Record<ShipmentModeId, ModeDocProfile> = {
  ocean_import: {
    modeId: 'ocean_import',
    required: OCEAN_IMPORT_REQUIRED,
    conditional: OCEAN_IMPORT_CONDITIONAL,
    optional: OCEAN_IMPORT_OPTIONAL,
    filingDeadlines: OCEAN_IMPORT_DEADLINES,
    keyRisks: OCEAN_IMPORT_RISKS,
  },
  air_import: {
    modeId: 'air_import',
    required: AIR_IMPORT_REQUIRED,
    conditional: [],
    optional: [],
    filingDeadlines: AIR_IMPORT_DEADLINES,
    keyRisks: AIR_IMPORT_RISKS,
  },
  land_import_mexico: PLACEHOLDER_PROFILE('land_import_mexico'),
  land_import_canada: PLACEHOLDER_PROFILE('land_import_canada'),
  ocean_export: {
    modeId: 'ocean_export',
    required: US_EXPORT_REQUIRED,
    conditional: [],
    optional: [],
    filingDeadlines: US_EXPORT_DEADLINES,
    keyRisks: US_EXPORT_RISKS,
  },
  air_export: {
    modeId: 'air_export',
    required: US_EXPORT_REQUIRED,
    conditional: [],
    optional: [],
    filingDeadlines: US_EXPORT_DEADLINES,
    keyRisks: US_EXPORT_RISKS,
  },
  land_export_mexico: PLACEHOLDER_PROFILE('land_export_mexico'),
  land_export_canada: PLACEHOLDER_PROFILE('land_export_canada'),
  us_export: {
    modeId: 'us_export',
    required: US_EXPORT_REQUIRED,
    conditional: [],
    optional: [],
    filingDeadlines: US_EXPORT_DEADLINES,
    keyRisks: US_EXPORT_RISKS,
  },
  in_bond: {
    modeId: 'in_bond',
    required: IN_BOND_REQUIRED,
    conditional: [],
    optional: [],
    filingDeadlines: IN_BOND_DEADLINES,
    keyRisks: IN_BOND_RISKS,
  },
};

/** Get applicable conditional docs based on commodity and origin */
export function getApplicableConditionalDocs(
  profile: ModeDocProfile,
  commodity?: string,
  originCountry?: string
): DocRequirement[] {
  return profile.conditional.filter(doc => {
    if (doc.commodityTriggers && commodity) {
      const lower = commodity.toLowerCase();
      if (doc.commodityTriggers.some(t => lower.includes(t))) return true;
    }
    if (doc.originTriggers && originCountry) {
      const upper = originCountry.toUpperCase();
      if (doc.originTriggers.includes(upper)) return true;
    }
    // If no triggers defined, always show
    if (!doc.commodityTriggers && !doc.originTriggers) return true;
    return false;
  });
}
