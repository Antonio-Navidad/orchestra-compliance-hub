/**
 * LAYER 3 — VERSIONED RULE ENGINE
 * 
 * Deterministic, auditable validation rules.
 * Same input + same rules version = same output. Always.
 * 
 * No LLM reasoning here. Pure logic.
 */

export const RULES_VERSION = "1.0.0";
export const RULES_ENGINE_ID = "docval-rules-v1";

// ── Issue categories ──────────────────────────────────────────────────

export type IssueCategory =
  | "packet_requirement"      // Missing uploaded document
  | "external_filing"         // ISF, AMS, bonds, etc.
  | "later_stage_document"    // Arrival notice, delivery order, etc.
  | "regulatory_advisory"     // Country/product advisories
  | "recommended_optional";   // Nice to have

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface RuleIssue {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: IssueSeverity;
  documentType: string;
  description: string;
  suggestion: string;
  evidenceFields: string[];
  evidenceDocTypes: string[];
  triggeredBecause: string;
}

// ── Rule context ──────────────────────────────────────────────────────

export interface RuleContext {
  originCountry: string;
  destinationCountry: string;
  transportMode: string;
  hsCode: string;
  declaredValue: string;
  workflowStage: string; // "pre_shipment" | "in_transit" | "post_arrival"
  uploadedDocTypes: Set<string>;
  extractedFieldNames: Set<string>;
  templateId?: string;
}

// ── Deterministic rule result ─────────────────────────────────────────

export interface RuleEngineResult {
  rulesVersion: string;
  engineId: string;
  timestamp: string;
  workflowStage: string;

  // Deterministic scores (computed from rules, not AI)
  completenessScore: number;
  consistencyScore: number;

  // Categorized issues
  issues: RuleIssue[];

  // Separated by category for easy UI consumption
  packetRequirements: RuleIssue[];
  externalFilings: RuleIssue[];
  laterStageDocuments: RuleIssue[];
  regulatoryAdvisories: RuleIssue[];
  recommendedOptional: RuleIssue[];

  // Packet integrity (from cross-doc matching — passed through)
  packetIntegrity: "clean" | "warnings" | "conflicts" | "incomplete";
  complianceReadiness: "ready" | "action_required" | "not_ready" | "pending";
  packetLabel: string;
  complianceLabel: string;
  complianceDetail?: string;
}

// ── Required document rules by mode/route ─────────────────────────────

interface DocRequirement {
  ruleId: string;
  docType: string;
  category: IssueCategory;
  severity: IssueSeverity;
  reason: string;
  suggestion: string;
  conditions: (ctx: RuleContext) => boolean;
}

