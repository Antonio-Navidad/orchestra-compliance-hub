import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CROSS_REF_PAIRS: Array<{ a: string; b: string; checks: string }> = [
  {
    a: "commercial_invoice",
    b: "packing_list",
    checks: `Perform ALL of the following checks between the Commercial Invoice and Packing List. Flag ANY mismatch:
1. Total carton/package count MUST match exactly. Even a difference of 1 is a finding.
2. Total gross weight MUST match within 1%. Calculate the percentage difference and flag if >1%.
3. Number of line items MUST match. Count line items on each document.
4. Each line item description must SEMANTICALLY match. Flag if wording differs even slightly (e.g. "brake calipers" vs "brake assemblies", "steel bolts" vs "metal fasteners"). Be strict — near-synonyms are flagged as "medium" severity.
5. Country of origin on packing list must match the invoice's country_of_origin. Flag any mismatch as "critical".
6. If both documents show net weight totals, they must match within 1%.`
  },
  {
    a: "commercial_invoice",
    b: "bill_of_lading",
    checks: "consignee name must match buyer name, cargo/commodity description must semantically match, notify party consistency, total weight must match within 5%, total packages/cartons must match"
  },
  { a: "isf_filing", b: "bill_of_lading", checks: "container numbers, seal numbers, HTS 6-digit codes" },
  { a: "isf_filing", b: "commercial_invoice", checks: "country of origin, manufacturer address" },
  { a: "fta_certificate", b: "commercial_invoice", checks: "country of origin match, certificate expiry validity" },
  { a: "entry_summary_7501", b: "commercial_invoice", checks: "declared value, HTS codes, importer name" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { documents, shipmentMode, commodityType, countryOfOrigin } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return new Response(JSON.stringify({ discrepancies: [], message: "Need at least 2 documents to cross-reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docTypes = documents.map((d: any) => d.document_type);
    const applicablePairs = CROSS_REF_PAIRS.filter(
      p => docTypes.includes(p.a) && docTypes.includes(p.b)
    );

    if (applicablePairs.length === 0) {
      return new Response(JSON.stringify({ discrepancies: [], message: "No applicable cross-reference pairs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docSummaries = documents.map((d: any) =>
      `=== ${d.document_type.toUpperCase().replace(/_/g, ' ')} ===\n${JSON.stringify(d.extracted_data, null, 2)}`
    ).join("\n\n");

    const pairDescriptions = applicablePairs.map(
      p => `- ${p.a.replace(/_/g, ' ')} ↔ ${p.b.replace(/_/g, ' ')}:\n  ${p.checks}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a senior licensed customs broker performing document cross-reference verification. You are meticulous and strict about identifying discrepancies that could cause CBP holds, penalties, or entry rejections.

CRITICAL RULES:
- Be STRICT. Flag every mismatch, no matter how small.
- Weight differences >1% between documents are findings.
- Description differences that are even slightly different in wording are findings (medium severity).
- Carton/package count differences of even 1 unit are critical findings.
- Country of origin mismatches between any two documents are critical findings.
- Be specific about the actual values found in each document.
- Always estimate financial impact where possible.` },
          { role: "user", content: `Compare the following extracted data sets from a ${shipmentMode || ''} customs shipment of ${commodityType || 'goods'} from ${countryOfOrigin || 'unknown origin'}.

DOCUMENTS:
${docSummaries}

REQUIRED CROSS-CHECKS (perform ALL of these):
${pairDescriptions}

Identify ALL discrepancies, mismatches, or missing information. Be thorough — check every field listed above. Return ONLY a JSON array (no markdown, no explanation):
[{
  "severity": "critical" | "high" | "medium" | "low",
  "document_a": "document type name",
  "document_b": "document type name",
  "field_checked": "specific field name",
  "value_in_a": "actual value from document A or null if missing",
  "value_in_b": "actual value from document B or null if missing",
  "finding": "precise description of the discrepancy including both values",
  "recommendation": "specific action to resolve",
  "estimated_financial_impact_usd": number or 0
}]

If no discrepancies found, return an empty array [].` },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", discrepancies: [] }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted", discrepancies: [] }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const messageContent = aiResponse.choices?.[0]?.message?.content;
    if (!messageContent) throw new Error("AI returned empty response");

    let discrepancies: any[];
    try {
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent;
      discrepancies = JSON.parse(jsonStr.trim());
      if (!Array.isArray(discrepancies)) discrepancies = [];
    } catch {
      console.error("Failed to parse crossref response:", messageContent.substring(0, 300));
      discrepancies = [];
    }

    return new Response(JSON.stringify({
      discrepancies,
      pairs_checked: applicablePairs.length,
      documents_analyzed: documents.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("workspace-crossref error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      discrepancies: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
