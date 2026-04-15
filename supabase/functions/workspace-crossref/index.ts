import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRulesForMode,
  getApplicableAlerts,
  buildCheckInstructions,
} from "./complianceRules.ts";
// ── Anthropic API client (direct, no gateway dependency) ─────────────────────
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getAnthropicKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return key;
}

async function callAIText(opts: { systemPrompt: string; userMessage: string; anthropicModel: string; lovableModel: string; maxTokens?: number }): Promise<string | null> {
  const { systemPrompt, userMessage, anthropicModel, maxTokens = 4096 } = opts;
  const apiKey = getAnthropicKey();

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err.substring(0, 400)}`);
  }

  const json = await res.json();
  return json?.content?.[0]?.text ?? null;
}
// ── End Anthropic client ──────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    const { documents, shipmentMode, commodityType, countryOfOrigin, declaredValueUsd, shipmentId } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      return new Response(JSON.stringify({ discrepancies: [], message: "Need at least 2 documents to cross-reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve mode-specific compliance rules ────────────────────────────────
    const modeRules = getRulesForMode(shipmentMode || "ocean");
    const docTypes = documents.map((d: any) => d.document_type as string);

    // Filter pairs down to only those where both documents are present
    const applicablePairs = modeRules.documentPairs.filter(
      p => docTypes.includes(p.documentA) && docTypes.includes(p.documentB)
    );

    if (applicablePairs.length === 0) {
      return new Response(JSON.stringify({ discrepancies: [], message: "No applicable cross-reference pairs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build document summaries ──────────────────────────────────────────────
    const docSummaries = documents.map((d: any) =>
      `=== ${d.document_type.toUpperCase().replace(/_/g, " ")} ===\n${JSON.stringify(d.extracted_data, null, 2)}`
    ).join("\n\n");

    // ── Build field-level check instructions from typed rules ─────────────────
    const checkInstructions = buildCheckInstructions(applicablePairs, docTypes);

    // ── 2025 tariff alerts applicable to this shipment ────────────────────────
    const alerts = getApplicableAlerts(countryOfOrigin, commodityType, declaredValueUsd);
    const alertsSection = alerts.length > 0
      ? `\n\n2025 TARIFF / COMPLIANCE ALERTS FOR THIS SHIPMENT:\n${alerts.map(a =>
          `[${a.severity.toUpperCase()}] ${a.message} (${a.regulation}, effective ${a.effectiveDate})`
        ).join("\n")}`
      : "";

    // ── System prompt ─────────────────────────────────────────────────────────
    const isMexicoLand = (shipmentMode || "").toLowerCase().includes("mexico") || (shipmentMode || "").toLowerCase().includes("land");
    const mexicoChecks = isMexicoLand ? `

MEXICO LAND ENTRY — MANDATORY ADDITIONAL CHECKS:

K. USMCA QUALIFICATION AUDIT: For EVERY line item on the commercial invoice, verify whether it is covered by the USMCA certification. If ANY line item's HTS code or description does NOT appear in the USMCA cert, flag as CRITICAL — that item is subject to the 25% IEEPA tariff (EO 14194, effective March 4 2025). Calculate the estimated duty exposure: uncovered item value × 25%. Flag as: "USMCA gap detected: [item description] (HTS [code]) valued at $[X] is not covered by the USMCA cert on file. Exposure: $[X × 0.25] in IEEPA tariffs."

L. USMCA CERT EXPIRY: Check the USMCA blanket period end date. If the cert is expired (blanket_period_end < today) or will expire before the crossing date, flag as CRITICAL. An expired USMCA cert = no duty preference = 25% IEEPA tariff on the entire shipment.

M. PAPS NUMBER CONSISTENCY: If PAPS number appears on multiple documents (truck BoL, PAPS document), all instances must be identical. Mismatch = ACE system rejection = truck held at border.

N. PEDIMENTO CROSS-CHECK: If a Pedimento is present, compare pedimento declared value to invoice total. Compare pedimento exporter to invoice seller. Compare pedimento HS codes (first 6 digits) to invoice HTS codes. Any discrepancy = CRITICAL — CBP cross-references pedimento with ACE entry.

O. SECTION 232 EXPOSURE: If any line item's HTS code starts with 7206–7229, 7301–7326 (steel) or 7601–7616 (aluminum), flag as HIGH — Section 232 25% tariff applies regardless of USMCA status. Calculate exposure: steel/aluminum line value × 25%.

P. AUTOMOTIVE REGIONAL VALUE CONTENT: If commodity is auto parts or vehicles (HTS Chapter 87, or descriptions including "vehicle", "auto", "motor", "transmission", "chassis", "axle", "engine"), and USMCA cert shows RVC < 75% for vehicles or < 70% for parts, flag as CRITICAL — fails USMCA automotive rules.

