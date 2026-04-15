import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Anthropic API client (direct, no gateway dependency) ─────────────────────
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

type MultimodalPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string }
  | { type: "document"; base64: string; mimeType: string };

function getAnthropicKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return key;
}

async function callAnthropic(opts: {
  systemPrompt: string;
  parts: MultimodalPart[];
  model: string;
  maxTokens?: number;
}): Promise<string | null> {
  const { systemPrompt, parts, model, maxTokens = 16384 } = opts;
  const apiKey = getAnthropicKey();

  const content = parts.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    if (part.type === "document") {
      return { type: "document", source: { type: "base64", media_type: part.mimeType, data: part.base64 } };
    }
    return { type: "image", source: { type: "base64", media_type: part.mimeType, data: part.base64 } };
  });

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": "pdfs-2024-09-25",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err.substring(0, 400)}`);
  }

  const json = await res.json();
  return json?.content?.[0]?.text ?? null;
}
// ── End Anthropic client ──────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── CRITICAL: Field names here MUST match what workspace-crossref expects ──
// If you rename a field here, update CROSS_REF_PAIRS in workspace-crossref/index.ts too.
const EXTRACTION_SCHEMAS: Record<string, object> = {
  commercial_invoice: {
    type: "object",
    properties: {
      seller_name: { type: "string", description: "Full legal name of the seller/exporter" },
      seller_address: { type: "string" },
      buyer_name: { type: "string", description: "Full legal name of the buyer/consignee/importer" },
      buyer_address: { type: "string" },
      invoice_number: { type: "string" },
      invoice_date: { type: "string", description: "ISO format YYYY-MM-DD if possible" },
      currency: { type: "string", description: "3-letter currency code e.g. USD" },
      total_value: { type: "number", description: "Total invoice value as a number, no currency symbol" },
      // ── FIX: added top-level summary fields so crossref can compare them directly ──
      total_cartons: { type: "number", description: "Total number of cartons/packages stated on this invoice. Extract from totals row if present." },
      total_gross_weight_kg: { type: "number", description: "Total gross weight in KG from the invoice totals. Convert from LBS if needed (1 LB = 0.453592 KG)." },
      total_net_weight_kg: { type: "number", description: "Total net weight in KG from the invoice totals if stated." },
      incoterms: { type: "string", description: "Incoterms code e.g. CIF, FOB, EXW" },
      country_of_origin: { type: "string", description: "Country where goods were manufactured or produced" },
      related_parties: { type: "boolean", description: "true if buyer and seller are related entities (same ownership, parent/subsidiary etc)" },
      fta_program: { type: "string", description: "Any FTA mentioned — USMCA, KORUS, CAFTA-DR, CPTPP etc. Check all text including footers, stamps, certification language." },
      line_items: {
        type: "array",
        description: "Every individual product line on the invoice",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Full product description as written on the invoice" },
            quantity: { type: "number" },
            unit_price: { type: "number" },
            total: { type: "number" },
            hts_6digit: { type: "string", description: "HTS/HS code, 6 digits minimum" },
            // ── FIX: renamed from weight_kg to gross_weight_kg for consistency with packing list ──
            gross_weight_kg: { type: "number", description: "Gross weight of this line item in KG" },
            net_weight_kg: { type: "number", description: "Net weight of this line item in KG if stated" },
            cartons: { type: "number", description: "Number of cartons/packages for this line item if stated" },
          },
        },
      },
      payment_terms: { type: "string" },
      marks_and_numbers: { type: "string" },
    },
  },

  bill_of_lading: {
    type: "object",
    properties: {
      bl_number: { type: "string" },
      shipper: { type: "string", description: "Full name of the shipper/exporter" },
      consignee: { type: "string", description: "Full name of the consignee/importer" },
      notify_party: { type: "string" },
      vessel_name: { type: "string" },
      voyage_number: { type: "string" },
      port_of_loading: { type: "string" },
      port_of_discharge: { type: "string" },
      place_of_delivery: { type: "string" },
      etd: { type: "string", description: "Estimated time of departure ISO format" },
      eta: { type: "string", description: "Estimated time of arrival ISO format" },
      container_numbers: { type: "array", items: { type: "string" } },
      seal_numbers: { type: "array", items: { type: "string" } },
      total_packages: { type: "number", description: "Total number of cartons/packages on the BOL" },
      gross_weight_kg: { type: "number", description: "Total gross weight in KG. Convert from LBS if needed." },
      commodity_description: { type: "string" },
      freight_terms: { type: "string", description: "Prepaid or Collect" },
      // ── FIX: added declared_value so crossref can compare invoice vs BOL value ──
      declared_value_usd: { type: "number", description: "Declared cargo value in USD if stated on BOL. Convert if in other currency." },
    },
  },

  packing_list: {
    type: "object",
    properties: {
      // ── These top-level totals are what crossref compares against invoice ──
      total_cartons: { type: "number", description: "Total number of cartons/packages stated in the summary/totals row" },
      total_gross_weight_kg: { type: "number", description: "Total gross weight in KG from the summary/totals row. Convert from LBS if needed." },
      total_net_weight_kg: { type: "number", description: "Total net weight in KG from the summary/totals row." },
      total_cbm: { type: "number", description: "Total cubic meters from the summary/totals row" },
      country_of_origin: { type: "string", description: "Country of origin stated on the packing list" },
      line_items: {
        type: "array",
        description: "Every individual product line on the packing list",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Full product description as written" },
            quantity: { type: "number", description: "Number of units. Use 0 if explicitly zero, null if not stated." },
            gross_weight_kg: { type: "number" },
            net_weight_kg: { type: "number" },
            cartons: { type: "number", description: "Number of cartons for this line item" },
            dimensions: { type: "string", description: "L x W x H dimensions if stated" },
            cbm: { type: "number" },
          },
        },
      },
    },
  },

  fta_certificate: {
    type: "object",
    properties: {
      certifying_party: { type: "string" },
      exporter: { type: "string" },
      importer: { type: "string" },
      country_of_origin: { type: "string" },
      fta_program: { type: "string" },
      issue_date: { type: "string" },
      expiry_date: { type: "string" },
      hts_codes_covered: { type: "array", items: { type: "string" } },
      origin_criterion: { type: "string" },
      is_expired: { type: "boolean" },
      blanket_period_start: { type: "string" },
      blanket_period_end: { type: "string" },
    },
  },

  certificate_of_origin: {
    type: "object",
    properties: {
      certifying_body: { type: "string" },
      exporter: { type: "string" },
      importer: { type: "string" },
      country_of_origin: { type: "string" },
      issue_date: { type: "string" },
      expiry_date: { type: "string" },
      commodity_description: { type: "string" },
      hts_codes: { type: "array", items: { type: "string" } },
    },
  },

  isf_filing: {
    type: "object",
    properties: {
      importer_of_record: { type: "string" },
      consignee: { type: "string" },
      manufacturer_name: { type: "string" },
      manufacturer_address: { type: "string" },
      seller_name: { type: "string" },
      country_of_origin: { type: "string" },
      ship_to_party: { type: "string" },
      container_stuffing_location: { type: "string" },
      consolidator: { type: "string" },
      hts_codes: { type: "array", items: { type: "string" } },
      container_numbers: { type: "array", items: { type: "string" } },
      seal_numbers: { type: "array", items: { type: "string" } },
      vessel_name: { type: "string" },
      voyage_number: { type: "string" },
      port_of_unlading: { type: "string" },
      estimated_arrival: { type: "string" },
    },
  },

  // ── MEXICO LAND ENTRY: Truck Bill of Lading / PAPS Manifest ─────────────────
  truck_bol_carrier_manifest: {
    type: "object",
    properties: {
      paps_number: { type: "string", description: "Pre-Arrival Processing System (PAPS) barcode number — alphanumeric, used for ACE truck entry from Mexico" },
      bl_number: { type: "string", description: "Bill of Lading or carrier reference number" },
      shipper: { type: "string", description: "Full legal name of shipper/exporter in Mexico" },
      shipper_address: { type: "string", description: "Shipper full address in Mexico" },
      consignee: { type: "string", description: "Full legal name of US consignee/importer" },
      consignee_address: { type: "string", description: "US consignee full address" },
      notify_party: { type: "string" },
      carrier_name: { type: "string", description: "Trucking carrier / SCAC code" },
      truck_number: { type: "string" },
      trailer_number: { type: "string" },
      seal_numbers: { type: "array", items: { type: "string" } },
      port_of_entry: { type: "string", description: "US port of entry (e.g. Laredo TX, El Paso TX, Otay Mesa CA)" },
      crossing_date: { type: "string", description: "Expected or actual crossing date in ISO format YYYY-MM-DD" },
      total_packages: { type: "number", description: "Total number of cartons/packages" },
      gross_weight_kg: { type: "number", description: "Total gross weight in KG. Convert from LBS if needed (1 LB = 0.453592 KG)." },
      commodity_description: { type: "string", description: "Description of goods as stated on the BoL" },
      declared_value_usd: { type: "number", description: "Declared cargo value in USD" },
      country_of_origin: { type: "string", description: "Country of origin of goods" },
      freight_terms: { type: "string", description: "Prepaid or Collect" },
      pedimento_number: { type: "string", description: "Mexican Pedimento reference number if cross-referenced on BoL" },
    },
  },

  // ── MEXICO LAND ENTRY: USMCA Certificate / Certification of Origin ──────────
  usmca_certification: {
    type: "object",
    properties: {
      certifier_name: { type: "string", description: "Full legal name of the certifier (exporter, producer, or importer)" },
      certifier_role: { type: "string", description: "Role of certifier: 'exporter', 'producer', or 'importer'" },
      certifier_address: { type: "string" },
      certifier_tax_id: { type: "string", description: "Tax ID or business registration number of certifier" },
      producer_name: { type: "string", description: "Full name of the producer/manufacturer of goods" },
      producer_address: { type: "string" },
      importer_name: { type: "string", description: "Full legal name of the US importer" },
      importer_address: { type: "string" },
      country_of_origin: { type: "string", description: "Country of origin — should be Mexico (MX) for Mexico land imports" },
      description_of_goods: { type: "string", description: "Description of goods covered by this certification" },
      hts_codes: { type: "array", items: { type: "string" }, description: "HTS/HS codes covered by this USMCA certification" },
      origin_criterion: { type: "string", description: "USMCA origin criterion code: A (wholly obtained), B (tariff change), C (regional value content), D (produced exclusively), E (automatic data processing)" },
      blanket_period_start: { type: "string", description: "Blanket period start date ISO format YYYY-MM-DD (max 12-month blanket cert)" },
      blanket_period_end: { type: "string", description: "Blanket period end date ISO format YYYY-MM-DD" },
      certification_date: { type: "string", description: "Date cert was signed ISO format YYYY-MM-DD" },
      invoice_numbers: { type: "array", items: { type: "string" }, description: "Invoice numbers this cert covers, if single-shipment cert" },
      is_blanket: { type: "boolean", description: "true if this is a blanket/annual USMCA cert, false if single-shipment" },
      is_expired: { type: "boolean", description: "true if blanket_period_end is before today's date" },
      regional_value_content_pct: { type: "number", description: "Regional Value Content percentage if stated (required for automotive: ≥75% for vehicles, ≥70% for parts)" },
    },
  },

  // ── MEXICO LAND ENTRY: Pedimento (Mexican Customs Export Declaration) ────────
  pedimento: {
    type: "object",
    properties: {
      pedimento_number: { type: "string", description: "Mexican customs declaration number (15-digit format: AA-AAAAAA-XXXXXXX)" },
      aduana: { type: "string", description: "Mexican customs office (aduana) where exported" },
      regime_code: { type: "string", description: "Customs regime code (e.g. A1 for definitive export)" },
      exporter_name: { type: "string", description: "Full legal name of Mexican exporter" },
      exporter_rfc: { type: "string", description: "Mexican RFC (tax ID) of exporter" },
      importer_name: { type: "string", description: "Full legal name of US importer" },
      country_of_origin: { type: "string", description: "Country of origin — should be MX for Mexican goods" },
      country_of_destination: { type: "string", description: "Destination country — should be US" },
      declared_value_usd: { type: "number", description: "Total declared value in USD as stated on Pedimento" },
      declared_value_mxn: { type: "number", description: "Total declared value in MXN if stated" },
      hts_mexico: { type: "array", items: { type: "string" }, description: "Mexican tariff codes (fracción arancelaria) from Pedimento line items" },
      total_packages: { type: "number", description: "Total number of packages as declared on Pedimento" },
      total_gross_weight_kg: { type: "number", description: "Total gross weight in KG as stated on Pedimento" },
      transport_mode: { type: "string", description: "Transport mode code on Pedimento (e.g. '3' for road/truck)" },
      crossing_date: { type: "string", description: "Date goods crossed border ISO format YYYY-MM-DD" },
      invoice_numbers: { type: "array", items: { type: "string" }, description: "Commercial invoice numbers referenced on the Pedimento" },
    },
  },

  // ── MEXICO LAND ENTRY: PAPS Document ────────────────────────────────────────
  paps_document: {
    type: "object",
    properties: {
      paps_number: { type: "string", description: "PAPS barcode number — alphanumeric string used by CBP ACE system for pre-arrival truck entry" },
      carrier_scac: { type: "string", description: "SCAC code of the trucking carrier" },
      carrier_name: { type: "string" },
      shipper: { type: "string" },
      consignee: { type: "string" },
      port_of_entry: { type: "string", description: "US land port where truck will cross" },
      estimated_arrival: { type: "string", description: "Estimated crossing date/time ISO format" },
      total_packages: { type: "number" },
      gross_weight_kg: { type: "number" },
      commodity_description: { type: "string" },
      trailer_number: { type: "string" },
      truck_number: { type: "string" },
    },
  },
};

