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

async function extractRawTextFromPdf(
  LOVABLE_API_KEY: string,
  fileBytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const pdfBase64 = bytesToBase64(fileBytes);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract raw text from trade documents. Return only text that appears in the document. Preserve labels, line breaks, and key table values.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${pdfBase64}` },
            },
            {
              type: "text",
              text: "Extract the full readable text from this PDF. Include all key shipping fields exactly as written (shipper, consignee, B/L, vessel, container, ports, values, HS codes, Incoterms, ETD, ETA). Do not summarize.",
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "pdf_text_result",
            description: "Return raw extracted text from the PDF",
            parameters: {
              type: "object",
              properties: {
                rawText: { type: "string" },
              },
              required: ["rawText"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "pdf_text_result" } },
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`PDF text extraction failed: ${response.status} ${responseBody}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return String(parsed.rawText || "");
  }

  return String(data.choices?.[0]?.message?.content || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
        type: "function",
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
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "hs_validation" } };
    } else if (action === "validate_description") {
      systemPrompt = "You are a customs compliance expert. Evaluate commodity description quality for customs declaration purposes.";
      userPrompt = `Evaluate this commodity description for customs compliance quality.
Description: "${params.description}"
HS Code: ${params.hsCode || "not provided"}
Destination Country: ${params.destinationCountry || "US"}`;
      tools = [{
        type: "function",
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
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "description_quality" } };
    } else if (action === "coach") {
      systemPrompt = `You are Orchestra's AI Compliance Coach. Answer the user's question about their specific shipment using the context provided. Be specific, actionable, and reference the actual shipment data. Always suggest relevant Orchestra features when applicable. Keep answers concise (3-5 sentences max) but include specific regulatory references where helpful.`;
      userPrompt = `Shipment Context:
- Lane: ${params.originCountry || "?"} → ${params.destinationCountry || "?"}
- Mode: ${params.mode || "?"}
- HS Code: ${params.hsCode || "not entered"}
- Commodity: ${params.description || "not entered"}
- Declared Value: ${params.declaredValue || "?"} ${params.currency || "USD"}
- Incoterm: ${params.incoterm || "not selected"}
- COO Status: ${params.cooStatus || "unknown"}

User Question: ${params.question}`;
      // No tools - just chat completion
    } else if (action === "extract_document") {
      const mimeType = typeof params.mimeType === "string" ? params.mimeType : "application/octet-stream";
      const fileName = typeof params.fileName === "string" ? params.fileName : "uploaded-document";
      const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

      let documentText = typeof params.documentText === "string" ? params.documentText : "";
      let fetchedFromStorage = false;
      let loadedBinaryPayload = false;
      let fileBytes: Uint8Array | null = null;

      if (!documentText && typeof params.storageBucket === "string" && typeof params.storagePath === "string") {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: storageFile, error: storageError } = await adminClient.storage
            .from(params.storageBucket)
            .download(params.storagePath);

          if (!storageError && storageFile) {
            fileBytes = new Uint8Array(await storageFile.arrayBuffer());
            fetchedFromStorage = true;
          } else {
            console.error("[extract_document] storage fetch failed", storageError?.message);
          }
        }
      }

      if (!documentText && !fileBytes && typeof params.documentBase64 === "string") {
        try {
          fileBytes = base64ToBytes(params.documentBase64);
          loadedBinaryPayload = true;
        } catch (decodeError) {
          console.error("[extract_document] base64 decode failed", decodeError);
        }
      }

      if (!documentText && fileBytes) {
        if (isPdf) {
          documentText = await extractRawTextFromPdf(LOVABLE_API_KEY, fileBytes, mimeType);
        } else {
          documentText = new TextDecoder().decode(fileBytes);
        }
      }

      documentText = documentText.replace(/\u0000/g, " ").trim();

      console.info(
        "[extract_document] pipeline_debug",
        JSON.stringify({
          fileFetchedFromStorage: fetchedFromStorage,
          filePayloadLoaded: loadedBinaryPayload,
          mimeType,
          extractedTextCharCount: documentText.length,
          extractedTextPreview: documentText.slice(0, 200),
        }),
      );

      if (!documentText) {
        throw new Error("No readable text could be extracted from the uploaded file.");
      }

      systemPrompt = `You are a document extraction expert for trade/customs shipping data. Extract only values clearly present in the provided raw document text.

Extract any fields that appear in the text, including:
shipper, consignee, notify party, HS code, declared value, currency, port of loading, port of discharge, vessel name, container number, seal number, B/L number, ETD, ETA, Incoterms, origin country, destination country, transport mode, commodity description, quantity, gross/net weight.

Rules:
1. Do not fabricate or guess values.
2. If a field is not found, omit it.
3. sourceText must contain the exact nearby phrase from the document.
4. Confidence scoring:
   - 95-100: exact labeled field
   - 80-94: clearly present in context
   - 60-79: inferred from nearby context`; 

      userPrompt = `Extract shipping fields from this raw document text.

RAW TEXT:
---
${documentText.slice(0, 120000)}
---

Return all extracted fields with confidence and sourceText.`;

      tools = [{
        type: "function",
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
                      description:
                        "Field key such as shipper, consignee, notify_party, hs_code, declared_value, currency, port_of_loading, port_of_discharge, vessel_name, container_number, seal_number, bl_number, etd, eta, incoterm, origin_country, destination_country, transport_mode, commodity_description, quantity, gross_weight, net_weight",
                    },
                    value: { type: "string" },
                    confidence: { type: "number", description: "Confidence from 60 to 100" },
                    sourceText: { type: "string", description: "Exact nearby document text supporting this value" },
                  },
                  required: ["fieldName", "value", "confidence", "sourceText"],
                  additionalProperties: false,
                },
              },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "extract_fields" } };
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
        type: "function",
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
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "pre_submission_result" } };
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();

    if (action === "coach") {
      const content = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
      return new Response(JSON.stringify({ answer: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured results");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("intake-validate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
