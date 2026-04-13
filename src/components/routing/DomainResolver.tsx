import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useWhiteLabelByDomain } from "@/hooks/useWhiteLabelBranding";

/**
 * DomainResolver — intercepts partner custom domain access and resolves to /app/:slug routes.
 *
 * Flow:
 * 1. User visits `new.whatsflow.com.br/` (partner custom domain)
 * 2. DomainResolver detects it's NOT a master domain (iazis.com.br, localhost, etc.)
 * 3. Queries `whitelabel_config.custom_domain` to find the matching partner
 * 4. Redirects internally to `/app/:slug` routes (preserving sub-path)
 * 5. Injects favicon + document title from branding
 *
 * For master domains, this component renders nothing (children pass through via App.tsx logic).
 */
export function DomainResolver({ children }: { children: React.ReactNode }) {
  const { data: branding, isLoading, isError } = useWhiteLabelByDomain();
  const location = useLocation();

  // Inject favicon and document title when branding resolves
  useEffect(() => {
    if (!branding) return;

    // Document title
    document.title = branding.app_name;

    // Favicon
    if (branding.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }
  }, [branding]);

  // Not a partner domain — render children normally
  if (!isLoading && !branding) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error fallback — render children (will show default IAZIS)
  if (isError || !branding) {
    return <>{children}</>;
  }

  // Partner domain resolved! Redirect to /app/:slug preserving the current path
  const currentPath = location.pathname;
  const isAlreadyInAppRoute = currentPath.startsWith(`/app/${branding.slug}`);

  // Already routed correctly — just render
  if (isAlreadyInAppRoute) {
    return <>{children}</>;
  }

  // Map root paths to /app/:slug equivalents
  // e.g. new.whatsflow.com.br/vendas → /app/whatsflow/vendas
  // e.g. new.whatsflow.com.br/ → /app/whatsflow/home
  const subPath = currentPath === "/" || currentPath === "" ? "/home" : currentPath;
  const targetPath = `/app/${branding.slug}${subPath}`;

  return <Navigate to={targetPath + location.search} replace />;
}
