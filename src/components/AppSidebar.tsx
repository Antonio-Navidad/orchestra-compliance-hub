import {
  Activity, Package, FileText, BarChart3, Users, Plus, CreditCard,
  Lightbulb, ClipboardList, Settings, Scale, BookOpen, Map,
  Search, LogOut, ArrowDownToLine, ArrowUpFromLine, Layers,
  Fingerprint, Zap, ShieldCheck
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/", icon: Activity },
  { title: "New Shipment", url: "/intake", icon: Plus },
  { title: "Review Queue", url: "/review", icon: ClipboardList },
];

const aiNav = [
  { title: "Classify Product", url: "/classify", icon: Search },
  { title: "Validate Documents", url: "/validate-docs", icon: FileText },
  { title: "Decision Twin", url: "/decision-twin", icon: Zap },
];

const insightsNav = [
  { title: "Analytics / ROI", url: "/analytics", icon: BarChart3 },
  { title: "Broker Scorecard", url: "/brokers", icon: Users },
  { title: "Legal Knowledge", url: "/legal", icon: BookOpen },
  { title: "Audit Trail", url: "/audit-trail", icon: Scale },
];

const settingsNav = [
  { title: "Admin Settings", url: "/admin", icon: Settings },
  { title: "Jurisdictions", url: "/jurisdiction-settings", icon: ShieldCheck },
  { title: "Plans & Billing", url: "/pricing", icon: CreditCard },
  { title: "Guide", url: "/hints", icon: Lightbulb },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (label: string, items: typeof mainNav) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] tracking-widest font-mono text-muted-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span className="text-xs font-mono">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-tight">ORCHESTRA</h1>
              <p className="text-[8px] font-mono text-muted-foreground tracking-widest">AI LOGISTICS PLATFORM</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {renderGroup("OPERATIONS", mainNav)}
        {renderGroup("AI ENGINES", aiNav)}
        {renderGroup("INSIGHTS", insightsNav)}
        {renderGroup("SETTINGS", settingsNav)}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs font-mono text-muted-foreground hover:text-foreground h-auto p-1 ml-auto"
            >
              <LogOut size={12} className="mr-1" /> Sign Out
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
