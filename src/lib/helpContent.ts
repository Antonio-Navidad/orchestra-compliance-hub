// ── Layer 1: Sidebar tooltip descriptions ──────────────────────────────
// Now uses i18n keys — the actual text is in translations.ts
export const NAV_TOOLTIP_KEYS: Record<string, string> = {
  "/": "tooltip.dashboard",
  "/doc-intel": "tooltip.docIntel",
  "/dian-compliance": "tooltip.dianCompliance",
  "/classify": "tooltip.classify",
  "/review": "tooltip.review",
  "/decision-twin": "tooltip.decisionTwin",
  "/legal": "tooltip.legal",
  "/audit-trail": "tooltip.auditTrail",
  "/intake": "tooltip.intake",
  "/creator-mode": "tooltip.creatorMode",
  "/route-builder": "tooltip.routeBuilder",
  "/watch-mode": "tooltip.watchMode",
  "/seller-mode": "tooltip.sellerMode",
  "/analytics": "tooltip.analytics",
  "/pricing": "tooltip.pricing",
  "/guide": "tooltip.guide",
  "/team-chat": "tooltip.teamChat",
  "/brokers": "tooltip.brokers",
  "/admin": "tooltip.admin",
  "/jurisdiction-settings": "tooltip.jurisdictions",
  "/teams": "tooltip.teams",
  "/validate-docs": "tooltip.validateDocs",
};

// Legacy export kept for backward compat — components should use NAV_TOOLTIP_KEYS + t()
export const NAV_TOOLTIPS: Record<string, string> = {
  "/": "Overview of all active shipments, compliance status, and pending actions",
  "/doc-intel": "Upload, extract, and compare shipping documents to catch errors before customs",
  "/dian-compliance": "Colombia-specific customs requirements, DIAN export declarations, and filing guidance",
  "/classify": "Identify the correct HS code for your product using AI-assisted classification",
  "/review": "Shipments flagged for manual review due to compliance issues or missing documents",
  "/decision-twin": "AI-generated compliance recommendations based on your shipment context",
  "/legal": "Reference library of customs regulations, trade agreements, and compliance rules",
  "/audit-trail": "Complete log of all actions, extractions, validations, and decisions for every shipment",
  "/intake": "Create a new shipment record and begin the compliance workflow",
  "/creator-mode": "Build and visualize multi-leg shipping routes with compliance checkpoints",
  "/route-builder": "Plan optimised routes considering customs, costs, and transit times",
  "/watch-mode": "Real-time monitoring of active shipments and hand-off chain status",
  "/seller-mode": "Simplified view for marketplace sellers to manage shipments and documents",
  "/analytics": "Charts and trends for shipment volume, compliance scores, and processing times",
  "/pricing": "Landed cost breakdowns including duties, taxes, and logistics fees",
  "/guide": "Interactive help center with step-by-step workflows and module explainers",
  "/team-chat": "Collaborate with your team on shipments and compliance questions",
  "/brokers": "Performance metrics and reliability scores for your customs brokers",
  "/admin": "Workspace configuration, user management, and system settings",
  "/jurisdiction-settings": "Configure country-specific compliance rules and document requirements",
  "/teams": "Manage teams, roles, and access permissions across your organization",
  "/validate-docs": "Run validation checks against a document packet for a specific lane",
};

// ── Layer 2: Tab-level context banners ──────────────────────────────────
// Now driven by i18n keys: tabBanner.{tabId}.message / tabBanner.{tabId}.action
export interface TabBanner {
  message: string;
  action: string;
}

export const TAB_BANNERS: Record<string, TabBanner> = {
  library: {
    message: "Your document vault — upload PDFs, invoices, and packing lists to auto-extract all fields.",
    action: "Start by dropping your shipment documents above.",
  },
  validator: {
    message: "Check your document packet for missing or non-compliant documents against lane requirements.",
    action: "Select your lane and upload your packet to begin.",
  },
  mismatches: {
    message: "Detect conflicting values across documents that could trigger customs holds.",
    action: "Select two extracted documents and click Compare.",
  },
  "hs-assist": {
    message: "Find the correct HS classification code for your product using plain-English description.",
    action: "Wrong HS codes are one of the top causes of customs delays.",
  },
  memory: {
    message: "Orchestra remembers your previous shipments on this lane to pre-fill future workflows and flag changes in requirements.",
    action: "",
  },
  export: {
    message: "Download structured Excel reports of extracted fields, mismatches, and audit logs for your records or broker.",
    action: "",
  },
};

// ── Layer 3: Function-level help drawer content ─────────────────────────
export interface HelpDrawerContent {
  title: string;
  body: string;
}

