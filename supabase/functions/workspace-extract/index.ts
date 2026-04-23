import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIMultimodal, type MultimodalPart } from "../_shared/ai-client.ts";

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

  // ── USMCA Certification of Origin — all 9 Annex 5-A mandatory elements ──
  usmca_certification: {
    type: "object",
    properties: {
      // Element 1: Certifier
      certifier_name: { type: "string", description: "Full legal name of the certifier (person signing the certification)" },
      certifier_title: { type: "string", description: "Job title or position of the certifier" },
      certifier_company: { type: "string", description: "Company name of the certifier" },
      certifier_address: { type: "string", description: "Full address of the certifier" },
      certifier_phone: { type: "string", description: "Phone number of the certifier" },
      certifier_email: { type: "string", description: "Email address of the certifier" },
      certifier_role: { type: "string", description: "Role of certifier: 'Exporter', 'Producer', 'Importer', or 'Exporter and Producer'" },
      // Element 2: Exporter
      exporter_name: { type: "string", description: "Full legal name of the exporter. May say 'Same as certifier' or 'Various'." },
      exporter_address: { type: "string", description: "Full address of the exporter" },
      // Element 3: Producer
      producer_name: { type: "string", description: "Full legal name of the producer/manufacturer. May say 'Same as certifier', 'Same as exporter', or 'Various'." },
      producer_address: { type: "string", description: "Full address of the producer" },
      // Element 4: Importer
      importer_name: { type: "string", description: "Full legal name of the importer. May say 'Various' or 'Unknown'." },
      importer_address: { type: "string", description: "Full address of the importer" },
      // Element 5: Description and HS tariff classification
      goods_description: { type: "string", description: "Full description of goods covered by this certification" },
      hts_codes_covered: { type: "array", items: { type: "string" }, description: "All HTS/HS codes covered (6-digit minimum). Extract EVERY HTS code listed." },
      // Element 6: Origin criterion
      origin_criterion: { type: "string", description: "Origin criterion code: A (wholly obtained), B (tariff shift), C (tariff shift + RVC), or D (exclusively from originating materials). Extract EXACT code." },
      regional_value_content_pct: { type: "number", description: "Regional Value Content percentage if stated (required for automotive goods under Chapter 87 and RVC-based criteria)" },
      // Element 7: Blanket period
      is_blanket: { type: "boolean", description: "true if this is a blanket certification covering multiple shipments" },
      blanket_period_start: { type: "string", description: "Blanket period start date ISO format YYYY-MM-DD" },
      blanket_period_end: { type: "string", description: "Blanket period end date ISO format YYYY-MM-DD. Must not exceed 12 months from start." },
      is_expired: { type: "boolean", description: "true if blanket_period_end is before today's date" },
      // Element 8: Authorized signature and date
      signature_date: { type: "string", description: "Date the certification was signed, ISO format YYYY-MM-DD" },
      authorized_signature_present: { type: "boolean", description: "true if a wet or electronic signature block is present on the document" },
      // Element 9: Declaration
      declaration_present: { type: "boolean", description: "true if the document contains a declaration that the information is true and accurate (required by Annex 5-A)" },
      // Additional compliance fields
      fta_program: { type: "string", description: "FTA program name: 'USMCA', 'T-MEC', or 'CUSMA'" },
      country_of_origin: { type: "string", description: "Country of origin for the certified goods" },
    },
  },

  // ── Legacy FTA certificate (non-USMCA) ──
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

  // ── Truck BOL / Carrier Manifest (Mexico/Canada land freight — PAPS) ──
  truck_bol_carrier_manifest: {
    type: "object",
    properties: {
      paps_number: { type: "string", description: "PAPS (Pre-Arrival Processing System) barcode number — ACE filing key. Usually a 12-18 character alphanumeric code." },
      shipper_name: { type: "string", description: "Full legal name of the shipper/exporter" },
      shipper_address: { type: "string" },
      consignee_name: { type: "string", description: "Full legal name of the consignee/importer" },
      consignee_address: { type: "string" },
      carrier_name: { type: "string", description: "Name of the trucking carrier/motor carrier" },
      carrier_scac: { type: "string", description: "4-letter Standard Carrier Alpha Code (SCAC) of the carrier" },
      truck_number: { type: "string", description: "Truck/tractor unit number or license plate" },
      trailer_number: { type: "string", description: "Trailer number" },
      crossing_date: { type: "string", description: "Expected or actual border crossing date ISO format YYYY-MM-DD" },
      port_of_entry: { type: "string", description: "US port of entry (e.g. Laredo TX, El Paso TX, Nogales AZ)" },
      gross_weight_kg: { type: "number", description: "Total gross weight in KG. Convert from LBS if needed." },
      total_pieces: { type: "number", description: "Total number of pieces or cartons" },
      commodity_description: { type: "string", description: "Description of the goods being transported" },
      pedimento_number: { type: "string", description: "Mexican Pedimento number referenced on this BOL — critical for cross-reference. Format: AA-AAAAAA-XXXXXXX or similar." },
      declared_value_usd: { type: "number", description: "Declared cargo value in USD if stated" },
      seal_numbers: { type: "array", items: { type: "string" }, description: "All seal numbers on the trailer" },
      pro_number: { type: "string", description: "Carrier PRO number (freight bill number)" },
    },
  },

  // ── Mexican Pedimento (export customs declaration) ──
  pedimento: {
    type: "object",
    properties: {
      pedimento_number: { type: "string", description: "Full pedimento number. Common formats: AA-AAAAAA-XXXXXXX or AAAA-XXXXXXX. Extract EXACTLY as printed." },
      aduana: { type: "string", description: "Mexican customs office (aduana) code and name" },
      regime_code: { type: "string", description: "Customs regime code (e.g. A1 = definitive export, IN = temporary import)" },
      exporter_name: { type: "string", description: "Full legal name of the Mexican exporter" },
      exporter_rfc: { type: "string", description: "Mexican tax ID (RFC — Registro Federal de Contribuyentes) of the exporter. Format: 3-4 letters + 6 digits + 3 alphanumeric." },
      importer_name: { type: "string", description: "Full legal name of the US importer if stated" },
      declared_value_mxn: { type: "number", description: "Declared value in Mexican Pesos (MXN)" },
      declared_value_usd: { type: "number", description: "Declared value in USD. Convert from MXN using exchange rate stated on pedimento if USD not explicit." },
      total_gross_weight_kg: { type: "number", description: "Total gross weight in KG" },
      hts_mexico: { type: "array", items: { type: "string" }, description: "All Mexican tariff fracciones arancelarias (8-digit codes) listed on the pedimento" },
      issue_date: { type: "string", description: "Pedimento issue/payment date ISO format YYYY-MM-DD" },
      payment_date: { type: "string", description: "Date taxes/duties were paid ISO format YYYY-MM-DD" },
      total_taxes_paid_mxn: { type: "number", description: "Total taxes/duties paid in MXN if stated" },
      transport_mode: { type: "string", description: "Mode of transport code (e.g. 3 = truck/carretera)" },
      country_of_destination: { type: "string", description: "Country of final destination (should be 'USA' or 'United States')" },
    },
  },

  // ── US Customs Bond ──
  customs_bond: {
    type: "object",
    properties: {
      bond_number: { type: "string", description: "Bond number or reference number" },
      bond_type: { type: "string", description: "Bond type: 'Single Entry Bond' or 'Continuous Bond'" },
      bond_amount_usd: { type: "number", description: "Bond face amount in USD (numeric, no currency symbol). This must be ≥ total invoice value per 19 CFR 113.13." },
      principal_name: { type: "string", description: "Full legal name of the principal (the importer of record)" },
      principal_address: { type: "string" },
      surety_company: { type: "string", description: "Name of the surety/insurance company guaranteeing the bond" },
      surety_code: { type: "string", description: "CBP-assigned surety code (if present)" },
      cbp_broker_name: { type: "string", description: "Name of the customs broker on the bond (if different from principal)" },
      validity_start: { type: "string", description: "Bond validity start date ISO format YYYY-MM-DD" },
      validity_end: { type: "string", description: "Bond validity end date ISO format YYYY-MM-DD. Null for continuous bonds." },
      is_continuous: { type: "boolean", description: "true if this is a continuous bond (annual), false if single entry" },
      port_of_entry: { type: "string", description: "Port of entry if specified on a single entry bond" },
      activity_code: { type: "string", description: "CBP bond activity code (e.g. 1 = importer/broker, 2 = drawback, etc.)" },
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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || "application/octet-stream";

    const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");
    const isXlsx = mimeType.includes("spreadsheet") || mimeType.includes("excel") || file.name.endsWith(".xlsx");
    const isDocx = mimeType.includes("word") || file.name.endsWith(".docx");

    if (!isPdf && !isImage && !isXlsx && !isDocx) {
      throw new Error("Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, DOCX");
    }

    const schemaKey = Object.keys(EXTRACTION_SCHEMAS).find(k => documentType.includes(k));
    const extractionSchema = schemaKey ? EXTRACTION_SCHEMAS[schemaKey] : null;
    const isPackingList = documentType.includes("packing_list");

    const systemPrompt = `You are a licensed U.S. customs broker's AI assistant processing a ${documentType.replace(/_/g, " ")} for a ${shipmentMode.replace(/_/g, " ")} shipment of ${commodityType || "goods"} from ${countryOfOrigin || "unknown origin"}.

Extract all customs compliance data from this document. Rules:
- Return ONLY a valid JSON object. No markdown. No code fences. No explanation.
- If a field is not present in the document, set it to null. Do NOT guess or estimate.
- All weights must be in KG. Convert from LBS if needed (1 LB = 0.453592 KG).
- All values must be numbers (not strings) where the schema specifies type number.
- Extract the EXACT text for descriptions — do not paraphrase or summarize.

${extractionSchema ? `Required schema for extracted_data:\n${JSON.stringify(extractionSchema, null, 2)}` : "Extract all fields you can identify."}

${isPackingList ? PACKING_LIST_VALIDATION_PROMPT : ""}`;

    const isCommercialInvoice = documentType.includes("commercial_invoice");
    const pgaFlagsInstruction = isCommercialInvoice
      ? `- "pga_flags": array of { "agency": string, "requirement": string, "mandatory": boolean, "reason": string } — ONLY include a PGA flag if a formal regulatory filing, permit, or prior notice is ACTUALLY REQUIRED by a U.S. Partner Government Agency for this specific commodity. Do NOT flag advisory-only requirements, general import cautions, or requirements that apply only to certain sub-classifications. Common examples that require actual filings: FDA Prior Notice for food/drugs, USDA APHIS permit for plants/animals, EPA Form 3520 for vehicles/engines, CPSC certification for children's products with HTS 9503. Maximum 5 flags. If the commodity is generic electronics, commercial goods, or industrial equipment with no food/drug/plant/animal/vehicle content, return an empty array [].`
      : `- "pga_flags": [] — PGA analysis is only performed on commercial invoices. Return an empty array for this document type.`;

    const userText = `Extract all customs-relevant data from this ${documentType.replace(/_/g, " ")}. Return a single JSON object with these exact keys:
- "extracted_data": object matching the schema above
- "field_details": array of { "field": string, "value": any, "confidence": number (0-100), "source_location": string describing where in the document this was found }
- "document_type_detected": string — what type of document this actually is
- "warnings": array of strings — readability issues, missing required sections, unclear values
${pgaFlagsInstruction}
${isPackingList ? '- "internal_errors": array as specified in the validation instructions above' : ''}

Return ONLY the JSON object. No markdown. No preamble.`;

    // Build multimodal message content
    const userContent: any[] = [];

    if (isPdf || isImage) {
      // PDFs and images — send as image_url for vision processing
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    } else if (isXlsx || isDocx) {
      // ── FIX: XLSX and DOCX are binary — don't try to decode as text ──
      // Send as base64 with file context so the model knows what it is
      userContent.push({
        type: "text",
        text: `[Binary file attached: ${file.name}, type: ${mimeType}, size: ${file.size} bytes, base64 encoded below]\n${base64.substring(0, 100)}...\n\nNote: This is a ${isXlsx ? "spreadsheet (XLSX)" : "Word document (DOCX)"}. Extract data based on the filename and document type context provided.`,
      });
    }

    userContent.push({ type: "text", text: userText });

    // ── Convert userContent to shared client MultimodalPart format ────────────
    const parts: MultimodalPart[] = [];
    for (const block of userContent) {
      if (block.type === "image_url") {
        // Extract base64 and mimeType from data URL
        const dataUrl: string = block.image_url.url;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({ type: "image", base64: match[2], mimeType: match[1] });
        }
      } else if (block.type === "text") {
        parts.push({ type: "text", text: block.text });
      }
    }

    // ── Call AI (Anthropic preferred, Lovable fallback) ────────────────────────
    const messageContent = await callAIMultimodal({
      systemPrompt,
      parts,
      anthropicModel: "claude-opus-4-6", // Opus for best document OCR/extraction
      lovableModel: "google/gemini-2.5-flash",
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
        extraction_model: "gemini-2.5-flash",
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
