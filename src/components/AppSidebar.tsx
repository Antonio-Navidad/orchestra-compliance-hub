import { Activity, LogOut, Repeat, Info } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspacePurpose, WORKSPACE_PURPOSES } from "@/hooks/useWorkspacePurpose";
import { getNavigationForPurpose } from "@/lib/workspaceNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAV_TOOLTIPS } from "@/lib/helpContent";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const { purpose, clearPurpose } = useWorkspacePurpose();

  const navGroups = getNavigationForPurpose(purpose);
  const currentPurpose = WORKSPACE_PURPOSES.find(p => p.id === purpose);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight">ORCHESTRA</h1>
              {currentPurpose && (
                <p className="text-[9px] font-mono text-primary/70 tracking-wider truncate">
                  {currentPurpose.icon} {currentPurpose.label.toUpperCase()}
                </p>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] tracking-widest font-mono text-muted-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url + item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="text-xs font-mono flex-1">{item.title}</span>
                        )}
                        {!collapsed && NAV_TOOLTIPS[item.url] && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <Info size={12} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px] text-[10px]">
                                {NAV_TOOLTIPS[item.url]}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="flex flex-col gap-1">
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPurpose}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground h-auto p-1 justify-start"
            >
              <Repeat size={10} className="mr-1" /> Switch Workspace
            </Button>
          )}
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
