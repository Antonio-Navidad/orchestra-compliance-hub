// Educational content for compliance engine interactive drawers
// This provides detailed explanations, penalties, examples, and guidance per country

import type { CountryComplianceProfile, RequiredDocument, CommonViolation, FilingRequirement } from "./complianceEngineData";

export interface DocumentEducation {
  description: string;
  whoCreatesIt: string;
  whyRequired: string;
  requiredFields: string[];
  topMistakes: string[];
  penalty: string;
  templateAvailable: boolean;
}

export interface FilingEducation {
  fullExplanation: string;
  deadlineExplained: string;
  penaltyIfLate: string;
  steps: string[];
  portalUrl?: string;
  portalName?: string;
}

export interface ViolationEducation {
  explanation: string;
  realExample: string;
  penaltyStructure: string;
  howOrchestraHelps: string;
  orchestraFeatureLink: string;
  severity: "critical" | "high" | "medium";
  avgFine: string;
  frequency: "very_common" | "common" | "occasional";
}

export interface AuthorityEducation {
  filingSystemExplanation: string;
  howToAccess: string;
  credentialsNeeded: string;
  portalUrl: string;
  processingFactors: string[];
  aeoExplanation: string;
  howToReduceClearanceTime: string[];
  enforcementContact: string;
  topInspectionTriggers: string[];
}

export interface TradeAgreementEducation {
  preferentialRates: string;
  originCertificate: string;
  rulesOfOrigin: string;
}

export interface RestrictedGoodEducation {
  definition: string;
  licenseRequired: string;
  howToObtain: string;
  processingTime: string;
  consequences: string;
  regulatoryRef: string;
}

