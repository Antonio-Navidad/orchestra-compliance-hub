import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string || "unknown";
    const shipmentContext = formData.get("shipmentContext") as string || "{}";

    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || "application/octet-stream";

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      throw new Error("Unsupported file type. Please upload an image (JPG, PNG) or PDF.");
    }

    let context: Record<string, string> = {};
    try { context = JSON.parse(shipmentContext); } catch {}

    const systemPrompt = `You are an expert customs and logistics document data extractor.

CRITICAL INSTRUCTION: The uploaded file may contain MULTIPLE logical documents combined into a single PDF packet. For example, a single PDF may contain a Commercial Invoice on pages 1-2, a Packing List on page 3, a Bill of Lading on pages 4-5, and a Certificate of Origin on page 6.

You MUST:
1. Identify ALL distinct logical documents present in the file
2. For each logical document, extract its fields separately
3. Tag every extracted field with which logical document it belongs to
4. Report all detected document types

Document type hint: ${documentType}
${context.shipmentMode ? `Transport mode: ${context.shipmentMode}` : ""}
${context.originCountry ? `Origin: ${context.originCountry}` : ""}
${context.destinationCountry ? `Destination: ${context.destinationCountry}` : ""}`;

    const userContent: any[] = [
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      },
      {
        type: "text",
        text: `Analyze this file carefully. It may contain MULTIPLE logistics/customs documents combined into one file. Identify each distinct document section (e.g. Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, Air Waybill, etc.) and extract structured fields from EACH one separately. Tag every field with its source document type.`,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_fields",
              description: "Return all extracted fields from the document(s) with confidence scores. If the file contains multiple logical documents, list each one in the detectedDocuments array.",
              parameters: {
                type: "object",
                properties: {
                  isMultiDocument: {
                    type: "boolean",
                    description: "True if the file contains multiple distinct logical documents (e.g. invoice + packing list + BL combined into one PDF)",
                  },
                  detectedDocuments: {
                    type: "array",
                    description: "List of all logical document types detected in this file. Each entry represents a distinct document section found.",
                    items: {
                      type: "object",
                      properties: {
                        documentType: {
                          type: "string",
                          description: "Document type: commercial_invoice, packing_list, bill_of_lading, air_waybill, certificate_of_origin, customs_declaration, export_license, import_permit, insurance_certificate, inspection_certificate, phytosanitary_certificate, fumigation_certificate, dangerous_goods_declaration, other",
                        },
                        pageRange: {
                          type: "string",
                          description: "Approximate page range or location in the file (e.g. 'pages 1-2', 'page 3', 'top half of page 1')",
                        },
                        confidence: {
                          type: "number",
                          description: "0.0-1.0 confidence that this document type was correctly identified",
                        },
                        detectionMethod: {
                          type: "string",
                          enum: ["direct", "inferred", "partial"],
                          description: "direct = clearly present with header/title; inferred = identified from content/references; partial = some indicators but incomplete",
                        },
                      },
                      required: ["documentType", "confidence", "detectionMethod"],
                    },
                  },
                  detectedDocumentType: {
                    type: "string",
                    description: "The primary document type if single document, or 'multi_document_packet' if multiple documents detected",
                  },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        fieldName: { type: "string", description: "Normalized field name (e.g. product_name, hs_code, declared_value, shipper_name, consignee_name, origin_country, destination_country, invoice_number, weight_kg, package_count, transport_mode, bill_of_lading_number, currency, incoterms, etc.)" },
                        value: { type: "string", description: "Extracted value" },
                        confidence: { type: "number", description: "0.0-1.0 confidence in extraction accuracy" },
                        sourceLocation: { type: "string", description: "Where on the document this was found (e.g. 'header', 'table row 3', 'footer')" },
                        sourceDocumentType: { type: "string", description: "Which logical document this field was extracted from (e.g. 'commercial_invoice', 'packing_list', 'bill_of_lading'). REQUIRED for multi-document packets." },
                      },
                      required: ["fieldName", "value", "confidence"],
                    },
                  },
                  rawTextSummary: { type: "string", description: "Brief plain-text summary of the document content" },
                  parseWarnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any warnings about readability, missing sections, or low-quality areas",
                  },
                  overallQuality: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Overall document quality/readability assessment",
                  },
                },
                required: ["isMultiDocument", "detectedDocuments", "detectedDocumentType", "fields", "rawTextSummary", "overallQuality"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_fields" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return extraction results");

    const result = JSON.parse(toolCall.function.arguments);

    // Persist to document_extractions
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const extractedFieldsMap: Record<string, string> = {};
    const fieldConfidenceMap: Record<string, number> = {};
    for (const f of result.fields || []) {
      extractedFieldsMap[f.fieldName] = f.value;
      fieldConfidenceMap[f.fieldName] = f.confidence;
    }

    const { data: extraction, error: extErr } = await adminClient
      .from("document_extractions")
      .insert({
        extracted_fields: extractedFieldsMap,
        field_confidence: fieldConfidenceMap,
        extraction_model: "google/gemini-2.5-flash",
        raw_text: result.rawTextSummary || null,
        parse_warnings: result.parseWarnings || [],
      })
      .select("id")
      .single();

    if (extErr) console.error("Failed to persist extraction:", extErr);
    else result.extractionId = extraction?.id;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
