import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_DOC_TYPES = [
  "commercial_invoice", "packing_list", "bill_of_lading", "air_waybill",
  "truck_bol_carrier_manifest", "certificate_of_origin", "usmca_certification",
  "korus_certificate", "isf_confirmation", "arrival_notice", "customs_bond",
  "power_of_attorney", "freight_invoice", "insurance_certificate",
  "phytosanitary_certificate", "fumigation_certificate_ispm15",
  "paps_document", "pars_document", "carta_porte_cfdi", "pedimento",
  "aci_emanifest", "carm_registration", "cbp_form_3461", "cbp_form_7501",
  "cbp_form_7512", "fda_prior_notice", "usda_aphis_permit",
  "epa_tsca_certification", "fcc_declaration", "cpsc_certificate",
  "sima_license", "export_license", "dangerous_goods_declaration",
  "sds_msds", "inspection_certificate", "letter_of_credit",
  "purchase_order", "delivery_order", "pro_forma_invoice", "unknown",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || "application/octet-stream";

    const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");

    const systemPrompt = `You are a licensed customs broker's AI assistant with expert knowledge of all international trade documents. Examine this document and identify exactly what type of customs or shipping document it is.

Look for: document titles, form numbers, issuing authorities, field labels, logos, stamps, and content structure.

You MUST return ONLY a valid JSON object with no markdown formatting, no code blocks, no preamble:

{
  "document_type": "one of the valid types",
  "confidence": 0.0 to 1.0,
  "detected_language": "language code",
  "issuing_country": "country code or null",
  "document_date": "date string or null",
  "key_identifiers": ["list of clues used"],
  "shipment_mode_inference": "ocean" or "air" or "land" or "unknown",
  "importer_name": "extracted importer/consignee or null",
  "exporter_name": "extracted shipper/seller or null",
  "bl_or_awb_number": "B/L or AWB number if found or null",
  "reasoning": "brief explanation"
}

Valid document_type values: ${VALID_DOC_TYPES.join(", ")}`;

    const userContent: any[] = [];

    if (isPdf || isImage) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    } else {
      // For text-like files, decode and send as text
      const textDecoder = new TextDecoder();
      const text = textDecoder.decode(new Uint8Array(arrayBuffer));
      userContent.push({ type: "text", text: `Document content from file "${file.name}":\n\n${text.slice(0, 50000)}` });
    }

    userContent.push({
      type: "text",
      text: "Identify this document. Return ONLY valid JSON, no markdown code blocks.",
    });

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
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty response");

    let result: any;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse identification JSON:", content.substring(0, 500));
      result = { document_type: "unknown", confidence: 0, reasoning: "Failed to parse AI response" };
    }

    // Validate document_type
    if (!VALID_DOC_TYPES.includes(result.document_type)) {
      result.document_type = "unknown";
      result.confidence = Math.min(result.confidence || 0, 0.3);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("packet-identify error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