// Document education data - keyed by document name
const DOCUMENT_EDUCATION: Record<string, DocumentEducation> = {
  "Commercial Invoice": {
    description: "The primary accounting document for international trade. It provides details of the transaction between buyer and seller, including goods description, quantities, prices, and terms of sale.",
    whoCreatesIt: "The seller/exporter creates the commercial invoice as part of the sales transaction.",
    whyRequired: "Customs authorities use it to determine the customs value of goods, assess applicable duties and taxes, and verify the nature of the transaction.",
    requiredFields: ["Buyer and seller names and addresses", "Invoice date and number", "Description of goods", "HS/tariff classification codes", "Quantity and unit of measure", "Unit price and total value", "Currency", "Incoterms (delivery terms)", "Country of origin", "Payment terms"],
    topMistakes: ["Omitting or using incorrect HS codes, causing misclassification", "Not including all cost components (assists, royalties, commissions) in the declared value", "Using vague product descriptions like 'merchandise' or 'samples'"],
    penalty: "Incorrect invoicing can result in penalties of 1-4x the duty underpaid, plus interest. Intentional undervaluation may result in seizure and criminal prosecution.",
    templateAvailable: true,
  },
  "Packing List": {
    description: "A detailed document listing how goods are packed — carton numbers, dimensions, weights, and contents of each package in a shipment.",
    whoCreatesIt: "The shipper/exporter prepares the packing list during packing and before shipment.",
    whyRequired: "Customs uses it to verify the physical contents of a shipment against the commercial invoice and to plan inspections. It speeds clearance by allowing targeted inspection.",
    requiredFields: ["Shipper and consignee details", "Invoice reference number", "Package marks and numbers", "Number of packages per item", "Net and gross weights per package", "Dimensions per package", "Total shipment weight and volume"],
    topMistakes: ["Weight discrepancies between packing list and actual cargo", "Not matching package counts to the bill of lading", "Missing carton-level detail when customs requests inspection"],
    penalty: "Discrepancies between packing list and actual goods trigger physical inspection, causing delays of 3-10 days. Repeated errors flag the importer for enhanced scrutiny.",
    templateAvailable: true,
  },
  "Bill of Lading / Airway Bill": {
    description: "A transport document issued by the carrier that serves as a receipt for goods, evidence of the contract of carriage, and (for ocean BLs) a document of title to the goods.",
    whoCreatesIt: "The shipping line (ocean) or airline (air) issues it after receiving the cargo.",
    whyRequired: "It proves the carrier received the goods and is legally committed to deliver them. Customs requires it to match declared goods against what was actually loaded onto the vessel or aircraft.",
    requiredFields: ["Shipper and consignee names", "Notify party", "Vessel/flight details", "Port of loading and discharge", "Description of goods", "Number of packages", "Gross weight", "Container/seal numbers (ocean)", "Freight payment terms"],
    topMistakes: ["Consignee name mismatches between BL and import declaration", "Incorrect container or seal numbers", "Late amendments or corrections after vessel departure (costly switch bills)"],
    penalty: "Mismatches between BL data and customs declaration cause automatic holds. Incorrect BL information can delay clearance by 5-15 days while amendments are processed.",
    templateAvailable: false,
  },
  "Certificate of Origin": {
    description: "An official document certifying where goods were manufactured or substantially transformed. Used to determine applicable duty rates, especially under free trade agreements.",
    whoCreatesIt: "The exporter or an authorized body (chamber of commerce, customs authority) in the country of origin issues it.",
    whyRequired: "Customs authorities use it to apply the correct tariff rate, enforce trade agreement preferences, determine if anti-dumping or countervailing duties apply, and verify compliance with trade sanctions.",
    requiredFields: ["Exporter details", "Producer information", "Description of goods", "HS tariff classification", "Origin criteria met", "Certification by authorized body", "Date and signature", "FTA-specific fields (if claiming preferential rates)"],
    topMistakes: ["Using the wrong form version for the specific FTA being claimed", "Failing to meet rules of origin requirements (insufficient local content/processing)", "Not having supporting documentation to substantiate origin claims in case of audit"],
    penalty: "Invalid origin certificates result in loss of preferential tariff rates (duty increase of 5-25%), plus potential penalties for false claims. Post-clearance audits can go back 3-5 years.",
    templateAvailable: true,
  },
  "CBP Form 7501 (Entry Summary)": {
    description: "The official U.S. customs entry summary document used to declare imported goods, their classification, value, and applicable duties to CBP.",
    whoCreatesIt: "The licensed customs broker files it on behalf of the importer of record.",
    whyRequired: "It is the primary document CBP uses to assess and collect duties, taxes, and fees on imported goods. It's legally required for all formal entries.",
    requiredFields: ["Importer of record number", "Entry number and date", "Port of entry", "HTS classification for each line item", "Country of origin", "Manufacturer ID", "Entered value", "Duty rate and amount", "Other government agency flags"],
    topMistakes: ["Incorrect HTS classification leading to wrong duty assessment", "Missing manufacturer ID codes", "Failing to include assists or royalties in the declared value"],
    penalty: "Negligent misclassification: 2x the duty loss. Gross negligence: 4x the duty loss plus potential fraud penalties up to $10,000 per violation.",
    templateAvailable: false,
  },
  "ISF 10+2 (Importer Security Filing)": {
    description: "A U.S. security filing required for ocean shipments. The importer must provide 10 data elements and the carrier provides 2 elements, all before vessel departure.",
    whoCreatesIt: "The importer or their customs broker must file it. The ocean carrier files the +2 vessel stow plan and container status elements.",
    whyRequired: "CBP uses ISF data to identify high-risk cargo before it arrives at U.S. ports. It's a core component of the Container Security Initiative.",
    requiredFields: ["Manufacturer name and address", "Seller name and address", "Buyer name and address", "Ship-to party", "Container stuffing location", "Consolidator", "Importer of record number", "Consignee number", "Country of origin", "HS tariff number"],
    topMistakes: ["Filing after the 24-hour deadline (must be before vessel departure, not arrival)", "Using placeholder data ('TBD' or 'unknown') for required fields", "Not updating the ISF when shipment details change"],
    penalty: "$5,000 per violation for late or inaccurate filing. CBP can also issue do-not-load orders and hold cargo for examination.",
    templateAvailable: false,
  },
  "Customs Bond (>$2,500 value)": {
    description: "A financial guarantee that the importer will pay all duties, taxes, and fees owed to CBP. Required for all formal entries valued over $2,500.",
    whoCreatesIt: "A surety company issues the bond. The importer or their broker arranges it.",
    whyRequired: "CBP requires it as a guarantee of payment. If the importer defaults, CBP collects from the surety company.",
    requiredFields: ["Importer name and address", "Importer of record number", "Bond type (single entry or continuous)", "Bond amount", "Surety company details", "Activity codes covered"],
    topMistakes: ["Not having a continuous bond in place before the first shipment arrives", "Bond amount too low for the actual duty exposure", "Letting a continuous bond lapse without renewal"],
    penalty: "Without a valid bond, goods cannot be released from customs. Emergency single-entry bonds cost 2-3x more than planned bonds.",
    templateAvailable: false,
  },
  "FDA Prior Notice (food/medical)": {
    description: "An advance notification to the U.S. FDA required for all food, dietary supplement, and certain medical product imports before they arrive.",
    whoCreatesIt: "The importer, broker, or manufacturer files it through the FDA Prior Notice System Interface.",
    whyRequired: "The Bioterrorism Act of 2002 requires FDA to receive advance notice of food imports to screen for safety and security risks.",
    requiredFields: ["Product description and FDA product code", "Manufacturer details", "Shipper information", "Country of production", "Anticipated arrival information", "Anticipated port of entry", "Prior Notice confirmation number"],
    topMistakes: ["Filing too late (must be 15 days before sea arrival or 4 hours before air)", "Incorrect FDA product codes", "Not updating the notice when arrival port or date changes"],
    penalty: "Shipments without valid prior notice are subject to refusal of admission and may be held at port. Repeated violations can lead to automatic detention.",
    templateAvailable: false,
  },
  "DEX Export Declaration": {
    description: "Colombia's export customs declaration (Declaración de Exportación). It registers the export transaction with DIAN and is required for all goods leaving Colombia.",
    whoCreatesIt: "The exporter or their authorized customs agent files it through MUISCA.",
    whyRequired: "DIAN requires it for export control, trade statistics, and to validate VAT refund claims for exporters.",
    requiredFields: ["Exporter NIT and details", "Buyer information", "Goods description", "Tariff heading", "FOB value", "Transport mode", "Port of departure", "Country of destination"],
    topMistakes: ["Value mismatches between DEX and commercial invoice", "Filing after the cargo has already departed", "Incorrect tariff heading affecting export statistics"],
    penalty: "Late filing penalties range from 1-5% of the FOB value. Missing DEX blocks VAT refund claims entirely.",
    templateAvailable: false,
  },
  "NF-e (Nota Fiscal Eletrônica)": {
    description: "Brazil's mandatory electronic invoice. It's a digital tax document that records every commercial transaction and is required for both domestic and international trade.",
    whoCreatesIt: "The seller/supplier issues it through their authorized ERP or fiscal software connected to SEFAZ.",
    whyRequired: "Brazilian tax authorities (Receita Federal and state SEFAZ) use it to track all commercial transactions for tax compliance. Without a valid NF-e, goods cannot legally move.",
    requiredFields: ["CNPJ of issuer and recipient", "Product descriptions with NCM codes", "ICMS, IPI, PIS/COFINS tax calculations", "Unit prices and total values", "Transport information", "Digital signature", "Authorization protocol number"],
    topMistakes: ["Tax calculation errors (ICMS varies by state, product, and origin)", "Incorrect NCM codes causing tax miscalculation", "Not having the NF-e authorized before cargo movement begins"],
    penalty: "Moving goods without a valid NF-e is considered tax evasion. Penalties range from 75-150% of the tax due, plus seizure of goods.",
    templateAvailable: false,
  },
  "RADAR Registration": {
    description: "Brazil's importer/exporter registration in the Receita Federal's RADAR system (Registro e Rastreamento da Atuação dos Intervenientes Aduaneiros). It's a prerequisite to any import operation.",
    whoCreatesIt: "The importing company must apply through Receita Federal. Limited RADAR covers up to $150K USD/semester; unlimited requires financial capacity proof.",
    whyRequired: "No company can import into Brazil without active RADAR registration. It connects the company to SISCOMEX and enables customs clearance operations.",
    requiredFields: ["CNPJ registration", "Company financial statements", "Legal representative identification", "Physical business address in Brazil", "Tax compliance certificates"],
    topMistakes: ["Letting RADAR expire without renewal (requires periodic revalidation)", "Operating with limited RADAR when import volumes exceed the threshold", "Not updating RADAR when company legal representatives change"],
    penalty: "Attempting to import without RADAR: goods held indefinitely at port (incurring daily storage). Expired RADAR means complete halt to import operations.",
    templateAvailable: false,
  },
};