const DOC_REQUIREMENTS: DocRequirement[] = [
  // ═══ PACKET REQUIREMENTS (always required for the mode) ═══
  {
    ruleId: "PKT-001",
    docType: "commercial_invoice",
    category: "packet_requirement",
    severity: "critical",
    reason: "Commercial invoice is required for all international shipments",
    suggestion: "Upload the commercial invoice",
    conditions: () => true,
  },
  {
    ruleId: "PKT-002",
    docType: "packing_list",
    category: "packet_requirement",
    severity: "high",
    reason: "Packing list is required for customs clearance",
    suggestion: "Upload the packing list",
    conditions: () => true,
  },
  {
    ruleId: "PKT-003",
    docType: "bill_of_lading",
    category: "packet_requirement",
    severity: "critical",
    reason: "Bill of lading is required for ocean freight",
    suggestion: "Upload the bill of lading",
    conditions: (ctx) => ctx.transportMode === "sea",
  },
  {
    ruleId: "PKT-004",
    docType: "air_waybill",
    category: "packet_requirement",
    severity: "critical",
    reason: "Air waybill is required for air freight",
    suggestion: "Upload the air waybill",
    conditions: (ctx) => ctx.transportMode === "air",
  },
  {
    ruleId: "PKT-005",
    docType: "certificate_of_origin",
    category: "packet_requirement",
    severity: "high",
    reason: "Certificate of origin is required for preferential tariff treatment and many import regulations",
    suggestion: "Upload the certificate of origin",
    conditions: () => true,
  },

  // ═══ EXTERNAL FILING REQUIREMENTS ═══
  {
    ruleId: "EXT-001",
    docType: "isf_filing",
    category: "external_filing",
    severity: "high",
    reason: "ISF 10+2 filing is required by CBP for US-bound ocean freight before vessel departure",
    suggestion: "Ensure ISF has been filed with customs broker",
    conditions: (ctx) =>
      ctx.transportMode === "sea" &&
      isUSDestination(ctx.destinationCountry),
  },
  {
    ruleId: "EXT-002",
    docType: "customs_bond",
    category: "external_filing",
    severity: "high",
    reason: "Customs bond is required for US imports exceeding $2,500",
    suggestion: "Verify continuous or single-entry bond is in place",
    conditions: (ctx) => isUSDestination(ctx.destinationCountry),
  },
  {
    ruleId: "EXT-003",
    docType: "ens_filing",
    category: "external_filing",
    severity: "high",
    reason: "Entry Summary Declaration (ENS) required for EU imports under ICS2",
    suggestion: "Ensure ENS has been submitted to EU customs",
    conditions: (ctx) =>
      isEUDestination(ctx.destinationCountry),
  },
  {
    ruleId: "EXT-004",
    docType: "ams_filing",
    category: "external_filing",
    severity: "high",
    reason: "AMS filing required for US-bound ocean freight",
    suggestion: "Confirm AMS has been filed by the carrier",
    conditions: (ctx) =>
      ctx.transportMode === "sea" &&
      isUSDestination(ctx.destinationCountry),
  },
  {
    ruleId: "EXT-005",
    docType: "dian_export_declaration",
    category: "external_filing",
    severity: "high",
    reason: "DIAN export declaration is mandatory for Colombian exports",
    suggestion: "File export declaration with DIAN",
    conditions: (ctx) => normalize(ctx.originCountry) === "colombia",
  },

  // ═══ LATER-STAGE DOCUMENTS ═══
  {
    ruleId: "LST-001",
    docType: "arrival_notice",
    category: "later_stage_document",
    severity: "info",
    reason: "Arrival notice is generated by carrier upon vessel arrival — not required at pre-shipment stage",
    suggestion: "Will be available after vessel arrival",
    conditions: (ctx) => ctx.workflowStage === "pre_shipment",
  },
  {
    ruleId: "LST-002",
    docType: "delivery_order",
    category: "later_stage_document",
    severity: "info",
    reason: "Delivery order is issued after customs clearance",
    suggestion: "Will be available after clearance",
    conditions: (ctx) => ctx.workflowStage === "pre_shipment" || ctx.workflowStage === "in_transit",
  },
  {
    ruleId: "LST-003",
    docType: "customs_release",
    category: "later_stage_document",
    severity: "info",
    reason: "Customs release is issued post-examination",
    suggestion: "Will be available after customs processing",
    conditions: (ctx) => ctx.workflowStage === "pre_shipment" || ctx.workflowStage === "in_transit",
  },
  {
    ruleId: "LST-004",
    docType: "proof_of_delivery",
    category: "later_stage_document",
    severity: "info",
    reason: "Proof of delivery is generated upon final delivery",
    suggestion: "Will be available after delivery completion",
    conditions: (ctx) => ctx.workflowStage !== "post_arrival",
  },

  // ═══ RECOMMENDED / OPTIONAL ═══
  {
    ruleId: "OPT-001",
    docType: "insurance_certificate",
    category: "recommended_optional",
    severity: "low",
    reason: "Insurance certificate is recommended for cargo protection",
    suggestion: "Consider adding cargo insurance documentation",
    conditions: () => true,
  },
  {
    ruleId: "OPT-002",
    docType: "inspection_certificate",
    category: "recommended_optional",
    severity: "low",
    reason: "Pre-shipment inspection certificate recommended for quality assurance",
    suggestion: "Consider pre-shipment inspection for high-value goods",
    conditions: () => true,
  },
  {
    ruleId: "OPT-003",
    docType: "fumigation_certificate",
    category: "recommended_optional",
    severity: "medium",
    reason: "Fumigation/ISPM-15 certificate may be required for wood packaging",
    suggestion: "Verify if wood packaging is used and obtain fumigation cert if so",
    conditions: (ctx) => ctx.transportMode === "sea",
  },
];

