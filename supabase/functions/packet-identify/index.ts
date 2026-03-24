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

// Key visual/textual identifiers for each document type
// These help the model quickly pattern-match rather than guessing
const DOC_IDENTIFICATION_HINTS = `
Key identifiers by document type:
- commercial_invoice: titles like "INVOICE", "COMMERCIAL INVOICE", "FACTURA COMERCIAL". Contains seller, buyer, line items with prices, total value, payment terms.
- packing_list: titles like "PACKING LIST", "LISTA DE EMPAQUE". Contains cartons, weights, dimensions, NO unit prices.
- bill_of_lading: titles like "BILL OF LADING", "B/L", "SEA WAYBILL", "OCEAN BILL". Contains B/L number, vessel, port of loading/discharge, container numbers.
- air_waybill: titles like "AIR WAYBILL", "AWB", "AIRWAY BILL". Contains AWB number, airline, airport codes.
- certificate_of_origin: titles like "CERTIFICATE OF ORIGIN", "CERTIFICADO DE ORIGEN". Issued by chamber of commerce or government authority.
- usmca_certification: mentions "USMCA", "T-MEC", "CUSMA". Has origin criterion (A/B/C/D).
- korus_certificate: mentions "KORUS FTA", Korean Free Trade Agreement. Has exporter/producer/importer fields.
- isf_confirmation: mentions "ISF", "Importer Security Filing", "10+2". Contains manufacturer, ship-to, HTSUS codes.
- cbp_form_3461: title "CBP FORM 3461", "ENTRY/IMMEDIATE DELIVERY". U.S. CBP entry form.
- cbp_form_7501: title "CBP FORM 7501", "ENTRY SUMMARY". Has duty calculations, importer of record.
- customs_bond: mentions "SURETY BOND", "CUSTOMS BOND", bond number, principal, surety company.
- power_of_attorney: mentions "POWER OF ATTORNEY", "CUSTOMS POWER OF ATTORNEY". Authorizes broker to act.
- freight_invoice: issued by freight forwarder or carrier, itemizes freight charges, no goods line items.
- arrival_notice: issued by carrier/agent, mentions "ARRIVAL NOTICE", ETA, container ready for pickup.
- pedimento: Mexican customs document. Contains "PEDIMENTO" in title, aduana (customs office) reference.
- carta_porte_cfdi: Mexican transport document with CFDI fiscal folio. Mentions "CARTA PORTE".`;

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
    const fileName = file.name.toLowerCase();

    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");
    // ── FIX: correctly identify binary formats ──
    const isXlsx = mimeType.includes("spreadsheet") || mimeType.includes("excel") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isDocx = mimeType.includes("word") || fileName.endsWith(".docx") || fileName.endsWith(".doc");
    const isText = fileName.endsWith(".txt") || fileName.endsWith(".csv") || mimeType.startsWith("text/");

    const systemPrompt = `You are a licensed customs broker's AI assistant with expert knowledge of all international trade and shipping documents. Examine this document and identify exactly what type it is.

${DOC_IDENTIFICATION_HINTS}

Return ONLY a valid JSON object. No markdown. No code fences. No explanation before or after the JSON.

{
  "document_type": "one exact value from the valid types list",
  "confidence": number between 0.0 and 1.0,
  "detected_language": "ISO 639-1 language code e.g. en, es, ko, zh",
  "issuing_country": "ISO 3166-1 alpha-2 country code or null",
  "document_date": "date string in YYYY-MM-DD format or null",
  "key_identifiers": ["list of specific clues that led to this identification"],
  "shipment_mode_inference": "ocean" or "air" or "land" or "unknown",
  "importer_name": "full name of importer/consignee/buyer or null",
  "exporter_name": "full name of exporter/shipper/seller or null",
  "bl_or_awb_number": "B/L number or AWB number if found or null",
  "reasoning": "one sentence explaining the key identifier that determined document type"
}

Valid document_type values: ${VALID_DOC_TYPES.join(", ")}

Confidence guidelines:
- 0.95+: Title clearly states document type
- 0.80-0.94: No explicit title but structure and fields clearly match
- 0.60-0.79: Likely match but some ambiguity
- Below 0.60: Use "unknown"`;

    // Build message content based on file type
    const userContent: any[] = [];

    if (isPdf || isImage) {
      // Vision-capable: send as image_url
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
      userContent.push({
        type: "text",
        text: `Identify this document. File name: "${file.name}". Return ONLY the JSON object.`,
      });
    } else if (isText) {
      // Plain text files — decode and send as text
      const textDecoder = new TextDecoder();
      const text = textDecoder.decode(new Uint8Array(arrayBuffer));
      userContent.push({
        type: "text",
        text: `Identify this document based on its content.\n\nFile name: "${file.name}"\nContent:\n${text.slice(0, 50000)}\n\nReturn ONLY the JSON object.`,
      });
    } else if (isXlsx || isDocx) {
      // ── FIX: binary office files can't be decoded as text ──
      // Identify from filename and format clues only
      const fileType = isXlsx ? "Excel spreadsheet (XLSX)" : "Word document (DOCX)";
      userContent.push({
        type: "text",
        text: `Identify this document based on its filename and file type.

File name: "${file.name}"
File type: ${fileType}
File size: ${file.size} bytes

For customs documents saved as ${fileType} files, use the filename and context to make your best identification. Common patterns:
- Files named "invoice*", "inv*", "factura*" → commercial_invoice
- Files named "packing*", "PL*", "pack_list*" → packing_list
- Files named "BOL*", "BL*", "bill*lading*" → bill_of_lading
- Files named "AWB*", "airway*" → air_waybill
- Files named "COO*", "cert*origin*" → certificate_of_origin
- Files named "USMCA*", "KORUS*" → respective FTA certificate

Return ONLY the JSON object with your best identification. Set confidence to 0.65 maximum for office file types since content cannot be read directly.`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `Identify this document. File name: "${file.name}", type: ${mimeType}. Return ONLY the JSON object.`,
      });
    }

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
        max_tokens: 1024, // identification only needs short response
        temperature: 0, // ── FIX: deterministic identification ──
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
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content.trim();
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse identification JSON:", content.substring(0, 500));
      result = {
        document_type: "unknown",
        confidence: 0,
        reasoning: "Failed to parse AI response",
        shipment_mode_inference: "unknown",
        importer_name: null,
        exporter_name: null,
        bl_or_awb_number: null,
      };
    }

    // Validate document_type is in our allowed list
    if (!VALID_DOC_TYPES.includes(result.document_type)) {
      console.warn(`[packet-identify] Model returned unknown type: ${result.document_type} — falling back to unknown`);
      result.document_type = "unknown";
      result.confidence = Math.min(result.confidence || 0, 0.3);
    }

    // Cap confidence for binary files since we can't read their content
    if ((isXlsx || isDocx) && result.confidence > 0.65) {
      result.confidence = 0.65;
    }

    console.log(`[packet-identify] ${file.name} → ${result.document_type} (${Math.round((result.confidence || 0) * 100)}%)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("packet-identify error:", e);
    return new Response(JSON.stringify({
      document_type: "unknown",
      confidence: 0,
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
