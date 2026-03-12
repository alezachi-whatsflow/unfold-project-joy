import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface License {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  max_users: number;
  max_instances: number;
  features: Record<string, boolean>;
  starts_at: string;
  expires_at: string | null;
  // Whatsflow add-on fields
  base_devices_web: number;
  base_devices_meta: number;
  base_attendants: number;
  extra_devices_web: number;
  extra_devices_meta: number;
  extra_attendants: number;
  has_ai_module: boolean;
  ai_agents_limit: number;
  facilite_plan: string;
  facilite_monthly_hours: number;
  has_implantacao_starter: boolean;
  monthly_value: number;
  billing_cycle: string;
}

/** Calculate total devices/attendants from license */
export function getLicenseTotals(lic: License) {
  return {
    totalDevicesWeb: lic.base_devices_web + lic.extra_devices_web,
    totalDevicesMeta: lic.base_devices_meta + lic.extra_devices_meta,
    totalAttendants: lic.base_attendants + lic.extra_attendants,
  };
}

/** Calculate MRR from license fields (mirrors DB function) */
export function calculateMRR(lic: Partial<License>): number {
  let base = lic.plan === 'profissional' ? 359 : 259;

  const web = lic.extra_devices_web || 0;
  let webPrice = 0;
  if (web >= 1 && web <= 5) webPrice = web * 150;
  else if (web >= 6 && web <= 20) webPrice = web * 125;
  else if (web > 20) webPrice = web * 100;

  const meta = lic.extra_devices_meta || 0;
  let metaPrice = 0;
  if (meta >= 1 && meta <= 5) metaPrice = meta * 100;
  else if (meta >= 6 && meta <= 20) metaPrice = meta * 80;
  else if (meta > 20) metaPrice = meta * 60;

  const att = lic.extra_attendants || 0;
  let attPrice = 0;
  if (att >= 1 && att <= 5) attPrice = att * 80;
  else if (att >= 6 && att <= 10) attPrice = att * 75;
  else if (att >= 11 && att <= 20) attPrice = att * 70;
  else if (att > 20) attPrice = att * 60;

  const ai = lic.has_ai_module ? 350 : 0;

  let facilite = 0;
  if (lic.facilite_plan === 'basico') facilite = 250;
  else if (lic.facilite_plan === 'intermediario') facilite = 700;
  else if (lic.facilite_plan === 'avancado') facilite = 1500;

  return base + webPrice + metaPrice + attPrice + ai + facilite;
}

export function useLicense(tenantId: string | null) {
  return useQuery({
    queryKey: ['license', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as License | null;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
