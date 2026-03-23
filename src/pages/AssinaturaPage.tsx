import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, Plus, Bot, Clock, Wifi, Smartphone, Loader2, Copy, Check, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function AssinaturaPage() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  // Fetch account & license data
  const { data: accountInfo } = useQuery({
    queryKey: ['account-license-info', slug],
    queryFn: async () => {
      // Mocked data for Phase 4 UI visualization
      return {
        account_name: "RadAdvogados",
        account_type: "wl_client", // or direct_client
        plan: "Profissional",
        status: "Ativo",
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
        limits: {
          devices_web: { used: 3, total: 4 },
          devices_meta: { used: 1, total: 1 },
          attendants: { used: 40, total: 48 },
          ia_module: true,
          facilite: "avancado"
        },
        branding: {
          app_name: "SendHit Pro",
          support_whatsapp: "551199999999"
        }
      };
    }
  });

  if (!accountInfo) return null;

  const isMetaLimitReached = accountInfo.limits.devices_meta.used >= accountInfo.limits.devices_meta.total;
  const daysLeft = Math.ceil((new Date(accountInfo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const showExpiringAlert = daysLeft <= 15;

  const prepareContactMessage = (resource: string) => {
    const message = `Olá! Sou ${user?.user_metadata?.full_name || 'Admin'} da empresa ${accountInfo.account_name}. Preciso expandir: ${resource}.`;
    let wpNumber = accountInfo.account_type === 'wl_client' ? accountInfo.branding.support_whatsapp : '5511999999999'; // Default whatsflow number
    if (!wpNumber) wpNumber = '5511999999999';
    return `https://wa.me/${wpNumber}?text=${encodeURIComponent(message)}`;
  };

  const getContactButtonLabel = () => {
    if (accountInfo.account_type === 'wl_client') return `Falar com ${accountInfo.branding.app_name}`;
    return "Falar com a Whatsflow";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura e Licença</h1>
        <p className="text-muted-foreground">
          Gerencie os limites e recursos contratados da sua conta.
        </p>
      </div>

      {showExpiringAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-500">Sua licença vencerá em {daysLeft} dias</h3>
            <p className="text-sm text-amber-500/80 mt-1">
              Para evitar a suspensão da conta, entre em contato para tratar a renovação.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Plano Atual
            </h2>
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-sm rounded-full">
              {accountInfo.plan}
            </span>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-muted-foreground">Status da Licença</span>
              <span className="font-semibold text-emerald-400">{accountInfo.status}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-muted-foreground">Ambiente</span>
              <span className="font-semibold">{accountInfo.account_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-muted-foreground">Vencimento</span>
              <span className="font-semibold">
                {new Date(accountInfo.expires_at).toLocaleDateString('pt-BR')} ({daysLeft} dias)
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
             Limites de Uso
          </h2>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">Dispositivos Web</span>
                <span className="text-muted-foreground">{accountInfo.limits.devices_web.used} / {accountInfo.limits.devices_web.total}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all" 
                  style={{ width: `${(accountInfo.limits.devices_web.used / accountInfo.limits.devices_web.total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium flex items-center gap-2">
                  Dispositivos Meta (API Oficial)
                  {isMetaLimitReached && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                </span>
                <span className="text-muted-foreground">{accountInfo.limits.devices_meta.used} / {accountInfo.limits.devices_meta.total}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${isMetaLimitReached ? 'bg-amber-500' : 'bg-primary'}`} 
                  style={{ width: `${(accountInfo.limits.devices_meta.used / accountInfo.limits.devices_meta.total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">Atendentes Simultâneos</span>
                <span className="text-muted-foreground">{accountInfo.limits.attendants.used} / {accountInfo.limits.attendants.total}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all" 
                  style={{ width: `${(accountInfo.limits.attendants.used / accountInfo.limits.attendants.total) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4">
               {accountInfo.limits.ia_module && (
                 <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                   <CheckCircle2 className="h-3 w-3" /> Módulo I.A. Ativo
                 </span>
               )}
               <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 uppercase font-bold tracking-wider">
                 Facilite {accountInfo.limits.facilite}
               </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-card rounded-xl border p-6 text-center space-y-4 mt-8">
        <h3 className="text-lg font-bold">Precisa de mais recursos?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Faça um upgrade no seu limite de dispositivos Meta, atendentes ou adicione novos módulos premium como IA.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
          <Button 
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={() => window.open(prepareContactMessage('Aumentar limites da licença'), '_blank')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {getContactButtonLabel()}
          </Button>
        </div>
      </div>

      {/* ========== SEÇÃO 1: EXPANDA SEU PLANO ========== */}
      <UpsellSection accountInfo={accountInfo} userRole={user?.user_metadata?.role || 'admin'} />

      {/* ========== SEÇÃO 2: HISTÓRICO DE CONTRATAÇÕES ========== */}
      <LicenseHistory accountId={accountInfo.account_name} />
    </div>
  );
}

// ─── UPSELL SECTION ───────────────────────────────────────────────────────────
function UpsellSection({ accountInfo, userRole }: { accountInfo: any; userRole: string }) {
  const [upsellItem, setUpsellItem] = useState<{ type: string; label: string; value: number; qty?: number } | null>(null);
  const [qty, setQty] = useState(1);
  const isAdmin = userRole === 'admin';

  const { limits } = accountInfo;

  const handle = (type: string, label: string, unitPrice: number, defaultQty = 1) => {
    if (!isAdmin) return;
    setQty(defaultQty);
    setUpsellItem({ type, label, value: unitPrice, qty: defaultQty });
  };

  const totalUsedWeb = limits.devices_web.total;
  const tierLabelWeb = totalUsedWeb <= 5 ? 'R$ 150/un' : totalUsedWeb <= 20 ? 'R$ 125/un' : 'R$ 100/un';
  const unitPriceWeb = totalUsedWeb <= 5 ? 150 : totalUsedWeb <= 20 ? 125 : 100;

  const totalUsedMeta = limits.devices_meta.total;
  const tierLabelMeta = totalUsedMeta <= 5 ? 'R$ 100/un' : totalUsedMeta <= 20 ? 'R$ 80/un' : 'R$ 60/un';
  const unitPriceMeta = totalUsedMeta <= 5 ? 100 : totalUsedMeta <= 20 ? 80 : 60;

  const totalUsedAtt = limits.attendants.total;
  const tierLabelAtt = totalUsedAtt <= 5 ? 'R$ 80/un' : totalUsedAtt <= 10 ? 'R$ 75/un' : totalUsedAtt <= 20 ? 'R$ 70/un' : 'R$ 60/un';
  const unitPriceAtt = totalUsedAtt <= 5 ? 80 : totalUsedAtt <= 10 ? 75 : totalUsedAtt <= 20 ? 70 : 60;

  const btnClass = (active = true) =>
    `w-full mt-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity ${
      active && isAdmin ? 'opacity-100 hover:opacity-90 cursor-pointer' : 'opacity-40 cursor-not-allowed'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Expanda seu plano</h2>
        <p className="text-muted-foreground text-sm mt-1">Contrate novos recursos diretamente aqui, sem precisar entrar em contato.</p>
        {!isAdmin && <p className="text-xs text-amber-500 mt-2">⚠️ Apenas o administrador pode contratar novos recursos.</p>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Web */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Wifi className="h-5 w-5 text-primary" /><h3 className="font-bold text-sm">Dispositivos Web WhatsApp</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Conecte mais números WhatsApp à sua operação.</p>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{tierLabelWeb}</span>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">−</button>
            <span className="font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">+</button>
            <span className="ml-auto text-sm font-bold text-primary">R$ {(qty * unitPriceWeb).toLocaleString('pt-BR')}/mês</span>
          </div>
          <button onClick={() => handle('extra_web', `+${qty} Disp. Web`, unitPriceWeb, qty)}
            className={btnClass(isAdmin)} style={{ backgroundColor: 'var(--wl-primary)' }} title={!isAdmin ? 'Apenas administrador pode contratar' : ''}>
            Contratar
          </button>
        </Card>

        {/* Meta */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Smartphone className="h-5 w-5 text-blue-500" /><h3 className="font-bold text-sm">Dispositivos Meta Business</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Números via API oficial do Meta.</p>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{tierLabelMeta}</span>
          <div className="flex items-center gap-3 mt-3">
            <button className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">−</button>
            <span className="font-bold w-6 text-center">1</span>
            <button className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">+</button>
            <span className="ml-auto text-sm font-bold text-blue-500">R$ {unitPriceMeta}/mês</span>
          </div>
          <button onClick={() => handle('extra_meta', '+1 Disp. Meta', unitPriceMeta)}
            className={btnClass(isAdmin)} style={{ backgroundColor: 'var(--wl-primary)' }}>
            Contratar
          </button>
        </Card>

        {/* Attendants */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Plus className="h-5 w-5 text-amber-500" /><h3 className="font-bold text-sm">Atendentes extras</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Mais usuários de atendimento na plataforma.</p>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{tierLabelAtt}</span>
          <div className="flex items-center gap-3 mt-3">
            <button className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">−</button>
            <span className="font-bold w-6 text-center">1</span>
            <button className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">+</button>
            <span className="ml-auto text-sm font-bold text-amber-500">R$ {unitPriceAtt}/mês</span>
          </div>
          <button onClick={() => handle('extra_att', '+1 Atendente', unitPriceAtt)}
            className={btnClass(isAdmin)} style={{ backgroundColor: 'var(--wl-primary)' }}>
            Contratar
          </button>
        </Card>

        {/* AI Module — only if not active */}
        {!limits.ia_module && (
          <Card className="p-5 border-[var(--wl-primary)]/30">
            <div className="flex items-center gap-2 mb-2"><Bot className="h-5 w-5" style={{ color: 'var(--wl-primary)' }} /><h3 className="font-bold text-sm">Módulo I.A.</h3></div>
            <p className="text-xs text-muted-foreground mb-3">Automatize atendimentos com até 5 agentes inteligentes.</p>
            <p className="text-2xl font-black" style={{ color: 'var(--wl-primary)' }}>R$ 350<span className="text-base font-normal text-muted-foreground">/mês</span></p>
            <button onClick={() => handle('ia_module', 'Módulo I.A.', 350)}
              className={btnClass(isAdmin)} style={{ backgroundColor: 'var(--wl-primary)' }}>
              Ativar Módulo I.A.
            </button>
          </Card>
        )}

        {/* Facilite — if not avancado */}
        {limits.facilite !== 'avancado' && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-purple-500" /><h3 className="font-bold text-sm">Facilite Whatsflow</h3></div>
            {limits.facilite === 'none' && <p className="text-xs text-muted-foreground mb-3">Suporte especializado com horas mensais dedicadas.</p>}
            {limits.facilite === 'basico' && <p className="text-xs text-amber-500 mb-3">Você tem o Facilite Básico. Faça upgrade.</p>}
            {limits.facilite === 'intermediario' && <p className="text-xs text-amber-500 mb-3">Upgrade disponível para Avançado (R$ 1.500/mês).</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {limits.facilite === 'none' && (
                <>
                  <button onClick={() => handle('facilite_basico', 'Facilite Básico', 250)} className="rounded-lg border p-2 text-xs font-bold hover:border-purple-400 transition">Básico<br />R$ 250</button>
                  <button onClick={() => handle('facilite_inter', 'Facilite Intermediário', 700)} className="rounded-lg border p-2 text-xs font-bold hover:border-purple-400 transition">Interm.<br />R$ 700</button>
                  <button onClick={() => handle('facilite_avancado', 'Facilite Avançado', 1500)} className="rounded-lg border col-span-2 p-2 text-xs font-bold hover:border-purple-400 transition">Avançado — R$ 1.500</button>
                </>
              )}
              {limits.facilite === 'basico' && (
                <>
                  <button onClick={() => handle('facilite_inter', 'Facilite Intermediário', 700)} className="rounded-lg border p-2 text-xs font-bold col-span-1 hover:border-purple-400">Interm. R$ 700</button>
                  <button onClick={() => handle('facilite_avancado', 'Facilite Avançado', 1500)} className="rounded-lg border p-2 text-xs font-bold col-span-1 hover:border-purple-400">Avançado R$ 1.500</button>
                </>
              )}
              {limits.facilite === 'intermediario' && (
                <button onClick={() => handle('facilite_avancado', 'Facilite Avançado', 1500)} className="rounded-lg border p-2 text-xs font-bold col-span-2 hover:border-purple-400">Upgrade → Avançado R$ 1.500</button>
              )}
            </div>
          </Card>
        )}

        {/* Implantação Starter — one-time, simplified check */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-5 w-5 text-emerald-500" /><h3 className="font-bold text-sm">Implantação Starter</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Configuração profissional em até 15 dias úteis.</p>
          <p className="text-2xl font-black text-emerald-500">R$ 2.000<span className="text-xs font-normal text-muted-foreground"> (único)</span></p>
          <button onClick={() => handle('implantacao', 'Implantação Starter', 2000)}
            className={btnClass(isAdmin)} style={{ backgroundColor: '#10b981' }}>
            Contratar Implantação
          </button>
        </Card>
      </div>

      {/* UPSELL MODAL */}
      <UpsellModal item={upsellItem} onClose={() => setUpsellItem(null)} />
    </div>
  );
}

// ─── UPSELL MODAL ─────────────────────────────────────────────────────────────
function UpsellModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [payTab, setPayTab] = useState<'pix' | 'boleto' | 'cartao'>('pix');
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGeneratePix = async () => {
    setLoading(true);
    // Simulate calling Edge Function
    await new Promise(r => setTimeout(r, 1200));
    setPixCode("00020126580014BR.GOV.BCB.PIX0136example-pix-code-here5204000053039865406" + (item?.value || 0).toFixed(2) + "5802BR5913WhatsflowSaas6009SAO PAULO62070503***6304ABCD");
    setLoading(false);
  };

  const copyPix = () => { navigator.clipboard.writeText(pixCode); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => { onClose(); setStep(1); setPixCode(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Confirmar pedido" : "Forma de Pagamento"}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{item.label}</span><span className="font-bold">+R$ {item.value.toLocaleString('pt-BR')}/mês</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-bold"><span>1ª cobrança hoje</span><span className="text-primary">R$ {item.value.toLocaleString('pt-BR')}</span></div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} style={{ backgroundColor: 'var(--wl-primary)' }} className="text-white">Continuar para pagamento →</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              {(['pix', 'boleto', 'cartao'] as const).map(t => (
                <button key={t} onClick={() => setPayTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${payTab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                  {t === 'pix' ? 'PIX' : t === 'boleto' ? 'Boleto' : 'Cartão'}
                </button>
              ))}
            </div>

            {payTab === 'pix' && (
              <div className="space-y-3 text-center">
                {!pixCode ? (
                  <Button onClick={handleGeneratePix} disabled={loading} className="w-full" style={{ backgroundColor: 'var(--wl-primary)' }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar QR Code PIX'}
                  </Button>
                ) : (
                  <>
                    <div className="bg-white rounded-xl p-4 mx-auto w-32 h-32 flex items-center justify-center text-4xl">📱</div>
                    <div className="flex gap-2">
                      <input readOnly value={pixCode.substring(0, 40) + '...'} className="flex-1 bg-secondary px-3 py-2 rounded-lg text-xs font-mono" />
                      <Button size="icon" variant="outline" onClick={copyPix}>{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Aguardando confirmação... O recurso será ativado automaticamente.</p>
                  </>
                )}
              </div>
            )}
            {payTab === 'boleto' && (
              <div className="text-center space-y-3">
                <Button className="w-full" style={{ backgroundColor: 'var(--wl-primary)' }} onClick={() => { toast.success("Boleto gerado! Acesse sua caixa de email."); onClose(); }}>
                  Gerar Boleto
                </Button>
                <p className="text-xs text-muted-foreground">Após compensação (1-2 dias úteis), o recurso é ativado automaticamente.</p>
              </div>
            )}
            {payTab === 'cartao' && (
              <Button className="w-full text-white" style={{ backgroundColor: 'var(--wl-primary)' }} onClick={() => { toast.success("Pagamento aprovado! Recurso ativado."); onClose(); }}>
                Pagar R$ {item.value.toLocaleString('pt-BR')}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── LICENSE HISTORY ──────────────────────────────────────────────────────────
function LicenseHistory({ accountId }: { accountId: string }) {
  // Fake data — replace with real Supabase query once tables are migrated
  const history = [
    { id: 1, date: '2026-03-01', type: 'initial', summary: 'Conta criada via checkout', mrr_after: 359, by: 'Sistema' },
    { id: 2, date: '2026-03-10', type: 'upsell', summary: 'Ativação Módulo I.A.', mrr_after: 709, by: 'Admin' },
  ];

  const typeLabel: Record<string, string> = {
    initial: 'Criação', upsell: 'Expansão', renewal: 'Renovação', admin_edit: 'Ajuste'
  };
  const typeColor: Record<string, string> = {
    initial: 'bg-emerald-500/10 text-emerald-400', upsell: 'bg-blue-500/10 text-blue-400',
    renewal: 'bg-amber-500/10 text-amber-400', admin_edit: 'bg-slate-500/10 text-slate-400'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Histórico de Contratações</h2>
      {history.length === 0
        ? <p className="text-muted-foreground text-sm">Nenhuma alteração registrada ainda.</p>
        : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">O que mudou</th>
                    <th className="px-4 py-3 font-medium text-right">MRR após</th>
                    <th className="px-4 py-3 font-medium">Por</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(h.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeColor[h.type]}`}>{typeLabel[h.type]}</span></td>
                      <td className="px-4 py-3">{h.summary}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">R$ {h.mrr_after.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      }
    </div>
  );
}
