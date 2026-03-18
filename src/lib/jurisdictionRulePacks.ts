/**
 * JURISDICTION RULE PACKS — Curated Registry
 * 
 * Each jurisdiction defines import and export core requirements,
 * filing systems, licensing triggers, broker checkpoints,
 * common fine/delay traps, and beginner guidance.
 * 
 * NOT dynamically fetched. Curated and versioned.
 */

export const RULE_PACKS_VERSION = "1.0.0";
export const RULE_PACKS_REVIEWED = "2026-03-15";

// ── Types ─────────────────────────────────────────────────────────────

export interface FilingSystem {
  name: string;
  description: string;
  url?: string;
}

export interface SourceReference {
  authority: string;
  url: string;
  jurisdiction: string;
  modeRelevance: string[];
  stageRelevance: string[];
  reviewDate: string;
  rulesVersion: string;
}

export interface JurisdictionRulePack {
  code: string;
  name: string;
  region: string;
  currency: string;

  // Import requirements
  importCore: {
    requiredDocs: string[];
    filingRequirements: string[];
    commonLicenses: string[];
    brokerCheckpoints: string[];
    fineTraps: string[];
    beginnerWarnings: string[];
  };

  // Export requirements
  exportCore: {
    requiredDocs: string[];
    filingRequirements: string[];
    commonLicenses: string[];
    brokerCheckpoints: string[];
    fineTraps: string[];
    beginnerWarnings: string[];
  };

  // Filing systems
  customsDeclarationSystem: FilingSystem;
  singleWindow?: FilingSystem;

  // Metadata
  source: SourceReference;
}

export interface CommodityOverlay {
  id: string;
  name: string;
  hsPatterns: string[]; // 2-digit or 4-digit HS prefixes
  additionalDocs: string[];
  additionalFilings: string[];
  advisories: string[];
  beginnerWarnings: string[];
}

export interface ModeOverlay {
  mode: string;
  additionalDocs: string[];
  advisories: string[];
  beginnerWarnings: string[];
}

export interface StageOverlay {
  stage: string;
  label: string;
  guidance: string[];
  notApplicableYet: string[];
}

// ── Jurisdiction Packs ────────────────────────────────────────────────

