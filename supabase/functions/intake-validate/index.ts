import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      systemPrompt = `You are a document extraction expert for trade/customs documents. Your task is to extract field values ONLY from the actual text provided. CRITICAL RULES:
1. Every value you return MUST appear verbatim or very closely in the document text.
2. If a field is not present in the document, DO NOT include it — do not guess or fabricate values.
3. The sourceText for each field MUST be the exact passage from the document where you found that value.
4. Never use default or common example values. Only extract what the document actually contains.
5. Set confidence to 100 only if the value is unambiguously present. Use 70-85 if you had to interpret context.`;
      userPrompt = `Extract shipping fields ONLY from the following document text. Return only fields whose values appear in the text — do not invent or assume any values.

Document text:
---
${params.documentText}
---

Extract all available fields with accurate confidence scores and source text references.`;
      tools = [{
        type: "function",
        function: {
          name: "extract_fields",
          description: "Return extracted shipping fields from document",
          parameters: {
            type: "object",
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fieldName: { type: "string", enum: ["shipper", "consignee", "origin_country", "destination_country", "hs_code", "declared_value", "currency", "description", "quantity", "port_of_entry", "incoterm", "planned_departure", "estimated_arrival", "gross_weight", "net_weight"] },
                    value: { type: "string" },
                    confidence: { type: "number", description: "0-100" },
                    sourceText: { type: "string", description: "Original text in document this was extracted from" },
                  },
                  required: ["fieldName", "value", "confidence"],
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
