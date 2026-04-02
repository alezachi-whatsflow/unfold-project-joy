import { useCallback, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FunnelStage } from '@/components/settings/SalesFunnelConfigCard';

export interface SalesPipeline {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  stages: FunnelStage[];
  currency_prefix: string;
  show_probability: boolean;
  show_forecast: boolean;
  is_default: boolean;
  is_active: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'whatsflow_selected_pipeline';

export function usePipelines(tenantId?: string) {
  const queryClient = useQueryClient();

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['sales_pipelines', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_pipelines')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        stages: Array.isArray(p.stages) ? p.stages : [],
      })) as SalesPipeline[];
    },
  });

  // Selected pipeline state
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Auto-select default pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const def = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(def.id);
      localStorage.setItem(STORAGE_KEY, def.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectPipeline = useCallback((id: string) => {
    setSelectedPipelineId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0] || null;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sales_pipelines'] });
  }, [queryClient]);

  const createPipeline = useCallback(async (data: Partial<SalesPipeline>) => {
    let tid = tenantId;
    if (!tid) {
      // Fallback: resolve from auth
      const { getTenantId } = await import("@/lib/tenantResolver");
      tid = await getTenantId();
    }
    const { error } = await supabase.from('sales_pipelines').insert({
      tenant_id: tid,
      name: data.name || 'Novo Pipeline',
      description: data.description || null,
      stages: data.stages || [
        { key: 'prospeccao', label: 'Prospecção', color: '#60a5fa', enabled: true, ordem: 1 },
        { key: 'qualificado', label: 'Qualificado', color: '#a78bfa', enabled: true, ordem: 2 },
        { key: 'proposta', label: 'Proposta Enviada', color: '#f59e0b', enabled: true, ordem: 3 },
        { key: 'negociacao', label: 'Em Negociação', color: '#fb923c', enabled: true, ordem: 4 },
        { key: 'fechado_ganho', label: 'Fechado — Ganho', color: '#4ade80', enabled: true, ordem: 5 },
        { key: 'fechado_perdido', label: 'Fechado — Perdido', color: '#f87171', enabled: true, ordem: 6 },
      ],
      currency_prefix: data.currency_prefix || 'R$',
      show_probability: data.show_probability ?? true,
      show_forecast: data.show_forecast ?? true,
      is_default: data.is_default ?? false,
      ordem: data.ordem ?? pipelines.length + 1,
    } as any);
    if (error) throw error;
    invalidate();
  }, [pipelines, invalidate, tenantId]);

  const updatePipeline = useCallback(async (id: string, data: Partial<SalesPipeline>) => {
    const { error } = await supabase
      .from('sales_pipelines')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  const deletePipeline = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('sales_pipelines')
      .update({ is_active: false } as any)
      .eq('id', id);
    if (error) throw error;
    if (selectedPipelineId === id) {
      const remaining = pipelines.filter(p => p.id !== id);
      if (remaining.length > 0) selectPipeline(remaining[0].id);
    }
    invalidate();
  }, [invalidate, selectedPipelineId, pipelines, selectPipeline]);

  return {
    pipelines,
    isLoading,
    selectedPipeline,
    selectedPipelineId,
    selectPipeline,
    createPipeline,
    updatePipeline,
    deletePipeline,
    invalidate,
  };
}
