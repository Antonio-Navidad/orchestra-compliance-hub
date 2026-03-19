import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, materials, dimensions, weight, originCountry, destinationCountry, imageUrl, productUrl, shipmentId, productId, workspaceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = claimsData?.claims?.sub as string || null;
    }

    const userPrompt = `Classify this product for customs/trade purposes.

Product Title: ${title || "N/A"}
Description: ${description || "N/A"}
Materials/Composition: ${materials || "N/A"}
Dimensions: ${dimensions || "N/A"}
Weight: ${weight || "N/A"}
Origin Country: ${originCountry || "N/A"}
Destination Country: ${destinationCountry || "N/A"}
Product URL: ${productUrl || "N/A"}
Image URL: ${imageUrl || "N/A"}

Provide your classification analysis. For the destination country "${destinationCountry || 'US'}", you MUST also provide:
- The general/MFN duty rate specific to that country
- Any preferential trade agreement rates (with the agreement name, preferential rate, list of origin countries eligible, and the specific document required to claim it)
- Any additional active duties (anti-dumping, countervailing, safeguard, Section 301 for US, etc.)
- The de minimis threshold for that country (the value below which goods are duty-free)
- What documents/certifications are needed to claim each preferential rate`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert customs classifier and trade compliance specialist. When given product information, you must return a classification using the tool provided. Always provide at least 2 alternate codes. For duty estimates, use realistic ranges based on the specific destination country's tariff schedule. Provide country-specific general/MFN rates, preferential trade agreement rates, additional duties, and de minimis thresholds. Be thorough in your reasoning.`
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_product",
              description: "Return the customs classification result for the product.",
              parameters: {
                type: "object",
                properties: {
                  primaryCode: { type: "string", description: "Most likely HS/HTS code (6-10 digits)" },
                  primaryDescription: { type: "string", description: "Official description of the primary code" },
                  confidence: { type: "number", description: "Confidence score 0-100" },
                  reasoning: { type: "string", description: "Plain-language explanation of why this code was chosen" },
                  alternateCodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string" },
                        description: { type: "string" },
                        confidence: { type: "number" },
                        reason: { type: "string" }
                      },
                      required: ["code", "description", "confidence", "reason"]
                    }
                  },
                  estimatedDutyRange: { type: "string", description: "Estimated duty rate range e.g. '2.5% - 5.0%'" },
                  estimatedTaxes: { type: "string", description: "Estimated taxes/fees if applicable" },
                  generalDutyRate: { type: "string", description: "The general/MFN duty rate for the destination country, e.g. '12.0%'" },
                  preferentialRates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        agreement: { type: "string", description: "Trade agreement name" },
                        rate: { type: "string", description: "Preferential duty rate" },
                        originCountries: { type: "array", items: { type: "string" } },
                        requiredDocument: { type: "string", description: "Document needed to claim this rate" }
                      },
                      required: ["agreement", "rate", "originCountries", "requiredDocument"]
                    }
                  },
                  additionalDuties: { type: "array", items: { type: "string" }, description: "Anti-dumping, countervailing, Section 301, safeguard duties" },
                  deMinimisThreshold: { type: "string", description: "De minimis threshold for the destination country" },
                  requiredDocuments: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of required supporting documents"
                  },
                  restrictedFlags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any restricted category or compliance flags"
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any warnings about the classification"
                  },
                  missingInfo: {
                    type: "array",
                    items: { type: "string" },
                    description: "Information that would improve classification accuracy"
                  }
                },
                required: ["primaryCode", "primaryDescription", "confidence", "reasoning", "alternateCodes", "requiredDocuments"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_product" } },
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
    if (!toolCall) throw new Error("AI did not return a classification result");

    const result = JSON.parse(toolCall.function.arguments);

    // Persist to product_classifications table
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const candidateCodes = [
      { code: result.primaryCode, description: result.primaryDescription, confidence: result.confidence, reason: result.reasoning },
      ...(result.alternateCodes || []),
    ];

    const { data: classRecord, error: insertError } = await adminClient
      .from("product_classifications")
      .insert({
        shipment_id: shipmentId || null,
        product_id: productId || null,
        candidate_codes: candidateCodes,
        confidence: result.confidence / 100,
        accepted_code: result.primaryCode,
        status: "classified",
        ai_model_version: "google/gemini-3-flash-preview",
        restricted_flags: result.restrictedFlags || [],
        evidence: {
          reasoning: result.reasoning,
          estimatedDutyRange: result.estimatedDutyRange,
          estimatedTaxes: result.estimatedTaxes,
          requiredDocuments: result.requiredDocuments,
          warnings: result.warnings || [],
          missingInfo: result.missingInfo || [],
          input: { title, description, materials, originCountry, destinationCountry },
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to persist classification:", insertError);
    }

    return new Response(JSON.stringify({ ...result, classificationId: classRecord?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-product error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
