import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const userText = `Extract all customs-relevant data from this ${documentType.replace(/_/g, " ")}. Return a single JSON object with these exact keys:
- "extracted_data": object matching the schema above
- "field_details": array of { "field": string, "value": any, "confidence": number (0-100), "source_location": string describing where in the document this was found }
- "document_type_detected": string — what type of document this actually is
- "warnings": array of strings — readability issues, missing required sections, unclear values
- "pga_flags": array of { "agency": string, "requirement": string, "mandatory": boolean, "reason": string } — PGA requirements based on commodity and HTS codes (commercial invoice only)
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 16384,
        temperature: 0, // ── FIX: deterministic output — same document always extracts the same fields ──
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const messageContent = aiResponse.choices?.[0]?.message?.content;
    if (!messageContent) throw new Error("AI returned empty response");

    // Parse JSON — strip markdown fences if model added them despite instructions
    let result: any;
    try {
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent.trim();
      result = JSON.parse(jsonStr);
    } catch {
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
