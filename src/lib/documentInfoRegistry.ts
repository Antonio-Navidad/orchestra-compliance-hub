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
  },

  paps_document: {
    name: "PAPS Document (Pre-Arrival Processing System)",
    whatItIs: "PAPS is the U.S. land border pre-clearance system. The carrier affixes a PAPS barcode sticker to the commercial shipping documents at the point of pickup. The sticker contains a unique Cargo Control Number (CCN) composed of the carrier's SCAC code plus a sequential shipment number. The U.S. customs broker uses this CCN to pre-file the entry with CBP in ACE before the truck arrives at the border. When the driver presents the barcoded documents at the port of entry, CBP matches the physical truck to the electronic filing.",
    mustInclude: [
      "Carrier SCAC code",
      "Unique shipment number (CCN)",
      "PAPS barcode sticker physically affixed to commercial documents",
      "Matching entry number filed by broker in ACE",
      "Carrier name and DOT number",
    ],
    commonMistakes: [
      "PAPS barcode not affixed at pickup — driver arrives at border without it",
      "Broker pre-files entry with a different CCN than what appears on the sticker",
      "Carrier changes truck or trailer after sticker was affixed, invalidating the match",
      "Entry not set up in ACE before truck departs — driver turned away at border",
    ],
    templateFields: [
      { field: "Cargo Control Number (CCN)", description: "Carrier SCAC code + unique shipment number from PAPS barcode", whereToFind: "Carrier dispatch or pickup confirmation", format: "e.g. ABCD1234567" },
      { field: "Carrier SCAC Code", description: "Standard Carrier Alpha Code assigned by NMFTA", whereToFind: "Carrier's operating authority documents", format: "4-letter alpha code" },
      { field: "Entry Number", description: "CBP entry number filed by broker matching this PAPS", whereToFind: "Broker's ACE filing confirmation", format: "11-digit entry number" },
    ],
    walkthrough: [
      "Confirm with the carrier that a PAPS sticker will be affixed to the commercial documents at the point of pickup.",
      "Obtain the PAPS Cargo Control Number (CCN) from the carrier as soon as the sticker is applied.",
      "Provide the CCN to your customs broker immediately so they can pre-file the entry in ACE.",
      "Verify with the broker that the ACE entry is accepted and shows 'on file' status before the truck departs toward the border.",
      "The driver presents the barcoded commercial documents to the CBP officer at the port of entry for scanning.",
    ],
  },

  pars_document: {
    name: "PARS Document (Pre-Arrival Review System)",
    whatItIs: "PARS is Canada's pre-clearance system for commercial truck freight entering Canada. It is the Canadian equivalent of the U.S. PAPS system. The carrier affixes a PARS barcode sticker to the shipping documents at pickup. The sticker contains a Cargo Control Number (CCN) composed of the carrier's CBSA Carrier Code plus a unique shipment number. The Canadian customs broker uses this CCN to submit a release request to CBSA before the truck arrives at the Canadian border. PARS and the ACI eManifest are two completely separate requirements — both must be on file at least 1 hour before border arrival.",
    mustInclude: [
      "CBSA Carrier Code",
      "Unique shipment number (CCN)",
      "PARS barcode sticker physically affixed to shipping documents",
      "Release request filed by Canadian customs broker in CBSA system",
      "Carrier name and CBSA carrier bond number",
    ],
    commonMistakes: [
      "Confusing PARS with ACI eManifest — they are separate systems filed by different parties",
      "PARS barcode not affixed at pickup — Canadian broker cannot file release request",
      "Filing PARS but forgetting ACI eManifest — truck still refused at border",
      "Filing less than 1 hour before arrival — CBSA requires minimum 1-hour advance filing",
    ],
    templateFields: [
      { field: "Cargo Control Number (CCN)", description: "CBSA Carrier Code + unique shipment number from PARS barcode", whereToFind: "Carrier dispatch or pickup confirmation", format: "e.g. 1234-5678901" },
      { field: "CBSA Carrier Code", description: "Carrier code issued by Canada Border Services Agency", whereToFind: "Carrier's CBSA registration", format: "4-digit numeric code" },
      { field: "Release Request Number", description: "Confirmation number from CBSA after broker files PARS release", whereToFind: "Canadian customs broker's system", format: "CBSA-assigned reference number" },
    ],
    walkthrough: [
      "Confirm the carrier has a valid CBSA Carrier Code and is authorized for cross-border operations into Canada.",
      "Ensure the carrier affixes a PARS barcode sticker to the commercial documents at the point of pickup.",
      "Obtain the PARS CCN from the carrier and pass it to the Canadian customs broker immediately.",
      "The Canadian broker submits the PARS release request electronically to CBSA — verify it is accepted.",
      "Separately confirm the carrier has also filed the ACI eManifest — both must be on file ≥1 hour before border arrival.",
      "The driver presents the PARS-barcoded documents to the CBSA officer at the border crossing.",
    ],
  },

  carta_porte: {
    name: "Carta Porte / CFDI with Complemento Carta Porte (CCP)",
    whatItIs: "The Carta Porte is a mandatory Mexican digital tax document (CFDI with Complemento Carta Porte) that must accompany all freight moving through Mexican territory. It is issued by the Mexican carrier and stamped by Mexico's SAT (tax authority). For foreign trade operations crossing the U.S.-Mexico border, the Carta Porte contains a UUID — a unique fiscal identification number — that is required to generate the DODA document and complete Mexican customs clearance. Enforcement became mandatory January 1, 2024. Version 3.1 has been required since July 2024.",
    mustInclude: [
      "UUID (fiscal folio number) — the unique identifier for this Carta Porte",
      "Shipper and receiver full names and RFC (Mexican tax ID)",
      "Detailed cargo description matching the commercial invoice",
      "Total weight and number of packages",
      "Route: origin address, destination address, intermediate points",
      "Vehicle plate number and SCT permit number",
      "Driver name and license number",
      "Complemento Carta Porte version (must be 3.1 as of July 2024)",
    ],
    commonMistakes: [
      "Carrier issues Carta Porte under an outdated version (pre-3.1) — SAT rejects it",
      "UUID not shared with U.S. broker or Mexican customs broker before departure",
      "Cargo description on Carta Porte does not match the commercial invoice — triggers SAT audit",
      "Missing intermediate route points for shipments crossing multiple Mexican states",
      "Driver information incorrect or missing — truck can be impounded at Mexican checkpoints",
    ],
    templateFields: [
      { field: "UUID (Fiscal Folio)", description: "Unique fiscal identification number stamped by SAT", whereToFind: "Mexican carrier's billing/dispatch system after SAT stamping", format: "36-character UUID, e.g. 6ba7b810-9dad-11d1-80b4-00c04fd430c8" },
      { field: "Shipper RFC", description: "Mexican tax ID (Registro Federal de Contribuyentes) of the shipper", whereToFind: "Mexican supplier's tax registration", format: "12-13 alphanumeric characters" },
      { field: "Vehicle Plate Number", description: "License plate of the truck carrying the freight", whereToFind: "Carrier dispatch confirmation", format: "Mexican plate format" },
      { field: "SCT Permit Number", description: "Carrier's federal freight transport permit from SCT", whereToFind: "Carrier's operating authority documents", format: "Alphanumeric SCT permit number" },
    ],
    walkthrough: [
      "Confirm the Mexican carrier is aware that Carta Porte CCP version 3.1 is required for this shipment.",
      "Provide the carrier with accurate cargo description, weight, origin and destination addresses, and route details.",
      "The carrier generates the CFDI with Complemento Carta Porte and submits it to SAT for stamping.",
      "Obtain the UUID from the carrier once the document is stamped — this is the critical reference number.",
      "Share the UUID with the Mexican customs broker (agente aduanal) so they can generate the DODA.",
      "Store the UUID in this shipment record — it must be referenced in U.S. entry documentation for northbound clearance.",
    ],
  },

  pedimento: {
    name: "Pedimento de Importación / Exportación",
    whatItIs: "The Pedimento is Mexico's official customs declaration document, equivalent to the U.S. CBP Form 7501. It is filed electronically by a licensed Mexican customs broker (agente aduanal) through Mexico's customs system VUCEM (Ventanilla Única de Comercio Exterior Mexicano). Every commercial crossing into or out of Mexico requires a Pedimento. It contains a unique alphanumeric number that identifies the Mexican customs entry and links to all duties, taxes, and regulatory requirements on the Mexican side.",
    mustInclude: [
      "Pedimento number (unique alphanumeric identifier)",
      "Agente aduanal name, license number (patente), and aduana (customs house)",
      "Importer/exporter RFC (Mexican tax ID)",
      "Detailed cargo description with Mexican tariff classification (fracción arancelaria)",
      "Declared value in Mexican pesos (or USD with exchange rate)",
      "Country of origin",
      "Duties and taxes calculated (IVA, DTA, IGI as applicable)",
      "USMCA or other FTA claim notation if applicable",
    ],
    commonMistakes: [
      "U.S. broker not collecting the Pedimento number from the Mexican broker — delays U.S. entry filing",
      "Cargo description on Pedimento does not match U.S. commercial invoice — triggers examination on both sides",
      "Mexican tariff classification differs from U.S. HTS code for same product — requires reconciliation",
      "Pedimento filed at wrong aduana (customs house) for the selected border crossing",
    ],
    templateFields: [
      { field: "Pedimento Number", description: "Unique alphanumeric customs entry number issued by VUCEM", whereToFind: "Mexican customs broker (agente aduanal) after filing", format: "e.g. 24 41 3461 4001234" },
      { field: "Agente Aduanal Patente", description: "License number of the Mexican customs broker", whereToFind: "Mexican broker's credentials", format: "4-digit patente number" },
      { field: "Aduana", description: "Mexican customs house code where the entry is filed", whereToFind: "Determined by the border crossing location", format: "3-digit aduana code, e.g. 240 (Nuevo Laredo)" },
      { field: "Fracción Arancelaria", description: "Mexican tariff classification code", whereToFind: "Mexican broker classifies based on product description", format: "8-digit code from Mexico's tariff schedule (TIGIE)" },
    ],
    walkthrough: [
      "Confirm a licensed Mexican customs broker (agente aduanal) has been appointed for this shipment.",
      "Provide the Mexican broker with the commercial invoice (preferably in Spanish), packing list, and USMCA certificate if applicable.",
      "The Mexican broker files the Pedimento electronically through VUCEM at the appropriate aduana.",
      "Request the Pedimento number once filed — provide it to the U.S. customs broker for cross-reference.",
      "Verify the Pedimento cargo description and value match the U.S. commercial invoice before the truck departs.",
    ],
  },

  aci_emanifest: {
    name: "ACI eManifest (Advance Commercial Information)",
    whatItIs: "The ACI eManifest is a mandatory electronic pre-arrival filing required by the Canada Border Services Agency (CBSA) for all commercial truck crossings into Canada. The carrier — not the customs broker — is responsible for filing the ACI eManifest through the CBSA eManifest Portal or an approved service provider. It must be filed at least 1 hour before the truck arrives at the Canadian border. The eManifest contains conveyance data (truck, trailer, driver) and cargo data that CBSA uses for risk assessment. ACI eManifest and PARS are two completely separate systems — filing one does not fulfill the other.",
    mustInclude: [
      "Carrier CBSA Carrier Code",
      "Conveyance details: truck plate number, trailer number",
      "Driver name, date of birth, citizenship, and travel document number",
      "Cargo description matching commercial documents",
      "Shipper and consignee names and addresses",
      "Weight and number of packages",
      "Cargo Control Number (CCN) linking to PARS filing",
      "Port of entry / border crossing",
    ],
    commonMistakes: [
      "Confusing ACI eManifest (carrier responsibility) with PARS (broker responsibility) — both are required",
      "Filing less than 1 hour before arrival — AMPS penalty of $750 CAD for late filing",
      "Not filing at all — AMPS penalty up to $8,000 CAD",
      "Driver information doesn't match travel documents presented at the border",
      "Cargo weight or description doesn't match commercial invoice — triggers CBSA examination",
    ],
    templateFields: [
      { field: "CBSA Carrier Code", description: "Carrier's registered code with Canada Border Services Agency", whereToFind: "Carrier's CBSA registration documents", format: "4-digit numeric code" },
      { field: "Conveyance Reference Number (CRN)", description: "Unique trip identifier assigned by the carrier in the eManifest system", whereToFind: "Carrier's eManifest portal submission", format: "Carrier-assigned alphanumeric" },
      { field: "Driver Travel Document", description: "Passport or FAST card number of the truck driver", whereToFind: "Driver's identification documents", format: "Passport number or FAST card number" },
    ],
    walkthrough: [
      "Confirm with the carrier that they are ACI eManifest compliant and have a valid CBSA Carrier Code.",
      "Provide all shipment details (cargo description, weight, shipper/consignee info) to the carrier well before departure.",
      "The carrier files the ACI eManifest electronically at least 1 hour before the truck arrives at the Canadian border.",
      "Separately, the Canadian customs broker files the PARS release request — confirm both are on file.",
      "The driver must carry the ACI Lead Sheet (barcoded paper document) and present it to the CBSA officer at the border.",
      "Verify the eManifest status shows 'accepted' in the carrier's portal before the truck departs.",
    ],
  },

  carm_registration: {
    name: "CARM Client Portal Registration Confirmation",
    whatItIs: "CARM (CBSA Assessment and Revenue Management) is Canada's customs processing system that became the official system of record on October 21, 2024, replacing the legacy ACROSS system. All Canadian importers must be registered in the CARM Client Portal with a Business Number (BN) and must have posted their own financial security (surety bond or cash deposit) to receive goods before paying duties under the Release Prior to Payment (RPP) program. As of May 20, 2025, customs brokers can no longer post their own security on behalf of importers — importers must register and post security themselves.",
    mustInclude: [
      "Canadian importer's Business Number (BN)",
      "CARM Client Portal registration confirmation",
      "Release Prior to Payment (RPP) enrollment status",
      "Financial security posting confirmation (surety bond or cash deposit)",
      "Broker delegation authorization in the CARM portal",
    ],
    commonMistakes: [
      "Assuming the customs broker can post security on behalf of the importer — this ended May 20, 2025",
      "Importer not registered in CARM — goods held at border until duties are paid in full upfront",
      "Non-resident importers (NRIs) not registering directly — NRIs must register themselves, the broker cannot do it",
      "Forgetting to delegate authority to the customs broker within the CARM portal",
      "Confusing the old B3 form process with the new CAD (Commercial Accounting Declaration) in CARM",
    ],
    templateFields: [
      { field: "Business Number (BN)", description: "Canadian Business Number issued by CRA, used as importer identifier in CARM", whereToFind: "Canada Revenue Agency registration or importer's corporate documents", format: "15-character BN, e.g. 123456789RM0001" },
      { field: "RPP Status", description: "Whether the importer is enrolled in Release Prior to Payment", whereToFind: "CARM Client Portal account settings", format: "Enrolled / Not Enrolled" },
      { field: "Security Type", description: "Type of financial security posted by the importer", whereToFind: "CARM Client Portal security section", format: "Surety Bond / Cash Deposit" },
    ],
    walkthrough: [
      "Verify the Canadian importer is registered at the CARM Client Portal: ccp-pcc.cbsa-asfc.gc.ca.",
      "Confirm the importer has enrolled in the RPP (Release Prior to Payment) sub-program.",
      "Verify the importer has posted their own financial security — surety bond or cash deposit — in the CARM portal.",
      "Ensure the importer has delegated authority to the Canadian customs broker within the portal.",
      "For non-resident importers (NRIs) acting as importer of record in Canada: the NRI must register directly in CARM — the broker cannot do this on their behalf.",
      "Store the Business Number and RPP confirmation in this shipment record.",
    ],
  },

  inward_cargo_manifest: {
    name: "Inward Cargo Manifest",
    whatItIs: "The Inward Cargo Manifest is a document prepared by the U.S. customs broker for land border entries filed under CBP's Border Cargo Selectivity (BCS) system. The driver presents this document to the CBP officer at the port of entry. It contains the entry number and links the physical truck to the broker's electronic filing. For land freight, this document serves a similar function to the carrier's manifest in ocean or air shipments, but it is prepared by the broker rather than the carrier.",
    mustInclude: [
      "Entry number matching the broker's ACE filing",
      "PAPS Cargo Control Number (CCN)",
      "Carrier name and SCAC code",
      "Truck and trailer numbers",
      "Cargo description matching commercial invoice",
      "Number of packages and gross weight",
      "Consignee name and address",
      "Port of entry / border crossing",
    ],
    commonMistakes: [
      "Entry number on manifest does not match what was filed in ACE — truck turned away",
      "Manifest not printed and given to driver before departure — driver has no documents to present",
      "Cargo description differs from commercial invoice — triggers CBP examination",
      "Wrong port of entry listed — entry must be filed at the correct port",
    ],
    templateFields: [
      { field: "Entry Number", description: "CBP entry number from the broker's ACE filing", whereToFind: "Customs broker's ACE system", format: "11-digit entry number" },
      { field: "PAPS CCN", description: "Pre-Arrival Processing System Cargo Control Number", whereToFind: "PAPS barcode sticker on commercial documents", format: "Carrier SCAC + shipment number" },
      { field: "Port of Entry Code", description: "CBP port code for the land border crossing", whereToFind: "CBP port code directory", format: "4-digit port code, e.g. 2304 (Laredo)" },
    ],
    walkthrough: [
      "After the entry is filed in ACE using the PAPS number, prepare the Inward Cargo Manifest with the matching entry number.",
      "Include all cargo details exactly as they appear on the commercial invoice and packing list.",
      "Print the manifest and provide it to the truck driver before the truck departs toward the border.",
      "The driver presents this document along with the PAPS-barcoded commercial documents to CBP at the port of entry.",
      "CBP scans the PAPS barcode and matches it to the electronic entry — the manifest serves as the paper backup.",
    ],
  },
};

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
