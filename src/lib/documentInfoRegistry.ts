/**
 * DOCUMENT INFO REGISTRY
 * 
 * Lane-context-aware document descriptions, requirements,
 * common mistakes, and template field definitions.
 */

export interface DocFieldGuide {
  field: string;
  description: string;
  whereToFind: string;
  format: string;
}

export interface DocInfo {
  name: string;
  whatItIs: string;
  whyRequired: string;
  mustInclude: string[];
  commonMistakes: string[];
  templateFields: DocFieldGuide[];
  walkthrough: string[];
  laneDelayWarnings: string[];
}

// ── Base document definitions ─────────────────────────────────────────

const BASE_DOCS: Record<string, Omit<DocInfo, "whyRequired" | "laneDelayWarnings">> = {
  commercial_invoice: {
    name: "Commercial Invoice",
    whatItIs: "The primary transaction record between buyer and seller. It establishes the value of goods for customs duty calculation and serves as the legal basis for the sale.",
    mustInclude: [
      "Seller/exporter name and full address",
      "Buyer/importer name and full address",
      "Invoice number and date",
      "Detailed description of goods",
      "HS/tariff classification code(s)",
      "Quantity, unit price, and total value",
      "Currency of transaction",
      "Terms of sale (Incoterms)",
      "Country of origin of goods",
      "Weight (net and gross)",
    ],
    commonMistakes: [
      "Mismatched values between invoice and packing list totals",
      "Missing or incorrect HS codes leading to classification disputes",
      "Using abbreviations or vague descriptions instead of full product details",
    ],
    templateFields: [
      { field: "Invoice Number", description: "Unique identifier for this transaction", whereToFind: "Your accounting/ERP system", format: "Alphanumeric, e.g. INV-2026-0042" },
      { field: "Invoice Date", description: "Date the invoice was issued", whereToFind: "Date of sale agreement", format: "YYYY-MM-DD" },
      { field: "Seller Name & Address", description: "Legal entity name and registered address of the exporter", whereToFind: "Company registration documents", format: "Full legal name + street, city, country" },
      { field: "Buyer Name & Address", description: "Legal entity name and registered address of the importer", whereToFind: "Purchase order or contract", format: "Full legal name + street, city, country" },
      { field: "Description of Goods", description: "Detailed product description matching HS classification", whereToFind: "Product catalog or purchase order", format: "Plain language, specific (not 'electronics' but 'lithium-ion battery packs, 3.7V, 5000mAh')" },
      { field: "HS Code", description: "Harmonized System tariff classification", whereToFind: "Product classification tool or customs broker", format: "6-10 digit numeric code, e.g. 8507.60.00" },
      { field: "Quantity & Unit Price", description: "Number of units and price per unit", whereToFind: "Purchase order", format: "Numeric with currency symbol" },
      { field: "Total Value", description: "Total transaction value", whereToFind: "Calculated from qty × unit price", format: "Numeric with currency, e.g. USD 12,500.00" },
      { field: "Incoterms", description: "International commercial terms defining responsibility split", whereToFind: "Sales contract", format: "e.g. FOB Shanghai, CIF Miami, DDP Bogotá" },
      { field: "Country of Origin", description: "Where the goods were manufactured or substantially transformed", whereToFind: "Supplier certificate or manufacturing records", format: "Full country name, e.g. 'China'" },
    ],
    walkthrough: [
      "Start with your company header — include full legal name, address, and tax/VAT ID.",
      "Add the buyer's complete details including their import license or tax ID if required by the destination country.",
      "Assign a unique invoice number and today's date.",
      "List each product line with a detailed description, HS code, quantity, unit price, and line total.",
      "Specify the Incoterms agreed in your sales contract (e.g., FOB, CIF, DDP).",
      "Add the country of origin for each product line.",
      "Calculate and display the grand total with the correct currency.",
      "Include payment terms and bank details if required.",
      "Sign or stamp the invoice if required by the destination country.",
    ],
  },

  packing_list: {
    name: "Packing List",
    whatItIs: "A detailed inventory of the shipment's contents, describing how goods are packed, their weights, and dimensions. Used by customs and logistics handlers to verify cargo.",
    mustInclude: [
      "Shipper and consignee details",
      "Reference to commercial invoice number",
      "Detailed description of each package",
      "Number of packages, cartons, or pallets",
      "Net and gross weight per package",
      "Dimensions per package (L × W × H)",
      "Marks and numbers on packages",
      "Total shipment weight and volume",
    ],
    commonMistakes: [
      "Weight totals not matching the commercial invoice",
      "Missing package marks/numbers causing cargo identification issues",
      "Not specifying packaging type (carton, pallet, crate) leading to handling problems",
    ],
    templateFields: [
      { field: "Invoice Reference", description: "Links this packing list to the commercial invoice", whereToFind: "Your commercial invoice", format: "e.g. INV-2026-0042" },
      { field: "Package Count", description: "Total number of packages in the shipment", whereToFind: "Warehouse packing records", format: "Numeric, e.g. 24 cartons on 2 pallets" },
      { field: "Marks & Numbers", description: "Identifiers printed on each package", whereToFind: "Shipping labels on packages", format: "e.g. 'ABC-001 to ABC-024'" },
      { field: "Net Weight", description: "Weight of goods without packaging", whereToFind: "Product specs or warehouse scale", format: "kg, e.g. 450.5 kg" },
      { field: "Gross Weight", description: "Total weight including packaging", whereToFind: "Warehouse scale after packing", format: "kg, e.g. 520.0 kg" },
      { field: "Dimensions", description: "Length × Width × Height of each package", whereToFind: "Measured after packing", format: "cm, e.g. 120 × 80 × 100 cm" },
    ],
    walkthrough: [
      "Reference the commercial invoice number at the top.",
      "List every package with its marks, numbers, and contents.",
      "Record net and gross weight for each package.",
      "Add dimensions for each package or pallet.",
      "Sum up totals for the entire shipment.",
      "Cross-check totals against the commercial invoice.",
    ],
  },

  bill_of_lading: {
    name: "Bill of Lading",
    whatItIs: "A legal document issued by the ocean carrier that serves as a receipt of goods, a contract of carriage, and a document of title. It is essential for sea freight shipments.",
    mustInclude: [
      "Shipper (exporter) name and address",
      "Consignee (importer) name and address",
      "Notify party details",
      "Vessel name and voyage number",
      "Port of loading and port of discharge",
      "Description of goods matching the commercial invoice",
      "Number of containers or packages",
      "Container numbers and seal numbers",
      "Freight terms (prepaid or collect)",
      "B/L number and date of issue",
    ],
    commonMistakes: [
      "Consignee name not matching the importer of record, causing customs holds",
      "Goods description too vague or not matching the invoice description",
      "Missing or incorrect container/seal numbers leading to inspection triggers",
    ],
    templateFields: [
      { field: "B/L Number", description: "Unique bill of lading identifier from the carrier", whereToFind: "Issued by shipping line after booking", format: "Alphanumeric, e.g. MAEU123456789" },
      { field: "Shipper", description: "The party shipping the goods (exporter)", whereToFind: "Sales contract", format: "Full legal name and address" },
      { field: "Consignee", description: "The party receiving the goods (importer)", whereToFind: "Purchase order or letter of credit", format: "Full legal name and address, or 'To Order'" },
      { field: "Vessel / Voyage", description: "Ship name and voyage number", whereToFind: "Carrier booking confirmation", format: "e.g. MSC ANNA / 026E" },
      { field: "Container Number", description: "Unique container identifier", whereToFind: "Container release or booking confirmation", format: "e.g. MSKU1234567" },
      { field: "Seal Number", description: "Security seal on the container", whereToFind: "Applied at origin warehouse/port", format: "Numeric, e.g. 7654321" },
    ],
    walkthrough: [
      "Confirm the booking with the shipping line and obtain a draft B/L.",
      "Verify shipper and consignee details match your commercial invoice exactly.",
      "Confirm the port of loading, port of discharge, and final destination.",
      "Ensure goods description, weight, and package count match your documents.",
      "Record container and seal numbers accurately.",
      "Review the draft B/L carefully before the carrier issues the original.",
      "Choose 'Original' or 'Telex Release' depending on your payment terms.",
    ],
  },

  air_waybill: {
    name: "Air Waybill (AWB)",
    whatItIs: "A transport document for air cargo that serves as a receipt and contract of carriage. Unlike a B/L, it is not a document of title.",
    mustInclude: [
      "Shipper and consignee details",
      "Airport of departure and destination",
      "Flight number and date",
      "Description of goods",
      "Number of pieces, weight, and dimensions",
      "Declared value for carriage and customs",
      "Handling information and special instructions",
    ],
    commonMistakes: [
      "Incorrect declared weight causing recalculation of freight charges at the airport",
      "Missing dangerous goods declarations for lithium batteries or chemicals",
      "Consignee details not matching customs registration in destination country",
    ],
    templateFields: [
      { field: "AWB Number", description: "Unique air waybill number from the airline", whereToFind: "Issued by airline or freight forwarder", format: "e.g. 074-12345678" },
      { field: "Airport of Departure", description: "IATA code of origin airport", whereToFind: "Booking confirmation", format: "3-letter code, e.g. BOG, JFK, PVG" },
      { field: "Airport of Destination", description: "IATA code of destination airport", whereToFind: "Booking confirmation", format: "3-letter code, e.g. MIA, FRA, NRT" },
      { field: "Pieces / Weight", description: "Number of pieces and total weight", whereToFind: "Packing list", format: "e.g. 5 pcs / 125.0 kg" },
    ],
    walkthrough: [
      "Provide shipper and consignee details to the airline or forwarder.",
      "Confirm the routing — direct or via transshipment.",
      "Declare accurate weight and dimensions (volumetric weight may apply).",
      "Include any special handling codes (e.g., PER for perishables, DGR for dangerous goods).",
      "Review the AWB before the flight departs.",
    ],
  },

  certificate_of_origin: {
    name: "Certificate of Origin",
    whatItIs: "An official document certifying the country where the goods were manufactured or substantially transformed. Required for preferential tariff treatment under trade agreements.",
    mustInclude: [
      "Exporter name and address",
      "Consignee/importer details",
      "Description of goods matching the invoice",
      "HS code(s)",
      "Country of origin declaration",
      "Certifying authority stamp/signature",
      "Certificate number and date",
    ],
    commonMistakes: [
      "Claiming preferential origin without meeting the Rules of Origin criteria",
      "Certificate not signed or stamped by the authorized chamber of commerce",
      "Product description not matching the commercial invoice exactly",
    ],
    templateFields: [
      { field: "Certificate Number", description: "Unique ID issued by the certifying body", whereToFind: "Chamber of commerce or trade ministry", format: "Alphanumeric" },
      { field: "Certifying Authority", description: "The body that verifies and stamps the certificate", whereToFind: "Local chamber of commerce", format: "Official name and stamp" },
      { field: "Origin Criteria", description: "The rule of origin met (e.g., wholly obtained, substantial transformation)", whereToFind: "Trade agreement annex or origin rules", format: "e.g. 'WO' (wholly obtained), 'PSR' (product-specific rule)" },
    ],
    walkthrough: [
      "Determine if you qualify for preferential origin under a trade agreement.",
      "Prepare the certificate form required by the destination country.",
      "Fill in exporter/importer details and goods description matching your invoice.",
      "Submit to the local chamber of commerce or authorized body for certification.",
      "Attach the certified original to your shipment documentation.",
    ],
  },

  export_declaration: {
    name: "Export Declaration",
    whatItIs: "A regulatory filing submitted to the origin country's customs authority declaring the goods being exported, their value, classification, and destination.",
    mustInclude: [
      "Exporter details and tax/registration ID",
      "Description and classification (HS code) of goods",
      "Value of goods",
      "Destination country",
      "Transport mode and carrier details",
      "License or permit references if applicable",
    ],
    commonMistakes: [
      "Filing after the goods have already departed (late filing penalties)",
      "Incorrect HS code causing export control screening failures",
      "Not including required license numbers for controlled goods",
    ],
    templateFields: [
      { field: "Exporter Tax ID", description: "Exporter's customs registration or tax ID", whereToFind: "Company customs registration", format: "Country-specific, e.g. EIN (US), NIT (CO)" },
      { field: "HS Code", description: "Tariff classification of the goods", whereToFind: "Classification tool or broker", format: "6-10 digits" },
      { field: "FOB Value", description: "Free on board value of the goods", whereToFind: "Commercial invoice", format: "Currency + amount" },
    ],
    walkthrough: [
      "Log into your country's export filing system (e.g., AES/ACE for US, MUISCA for Colombia).",
      "Enter exporter details and customs registration.",
      "Add each product line with HS code, description, quantity, and value.",
      "Specify the destination country and transport details.",
      "Submit and retain the filing confirmation number.",
    ],
  },

  customs_declaration: {
    name: "Customs Declaration (Import Entry)",
    whatItIs: "The formal entry filed with the destination country's customs authority to declare imported goods, calculate duties, and obtain release.",
    mustInclude: [
      "Importer of record details and tax ID",
      "Description and HS classification of goods",
      "Value for duty calculation (transaction value, CIF, etc.)",
      "Country of origin",
      "Duty/tax calculation",
      "Transport document reference (B/L or AWB number)",
    ],
    commonMistakes: [
      "Undervaluing goods to reduce duties — subject to penalties and seizure",
      "Wrong HS code leading to incorrect duty rate and potential audit",
      "Missing supporting documents delaying cargo release",
    ],
    templateFields: [
      { field: "Entry Number", description: "Customs entry reference", whereToFind: "Assigned by customs broker or system", format: "Country-specific" },
      { field: "Importer Tax ID", description: "Importer's customs registration", whereToFind: "Company customs registration", format: "e.g. CBP Importer Number (US), NIT (CO)" },
      { field: "Duty Amount", description: "Calculated import duty", whereToFind: "Tariff schedule × declared value", format: "Currency + amount" },
    ],
    walkthrough: [
      "Provide all shipment documents to your customs broker.",
      "Broker files the entry in the destination country's system.",
      "Verify HS codes and declared values match your commercial invoice.",
      "Pay or bond the estimated duties and taxes.",
      "Await customs release or respond to any examination requests.",
    ],
  },

  insurance_certificate: {
    name: "Insurance Certificate",
    whatItIs: "Proof that the shipment is covered by marine/cargo insurance against loss or damage during transit.",
    mustInclude: [
      "Insured party name",
      "Policy/certificate number",
      "Description of goods and shipment",
      "Insured value (typically CIF + 10%)",
      "Coverage type (All Risks, FPA, etc.)",
      "Voyage/transit details",
    ],
    commonMistakes: [
      "Insured value not covering the full CIF value + markup",
      "Policy not covering the actual transport mode or route",
      "Certificate issued after the shipment has already departed",
    ],
    templateFields: [
      { field: "Policy Number", description: "Insurance policy reference", whereToFind: "Insurance provider", format: "Alphanumeric" },
      { field: "Insured Value", description: "Value covered by the policy", whereToFind: "CIF value + 10% markup", format: "Currency + amount" },
      { field: "Coverage Type", description: "Type of coverage", whereToFind: "Insurance agreement", format: "e.g. 'Institute Cargo Clauses (A) — All Risks'" },
    ],
    walkthrough: [
      "Contact your insurance provider with shipment details.",
      "Specify the goods, value, route, and transport mode.",
      "Request the certificate before the goods depart.",
      "Ensure the certificate covers the full transit including any transshipments.",
    ],
  },

  phytosanitary_certificate: {
    name: "Phytosanitary Certificate",
    whatItIs: "An official document issued by the origin country's plant protection authority certifying that plants or plant products are free from pests and diseases and meet the destination country's import requirements.",
    mustInclude: [
      "Exporter and consignee details",
      "Description of plants/plant products",
      "Quantity and botanical name",
      "Treatment details if applicable",
      "Official stamp and signature of inspecting authority",
      "Declaration of conformity with destination requirements",
    ],
    commonMistakes: [
      "Certificate issued more than 14 days before shipment — may be rejected",
      "Not specifying the correct treatment (e.g., heat treatment, fumigation) required by the destination",
      "Botanical name missing or incorrect",
    ],
    templateFields: [
      { field: "Issuing Authority", description: "Government plant protection agency", whereToFind: "e.g. APHIS (US), ICA (CO), SENASA", format: "Official name" },
      { field: "Treatment Details", description: "Pest control treatment applied", whereToFind: "Treatment provider certificate", format: "e.g. 'Methyl bromide fumigation at 48g/m³ for 24h'" },
    ],
    walkthrough: [
      "Arrange inspection of goods by the plant protection authority before shipment.",
      "Ensure any required treatments have been performed and documented.",
      "Obtain the certificate — it must be issued close to the shipment date.",
      "Include the original certificate with your shipment documents.",
    ],
  },

  fumigation_certificate: {
    name: "Fumigation Certificate",
    whatItIs: "Proof that wooden packaging materials (pallets, crates, dunnage) have been treated against pests per ISPM-15 standards. Required by most countries to prevent the spread of wood-boring insects.",
    mustInclude: [
      "Treatment provider details",
      "Treatment method (heat treatment or methyl bromide)",
      "Date and duration of treatment",
      "ISPM-15 compliance mark",
      "Description of treated materials",
    ],
    commonMistakes: [
      "Using untreated wood packaging — cargo will be refused or quarantined",
      "Certificate not matching the actual packaging used in the shipment",
      "ISPM-15 stamp missing from the physical wood packaging",
    ],
    templateFields: [
      { field: "Treatment Method", description: "HT (heat treatment) or MB (methyl bromide)", whereToFind: "Treatment provider", format: "e.g. 'HT — 56°C core temp for 30 min'" },
      { field: "ISPM-15 Mark", description: "International phytosanitary mark on wood", whereToFind: "Stamped on each pallet/crate", format: "Country code + producer number + treatment code" },
    ],
    walkthrough: [
      "Use ISPM-15 compliant wood packaging from a certified provider.",
      "Obtain the fumigation/treatment certificate before shipment.",
      "Verify the ISPM-15 stamp is physically present on all wood packaging.",
      "Include the certificate in your document packet.",
    ],
  },

  import_permit: {
    name: "Import Permit",
    whatItIs: "A government authorization allowing the import of specific goods that are regulated, restricted, or controlled. Required before shipment for certain product categories.",
    mustInclude: [
      "Permit number and validity dates",
      "Importer details",
      "Authorized product categories and HS codes",
      "Quantity or value limits",
      "Conditions of import",
    ],
    commonMistakes: [
      "Shipping before the permit is approved — goods will be held at customs",
      "Exceeding the quantity or value limits specified in the permit",
      "Permit expired before goods arrive at destination",
    ],
    templateFields: [
      { field: "Permit Number", description: "Government-issued permit reference", whereToFind: "Issuing government agency", format: "Alphanumeric" },
      { field: "Valid From / To", description: "Permit validity period", whereToFind: "Permit document", format: "YYYY-MM-DD to YYYY-MM-DD" },
    ],
    walkthrough: [
      "Identify if your product requires an import permit in the destination country.",
      "Apply to the relevant government agency well in advance of shipment.",
      "Obtain the permit and verify it covers your product, quantity, and timeline.",
      "Include the permit reference in your customs declaration.",
    ],
  },

  export_license: {
    name: "Export License",
    whatItIs: "A government authorization required to export controlled goods such as dual-use technology, military items, or sanctioned destinations.",
    mustInclude: [
      "License number and type",
      "Exporter details",
      "End-user/consignee details",
      "Authorized product descriptions and ECCN/classification",
      "Destination country restrictions",
      "Validity period",
    ],
    commonMistakes: [
      "Exporting controlled items without checking if a license is required",
      "License not covering the specific end-user or destination",
      "Shipping after the license has expired",
    ],
    templateFields: [
      { field: "License Number", description: "Government-issued export license", whereToFind: "Export control agency (e.g., BIS for US)", format: "Alphanumeric" },
      { field: "ECCN", description: "Export Control Classification Number", whereToFind: "Product classification against the Commerce Control List", format: "e.g. 3A001, EAR99" },
    ],
    walkthrough: [
      "Classify your product against the export control list (e.g., US CCL, EU Dual-Use Regulation).",
      "Screen the end-user and destination against denied party lists.",
      "Apply for a license if required — processing can take weeks.",
      "Include the license reference in your export declaration.",
    ],
  },

  dangerous_goods_declaration: {
    name: "Dangerous Goods Declaration",
    whatItIs: "A shipper's declaration that the cargo contains hazardous materials, providing proper classification, packaging, and handling information per IATA DGR (air) or IMDG Code (sea).",
    mustInclude: [
      "UN number and proper shipping name",
      "Hazard class and division",
      "Packing group",
      "Quantity and type of packaging",
      "Emergency contact information",
      "Shipper's certification and signature",
    ],
    commonMistakes: [
      "Undeclared dangerous goods — severe penalties and carrier refusal",
      "Incorrect UN number or packing group",
      "Using non-certified packaging for hazardous materials",
    ],
    templateFields: [
      { field: "UN Number", description: "United Nations hazardous substance identifier", whereToFind: "Safety Data Sheet (SDS) of the product", format: "4-digit, e.g. UN3481 (lithium-ion batteries)" },
      { field: "Hazard Class", description: "Classification of the hazard", whereToFind: "SDS Section 14", format: "e.g. Class 9, Class 3, Class 8" },
      { field: "Packing Group", description: "Degree of danger", whereToFind: "SDS or IMDG/IATA regulations", format: "I (great), II (medium), III (minor)" },
    ],
    walkthrough: [
      "Identify the UN number and hazard class from the product's Safety Data Sheet.",
      "Ensure packaging meets the required certification for the hazard class.",
      "Complete the Shipper's Declaration form (IATA or IMO format).",
      "Provide emergency contact information.",
      "Sign the declaration — the shipper is legally responsible.",
    ],
  },

  inspection_certificate: {
    name: "Inspection Certificate",
    whatItIs: "A document issued by an independent inspection agency verifying the quality, quantity, or condition of goods before shipment. Often required by letters of credit or by the importing country.",
    mustInclude: [
      "Inspection company details",
      "Date and location of inspection",
      "Description of goods inspected",
      "Inspection findings and results",
      "Certificate number and signature",
    ],
    commonMistakes: [
      "Inspection performed by a non-accredited agency — certificate rejected",
      "Inspection date after the shipment date",
      "Scope of inspection not matching the buyer's or customs' requirements",
    ],
    templateFields: [
      { field: "Inspection Agency", description: "Accredited inspection company", whereToFind: "Buyer's requirements or L/C terms", format: "e.g. SGS, Bureau Veritas, Intertek" },
      { field: "Inspection Date", description: "When the inspection was performed", whereToFind: "Inspection report", format: "YYYY-MM-DD, must be before shipment date" },
    ],
    walkthrough: [
      "Arrange inspection with an agency acceptable to the buyer and destination customs.",
      "Schedule the inspection before the goods are packed for shipment.",
      "Obtain the certificate and verify it covers all required aspects.",
      "Include it in the document packet.",
    ],
  },
};

