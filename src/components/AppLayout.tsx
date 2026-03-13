import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { GlobalTopBar } from "@/components/GlobalTopBar";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";
import { ViewModeContext, useViewModeState } from "@/hooks/useViewMode";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const viewMode = useViewModeState();

  return (
    <ViewModeContext.Provider value={viewMode}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-10 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 px-2">
              <div className="flex items-center gap-1">
                <SidebarTrigger className="text-muted-foreground" />
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
  );
}