export const FUNCTION_HELP: Record<string, HelpDrawerContent> = {
  compare_documents: {
    title: "Compare Documents",
    body: `The comparison engine checks field values across two or more extracted documents to detect discrepancies that could trigger customs holds or duty reassessment.

**HIGH severity** — Monetary values (declared value, total invoice value) differ by more than $500, or HS codes don't match. These mismatches can result in customs holds, fines, or additional duties.

**MEDIUM severity** — Party names (consignee, shipper) differ, quantities don't reconcile, or port names don't match. These may cause processing delays.

**LOW severity** — Minor text or description variations that are unlikely to affect customs clearance but should be reviewed for accuracy.`,
  },
  readiness_score: {
    title: "Readiness / Completeness Score",
    body: `The readiness score measures how complete and compliant your document packet is for the selected trade lane.

**How it's calculated:**
• Required documents present: weighted heavily (e.g., commercial invoice, packing list, bill of lading)
• Field completeness: all mandatory fields extracted and populated
• Cross-document consistency: no HIGH severity mismatches
• Lane-specific requirements met: country-specific certificates and declarations

**Score thresholds:**
• **90–100%** — Shipment-ready. Safe to file.
• **70–89%** — Review recommended. Minor gaps may cause delays.
• **Below 70%** — Not ready. Missing documents or critical mismatches detected.`,
  },
  declared_value: {
    title: "Declared Value",
    body: `The declared value is the monetary worth of goods stated on shipping documents. Customs authorities use it to calculate import duties and taxes.

**Why consistency matters:**
• If the commercial invoice shows $47,195 but the packing list shows $43,800, customs may flag the discrepancy and hold the shipment for investigation.
• Under-declaring value is a common red flag that can trigger audits, penalties, or seizure.
• Over-declaring can result in unnecessary duty payments.

All documents in a packet should show the same declared value. Any difference greater than $1 is flagged for review.`,
  },
  severity_high: {
    title: "HIGH Severity",
    body: `A HIGH severity finding indicates a compliance risk that is very likely to cause customs issues.

**Action required:** Resolve before filing. Correct the discrepancy in the source document and re-upload, or obtain a corrective document (e.g., amended invoice).

**Common causes:** Declared value mismatch, HS code discrepancy, missing mandatory document.`,
  },
  severity_medium: {
    title: "MEDIUM Severity",
    body: `A MEDIUM severity finding indicates a potential issue that may cause processing delays.

**Action required:** Review and confirm accuracy. If the discrepancy is intentional (e.g., shortened name), add a note to the audit trail explaining why.

**Common causes:** Party name variation, port name mismatch, quantity discrepancy.`,
  },
  severity_low: {
    title: "LOW Severity",
    body: `A LOW severity finding is an informational flag for minor text differences.

**Action:** Acknowledge and proceed. These rarely affect customs clearance but should be noted for record-keeping.

**Common causes:** Description wording differences, formatting variations, abbreviated vs. full text.`,
  },
};

// ── Global Search: Help knowledge base ──────────────────────────────────
export interface HelpEntry {
  title: string;
  description: string;
  keywords: string[];
  route: string;
  tab?: string;
}

export const HELP_KNOWLEDGE_BASE: HelpEntry[] = [
  {
    title: "Document Comparison",
    description: "Compare two or more extracted documents to find value, quantity, and party name discrepancies.",
    keywords: ["compare documents", "mismatch", "cross-document", "discrepancy", "compare"],
    route: "/doc-intel",
    tab: "mismatches",
  },
  {
    title: "Customs Verification",
    description: "Validate your document packet against lane-specific customs requirements.",
    keywords: ["customs verification", "customs", "verification", "validate", "compliance check"],
    route: "/doc-intel",
    tab: "validator",
  },
  {
    title: "Missing Documents",
    description: "Check which required documents are missing from your shipment packet.",
    keywords: ["missing documents", "missing", "incomplete", "required documents"],
    route: "/doc-intel",
    tab: "validator",
  },
  {
    title: "HS Code Classification",
    description: "Use AI-assisted search to find the correct Harmonised System code for your product.",
    keywords: ["hs code", "classification", "tariff", "harmonised system", "product code"],
    route: "/doc-intel",
    tab: "hs-assist",
  },
  {
    title: "Declared Value",
    description: "Understand why consistent declared values across documents matter for customs clearance.",
    keywords: ["declared value", "invoice value", "monetary", "value mismatch", "duty"],
    route: "/doc-intel",
    tab: "mismatches",
  },
  {
    title: "Audit Log",
    description: "View the complete history of all actions, validations, and decisions for your shipments.",
    keywords: ["audit log", "audit trail", "history", "log", "actions"],
    route: "/audit-trail",
  },
  {
    title: "Export Report",
    description: "Download Excel reports of extracted fields, mismatches, and audit logs.",
    keywords: ["export report", "export", "download", "excel", "report"],
    route: "/doc-intel",
    tab: "export",
  },
  {
    title: "Route Planning",
    description: "Build and optimise multi-leg shipping routes with compliance checkpoints.",
    keywords: ["route", "planning", "route builder", "shipping route"],
    route: "/route-builder",
  },
  {
    title: "Decision Twin",
    description: "Get AI-generated compliance recommendations and risk scores for your shipment.",
    keywords: ["decision twin", "ai recommendation", "risk score", "prediction"],
    route: "/decision-twin",
  },
  {
    title: "Colombia / DIAN",
    description: "Colombia-specific export declarations, DIAN filing, and trade compliance.",
    keywords: ["dian", "colombia", "colombian customs", "dian compliance"],
    route: "/dian-compliance",
  },
  {
    title: "Legal Knowledge",
    description: "Reference library of customs regulations, trade agreements, and compliance rules.",
    keywords: ["legal", "regulation", "trade agreement", "compliance rules", "law"],
    route: "/legal",
  },
  {
    title: "Document Library",
    description: "Upload, organise, and search all your shipping documents in one place.",
    keywords: ["document library", "upload", "documents", "library"],
    route: "/doc-intel",
    tab: "library",
  },
];