// ── Lane-context-aware builders ───────────────────────────────────────

interface LaneContext {
  originName: string;
  destinationName: string;
  mode: string;
  direction: "export" | "import";
}

function buildWhyRequired(docKey: string, ctx: LaneContext): string {
  const { originName, destinationName, mode } = ctx;
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  const reasons: Record<string, string> = {
    commercial_invoice: `Required by ${destinationName} customs to assess duties on goods arriving from ${originName} via ${modeLabel} freight. Without it, the shipment cannot clear customs.`,
    packing_list: `${destinationName} customs uses this to verify the cargo count and weight against the commercial invoice for ${modeLabel} shipments from ${originName}.`,
    bill_of_lading: `Legal proof of the ocean carrier's receipt of cargo from ${originName}. Required by ${destinationName} customs for sea freight clearance and serves as a document of title.`,
    air_waybill: `Transport contract for air cargo from ${originName} to ${destinationName}. Required by the airline and destination customs for cargo release.`,
    certificate_of_origin: `Certifies goods were produced in ${originName}. ${destinationName} customs requires it for tariff determination and may grant preferential rates under trade agreements.`,
    export_declaration: `Required by ${originName} customs before goods can legally leave the country via ${modeLabel} transport. Ensures export control compliance.`,
    customs_declaration: `The formal import entry filed with ${destinationName} customs. Required to calculate duties and obtain release of goods arriving from ${originName}.`,
    insurance_certificate: `Proves cargo is insured during ${modeLabel} transit from ${originName} to ${destinationName}. Often required by letters of credit and some customs authorities.`,
    phytosanitary_certificate: `${destinationName} requires proof that plant products from ${originName} are pest-free. Issued by ${originName}'s plant protection authority.`,
    fumigation_certificate: `${destinationName} requires ISPM-15 compliance for wood packaging materials on ${modeLabel} shipments from ${originName} to prevent pest transmission.`,
    import_permit: `${destinationName} government requires advance authorization before regulated goods from ${originName} can enter the country.`,
    export_license: `${originName} requires a license for controlled goods before they can be exported to ${destinationName}.`,
    dangerous_goods_declaration: `Mandatory for hazardous materials shipped via ${modeLabel} from ${originName} to ${destinationName}. Carriers and customs require proper classification.`,
    inspection_certificate: `${destinationName} or the buyer requires independent verification of goods quality before ${modeLabel} shipment from ${originName}.`,
  };

  return reasons[docKey] || `Required for ${modeLabel} shipments from ${originName} to ${destinationName}.`;
}

