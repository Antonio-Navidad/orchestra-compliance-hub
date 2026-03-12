import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, materials, dimensions, weight, originCountry, destinationCountry, imageUrl, productUrl } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

Provide your classification analysis.`;

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
            content: `You are an expert customs classifier and trade compliance specialist. When given product information, you must return a classification using the tool provided. Always provide at least 2 alternate codes. For duty estimates, use realistic ranges. Be thorough in your reasoning.`
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

    if (!toolCall) {
      throw new Error("AI did not return a classification result");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-product error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
