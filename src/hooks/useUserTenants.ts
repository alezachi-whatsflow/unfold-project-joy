import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  is_owner: boolean;
  created_at: string;
}

export function useUserTenants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-tenants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as UserTenant[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
