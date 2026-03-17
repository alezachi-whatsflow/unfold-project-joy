import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type NexusRole =
  | 'nexus_superadmin'
  | 'nexus_dev_senior'
  | 'nexus_suporte_senior'
  | 'nexus_financeiro'
  | 'nexus_suporte_junior'
  | 'nexus_customer_success';

export const NEXUS_ROLE_LABELS: Record<NexusRole, string> = {
  nexus_superadmin: 'SuperAdmin',
  nexus_dev_senior: 'Dev Senior',
  nexus_suporte_senior: 'Suporte Senior',
  nexus_financeiro: 'Financeiro',
  nexus_suporte_junior: 'Suporte Junior',
  nexus_customer_success: 'Customer Success',
};

export const NEXUS_ROLE_COLORS: Record<NexusRole, string> = {
  nexus_superadmin: 'text-red-400',
  nexus_dev_senior: 'text-purple-400',
  nexus_suporte_senior: 'text-blue-400',
  nexus_financeiro: 'text-amber-400',
  nexus_suporte_junior: 'text-emerald-400',
  nexus_customer_success: 'text-cyan-400',
};

interface NexusUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: NexusRole;
  avatar_url: string | null;
  is_active: boolean;
}

interface NexusContextType {
  nexusUser: NexusUser | null;
  isLoading: boolean;
  isAuthorized: boolean;
  role: NexusRole | null;
  can: (allowedRoles: NexusRole[]) => boolean;
}

const NexusContext = createContext<NexusContextType>({
  nexusUser: null,
  isLoading: true,
  isAuthorized: false,
  role: null,
  can: () => false,
});

export function NexusProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [nexusUser, setNexusUser] = useState<NexusUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNexusUser(null);
      setIsLoading(false);
      return;
    }

    async function fetchNexusUser() {
      const { data, error } = await supabase
        .from('nexus_users')
        .select('*')
        .eq('auth_user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setNexusUser(null);
      } else {
        setNexusUser(data as NexusUser);
        // Update last_login
        await supabase
          .from('nexus_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);
      }
      setIsLoading(false);
    }

    fetchNexusUser();
  }, [user, authLoading]);

  const can = (allowedRoles: NexusRole[]) => {
    if (!nexusUser) return false;
    return allowedRoles.includes(nexusUser.role);
  };

  return (
    <NexusContext.Provider
      value={{
        nexusUser,
        isLoading,
        isAuthorized: !!nexusUser,
        role: nexusUser?.role ?? null,
        can,
      }}
    >
      {children}
    </NexusContext.Provider>
  );
}

export const useNexus = () => useContext(NexusContext);
