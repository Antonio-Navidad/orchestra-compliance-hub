import {
  Activity, Package, FileText, BarChart3, Users, Plus,
  ClipboardList, Settings, Scale, BookOpen, Map,
  Search, Eye, ShoppingCart, Radio, Zap, ShieldCheck,
  CreditCard, Lightbulb, Truck, Plane, Ship,
  AlertTriangle, Bell, GitBranch, Box, Route, Layers,
  HelpCircle, FileSearch, KanbanSquare,
} from "lucide-react";
import type { WorkspacePurpose } from "@/hooks/useWorkspacePurpose";

export interface NavItem {
  titleKey: string; // i18n translation key
  url: string;
  icon: any;
}

export interface NavGroup {
  labelKey: string; // i18n translation key
  items: NavItem[];
}

const MARKETPLACE_NAV: NavGroup[] = [
  {
    labelKey: "navGroup.quickActions",
    items: [
      { titleKey: "nav.shipments", url: "/intake", icon: Package },
      { titleKey: "nav.newRoute", url: "/creator-mode", icon: Route },
    ],
  },
  {
    labelKey: "navGroup.ordersShipments",
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: Activity },
      { titleKey: "nav.commandCenter", url: "/command-center", icon: KanbanSquare },
      { titleKey: "nav.shipmentTracker", url: "/review", icon: Package },
      { titleKey: "nav.sellerMode", url: "/seller-mode", icon: ShoppingCart },
    ],
  },
  {
    labelKey: "navGroup.logistics",
    items: [
      { titleKey: "nav.routeBuilder", url: "/route-builder", icon: Map },
      { titleKey: "nav.handoffChain", url: "/watch-mode", icon: Radio },
      { titleKey: "nav.classifyProduct", url: "/classify", icon: Search },
      { titleKey: "nav.docIntel", url: "/doc-intel", icon: FileSearch },
    ],
  },
  {
    labelKey: "navGroup.insights",
    items: [
      { titleKey: "nav.analytics", url: "/analytics", icon: BarChart3 },
      { titleKey: "nav.pricing", url: "/pricing", icon: CreditCard },
      { titleKey: "nav.guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const COMPLIANCE_NAV: NavGroup[] = [
  {
    labelKey: "navGroup.quickActions",
    items: [
      { titleKey: "nav.newReview", url: "/validate-docs", icon: Plus },
      { titleKey: "nav.newShipment", url: "/intake", icon: Package },
    ],
  },
  {
    labelKey: "navGroup.compliance",
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: Activity },
      { titleKey: "nav.commandCenter", url: "/command-center", icon: KanbanSquare },
      { titleKey: "nav.docIntel", url: "/doc-intel", icon: FileSearch },
      { titleKey: "nav.complianceEngine", url: "/compliance-engine", icon: ShieldCheck },
      { titleKey: "nav.classifyProduct", url: "/classify", icon: Search },
    ],
  },
  {
    labelKey: "navGroup.riskReview",
    items: [
      { titleKey: "nav.reviewQueue", url: "/review", icon: ClipboardList },
      { titleKey: "nav.decisionTwin", url: "/decision-twin", icon: Zap },
      { titleKey: "nav.legalKnowledge", url: "/legal", icon: BookOpen },
      { titleKey: "nav.auditTrail", url: "/audit-trail", icon: Scale },
    ],
  },
  {
    labelKey: "navGroup.settings",
    items: [
      { titleKey: "nav.jurisdictions", url: "/jurisdiction-settings", icon: ShieldCheck },
      { titleKey: "nav.admin", url: "/admin", icon: Settings },
      { titleKey: "nav.guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const ROUTE_PLANNING_NAV: NavGroup[] = [
  {
    labelKey: "navGroup.quickActions",
    items: [
      { titleKey: "nav.newRoute", url: "/creator-mode", icon: Plus },
      { titleKey: "nav.newShipment", url: "/intake", icon: Package },
    ],
  },
  {
    labelKey: "navGroup.planning",
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: Activity },
      { titleKey: "nav.commandCenter", url: "/command-center", icon: KanbanSquare },
      { titleKey: "nav.creatorMode", url: "/creator-mode", icon: Eye },
      { titleKey: "nav.routeBuilder", url: "/route-builder", icon: Map },
      { titleKey: "nav.decisionTwin", url: "/decision-twin", icon: Zap },
    ],
  },
  {
    labelKey: "navGroup.intelligence",
    items: [
      { titleKey: "nav.watchMode", url: "/watch-mode", icon: Radio },
      { titleKey: "nav.classifyProduct", url: "/classify", icon: Search },
      { titleKey: "nav.docIntel", url: "/doc-intel", icon: FileSearch },
      { titleKey: "nav.legalKnowledge", url: "/legal", icon: BookOpen },
    ],
  },
  {
    labelKey: "navGroup.insights",
    items: [
      { titleKey: "nav.analytics", url: "/analytics", icon: BarChart3 },
      { titleKey: "nav.brokerScorecard", url: "/brokers", icon: Users },
      { titleKey: "nav.guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const OPERATIONS_NAV: NavGroup[] = [
  {
    labelKey: "navGroup.quickActions",
    items: [
      { titleKey: "nav.newShipment", url: "/intake", icon: Plus },
      { titleKey: "nav.newWatchlist", url: "/watch-mode", icon: Radio },
    ],
  },
  {
    labelKey: "navGroup.controlTower",
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: Activity },
      { titleKey: "nav.commandCenter", url: "/command-center", icon: KanbanSquare },
      { titleKey: "nav.watchMode", url: "/watch-mode", icon: Radio },
      { titleKey: "nav.reviewQueue", url: "/review", icon: ClipboardList },
    ],
  },
  {
    labelKey: "navGroup.shipments",
    items: [
      { titleKey: "nav.routeBuilder", url: "/route-builder", icon: Map },
      { titleKey: "nav.decisionTwin", url: "/decision-twin", icon: Zap },
      { titleKey: "nav.creatorMode", url: "/creator-mode", icon: Eye },
    ],
  },
  {
    labelKey: "navGroup.compliance",
    items: [
      { titleKey: "nav.docIntel", url: "/doc-intel", icon: FileSearch },
      { titleKey: "nav.complianceEngine", url: "/compliance-engine", icon: ShieldCheck },
      { titleKey: "nav.auditTrail", url: "/audit-trail", icon: Scale },
    ],
  },
  {
    labelKey: "navGroup.team",
    items: [
      { titleKey: "nav.teamChat", url: "/team-chat", icon: Users },
      { titleKey: "nav.analytics", url: "/analytics", icon: BarChart3 },
      { titleKey: "nav.admin", url: "/admin", icon: Settings },
      { titleKey: "nav.guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const ENTERPRISE_NAV: NavGroup[] = [
  {
    labelKey: "navGroup.quickActions",
    items: [
      { titleKey: "nav.newShipment", url: "/intake", icon: Plus },
      { titleKey: "nav.newRoute", url: "/creator-mode", icon: Route },
    ],
  },
  {
    labelKey: "navGroup.management",
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: Activity },
      { titleKey: "nav.commandCenter", url: "/command-center", icon: KanbanSquare },
      { titleKey: "nav.teams", url: "/teams", icon: Users },
      { titleKey: "nav.teamChat", url: "/team-chat", icon: Users },
      { titleKey: "nav.brokerScorecard", url: "/brokers", icon: Users },
    ],
  },
  {
    labelKey: "navGroup.operations",
    items: [
      { titleKey: "nav.watchMode", url: "/watch-mode", icon: Radio },
      { titleKey: "nav.reviewQueue", url: "/review", icon: ClipboardList },
      { titleKey: "nav.routeBuilder", url: "/route-builder", icon: Map },
      { titleKey: "nav.creatorMode", url: "/creator-mode", icon: Eye },
    ],
  },
  {
    labelKey: "navGroup.analyticsCompliance",
    items: [
      { titleKey: "nav.analyticsRoi", url: "/analytics", icon: BarChart3 },
      { titleKey: "nav.auditTrail", url: "/audit-trail", icon: Scale },
      { titleKey: "nav.legalKnowledge", url: "/legal", icon: BookOpen },
      { titleKey: "nav.classifyProduct", url: "/classify", icon: Search },
      { titleKey: "nav.docIntel", url: "/doc-intel", icon: FileSearch },
    ],
  },
  {
    labelKey: "navGroup.admin",
    items: [
      { titleKey: "nav.adminSettings", url: "/admin", icon: Settings },
      { titleKey: "nav.jurisdictions", url: "/jurisdiction-settings", icon: ShieldCheck },
      { titleKey: "nav.pricing", url: "/pricing", icon: CreditCard },
      { titleKey: "nav.guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

export function getNavigationForPurpose(purpose: WorkspacePurpose | null): NavGroup[] {
  switch (purpose) {
    case "marketplace": return MARKETPLACE_NAV;
    case "compliance": return COMPLIANCE_NAV;
    case "route_planning": return ROUTE_PLANNING_NAV;
    case "operations": return OPERATIONS_NAV;
    case "enterprise": return ENTERPRISE_NAV;
    default: return OPERATIONS_NAV;
  }
}