// ── Packing list internal validation — these run as a self-check before crossref ──
const PACKING_LIST_VALIDATION_PROMPT = `
After extracting all data, perform these MANDATORY internal consistency checks and report them in "internal_errors":

1. CARTON COUNT: Sum cartons across all line items. Compare to total_cartons. If they differ by even 1, it is a critical error.
2. GROSS WEIGHT: Sum gross_weight_kg across all line items. Compare to total_gross_weight_kg. If difference >1%, it is a critical error. Show the math: (sum - total) / total * 100 = X%.
3. NET WEIGHT: Sum net_weight_kg across all line items. Compare to total_net_weight_kg. If difference >1%, it is a critical error.
4. ZERO QUANTITY: Any line item where quantity is 0 or null is a high-severity error.
5. VAGUE DESCRIPTION: Any line item description that is generic (e.g. "parts", "goods", "merchandise", "miscellaneous", "accessories", "components" without specifics) is a high-severity error.
6. MISSING DIMENSIONS: Any line item with gross_weight_kg present but dimensions and cbm both null is a medium error.

"internal_errors": [
  {
    "check": "carton_count_mismatch" | "gross_weight_mismatch" | "net_weight_mismatch" | "zero_quantity" | "vague_description" | "missing_dimensions",
    "severity": "critical" | "high" | "medium",
    "finding": "specific description including actual values and expected values",
    "line_item_index": number or null,
    "expected_value": "what the value should be" or null,
    "actual_value": "what was found" or null
  }
]

If ALL checks pass with no issues, return: "internal_errors": []`;

