import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface LicenseLimits {
  maxDevicesWeb: number;
  maxDevicesMeta: number;
  maxAttendants: number;
  hasAiModule: boolean;
  currentDevicesWeb: number;
  currentDevicesMeta: number;
  currentAttendants: number;
  plan: string;
  status: string;
  validUntil: string | null;
  facilitePlan: string;
  monthlyValue: number;
}

export function useLicenseLimits(tenantId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['license-limits', tenantId],
    queryFn: async (): Promise<LicenseLimits | null> => {
      if (!tenantId) return null;

      const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!license) return null;

      const { count: webCount } = await supabase
        .from('whatsapp_connections')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'web');

      const { count: metaCount } = await supabase
        .from('whatsapp_connections')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'meta');

      return {
        maxDevicesWeb: (license.base_devices_web || 1) + (license.extra_devices_web || 0),
        maxDevicesMeta: (license.base_devices_meta || 1) + (license.extra_devices_meta || 0),
        maxAttendants: (license.base_attendants || 1) + (license.extra_attendants || 0),
        hasAiModule: license.has_ai_module || false,
        currentDevicesWeb: webCount || 0,
        currentDevicesMeta: metaCount || 0,
        currentAttendants: 0,
        plan: license.plan,
        status: license.status,
        validUntil: license.expires_at,
        facilitePlan: license.facilite_plan || 'none',
        monthlyValue: license.monthly_value || 0,
      };
    },
    enabled: !!tenantId && !!user?.id,
    staleTime: 60_000,
  });
}
