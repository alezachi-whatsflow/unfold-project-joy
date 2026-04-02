import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Negocio, NegocioStatus, HistoricoItem } from '@/types/vendas';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

export function useNegocios(tenantId?: string, pipelineId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOwnedOnly, userId } = usePermissions();
  const viewOwnedOnly = isOwnedOnly('vendas');

  const { data: negocios = [], isLoading } = useQuery({
    queryKey: ['negocios', tenantId, pipelineId, viewOwnedOnly ? userId : 'all'],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('negocios')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (pipelineId) {
        query = query.or(`pipeline_id.eq.${pipelineId},pipeline_id.is.null`);
      }

      // RBAC: if user can only see their own records, filter by consultor_id
      if (viewOwnedOnly && userId) {
        query = query.eq('consultor_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((n: any) => ({
        ...n,
        produtos: Array.isArray(n.produtos) ? n.produtos : [],
        historico: Array.isArray(n.historico) ? n.historico : [],
        tags: Array.isArray(n.tags) ? n.tags : [],
      })) as Negocio[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['negocios'] });
  }, [queryClient]);

  const createNegocio = useCallback(async (data: Partial<Negocio> & { pipeline_id?: string }) => {
    const historico: HistoricoItem[] = [{
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      tipo: 'status_change',
      descricao: `Negócio criado com status: ${data.status || 'prospeccao'}`,
      usuarioId: user?.id || '',
      usuarioNome: user?.user_metadata?.full_name || user?.email || '',
    }];
    const { error } = await supabase.from('negocios').insert({
      tenant_id: tenantId!,
      pipeline_id: data.pipeline_id || pipelineId || null,
      titulo: data.titulo,
      status: data.status || 'prospeccao',
      origem: data.origem || 'inbound',
      cliente_id: data.cliente_id || null,
      cliente_nome: data.cliente_nome || null,
      consultor_id: data.consultor_id || null,
      consultor_nome: data.consultor_nome || null,
      produtos: data.produtos || [],
      valor_total: data.valor_total || 0,
      desconto: data.desconto || 0,
      desconto_tipo: data.desconto_tipo || 'percent',
      valor_liquido: data.valor_liquido || 0,
      data_previsao_fechamento: data.data_previsao_fechamento || null,
      gerar_nf: data.gerar_nf ?? true,
      gerar_cobranca: data.gerar_cobranca ?? true,
      forma_pagamento: data.forma_pagamento || 'a_definir',
      condicao_pagamento: data.condicao_pagamento || 'À vista',
      probabilidade: data.probabilidade ?? 50,
      notas: data.notas || '',
      tags: data.tags || [],
      historico,
    } as any);
    if (error) throw error;
    invalidate();
  }, [user, invalidate, pipelineId, tenantId]);

  const updateNegocio = useCallback(async (id: string, data: Partial<Negocio>) => {
    const { error } = await supabase
      .from('negocios')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  const changeStatus = useCallback(async (negocio: Negocio, newStatus: NegocioStatus) => {
    const histItem: HistoricoItem = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      tipo: 'status_change',
      descricao: `Status alterado: ${negocio.status} → ${newStatus}`,
      usuarioId: user?.id || '',
      usuarioNome: user?.user_metadata?.full_name || user?.email || '',
    };
    const update: any = {
      status: newStatus,
      historico: [...negocio.historico, histItem],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'fechado_ganho' || newStatus === 'fechado_perdido') {
      update.data_fechamento = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase.from('negocios').update(update).eq('id', negocio.id);
    if (error) throw error;
    invalidate();
  }, [user, invalidate]);

  const addHistoricoItem = useCallback(async (negocio: Negocio, item: Omit<HistoricoItem, 'id' | 'data' | 'usuarioId' | 'usuarioNome'>) => {
    const histItem: HistoricoItem = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      usuarioId: user?.id || '',
      usuarioNome: user?.user_metadata?.full_name || user?.email || '',
      ...item,
    };
    const { error } = await supabase
      .from('negocios')
      .update({ historico: [...negocio.historico, histItem], updated_at: new Date().toISOString() } as any)
      .eq('id', negocio.id);
    if (error) throw error;
    invalidate();
  }, [user, invalidate]);

  const deleteNegocio = useCallback(async (id: string) => {
    const { error } = await supabase.from('negocios').delete().eq('id', id);
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  const badgeCount = useMemo(() => {
    return negocios.filter(n => n.status === 'proposta' || n.status === 'negociacao').length;
  }, [negocios]);

  return {
    negocios,
    isLoading,
    createNegocio,
    updateNegocio,
    changeStatus,
    addHistoricoItem,
    deleteNegocio,
    invalidate,
    badgeCount,
  };
}
