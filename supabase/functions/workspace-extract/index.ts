import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACTION_SCHEMAS: Record<string, object> = {
  commercial_invoice: {
    type: "object",
    properties: {
      seller_name: { type: "string" }, seller_address: { type: "string" },
      buyer_name: { type: "string" }, buyer_address: { type: "string" },
      invoice_number: { type: "string" }, invoice_date: { type: "string" },
      currency: { type: "string" }, total_value: { type: "number" },
      incoterms: { type: "string" }, country_of_origin: { type: "string" },
      related_parties: { type: "boolean" },
      line_items: { type: "array", items: { type: "object", properties: {
        description: { type: "string" }, quantity: { type: "number" },
        unit_price: { type: "number" }, total: { type: "number" },
        hts_6digit: { type: "string" }, weight_kg: { type: "number" },
      }}},
      payment_terms: { type: "string" }, marks_and_numbers: { type: "string" },
    },
  },
  bill_of_lading: {
    type: "object",
    properties: {
      bl_number: { type: "string" }, shipper: { type: "string" },
      consignee: { type: "string" }, notify_party: { type: "string" },
      vessel_name: { type: "string" }, voyage_number: { type: "string" },
      port_of_loading: { type: "string" }, port_of_discharge: { type: "string" },
      etd: { type: "string" }, eta: { type: "string" },
      container_numbers: { type: "array", items: { type: "string" } },
      seal_numbers: { type: "array", items: { type: "string" } },
      total_packages: { type: "number" }, gross_weight_kg: { type: "number" },
      commodity_description: { type: "string" }, freight_terms: { type: "string" },
    },
  },
  packing_list: {
    type: "object",
    properties: {
      total_cartons: { type: "number" },
      total_gross_weight_kg: { type: "number" },
      total_net_weight_kg: { type: "number" },
      total_cbm: { type: "number" },
      line_items: { type: "array", items: { type: "object", properties: {
        carton_number: { type: "string" }, description: { type: "string" },
        quantity: { type: "number" }, gross_weight_kg: { type: "number" },
        net_weight_kg: { type: "number" }, dimensions: { type: "string" },
      }}},
    },
  },
  fta_certificate: {
    type: "object",
    properties: {
      certifying_party: { type: "string" }, exporter: { type: "string" },
      importer: { type: "string" }, country_of_origin: { type: "string" },
      fta_program: { type: "string" }, issue_date: { type: "string" },
      expiry_date: { type: "string" },
      hts_codes_covered: { type: "array", items: { type: "string" } },
      origin_criterion: { type: "string" }, is_expired: { type: "boolean" },
      blanket_period_start: { type: "string" }, blanket_period_end: { type: "string" },
    },
  },
};

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

    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");
    const isXlsx = mimeType.includes("spreadsheet") || mimeType.includes("excel") || file.name.endsWith(".xlsx");
    const isDocx = mimeType.includes("word") || file.name.endsWith(".docx");

    if (!isPdf && !isImage && !isXlsx && !isDocx) {
      throw new Error("Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, DOCX");
    }

    const schemaKey = Object.keys(EXTRACTION_SCHEMAS).find(k => documentType.includes(k));
    const extractionSchema = schemaKey ? EXTRACTION_SCHEMAS[schemaKey] : null;

    const systemPrompt = `You are a licensed customs broker's AI assistant. You are processing a ${documentType.replace(/_/g, ' ')} for a ${shipmentMode.replace(/_/g, ' ')} shipment of ${commodityType || 'goods'} from ${countryOfOrigin || 'unknown origin'}.

Extract all relevant customs compliance data points from this document. Return ONLY a valid JSON object with no markdown, no preamble, and no explanation. If a field cannot be found, set its value to null.

${extractionSchema ? `Use this exact schema for the extracted_data field:\n${JSON.stringify(extractionSchema, null, 2)}` : 'Extract all fields you can identify from the document.'}

Additionally, for each field you extract, provide a confidence score (0-100) and note where in the document the value was found.`;

    const userText = `Extract all customs-relevant data from this ${documentType.replace(/_/g, ' ')}. Return a JSON object with these top-level keys:
- "extracted_data": the structured data matching the document type schema
- "field_details": array of { "field": string, "value": any, "confidence": number (0-100), "source_location": string }
- "document_type_detected": string — what type of document this actually appears to be
- "warnings": array of strings — any issues with readability, missing sections, or concerns
- "pga_flags": array of { "agency": string, "requirement": string, "mandatory": boolean, "reason": string } — if this is a commercial invoice, identify PGA requirements based on commodities and HTS codes found`;

    // Build messages for Lovable AI Gateway (OpenAI-compatible format)
    const userContent: any[] = [];

    if (isPdf || isImage) {
      // For images, use the OpenAI vision format
      if (isImage) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        });
      } else {
        // For PDFs, include as text description since gateway uses OpenAI format
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        });
      }
    } else {
      // For XLSX/DOCX, describe as base64-encoded document
      userContent.push({
        type: "text",
        text: `[Base64-encoded ${file.name} document attached. MIME type: ${mimeType}]`,
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
        max_tokens: 8192,
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

    // Parse the JSON from AI response
    let result: any;
    try {
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent;
      result = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse AI response as JSON:", messageContent.substring(0, 500));
      throw new Error("AI returned invalid JSON. Please try re-uploading.");
    }

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
        parse_warnings: result.warnings || [],
      })
      .select("id")
      .single();

    if (extErr) console.error("Failed to persist extraction:", extErr);

    return new Response(JSON.stringify({
      extracted_data: result.extracted_data || {},
      field_details: result.field_details || [],
      document_type_detected: result.document_type_detected || documentType,
      warnings: result.warnings || [],
      pga_flags: result.pga_flags || [],
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