// ── Regulatory advisory rules ─────────────────────────────────────────

interface AdvisoryRule {
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;
  description: string;
  suggestion: string;
  conditions: (ctx: RuleContext) => boolean;
}

const ADVISORY_RULES: AdvisoryRule[] = [
  {
    ruleId: "ADV-001",
    ruleName: "Section 301 Tariffs",
    severity: "medium",
    description: "Goods from China may be subject to Section 301 tariff surcharges",
    suggestion: "Verify HS code against Section 301 lists and calculate additional duties",
    conditions: (ctx) =>
      normalize(ctx.originCountry) === "china" &&
      isUSDestination(ctx.destinationCountry),
  },
  {
    ruleId: "ADV-002",
    ruleName: "Anti-Dumping Duty Risk",
    severity: "medium",
    description: "Certain products from this origin may be subject to anti-dumping duties",
    suggestion: "Check AD/CVD orders for the specific HS code",
    conditions: (ctx) =>
      normalize(ctx.originCountry) === "china" &&
      isUSDestination(ctx.destinationCountry) &&
      !!ctx.hsCode,
  },
  {
    ruleId: "ADV-003",
    ruleName: "FDA Prior Notice",
    severity: "high",
    description: "FDA prior notice may be required for food, cosmetics, drugs, and medical device imports",
    suggestion: "Verify if product category requires FDA prior notice filing",
    conditions: (ctx) =>
      isUSDestination(ctx.destinationCountry) &&
      isFDARelevantHS(ctx.hsCode),
  },
  {
    ruleId: "ADV-004",
    ruleName: "VGM Declaration",
    severity: "medium",
    description: "Verified Gross Mass (VGM) declaration is required for all ocean containers under SOLAS",
    suggestion: "Ensure VGM has been declared and matches BOL weight",
    conditions: (ctx) => ctx.transportMode === "sea",
  },
  {
    ruleId: "ADV-005",
    ruleName: "INVIMA Registration",
    severity: "high",
    description: "INVIMA registration required for health, cosmetic, and food products entering Colombia",
    suggestion: "Verify INVIMA registration for the product category",
    conditions: (ctx) => normalize(ctx.destinationCountry) === "colombia",
  },
  {
    ruleId: "ADV-006",
    ruleName: "ICS2 Pre-Arrival Data",
    severity: "medium",
    description: "ICS2 requires advance cargo information for EU-bound shipments",
    suggestion: "Ensure carrier has submitted ICS2 data",
    conditions: (ctx) => isEUDestination(ctx.destinationCountry),
  },
  {
    ruleId: "ADV-007",
    ruleName: "Dangerous Goods Declaration",
    severity: "critical",
    description: "DG declaration required for hazardous materials shipments",
    suggestion: "Upload DG declaration and verify IATA/IMDG compliance",
    conditions: (ctx) => isDGRelevantHS(ctx.hsCode),
  },
];

// ── Helper functions ──────────────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isUSDestination(dest: string): boolean {
  const n = normalize(dest);
  return ["us", "usa", "unitedstates", "unitedstatesofamerica"].includes(n);
}

function isEUDestination(dest: string): boolean {
  const n = normalize(dest);
  const euCountries = [
    "eu", "europeanunion", "germany", "france", "italy", "spain", "netherlands",
    "belgium", "austria", "portugal", "greece", "ireland", "poland", "sweden",
    "denmark", "finland", "czechrepublic", "romania", "hungary", "slovakia",
    "croatia", "bulgaria", "lithuania", "latvia", "estonia", "slovenia",
    "luxembourg", "malta", "cyprus",
  ];
  return euCountries.includes(n);
}

