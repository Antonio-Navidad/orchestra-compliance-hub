import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Define which document pairs to cross-reference
const CROSS_REF_PAIRS: Array<{ a: string; b: string; checks: string }> = [
  { a: "commercial_invoice", b: "packing_list", checks: "declared value, total weight, carton count, line item descriptions" },
  { a: "commercial_invoice", b: "bill_of_lading", checks: "consignee name, cargo description, notify party" },
  { a: "isf_filing", b: "bill_of_lading", checks: "container numbers, seal numbers, HTS 6-digit codes" },
  { a: "isf_filing", b: "commercial_invoice", checks: "country of origin, manufacturer address" },
  { a: "fta_certificate", b: "commercial_invoice", checks: "country of origin match, certificate expiry validity" },
  { a: "entry_summary_7501", b: "commercial_invoice", checks: "declared value, HTS codes, importer name" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { documents, shipmentMode, commodityType, countryOfOrigin } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return new Response(JSON.stringify({ discrepancies: [], message: "Need at least 2 documents to cross-reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which cross-reference pairs apply
    const docTypes = documents.map((d: any) => d.document_type);
    const applicablePairs = CROSS_REF_PAIRS.filter(
      p => docTypes.includes(p.a) && docTypes.includes(p.b)
    );

    if (applicablePairs.length === 0) {
      return new Response(JSON.stringify({ discrepancies: [], message: "No applicable cross-reference pairs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with all document data
    const docSummaries = documents.map((d: any) =>
      `=== ${d.document_type.toUpperCase().replace(/_/g, ' ')} ===\n${JSON.stringify(d.extracted_data, null, 2)}`
    ).join("\n\n");

    const pairDescriptions = applicablePairs.map(
      p => `- ${p.a.replace(/_/g, ' ')} ↔ ${p.b.replace(/_/g, ' ')}: check ${p.checks}`
    ).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are a senior licensed customs broker performing document cross-reference verification. You are meticulous about identifying discrepancies that could cause CBP holds, penalties, or entry rejections. Be specific about financial impact.`,
        messages: [{
          role: "user",
          content: `Compare the following extracted data sets from a ${shipmentMode || ''} customs shipment of ${commodityType || 'goods'} from ${countryOfOrigin || 'unknown origin'}.

DOCUMENTS:
${docSummaries}

REQUIRED CROSS-CHECKS:
${pairDescriptions}

Identify any discrepancies, mismatches, or missing information. Return ONLY a JSON array (no markdown, no explanation):
[{
  "severity": "critical" | "high" | "medium" | "low",
  "document_a": "document type name",
  "document_b": "document type name",
  "field_checked": "field name",
  "finding": "what the discrepancy is",
  "recommendation": "what to do about it",
  "estimated_financial_impact_usd": number or 0
}]

If no discrepancies found, return an empty array [].`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();
    const textBlock = claudeResponse.content?.find((b: any) => b.type === "text");
    if (!textBlock?.text) throw new Error("Claude returned empty response");

    let discrepancies: any[];
    try {
      const jsonMatch = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        textBlock.text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : textBlock.text;
      discrepancies = JSON.parse(jsonStr.trim());
      if (!Array.isArray(discrepancies)) discrepancies = [];
    } catch {
      console.error("Failed to parse crossref response:", textBlock.text.substring(0, 300));
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
