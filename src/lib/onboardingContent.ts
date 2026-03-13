import {
  Activity, Package, Map, Radio, FileText, Search, Zap, Eye, Scale,
  ShoppingCart, Users, BarChart3, ClipboardList, BookOpen, Fingerprint,
  Plus, Route, Plane, Ship, Truck, Layers, Shield, CreditCard,
} from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: any;
  highlight?: string; // CSS selector or area name
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Orchestra",
    description: "Your command center for cross-border logistics.",
    detail: "Orchestra gives you end-to-end visibility over shipments, compliance, routes, and hand-offs — all in one platform. This quick tour will show you what each area does.",
    icon: Activity,
  },
  {
    id: "dashboard",
    title: "Dashboard / Control Tower",
    description: "See everything at a glance.",
    detail: "Your main overview shows active shipments, risk alerts, compliance status, and KPIs. Color-coded indicators let you scan urgency instantly: Red = critical, Yellow = needs attention, Green = on track.",
    icon: Activity,
  },
  {
    id: "risk-colors",
    title: "Risk Color System",
    description: "Red / Yellow / Green — the andon system.",
    detail: "Throughout Orchestra, risk is color-coded: 🔴 Critical or blocked items pulse red. 🟡 Items needing review show yellow/orange. 🟢 Cleared and healthy items glow green. This lets you triage in under 3 seconds.",
    icon: Shield,
  },
  {
    id: "modes",
    title: "Transport Mode Filtering",
    description: "Filter by Air, Sea, Land, or Combined.",
    detail: "Use the mode tabs on dashboards and tables to instantly filter shipments by transport type. Orchestra supports multimodal routes — combine sea + land + air in a single workflow.",
    icon: Layers,
  },
  {
    id: "new-shipment",
    title: "New Shipment",
    description: "Create and track shipments from origin to destination.",
    detail: "Enter shipment details, assign HS codes, attach documents, and set routes. Each shipment gets a risk score, ETA prediction, and compliance assessment automatically.",
    icon: Plus,
  },
  {
    id: "creator-mode",
    title: "Creator Mode / Route Builder",
    description: "Design multimodal routes visually.",
    detail: "Build routes across Air, Sea, and Land segments. Add checkpoints, estimate costs, and compare scenarios. The visual builder shows each leg on a map with mode-specific icons.",
    icon: Eye,
  },
  {
    id: "watch-mode",
    title: "Watch Mode / Watchtower",
    description: "Monitor live shipments in real-time.",
    detail: "Track active shipments on a live map, get alerts on delays, customs holds, and exceptions. Filter by mode, route, or risk level to focus on what matters.",
    icon: Radio,
  },
  {
    id: "compliance",
    title: "Compliance & Document Validation",
    description: "Ensure customs readiness before filing.",
    detail: "Upload and validate trade documents, check HS code accuracy, screen for sanctions, and assess filing readiness. The system flags missing documents and cross-references regulatory requirements.",
    icon: FileText,
  },
  {
    id: "decision-twin",
    title: "Decision Twin",
    description: "Run scenario analysis before committing.",
    detail: "Compare route options, cost projections, and risk forecasts side-by-side. The Decision Twin evaluates clearance probability, delay risk, and landed cost for each scenario.",
    icon: Zap,
  },
  {
    id: "handoff",
    title: "Chain of Custody / Hand-offs",
    description: "Verify every transfer with proof.",
    detail: "Create checkpoints along the route, record hand-offs between parties, capture photo verification, and log quantity/condition. Every transfer is timestamped and auditable.",
    icon: Package,
  },
  {
    id: "classify",
    title: "Product Classification",
    description: "Get accurate HS codes with AI assistance.",
    detail: "Describe your product and get HS code suggestions with confidence scores. Classification affects duty rates, compliance requirements, and trade agreement eligibility.",
    icon: Search,
  },
  {
    id: "analytics",
    title: "Analytics & ROI",
    description: "Measure performance and identify savings.",
    detail: "Track clearance times, broker performance, compliance rates, and cost trends. Identify bottlenecks and optimize your logistics operations with data.",
    icon: BarChart3,
  },
  {
    id: "export",
    title: "Excel Export",
    description: "Export any data view to structured spreadsheets.",
    detail: "Every major module supports Excel export. Columns include record IDs, timestamps, statuses, risk scores, and all relevant fields — clean, operations-friendly data.",
    icon: Scale,
  },
  {
    id: "done",
    title: "You're Ready!",
    description: "Start your first workflow or explore more.",
    detail: "You can replay this tour anytime from the Help Center in the sidebar. Each module also has contextual help. Click 'Get Started' to begin, or visit the Guide for deeper walkthroughs.",
    icon: Activity,
  },
];

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  whoItsFor: string;
  actions: string[];
  useCases: string[];
  dataProduced: string;
  nextSteps: string[];
  icon: any;
  url: string;
}