/** Robust JSON parser that handles markdown fences, truncation, and common LLM quirks */
function robustJsonParse(raw: string): any {
  // Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find JSON boundaries
  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON object found in response");

  const openChar = cleaned[jsonStart];
  const closeChar = openChar === "{" ? "}" : "]";
  const jsonEnd = cleaned.lastIndexOf(closeChar);

  if (jsonEnd <= jsonStart) {
    // Truncated — try to repair by closing open structures
    cleaned = cleaned.substring(jsonStart);
    cleaned = repairTruncatedJson(cleaned);
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // First attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common LLM issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")       // trailing commas before }
      .replace(/,\s*]/g, "]")       // trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, " ") // control characters
      .replace(/\\'/g, "'");        // escaped single quotes

    try {
      return JSON.parse(cleaned);
    } catch {
      // Last resort: try repairing truncation
      return JSON.parse(repairTruncatedJson(cleaned));
    }
  }
}

/** Attempt to close unclosed JSON brackets/braces to salvage truncated output */
function repairTruncatedJson(text: string): string {
  // Remove trailing incomplete key-value (e.g. `"key": ` with no value)
  text = text.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  // Remove trailing comma
  text = text.replace(/,\s*$/, "");

  // Count open/close
  let openBraces = 0, openBrackets = 0;
  let inString = false, escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  // Close unclosed strings if we ended inside one
  if (inString) text += '"';

  // Remove any trailing incomplete value after last colon
  text = text.replace(/,\s*"[^"]*"\s*:\s*"?[^"}\]]*$/, "");
  text = text.replace(/,\s*$/, "");

  // Close brackets/braces
  while (openBrackets > 0) { text += "]"; openBrackets--; }
  while (openBraces > 0) { text += "}"; openBraces--; }

  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || "unknown";
    const shipmentMode = (formData.get("shipmentMode") as string) || "";
    const commodityType = (formData.get("commodityType") as string) || "";
    const countryOfOrigin = (formData.get("countryOfOrigin") as string) || "";

    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    // Chunked base64 — spread operator crashes on files > ~50KB (stack overflow)
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const mimeType = file.type || "application/octet-stream";

    const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");
    const isXlsx = mimeType.includes("spreadsheet") || mimeType.includes("excel") || file.name.endsWith(".xlsx");
    const isDocx = mimeType.includes("word") || file.name.endsWith(".docx");

    if (!isPdf && !isImage && !isXlsx && !isDocx) {
      throw new Error("Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, DOCX");
    }

    // Match schema — longest matching key wins to avoid "bill_of_lading" matching "usmca_certification" etc.
    const schemaKey = Object.keys(EXTRACTION_SCHEMAS)
      .filter(k => documentType.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    const extractionSchema = schemaKey ? EXTRACTION_SCHEMAS[schemaKey] : null;
    const isPackingList = documentType.includes("packing_list");

    const isMexicoLand = shipmentMode.includes("mexico") || shipmentMode.includes("land");
    const mexicoContext = isMexicoLand ? `
MEXICO LAND ENTRY CONTEXT — This is a US-Mexico land border import shipment.
Key compliance requirements to be aware of while extracting:
- USMCA qualification: Goods must meet USMCA Rules of Origin for duty-free treatment. If USMCA is NOT claimed, a 25% IEEPA tariff applies (EO 14194, effective March 4 2025).
- PAPS filing: Carrier must transmit Pre-Arrival Processing System (PAPS) manifest via ACE before crossing.
- Pedimento: Mexican customs export declaration — pedimento number must appear on transport documents.
- NO ISF required (ISF is ocean-only).
- MPF exempt for USMCA-qualifying goods; applies at 0.3464% for non-USMCA goods.
- Section 232: 25% steel / 25% aluminum regardless of USMCA status.
- Automotive parts: USMCA Regional Value Content must be ≥75% (passenger vehicles) or ≥70% (parts).
` : "";

    const systemPrompt = `You are a licensed U.S. customs broker's AI assistant specializing in US-Mexico land entry compliance. You are processing a ${documentType.replace(/_/g, " ")} for a ${shipmentMode.replace(/_/g, " ")} shipment of ${commodityType || "goods"} from ${countryOfOrigin || "Mexico"}.
${mexicoContext}
Extract all customs compliance data from this document with maximum precision. Rules:
- Return ONLY a valid JSON object. No markdown. No code fences. No explanation.
- If a field is not present in the document, set it to null. Do NOT guess or estimate.
- All weights must be in KG. Convert from LBS if needed (1 LB = 0.453592 KG).
- All values must be numbers (not strings) where the schema specifies type number.
- Extract the EXACT text for descriptions — do not paraphrase or summarize.
- For HTS codes: extract the full code as written. Minimum 6 digits. US formal entry requires 10 digits.
- For USMCA certifications: extract ALL blanket period dates, origin criterion codes, and every HTS code listed.
- For Pedimentos: extract the full 15-digit pedimento number and all fracción arancelaria codes.
- For Truck BoL/PAPS: extract the PAPS barcode number exactly as written — it is the ACE manifest key.

${extractionSchema ? `Required schema for extracted_data:\n${JSON.stringify(extractionSchema, null, 2)}` : "Extract all fields you can identify."}

${isPackingList ? PACKING_LIST_VALIDATION_PROMPT : ""}`;

    const isCommercialInvoice = documentType.includes("commercial_invoice");
    const pgaFlagsInstruction = isCommercialInvoice
      ? `- "pga_flags": array of { "agency": string, "requirement": string, "mandatory": boolean, "reason": string } — ONLY include a PGA flag if a formal regulatory filing, permit, or prior notice is ACTUALLY REQUIRED by a U.S. Partner Government Agency for this specific commodity. For Mexico land entry shipments, also flag:
  • USMCA qualification risk: if goods do NOT appear to qualify for USMCA (no origin criterion stated, or HTS codes suggest non-Mexican manufacture), flag as {"agency": "CBP", "requirement": "USMCA Certificate of Origin", "mandatory": true, "reason": "Without USMCA qualification, 25% IEEPA tariff applies per EO 14194 March 4 2025"}
  • Section 232 exposure: if goods are steel (HTS 7206-7229, 7301-7326) or aluminum (HTS 7601-7616), flag as {"agency": "CBP", "requirement": "Section 232 tariff — 25% steel/25% aluminum", "mandatory": true, "reason": "Section 232 applies regardless of USMCA status — no Mexico exemption"}
  • FDA Prior Notice: required for food, dietary supplements, beverages, drugs
  • USDA APHIS: required for plants, seeds, soil, animals, animal products
  • EPA Form 3520: required for vehicles, engines, off-road equipment
  Maximum 5 flags. If commodity is generic merchandise with no food/drug/plant/vehicle/steel/aluminum content AND USMCA clearly applies, return [].`
      : `- "pga_flags": [] — PGA analysis is only performed on commercial invoices. Return an empty array for this document type.`;

    const userText = `Extract all customs-relevant data from this ${documentType.replace(/_/g, " ")}. Return a single JSON object with these exact keys:
- "extracted_data": object matching the schema above
- "field_details": array of { "field": string, "value": any, "confidence": number (0-100), "source_location": string describing where in the document this was found }
- "document_type_detected": string — what type of document this actually is
- "warnings": array of strings — readability issues, missing required sections, unclear values
${pgaFlagsInstruction}
${isPackingList ? '- "internal_errors": array as specified in the validation instructions above' : ''}

Return ONLY the JSON object. No markdown. No preamble.`;

    // Build parts for Anthropic API
    const parts: MultimodalPart[] = [];

    if (isPdf) {
      // PDFs must be sent as "document" type with the pdfs-2024-09-25 beta
      parts.push({ type: "document", base64, mimeType: "application/pdf" });
    } else if (isImage) {
      const supportedMime = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const safeMime = supportedMime.includes(mimeType) ? mimeType : "image/jpeg";
      parts.push({ type: "image", base64, mimeType: safeMime });
    } else if (isXlsx || isDocx) {
      parts.push({ type: "text", text: `[Binary file: ${file.name}, type: ${mimeType}, size: ${file.size} bytes. Extract data based on filename and document type context.]` });
    }
    parts.push({ type: "text", text: userText });

    const messageContent = await callAnthropic({
      systemPrompt,
      parts,
      model: "claude-sonnet-4-5",
      maxTokens: 16384,
    });
    if (!messageContent) throw new Error("AI returned empty response");

    // Parse JSON — strip markdown fences, repair truncated output
    let result: any;
    try {
      result = robustJsonParse(messageContent);
    } catch (parseErr) {
      console.error("Failed to parse extraction response:", messageContent.substring(0, 500));
      throw new Error("AI returned invalid JSON. Please try re-uploading the document.");
    }

    // ── FIX: keep internal_errors as structured array — do NOT merge into warnings string ──
    // The app reads data.internal_errors separately as structured objects
    const internalErrors: any[] = result.internal_errors || [];
    const warnings: string[] = result.warnings || [];

    // Persist extraction to database
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fieldMap: Record<string, any> = {};
    const confidenceMap: Record<string, number> = {};
    for (const fd of result.field_details || []) {
      fieldMap[fd.field] = fd.value;
      confidenceMap[fd.field] = fd.confidence;
    }

    const { data: extraction, error: extErr } = await adminClient
      .from("document_extractions")
      .insert({
        extracted_fields: result.extracted_data || fieldMap,
        field_confidence: confidenceMap,
        extraction_model: "claude-sonnet-4-5",
        raw_text: result.document_type_detected || null,
        parse_warnings: warnings,
      })
      .select("id")
      .single();

    if (extErr) console.error("Failed to persist extraction:", extErr);

    console.log(`[workspace-extract] Extracted ${Object.keys(result.extracted_data || {}).length} fields from ${documentType}${internalErrors.length > 0 ? `, ${internalErrors.length} internal errors` : ""}`);

    return new Response(JSON.stringify({
      extracted_data: result.extracted_data || {},
      field_details: result.field_details || [],
      document_type_detected: result.document_type_detected || documentType,
      warnings,
      pga_flags: result.pga_flags || [],
      // ── FIX: return internal_errors as structured array, separate from warnings ──
      internal_errors: internalErrors,
      extraction_id: extraction?.id || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("workspace-extract error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      fallback: true,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
