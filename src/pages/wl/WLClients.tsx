import { fmtDate } from "@/lib/dateUtils";
import { useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, Users, Wifi, Cpu } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo', inactive: 'Inativo', blocked: 'Bloqueado',
  suspended: 'Suspenso', trial: 'Trial',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  blocked: 'bg-red-500/15 text-red-500 border-red-500/30',
  suspended: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  trial: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
};

export default function WLClients() {
  const { slug } = useParams<{ slug: string }>();
  const { wlLicenseId } = useOutletContext<{ branding: any; wlLicenseId: string | null }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['wl-clients', wlLicenseId],
    queryFn: async () => {
      if (!wlLicenseId) return [];
      const { data } = await supabase
        .from('licenses')
        .select(`
          id, status, plan, monthly_value, starts_at, expires_at, created_at,
          base_attendants, extra_attendants,
          base_devices_web, extra_devices_web,
          base_devices_meta, extra_devices_meta,
          has_ai_module,
          tenants(name, email, cpf_cnpj)
        `)
        .eq('parent_license_id', wlLicenseId)
        .order('created_at', { ascending: false });
      return (data || []).map((r: any) => ({
        ...r,
        tenants: Array.isArray(r.tenants) ? r.tenants[0] : r.tenants,
      }));
    },
    enabled: !!wlLicenseId,
  });

  const filtered = (clients || []).filter((c: any) => {
    const q = search.toLowerCase();
    return (
      c.tenants?.name?.toLowerCase().includes(q) ||
      c.tenants?.email?.toLowerCase().includes(q) ||
      c.tenants?.cpf_cnpj?.includes(q)
    );
  });

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(clients || []).length} cliente{(clients || []).length !== 1 ? 's' : ''} cadastrado{(clients || []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Recursos</th>
                  <th className="text-right px-5 py-3 font-medium">MRR</th>
                  <th className="text-right px-5 py-3 font-medium">Vencimento</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const attendants = (c.base_attendants || 0) + (c.extra_attendants || 0);
                  const devWeb = (c.base_devices_web || 0) + (c.extra_devices_web || 0);
                  const devMeta = (c.base_devices_meta || 0) + (c.extra_devices_meta || 0);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/wl/${slug}/clientes/${c.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{c.tenants?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.tenants?.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLOR[c.status] || ''}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{attendants}</span>
                          <span className="flex items-center gap-1"><Wifi className="h-3 w-3" />{devWeb}w/{devMeta}m</span>
                          {c.has_ai_module && <span className="flex items-center gap-1 text-purple-500"><Cpu className="h-3 w-3" />I.A.</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--wl-primary)' }}>
                        R$ {fmt(c.monthly_value || 0)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                        {c.expires_at ? fmtDate(c.expires_at) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