function isFDARelevantHS(hs: string): boolean {
  if (!hs) return false;
  const ch = hs.substring(0, 2);
  // Chapters broadly under FDA: food (01-24), pharma (29-30), cosmetics (33), medical devices (90)
  const fdaChapters = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","29","30","33","90"];
  return fdaChapters.includes(ch);
}

function isDGRelevantHS(hs: string): boolean {
  if (!hs) return false;
  const ch = hs.substring(0, 4);
  // Batteries, explosives, chemicals
  return ["8507", "3601", "3602", "3603", "2801", "2802", "2804", "2901", "2902"].includes(ch);
}

// ── Completeness scoring (deterministic) ──────────────────────────────

function computeCompletenessScore(ctx: RuleContext, packetIssues: RuleIssue[]): number {
  // Get all packet requirements that apply
  const applicableReqs = DOC_REQUIREMENTS.filter(
    (r) => r.category === "packet_requirement" && r.conditions(ctx)
  );
  if (applicableReqs.length === 0) return 100;

  const present = applicableReqs.filter((r) => {
    const normalized = r.docType.toLowerCase();
    return ctx.uploadedDocTypes.has(normalized);
  });

  // Weight critical docs more
  let totalWeight = 0;
  let presentWeight = 0;
  for (const req of applicableReqs) {
    const w = req.severity === "critical" ? 3 : req.severity === "high" ? 2 : 1;
    totalWeight += w;
    if (present.some((p) => p.ruleId === req.ruleId)) {
      presentWeight += w;
    }
  }

  return totalWeight === 0 ? 100 : Math.round((presentWeight / totalWeight) * 100);
}

// ── Main rule engine ──────────────────────────────────────────────────

