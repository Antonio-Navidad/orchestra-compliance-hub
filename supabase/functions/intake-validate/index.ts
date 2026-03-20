import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Call Anthropic Claude API */
async function callClaude(
  apiKey: string,
  system: string,
  userContent: string | Array<{ type: string; [k: string]: any }>,
  tools?: any[],
  toolChoice?: any,
): Promise<any> {
  const messages: any[] = [
    { role: "user", content: userContent },
  ];

  const body: any = {
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 8192,
    system,
    messages,
  };

  if (tools && tools.length > 0) {
    // Convert OpenAI-style tool definitions to Anthropic format
    body.tools = tools.map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    if (toolChoice) {
      body.tool_choice = { type: "tool", name: toolChoice.function.name };
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
    }
    if (response.status === 402 || response.status === 400) {
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      throw { status: response.status, message: `Claude API error: ${response.status}` };
    }
    const t = await response.text();
    console.error("Anthropic API error:", response.status, t);
    throw { status: 500, message: `Claude API error: ${response.status}` };
  }

  return await response.json();
}

/** Extract tool result from Anthropic response */
function extractToolResult(response: any): any {
  const toolBlock = response.content?.find((b: any) => b.type === "tool_use");
  if (toolBlock) return toolBlock.input;
  // Fallback to text content
  const textBlock = response.content?.find((b: any) => b.type === "text");
  return textBlock?.text || null;
}

/** Extract text content from Anthropic response */
function extractTextResult(response: any): string {
  const textBlock = response.content?.find((b: any) => b.type === "text");
  return textBlock?.text || "";
}