export const MODULE_INFO: ModuleInfo[] = [
  {
    id: "dashboard", name: "Dashboard / Control Tower", icon: Activity, url: "/",
    description: "Central overview of all shipments, risk alerts, and compliance KPIs.",
    whoItsFor: "All users — operators, managers, compliance officers.",
    actions: ["View shipment status", "Filter by mode", "Scan risk indicators", "Jump to issues"],
    useCases: ["Morning status check", "Identify critical shipments", "Monitor team throughput"],
    dataProduced: "KPI summaries, risk counts, status distributions",
    nextSteps: ["Shipment detail", "Review Queue", "Watch Mode"],
  },
  {
    id: "intake", name: "New Shipment / Intake", icon: Plus, url: "/intake",
    description: "Create new shipments with all required details for tracking and compliance.",
    whoItsFor: "Operators, freight coordinators, sellers.",
    actions: ["Enter shipment details", "Assign HS codes", "Set origin/destination", "Attach documents"],
    useCases: ["Book a new import", "Start export process", "Create marketplace order shipment"],
    dataProduced: "Shipment records with risk scores and compliance flags",
    nextSteps: ["Dashboard", "Document Validation", "Route Builder"],
  },
  {
    id: "creator-mode", name: "Creator Mode / Route Builder", icon: Eye, url: "/creator-mode",
    description: "Visually design multimodal logistics routes across Air, Sea, and Land.",
    whoItsFor: "Route planners, logistics strategists, 3PL providers.",
    actions: ["Build routes visually", "Add checkpoints", "Compare route options", "Estimate costs/ETA"],
    useCases: ["Medellín → Miami via land + sea", "Multi-leg Asia → US route", "Compare direct vs transship"],
    dataProduced: "Route definitions, cost estimates, checkpoint plans",
    nextSteps: ["Decision Twin", "Watch Mode", "Hand-off Chain"],
  },
  {
    id: "watch-mode", name: "Watch Mode / Watchtower", icon: Radio, url: "/watch-mode",
    description: "Real-time monitoring of active shipments on a live map with alerts.",
    whoItsFor: "Control tower operators, freight managers, enterprise teams.",
    actions: ["Track live positions", "View delay alerts", "Filter by mode/risk", "Drill into shipment detail"],
    useCases: ["Monitor fleet of 50+ active shipments", "Spot delayed vessels", "Escalate customs holds"],
    dataProduced: "Live status feeds, alert history, position logs",
    nextSteps: ["Shipment Detail", "Escalation Panel", "Analytics"],
  },
  {
    id: "validate-docs", name: "Document Validation", icon: FileText, url: "/validate-docs",
    description: "Upload and validate trade documents against regulatory requirements.",
    whoItsFor: "Compliance officers, customs brokers, document teams.",
    actions: ["Upload documents", "Run validation checks", "Fix flagged issues", "Assess filing readiness"],
    useCases: ["Pre-file document audit", "Check commercial invoice accuracy", "Validate certificate of origin"],
    dataProduced: "Validation results, completeness scores, issue lists",
    nextSteps: ["Review Queue", "Compliance checks", "Broker submission"],
  },
  {
    id: "decision-twin", name: "Decision Twin", icon: Zap, url: "/decision-twin",
    description: "Compare logistics scenarios with AI-powered risk and cost analysis.",
    whoItsFor: "Strategic planners, operations managers, cost optimizers.",
    actions: ["Run scenario analysis", "Compare routes side-by-side", "Evaluate risk factors", "Select optimal path"],
    useCases: ["Direct vs transship comparison", "Risk vs cost trade-off analysis", "Pre-commitment planning"],
    dataProduced: "Scenario scores, clearance probabilities, cost projections",
    nextSteps: ["Route Builder", "Shipment Intake", "Analytics"],
  },
  {
    id: "classify", name: "Product Classification", icon: Search, url: "/classify",
    description: "AI-assisted HS code classification for accurate tariff determination.",
    whoItsFor: "Trade compliance teams, customs brokers, importers/exporters.",
    actions: ["Describe products", "Get HS code suggestions", "Review confidence scores", "Apply to shipments"],
    useCases: ["Classify new product line", "Verify existing HS codes", "Check trade agreement eligibility"],
    dataProduced: "HS code recommendations, confidence levels, duty rate estimates",
    nextSteps: ["Document Validation", "Shipment Intake", "Legal Knowledge"],
  },
  {
    id: "review", name: "Review Queue", icon: ClipboardList, url: "/review",
    description: "Prioritized list of shipments requiring attention or action.",
    whoItsFor: "Compliance managers, operations leads, quality teams.",
    actions: ["Review flagged items", "Approve/reject submissions", "Assign to team members", "Clear hold items"],
    useCases: ["Daily compliance review", "Process customs hold queue", "Approve document packets"],
    dataProduced: "Review decisions, approval records, resolution timestamps",
    nextSteps: ["Shipment Detail", "Audit Trail", "Team Chat"],
  },
  {
    id: "analytics", name: "Analytics / ROI", icon: BarChart3, url: "/analytics",
    description: "Performance metrics, trend analysis, and operational ROI tracking.",
    whoItsFor: "Enterprise leaders, operations managers, finance teams.",
    actions: ["View KPI trends", "Track broker performance", "Analyze clearance times", "Measure cost savings"],
    useCases: ["Monthly ops review", "Broker scorecard analysis", "Identify process bottlenecks"],
    dataProduced: "Trend charts, performance scores, ROI calculations",
    nextSteps: ["Broker Scorecard", "Admin Settings", "Export Reports"],
  },
  {
    id: "seller-mode", name: "Seller / Marketplace Mode", icon: ShoppingCart, url: "/seller-mode",
    description: "Order-driven logistics workflows for e-commerce sellers.",
    whoItsFor: "Amazon/MercadoLibre/Shopify sellers, DTC brands, marketplace operators.",
    actions: ["Create orders", "Track fulfillment", "Manage hand-offs", "Monitor delivery status"],
    useCases: ["Process marketplace order", "Coordinate cross-border fulfillment", "Track last-mile delivery"],
    dataProduced: "Order records, fulfillment statuses, delivery confirmations",
    nextSteps: ["Dashboard", "Hand-off Chain", "Analytics"],
  },
  {
    id: "audit-trail", name: "Audit Trail", icon: Scale, url: "/audit-trail",
    description: "Complete history of all actions, decisions, and changes across the platform.",
    whoItsFor: "Compliance auditors, legal teams, quality assurance.",
    actions: ["Search audit records", "Filter by module/user", "Export audit history", "Review decision logs"],
    useCases: ["Regulatory audit preparation", "Investigate compliance incident", "Review override decisions"],
    dataProduced: "Timestamped audit entries, change logs, approval records",
    nextSteps: ["Compliance tools", "Admin Settings", "Export"],
  },
  {
    id: "teams", name: "Enterprise / Teams", icon: Users, url: "/teams",
    description: "Multi-user workspace management, roles, and team collaboration.",
    whoItsFor: "Enterprise admins, team leads, workspace owners.",
    actions: ["Manage team members", "Assign roles", "Configure workspaces", "Set permissions"],
    useCases: ["Onboard new team member", "Set up regional workspace", "Configure broker access"],
    dataProduced: "Team rosters, role assignments, workspace configurations",
    nextSteps: ["Admin Settings", "Analytics", "Team Chat"],
  },
  {
    id: "legal", name: "Legal Knowledge Base", icon: BookOpen, url: "/legal",
    description: "Regulatory reference library with trade rules, tariffs, and compliance guidance.",
    whoItsFor: "Compliance officers, legal teams, trade advisors.",
    actions: ["Search regulations", "Filter by jurisdiction", "Review HS code rules", "Check effective dates"],
    useCases: ["Research new tariff rule", "Verify Colombia DIAN requirements", "Check sanctions list updates"],
    dataProduced: "Regulatory references, compliance guidance, rule summaries",
    nextSteps: ["Document Validation", "Product Classification", "DIAN Compliance"],
  },
];