export function evaluateRules(
  ctx: RuleContext,
  trueConflictCount: number,
  lowConfFieldCount: number
): RuleEngineResult {
  const timestamp = new Date().toISOString();
  const issues: RuleIssue[] = [];

  // 1. Evaluate document requirements
  for (const req of DOC_REQUIREMENTS) {
    if (!req.conditions(ctx)) continue;

    const docNormalized = req.docType.toLowerCase();
    const isPresent = ctx.uploadedDocTypes.has(docNormalized);

    // For later-stage and recommended, only flag if NOT present (and it's informational)
    if (req.category === "later_stage_document" || req.category === "recommended_optional") {
      if (!isPresent) {
        issues.push({
          ruleId: req.ruleId,
          ruleName: `Missing: ${req.docType.replace(/_/g, " ")}`,
          category: req.category,
          severity: req.severity,
          documentType: req.docType,
          description: req.reason,
          suggestion: req.suggestion,
          evidenceFields: [],
          evidenceDocTypes: [...ctx.uploadedDocTypes],
          triggeredBecause: `Document "${req.docType}" not found in uploaded packet`,
        });
      }
      continue;
    }

    // For packet requirements and external filings
    if (!isPresent) {
      issues.push({
        ruleId: req.ruleId,
        ruleName: `Missing: ${req.docType.replace(/_/g, " ")}`,
        category: req.category,
        severity: req.severity,
        documentType: req.docType,
        description: req.reason,
        suggestion: req.suggestion,
        evidenceFields: [],
        evidenceDocTypes: [...ctx.uploadedDocTypes],
        triggeredBecause: `Document "${req.docType}" not found in uploaded packet. Mode=${ctx.transportMode}, Origin=${ctx.originCountry}, Dest=${ctx.destinationCountry}`,
      });
    }
  }

  // 2. Evaluate advisory rules
  for (const adv of ADVISORY_RULES) {
    if (!adv.conditions(ctx)) continue;
    issues.push({
      ruleId: adv.ruleId,
      ruleName: adv.ruleName,
      category: "regulatory_advisory",
      severity: adv.severity,
      documentType: "",
      description: adv.description,
      suggestion: adv.suggestion,
      evidenceFields: ctx.hsCode ? ["hs_code"] : [],
      evidenceDocTypes: [...ctx.uploadedDocTypes],
      triggeredBecause: `Rule ${adv.ruleId} triggered for route ${ctx.originCountry} → ${ctx.destinationCountry}, mode=${ctx.transportMode}${ctx.hsCode ? `, HS=${ctx.hsCode}` : ""}`,
    });
  }

  // 3. Compute deterministic scores
  const completenessScore = computeCompletenessScore(ctx, issues);

  // Consistency score: based on cross-doc conflicts (deterministic from Layer 2)
  const consistencyScore = trueConflictCount === 0 ? 100 :
    trueConflictCount <= 1 ? 85 :
    trueConflictCount <= 3 ? 65 :
    40;

  // 4. Categorize
  const packetRequirements = issues.filter((i) => i.category === "packet_requirement");
  const externalFilings = issues.filter((i) => i.category === "external_filing");
  const laterStageDocuments = issues.filter((i) => i.category === "later_stage_document");
  const regulatoryAdvisories = issues.filter((i) => i.category === "regulatory_advisory");
  const recommendedOptional = issues.filter((i) => i.category === "recommended_optional");

  // 5. Compute dual disposition (deterministic)
  let packetIntegrity: RuleEngineResult["packetIntegrity"] = "clean";
  let packetLabel = "All Packet Documents Present — No Conflicts";

  if (trueConflictCount > 0) {
    packetIntegrity = "conflicts";
    packetLabel = `${trueConflictCount} Material Conflict${trueConflictCount > 1 ? "s" : ""} Detected`;
  } else if (packetRequirements.filter((i) => i.severity === "critical").length > 0) {
    packetIntegrity = "incomplete";
    packetLabel = `${packetRequirements.filter((i) => i.severity === "critical").length} Critical Document(s) Missing`;
  } else if (packetRequirements.length > 0) {
    packetIntegrity = "incomplete";
    packetLabel = `${packetRequirements.length} Required Document(s) Missing`;
  } else if (lowConfFieldCount > 3) {
    packetIntegrity = "warnings";
    packetLabel = "Low-Confidence Extractions Present";
  }

  let complianceReadiness: RuleEngineResult["complianceReadiness"] = "ready";
  let complianceLabel = "All Filing Requirements Met";
  let complianceDetail: string | undefined;

  const critAdvisories = regulatoryAdvisories.filter((i) => i.severity === "critical");
  if (critAdvisories.length > 0) {
    complianceReadiness = "not_ready";
    complianceLabel = "Critical Compliance Issue";
    complianceDetail = critAdvisories.map((i) => i.ruleName).join(", ");
  } else if (externalFilings.length > 0) {
    complianceReadiness = "action_required";
    complianceLabel = "Filing Action Required";
    complianceDetail = externalFilings.map((i) => i.documentType.replace(/_/g, " ")).join(", ");
  } else if (regulatoryAdvisories.length > 0) {
    complianceReadiness = "action_required";
    complianceLabel = "Advisory Items Present";
    complianceDetail = `${regulatoryAdvisories.length} advisory note${regulatoryAdvisories.length > 1 ? "s" : ""}`;
  }

  return {
    rulesVersion: RULES_VERSION,
    engineId: RULES_ENGINE_ID,
    timestamp,
    workflowStage: ctx.workflowStage,
    completenessScore,
    consistencyScore,
    issues,
    packetRequirements,
    externalFilings,
    laterStageDocuments,
    regulatoryAdvisories,
    recommendedOptional,
    packetIntegrity,
    complianceReadiness,
    packetLabel,
    complianceLabel,
    complianceDetail,
  };
}

// ── Packet hash (for idempotency) ─────────────────────────────────────

export async function computePacketHash(files: File[]): Promise<string> {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    parts.push(hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""));
  }

  // Hash of all file hashes combined
  const combined = encoder.encode(parts.join("|"));
  const finalHash = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(finalHash)).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}
