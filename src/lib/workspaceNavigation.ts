import {
  Activity, Package, FileText, BarChart3, Users, Plus,
  ClipboardList, Settings, Scale, BookOpen, Map,
  Search, Eye, ShoppingCart, Radio, Zap, ShieldCheck,
  CreditCard, Lightbulb, Fingerprint, Truck, Plane, Ship,
  AlertTriangle, Bell, GitBranch, Box, Route, Layers,
  HelpCircle, FileSearch,
} from "lucide-react";
import type { WorkspacePurpose } from "@/hooks/useWorkspacePurpose";

export interface NavItem {
  title: string;
  url: string;
  icon: any;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const MARKETPLACE_NAV: NavGroup[] = [
  {
    label: "QUICK ACTIONS",
    items: [
      { title: "New Shipment", url: "/intake", icon: Plus },
      { title: "New Route", url: "/creator-mode", icon: Route },
    ],
  },
  {
    label: "ORDERS & SHIPMENTS",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Shipment Tracker", url: "/review", icon: Package },
      { title: "Seller Mode", url: "/seller-mode", icon: ShoppingCart },
    ],
  },
  {
    label: "LOGISTICS",
    items: [
      { title: "Route Builder", url: "/route-builder", icon: Map },
      { title: "Hand-off Chain", url: "/watch-mode", icon: Radio },
      { title: "Classify Product", url: "/classify", icon: Search },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Pricing", url: "/pricing", icon: CreditCard },
      { title: "Guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const COMPLIANCE_NAV: NavGroup[] = [
  {
    label: "QUICK ACTIONS",
    items: [
      { title: "New Review", url: "/validate-docs", icon: Plus },
      { title: "New Shipment", url: "/intake", icon: Package },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Document Validation", url: "/validate-docs", icon: FileText },
      { title: "DIAN / Colombia", url: "/dian-compliance", icon: Fingerprint },
      { title: "Classify Product", url: "/classify", icon: Search },
    ],
  },
  {
    label: "RISK & REVIEW",
    items: [
      { title: "Review Queue", url: "/review", icon: ClipboardList },
      { title: "Decision Twin", url: "/decision-twin", icon: Zap },
      { title: "Legal Knowledge", url: "/legal", icon: BookOpen },
      { title: "Audit Trail", url: "/audit-trail", icon: Scale },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { title: "Jurisdictions", url: "/jurisdiction-settings", icon: ShieldCheck },
      { title: "Admin", url: "/admin", icon: Settings },
      { title: "Guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const ROUTE_PLANNING_NAV: NavGroup[] = [
  {
    label: "QUICK ACTIONS",
    items: [
      { title: "New Route", url: "/creator-mode", icon: Plus },
      { title: "New Shipment", url: "/intake", icon: Package },
    ],
  },
  {
    label: "PLANNING",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Creator Mode", url: "/creator-mode", icon: Eye },
      { title: "Route Builder", url: "/route-builder", icon: Map },
      { title: "Decision Twin", url: "/decision-twin", icon: Zap },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { title: "Watch Mode", url: "/watch-mode", icon: Radio },
      { title: "Classify Product", url: "/classify", icon: Search },
      { title: "Document Validation", url: "/validate-docs", icon: FileText },
      { title: "Legal Knowledge", url: "/legal", icon: BookOpen },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Broker Scorecard", url: "/brokers", icon: Users },
      { title: "Guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const OPERATIONS_NAV: NavGroup[] = [
  {
    label: "QUICK ACTIONS",
    items: [
      { title: "New Shipment", url: "/intake", icon: Plus },
      { title: "New Watchlist", url: "/watch-mode", icon: Radio },
    ],
  },
  {
    label: "CONTROL TOWER",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Watch Mode", url: "/watch-mode", icon: Radio },
      { title: "Review Queue", url: "/review", icon: ClipboardList },
    ],
  },
  {
    label: "SHIPMENTS",
    items: [
      { title: "Route Builder", url: "/route-builder", icon: Map },
      { title: "Decision Twin", url: "/decision-twin", icon: Zap },
      { title: "Creator Mode", url: "/creator-mode", icon: Eye },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { title: "Document Validation", url: "/validate-docs", icon: FileText },
      { title: "DIAN / Colombia", url: "/dian-compliance", icon: Fingerprint },
      { title: "Audit Trail", url: "/audit-trail", icon: Scale },
    ],
  },
  {
    label: "TEAM",
    items: [
      { title: "Team Chat", url: "/team-chat", icon: Users },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Admin", url: "/admin", icon: Settings },
      { title: "Guide", url: "/guide", icon: HelpCircle },
    ],
  },
];

const ENTERPRISE_NAV: NavGroup[] = [
  {
    label: "QUICK ACTIONS",
    items: [
      { title: "New Shipment", url: "/intake", icon: Plus },
      { title: "New Route", url: "/creator-mode", icon: Route },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { title: "Dashboard", url: "/", icon: Activity },
      { title: "Teams", url: "/teams", icon: Users },
      { title: "Team Chat", url: "/team-chat", icon: Users },
      { title: "Broker Scorecard", url: "/brokers", icon: Users },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Watch Mode", url: "/watch-mode", icon: Radio },
      { title: "Review Queue", url: "/review", icon: ClipboardList },
      { title: "Route Builder", url: "/route-builder", icon: Map },
      { title: "Creator Mode", url: "/creator-mode", icon: Eye },
    ],
  },
  {
    label: "ANALYTICS & COMPLIANCE",
    items: [
      { title: "Analytics / ROI", url: "/analytics", icon: BarChart3 },
      { title: "Audit Trail", url: "/audit-trail", icon: Scale },
      { title: "Legal Knowledge", url: "/legal", icon: BookOpen },
      { title: "Classify Product", url: "/classify", icon: Search },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { title: "Admin Settings", url: "/admin", icon: Settings },
      { title: "Jurisdictions", url: "/jurisdiction-settings", icon: ShieldCheck },
      { title: "Pricing", url: "/pricing", icon: CreditCard },
      { title: "Guide", url: "/guide", icon: HelpCircle },
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