// Fallback education for documents not in the lookup
function getDefaultDocumentEducation(docName: string, countryName: string): DocumentEducation {
  return {
    description: `${docName} is a required trade document for operations involving ${countryName}. It provides critical information needed by customs authorities for clearance.`,
    whoCreatesIt: "Typically prepared by the exporter, importer, or their authorized customs agent depending on the document type.",
    whyRequired: `${countryName}'s customs authority requires this document to verify compliance with import/export regulations and to assess applicable duties and taxes.`,
    requiredFields: ["Consignee and shipper details", "Goods description", "Values and quantities", "Transport details", "Classification codes"],
    topMistakes: ["Incomplete or missing information in required fields", "Discrepancies with other documents in the packet", "Late submission past the filing deadline"],
    penalty: "Non-compliance may result in cargo holds, fines, or additional inspections. Specific penalties vary by jurisdiction and severity.",
    templateAvailable: false,
  };
}

export function getDocumentEducation(docName: string, countryName: string): DocumentEducation {
  return DOCUMENT_EDUCATION[docName] || getDefaultDocumentEducation(docName, countryName);
}

// Authority education per country code
const AUTHORITY_EDUCATION: Record<string, AuthorityEducation> = {
  US: {
    filingSystemExplanation: "ACE (Automated Commercial Environment) is CBP's primary system for processing all imports and exports. It's a web-based portal that replaced the legacy ACS system.",
    howToAccess: "Access ACE through the CBP portal at ace.cbp.dhs.gov. Importers typically access through their licensed customs broker who has direct ACE credentials.",
    credentialsNeeded: "ACE Portal Account (for brokers), FILER Code, Importer of Record Number. Individual importers can create an ACE Secure Data Portal account.",
    portalUrl: "https://ace.cbp.dhs.gov",
    processingFactors: ["C-TPAT membership reduces inspections by 50-70%", "ISF filing timeliness and accuracy", "Import history and compliance record", "Product risk classification", "Country of origin risk tier"],
    aeoExplanation: "C-TPAT (Customs-Trade Partnership Against Terrorism) is the U.S. equivalent of AEO. Tier 2 and Tier 3 members receive significantly reduced inspections and priority processing.",
    howToReduceClearanceTime: ["Apply for C-TPAT certification", "Use a licensed customs broker with strong compliance history", "File entries and ISF early and accurately", "Maintain a continuous customs bond", "Pre-classify products with CBP binding rulings"],
    enforcementContact: "CBP Centers of Excellence and Expertise (CEEs) by industry sector. General inquiries: 1-877-227-5511. Trade compliance: CBPTrade@cbp.dhs.gov",
    topInspectionTriggers: ["First-time importer", "Shipments from high-risk countries", "Goods subject to AD/CVD orders", "Discrepancies in ISF data", "Random statistical sampling", "Products requiring OGA (FDA, USDA, CPSC) clearance"],
  },
  CO: {
    filingSystemExplanation: "MUISCA is DIAN's integrated electronic platform for tax, customs, and foreign exchange operations. All customs declarations must be filed through this system.",
    howToAccess: "Access MUISCA at muisca.dian.gov.co. Requires an authorized user account registered with DIAN.",
    credentialsNeeded: "RUT (Registro Único Tributario), Digital certificate, MUISCA user credentials. Foreign entities need a fiscal representative in Colombia.",
    portalUrl: "https://muisca.dian.gov.co",
    processingFactors: ["OEA (AEO) certification", "Importer compliance history", "Product risk profile", "Origin country risk level", "Value declaration consistency with DIAN reference prices"],
    aeoExplanation: "OEA (Operador Económico Autorizado) certification provides expedited customs clearance, reduced inspections, and dedicated processing lanes at major ports.",
    howToReduceClearanceTime: ["Obtain OEA certification", "Maintain consistent value declarations aligned with DIAN reference prices", "Pre-clear through green channel eligibility", "Ensure all VUCE authorizations are in place before shipment", "Work with experienced SIA (customs agency)"],
    enforcementContact: "DIAN Customer Service: 601-546-5557. Online: contactenos@dian.gov.co. Regional customs offices available at each port.",
    topInspectionTriggers: ["Declared values below DIAN reference prices", "New importer/exporter", "Controlled goods without VUCE", "Shipments from sanctioned origins", "Inconsistent trade patterns"],
  },
};