Q. ENTITY ADDRESS CONSISTENCY FOR MEXICO LAND: Compare shipper address on Truck BoL to seller address on invoice — both should show Mexico addresses. Compare consignee address on Truck BoL to buyer address on invoice — both should show US addresses. Mexican address on US consignee or vice versa = CRITICAL red flag.` : "";

    const systemPrompt = `You are a senior licensed U.S. customs broker specializing in US-Mexico land entry compliance. You have 20+ years of experience catching errors that cause CBP holds, IEEPA tariff exposure, and USMCA claim denials at the Mexico border.

YOUR JOB: Find every actual discrepancy, inconsistency, and compliance risk across all documents.

STRICT OUTPUT RULES:
1. Return ONLY findings where values DIFFER, are MISSING, are INCONSISTENT, or are INCORRECT.
2. NEVER return a finding when values match. If they match, skip that field entirely.
3. NEVER return a finding with "no action needed", "matches", "consistent", or "no discrepancy" in the finding text. Those are not findings.
4. NEVER include a finding just to confirm something is correct.
5. Each finding must state the ACTUAL VALUE from each document and WHY it is a problem.
6. If a field is null, not stated, zero, or absent in EITHER document, it is NOT a finding — skip it entirely. Only flag when BOTH documents contain an explicit non-null value AND those values differ.
7. Zero quantity on a packing list line item is always a CRITICAL finding.
8. Country of origin mismatches between any two documents are always CRITICAL.
9. Each field listing includes an "EXPLICIT SKIP" list — NEVER flag any field on that skip list regardless of what you observe.

MANDATORY CROSS-DOCUMENT CHECKS (perform ALL of these regardless of field list):

A. INVOICE MATH VALIDATION: Sum ALL line item totals on the commercial invoice. Compare the sum to the stated subtotal and invoice total. If the math doesn't add up (subtotal + freight + insurance ≠ total), flag as CRITICAL with exact numbers. Overvaluation or undervaluation is a 19 USC 1592 fraud indicator.

B. DECLARED VALUE CONSISTENCY: Compare the total value on the commercial invoice vs the declared cargo value on the Truck BoL / transport document. Flag any discrepancy as CRITICAL — CBP uses invoice value for duty assessment per 19 CFR 152.

C. COUNTRY OF ORIGIN ACROSS ALL DOCS: Compare COO on EVERY document (invoice, packing list, USMCA cert, Truck BoL, Pedimento). If ANY document shows a different origin, flag as CRITICAL. For Mexico land entry, all documents must show Mexico (MX) as origin.

D. HTS CODE CONSISTENCY: Compare HTS codes on invoice vs USMCA certification vs Pedimento (at 6-digit level). If they differ for the same goods, flag as CRITICAL — misclassification under 19 USC 1592 carries 4× duty shortfall penalty.

E. CUSTOMS BOND SUFFICIENCY: If a customs bond is present, compare the bond amount to the declared value. For single-entry bonds, the bond must ≥ total entered value (19 U.S.C. 1623). Flag insufficiency as CRITICAL.

F. QUANTITY RECONCILIATION: Compare total piece count across invoice, packing list, and Truck BoL. Flag any difference. Check if line-item quantities add up to stated totals.

G. WEIGHT RECONCILIATION: Compare gross weight on Truck BoL vs packing list vs invoice. Flag if >5% variance. Verify packing list internal math.

H. ENTITY NAME/ADDRESS CONSISTENCY: Compare buyer/consignee name AND address across all documents. Compare seller/shipper across all documents. Flag any discrepancy as high risk.
${mexicoChecks}
SEVERITY RULES:
- critical: Will cause CBP hold, entry rejection, IEEPA tariff exposure, or $5,000+ penalty. Includes: math errors, value discrepancies >$1000, COO conflicts, HTS mismatches, USMCA gaps, bond insufficiency, expired USMCA cert, PAPS mismatch.
- high: Will likely cause CBP exam, delay, or duty miscalculation. Includes: weight >5% variance, Section 232 exposure, entity name discrepancies, pedimento value discrepancies.
- medium: May cause CBP questions or documentation requests. Includes: quantity differences <5%, minor weight differences.
- low: Minor wording difference, low risk. Includes: name abbreviations, formatting differences.

For estimated_financial_impact_usd: calculate the actual dollar exposure where possible. For IEEPA: value × 0.25. For Section 232: value × 0.25. For 19 USC 1592 fraud: duty × 4. For ISF penalties: $5,000 per violation. Use 0 only for low/formatting findings.