export interface WorkflowExample {
  id: string;
  title: string;
  summary: string;
  steps: { module: string; action: string }[];
  outcome: string;
}

export const WORKFLOW_EXAMPLES: WorkflowExample[] = [
  {
    id: "multimodal-route",
    title: "Create a Multimodal Route: Medellín → Miami",
    summary: "Design a land + sea route from Colombia to the US with compliance checks.",
    steps: [
      { module: "Creator Mode", action: "Open Creator Mode and start a new route" },
      { module: "Creator Mode", action: "Add land leg: Medellín → Cartagena port" },
      { module: "Creator Mode", action: "Add sea leg: Cartagena → Miami port" },
      { module: "Decision Twin", action: "Run scenario analysis to compare direct vs transship" },
      { module: "Document Validation", action: "Upload and validate export documents" },
      { module: "Watch Mode", action: "Add route to watchlist for live monitoring" },
    ],
    outcome: "Complete route plan with cost estimate, ETA, and compliance status.",
  },
  {
    id: "compliance-review",
    title: "Run a Compliance Review on an Inbound Shipment",
    summary: "Validate all documents and check regulatory readiness before customs filing.",
    steps: [
      { module: "Review Queue", action: "Select shipment from review queue" },
      { module: "Document Validation", action: "Upload commercial invoice, packing list, CoO" },
      { module: "Product Classification", action: "Verify HS code classification" },
      { module: "Document Validation", action: "Run automated validation checks" },
      { module: "Review Queue", action: "Approve or flag for corrections" },
    ],
    outcome: "Filing-ready document packet with completeness score and risk assessment.",
  },
  {
    id: "watch-monitor",
    title: "Monitor Active Shipments in Watch Mode",
    summary: "Set up live tracking for multiple shipments across transport modes.",
    steps: [
      { module: "Watch Mode", action: "Open Watchtower view" },
      { module: "Watch Mode", action: "Filter by sea shipments" },
      { module: "Watch Mode", action: "Review delay alerts and risk flags" },
      { module: "Shipment Detail", action: "Drill into critical shipment for details" },
      { module: "Team Chat", action: "Escalate issue to operations team" },
    ],
    outcome: "Real-time visibility into fleet status with proactive escalation.",
  },
  {
    id: "handoff-verify",
    title: "Create Hand-off Checkpoints with Photo Verification",
    summary: "Track custody transfers along the supply chain with proof.",
    steps: [
      { module: "Creator Mode", action: "Add checkpoints to existing route" },
      { module: "Hand-off Chain", action: "Record sender/receiver for each checkpoint" },
      { module: "Hand-off Chain", action: "Capture photo verification at transfer point" },
      { module: "Hand-off Chain", action: "Confirm quantity and condition" },
      { module: "Audit Trail", action: "Review complete custody chain" },
    ],
    outcome: "Auditable chain of custody with timestamps, photos, and condition records.",
  },
  {
    id: "decision-compare",
    title: "Use Decision Twin to Compare Route Scenarios",
    summary: "Evaluate multiple routing options before committing to one.",
    steps: [
      { module: "Decision Twin", action: "Create new evaluation for shipment" },
      { module: "Decision Twin", action: "Generate 2-3 route scenarios" },
      { module: "Decision Twin", action: "Compare risk scores, costs, and ETAs" },
      { module: "Decision Twin", action: "Select and approve optimal scenario" },
      { module: "Route Builder", action: "Apply selected route to shipment" },
    ],
    outcome: "Data-driven route selection with documented rationale.",
  },
  {
    id: "export-data",
    title: "Export Shipment Data and Compliance Records",
    summary: "Generate structured Excel exports for reporting or audit purposes.",
    steps: [
      { module: "Dashboard", action: "Navigate to the relevant data view" },
      { module: "Any Module", action: "Click the 'Export to Excel' button" },
      { module: "Export", action: "Download structured spreadsheet with timestamps" },
      { module: "Export", action: "Open in Excel for filtering and analysis" },
    ],
    outcome: "Clean, column-based spreadsheet with all relevant data fields.",
  },
];