function getDefaultAuthorityEducation(profile: CountryComplianceProfile): AuthorityEducation {
  return {
    filingSystemExplanation: `${profile.authority.filingSystem} is the electronic customs filing system used by ${profile.authority.name}. All customs declarations and trade documentation must be submitted through this platform.`,
    howToAccess: `Access is typically through the official customs portal. Contact ${profile.authority.name} for registration details.`,
    credentialsNeeded: "Business registration, tax identification number, authorized user credentials, and in some cases a digital certificate.",
    portalUrl: "#",
    processingFactors: ["AEO/trusted trader certification", "Importer compliance history", "Product risk classification", "Country of origin risk tier", "Documentation completeness"],
    aeoExplanation: "AEO (Authorized Economic Operator) or equivalent trusted trader status provides reduced inspections, priority processing, and simplified customs procedures.",
    howToReduceClearanceTime: ["Apply for AEO/trusted trader certification", "File declarations early and accurately", "Maintain complete and consistent documentation", "Work with experienced customs brokers", "Pre-classify products with binding tariff rulings"],
    enforcementContact: `Contact ${profile.authority.name} through their official website or local customs office.`,
    topInspectionTriggers: ["First-time importer", "Shipments from high-risk origins", "Value discrepancies", "Goods requiring special permits", "Random selection", "Incomplete documentation"],
  };
}

