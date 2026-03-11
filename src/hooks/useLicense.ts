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