Return ONLY a raw JSON array. No markdown. No explanation. No preamble. Just the array.`;

    const userPrompt = `Shipment context: ${modeRules.displayName} import, commodity: ${commodityType || "general goods"}, origin: ${countryOfOrigin || "unknown"}.${alertsSection}

ENTRY NOTES FOR THIS MODE:
${modeRules.entryNotes.map(n => `- ${n}`).join("\n")}

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

    // ── Call AI (Anthropic preferred, Lovable fallback) ────────────────────────
    const messageContent = await callAIText({
      systemPrompt,
      userMessage: userPrompt,
      anthropicModel: "claude-sonnet-4-5",
      lovableModel: "google/gemini-2.5-flash",
      maxTokens: 8192,
    });
    if (!messageContent) throw new Error("AI returned empty response");

    let discrepancies: any[];
    try {
      // Strip markdown fences if present
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        messageContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : messageContent.trim();
      discrepancies = JSON.parse(jsonStr);
      if (!Array.isArray(discrepancies)) discrepancies = [];

      // Normalize document_a / document_b to snake_case
      const toSnakeCase = (s: string) =>
        (s || "").trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
      discrepancies = discrepancies.map((d: any) => ({
        ...d,
        document_a: toSnakeCase(d.document_a),
        document_b: toSnakeCase(d.document_b),
      }));

      // Strip findings where either value is null/absent — always false positives
      discrepancies = discrepancies.filter((d: any) => {
        if (!d.finding) return false;
        const f = d.finding.toLowerCase();
        return !f.includes("not stated") && !f.includes("not present") &&
               !f.includes(" null") && !f.includes("not provided") &&
               !f.includes("not listed") && !f.includes("not found") &&
               !f.includes("not included") && !f.includes("n/a");
      });

      // Strip any passing checks the model snuck in
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

      // Strip findings on explicit skip fields defined by the rule set
      const skipIndex: Record<string, Set<string>> = {};
      for (const pair of applicablePairs) {
        const key = `${pair.documentA}__${pair.documentB}`;
        const keyRev = `${pair.documentB}__${pair.documentA}`;
        skipIndex[key] = new Set(pair.explicitSkipFields);
        skipIndex[keyRev] = new Set(pair.explicitSkipFields);
      }
      discrepancies = discrepancies.filter((d: any) => {
        const key = `${d.document_a}__${d.document_b}`;
        const skipSet = skipIndex[key];
        if (!skipSet) return true;
        const field = (d.field_checked || "").toLowerCase();
        return !skipSet.has(field);
      });

    } catch (parseErr) {
      console.error("Failed to parse crossref response:", messageContent.substring(0, 500));
      discrepancies = [];
    }

    // ── Append recent compliance rule change warnings ──────────────────────────
    // Look up compliance_rules_updates from the last 30 days that match this shipment.
    // These are returned as supplemental warnings (not crossref findings) so the broker
    // is aware of regulatory changes that may require re-filing or amendment.
    const complianceWarnings: any[] = [];
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        let rulesQuery = supabase
          .from("compliance_rules_updates")
          .select("id, source, severity, summary, action_required, effective_date, transport_modes, affected_origins")
          .gte("effective_date", since)
          .order("effective_date", { ascending: false });

        const { data: recentRules } = await rulesQuery;

        if (recentRules) {
          const mode = (shipmentMode || "ocean").toLowerCase();
          const origin = (countryOfOrigin || "").toLowerCase();

          for (const rule of recentRules) {
            const modesMatch = !rule.transport_modes?.length ||
              rule.transport_modes.some((m: string) => m.toLowerCase() === mode || m.toLowerCase() === "all");
            const originMatch = !rule.affected_origins?.length ||
              rule.affected_origins.some((o: string) => o.toLowerCase() === origin || o.toLowerCase() === "all");

            if (modesMatch && originMatch) {
              complianceWarnings.push({
                type: "regulatory_update",
                source: rule.source,
                severity: rule.severity,
                summary: rule.summary,
                action_required: rule.action_required,
                effective_date: rule.effective_date,
              });
            }
          }
        }
      }
    } catch (rulesErr) {
      // Non-fatal — log but don't fail the crossref run
      console.error("[workspace-crossref] Failed to fetch compliance rule updates:", rulesErr);
    }

    console.log(`[workspace-crossref] Found ${discrepancies.length} discrepancies across ${applicablePairs.length} pairs, ${complianceWarnings.length} regulatory warnings`);

    return new Response(JSON.stringify({
      discrepancies,
      compliance_warnings: complianceWarnings,
      pairs_checked: applicablePairs.length,
      documents_analyzed: documents.length,
      mode: modeRules.displayName,
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
