import { fmtDate, fmtDateTime } from "@/lib/dateUtils";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Users, Wifi, Cpu, Calendar, FileText } from "lucide-react";
import { FaturaView } from "@/components/billing/FaturaView";

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return fmtDate(d);
}
function fmtDateTime(d: string | null) {
  if (!d) return '—';
  return fmtDateTime(d);
}

export default function WLClientDetail() {
  const { slug, clientId } = useParams<{ slug: string; clientId: string }>();
  const navigate = useNavigate();
  const [faturaOpen, setFaturaOpen] = useState(false);

  const { data: license, isLoading: licLoading } = useQuery({
    queryKey: ['wl-client-license', clientId],
    queryFn: async () => {
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
        .eq('id', clientId)
        .single();
      if (!data) return null;
      return {
        ...data,
        tenants: Array.isArray(data.tenants) ? data.tenants[0] : data.tenants,
      };
    },
    enabled: !!clientId,
  });

  const { data: profiles, isLoading: profLoading } = useQuery({
    queryKey: ['wl-client-profiles', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, last_login_at, created_at, is_active')
        .eq('license_id', clientId)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: wlBranding } = useQuery({
    queryKey: ['wl-branding-for-fatura', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('whitelabel_config')
        .select('display_name, logo_url, primary_color, support_email, cnpj')
        .eq('slug', slug!)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  if (licLoading || profLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Cliente não encontrado.
      </div>
    );
  }

  const baseAtt = license.base_attendants || 0;
  const extraAtt = license.extra_attendants || 0;
  const totalAtt = baseAtt + extraAtt;

  const baseWeb = license.base_devices_web || 0;
  const extraWeb = license.extra_devices_web || 0;
  const baseMeta = license.base_devices_meta || 0;
  const extraMeta = license.extra_devices_meta || 0;

  // Cost breakdown
  const aiCost = license.has_ai_module ? 250 : 0;

  // Attendant rows — first baseAtt are included, rest are "extra"
  const attendantRows = (profiles || []).map((p: any, i: number) => ({
    ...p,
    extraCost: i >= baseAtt ? 30 : 0,
  }));
  const totalAttCost = attendantRows.reduce((a: number, r: any) => a + r.extraCost, 0);

  // Devices rows (contracted allocation)
  const deviceRows = [
    ...Array.from({ length: baseWeb + extraWeb }, (_, i) => ({
      id: `web-${i}`,
      label: `Web WhatsApp ${i + 1}`,
      platform: 'WhatsApp Web',
      extraCost: i >= baseWeb ? 80 : 0,
    })),
    ...Array.from({ length: baseMeta + extraMeta }, (_, i) => ({
      id: `meta-${i}`,
      label: `Meta Business ${i + 1}`,
      platform: 'Meta Business',
      extraCost: i >= baseMeta ? 50 : 0,
    })),
  ];
  const totalDevCost = deviceRows.reduce((a, r) => a + r.extraCost, 0);

  const grandTotal = license.monthly_value || 0;

  return (
    <div className="space-y-5 pb-10 max-w-4xl">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-1"
        onClick={() => navigate(`/partners/${slug}/clientes`)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar aos clientes
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{license.tenants?.name || '—'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{license.tenants?.email || ''}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border text-foreground hover:text-foreground hover:bg-muted shrink-0"
          onClick={() => setFaturaOpen(true)}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Gerar Fatura
        </Button>
      </div>

      {/* Contract summary */}
      <Card className="border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Field label="Mensalidade" value={`R$ ${fmt(license.monthly_value || 0)}`} highlight />
            <Field label="Início" value={fmtDate(license.starts_at)} />
            <Field label="Vencimento" value={fmtDate(license.expires_at)} />
            <Field label="Status">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                license.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-white/10 text-muted-foreground'
              }`}>
                {license.status === 'active' ? 'Ativo' : license.status}
              </span>
            </Field>
            <Field label="Atendentes incl." value={String(baseAtt)} />
            <Field label="Atendentes extras" value={String(extraAtt)} />
            <Field label="Web WhatsApp" value={`${baseWeb} incl. + ${extraWeb} extras`} />
            <Field label="Meta Business" value={`${baseMeta} incl. + ${extraMeta} extras`} />
            {license.has_ai_module && (
              <Field label="Módulo I.A." value="Ativo" highlight />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendants */}
      <Card className="border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Atendentes ({attendantRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-5 py-2.5 font-medium">N°</th>
                  <th className="text-left px-5 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-5 py-2.5 font-medium">Último Login</th>
                  <th className="text-left px-5 py-2.5 font-medium">Criado em</th>
                  <th className="text-right px-5 py-2.5 font-medium">Valor extra</th>
                </tr>
              </thead>
              <tbody>
                {attendantRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-xs">
                      Nenhum atendente vinculado.
                    </td>
                  </tr>
                ) : (
                  attendantRows.map((a: any, i: number) => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="text-foreground font-medium">{a.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{a.role}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{fmtDateTime(a.last_login_at)}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{fmtDate(a.created_at)}</td>
                      <td className="px-5 py-3 text-right text-foreground">
                        {a.extraCost > 0
                          ? <span className="text-amber-400 font-medium">R$ {fmt(a.extraCost)}</span>
                          : <span className="text-muted-foreground">R$ 0,00</span>
                        }
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-border font-semibold text-foreground text-xs">
                  <td colSpan={4} className="px-5 py-3">Total por atendentes</td>
                  <td className="px-5 py-3 text-right">R$ {fmt(totalAttCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Devices */}
      <Card className="border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5" />
            Dispositivos ({deviceRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-5 py-2.5 font-medium">N°</th>
                  <th className="text-left px-5 py-2.5 font-medium">Dispositivo</th>
                  <th className="text-left px-5 py-2.5 font-medium">Plataforma</th>
                  <th className="text-right px-5 py-2.5 font-medium">Valor extra</th>
                </tr>
              </thead>
              <tbody>
                {deviceRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-xs">
                      Nenhum dispositivo contratado.
                    </td>
                  </tr>
                ) : (
                  deviceRows.map((d, i) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 text-foreground font-medium">{d.label}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{d.platform}</td>
                      <td className="px-5 py-3 text-right text-foreground">
                        {d.extraCost > 0
                          ? <span className="text-amber-400 font-medium">R$ {fmt(d.extraCost)}</span>
                          : <span className="text-muted-foreground">R$ 0,00</span>
                        }
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-border font-semibold text-foreground text-xs">
                  <td colSpan={3} className="px-5 py-3">Total por dispositivos</td>
                  <td className="px-5 py-3 text-right">R$ {fmt(totalDevCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI */}
      {license.has_ai_module && (
        <Card className="border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-foreground">
                <Cpu className="h-4 w-4 text-purple-400" />
                Módulo I.A.
              </span>
              <span className="text-purple-400 font-semibold">R$ {fmt(aiCost)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      <Card className="border-border" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-base">Total Mensal</span>
            <span className="font-bold text-xl" style={{ color: 'var(--wl-primary)' }}>
              R$ {fmt(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Fatura Dialog */}
      <Dialog open={faturaOpen} onOpenChange={setFaturaOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fatura — {license.tenants?.name}</DialogTitle>
          </DialogHeader>
          <FaturaView
            issuer={{
              name: wlBranding?.display_name || 'WhiteLabel',
              cnpj: (wlBranding as any)?.cnpj || undefined,
              email: wlBranding?.support_email || undefined,
              logoUrl: wlBranding?.logo_url || undefined,
              primaryColor: wlBranding?.primary_color || 'var(--wl-primary)',
            }}
            client={{
              name: license.tenants?.name || '',
              email: license.tenants?.email || '',
              cnpj: (license.tenants as any)?.cpf_cnpj || '',
            }}
            license={{
              base_attendants: license.base_attendants || 0,
              extra_attendants: license.extra_attendants || 0,
              base_devices_web: license.base_devices_web || 0,
              extra_devices_web: license.extra_devices_web || 0,
              base_devices_meta: license.base_devices_meta || 0,
              extra_devices_meta: license.extra_devices_meta || 0,
              has_ai_module: !!license.has_ai_module,
              monthly_value: Number(license.monthly_value || 0),
              starts_at: license.starts_at,
              expires_at: license.expires_at,
              plan: license.plan,
            }}
            attendants={profiles || []}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, highlight, children }: {
  label: string; value?: string; highlight?: boolean; children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children || (
        <p className={`text-sm font-medium ${highlight ? '' : 'text-foreground'}`}
          style={highlight ? { color: 'var(--wl-primary)' } : undefined}>
          {value}
        </p>
      )}
    </div>
  );
}