export interface RolePath {
  id: string;
  role: string;
  icon: any;
  description: string;
  startAt: string;
  keyTabs: string[];
  typicalWorkflows: string[];
}

export const ROLE_PATHS: RolePath[] = [
  {
    id: "seller", role: "Marketplace / E-commerce Seller", icon: ShoppingCart,
    description: "You sell on Amazon, MercadoLibre, or Shopify and need to manage cross-border fulfillment.",
    startAt: "Seller Mode → Dashboard",
    keyTabs: ["Seller Mode", "Dashboard", "Hand-off Chain", "Route Builder"],
    typicalWorkflows: ["Create orders", "Track fulfillment", "Monitor hand-offs", "Export order data"],
  },
  {
    id: "compliance", role: "Compliance Manager", icon: FileText,
    description: "You ensure trade compliance, validate documents, and manage regulatory requirements.",
    startAt: "Dashboard → Review Queue",
    keyTabs: ["Review Queue", "Document Validation", "Product Classification", "Legal Knowledge", "Audit Trail"],
    typicalWorkflows: ["Daily compliance review", "Document validation", "HS code verification", "Audit preparation"],
  },
  {
    id: "planner", role: "Route Planner / Creator", icon: Route,
    description: "You design logistics routes, compare scenarios, and optimize supply chains.",
    startAt: "Creator Mode → Route Builder",
    keyTabs: ["Creator Mode", "Route Builder", "Decision Twin", "Watch Mode"],
    typicalWorkflows: ["Design multimodal routes", "Compare scenarios", "Estimate costs/ETAs", "Monitor active routes"],
  },
  {
    id: "operator", role: "Freight Operator / 3PL", icon: Truck,
    description: "You manage day-to-day shipment operations, tracking, and exception handling.",
    startAt: "Dashboard → Watch Mode",
    keyTabs: ["Dashboard", "Watch Mode", "Review Queue", "Hand-off Chain", "Team Chat"],
    typicalWorkflows: ["Monitor active shipments", "Handle exceptions", "Coordinate hand-offs", "Escalate issues"],
  },
  {
    id: "enterprise", role: "Enterprise / Team Lead", icon: Users,
    description: "You oversee team operations, analytics, and strategic logistics decisions.",
    startAt: "Dashboard → Teams",
    keyTabs: ["Dashboard", "Teams", "Analytics", "Broker Scorecard", "Admin Settings"],
    typicalWorkflows: ["Review team KPIs", "Manage broker performance", "Configure workspaces", "Generate reports"],
  },
  {
    id: "control-tower", role: "Control Tower / Monitoring", icon: Radio,
    description: "You monitor all active logistics in real-time and respond to alerts.",
    startAt: "Watch Mode → Dashboard",
    keyTabs: ["Watch Mode", "Dashboard", "Review Queue", "Analytics"],
    typicalWorkflows: ["Live fleet monitoring", "Alert triage", "Exception escalation", "Performance tracking"],
  },
];