/** Use Claude vision to extract raw text from a PDF */
async function extractRawTextFromPdf(
  apiKey: string,
  fileBytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const pdfBase64 = bytesToBase64(fileBytes);
  const mediaType = mimeType === "application/pdf" ? "application/pdf" : mimeType;

  const response = await callClaude(
    apiKey,
    "You extract raw text from trade documents. Return only text that appears in the document. Preserve labels, line breaks, and key table values.",
    [
      {
        type: "document",
        source: { type: "base64", media_type: mediaType, data: pdfBase64 },
      },
      {
        type: "text",
        text: "Extract the full readable text from this document. Include all key shipping fields exactly as written (shipper, consignee, B/L, vessel, container, ports, values, HS codes, Incoterms, ETD, ETA). Do not summarize.",
      },
    ],
    [
      {
        function: {
          name: "pdf_text_result",
          description: "Return raw extracted text from the PDF",
          parameters: {
            type: "object",
            properties: {
              rawText: { type: "string" },
            },
            required: ["rawText"],
          },
        },
      },
    ],
    { function: { name: "pdf_text_result" } },
  );

  const result = extractToolResult(response);
  if (result?.rawText) return String(result.rawText);
  return extractTextResult(response);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";
    let tools: any[] = [];
    let toolChoice: any = undefined;

    if (action === "validate_hs") {
      systemPrompt = "You are a customs HS code validation expert. Validate whether the given HS code matches the commodity description. Return structured validation results.";
      userPrompt = `Validate this HS code against the commodity description.
HS Code: ${params.hsCode}
Commodity Description: ${params.description}
Destination Country: ${params.destinationCountry || "US"}
Declared Value: ${params.declaredValue || "N/A"}
Currency: ${params.currency || "USD"}`;
      tools = [{
        function: {
          name: "hs_validation",
          description: "Return HS code validation results",
          parameters: {
            type: "object",
            properties: {
              officialDescription: { type: "string", description: "Official WCO description of the HS code" },
              matches: { type: "boolean", description: "Whether HS code matches the commodity description" },
              confidence: { type: "number", description: "Match confidence 0-100" },
              warning: { type: "string", description: "Warning message if mismatch detected, empty if OK" },
              suggestedCode: { type: "string", description: "Better HS code if mismatch, empty if OK" },
              estimatedDutyRate: { type: "string", description: "Estimated duty rate percentage for destination country" },
              estimatedDutyAmount: { type: "number", description: "Estimated duty amount based on declared value" },
              tradeAgreementNote: { type: "string", description: "Note about applicable trade agreements that could reduce duty" },
            },
            required: ["officialDescription", "matches", "confidence", "warning", "estimatedDutyRate"],
          },
        },
      }];
      toolChoice = { function: { name: "hs_validation" } };
    } else if (action === "validate_description") {
      systemPrompt = "You are a customs compliance expert. Evaluate commodity description quality for customs declaration purposes.";
      userPrompt = `Evaluate this commodity description for customs compliance quality.
Description: "${params.description}"
HS Code: ${params.hsCode || "not provided"}
Destination Country: ${params.destinationCountry || "US"}`;
      tools = [{
        function: {
          name: "description_quality",
          description: "Return description quality assessment",
          parameters: {
            type: "object",
            properties: {
              quality: { type: "string", enum: ["high", "medium", "low"] },
              score: { type: "number", description: "Quality score 0-100" },
              issues: { type: "array", items: { type: "string" }, description: "List of issues found" },
              suggestions: { type: "array", items: { type: "string" }, description: "Improvement suggestions" },
              compliantExample: { type: "string", description: "Example of a compliant description for this product type" },
              nonCompliantExample: { type: "string", description: "Example of a non-compliant description" },
              examinationRiskIncrease: { type: "string", description: "Estimated customs examination risk increase %" },
            },
            required: ["quality", "score", "issues", "suggestions", "compliantExample"],
          },
        },
      }];
      toolChoice = { function: { name: "description_quality" } };
    } else if (action === "coach") {
      systemPrompt = `You are Orchestra's AI Compliance Coach — a senior licensed customs broker assistant. Answer the user's question about their specific shipment using the context provided. Be specific, actionable, and reference the actual shipment data. Always suggest relevant Orchestra features when applicable. Keep answers concise (3-5 sentences max) but include specific regulatory references where helpful.`;
      userPrompt = `Shipment Context:
- Lane: ${params.originCountry || "?"} → ${params.destinationCountry || "?"}
- Mode: ${params.mode || "?"}
- HS Code: ${params.hsCode || "not entered"}
- Commodity: ${params.description || "not entered"}
- Declared Value: ${params.declaredValue || "?"} ${params.currency || "USD"}
- Incoterm: ${params.incoterm || "not selected"}
- COO Status: ${params.cooStatus || "unknown"}

User Question: ${params.question}`;
      // No tools - just text completion
    } else if (action === "extract_document") {
      const mimeType = typeof params.mimeType === "string" ? params.mimeType : "application/octet-stream";
      const fileName = typeof params.fileName === "string" ? params.fileName : "uploaded-document";
      const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

      let documentText = typeof params.documentText === "string" ? params.documentText : "";
      let fetchedFromStorage = false;
      let loadedBinaryPayload = false;
      let fileBytes: Uint8Array | null = null;

      // Try storage fetch
      if (!documentText && typeof params.storageBucket === "string" && typeof params.storagePath === "string") {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: storageFile, error: storageError } = await adminClient.storage
            .from(params.storageBucket).download(params.storagePath);
          if (!storageError && storageFile) {
            fileBytes = new Uint8Array(await storageFile.arrayBuffer());
            fetchedFromStorage = true;
          } else {
            console.error("[extract_document] storage fetch failed", storageError?.message);
          }
        }
      }

      // Try base64 payload
      if (!documentText && !fileBytes && typeof params.documentBase64 === "string") {
        try {
          fileBytes = base64ToBytes(params.documentBase64);
          loadedBinaryPayload = true;
        } catch (decodeError) {
          console.error("[extract_document] base64 decode failed", decodeError);
        }
      }

      // Extract text from binary
      if (!documentText && fileBytes) {
        if (isPdf) {
          documentText = await extractRawTextFromPdf(ANTHROPIC_API_KEY, fileBytes, mimeType);
        } else {
          documentText = new TextDecoder().decode(fileBytes);
        }
      }

      documentText = documentText.replace(/\u0000/g, " ").trim();

      console.info("[extract_document] pipeline_debug", JSON.stringify({
        fileFetchedFromStorage: fetchedFromStorage,
        filePayloadLoaded: loadedBinaryPayload,
        mimeType,
        extractedTextCharCount: documentText.length,
        extractedTextPreview: documentText.slice(0, 200),
      }));

      if (!documentText) {
        throw new Error("No readable text could be extracted from the uploaded file.");
      }

      systemPrompt = `You are a document extraction expert for trade/customs shipping data. Extract only values clearly present in the provided raw document text.

CRITICAL — Shipper and Consignee name separation:
- For "shipper" and "consignee", extract ONLY the company name (e.g. "Textiles Andinos S.A.S."), NOT the full address block.
- Extract the address parts as separate fields: shipper_address, shipper_city_state, shipper_country, consignee_address, consignee_city_state, consignee_country.
- Use "shipper_name" for the company name only and "consignee_name" for the company name only.

Extract any fields that appear in the text, including:
shipper_name, consignee_name, shipper_address, shipper_city_state, shipper_country, consignee_address, consignee_city_state, consignee_country, notify_party, hs_code, declared_value, currency, port_of_loading, port_of_discharge, vessel_name, container_number, seal_number, bl_number, etd, eta, incoterm, origin_country, destination_country, import_country, export_country, place_of_receipt, place_of_delivery, transport_mode, commodity_description, quantity, gross_weight, net_weight, total_cartons, total_pieces, total_cbm, freight_charges, insurance_value, cif_value, booking_reference, purchase_order, shippers_reference, customs_entry_number.

For quantity/weight/volume fields, extract the numeric value AND the unit separately.

Recognize all common unit variations:
- Quantity: pcs, pieces, units, ea, each, ctns, cartons, ctn, boxes, pkgs, packages, bags, rolls, pallets, plt, drums, sets, pairs, dozens, doz, gross, bundles, sheets, reels, coils
- Weight: kg, kgs, kilogram, lb, lbs, pound, oz, ounces, mt, metric ton, ton, tons, g, grams
- Volume: cbm, m3, cubic meter, cft, ft3, cubic feet, l, liters, litres, gal, gallons

If a document contains MULTIPLE quantity expressions, extract ALL of them as separate fields.

Rules:
1. Do not fabricate or guess values.
2. If a field is not found, omit it.
3. sourceText must contain the exact nearby phrase from the document.
4. Confidence scoring:
   - 95-100: exact labeled field (e.g. "Net Weight: 1,226.5 kg")
   - 80-94: clearly present in context
   - 60-79: inferred from nearby context
   - For values in tables without clear labels: 75-85`;

      userPrompt = `Extract shipping fields from this raw document text.

RAW TEXT:
---
${documentText.slice(0, 120000)}
---

Return all extracted fields with confidence and sourceText. Extract ALL quantity/weight/volume fields separately.`;

      tools = [{
        function: {
          name: "extract_fields",
          description: "Return extracted shipping fields found in document text",
          parameters: {
            type: "object",
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fieldName: {
                      type: "string",
                      description: "Field key: shipper_name, consignee_name, shipper_address, shipper_city_state, shipper_country, consignee_address, consignee_city_state, consignee_country, notify_party, hs_code, declared_value, currency, port_of_loading, port_of_discharge, vessel_name, container_number, seal_number, bl_number, etd, eta, incoterm, origin_country, destination_country, import_country, export_country, place_of_receipt, place_of_delivery, transport_mode, commodity_description, quantity, gross_weight, net_weight, total_cartons, total_pieces, total_cbm, freight_charges, insurance_value, cif_value, booking_reference, purchase_order, shippers_reference, customs_entry_number",
                    },
                    value: { type: "string" },
                    unit: { type: "string", description: "Unit of measurement if applicable (kg, cbm, pcs, cartons, etc.)" },
                    confidence: { type: "number", description: "Confidence from 60 to 100" },
                    sourceText: { type: "string", description: "Exact nearby document text supporting this value" },
                  },
                  required: ["fieldName", "value", "confidence", "sourceText"],
                },
              },
            },
            required: ["fields"],
          },
        },
      }];
      toolChoice = { function: { name: "extract_fields" } };
    } else if (action === "pre_submission_check") {
      systemPrompt = "You are a customs compliance auditor. Perform a final pre-submission validation on this shipment and identify all blockers, warnings, and ready items.";
      userPrompt = `Pre-submission compliance check for shipment:
- Shipment ID: ${params.shipmentId}
- Lane: ${params.originCountry} → ${params.destinationCountry}
- Mode: ${params.mode}
- HS Code: ${params.hsCode || "MISSING"}
- Description: ${params.description || "MISSING"}
- Declared Value: ${params.declaredValue || "MISSING"} ${params.currency || "USD"}
- Consignee: ${params.consignee || "MISSING"}
- Shipper: ${params.shipper || "MISSING"}
- COO Status: ${params.cooStatus || "unknown"}
- Incoterm: ${params.incoterm || "MISSING"}
- Documents uploaded: ${(params.uploadedDocs || []).join(", ") || "NONE"}
- Packet Score: ${params.packetScore || 0}%
- Missing Documents: ${(params.missingDocs || []).join(", ") || "NONE"}`;
      tools = [{
        function: {
          name: "pre_submission_result",
          description: "Return pre-submission compliance check results",
          parameters: {
            type: "object",
            properties: {
              overallReadiness: { type: "number", description: "Overall readiness percentage 0-100" },
              clearanceRate: { type: "string", description: "Estimated clearance rate for this readiness level" },
              blockers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    issue: { type: "string" },
                    explanation: { type: "string" },
                    fixAction: { type: "string" },
                  },
                  required: ["issue", "explanation", "fixAction"],
                },
              },
              warnings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    issue: { type: "string" },
                    explanation: { type: "string" },
                  },
                  required: ["issue", "explanation"],
                },
              },
              readyItems: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["overallReadiness", "clearanceRate", "blockers", "warnings", "readyItems"],
          },
        },
      }];
      toolChoice = { function: { name: "pre_submission_result" } };
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Claude
    const claudeResponse = await callClaude(
      ANTHROPIC_API_KEY,
      systemPrompt,
      userPrompt,
      tools.length > 0 ? tools : undefined,
      toolChoice,
    );

    // Handle coach (text response)
    if (action === "coach") {
      const content = extractTextResult(claudeResponse);
      return new Response(JSON.stringify({ answer: content || "I couldn't generate a response. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool responses
    const result = extractToolResult(claudeResponse);
    if (!result) throw new Error("Claude did not return structured results");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("intake-validate error:", e);
    const status = e?.status || 500;
    const message = e instanceof Error ? e.message : (e?.message || "Unknown error");
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