function buildLaneDelayWarnings(docKey: string, ctx: LaneContext): string[] {
  const { originName, destinationName, mode } = ctx;

  const baseWarnings: Record<string, string[]> = {
    commercial_invoice: [
      `${destinationName} customs frequently flags invoices with vague descriptions — be specific about materials, composition, and use.`,
      `Value discrepancies between the invoice and the ${mode === "sea" ? "bill of lading" : "air waybill"} trigger inspections.`,
      `Missing HS codes on the ${originName} → ${destinationName} lane cause classification delays of 3-7 business days.`,
    ],
    packing_list: [
      `Weight mismatches between packing list and ${mode === "sea" ? "B/L" : "AWB"} are a top cause of holds on the ${originName} → ${destinationName} lane.`,
      `${destinationName} customs may inspect cargo if package counts don't match across documents.`,
    ],
    bill_of_lading: [
      `Consignee name must exactly match the importer of record registered with ${destinationName} customs — even minor differences cause holds.`,
      `Late B/L amendments after vessel departure incur carrier fees and can delay customs filing.`,
      `'To Order' B/Ls require bank endorsement — ensure this is arranged before arrival.`,
    ],
    air_waybill: [
      `Volumetric weight often exceeds actual weight for air cargo — verify chargeable weight matches the AWB.`,
      `DG shipments with incorrect AWB markings will be rejected by the airline at ${originName} airport.`,
    ],
    certificate_of_origin: [
      `${destinationName} customs may reject certificates not issued by a recognized chamber of commerce in ${originName}.`,
      `Claiming preferential origin without supporting manufacturing records triggers audits.`,
    ],
    export_declaration: [
      `Late filing in ${originName} can result in penalties and shipment holds at the port/airport.`,
      `${originName} export control screening failures block the shipment entirely.`,
    ],
    fumigation_certificate: [
      `Missing ISPM-15 stamps on physical wood packaging cause quarantine at ${destinationName} port — regardless of having the certificate.`,
      `${destinationName} increasingly requires photo evidence of treatment stamps.`,
    ],
  };

  return baseWarnings[docKey] || [
    `Ensure this document is prepared before the ${mode} departure from ${originName}.`,
    `Verify all details match your other shipment documents to avoid holds at ${destinationName}.`,
  ];
}

// ── Public API ────────────────────────────────────────────────────────

export function getDocInfo(
  docKey: string,
  originName: string,
  destinationName: string,
  mode: string,
): DocInfo | null {
  // Normalize key
  const normalized = docKey.toLowerCase().replace(/[^a-z_]/g, "");
  const base = BASE_DOCS[normalized];

  if (!base) return null;

  const ctx: LaneContext = {
    originName,
    destinationName,
    mode,
    direction: "export", // We show both export and import context
  };

  return {
    ...base,
    whyRequired: buildWhyRequired(normalized, ctx),
    laneDelayWarnings: buildLaneDelayWarnings(normalized, ctx),
  };
}

export function normalizeDocKey(docName: string): string {
  return docName.toLowerCase().replace(/[^a-z_]/g, "").replace(/\s+/g, "_");
}
