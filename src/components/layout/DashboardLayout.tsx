import { AppSidebar } from "./AppSidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          {/* On mobile, leave space for hamburger */}
          {isMobile && <div className="w-10" />}
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