export function getAuthorityEducation(code: string, profile: CountryComplianceProfile): AuthorityEducation {
  return AUTHORITY_EDUCATION[code] || getDefaultAuthorityEducation(profile);
}

// Violation education
function getViolationSeverity(idx: number): "critical" | "high" | "medium" {
  if (idx === 0) return "critical";
  if (idx <= 2) return "high";
  return "medium";
}

function getViolationFrequency(idx: number): "very_common" | "common" | "occasional" {
  if (idx === 0) return "very_common";
  if (idx <= 2) return "common";
  return "occasional";
}

export function getViolationEducation(violation: CommonViolation, idx: number, countryName: string): ViolationEducation {
  return {
    explanation: `${violation.detail}. This is one of the most frequently cited compliance issues by ${countryName}'s customs authority.`,
    realExample: `A shipper submits documentation with ${violation.title.toLowerCase()} — the customs authority flags the entry for examination, causing a 5-15 day delay and additional inspection fees.`,
    penaltyStructure: "Penalties vary based on severity: first offense typically 1-2x duty shortfall, repeated violations 2-4x, and intentional fraud can result in criminal prosecution.",
    howOrchestraHelps: `Orchestra's Document Intelligence and Compliance Engine automatically check for ${violation.title.toLowerCase()} before submission, catching errors before they reach customs.`,
    orchestraFeatureLink: "/doc-intel",
    severity: getViolationSeverity(idx),
    avgFine: idx === 0 ? "$5,000–$50,000" : idx <= 2 ? "$1,000–$10,000" : "$500–$5,000",
    frequency: getViolationFrequency(idx),
  };
}

