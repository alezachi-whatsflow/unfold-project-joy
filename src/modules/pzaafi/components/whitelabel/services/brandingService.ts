import { supabase } from '@/integrations/supabase/client';

export interface BrandingConfig {
  logo_url: string | null;
  primary_color: string | null;
  custom_domain: string | null;
  name: string;
}

export interface UpdateBrandingInput {
  orgId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
}

/**
 * Update the branding (logo, color, domain) for a Pzaafi organization.
 */
export async function updateBranding(input: UpdateBrandingInput): Promise<BrandingConfig> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
  if (input.primaryColor !== undefined) updates.primary_color = input.primaryColor;
  if (input.customDomain !== undefined) updates.custom_domain = input.customDomain;

  const { data, error } = await supabase
    .from('pzaafi_organizations')
    .update(updates)
    .eq('id', input.orgId)
    .select('name, logo_url, primary_color, custom_domain')
    .single();

  if (error) throw new Error(`Failed to update branding: ${error.message}`);
  return data as BrandingConfig;
}

/**
 * Get branding for a checkout page. Looks up the org associated with a checkout slug.
 */
export async function getBrandingForCheckout(checkoutSlug: string): Promise<BrandingConfig | null> {
  const { data: checkout, error: checkoutErr } = await supabase
    .from('pzaafi_checkouts')
    .select('org_id')
    .eq('slug', checkoutSlug)
    .eq('active', true)
    .maybeSingle();

  if (checkoutErr || !checkout) return null;

  const { data: org, error: orgErr } = await supabase
    .from('pzaafi_organizations')
    .select('name, logo_url, primary_color, custom_domain')
    .eq('id', checkout.org_id)
    .single();

  if (orgErr || !org) return null;
  return org as BrandingConfig;
}
