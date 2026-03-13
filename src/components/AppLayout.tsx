import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { GlobalTopBar } from "@/components/GlobalTopBar";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { ViewModeContext, useViewModeState } from "@/hooks/useViewMode";
import { WorkspaceContext, useWorkspaceProvider } from "@/hooks/useWorkspace";
import { useWorkspacePurpose, WORKSPACE_PURPOSES } from "@/hooks/useWorkspacePurpose";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const viewMode = useViewModeState();
  const workspace = useWorkspaceProvider();
  const { purpose } = useWorkspacePurpose();
  const currentPurpose = WORKSPACE_PURPOSES.find(p => p.id === purpose);

  return (
    <WorkspaceContext.Provider value={workspace}>
      <ViewModeContext.Provider value={viewMode}>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-10 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 px-2">
                <div className="flex items-center gap-1">
                  <SidebarTrigger className="text-muted-foreground" />
                  {currentPurpose && (
                    <span className="text-[10px] font-mono text-muted-foreground/60 hidden md:inline">
                      {currentPurpose.icon} {currentPurpose.label}
                    </span>
                  )}
                  <WorkspaceSelector />
                  <ViewModeSwitcher />
                </div>
                <div className="flex items-center gap-1">
                  <GlobalTopBar />
                  <ChatDrawer />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ViewModeContext.Provider>
    </WorkspaceContext.Provider>
  );
}