export const JURISDICTION_PACKS: Record<string, JurisdictionRulePack> = {
  US: {
    code: "US",
    name: "United States",
    region: "North America",
    currency: "USD",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "CBP Entry Summary (Form 7501)",
        "ISF 10+2 filing (ocean only — must be filed 24h before vessel departure)",
        "Customs bond (continuous or single-entry, required for imports >$2,500)",
        "AMS filing (carrier responsibility for ocean)",
      ],
      commonLicenses: [
        "FDA prior notice (food, drugs, cosmetics, medical devices — Chapters 01-24, 29-30, 33, 90)",
        "USDA/APHIS permit (plants, animals, agricultural products)",
        "FCC declaration (electronics — HS 8471, 8517, 8525-8528)",
        "EPA notice of arrival (chemicals, vehicles)",
        "TTB permit (alcohol, tobacco)",
        "CPSC certificate (consumer products, children's products)",
      ],
      brokerCheckpoints: [
        "Verify importer of record (IOR) has active CBP bond",
        "Confirm HS classification before entry — misclassification is the #1 penalty trigger",
        "Check AD/CVD orders for the origin + HS combination",
        "Verify country of origin marking compliance (19 CFR 134)",
        "Confirm duty payment method (ACH, check, surety)",
      ],
      fineTraps: [
        "Misclassification penalties under 19 USC 1592 — up to 4x the duty owed",
        "Late ISF filing: $5,000 per occurrence",
        "Missing or incorrect country of origin marking: seizure risk",
        "Bond insufficiency: shipment held until bond increased",
        "Undervaluation: fraud penalties possible",
        "Section 301/201 tariff surcharges on China-origin goods often missed",
      ],
      beginnerWarnings: [
        "File ISF before vessel departure — cannot be done after loading",
        "Get your customs bond BEFORE the shipment arrives",
        "HS code determines duty rate — get classification confirmed by broker early",
        "FDA-regulated products need prior notice BEFORE arrival",
        "First-time importers: register with CBP and get an importer number",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "shipper's_export_declaration"],
      filingRequirements: [
        "AES/EEI filing via ACE (required for exports >$2,500 or licensed items)",
        "ECCN classification for dual-use items",
      ],
      commonLicenses: [
        "BIS export license (dual-use technology, EAR99 vs. controlled)",
        "ITAR license (defense articles — State Department)",
        "OFAC screening (sanctions compliance — mandatory)",
      ],
      brokerCheckpoints: [
        "Screen all parties against OFAC SDN, Entity List, Denied Persons List",
        "Verify ECCN classification for technology exports",
        "Confirm destination country is not embargoed",
        "File EEI in AES before export if required",
      ],
      fineTraps: [
        "Failure to file EEI: up to $10,000 per violation",
        "OFAC violations: up to $250,000+ per transaction",
        "Export without required license: criminal penalties possible",
      ],
      beginnerWarnings: [
        "Screen buyers against US sanctions lists BEFORE shipping",
        "Exports >$2,500 need AES/EEI filing — don't skip this",
        "Technology exports may need BIS review even if not obviously military",
      ],
    },
    customsDeclarationSystem: { name: "ACE (Automated Commercial Environment)", description: "CBP's primary trade processing system", url: "https://www.cbp.gov/trade/automated" },
    singleWindow: { name: "ACE Single Window", description: "Unified portal for 47 US government agencies", url: "https://www.cbp.gov/trade/ace/features" },
    source: { authority: "U.S. Customs and Border Protection (CBP)", url: "https://www.cbp.gov", jurisdiction: "US", modeRelevance: ["sea", "air", "land"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  CO: {
    code: "CO",
    name: "Colombia",
    region: "Latin America",
    currency: "COP",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin", "import_registration"],
      filingRequirements: [
        "DIAN import declaration (Declaración de Importación)",
        "Import registration (Registro de Importación) via VUCE",
        "Andean Value Declaration (Declaración Andina del Valor — DAV)",
        "RUT/NIT verification for importer of record",
      ],
      commonLicenses: [
        "INVIMA registration (food, pharma, cosmetics, medical devices)",
        "ICA phytosanitary permit (agricultural products)",
        "ANDI technical standards certificate (select industrial products)",
        "MinComercio prior license (certain controlled goods)",
      ],
      brokerCheckpoints: [
        "Verify importer has active RUT with DIAN",
        "Confirm import registration is approved in VUCE before shipment",
        "Check if product requires INVIMA registration",
        "Verify preferential origin if claiming FTA rate (US-CO TPA, EU-CO)",
        "Confirm advance payment of VAT (IVA) if applicable",
      ],
      fineTraps: [
        "Missing import registration: shipment cannot clear — must apply retroactively (delays 5-15 days)",
        "Incorrect tariff classification: DIAN penalties + back duties",
        "Undervaluation: DIAN risk profiling flags low-value declarations",
        "Missing INVIMA for regulated products: seizure and destruction risk",
        "Late Andean Value Declaration: fine + delay",
      ],
      beginnerWarnings: [
        "Get import registration BEFORE shipping — it takes 1-5 days to approve",
        "INVIMA registration can take weeks — plan ahead for regulated products",
        "DIAN uses risk profiling — new importers get inspected more often",
        "Colombia requires the Andean Value Declaration for most imports",
        "Preferential origin claims need a valid certificate — Colombia has FTAs with US, EU, and others",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "certificate_of_origin", "export_declaration"],
      filingRequirements: [
        "DIAN export declaration (DEX — Declaración de Exportación)",
        "Export registration via VUCE for controlled goods",
        "Certificado de Origen for FTA-eligible shipments",
      ],
      commonLicenses: [
        "ICA phytosanitary certificate (agricultural/flower exports)",
        "INVIMA export certificate (pharma, food)",
        "MinDefensa authorization (controlled substances, precursors)",
        "Environmental export permit (wildlife, forest products)",
      ],
      brokerCheckpoints: [
        "File DIAN export declaration before departure",
        "Obtain phytosanitary certificate for agricultural goods (flowers, coffee, fruit)",
        "Verify DIAN export incentive eligibility (Plan Vallejo, free zones)",
        "Screen against Colombia/international sanctions lists",
      ],
      fineTraps: [
        "Failure to file export declaration: penalties from DIAN",
        "Exporting without phytosanitary cert: rejection at destination",
        "Controlled substances regulations are strictly enforced",
      ],
      beginnerWarnings: [
        "File the DIAN export declaration BEFORE the shipment departs",
        "Colombian flower/coffee exports need phytosanitary certificates",
        "If using FTA preferences, the certificate of origin must match exactly",
      ],
    },
    customsDeclarationSystem: { name: "MUISCA / DIAN Aduanero", description: "DIAN electronic customs system", url: "https://muisca.dian.gov.co" },
    singleWindow: { name: "VUCE (Ventanilla Única de Comercio Exterior)", description: "Single window for all trade permits and registrations", url: "https://www.vuce.gov.co" },
    source: { authority: "DIAN (Dirección de Impuestos y Aduanas Nacionales)", url: "https://www.dian.gov.co", jurisdiction: "CO", modeRelevance: ["sea", "air"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  BR: {
    code: "BR",
    name: "Brazil",
    region: "Latin America",
    currency: "BRL",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "Siscomex import declaration (DI — Declaração de Importação)",
        "Import license (LI) via Siscomex for controlled goods",
        "RADAR registration (importer's customs credential — mandatory)",
      ],
      commonLicenses: [
        "ANVISA authorization (pharma, food, cosmetics, medical devices)",
        "IBAMA license (environmental products, chemicals)",
        "INMETRO certification (industrial/consumer product standards)",
        "MAPA permit (agricultural products)",
      ],
      brokerCheckpoints: [
        "Verify importer has active RADAR (Registro e Rastreamento da Atuação dos Intervenientes Aduaneiros)",
        "Check if product needs prior LI (import license) — some take 30+ days",
        "Confirm ICMS/IPI/PIS/COFINS tax calculation",
        "Verify Mercosur preferential origin if applicable",
      ],
      fineTraps: [
        "No RADAR = cannot import. Period. Get this first",
        "Missing import license for controlled goods: seizure + fine",
        "Undervaluation: Receita Federal cross-references international pricing databases",
        "Wrong NCM (HS) code: back duties + 1% fine on CIF value",
        "Brazil has one of the highest total tax burdens on imports in the world (II + IPI + PIS + COFINS + ICMS can total 60-100%+)",
      ],
      beginnerWarnings: [
        "RADAR registration is MANDATORY — apply at Receita Federal before importing",
        "Import licenses for some products take 30-60 days — plan far ahead",
        "Brazil's import taxes are among the highest globally — calculate total landed cost carefully",
        "ANVISA registration for health products can take months",
        "Siscomex system has scheduled maintenance — don't file last minute",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "certificate_of_origin", "export_declaration"],
      filingRequirements: [
        "Siscomex export declaration (DE/DU-E — Declaração Única de Exportação)",
        "Invoice in Portuguese and English",
      ],
      commonLicenses: [
        "MAPA phytosanitary certificate (agricultural exports)",
        "IBAMA export authorization (wildlife, forest products)",
        "CNEN authorization (nuclear materials)",
      ],
      brokerCheckpoints: [
        "File DU-E in Siscomex before departure",
        "Obtain phytosanitary certificate for agricultural goods",
        "Verify Drawback regime eligibility for tax recovery",
      ],
      fineTraps: [
        "Late or missing export declaration: fines from Receita Federal",
        "Missing phytosanitary cert: rejection at destination country",
      ],
      beginnerWarnings: [
        "All Brazilian exports must be declared in Siscomex",
        "Agricultural exports (soy, coffee, beef) need MAPA certificates",
        "Drawback regime can recover import taxes on re-exported goods",
      ],
    },
    customsDeclarationSystem: { name: "Siscomex", description: "Integrated foreign trade system", url: "https://www.gov.br/siscomex" },
    singleWindow: { name: "Portal Único Siscomex", description: "Single window for Brazilian trade", url: "https://portalunico.siscomex.gov.br" },
    source: { authority: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal", jurisdiction: "BR", modeRelevance: ["sea", "air"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  CN: {
    code: "CN",
    name: "China",
    region: "Asia-Pacific",
    currency: "CNY",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin", "customs_declaration"],
      filingRequirements: [
        "China Customs import declaration via Single Window",
        "CIQ inspection/quarantine declaration (for regulated goods)",
        "Advance manifest filing for ocean cargo",
      ],
      commonLicenses: [
        "CCC certification (compulsory for electronics, auto parts, toys)",
        "CFDA/NMPA registration (pharma, medical devices, cosmetics)",
        "Import license for restricted goods (MOFCOM)",
        "Quarantine permit (GACC — food, animals, plants)",
      ],
      brokerCheckpoints: [
        "Verify consignee has customs registration with GACC",
        "Check CCC certification requirements for the product category",
        "Confirm HS code under China's tariff schedule (different from HTS)",
        "Verify if product falls under China's import restriction/prohibition list",
      ],
      fineTraps: [
        "Missing CCC mark: seizure at port",
        "Incorrect HS code: back duties + penalty (up to 30% of duty owed)",
        "Undervaluation: China Customs uses reference pricing databases aggressively",
        "Import of restricted goods without license: confiscation",
      ],
      beginnerWarnings: [
        "China's HS codes may differ from your origin country — verify with Chinese broker",
        "CCC certification is mandatory for many product categories — check before shipping",
        "China Customs can take 3-7 days for inspection on flagged shipments",
        "New importers face higher inspection rates",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "export_customs_declaration"],
      filingRequirements: [
        "China Customs export declaration via Single Window",
        "Export VAT rebate declaration (if applicable)",
      ],
      commonLicenses: [
        "Export license for controlled/restricted goods (MOFCOM)",
        "CIQ inspection certificate (pre-shipment for certain products)",
        "Export control compliance (dual-use items)",
      ],
      brokerCheckpoints: [
        "File export declaration with China Customs",
        "Verify no export restrictions on the product",
        "Obtain CIQ inspection if required",
        "Confirm VAT rebate eligibility",
      ],
      fineTraps: [
        "Exporting restricted goods without license: severe penalties",
        "Under-declaring export value to evade taxes: criminal liability",
      ],
      beginnerWarnings: [
        "China export declarations must be filed before container leaves the port",
        "VAT rebate rates vary by product — confirm with your accountant",
        "Dual-use technology exports need MOFCOM approval",
      ],
    },
    customsDeclarationSystem: { name: "China Customs Single Window", description: "Unified trade filing platform", url: "https://www.singlewindow.cn" },
    source: { authority: "General Administration of Customs of China (GACC)", url: "http://english.customs.gov.cn", jurisdiction: "CN", modeRelevance: ["sea", "air", "land"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  MX: {
    code: "MX",
    name: "Mexico",
    region: "North America",
    currency: "MXN",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin", "pedimento"],
      filingRequirements: [
        "Pedimento de Importación (customs entry document via VUCEM)",
        "Padron de Importadores registration (mandatory for all importers)",
        "COVE (Electronic customs value document)",
      ],
      commonLicenses: [
        "NOM certification (Normas Oficiales Mexicanas — product standards)",
        "COFEPRIS authorization (food, pharma, cosmetics, medical devices)",
        "SEMARNAT permit (environmental products, chemicals)",
        "SE import permit for restricted goods (Secretaría de Economía)",
      ],
      brokerCheckpoints: [
        "Verify importer is registered in Padron de Importadores",
        "Confirm NOM certification for applicable products",
        "Check USMCA origin eligibility for US/Canada goods",
        "Verify sector-specific padron (Padron de Sectores Específicos) if required",
      ],
      fineTraps: [
        "No Padron = cannot import. Registration takes 5-10 business days",
        "Missing NOM certificate: goods held at port indefinitely",
        "USMCA origin claims without proper certification: back duties + penalties",
        "Mexican customs (SAT) actively cross-references declared values",
      ],
      beginnerWarnings: [
        "Register in Padron de Importadores BEFORE shipping to Mexico",
        "NOM compliance is mandatory — check if your product needs certification",
        "USMCA certificates of origin must be properly completed for preferential rates",
        "Mexican customs brokers (agentes aduanales) are legally required for clearance",
        "COFEPRIS registration for health products takes weeks",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "pedimento_exportacion"],
      filingRequirements: [
        "Pedimento de Exportación via VUCEM",
        "COVE (Electronic customs value document)",
      ],
      commonLicenses: [
        "SE export permit for controlled goods",
        "SEMARNAT authorization for environmental products",
        "COFEPRIS certificate for pharma/food exports",
      ],
      brokerCheckpoints: [
        "File export pedimento before departure",
        "Verify IMMEX regime applicability for maquiladora operations",
        "Obtain required export permits",
      ],
      fineTraps: [
        "Missing export pedimento: SAT penalties",
        "IMMEX regime violations: loss of benefits + back duties",
      ],
      beginnerWarnings: [
        "All Mexico exports require a pedimento filed by a licensed customs broker",
        "IMMEX companies have special obligations — verify compliance",
        "USMCA origin documentation must be accurate for preferential treatment at destination",
      ],
    },
    customsDeclarationSystem: { name: "VUCEM (Ventanilla Única de Comercio Exterior Mexicana)", description: "Mexico's electronic customs and trade platform", url: "https://www.ventanillaunica.gob.mx" },
    source: { authority: "SAT / Aduana Mexico", url: "https://www.sat.gob.mx", jurisdiction: "MX", modeRelevance: ["sea", "air", "land"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  EU: {
    code: "EU",
    name: "European Union",
    region: "Europe",
    currency: "EUR",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin", "customs_declaration"],
      filingRequirements: [
        "Customs declaration (SAD — Single Administrative Document or electronic equivalent)",
        "Entry Summary Declaration (ENS) under ICS2 — advance cargo info required",
        "EORI number for importer (mandatory for all EU trade)",
        "Import VAT declaration",
      ],
      commonLicenses: [
        "CE marking (mandatory for many product categories in the EU market)",
        "REACH registration (chemicals)",
        "EU type-approval (vehicles, machinery)",
        "Health certificate (food, animal products — via TRACES NT)",
        "Phytosanitary certificate (plants, plant products)",
        "Import license for quotas/restricted goods",
      ],
      brokerCheckpoints: [
        "Verify importer has valid EORI number",
        "Confirm customs procedure code (CPC) selection",
        "Check preferential origin eligibility under EU FTAs",
        "Verify CBAM (Carbon Border Adjustment Mechanism) obligations for covered goods",
        "Confirm customs valuation method",
        "Check if goods require TRACES NT health certificate",
      ],
      fineTraps: [
        "No EORI = cannot clear customs in any EU member state",
        "ENS/ICS2 non-compliance: carrier may be denied loading",
        "Missing CE marking: goods refused entry + destroyed at importer's cost",
        "CBAM non-compliance (effective 2026): significant penalties",
        "Incorrect tariff classification: back duties + penalties (vary by member state)",
        "VAT non-payment: seizure risk",
      ],
      beginnerWarnings: [
        "Get an EORI number BEFORE your first EU import — it's free but takes 3-5 days",
        "ICS2 requires advance cargo data — ensure your carrier handles this",
        "CE marking is NOT optional — most products sold in the EU need it",
        "CBAM affects imports of steel, aluminum, cement, fertilizers, electricity, hydrogen",
        "EU customs is harmonized but enforcement varies by member state",
        "Germany, Netherlands, Italy each have their own customs portal (see national overlays)",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "export_customs_declaration"],
      filingRequirements: [
        "Export declaration via member state customs system (ECS — Export Control System)",
        "EORI number for exporter",
        "Export license for dual-use items (EU Dual-Use Regulation 2021/821)",
      ],
      commonLicenses: [
        "Dual-use export authorization (varies by member state competent authority)",
        "Military/defense items: individual member state license",
        "Cultural goods export license",
        "Sanctions compliance screening (EU restrictive measures)",
      ],
      brokerCheckpoints: [
        "File export declaration in ECS",
        "Screen all parties against EU sanctions lists",
        "Verify dual-use classification",
        "Obtain exit confirmation from customs office of exit",
      ],
      fineTraps: [
        "EU sanctions violations: severe penalties including criminal prosecution",
        "Dual-use export without license: criminal liability in most member states",
        "Missing export declaration: penalties vary by member state",
      ],
      beginnerWarnings: [
        "EU exports need declaration filed with the member state customs authority",
        "Dual-use items need classification review before export",
        "EU sanctions are strictly enforced — screen ALL parties",
      ],
    },
    customsDeclarationSystem: { name: "Member State Customs Systems (CDS/ATLAS/DOUANE/AGS)", description: "Each EU member state operates its own customs IT system under UCC harmonization", url: "https://taxation-customs.ec.europa.eu" },
    singleWindow: { name: "EU Single Window Environment for Customs (EU SWE-C)", description: "Harmonized single window — being rolled out across member states", url: "https://taxation-customs.ec.europa.eu/eu-single-window-environment-customs_en" },
    source: { authority: "European Commission — DG TAXUD", url: "https://taxation-customs.ec.europa.eu", jurisdiction: "EU", modeRelevance: ["sea", "air", "land"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  UK: {
    code: "UK",
    name: "United Kingdom",
    region: "Europe",
    currency: "GBP",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "Import declaration via CDS (Customs Declaration Service)",
        "EORI (GB) number for importer",
        "Safety and security declaration (S&S) for inbound goods",
        "Import VAT accounting (postponed VAT accounting available)",
      ],
      commonLicenses: [
        "UKCA marking (replacing CE marking for UK market)",
        "UK REACH registration (chemicals)",
        "Health certificate via IPAFFS (food, animals, plants)",
        "Import license for controlled goods (e.g., firearms, drugs)",
      ],
      brokerCheckpoints: [
        "Verify GB EORI number is active",
        "Confirm correct commodity code under UK Trade Tariff",
        "Check preferential origin under UK FTAs (UK-EU TCA, CPTPP, etc.)",
        "Verify UKCA/CE marking requirements",
      ],
      fineTraps: [
        "No GB EORI = cannot import into the UK",
        "Incorrect commodity code: back duties + penalties",
        "UKCA marking now mandatory for many products (CE marking grace period ended)",
        "Border Target Operating Model (BTOM) — new checks on EU goods",
      ],
      beginnerWarnings: [
        "UK has its own EORI (GB prefix) — EU EORI is NOT valid for UK imports",
        "Post-Brexit, EU→UK imports now require full customs declarations",
        "UKCA marking requirements differ from CE marking in some categories",
        "Use CDS (not the old CHIEF system) for declarations",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "export_declaration"],
      filingRequirements: [
        "Export declaration via CDS",
        "GB EORI number for exporter",
        "ECJU license for controlled/dual-use goods",
      ],
      commonLicenses: [
        "Export license from ECJU (Export Control Joint Unit) for controlled goods",
        "Sanctions compliance (OFSI — Office of Financial Sanctions Implementation)",
      ],
      brokerCheckpoints: [
        "File export declaration in CDS",
        "Screen against UK sanctions lists (OFSI)",
        "Verify strategic export controls (ECJU)",
      ],
      fineTraps: [
        "UK sanctions violations: criminal penalties",
        "Controlled goods export without license: criminal liability",
      ],
      beginnerWarnings: [
        "UK exports to the EU now require customs declarations (post-Brexit)",
        "ECJU controls apply to military and dual-use items",
        "Screen all parties against UK/OFSI sanctions lists",
      ],
    },
    customsDeclarationSystem: { name: "CDS (Customs Declaration Service)", description: "HMRC's customs declaration platform (replaced CHIEF)", url: "https://www.gov.uk/guidance/customs-declaration-service" },
    source: { authority: "HMRC (His Majesty's Revenue and Customs)", url: "https://www.gov.uk/government/organisations/hm-revenue-customs", jurisdiction: "UK", modeRelevance: ["sea", "air", "land"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  JP: {
    code: "JP",
    name: "Japan",
    region: "Asia-Pacific",
    currency: "JPY",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "Import declaration via NACCS (Nippon Automated Cargo and Port Consolidated System)",
        "Import permit from Japan Customs",
        "Advance Filing Rules (AFR) for maritime cargo — 24h before loading",
      ],
      commonLicenses: [
        "Food sanitation notification (MHLW — Ministry of Health)",
        "Plant quarantine inspection (MAFF)",
        "Animal quarantine inspection (MAFF)",
        "Pharmaceutical import approval (PMDA)",
        "JIS/PSE certification (electrical/consumer products)",
      ],
      brokerCheckpoints: [
        "Verify consignee has valid import permit",
        "Confirm food sanitation requirements with MHLW",
        "Check Japan-specific product standards (JIS, PSE, etc.)",
        "Verify EPA/CPTPP preferential origin if applicable",
      ],
      fineTraps: [
        "Missing food sanitation notification: goods held at port for inspection (can take 2+ weeks)",
        "Incorrect HS code: back duties + 10-15% penalty",
        "Japan Customs is meticulous — documentation must be perfect",
      ],
      beginnerWarnings: [
        "Japan has extremely strict food safety standards — prepare documentation carefully",
        "AFR (Advance Filing Rules) for ocean cargo: file 24h before vessel loading",
        "Japan Customs expects precise, clean documentation",
        "CPTPP/EPA preferential rates require proper origin certification",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "export_declaration"],
      filingRequirements: [
        "Export declaration via NACCS",
        "Export permit from Japan Customs",
      ],
      commonLicenses: [
        "METI export license (dual-use items — Foreign Exchange and Foreign Trade Act)",
        "Cultural Property export permission (cultural artifacts)",
      ],
      brokerCheckpoints: [
        "File export declaration in NACCS",
        "Verify catch-all controls for dual-use technology",
        "Screen against Japan's foreign end-user list",
      ],
      fineTraps: [
        "Japan's export controls on technology are strict — violations carry criminal penalties",
      ],
      beginnerWarnings: [
        "Japan has strict export controls on semiconductor and advanced technology",
        "Catch-all controls apply even if the item is not explicitly listed",
      ],
    },
    customsDeclarationSystem: { name: "NACCS", description: "Japan's integrated customs/port processing system", url: "https://www.naccs.jp/e/" },
    source: { authority: "Japan Customs", url: "https://www.customs.go.jp/english/", jurisdiction: "JP", modeRelevance: ["sea", "air"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  KR: {
    code: "KR",
    name: "South Korea",
    region: "Asia-Pacific",
    currency: "KRW",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "Import declaration via UNI-PASS (Korea Customs Service electronic system)",
        "Import business registration with KCS",
      ],
      commonLicenses: [
        "KC marking (Korea Certification — electrical, telecom, children's products)",
        "MFDS notification (food, pharma, cosmetics, medical devices)",
        "KS certification (Korean Industrial Standards — select products)",
        "Chemical substance registration (K-REACH)",
      ],
      brokerCheckpoints: [
        "Verify importer registration with KCS",
        "Confirm KC certification for applicable products",
        "Check FTA origin (Korea-US KORUS, Korea-EU, RCEP, CPTPP)",
        "Verify MFDS requirements for regulated products",
      ],
      fineTraps: [
        "Missing KC mark: goods cannot be sold in Korea",
        "Incorrect HS code: penalty of up to 40% of underpaid duty",
        "MFDS non-compliance: product seizure/destruction",
      ],
      beginnerWarnings: [
        "KC certification is mandatory for many product categories — check before shipping",
        "Korea has aggressive FTA utilization — verify origin to get preferential rates",
        "UNI-PASS is fully electronic — your broker handles this",
        "MFDS registration for food/pharma takes time — plan ahead",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "export_declaration"],
      filingRequirements: [
        "Export declaration via UNI-PASS",
      ],
      commonLicenses: [
        "Strategic goods export permit (MOTIE — dual-use technology)",
        "Cultural Property export permission",
      ],
      brokerCheckpoints: [
        "File export declaration in UNI-PASS",
        "Verify strategic goods classification",
        "Screen against Korea's sanctions lists",
      ],
      fineTraps: [
        "Strategic goods violations: criminal penalties",
      ],
      beginnerWarnings: [
        "Korea has strict controls on semiconductor and display technology exports",
        "Strategic goods classification must be reviewed before export",
      ],
    },
    customsDeclarationSystem: { name: "UNI-PASS", description: "Korea Customs Service electronic clearance system", url: "https://unipass.customs.go.kr/csp/index.do" },
    source: { authority: "Korea Customs Service (KCS)", url: "https://www.customs.go.kr/english/main.do", jurisdiction: "KR", modeRelevance: ["sea", "air"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },

  IN: {
    code: "IN",
    name: "India",
    region: "South Asia",
    currency: "INR",
    importCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
      filingRequirements: [
        "Bill of Entry via ICEGATE (Indian Customs Electronic Gateway)",
        "IEC (Import Export Code) — mandatory for all importers",
        "Advance Bill of Entry (prior to vessel arrival)",
      ],
      commonLicenses: [
        "BIS certification (Bureau of Indian Standards — electronics, steel, etc.)",
        "FSSAI license (food imports)",
        "CDSCO approval (pharma, medical devices)",
        "Plant quarantine certificate (agricultural products)",
        "WPC approval (wireless/telecom equipment)",
      ],
      brokerCheckpoints: [
        "Verify importer has valid IEC from DGFT",
        "Confirm BIS certification for applicable products",
        "Check IGST, basic customs duty, and cess calculations",
        "Verify FTA origin (India has FTAs with ASEAN, Japan, Korea, etc.)",
        "Check if product is on restricted/prohibited import list",
      ],
      fineTraps: [
        "No IEC = cannot import. Apply online via DGFT",
        "Missing BIS certificate: goods held at port",
        "India customs duty structure is complex (BCD + IGST + cess + anti-dumping)",
        "Under-invoicing: Indian customs compares against NIDB (National Import Database)",
        "Restricted goods without license: confiscation",
      ],
      beginnerWarnings: [
        "Get IEC (Import Export Code) from DGFT before importing — it's free",
        "BIS certification is mandatory for 370+ product categories",
        "India's duty structure is layered — calculate total landed cost including all components",
        "FSSAI registration/license is mandatory for ALL food imports",
        "Indian customs is fully electronic via ICEGATE — but paperwork must be perfect",
      ],
    },
    exportCore: {
      requiredDocs: ["commercial_invoice", "packing_list", "shipping_bill"],
      filingRequirements: [
        "Shipping Bill via ICEGATE",
        "IEC number for exporter",
        "e-BRC (Bank Realization Certificate) for export proceeds",
      ],
      commonLicenses: [
        "DGFT export license for restricted goods",
        "Phytosanitary certificate (EIC/agricultural products)",
        "SCOMET license (dual-use items — Special Chemicals, Organisms, Materials, Equipment, and Technologies)",
      ],
      brokerCheckpoints: [
        "File Shipping Bill in ICEGATE",
        "Verify MEIS/RoDTEP export incentive eligibility",
        "Obtain Let Export Order (LEO) from customs",
        "Screen against India's DGFT denied entities list",
      ],
      fineTraps: [
        "Missing Shipping Bill: penalties from customs",
        "SCOMET violations: severe penalties",
      ],
      beginnerWarnings: [
        "All Indian exports need a Shipping Bill filed in ICEGATE",
        "RoDTEP scheme can provide duty remission — check eligibility",
        "SCOMET controls apply to dual-use technology — verify classification",
      ],
    },
    customsDeclarationSystem: { name: "ICEGATE", description: "Indian Customs Electronic Gateway", url: "https://www.icegate.gov.in" },
    singleWindow: { name: "Indian Customs Single Window (ICSW)", description: "Single interface for all import/export clearances", url: "https://www.icegate.gov.in" },
    source: { authority: "Central Board of Indirect Taxes and Customs (CBIC)", url: "https://www.cbic.gov.in", jurisdiction: "IN", modeRelevance: ["sea", "air"], stageRelevance: ["pre_shipment", "in_transit", "arrival", "clearance"], reviewDate: "2026-03-15", rulesVersion: RULE_PACKS_VERSION },
  },
};

// ── EU National Overlays ──────────────────────────────────────────────

export interface EUNationalOverlay {
  code: string;
  name: string;
  customsPortal: FilingSystem;
  helpReferences: string[];
}

export const EU_NATIONAL_OVERLAYS: Record<string, EUNationalOverlay> = {
  DE: {
    code: "DE",
    name: "Germany",
    customsPortal: { name: "ATLAS (Automatisiertes Tarif- und Lokales Zollabwicklungssystem)", description: "German customs electronic declaration system", url: "https://www.zoll.de" },
    helpReferences: ["German Customs (Zoll): https://www.zoll.de", "BAFA dual-use export controls: https://www.bafa.de"],
  },
  IT: {
    code: "IT",
    name: "Italy",
    customsPortal: { name: "AIDA (Automazione Integrata Dogane Accise)", description: "Italian customs electronic system", url: "https://www.adm.gov.it" },
    helpReferences: ["Agenzia delle Dogane e dei Monopoli: https://www.adm.gov.it"],
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    customsPortal: { name: "AGS (Aangiftesysteem)", description: "Dutch customs declaration system", url: "https://www.douane.nl" },
    helpReferences: ["Douane Nederland: https://www.douane.nl", "Article 23 VAT deferment common for NL imports"],
  },
  FR: {
    code: "FR",
    name: "France",
    customsPortal: { name: "DELTA (Dédouanement en Ligne par Traitement Automatisé)", description: "French customs electronic system", url: "https://www.douane.gouv.fr" },
    helpReferences: ["DGDDI: https://www.douane.gouv.fr", "SBDU for dual-use controls"],
  },
  ES: {
    code: "ES",
    name: "Spain",
    customsPortal: { name: "DUA Electronic (Documento Único Administrativo)", description: "Spanish customs system via AEAT", url: "https://www.agenciatributaria.es" },
    helpReferences: ["AEAT Aduanas: https://www.agenciatributaria.es"],
  },
};

// ── Commodity Overlays ────────────────────────────────────────────────

export const COMMODITY_OVERLAYS: Record<string, CommodityOverlay> = {
  general: {
    id: "general",
    name: "General Cargo",
    hsPatterns: [],
    additionalDocs: [],
    additionalFilings: [],
    advisories: [],
    beginnerWarnings: [],
  },
  food: {
    id: "food",
    name: "Food / Beverage / Food-Contact",
    hsPatterns: ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"],
    additionalDocs: ["health_certificate", "phytosanitary_certificate", "lab_analysis_report"],
    additionalFilings: [
      "FDA prior notice (US)", "FSSAI registration (India)", "INVIMA (Colombia)",
      "MHLW food sanitation notification (Japan)", "MFDS notification (South Korea)",
      "TRACES NT health certificate (EU)", "COFEPRIS (Mexico)", "ANVISA (Brazil)",
    ],
    advisories: [
      "Cold chain documentation required for temperature-sensitive goods",
      "Shelf life / expiration date must be clearly labeled",
      "Country-specific labeling requirements vary significantly",
    ],
    beginnerWarnings: [
      "Food imports have the most complex regulatory requirements across all jurisdictions",
      "Get health/sanitary certificates from origin country BEFORE shipping",
      "Labeling requirements are different in every country — verify with destination broker",
    ],
  },
  medical: {
    id: "medical",
    name: "Medical / Pharma",
    hsPatterns: ["29","30","3004","9018","9019","9020","9021","9022"],
    additionalDocs: ["gmp_certificate", "free_sale_certificate", "drug_registration", "device_listing"],
    additionalFilings: [
      "FDA 510(k) or device listing (US)", "CE marking / MDR (EU)", "PMDA approval (Japan)",
      "CDSCO approval (India)", "ANVISA registration (Brazil)", "COFEPRIS (Mexico)",
      "INVIMA (Colombia)", "MFDS (South Korea)",
    ],
    advisories: [
      "Cold chain documentation mandatory for temperature-sensitive pharmaceuticals",
      "WHO prequalification may be required for certain markets",
      "Controlled substance regulations apply across all jurisdictions",
    ],
    beginnerWarnings: [
      "Medical/pharma imports require regulatory approval in EVERY destination country",
      "Registration timelines: weeks to years depending on product class and jurisdiction",
      "GMP certificates from the manufacturing facility are universally required",
    ],
  },
  batteries: {
    id: "batteries",
    name: "Batteries / Electronics / DG-Sensitive",
    hsPatterns: ["8507","8471","8517","8525","8528","3601","3602","3603"],
    additionalDocs: ["dangerous_goods_declaration", "un38_3_test_report", "msds_sds", "fcc_declaration"],
    additionalFilings: [
      "IATA DG packing instructions (PI965-PI970) for air",
      "IMDG Code compliance for sea",
      "FCC declaration (US)", "CCC certification (China)", "KC certification (Korea)",
      "BIS certification (India)", "CE/RED marking (EU)", "UKCA marking (UK)",
    ],
    advisories: [
      "Lithium battery shipments face strict carrier and airline restrictions",
      "Proper shipping name, UN number, and packing group MUST be on packaging",
      "Some airlines refuse lithium batteries entirely — confirm before booking air freight",
    ],
    beginnerWarnings: [
      "UN38.3 test report is MANDATORY for all lithium battery shipments",
      "MSDS/SDS must accompany all DG shipments",
      "Mis-declaring DG goods can result in criminal penalties and carrier blacklisting",
      "Air freight DG shipments require trained/certified shipper",
    ],
  },
  ecommerce: {
    id: "ecommerce",
    name: "E-Commerce / Marketplace Flows",
    hsPatterns: [],
    additionalDocs: ["platform_seller_agreement", "product_safety_certificate"],
    additionalFilings: [
      "De minimis threshold varies by country (US: $800, EU: €150, etc.)",
      "IOSS registration for EU low-value imports",
      "Amazon FBA: FNSKU labeling + carton-level packing list",
      "Mercado Libre: RUT/NIT verification + INVIMA for regulated goods",
    ],
    advisories: [
      "Marketplace platforms may require specific product safety certifications",
      "Returns/reverse logistics create additional customs complexity",
      "Product labeling/packaging requirements vary by destination market",
    ],
    beginnerWarnings: [
      "De minimis thresholds are different everywhere — don't assume duty-free",
      "Platform compliance requirements (FBA, ML) are IN ADDITION to customs requirements",
      "Product safety testing (CPC/CPSIA for US, CE for EU) is YOUR responsibility as the seller",
    ],
  },
};

// ── Mode Overlays ─────────────────────────────────────────────────────

export const MODE_OVERLAYS: Record<string, ModeOverlay> = {
  sea: {
    mode: "sea",
    additionalDocs: ["bill_of_lading", "fumigation_certificate"],
    advisories: [
      "VGM (Verified Gross Mass) declaration required under SOLAS",
      "Container weight must match BOL declaration",
      "ISF 10+2 for US-bound ocean (file 24h before departure)",
      "AFR for Japan-bound ocean (file 24h before loading)",
    ],
    beginnerWarnings: [
      "Ocean freight advance filing deadlines are strict — miss them and the container doesn't load",
      "Demurrage and detention fees start immediately if you're slow to clear",
    ],
  },
  air: {
    mode: "air",
    additionalDocs: ["air_waybill"],
    advisories: [
      "IATA DG regulations apply for hazardous materials",
      "Air cargo security screening may add 1-2 days",
      "Known shipper status can expedite screening",
    ],
    beginnerWarnings: [
      "Air freight is fast but DG restrictions are strict — verify before booking",
      "Volumetric weight often exceeds actual weight — affects pricing",
    ],
  },
  land: {
    mode: "land",
    additionalDocs: ["cmr_consignment_note", "truck_manifest"],
    advisories: [
      "USMCA/T-MEC compliance for US-Mexico-Canada land freight",
      "Cabotage restrictions may apply",
      "Border crossing documentation must be pre-filed",
    ],
    beginnerWarnings: [
      "Land border crossings have specific hours and documentation requirements",
      "USMCA origin certificates must be accurate for preferential treatment",
    ],
  },
};

// ── Stage Overlays ────────────────────────────────────────────────────

export const STAGE_OVERLAYS: Record<string, StageOverlay> = {
  pre_shipment: {
    stage: "pre_shipment",
    label: "Pre-Shipment",
    guidance: [
      "Ensure all core documents are prepared",
      "File advance declarations where required",
      "Verify permits and licenses are obtained",
      "Confirm importer registration at destination",
      "Screen all parties against sanctions lists",
    ],
    notApplicableYet: ["arrival_notice", "delivery_order", "customs_release", "proof_of_delivery"],
  },
  in_transit: {
    stage: "in_transit",
    label: "In Transit",
    guidance: [
      "Monitor carrier tracking for ETA changes",
      "Prepare arrival documentation",
      "Pre-file customs entry if allowed by destination",
      "Confirm broker is ready to clear upon arrival",
    ],
    notApplicableYet: ["customs_release", "proof_of_delivery"],
  },
  arrival: {
    stage: "arrival",
    label: "Arrival",
    guidance: [
      "File customs entry/declaration",
      "Pay duties, taxes, and fees",
      "Coordinate inspection if selected",
      "Obtain customs release",
    ],
    notApplicableYet: ["proof_of_delivery"],
  },
  clearance: {
    stage: "clearance",
    label: "Clearance / Post-Arrival",
    guidance: [
      "Confirm customs release obtained",
      "Arrange final delivery/warehousing",
      "Obtain proof of delivery",
      "Retain records for audit period (5-7 years in most jurisdictions)",
    ],
    notApplicableYet: [],
  },
};
