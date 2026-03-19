// Comprehensive compliance profiles for 17 countries in Orchestra's network

export type TransportMode = 'air' | 'sea' | 'land';
export type Direction = 'inbound' | 'outbound';

export interface CustomsAuthority {
  name: string;
  filingSystem: string;
  processingTime: string;
  enforcementPriorities: string[];
}

export interface RequiredDocument {
  name: string;
  modes: TransportMode[];
  directions: Direction[];
  helpKey?: string;
}

export interface FilingRequirement {
  rule: string;
  detail: string;
  modes: TransportMode[];
  directions: Direction[];
}

export interface TradeAgreement {
  name: string;
  partners: string[];
}

export interface DutiesTariffs {
  overview: string;
  tradeAgreements: TradeAgreement[];
}

export interface RestrictedGoods {
  licensedCategories: string[];
  prohibitedCategories: string[];
  specialCertifications: string[];
}

export interface CommonViolation {
  title: string;
  detail: string;
}

export interface RegulatoryChange {
  date: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CountryComplianceProfile {
  code: string;
  name: string;
  flag: string;
  authority: CustomsAuthority;
  requiredDocuments: RequiredDocument[];
  filingRequirements: FilingRequirement[];
  dutiesTariffs: DutiesTariffs;
  restrictedGoods: RestrictedGoods;
  commonViolations: CommonViolation[];
  regulatoryChanges: RegulatoryChange[];
}

export const COMPLIANCE_COUNTRIES: CountryComplianceProfile[] = [
  {
    code: 'US', name: 'United States', flag: '🇺🇸',
    authority: {
      name: 'U.S. Customs and Border Protection (CBP)',
      filingSystem: 'Automated Commercial Environment (ACE)',
      processingTime: '1–5 business days (standard), 24h (express)',
      enforcementPriorities: [
        'Forced labor compliance (UFLPA)',
        'Fentanyl/narcotics interdiction',
        'Intellectual property rights enforcement',
        'Country of origin verification',
        'Antidumping/countervailing duty enforcement',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound'] },
      { name: 'CBP Form 7501 (Entry Summary)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'ISF 10+2 (Importer Security Filing)', modes: ['sea'], directions: ['inbound'] },
      { name: 'Customs Bond (>$2,500 value)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'FDA Prior Notice (food/medical)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Shipper\'s Export Declaration (SED/EEI)', modes: ['air','sea','land'], directions: ['outbound'] },
      { name: 'AES Filing (>$2,500 exports)', modes: ['air','sea','land'], directions: ['outbound'] },
    ],
    filingRequirements: [
      { rule: 'ISF 10+2 Filing', detail: 'Must be filed 24 hours before vessel departure for ocean shipments', modes: ['sea'], directions: ['inbound'] },
      { rule: 'ACE Electronic Filing', detail: 'All entries must be filed electronically through ACE portal', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'FDA Prior Notice', detail: 'Food shipments require prior notice 15 days before arrival (sea) or 4 hours (air)', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'AES/EEI Filing', detail: 'Required for exports >$2,500 or controlled items, filed via AESDirect', modes: ['air','sea','land'], directions: ['outbound'] },
      { rule: 'Customs Bond', detail: 'Continuous or single-entry bond required for imports >$2,500', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Harmonized Tariff Schedule (HTS) with ad valorem, specific, and compound duty rates. Average applied tariff ~3.4%. Section 301 tariffs on Chinese goods (7.5–25%). De minimis threshold $800.',
      tradeAgreements: [
        { name: 'USMCA', partners: ['CA','MX'] },
        { name: 'US-Korea FTA (KORUS)', partners: ['KR'] },
        { name: 'US-Japan Trade Agreement', partners: ['JP'] },
        { name: 'US-Singapore FTA', partners: ['SG'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Firearms & munitions', 'Dual-use technology (EAR)', 'Nuclear materials', 'Pharmaceuticals (FDA)', 'Pesticides (EPA)'],
      prohibitedCategories: ['Cuban cigars (sanctions)', 'Products from forced labor', 'Certain wildlife products (CITES)', 'Counterfeit goods'],
      specialCertifications: ['FCC certification (electronics)', 'DOT compliance (vehicles)', 'USDA phytosanitary certificate (agriculture)', 'CPSC compliance (consumer products)'],
    },
    commonViolations: [
      { title: 'Incorrect HTS classification', detail: 'Most common violation; 30% of entries have classification errors affecting duty rates' },
      { title: 'Missing or late ISF filing', detail: '$5,000 penalty per violation; CBP actively enforcing 24h rule' },
      { title: 'Undervaluation of goods', detail: 'Transaction value must include assists, royalties, and selling commissions' },
      { title: 'Country of origin misrepresentation', detail: 'Critical with Section 301 tariffs; substantial transformation rules apply' },
      { title: 'UFLPA forced labor violations', detail: 'Rebuttable presumption for Xinjiang-origin goods; requires extensive supply chain documentation' },
    ],
    regulatoryChanges: [
      { date: '2026-02-15', title: 'Section 301 Tariff Rate Adjustments', description: 'New tariff rates on Chinese semiconductors, EVs, and battery components effective March 2026', impact: 'high' },
      { date: '2026-01-20', title: 'De Minimis Reform Proposal', description: 'Proposed changes to $800 de minimis threshold for e-commerce shipments under review', impact: 'medium' },
      { date: '2026-03-01', title: 'UFLPA Entity List Update', description: '12 new entities added to UFLPA Entity List requiring enhanced due diligence', impact: 'high' },
    ],
  },
  {
    code: 'CO', name: 'Colombia', flag: '🇨🇴',
    authority: {
      name: 'Dirección de Impuestos y Aduanas Nacionales (DIAN)',
      filingSystem: 'MUISCA (Modelo Único de Ingresos, Servicio y Control Automatizado)',
      processingTime: '3–7 business days (standard), 24–48h (green channel)',
      enforcementPriorities: [
        'Value declaration accuracy',
        'Origin certificate verification',
        'Narcotics interdiction',
        'Transfer pricing scrutiny',
        'Controlled substance precursors',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'DEX Export Declaration', modes: ['air','sea','land'], directions: ['outbound'] },
      { name: 'Import Declaration (Declaración de Importación)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin (FTA)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'VUCE Authorization (controlled goods)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Registro Sanitario INVIMA (health products)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Phytosanitary Certificate (agriculture)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Insurance Certificate', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'MUISCA Electronic Filing', detail: 'All customs declarations must be filed through MUISCA portal', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Advance Cargo Manifest', detail: 'Must be filed 24h before vessel arrival for sea, 4h for air', modes: ['sea','air'], directions: ['inbound'] },
      { rule: 'VUCE Single Window', detail: 'Controlled goods require prior authorization through VUCE platform', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'RUT Registration', detail: 'All importers/exporters must have active RUT registration with DIAN', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'CAN Common External Tariff applies. Average tariff 5.6%. IVA (VAT) of 19% applies to most imports. Specific tariffs on agricultural products.',
      tradeAgreements: [
        { name: 'Pacific Alliance', partners: ['MX'] },
        { name: 'Colombia-US TPA', partners: ['US'] },
        { name: 'CAN (Andean Community)', partners: [] },
        { name: 'EU-Colombia FTA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'Colombia-South Korea FTA', partners: ['KR'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Chemical precursors', 'Firearms', 'Telecommunications equipment', 'Medical devices', 'Pesticides'],
      prohibitedCategories: ['Certain used vehicles', 'Hazardous waste', 'Counterfeit goods', 'Products violating IP rights'],
      specialCertifications: ['INVIMA Registro Sanitario (health products)', 'ICA phytosanitary certificate (agriculture)', 'MinAmbiente (chemicals)', 'MinMinas (hydrocarbons)'],
    },
    commonViolations: [
      { title: 'Value declaration discrepancies', detail: 'DIAN cross-references declared values against reference price database' },
      { title: 'Missing VUCE authorization', detail: 'Controlled goods shipped without prior VUCE approval face seizure' },
      { title: 'Incorrect origin certificate', detail: 'FTA origin claims require specific format and content per agreement' },
      { title: 'Late customs declaration filing', detail: 'Declarations not filed within required timeframe incur penalties' },
      { title: 'IVA calculation errors', detail: 'Base for IVA must include CIF value plus duties; errors trigger audits' },
    ],
    regulatoryChanges: [
      { date: '2026-02-01', title: 'MUISCA 2.0 Migration', description: 'New version of MUISCA filing system with updated form requirements', impact: 'high' },
      { date: '2026-01-15', title: 'Updated Reference Price Database', description: 'DIAN updated reference prices for 200+ tariff headings', impact: 'medium' },
    ],
  },
  {
    code: 'BR', name: 'Brazil', flag: '🇧🇷',
    authority: {
      name: 'Receita Federal do Brasil',
      filingSystem: 'SISCOMEX (Sistema Integrado de Comércio Exterior)',
      processingTime: '5–15 business days (high inspection rate), 2–3 days (green channel)',
      enforcementPriorities: [
        'Transfer pricing enforcement',
        'RADAR registration compliance',
        'Tax fraud detection (ICMS/IPI)',
        'Undervaluation scrutiny',
        'Environmental compliance',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'NF-e (Nota Fiscal Eletrônica)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'RADAR Registration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Import Declaration (DI)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'ANVISA Authorization (health/food)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'IBAMA License (environmental)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'INMETRO Certification (regulated products)', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'SISCOMEX Electronic Filing', detail: 'All import/export operations must be registered through SISCOMEX', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'RADAR Importer Registration', detail: 'Mandatory pre-registration for all importers; limited and unlimited modalities', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'NF-e Issuance', detail: 'Electronic invoice must be issued for all commercial transactions', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'DUIMP (New Import Declaration)', detail: 'Replacing traditional DI for single-window processing', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Mercosur Common External Tariff (TEC). Average tariff 11.2%. Complex tax structure: II (import duty), IPI (excise), PIS/COFINS (social contributions), ICMS (state VAT). High cumulative tax burden (often 50–100% of CIF).',
      tradeAgreements: [
        { name: 'Mercosur', partners: [] },
        { name: 'Mercosur-EU FTA (pending)', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'ALADI preferences', partners: ['CO','MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Pharmaceuticals (ANVISA)', 'Firearms', 'Pesticides', 'Radioactive materials', 'Used goods (case-by-case)'],
      prohibitedCategories: ['Used consumer goods (most categories)', 'Certain used vehicles', 'Asbestos products', 'Non-certified toys'],
      specialCertifications: ['ANVISA registration (health)', 'IBAMA license (environmental)', 'INMETRO certification (quality)', 'MAPA permit (agriculture)'],
    },
    commonViolations: [
      { title: 'Missing or expired RADAR registration', detail: 'No RADAR = no import clearance; must be renewed periodically' },
      { title: 'NF-e errors', detail: 'Discrepancies between NF-e and actual goods cause channel escalation' },
      { title: 'Transfer pricing non-compliance', detail: 'Brazil has unique transfer pricing rules; intercompany transactions heavily scrutinized' },
      { title: 'ICMS tax calculation errors', detail: 'State-level VAT varies by state and product; complex calculation' },
      { title: 'Missing ANVISA authorization', detail: 'Health/food products without ANVISA registration held indefinitely' },
    ],
    regulatoryChanges: [
      { date: '2026-02-20', title: 'DUIMP Expansion', description: 'DUIMP (single-window import declaration) expanded to cover all product categories', impact: 'high' },
      { date: '2026-01-10', title: 'Transfer Pricing Reform', description: 'New OECD-aligned transfer pricing rules entering full enforcement', impact: 'high' },
    ],
  },
  {
    code: 'CN', name: 'China', flag: '🇨🇳',
    authority: {
      name: 'General Administration of Customs of China (GACC)',
      filingSystem: 'Single Window (国际贸易单一窗口)',
      processingTime: '1–3 business days (green channel), 5–10 days (inspection)',
      enforcementPriorities: [
        'Food safety (GACC registration for foreign facilities)',
        'Export control on strategic goods',
        'IP rights enforcement at border',
        'VAT fraud detection',
        'Cross-border e-commerce regulation',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration Form', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'GACC Facility Registration (food)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'CIQ Inspection Certificate', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'CCC Certificate (regulated products)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Export License (controlled items)', modes: ['air','sea','land'], directions: ['outbound'] },
      { name: 'VAT Refund Documentation', modes: ['air','sea','land'], directions: ['outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    filingRequirements: [
      { rule: 'Single Window Filing', detail: 'All customs declarations through China Single Window platform', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Advance Manifest', detail: '24h pre-arrival manifest for sea cargo', modes: ['sea'], directions: ['inbound'] },
      { rule: 'GACC Registration', detail: 'Foreign food facilities must register with GACC before export to China', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'AEO Certification', detail: 'AEO-certified companies receive expedited clearance and reduced inspections', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'Most Favored Nation (MFN) tariff schedule. Average applied tariff 7.5%. VAT 13% (standard) or 9% (reduced). Consumption tax on luxury goods. Free Trade Zones offer duty deferral.',
      tradeAgreements: [
        { name: 'RCEP', partners: ['JP','KR','SG'] },
        { name: 'China-ASEAN FTA', partners: ['SG'] },
        { name: 'China-Korea FTA', partners: ['KR'] },
        { name: 'China-Hong Kong CEPA', partners: ['HK'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Rare earth elements (export)', 'Dual-use technology', 'Encryption products', 'Pharmaceuticals', 'Seeds/genetic resources'],
      prohibitedCategories: ['Used electronics (most)', 'Certain media content', 'Solid waste imports (National Sword)', 'Ozone-depleting substances'],
      specialCertifications: ['CCC mark (China Compulsory Certification)', 'CFDA registration (pharmaceuticals)', 'CIQ inspection (food/cosmetics)', 'MIIT approval (telecom equipment)'],
    },
    commonViolations: [
      { title: 'Missing GACC registration for food', detail: 'All foreign food facilities must be registered; unregistered shipments refused entry' },
      { title: 'Incorrect HS code classification', detail: 'China uses 10-digit codes; frequent mismatches with 6-digit international codes' },
      { title: 'Export control violations', detail: 'Rare earth, technology, and dual-use goods require export licenses' },
      { title: 'VAT refund documentation gaps', detail: 'Exporters must maintain complete documentation chain for VAT refund claims' },
      { title: 'CCC certification gaps', detail: 'Products in CCC catalog must have certification before import; heavy penalties for non-compliance' },
    ],
    regulatoryChanges: [
      { date: '2026-03-01', title: 'GACC Registration System Update', description: 'New online registration system for foreign food facilities with enhanced requirements', impact: 'high' },
      { date: '2026-02-10', title: 'Export Control List Expansion', description: 'Additional rare earth processing technologies added to export control list', impact: 'medium' },
    ],
  },
  {
    code: 'DE', name: 'Germany', flag: '🇩🇪',
    authority: {
      name: 'Generalzolldirektion (German Customs)',
      filingSystem: 'ATLAS (Automated Tariff and Local Customs Processing System) / EU TARIC',
      processingTime: '1–3 business days (standard), same-day (AEO)',
      enforcementPriorities: [
        'REACH chemical compliance',
        'CE marking verification',
        'Product safety standards',
        'Dual-use export controls',
        'VAT compliance for non-EU sellers',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'ENS (Entry Summary Declaration)', modes: ['sea','air'], directions: ['inbound'] },
      { name: 'Customs Declaration (SAD/ATLAS)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'REACH Compliance Declaration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'CE Declaration of Conformity', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'EUR.1 Movement Certificate (FTA)', modes: ['air','sea','land'], directions: ['outbound'] },
    ],
    filingRequirements: [
      { rule: 'ATLAS Electronic Filing', detail: 'All customs declarations via ATLAS system', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ENS Pre-Arrival Filing', detail: 'Entry Summary Declaration required before goods arrive in EU territory', modes: ['sea','air'], directions: ['inbound'] },
      { rule: 'ICS2 Advance Cargo Information', detail: 'Pre-loading advance cargo information for all transport modes', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'EORI Registration', detail: 'Mandatory Economic Operators Registration and Identification number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'EU Combined Tariff (TARIC). Average tariff 5.1%. Standard VAT 19% (reduced 7%). Anti-dumping duties on specific products. Duty suspension for certain raw materials.',
      tradeAgreements: [
        { name: 'EU-UK TCA', partners: ['GB'] },
        { name: 'EU-Japan EPA', partners: ['JP'] },
        { name: 'EU-South Korea FTA', partners: ['KR'] },
        { name: 'EU-Canada CETA', partners: ['CA'] },
        { name: 'EU-Singapore FTA', partners: ['SG'] },
        { name: 'EU-Colombia FTA', partners: ['CO'] },
        { name: 'EU-Mexico FTA', partners: ['MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Dual-use items', 'Firearms', 'Pharmaceuticals', 'Precursor chemicals', 'Cultural goods (export)'],
      prohibitedCategories: ['Products not meeting EU safety standards', 'Certain pesticides', 'Seal products', 'Cat/dog fur products'],
      specialCertifications: ['CE marking (regulated products)', 'REACH registration (chemicals)', 'RoHS compliance (electronics)', 'Organic certification (food)'],
    },
    commonViolations: [
      { title: 'REACH non-compliance', detail: 'Chemical substances must be registered; only representative required for non-EU manufacturers' },
      { title: 'Missing CE marking', detail: 'Products in regulated categories must bear CE mark with proper documentation' },
      { title: 'Incorrect EORI usage', detail: 'Using invalid or another entity\'s EORI number' },
      { title: 'ENS filing errors', detail: 'Incomplete or late Entry Summary Declarations cause cargo holds' },
      { title: 'Preferential origin claims without proof', detail: 'EUR.1 or origin declaration required for FTA preferential rates' },
    ],
    regulatoryChanges: [
      { date: '2026-03-15', title: 'ICS2 Release 3 Full Deployment', description: 'ICS2 advance cargo security filing now mandatory for all transport modes', impact: 'high' },
      { date: '2026-02-01', title: 'CBAM Reporting Phase', description: 'Carbon Border Adjustment Mechanism reporting requirements expanded', impact: 'medium' },
    ],
  },
  {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧',
    authority: {
      name: 'HM Revenue & Customs (HMRC)',
      filingSystem: 'Customs Declaration Service (CDS)',
      processingTime: '1–3 business days (standard), same-day (simplified procedures)',
      enforcementPriorities: [
        'Post-Brexit full customs declarations',
        'UKCA marking compliance',
        'Rules of Origin for EU/FTA trade',
        'VAT registration for non-UK sellers',
        'Sanctions enforcement',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI (GB) Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration (CDS)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Safety & Security Declaration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'UKCA Declaration of Conformity', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Import License (controlled goods)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Phytosanitary Certificate (agriculture)', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'CDS Electronic Filing', detail: 'Full customs declarations required through CDS (replaced CHIEF)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Safety & Security Declarations', detail: 'Pre-arrival/departure safety declarations required for all goods', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'GB EORI Registration', detail: 'UK-specific EORI required (separate from EU EORI)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Rules of Origin Documentation', detail: 'Supplier declarations needed to claim UK-EU TCA preferential tariffs', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'UK Global Tariff (UKGT). Average tariff 5.7%. Standard VAT 20%. Simplified tariff for de minimis imports. Developing country preferences via DCTS.',
      tradeAgreements: [
        { name: 'UK-EU TCA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'UK-Japan CEPA', partners: ['JP'] },
        { name: 'UK-Canada Continuity Agreement', partners: ['CA'] },
        { name: 'UK-Singapore FTA', partners: ['SG'] },
        { name: 'UK-South Korea FTA', partners: ['KR'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Firearms', 'Controlled drugs', 'Dual-use items', 'Military goods', 'Certain agricultural products'],
      prohibitedCategories: ['Offensive weapons', 'Indecent materials', 'Certain animal products', 'Hormone-treated meat'],
      specialCertifications: ['UKCA marking (replacing CE)', 'Food Standards Agency approval', 'APHA import license (animals)', 'Defra approval (plants)'],
    },
    commonViolations: [
      { title: 'Using CE instead of UKCA marking', detail: 'GB market now requires UKCA marking for most regulated products' },
      { title: 'Incorrect Rules of Origin claims', detail: 'UK-EU TCA requires specific cumulation and processing rules' },
      { title: 'Missing customs declarations (EU trade)', detail: 'Post-Brexit full declarations required for all EU-UK trade' },
      { title: 'VAT registration gaps (non-UK sellers)', detail: 'Overseas sellers must register for UK VAT for B2C sales' },
      { title: 'Northern Ireland Protocol errors', detail: 'Different rules apply for GB-NI movements under Windsor Framework' },
    ],
    regulatoryChanges: [
      { date: '2026-03-10', title: 'UKCA Marking Full Enforcement', description: 'CE marking grace period ended; UKCA required for all applicable products', impact: 'high' },
      { date: '2026-02-15', title: 'Windsor Framework Updates', description: 'Simplified procedures for GB-NI trade under updated Windsor Framework', impact: 'medium' },
    ],
  },
  {
    code: 'JP', name: 'Japan', flag: '🇯🇵',
    authority: {
      name: 'Japan Customs (税関)',
      filingSystem: 'NACCS (Nippon Automated Cargo and Port Consolidated System)',
      processingTime: '1–2 business days (standard), hours (AEO/pre-clearance)',
      enforcementPriorities: [
        'Quarantine and phytosanitary enforcement',
        'Food safety (labeling in Japanese)',
        'IP rights protection at border',
        'Advance filing compliance',
        'Nuclear/radiation screening',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Import Declaration (NACCS)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Food Sanitation Certificate (food)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Plant Quarantine Certificate', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'JIS/PSE Certification (regulated)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Japanese Labeling Documentation', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'NACCS Electronic Filing', detail: 'All customs procedures through NACCS system', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: '24-Hour Advance Cargo Reporting', detail: 'Advance Filing Rules require manifest data 24h before loading', modes: ['sea','air'], directions: ['inbound'] },
      { rule: 'Pre-Arrival Examination', detail: 'Import declaration can be filed before cargo arrives for expedited clearance', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'Japanese Labeling', detail: 'All consumer products must have Japanese-language labels before customs clearance', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Customs Tariff Law schedule. Average applied tariff 4.2%. Consumption tax 10% (8% on food). Preferential rates under numerous FTAs.',
      tradeAgreements: [
        { name: 'RCEP', partners: ['CN','KR','SG'] },
        { name: 'Japan-EU EPA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'US-Japan Trade Agreement', partners: ['US'] },
        { name: 'CPTPP', partners: ['CA','MX','SG'] },
        { name: 'Japan-UK CEPA', partners: ['GB'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Pharmaceuticals', 'Cosmetics', 'Medical devices', 'Firearms', 'Radio equipment'],
      prohibitedCategories: ['Narcotics', 'Counterfeit goods', 'Certain animal products', 'Goods violating IP rights'],
      specialCertifications: ['PSE mark (electrical products)', 'JIS certification (industrial standards)', 'MHLW approval (pharmaceuticals)', 'MAFF phytosanitary (agriculture)'],
    },
    commonViolations: [
      { title: 'Missing Japanese labeling', detail: 'Products must have Japanese labels for ingredients, origin, importer info' },
      { title: 'Food sanitation act violations', detail: 'Strict pesticide residue limits; positive list system' },
      { title: 'Late advance cargo filing', detail: '24h rule strictly enforced; late filings cause port delays' },
      { title: 'Incorrect tariff classification', detail: 'Japan uses unique statistical sub-headings beyond HS-6' },
      { title: 'PSE certification gaps', detail: 'Electrical products without PSE mark cannot be sold in Japan' },
    ],
    regulatoryChanges: [
      { date: '2026-03-05', title: 'NACCS System Upgrade', description: 'Enhanced NACCS filing with AI-assisted document verification', impact: 'medium' },
      { date: '2026-01-20', title: 'RCEP Rate Reductions', description: 'Scheduled tariff reductions under RCEP Year 4 commitments', impact: 'low' },
    ],
  },
  {
    code: 'KR', name: 'South Korea', flag: '🇰🇷',
    authority: {
      name: 'Korea Customs Service (KCS)',
      filingSystem: 'UNI-PASS (통관포털)',
      processingTime: '1–3 business days (standard), hours (AEO)',
      enforcementPriorities: [
        'FTA certificate of origin verification',
        'Cosmetics/food import regulations',
        'IP rights enforcement',
        'Anti-dumping duty collection',
        'E-commerce shipment screening',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Import Declaration (UNI-PASS)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'FTA Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'KC Certification (regulated products)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'KFDA Approval (food/cosmetics)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Korean Labeling Compliance', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'UNI-PASS Filing', detail: 'All customs procedures through UNI-PASS electronic system', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Pre-Arrival Filing', detail: 'Import declarations can be filed before cargo arrival', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'FTA Origin Verification', detail: 'Strict documentation requirements for FTA preferential tariff claims', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'Korean Labeling', detail: 'Consumer products must have Korean-language labels meeting KFDA requirements', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Customs Duty Act schedule. Average applied tariff 13.6% (higher on agricultural). VAT 10%. Extensive FTA network provides significant preferential rates.',
      tradeAgreements: [
        { name: 'KORUS FTA', partners: ['US'] },
        { name: 'EU-Korea FTA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'RCEP', partners: ['CN','JP','SG'] },
        { name: 'Korea-UK FTA', partners: ['GB'] },
        { name: 'Korea-Colombia FTA', partners: ['CO'] },
        { name: 'Korea-India CEPA', partners: ['IN'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Cosmetics', 'Food products', 'Pharmaceuticals', 'Medical devices', 'Wireless equipment'],
      prohibitedCategories: ['Counterfeit goods', 'Products harmful to public morals', 'Certain used goods', 'Ozone-depleting substances'],
      specialCertifications: ['KC mark (Korea Certification)', 'KFDA registration (food/cosmetics)', 'KCC certification (radio equipment)', 'KS mark (Korean standards)'],
    },
    commonViolations: [
      { title: 'Invalid FTA origin certificates', detail: 'KCS conducts post-clearance audits of origin claims; retroactive duty assessment' },
      { title: 'Cosmetics import violations', detail: 'Strict KFDA requirements for ingredient lists, labeling, and safety testing' },
      { title: 'KC certification gaps', detail: 'Regulated products without KC mark face import refusal' },
      { title: 'Undervaluation detection', detail: 'KCS uses AI-based risk scoring for valuation analysis' },
      { title: 'Korean labeling non-compliance', detail: 'All consumer products must have compliant Korean labels' },
    ],
    regulatoryChanges: [
      { date: '2026-02-25', title: 'UNI-PASS AI Enhancement', description: 'AI-powered risk assessment for faster AEO clearance', impact: 'low' },
      { date: '2026-01-15', title: 'RCEP Tariff Schedule Year 4', description: 'Additional tariff reductions under RCEP implementation schedule', impact: 'medium' },
    ],
  },
  {
    code: 'NL', name: 'Netherlands', flag: '🇳🇱',
    authority: {
      name: 'Douane (Dutch Customs)',
      filingSystem: 'AGS (Automated Customs Declaration System) / EU TARIC',
      processingTime: '1–2 business days (standard), hours (AEO)',
      enforcementPriorities: [
        'Rotterdam hub cargo screening',
        'ICS2 advance cargo security',
        'AEO status verification',
        'Drug interdiction',
        'EU sanctions enforcement',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration (AGS)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'ENS/ICS2 Filing', modes: ['sea','air'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Dutch VAT Registration', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'AGS Electronic Filing', detail: 'Customs declarations through AGS (Dutch automated system)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ICS2 Pre-Loading Filing', detail: 'Advance cargo information required before loading at origin', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'AEO Benefits', detail: 'AEO-certified entities receive reduced inspections and priority processing at Rotterdam', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Fiscal Representation', detail: 'Non-EU entities may need fiscal representative for VAT purposes', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'EU Combined Tariff (TARIC) applies. VAT 21% (9% reduced). Netherlands is major EU entry point—goods cleared here can move freely within EU.',
      tradeAgreements: [
        { name: 'EU FTA Network', partners: ['GB','JP','KR','CA','SG','CO','MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Dual-use items', 'Pharmaceuticals', 'Precursor chemicals', 'Firearms', 'Strategic goods'],
      prohibitedCategories: ['Products not meeting EU standards', 'Certain pesticides', 'Goods from sanctioned entities'],
      specialCertifications: ['CE marking', 'REACH compliance', 'Phytosanitary certificate (plants)', 'NVWA approval (food)'],
    },
    commonViolations: [
      { title: 'ICS2 filing errors at Rotterdam', detail: 'High volume hub; filing errors cause cascading delays' },
      { title: 'Missing fiscal representation', detail: 'Non-EU companies importing through NL need fiscal representative' },
      { title: 'Transit procedure errors', detail: 'T1/T2 transit procedures must be properly opened and closed' },
      { title: 'AEO documentation gaps', detail: 'AEO applications increasingly scrutinized' },
      { title: 'VAT import scheme errors', detail: 'Article 23 VAT postponement requires precise documentation' },
    ],
    regulatoryChanges: [
      { date: '2026-03-01', title: 'ICS2 Full Rollout Maritime', description: 'ICS2 Release 3 now mandatory for all maritime cargo at Rotterdam', impact: 'high' },
    ],
  },
  {
    code: 'MX', name: 'Mexico', flag: '🇲🇽',
    authority: {
      name: 'Servicio de Administración Tributaria / ADUANAS (SAT)',
      filingSystem: 'VUCEM (Ventanilla Única de Comercio Exterior Mexicano)',
      processingTime: '1–5 business days (standard), same-day (IMMEX/AEO)',
      enforcementPriorities: [
        'Pedimento filing compliance',
        'NOM standards verification',
        'IMMEX program oversight',
        'Undervaluation detection',
        'Country of origin verification (Section 301 circumvention)',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Pedimento (Customs Entry Document)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill / CMR', modes: ['sea','air','land'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin (USMCA)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'NOM Compliance Certificate', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'IMMEX Authorization (maquiladora)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Sanitary Permit SENASICA (food/ag)', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'VUCEM Single Window', detail: 'All foreign trade procedures through VUCEM electronic platform', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Pedimento Filing', detail: 'Pedimento must be filed and validated before cargo release', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Pre-Validation', detail: 'Electronic pre-validation of pedimento data required before physical filing', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'COVE (Online Value Voucher)', detail: 'Digital voucher system for commercial documents', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'General Import Tax Law (LIGIE). Average applied tariff 7.1%. VAT 16%. IMMEX program allows duty-free temporary import for manufacturing/export. Preferential rates under USMCA.',
      tradeAgreements: [
        { name: 'USMCA', partners: ['US','CA'] },
        { name: 'Pacific Alliance', partners: ['CO'] },
        { name: 'EU-Mexico FTA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'CPTPP', partners: ['JP','CA','SG'] },
        { name: 'Mexico-UK FTA', partners: ['GB'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Firearms/explosives', 'Chemicals', 'Telecommunications equipment', 'Pharmaceutical products', 'Used vehicles (restricted)'],
      prohibitedCategories: ['Marijuana (most forms)', 'Certain used tires', 'Products violating NOM standards', 'Unregistered pesticides'],
      specialCertifications: ['NOM certification (product standards)', 'COFEPRIS (pharmaceuticals/food)', 'SENASICA (agriculture)', 'SCT (transport equipment)'],
    },
    commonViolations: [
      { title: 'NOM non-compliance', detail: 'Products subject to NOMs must have certification before import' },
      { title: 'Pedimento errors', detail: 'Incorrect tariff classification or value declaration in pedimento' },
      { title: 'IMMEX program violations', detail: 'Failure to return/export IMMEX goods within required timeframe' },
      { title: 'Missing USMCA origin certification', detail: 'Claiming USMCA preferences without valid certification of origin' },
      { title: 'COVE documentation gaps', detail: 'Missing digital vouchers for supporting documents' },
    ],
    regulatoryChanges: [
      { date: '2026-02-28', title: 'VUCEM 3.0 Launch', description: 'Updated single-window platform with enhanced digital documentation', impact: 'medium' },
      { date: '2026-01-15', title: 'USMCA Review Preparations', description: 'Regulatory preparations for 2026 USMCA joint review', impact: 'low' },
    ],
  },
  {
    code: 'IN', name: 'India', flag: '🇮🇳',
    authority: {
      name: 'Central Board of Indirect Taxes and Customs (CBIC)',
      filingSystem: 'ICEGATE (Indian Customs Electronic Gateway)',
      processingTime: '3–7 business days (standard), 1–2 days (AEO)',
      enforcementPriorities: [
        'BIS certification enforcement',
        'FSSAI compliance for food',
        'Anti-dumping duty collection',
        'Undervaluation detection',
        'High documentation scrutiny',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Bill of Entry (ICEGATE)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'IEC (Import Export Code)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'BIS Certificate (electronics)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'FSSAI License (food)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Shipping Bill (exports)', modes: ['air','sea','land'], directions: ['outbound'] },
      { name: 'DGFT License (restricted items)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    filingRequirements: [
      { rule: 'ICEGATE Electronic Filing', detail: 'All customs documents filed through ICEGATE portal', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'IEC Registration', detail: 'Import Export Code mandatory for all importers/exporters', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'Pre-Arrival Processing', detail: 'Bill of Entry can be filed up to 30 days before cargo arrival', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'GST Compliance', detail: 'IGST payment required at time of import; GST registration mandatory', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Indian Customs Tariff Act. Average applied tariff 17.6%. Basic Customs Duty + Social Welfare Surcharge + IGST. High duties on electronics, automobiles, and agricultural products.',
      tradeAgreements: [
        { name: 'India-Korea CEPA', partners: ['KR'] },
        { name: 'India-Japan CEPA', partners: ['JP'] },
        { name: 'India-Singapore CECA', partners: ['SG'] },
        { name: 'SAFTA', partners: [] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Electronics (BIS)', 'Food products (FSSAI)', 'Pharmaceuticals (CDSCO)', 'Chemicals (CWC)', 'Used/refurbished goods'],
      prohibitedCategories: ['Tallow/animal fats', 'Ivory products', 'Wild animal products', 'Certain Chinese apps/technology'],
      specialCertifications: ['BIS certification (electronics)', 'FSSAI registration (food)', 'CDSCO approval (pharmaceuticals)', 'WPC approval (wireless equipment)'],
    },
    commonViolations: [
      { title: 'Missing BIS certification', detail: 'Electronics and IT products require mandatory BIS registration before import' },
      { title: 'FSSAI compliance gaps', detail: 'Food imports without FSSAI license face rejection at port' },
      { title: 'Undervaluation triggers', detail: 'CBIC maintains extensive valuation databases; suspicious values trigger assessment' },
      { title: 'Anti-dumping duty evasion', detail: 'Routing through third countries to avoid AD duties heavily scrutinized' },
      { title: 'Documentation delays', detail: 'High documentation requirements; missing any document causes hold' },
    ],
    regulatoryChanges: [
      { date: '2026-03-01', title: 'BIS Scope Expansion', description: 'Additional 50 product categories brought under mandatory BIS certification', impact: 'high' },
      { date: '2026-02-10', title: 'Faceless Assessment Expansion', description: 'AI-based faceless customs assessment expanded to more ports', impact: 'medium' },
    ],
  },
  {
    code: 'CA', name: 'Canada', flag: '🇨🇦',
    authority: {
      name: 'Canada Border Services Agency (CBSA)',
      filingSystem: 'CARM (CBSA Assessment and Revenue Management)',
      processingTime: '1–3 business days (standard), same-day (FAST/AEO)',
      enforcementPriorities: [
        'CUSMA/USMCA origin verification',
        'Advance commercial information (ACI)',
        'SIMA anti-dumping enforcement',
        'Food safety (CFIA)',
        'Sanctions compliance',
      ],
    },
    requiredDocuments: [
      { name: 'Canada Customs Invoice or Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'B3 Customs Declaration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Certificate of Origin (CUSMA)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Import Permit (controlled goods)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'CFIA Certificate (food/agriculture)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Export Declaration (B13a)', modes: ['air','sea','land'], directions: ['outbound'] },
    ],
    filingRequirements: [
      { rule: 'CARM Electronic Filing', detail: 'All customs accounting through CARM portal (replaced legacy systems)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ACI (Advance Commercial Information)', detail: '24h before loading (air), 4h before arrival (highway), 24h (marine)', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'Release Prior to Payment', detail: 'CARM allows release before full accounting under qualifying conditions', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'CUSMA Origin Certification', detail: 'Self-certification allowed; must meet specific product rules of origin', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'Canadian Customs Tariff. Average applied tariff 4.1%. GST 5% on imports. Provincial taxes may apply. CUSMA eliminates most tariffs on US/MX goods meeting ROO.',
      tradeAgreements: [
        { name: 'CUSMA/USMCA', partners: ['US','MX'] },
        { name: 'CETA (EU-Canada)', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'CPTPP', partners: ['JP','MX','SG'] },
        { name: 'Canada-UK TCA', partners: ['GB'] },
        { name: 'Canada-Korea FTA', partners: ['KR'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Firearms', 'Controlled drugs', 'Food products (CFIA)', 'Health products', 'Cultural property'],
      prohibitedCategories: ['Child pornography', 'Hate propaganda', 'Used mattresses', 'Certain weapons', 'Prison-made goods'],
      specialCertifications: ['CFIA inspection (food/agriculture)', 'Health Canada approval (pharmaceuticals)', 'CSA certification (electrical)', 'Transport Canada (vehicles)'],
    },
    commonViolations: [
      { title: 'CUSMA origin certification errors', detail: 'Incorrect product-specific rules of origin application' },
      { title: 'Late ACI filing', detail: 'Failure to submit advance commercial information within required timeframes' },
      { title: 'CARM portal filing errors', detail: 'New system transition causing filing errors and payment delays' },
      { title: 'CFIA documentation gaps', detail: 'Food imports without proper CFIA pre-clearance held at border' },
      { title: 'Tariff classification disputes', detail: 'CBSA actively audits classifications; retroactive duty assessments common' },
    ],
    regulatoryChanges: [
      { date: '2026-02-15', title: 'CARM Release 3', description: 'Full CARM implementation with self-assessment capability for all importers', impact: 'high' },
      { date: '2026-03-01', title: 'CUSMA Automotive Rules Update', description: 'Updated regional value content requirements for automotive sector', impact: 'medium' },
    ],
  },
  {
    code: 'HK', name: 'Hong Kong', flag: '🇭🇰',
    authority: {
      name: 'Customs and Excise Department',
      filingSystem: 'TDEC (Trade Declaration via Electronic Service)',
      processingTime: 'Same-day (free port); 1–2 days for restricted items',
      enforcementPriorities: [
        'Strategic commodities licensing',
        'Re-export documentation',
        'IP rights enforcement',
        'Sanctions compliance',
        'Drug interdiction',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Import/Export Declaration (TDEC)', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Strategic Commodities License', modes: ['air','sea'], directions: ['outbound'] },
      { name: 'Dangerous Goods Permit', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Pharmaceutical License (controlled)', modes: ['air','sea'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'TDEC Filing', detail: 'Import/export declarations within 14 days of import or at time of export', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { rule: 'Strategic Commodities Control', detail: 'License required for strategic goods re-export per SCO ordinance', modes: ['air','sea'], directions: ['outbound'] },
      { rule: 'No General Tariff', detail: 'Hong Kong is a free port — no customs duties on most goods', modes: ['air','sea'], directions: ['inbound'] },
    ],
    dutiesTariffs: {
      overview: 'Free port with ZERO tariffs on most goods. Excise duties only on liquor, tobacco, hydrocarbon oil, and methyl alcohol. No VAT/GST.',
      tradeAgreements: [
        { name: 'China-Hong Kong CEPA', partners: ['CN'] },
        { name: 'Hong Kong-ASEAN FTA', partners: ['SG'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Strategic commodities', 'Pharmaceuticals', 'Telecommunications equipment', 'Firearms', 'Radioactive materials'],
      prohibitedCategories: ['Certain weapons', 'Counterfeit goods', 'Infringing IP goods', 'Ozone-depleting substances'],
      specialCertifications: ['OFCA license (telecom)', 'DH license (pharmaceuticals)', 'EPD permit (hazardous waste)', 'AFCD permit (endangered species)'],
    },
    commonViolations: [
      { title: 'Missing strategic commodities license', detail: 'Re-exporting controlled technology without SCO license' },
      { title: 'Late TDEC filing', detail: 'Declarations must be filed within 14 days; penalties for late submission' },
      { title: 'Transshipment documentation gaps', detail: 'Re-export documentation requirements for goods transiting HK' },
      { title: 'Sanctions screening failures', detail: 'HK enforces UN/local sanctions; screening required' },
      { title: 'Origin marking errors', detail: 'Goods must not falsely claim HK origin' },
    ],
    regulatoryChanges: [
      { date: '2026-02-20', title: 'Enhanced Strategic Commodities Controls', description: 'Expanded list of items requiring SCO export license', impact: 'medium' },
    ],
  },
  {
    code: 'SG', name: 'Singapore', flag: '🇸🇬',
    authority: {
      name: 'Singapore Customs',
      filingSystem: 'TradeNet',
      processingTime: 'Minutes to hours (highly automated); 1–2 days for controlled items',
      enforcementPriorities: [
        'Strategic goods control',
        'Free trade zone compliance',
        'GST collection on imports',
        'IP rights protection',
        'Sanctions enforcement',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'Cargo Clearance Permit (CCP)', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea'], directions: ['inbound'] },
      { name: 'Strategic Goods Permit', modes: ['air','sea'], directions: ['outbound'] },
      { name: 'Import License (controlled goods)', modes: ['air','sea'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'TradeNet Filing', detail: 'All trade documents processed through TradeNet within minutes', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { rule: 'Cargo Clearance Permit', detail: 'CCP required before goods can be released from port/airport', modes: ['air','sea'], directions: ['inbound','outbound'] },
      { rule: 'GST Registration', detail: 'GST (9%) payable on imports; registration required for businesses', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'Strategic Goods Control', detail: 'Permit required for transit/transshipment of strategic goods', modes: ['air','sea'], directions: ['outbound'] },
    ],
    dutiesTariffs: {
      overview: 'Very low tariff regime — 0% duty on most goods. Excise duties on motor vehicles, tobacco, liquor, and petroleum. GST 9% on imports.',
      tradeAgreements: [
        { name: 'RCEP', partners: ['CN','JP','KR'] },
        { name: 'CPTPP', partners: ['JP','CA','MX'] },
        { name: 'EU-Singapore FTA', partners: ['DE','FR','IT','NL','BE'] },
        { name: 'US-Singapore FTA', partners: ['US'] },
        { name: 'UK-Singapore FTA', partners: ['GB'] },
        { name: 'India-Singapore CECA', partners: ['IN'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Strategic goods', 'Pharmaceuticals', 'Food products (SFA)', 'Chemicals (hazardous)', 'Arms/explosives'],
      prohibitedCategories: ['Chewing gum (with exceptions)', 'Firecrackers', 'Controlled drugs', 'Endangered wildlife'],
      specialCertifications: ['SFA approval (food)', 'HSA license (pharmaceuticals)', 'NEA permit (hazardous waste)', 'SCDF permit (petroleum/flammables)'],
    },
    commonViolations: [
      { title: 'Missing Cargo Clearance Permit', detail: 'Goods moved without valid CCP face seizure and penalties' },
      { title: 'Strategic goods violations', detail: 'Transit of controlled items without permit is a serious offense' },
      { title: 'GST underpayment', detail: 'Incorrect declared value leading to GST shortfall' },
      { title: 'Food import without SFA approval', detail: 'All food imports require SFA-approved source and license' },
      { title: 'Transshipment documentation errors', detail: 'Goods in Free Trade Zone must have proper documentation trail' },
    ],
    regulatoryChanges: [
      { date: '2026-01-01', title: 'GST Rate Increase to 9%', description: 'Final phase of GST increase from 8% to 9% now effective', impact: 'medium' },
    ],
  },
  {
    code: 'FR', name: 'France', flag: '🇫🇷',
    authority: {
      name: 'Direction Générale des Douanes et Droits Indirects (DGDDI)',
      filingSystem: 'DELTA (Dédouanement En Ligne par Traitement Automatisé) / EU TARIC',
      processingTime: '1–3 business days (standard), same-day (AEO)',
      enforcementPriorities: [
        'Agricultural import controls',
        'VAT collection on e-commerce',
        'Cultural goods protection',
        'REACH/CLP compliance',
        'Anti-fraud enforcement',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration (DELTA)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'French VAT Registration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Phytosanitary Certificate (agriculture)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Cultural Goods License (art/antiques)', modes: ['air','sea','land'], directions: ['outbound'] },
    ],
    filingRequirements: [
      { rule: 'DELTA Electronic Filing', detail: 'Customs declarations via DELTA system (French national system)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ICS2 Pre-Loading', detail: 'EU ICS2 advance cargo information requirements apply', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'VAT Registration (non-EU sellers)', detail: 'Non-EU sellers must register for French VAT or use IOSS', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'EORI Requirement', detail: 'EU EORI number mandatory for all customs operations', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'EU Combined Tariff (TARIC). Standard VAT 20% (reduced 5.5%/10%). Strong agricultural protections. Anti-dumping duties on specific products.',
      tradeAgreements: [
        { name: 'EU FTA Network', partners: ['GB','JP','KR','CA','SG','CO','MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Dual-use items', 'Firearms', 'Pharmaceuticals', 'Agricultural products', 'Cultural goods (export)'],
      prohibitedCategories: ['Products not meeting EU standards', 'Foie gras substitutes (mislabeled)', 'Certain pesticides', 'Asbestos'],
      specialCertifications: ['CE marking', 'REACH/CLP compliance', 'DGCCRF approval (consumer products)', 'ANSM authorization (pharmaceuticals)'],
    },
    commonViolations: [
      { title: 'Agricultural import violations', detail: 'Strict controls on food imports; missing phytosanitary certificates' },
      { title: 'VAT registration non-compliance', detail: 'Non-EU e-commerce sellers failing to register for French VAT' },
      { title: 'Cultural goods export violations', detail: 'Art and antiques require export licenses over value thresholds' },
      { title: 'REACH non-compliance', detail: 'Chemical products must comply with EU REACH regulations' },
      { title: 'French labeling requirements', detail: 'Consumer products must have French-language labeling' },
    ],
    regulatoryChanges: [
      { date: '2026-02-15', title: 'DGDDI Anti-Fraud Enhancement', description: 'New AI-based fraud detection system for customs declarations', impact: 'medium' },
    ],
  },
  {
    code: 'IT', name: 'Italy', flag: '🇮🇹',
    authority: {
      name: 'Agenzia delle Dogane e dei Monopoli (ADM)',
      filingSystem: 'AIDA (Automazione Integrata Dogane Accise) / EU TARIC',
      processingTime: '1–5 business days (standard), same-day (AEO)',
      enforcementPriorities: [
        'Luxury goods authentication',
        'Food labeling enforcement (Made in Italy protection)',
        'VAT fraud prevention',
        'Anti-counterfeiting',
        'Agricultural product quality',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration (AIDA)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Italian VAT Registration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Health Certificate (food products)', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'CE Declaration of Conformity', modes: ['air','sea','land'], directions: ['inbound'] },
    ],
    filingRequirements: [
      { rule: 'AIDA Electronic Filing', detail: 'Customs declarations via AIDA system (Italian national customs IT)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ICS2 Compliance', detail: 'EU ICS2 advance cargo security requirements apply', modes: ['air','sea'], directions: ['inbound'] },
      { rule: 'Italian VAT Registration', detail: 'Non-EU businesses need Italian VAT number for import operations', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'EORI Requirement', detail: 'EU EORI mandatory for all customs operations', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'EU Combined Tariff (TARIC). Standard VAT 22% (reduced 4%/5%/10%). Strong protections on agricultural products, especially olive oil and wine.',
      tradeAgreements: [
        { name: 'EU FTA Network', partners: ['GB','JP','KR','CA','SG','CO','MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Dual-use items', 'Firearms', 'Pharmaceuticals', 'Food supplements', 'Art/cultural heritage (export)'],
      prohibitedCategories: ['Counterfeit luxury goods', 'Products not meeting EU standards', 'Certain pesticides', 'Non-CE marked products'],
      specialCertifications: ['CE marking', 'REACH compliance', 'Italian food labeling (DOP/IGP)', 'AIFA authorization (pharmaceuticals)'],
    },
    commonViolations: [
      { title: 'Luxury goods counterfeiting', detail: 'Italy has strong enforcement against counterfeit fashion/luxury goods' },
      { title: 'Food labeling violations', detail: 'Strict DOP/IGP/STG labeling rules for Italian food products' },
      { title: 'Made in Italy misuse', detail: 'Unauthorized use of "Made in Italy" designation heavily penalized' },
      { title: 'VAT carousel fraud', detail: 'ADM actively investigates missing trader intra-community fraud' },
      { title: 'CE marking non-compliance', detail: 'Products in regulated categories must have proper CE documentation' },
    ],
    regulatoryChanges: [
      { date: '2026-03-10', title: 'ADM Digital Transformation', description: 'New digital customs platform replacing legacy AIDA components', impact: 'medium' },
    ],
  },
  {
    code: 'BE', name: 'Belgium', flag: '🇧🇪',
    authority: {
      name: 'FOD Financiën — Douane en Accijnzen (Belgian Customs)',
      filingSystem: 'PLDA (Paperless Douane en Accijnzen) / EU TARIC',
      processingTime: '1–2 business days (standard), same-day (AEO)',
      enforcementPriorities: [
        'Antwerp port cargo screening',
        'Drug interdiction',
        'Diamond trade controls',
        'EU sanctions enforcement',
        'ICS2 compliance',
      ],
    },
    requiredDocuments: [
      { name: 'Commercial Invoice', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Packing List', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Bill of Lading / Airway Bill', modes: ['sea','air'], directions: ['inbound','outbound'] },
      { name: 'EORI Number', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Customs Declaration (PLDA)', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { name: 'Certificate of Origin', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Belgian VAT Registration', modes: ['air','sea','land'], directions: ['inbound'] },
      { name: 'Kimberley Process Certificate (diamonds)', modes: ['air','sea'], directions: ['inbound','outbound'] },
    ],
    filingRequirements: [
      { rule: 'PLDA Electronic Filing', detail: 'Paperless customs declarations through PLDA system', modes: ['air','sea','land'], directions: ['inbound','outbound'] },
      { rule: 'ICS2 Pre-Loading', detail: 'EU ICS2 advance cargo information; critical for Antwerp hub', modes: ['sea','air'], directions: ['inbound'] },
      { rule: 'VAT Registration', detail: 'Non-EU sellers must register for Belgian VAT or use fiscal representative', modes: ['air','sea','land'], directions: ['inbound'] },
      { rule: 'Kimberley Process', detail: 'Rough diamond trade requires Kimberley Process certification', modes: ['air','sea'], directions: ['inbound','outbound'] },
    ],
    dutiesTariffs: {
      overview: 'EU Combined Tariff (TARIC). Standard VAT 21% (reduced 6%/12%). Belgium is major EU gateway via Antwerp port. Duty-free movement within EU after clearance.',
      tradeAgreements: [
        { name: 'EU FTA Network', partners: ['GB','JP','KR','CA','SG','CO','MX'] },
      ],
    },
    restrictedGoods: {
      licensedCategories: ['Dual-use items', 'Firearms', 'Diamonds (Kimberley)', 'Pharmaceuticals', 'Precursor chemicals'],
      prohibitedCategories: ['Products not meeting EU standards', 'Conflict diamonds', 'Certain weapons', 'Counterfeit goods'],
      specialCertifications: ['CE marking', 'REACH compliance', 'Kimberley Process Certificate (diamonds)', 'FAVV/AFSCA approval (food)'],
    },
    commonViolations: [
      { title: 'Antwerp port documentation delays', detail: 'High volume at Antwerp means documentation errors cause significant delays' },
      { title: 'Drug contamination of cargo', detail: 'Antwerp is high-risk for drug smuggling; increased container screening' },
      { title: 'Missing VAT registration', detail: 'Non-EU companies using Belgium as EU entry point without proper VAT registration' },
      { title: 'Diamond trade documentation', detail: 'Kimberley Process violations carry severe penalties' },
      { title: 'Transit procedure errors', detail: 'Goods in transit through Belgium require proper T1 documentation' },
    ],
    regulatoryChanges: [
      { date: '2026-02-01', title: 'Enhanced Antwerp Screening', description: 'Increased container scanning at Antwerp port following drug interdiction initiatives', impact: 'medium' },
    ],
  },
];

export function getCountryProfile(code: string): CountryComplianceProfile | undefined {
  return COMPLIANCE_COUNTRIES.find(c => c.code === code);
}

export function getFilteredDocuments(
  profile: CountryComplianceProfile,
  mode: TransportMode | 'all',
  direction: Direction | 'all'
): RequiredDocument[] {
  return profile.requiredDocuments.filter(d =>
    (mode === 'all' || d.modes.includes(mode)) &&
    (direction === 'all' || d.directions.includes(direction))
  );
}

export function getFilteredFilingRequirements(
  profile: CountryComplianceProfile,
  mode: TransportMode | 'all',
  direction: Direction | 'all'
): FilingRequirement[] {
  return profile.filingRequirements.filter(f =>
    (mode === 'all' || f.modes.includes(mode)) &&
    (direction === 'all' || f.directions.includes(direction))
  );
}
