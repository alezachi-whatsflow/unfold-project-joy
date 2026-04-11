import { useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { CommandPalette } from "./CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, Outlet, useParams } from "react-router-dom";
import { ExternalLink, Minimize2, Loader2 } from "lucide-react";
import { TopNavBar } from "./TopNavBar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { GlobalInternalChatDrawer } from "@/components/chat/GlobalInternalChatDrawer";

export function DashboardLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const tenantId = useTenantId();
  const isDetached = new URLSearchParams(location.search).get("detached") === "true";

  // Resolve white-label branding from the tenant's parent license
  const { data: branding } = useQuery({
    queryKey: ['tenant-wl-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      // Find this tenant's license and its parent (WL) license
      const { data: license } = await (supabase as any)
        .from("licenses")
        .select("id, parent_license_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!license) return null;

      // Use parent_license_id if this is a sub-license, otherwise own license
      const wlLicenseId = license.parent_license_id || license.id;

      // Fetch the WL config for that license
      const { data: wlConfig } = await (supabase as any)
        .from("whitelabel_config")
        .select("display_name, logo_url, primary_color")
        .eq("license_id", wlLicenseId)
        .maybeSingle();

      if (!wlConfig) return null;

      // Also fetch extended branding if available
      const { data: extBrand } = await (supabase as any)
        .from("whitelabel_branding")
        .select("primary_color, secondary_color, accent_color, background_color, logo_url, logo_dark_url, app_name")
        .eq("account_id", wlLicenseId)
        .maybeSingle();

      return {
        app_name: extBrand?.app_name || wlConfig.display_name || "Whatsflow",
        primary_color: extBrand?.primary_color ? `#${extBrand.primary_color}` : wlConfig.primary_color || "#11BC76",
        secondary_color: extBrand?.secondary_color ? `#${extBrand.secondary_color}` : "#191D20",
        accent_color: extBrand?.accent_color ? `#${extBrand.accent_color}` : "#4F5AE3",
        background_color: extBrand?.background_color ? `#${extBrand.background_color}` : "#191D20",
        logo_url: extBrand?.logo_dark_url || extBrand?.logo_url || wlConfig.logo_url || null,
      };
    },
    enabled: !!tenantId,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--wl-primary', branding.primary_color);
      document.documentElement.style.setProperty('--wl-secondary', branding.secondary_color);
      document.documentElement.style.setProperty('--wl-accent', branding.accent_color);
      document.documentElement.style.setProperty('--wl-bg', branding.background_color);
    }
    return () => {
      ['--wl-primary', '--wl-secondary', '--wl-accent', '--wl-bg'].forEach(v =>
        document.documentElement.style.removeProperty(v)
      );
    };
  }, [branding]);

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
          <span className="text-xs font-medium text-muted-foreground">Janela estendida — {branding?.app_name || "Whatsflow"}</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="ghost" size="sm" onClick={handleCloseDetached} className="text-xs h-7">
              Fechar
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-3 sm:p-4 md:p-6" style={{ backgroundColor: 'var(--wl-bg, inherit)' }}>
          <Outlet />
        </main>
      </div>
    );
  }

  // Fullscreen routes
  const isInboxRoute = location.pathname.includes("/mensageria");
  const isHomePage = location.pathname.endsWith("/home");

  // Central de Controle — fullscreen, own header + dock
  if (isHomePage) {
    return (
      <div className="flex min-h-screen w-full flex-col" style={{ background: "hsl(var(--background))" }}>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <CommandPalette />
      </div>
    );
  }

  // Inbox mode: main sidebar becomes horizontal icon bar at top
  if (isInboxRoute) {
    return (
      <div className="flex flex-col min-h-screen w-full" style={{ background: "var(--bg-base, hsl(var(--background)))" }}>
        <TopNavBar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
        <CommandPalette />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full glass-ambient-bg">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 glass-header px-6">
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
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8" style={{ backgroundColor: 'var(--wl-bg, hsl(var(--background)))' }}>
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <GlobalInternalChatDrawer />
    </div>
  );
}
