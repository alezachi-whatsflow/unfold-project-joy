import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ICPProfile {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_auto_generated: boolean;
  hot_score_threshold: number;
  warm_score_threshold: number;
  criteria: any[];
  version: number;
}

export interface ICPQuestionnaire {
  id: string;
  tenant_id: string;
  icp_id: string | null;
  name: string;
  is_active: boolean;
  is_auto_generated: boolean;
  questions: any[];
}

export function useICPProfile(tenantId?: string) {
  const queryClient = useQueryClient();

  const { data: icpProfile, isLoading: icpLoading } = useQuery({
    queryKey: ['icp_profiles', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icp_profiles')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ICPProfile | null;
    },
  });

  const { data: questionnaire, isLoading: questionnaireLoading } = useQuery({
    queryKey: ['icp_questionnaires', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icp_questionnaires')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ICPQuestionnaire | null;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['icp_profiles'] });
    queryClient.invalidateQueries({ queryKey: ['icp_questionnaires'] });
  }, [queryClient]);

  const upsertICP = useCallback(async (data: Partial<ICPProfile>) => {
    if (icpProfile?.id) {
      const { error } = await supabase
        .from('icp_profiles')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', icpProfile.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('icp_profiles')
        .insert({ tenant_id: tenantId!, ...data } as any);
      if (error) throw error;
    }
    invalidate();
  }, [icpProfile, invalidate, tenantId]);

  const upsertQuestionnaire = useCallback(async (data: Partial<ICPQuestionnaire>) => {
    if (questionnaire?.id) {
      const { error } = await supabase
        .from('icp_questionnaires')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', questionnaire.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('icp_questionnaires')
        .insert({ tenant_id: tenantId!, ...data } as any);
      if (error) throw error;
    }
    invalidate();
  }, [questionnaire, invalidate, tenantId]);

  return {
    icpProfile,
    questionnaire,
    isLoading: icpLoading || questionnaireLoading,
    upsertICP,
    upsertQuestionnaire,
    invalidate,
  };
}
