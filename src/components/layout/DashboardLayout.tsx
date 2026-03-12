import { AppSidebar } from "./AppSidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { CommandPalette } from "./CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { ExternalLink, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isDetached = new URLSearchParams(location.search).get("detached") === "true";

  const handlePopOut = () => {
    const url = `${window.location.origin}${location.pathname}?detached=true`;
    window.open(url, `_whatsflow_${location.pathname}`, "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no");
  };

  const handleCloseDetached = () => {
    window.close();
  };

  // Detached/pop-out mode: minimal layout, no sidebar
  if (isDetached) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4">
          <Minimize2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Janela estendida — WhatsFlow</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="ghost" size="sm" onClick={handleCloseDetached} className="text-xs h-7">
              Fechar
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          {isMobile && <div className="w-10" />}
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handlePopOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir em nova janela (multi-monitor)</TooltipContent>
            </Tooltip>
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