// Filing education
export function getFilingEducation(filing: FilingRequirement, countryName: string): FilingEducation {
  return {
    fullExplanation: `${filing.rule}: ${filing.detail}. This is a mandatory requirement enforced by ${countryName}'s customs authority.`,
    deadlineExplained: `You must complete this filing ${filing.detail.toLowerCase().includes("before") ? "before the specified event occurs" : "within the required timeframe"}. Missing this deadline can cause cargo holds or penalties.`,
    penaltyIfLate: "Late or missing filings typically result in penalties ranging from $1,000-$10,000 per violation, plus cargo holds until compliance is achieved.",
    steps: [
      `Register for access to ${countryName}'s filing system`,
      "Gather all required data fields from your commercial documents",
      "Enter the data into the filing system accurately",
      "Submit the filing before the deadline",
      "Save the confirmation/reference number for your records",
    ],
  };
}

// Trade agreement education
export function getTradeAgreementEducation(agreementName: string): TradeAgreementEducation {
  return {
    preferentialRates: `Under the ${agreementName}, qualifying goods receive reduced or zero duty rates compared to MFN (Most Favored Nation) rates. The actual reduction depends on the product's tariff classification.`,
    originCertificate: `To claim preferential rates under ${agreementName}, you need a valid Certificate of Origin in the format specified by the agreement. Some agreements allow self-certification by the exporter.`,
    rulesOfOrigin: `Products must meet the Rules of Origin criteria defined in ${agreementName}. This typically requires that goods are wholly obtained or have undergone sufficient processing/transformation in a member country.`,
  };
}

// Restricted good education
export function getRestrictedGoodEducation(category: string, type: "licensed" | "prohibited" | "certification", countryName: string): RestrictedGoodEducation {
  if (type === "prohibited") {
    return {
      definition: `"${category}" is a category of goods that ${countryName}'s customs authority has designated as prohibited for import/export. These goods cannot legally enter or leave the country under any circumstances.`,
      licenseRequired: "No license available — these goods are fully prohibited.",
      howToObtain: "N/A — importation/exportation is not permitted.",
      processingTime: "N/A",
      consequences: "Attempted import/export of prohibited goods results in seizure, destruction of goods, fines of up to 5x the goods' value, and potential criminal prosecution.",
      regulatoryRef: `Refer to ${countryName}'s customs tariff schedule and prohibited goods list for the complete definition and exceptions.`,
    };
  }
  if (type === "licensed") {
    return {
      definition: `"${category}" refers to goods that require a specific import/export license or permit from ${countryName}'s relevant regulatory authority before they can be traded.`,
      licenseRequired: `A valid import/export license or permit issued by ${countryName}'s regulatory authority for this product category.`,
      howToObtain: "Apply through the relevant regulatory agency's portal. Provide product specifications, intended use documentation, and business credentials.",
      processingTime: "Typically 2-8 weeks depending on the product category and completeness of application.",
      consequences: "Importing/exporting without the required license results in cargo seizure, fines, and potential ban from future trade in this category.",
      regulatoryRef: `Contact ${countryName}'s customs authority or the relevant regulatory agency for current licensing requirements.`,
    };
  }
  return {
    definition: `"${category}" is a certification requirement for goods entering ${countryName}. Products in this category must carry the specified certification mark or documentation.`,
    licenseRequired: `Products must carry the ${category} certification or registration before import is permitted.`,
    howToObtain: "Apply through an accredited certification body. Submit product samples, technical documentation, and test results.",
    processingTime: "4-12 weeks depending on product complexity and testing requirements.",
    consequences: "Products without required certification are refused entry or held at customs until certification is obtained (at additional cost).",
    regulatoryRef: `Refer to the relevant certification body's website for current requirements and accredited testing laboratories.`,
  };
}
