import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatDrawer } from "@/components/ChatDrawer";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-10 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 px-2">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-1">
              <ChatDrawer />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
