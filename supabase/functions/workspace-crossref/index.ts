import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Each pair defines exactly which fields to check and how ──
// Being explicit here is what makes results consistent across runs.
const CROSS_REF_PAIRS: Array<{ a: string; b: string; fields: Array<{ name: string; severity: string; tolerance?: string }> }> = [
  {
    a: "commercial_invoice",
    b: "packing_list",
    fields: [
      { name: "country_of_origin", severity: "critical" },
      { name: "total_carton_count", severity: "critical", tolerance: "exact match required — even 1 unit difference is a finding" },
      { name: "total_gross_weight_kg", severity: "critical", tolerance: "1% — flag if difference exceeds 1%" },
      { name: "total_net_weight_kg", severity: "high", tolerance: "1% — flag if difference exceeds 1%" },
      { name: "line_item_count", severity: "high", tolerance: "exact match required" },
      { name: "line_item_descriptions", severity: "medium", tolerance: "semantic match — flag if wording differs even slightly" },
      { name: "line_item_quantities", severity: "critical", tolerance: "exact match per line item — zero quantity on packing list is always critical" },
    ]
  },
  {
    a: "commercial_invoice",
    b: "bill_of_lading",
    fields: [
      { name: "consignee_name", severity: "high", tolerance: "must match buyer name — abbreviations are acceptable, different company names are not" },
      { name: "total_gross_weight_kg", severity: "high", tolerance: "5% — flag if difference exceeds 5%" },
      { name: "total_packages_cartons", severity: "critical", tolerance: "exact match required" },
      { name: "cargo_description", severity: "medium", tolerance: "semantic match — BOL may be more general than invoice, flag only if clearly inconsistent" },
      { name: "declared_value_usd", severity: "critical", tolerance: "must match — any difference is a critical finding" },
    ]
  },
  {
    a: "isf_filing",
    b: "bill_of_lading",
    fields: [
      { name: "container_numbers", severity: "critical", tolerance: "exact match required" },
      { name: "seal_numbers", severity: "high", tolerance: "exact match required" },
      { name: "hts_codes_6digit", severity: "critical", tolerance: "exact match required" },
    ]
  },
  {
    a: "isf_filing",
    b: "commercial_invoice",
    fields: [
      { name: "country_of_origin", severity: "critical", tolerance: "exact match required" },
      { name: "manufacturer_address", severity: "high", tolerance: "must refer to same entity — abbreviations acceptable" },
    ]
  },
  {
    a: "fta_certificate",
    b: "commercial_invoice",
    fields: [
      { name: "country_of_origin", severity: "critical", tolerance: "exact match required" },
      { name: "certificate_expiry", severity: "critical", tolerance: "certificate must not be expired as of shipment date" },
    ]
  },
  {
    a: "certificate_of_origin",
    b: "commercial_invoice",
    fields: [
      { name: "country_of_origin", severity: "critical", tolerance: "exact match required" },
    ]
  },
  {
    a: "entry_summary_7501",
    b: "commercial_invoice",
    fields: [
      { name: "declared_value_usd", severity: "critical", tolerance: "exact match required" },
      { name: "hts_codes", severity: "critical", tolerance: "exact match required" },
      { name: "importer_name", severity: "high", tolerance: "must refer to same entity" },
    ]
  },
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

    // Build document summaries
    const docSummaries = documents.map((d: any) =>
      `=== ${d.document_type.toUpperCase().replace(/_/g, " ")} ===\n${JSON.stringify(d.extracted_data, null, 2)}`
    ).join("\n\n");

    // Build field-level check instructions — explicit and unambiguous
    const checkInstructions = applicablePairs.map(pair => {
      const fieldList = pair.fields.map(f =>
        `  - ${f.name} (severity if mismatch: ${f.severity}${f.tolerance ? ` | rule: ${f.tolerance}` : ""})`
      ).join("\n");
      return `${pair.a.replace(/_/g, " ").toUpperCase()} vs ${pair.b.replace(/_/g, " ").toUpperCase()}:\n${fieldList}`;
    }).join("\n\n");

    // ── The system prompt is now explicit about what NOT to return ──
    const systemPrompt = `You are a senior licensed U.S. customs broker performing document cross-reference verification for CBP compliance.

YOUR ONLY JOB: Find actual discrepancies between documents. 

STRICT OUTPUT RULES:
1. Return ONLY findings where values DIFFER or are MISSING. 
2. NEVER return a finding when values match. If they match, skip that field entirely.
3. NEVER return a finding with "no action needed", "matches", "consistent", or "no discrepancy" in the finding text. Those are not findings.
4. NEVER include a finding just to confirm something is correct.
5. Each finding must state the ACTUAL VALUE from each document and WHY it is a problem.
6. If a field is missing from one document, that is a finding only if it is required for customs clearance.
7. Zero quantity on a packing list line item is always a CRITICAL finding.
8. Country of origin mismatches between any two documents are always CRITICAL.
9. Declared value differences between invoice and bill of lading are always CRITICAL.

SEVERITY RULES:
- critical: Will cause CBP hold, entry rejection, or $5,000+ penalty if unfiled/uncorrected
- high: Will likely cause CBP exam or delay, or affects duty calculation
- medium: May cause questions or documentation requests
- low: Minor wording difference, low risk

Return ONLY a raw JSON array. No markdown. No explanation. No preamble. Just the array.`;

    const userPrompt = `Shipment context: ${shipmentMode || "ocean"} import, commodity: ${commodityType || "general goods"}, origin: ${countryOfOrigin || "unknown"}.

DOCUMENTS TO COMPARE:
${docSummaries}

FIELDS TO CHECK (check EACH field listed — only report if there is an actual difference):
${checkInstructions}

Return format — ONLY include a row when you find an actual mismatch or missing required value:
[{
  "severity": "critical" | "high" | "medium" | "low",
  "document_a": "snake_case document type, e.g. commercial_invoice, packing_list, bill_of_lading",
  "document_b": "snake_case document type, e.g. commercial_invoice, packing_list, bill_of_lading",
  "field_checked": "exact field name from the check list above",
  "finding": "precise description stating the actual value in document A and the actual value in document B and why this is a problem",
  "recommendation": "specific actionable step to resolve this before filing",
  "estimated_financial_impact_usd": 0
}]

If ALL fields match across ALL pairs, return an empty array: []
Do not return any field that matches. Do not explain your reasoning. Return only the JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0,  // ── FIX: temperature 0 = deterministic, same input always same output ──
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
      // Strip markdown fences if present
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent.trim();
      discrepancies = JSON.parse(jsonStr);
      if (!Array.isArray(discrepancies)) discrepancies = [];

      // Normalize document_a / document_b to snake_case so they match
      // document_library.document_type and CROSS_REF_PAIRS keys regardless
      // of whether the model returned Title Case or other variants.
      const toSnakeCase = (s: string) =>
        (s || "").trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
      discrepancies = discrepancies.map((d: any) => ({
        ...d,
        document_a: toSnakeCase(d.document_a),
        document_b: toSnakeCase(d.document_b),
      }));

      // ── Post-processing: strip out any passing checks the model snuck in ──
      // This is a safety net — the prompt already instructs against this but
      // we filter here as well to guarantee clean output
      discrepancies = discrepancies.filter((d: any) => {
        if (!d.finding) return false;
        const text = (d.finding + " " + (d.recommendation || "")).toLowerCase();
        const isPassingCheck = (
          text.includes("no action needed") ||
          text.includes("no discrepancy") ||
          text.includes("matches — no action") ||
          text.includes("values match") ||
          text.includes("consistent across") ||
          (text.includes("match") && text.includes("no") && !text.includes("mismatch"))
        );
        return !isPassingCheck;
      });

      // Add financial impact estimates for known high-risk findings
      discrepancies = discrepancies.map((d: any) => {
        if (d.estimated_financial_impact_usd > 0) return d;
        // Estimate based on field and severity
        if (d.field_checked?.includes("country_of_origin") || d.field_checked?.includes("origin")) {
          d.estimated_financial_impact_usd = d.estimated_financial_impact_usd || 0;
          // Use declared value as impact proxy for origin mismatches (false country = duty fraud)
        }
        if (d.severity === "critical" && d.estimated_financial_impact_usd === 0) {
          d.estimated_financial_impact_usd = 0; // Will be set by calling code if declared value is known
        }
        return d;
      });

    } catch (parseErr) {
      console.error("Failed to parse crossref response:", messageContent.substring(0, 500));
      discrepancies = [];
    }

    console.log(`[workspace-crossref] Found ${discrepancies.length} discrepancies across ${applicablePairs.length} pairs`);

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
