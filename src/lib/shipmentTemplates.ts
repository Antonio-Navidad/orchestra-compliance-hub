export interface ShipmentTemplate {
  id: string;
  name: string;
  description: string;
  mode: string;
  origin: string;
  destination: string;
  requiredDocs: string[];
  optionalDocs: string[];
  typicalHsCodes?: string[];
  ruleHints: string[];
}

export const SHIPMENT_TEMPLATES: ShipmentTemplate[] = [
  {
    id: "sea-cn-us",
    name: "Sea Import — China → US",
    description: "Standard ocean freight from China to the United States",
    mode: "sea",
    origin: "China",
    destination: "United States",
    requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading", "certificate_of_origin"],
    optionalDocs: ["insurance_certificate", "inspection_certificate", "fumigation_certificate"],
    ruleHints: [
      "ISF 10+2 filing required before vessel departure",
      "FDA prior notice if food/cosmetics/medical",
      "Anti-dumping duties may apply on select HS codes",
    ],
  },
  {
    id: "air-co-eu",
    name: "Air Export — Colombia → EU",
    description: "Air freight from Colombia to the European Union",
    mode: "air",
    origin: "Colombia",
    destination: "EU",
    requiredDocs: ["commercial_invoice", "packing_list", "air_waybill", "certificate_of_origin", "export_license"],
    optionalDocs: ["phytosanitary_certificate", "customs_declaration"],
    ruleHints: [
      "ICS2 pre-arrival data required for EU",
      "Phytosanitary cert required for agricultural goods",
      "DIAN export declaration mandatory",
    ],
  },
  {
    id: "amazon-fba",
    name: "Amazon FBA Inbound",
    description: "Products shipped to Amazon fulfillment centers",
    mode: "sea",
    origin: "China",
    destination: "United States",
    requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading"],
    optionalDocs: ["certificate_of_origin", "inspection_certificate"],
    typicalHsCodes: ["6109", "8471", "9503", "3304"],
    ruleHints: [
      "FNSKU labeling required on all units",
      "Carton-level packing list for FBA receiving",
      "Product safety testing (CPC/CPSIA) for children's products",
    ],
  },
  {
    id: "shopify-import",
    name: "Shopify Importer Flow",
    description: "D2C brand importing inventory for Shopify fulfillment",
    mode: "sea",
    origin: "",
    destination: "",
    requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading"],
    optionalDocs: ["certificate_of_origin", "insurance_certificate"],
    ruleHints: [
      "De minimis threshold varies by destination country",
      "Product labeling requirements vary by market",
    ],
  },
  {
    id: "mercado-libre",
    name: "Mercado Libre Seller Flow",
    description: "Latin American marketplace fulfillment",
    mode: "air",
    origin: "China",
    destination: "Colombia",
    requiredDocs: ["commercial_invoice", "packing_list", "air_waybill", "import_permit"],
    optionalDocs: ["certificate_of_origin", "customs_declaration"],
    ruleHints: [
      "DIAN import declaration required",
      "INVIMA registration for health/cosmetic products",
      "RUT/NIT verification for importer of record",
    ],
  },
  {
    id: "battery-electronics",
    name: "Battery / Electronics Workflow",
    description: "Lithium battery and electronics shipment with DG handling",
    mode: "air",
    origin: "",
    destination: "",
    requiredDocs: ["commercial_invoice", "packing_list", "air_waybill", "dangerous_goods_declaration"],
    optionalDocs: ["inspection_certificate", "export_license"],
    typicalHsCodes: ["8507", "8471", "8517"],
    ruleHints: [
      "UN38.3 battery testing report required",
      "IATA DG packing instructions (PI965-PI970)",
      "MSDS/SDS sheet required for lithium batteries",
      "Proper shipping name and UN number on packaging",
    ],
  },
  {
    id: "ocean-general",
    name: "General Ocean Freight Packet",
    description: "Standard full-container ocean freight shipment",
    mode: "sea",
    origin: "",
    destination: "",
    requiredDocs: ["commercial_invoice", "packing_list", "bill_of_lading"],
    optionalDocs: ["certificate_of_origin", "insurance_certificate", "customs_declaration", "fumigation_certificate"],
    ruleHints: [
      "VGM (verified gross mass) declaration required",
      "Container weight must match BOL declaration",
    ],
  },
  {
    id: "medical-goods",
    name: "Medical Goods Workflow",
    description: "Medical devices and pharmaceutical products",
    mode: "air",
    origin: "",
    destination: "",
    requiredDocs: ["commercial_invoice", "packing_list", "air_waybill", "import_permit", "inspection_certificate"],
    optionalDocs: ["certificate_of_origin", "export_license"],
    typicalHsCodes: ["3004", "9018", "9019"],
    ruleHints: [
      "FDA 510(k) or device listing for US imports",
      "CE marking required for EU market",
      "Cold chain documentation if temperature-sensitive",
      "WHO prequalification for certain markets",
    ],
  },
];
