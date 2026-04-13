import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * White-label branding resolved from the current hostname.
 * All fields come from whitelabel_config + whitelabel_branding (DB-driven, zero hardcode).
 */
export interface WLBranding {
  /** Partner display name (e.g. "Whatsflow") */
  app_name: string;
  /** Primary brand color (hex) */
  primary_color: string;
  /** Secondary brand color (hex) */
  secondary_color: string;
  /** Accent color (hex) */
  accent_color: string;
  /** Background color (hex) */
  background_color: string;
  /** Logo URL for dark backgrounds */
  logo_url: string | null;
  /** Favicon URL */
  favicon_url: string | null;
  /** The partner's slug (for routing) */
  slug: string;
  /** The partner's license_id (for sub-queries) */
  license_id: string;
  /** Whether this was resolved via custom_domain (true) or slug (false) */
  resolved_via_domain: boolean;
}

const IAZIS_DEFAULTS: Omit<WLBranding, "slug" | "license_id" | "resolved_via_domain"> = {
  app_name: "IAZIS",
  primary_color: "#11BC76",
  secondary_color: "#191D20",
  accent_color: "#4F5AE3",
  background_color: "#191D20",
  logo_url: null,
  favicon_url: null,
};

/** Known master domains — these are IAZIS core, not a partner custom domain */
const MASTER_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "iazis.com.br",
  "www.iazis.com.br",
  "iazis.ia.br",
  "www.iazis.ia.br",
  // Railway preview URLs
  "unfold-project-joy-production.up.railway.app",
];

/**
 * Resolves WL branding from a custom domain.
 * Queries whitelabel_config where custom_domain matches the current hostname.
 */
async function resolveByDomain(hostname: string): Promise<WLBranding | null> {
  // Strip "www." prefix for matching
  const cleanHost = hostname.replace(/^www\./, "");

  const { data: wlConfig } = await (supabase as any)
    .from("whitelabel_config")
    .select("id, slug, license_id, display_name, logo_url, favicon_url, primary_color, custom_domain")
    .or(`custom_domain.eq.${cleanHost},custom_domain.eq.www.${cleanHost}`)
    .maybeSingle();

  if (!wlConfig) return null;

  // Fetch extended branding
  const extBrand = await fetchExtendedBranding(wlConfig.license_id);

  return mergeBranding(wlConfig, extBrand, true);
}

/**
 * Resolves WL branding from a tenant_id (via license → parent_license → whitelabel_config).
 */
async function resolveByTenantId(tenantId: string): Promise<WLBranding | null> {
  const { data: license } = await (supabase as any)
    .from("licenses")
    .select("id, parent_license_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!license) return null;

  const wlLicenseId = license.parent_license_id || license.id;

  const { data: wlConfig } = await (supabase as any)
    .from("whitelabel_config")
    .select("id, slug, license_id, display_name, logo_url, favicon_url, primary_color, custom_domain")
    .eq("license_id", wlLicenseId)
    .maybeSingle();

  if (!wlConfig) return null;

  const extBrand = await fetchExtendedBranding(wlConfig.license_id);

  return mergeBranding(wlConfig, extBrand, false);
}

/**
 * Fetch extended branding (colors, dark logo) from whitelabel_branding table.
 */
async function fetchExtendedBranding(licenseId: string) {
  const { data } = await (supabase as any)
    .from("whitelabel_branding")
    .select("primary_color, secondary_color, accent_color, background_color, logo_url, logo_dark_url, favicon_url, app_name")
    .eq("account_id", licenseId)
    .maybeSingle();
  return data;
}

/**
 * Merge whitelabel_config + whitelabel_branding into a single WLBranding object.
 * Extended branding takes precedence over base config.
 */
function mergeBranding(wlConfig: any, extBrand: any, resolvedViaDomain: boolean): WLBranding {
  return {
    app_name: extBrand?.app_name || wlConfig.display_name || IAZIS_DEFAULTS.app_name,
    primary_color: extBrand?.primary_color ? `#${extBrand.primary_color}` : wlConfig.primary_color || IAZIS_DEFAULTS.primary_color,
    secondary_color: extBrand?.secondary_color ? `#${extBrand.secondary_color}` : IAZIS_DEFAULTS.secondary_color,
    accent_color: extBrand?.accent_color ? `#${extBrand.accent_color}` : IAZIS_DEFAULTS.accent_color,
    background_color: extBrand?.background_color ? `#${extBrand.background_color}` : IAZIS_DEFAULTS.background_color,
    logo_url: extBrand?.logo_dark_url || extBrand?.logo_url || wlConfig.logo_url || null,
    favicon_url: extBrand?.favicon_url || wlConfig.favicon_url || null,
    slug: wlConfig.slug,
    license_id: wlConfig.license_id,
    resolved_via_domain: resolvedViaDomain,
  };
}

/**
 * Check if the current hostname is a partner custom domain (not a master/core domain).
 */
function isPartnerDomain(hostname: string): boolean {
  const clean = hostname.replace(/^www\./, "").toLowerCase();
  return !MASTER_DOMAINS.some(d => clean === d || clean.endsWith(`.${d}`));
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve WL branding by hostname (for domain-based routing).
 * Only queries the DB when the hostname isn't a known master domain.
 */
export function useWhiteLabelByDomain() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isPartner = isPartnerDomain(hostname);

  return useQuery<WLBranding | null>({
    queryKey: ["wl-branding-domain", hostname],
    queryFn: () => resolveByDomain(hostname),
    enabled: isPartner,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/**
 * Resolve WL branding by tenant_id (for slug-based routing).
 * This is the existing flow used by DashboardLayout and AppSidebar.
 */
export function useWhiteLabelByTenant(tenantId: string | undefined) {
  return useQuery<WLBranding | null>({
    queryKey: ["wl-branding-tenant", tenantId],
    queryFn: () => resolveByTenantId(tenantId!),
    enabled: !!tenantId,
    staleTime: 10 * 60_000,
  });
}

/**
 * Combined hook: tries domain first, falls back to tenant-based resolution.
 * This is the "one hook to rule them all" for WL branding.
 */
export function useWhiteLabelBranding(tenantId?: string) {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isPartner = isPartnerDomain(hostname);

  return useQuery<WLBranding | null>({
    queryKey: ["wl-branding", hostname, tenantId],
    queryFn: async () => {
      // 1. Try domain resolution first (partner custom domains)
      if (isPartner) {
        const domainResult = await resolveByDomain(hostname);
        if (domainResult) return domainResult;
      }
      // 2. Fall back to tenant-based resolution
      if (tenantId) {
        return resolveByTenantId(tenantId);
      }
      return null;
    },
    enabled: isPartner || !!tenantId,
    staleTime: 10 * 60_000,
  });
}
