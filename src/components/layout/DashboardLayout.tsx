import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-h-screen">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
            <SidebarTrigger className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-accent transition-colors" />
          </header>
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
