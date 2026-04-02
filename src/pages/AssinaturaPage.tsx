import { fmtDate } from "@/lib/dateUtils";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserTenants } from "@/hooks/useUserTenants";
import { useLicenseLimits, getTierPrice } from "@/hooks/useLicenseLimits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, Plus, Bot, Clock, Wifi, Smartphone, Loader2, Copy, Check, DollarSign, CalendarClock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AISkillsAddons } from "@/components/assinatura/AISkillsAddons";
// pricing comes from license.pricing_config (set by Nexus admin)

const PLAN_LABELS: Record<string, string> = {
  solo_pro: "Solo Pro",
  profissional: "Profissional",
  enterprise: "Enterprise",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-emerald-400" },
  ativo: { label: "Ativo", color: "text-emerald-400" },
  ativado: { label: "Ativo", color: "text-emerald-400" },
  trial: { label: "Trial", color: "text-blue-400" },
  suspended: { label: "Suspenso", color: "text-amber-500" },
  cancelled: { label: "Cancelado", color: "text-rose-500" },
  inactive: { label: "Inativo", color: "text-muted-foreground" },
};

const FACILITE_LABELS: Record<string, string> = {
  none: "", basico: "Basico", intermediario: "Intermediario", avancado: "Avancado",
};

const TYPE_LABELS: Record<string, string> = {
  internal: "Interno",
  individual: "Individual",
  whitelabel: "WhiteLabel",
};

export default function AssinaturaPage() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const { data: userTenants } = useUserTenants();
  const tenantId = userTenants?.[0]?.tenant_id;
  const { data: limits, isLoading } = useLicenseLimits(tenantId);

  // Check if checkout/upgrade is enabled for this tenant via Pzaafi
  const { data: pzaafiLicense } = useQuery({
    queryKey: ['license-pzaafi-check', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from('licenses')
        .select('pzaafi_tier')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });
  const checkoutEnabled = !!pzaafiLicense?.pzaafi_tier;

  // Fetch tenant name + whitelabel branding
  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant-info", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, slug")
        .eq("id", tenantId)
        .maybeSingle();

      // Check if this tenant belongs to a whitelabel
      const { data: license } = await supabase
        .from("licenses")
        .select("parent_license_id, whitelabel_slug")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      let branding = null;
      if (license?.whitelabel_slug) {
        const { data: wl } = await supabase
          .from("whitelabel_config")
          .select("display_name, support_whatsapp, slug")
          .eq("slug", license.whitelabel_slug)
          .maybeSingle();
        branding = wl;
      }

      return { tenant, branding, isWlClient: !!license?.parent_license_id };
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura e Licença</h1>
          <p className="text-muted-foreground">Gerencie os limites e recursos contratados da sua conta.</p>
        </div>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhuma licença encontrada</h2>
          <p className="text-muted-foreground text-sm">
            Sua conta ainda não possui uma licença ativa. Entre em contato para ativar seu plano.
          </p>
        </Card>
      </div>
    );
  }

  const daysLeft = limits.validUntil
    ? Math.ceil((new Date(limits.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 15;
  const isTrial = limits.status === "trial";
  const statusInfo = STATUS_LABELS[limits.status] || { label: limits.status, color: "text-muted-foreground" };
  const accountName = tenantInfo?.tenant?.name || slug || "—";

  const prepareContactMessage = (resource: string) => {
    const message = `Olá! Sou ${user?.user_metadata?.full_name || "Admin"} da empresa ${accountName}. Preciso expandir: ${resource}.`;
    const wpNumber = tenantInfo?.branding?.support_whatsapp || import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER || "5511954665605";
    return `https://wa.me/${wpNumber}?text=${encodeURIComponent(message)}`;
  };

  const getContactButtonLabel = () => {
    if (tenantInfo?.isWlClient && tenantInfo.branding?.display_name) {
      return `Falar com ${tenantInfo.branding.display_name}`;
    }
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

      {/* Expiry / Trial Alert */}
      {isExpired && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-4">
          <XCircle className="h-5 w-5 text-rose-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-500">Sua licença expirou</h3>
            <p className="text-sm text-rose-500/80 mt-1">
              Entre em contato para renovar e evitar a suspensão total da conta.
            </p>
          </div>
        </div>
      )}
      {isExpiringSoon && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-500">
              {isTrial ? `Seu trial encerra em ${daysLeft} dias` : `Sua licença vencerá em ${daysLeft} dias`}
            </h3>
            <p className="text-sm text-amber-500/80 mt-1">
              {isTrial
                ? "Após o período de avaliação, contrate um plano para continuar usando."
                : "Para evitar a suspensão da conta, entre em contato para tratar a renovação."}
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Resumo — espelha Nexus License Detail */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Resumo
            </h2>
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-sm rounded-full">
              {PLAN_LABELS[limits.plan] || limits.plan}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <InfoRow label="Tipo" value={TYPE_LABELS[limits.licenseType] || limits.licenseType} />
            <InfoRow label="Plano" value={PLAN_LABELS[limits.plan] || limits.plan} />
            <InfoRow label="Status" value={statusInfo.label} valueClass={statusInfo.color} />
            <InfoRow label="Valor" value={limits.monthlyValue > 0 ? `R$ ${limits.monthlyValue.toLocaleString("pt-BR")}/mes` : "Isento"} />
            <InfoRow label="Ambiente" value={accountName} />
            <InfoRow
              label="Ativacao"
              value={limits.startsAt ? fmtDate(limits.startsAt) : "—"}
            />
            <InfoRow
              label="Vencimento"
              value={limits.validUntil
                ? `${fmtDate(limits.validUntil)} (${daysLeft! > 0 ? `${daysLeft} dias` : "expirado"})`
                : "—"}
            />
            <InfoRow
              label="Facilite"
              value={limits.facilitePlan && limits.facilitePlan !== "none" ? FACILITE_LABELS[limits.facilitePlan] || limits.facilitePlan : "—"}
            />
            <InfoRow
              label="Modulo I.A."
              value={limits.hasAiModule ? `Sim (${limits.aiAgentsLimit} agentes)` : "Nao"}
              valueClass={limits.hasAiModule ? "text-emerald-400" : "text-muted-foreground"}
            />
          </div>
        </Card>

        {/* Recursos — espelha Nexus "Recursos" */}
        <Card className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">Recursos</h2>
          <div className="space-y-5">
            <LimitBar label="Disp. Web" used={limits.currentDevicesWeb} total={limits.maxDevicesWeb} color="bg-primary" />
            <LimitBar
              label="Disp. Meta"
              used={limits.currentDevicesMeta}
              total={limits.maxDevicesMeta}
              color={limits.currentDevicesMeta >= limits.maxDevicesMeta ? "bg-amber-500" : "bg-primary"}
              warn={limits.currentDevicesMeta >= limits.maxDevicesMeta}
            />
            <LimitBar label="Atendentes" used={limits.currentAttendants} total={limits.maxAttendants} color="bg-blue-500" />
            <LimitBar label="Mensagens/mes" used={0} total={limits.monthlyMessagesLimit} color="bg-purple-500" />
            <LimitBar label="Storage" used={0} total={limits.storageLimitGb} color="bg-teal-500" suffix="GB" />

            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4">
              {limits.hasAiModule && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                  <CheckCircle2 className="h-3 w-3" /> Modulo I.A. Ativo
                </span>
              )}
              {limits.facilitePlan && limits.facilitePlan !== "none" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 uppercase font-bold tracking-wider">
                  Facilite {FACILITE_LABELS[limits.facilitePlan] || limits.facilitePlan}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Contact CTA — always visible */}
      <div className="bg-card border p-6 text-center space-y-4 mt-8">
        <h3 className="text-lg font-bold">Precisa de mais recursos?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Faça um upgrade no seu limite de dispositivos Meta, atendentes ou adicione novos módulos premium como IA.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
          <Button
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={() => window.open(prepareContactMessage("Preciso de mais recursos"), "_blank")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {getContactButtonLabel()}
          </Button>
        </div>
      </div>

      {/* AI Skills Add-ons */}
      <AISkillsAddons hasAiModule={!!limits.hasAiModule} />

      {/* Upsell Section — always visible */}
      <UpsellSection limits={limits} userRole={user?.user_metadata?.role || "admin"} />

      {/* License History */}
      <LicenseHistory tenantId={tenantId} />
    </div>
  );
}

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${valueClass || ""}`}>{value}</span>
    </div>
  );
}

// ─── LIMIT BAR ────────────────────────────────────────────────────────────────
function LimitBar({ label, used, total, color, warn, suffix }: { label: string; used: number; total: number; color: string; warn?: boolean; suffix?: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium flex items-center gap-2">
          {label}
          {warn && <AlertTriangle className="h-3 w-3 text-amber-500" />}
        </span>
        <span className="text-muted-foreground">{used} / {total}{suffix ? ` ${suffix}` : ""}</span>
      </div>
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── UPSELL SECTION ───────────────────────────────────────────────────────────
function UpsellSection({ limits, userRole }: { limits: any; userRole: string }) {
  const [upsellItem, setUpsellItem] = useState<{ type: string; label: string; value: number; qty?: number } | null>(null);
  const [qty, setQty] = useState(1);
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const pricing = limits.pricingConfig;

  const handle = (type: string, label: string, unitPrice: number, defaultQty = 1) => {
    if (!isAdmin) return;
    setQty(defaultQty);
    setUpsellItem({ type, label, value: unitPrice, qty: defaultQty });
  };

  // All prices come from license.pricing_config (set by Nexus admin)
  // Uses tier system: price depends on current quantity
  const totalWeb = limits.maxDevicesWeb;
  const unitPriceWeb = getTierPrice(pricing.device_web_tiers || [], totalWeb);
  const tierLabelWeb = `R$ ${unitPriceWeb}/un`;

  const totalMeta = limits.maxDevicesMeta;
  const unitPriceMeta = getTierPrice(pricing.device_meta_tiers || [], totalMeta);
  const tierLabelMeta = `R$ ${unitPriceMeta}/un`;

  const totalAtt = limits.maxAttendants;
  const unitPriceAtt = getTierPrice(pricing.attendant_tiers || [], totalAtt);
  const tierLabelAtt = `R$ ${unitPriceAtt}/un`;

  const btnClass = (active = true) =>
    `w-full mt-4 py-2 text-sm font-bold text-white transition-opacity ${
      active && isAdmin ? "opacity-100 hover:opacity-90 cursor-pointer" : "opacity-40 cursor-not-allowed"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Expanda seu plano</h2>
        <p className="text-muted-foreground text-sm mt-1">Contrate novos recursos diretamente aqui, sem precisar entrar em contato.</p>
        {!isAdmin && <p className="text-xs text-amber-500 mt-2">Apenas o administrador pode contratar novos recursos.</p>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Wifi className="h-5 w-5 text-primary" /><h3 className="font-bold text-sm">Dispositivos Web WhatsApp</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Conecte mais números WhatsApp à sua operação.</p>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{tierLabelWeb}</span>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">−</button>
            <span className="font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">+</button>
            <span className="ml-auto text-sm font-bold text-primary">R$ {(qty * unitPriceWeb).toLocaleString("pt-BR")}/mês</span>
          </div>
          <button onClick={() => handle("extra_web", `+${qty} Disp. Web`, unitPriceWeb, qty)} className={btnClass(isAdmin)} style={{ backgroundColor: "var(--wl-primary)" }}>Contratar</button>
        </Card>

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
          <button onClick={() => handle("extra_meta", "+1 Disp. Meta", unitPriceMeta)} className={btnClass(isAdmin)} style={{ backgroundColor: "var(--wl-primary)" }}>Contratar</button>
        </Card>

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
          <button onClick={() => handle("extra_att", "+1 Atendente", unitPriceAtt)} className={btnClass(isAdmin)} style={{ backgroundColor: "var(--wl-primary)" }}>Contratar</button>
        </Card>

        {!limits.hasAiModule && (() => {
          const iaPrice = pricing.ai_module_price;
          return (
            <Card className="p-5 border-[var(--wl-primary)]/30">
              <div className="flex items-center gap-2 mb-2"><Bot className="h-5 w-5" style={{ color: "var(--wl-primary)" }} /><h3 className="font-bold text-sm">Modulo I.A.</h3></div>
              <p className="text-xs text-muted-foreground mb-3">Automatize atendimentos com ate 5 agentes inteligentes.</p>
              <p className="text-2xl font-black" style={{ color: "var(--wl-primary)" }}>R$ {iaPrice.toLocaleString("pt-BR")}<span className="text-base font-normal text-muted-foreground">/mes</span></p>
              <button onClick={() => handle("ia_module", "Modulo I.A.", iaPrice)} className={btnClass(isAdmin)} style={{ backgroundColor: "var(--wl-primary)" }}>Ativar Modulo I.A.</button>
            </Card>
          );
        })()}

        {limits.facilitePlan !== "avancado" && (() => {
          const pBasico = pricing.facilite_basico_price;
          const pInter = pricing.facilite_intermediario_price;
          const pAvancado = pricing.facilite_avancado_price;
          return (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-purple-500" /><h3 className="font-bold text-sm">Facilite Whatsflow</h3></div>
              {(!limits.facilitePlan || limits.facilitePlan === "none") && <p className="text-xs text-muted-foreground mb-3">Suporte especializado com horas mensais dedicadas.</p>}
              {limits.facilitePlan === "basico" && <p className="text-xs text-amber-500 mb-3">Voce tem o Facilite Basico. Faca upgrade.</p>}
              {limits.facilitePlan === "intermediario" && <p className="text-xs text-amber-500 mb-3">Upgrade disponivel para Avancado (R$ {pAvancado.toLocaleString("pt-BR")}/mes).</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(!limits.facilitePlan || limits.facilitePlan === "none") && (
                  <>
                    <button onClick={() => handle("facilite_basico", "Facilite Basico", pBasico)} className="border p-2 text-xs font-bold hover:border-purple-400 transition">Basico<br />R$ {pBasico.toLocaleString("pt-BR")}</button>
                    <button onClick={() => handle("facilite_inter", "Facilite Intermediario", pInter)} className="border p-2 text-xs font-bold hover:border-purple-400 transition">Interm.<br />R$ {pInter.toLocaleString("pt-BR")}</button>
                    <button onClick={() => handle("facilite_avancado", "Facilite Avancado", pAvancado)} className="border col-span-2 p-2 text-xs font-bold hover:border-purple-400 transition">Avancado — R$ {pAvancado.toLocaleString("pt-BR")}</button>
                  </>
                )}
                {limits.facilitePlan === "basico" && (
                  <>
                    <button onClick={() => handle("facilite_inter", "Facilite Intermediario", pInter)} className="border p-2 text-xs font-bold hover:border-purple-400">Interm. R$ {pInter.toLocaleString("pt-BR")}</button>
                    <button onClick={() => handle("facilite_avancado", "Facilite Avancado", pAvancado)} className="border p-2 text-xs font-bold hover:border-purple-400">Avancado R$ {pAvancado.toLocaleString("pt-BR")}</button>
                  </>
                )}
                {limits.facilitePlan === "intermediario" && (
                  <button onClick={() => handle("facilite_avancado", "Facilite Avancado", pAvancado)} className="border p-2 text-xs font-bold col-span-2 hover:border-purple-400">Upgrade → Avancado R$ {pAvancado.toLocaleString("pt-BR")}</button>
                )}
              </div>
            </Card>
          );
        })()}

        {(() => {
          const implPrice = pricing.implantacao_price;
          return (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="h-5 w-5 text-emerald-500" /><h3 className="font-bold text-sm">Implantacao Starter</h3></div>
              <p className="text-xs text-muted-foreground mb-3">Configuracao profissional em ate 15 dias uteis.</p>
              <p className="text-2xl font-black text-emerald-500">R$ {implPrice.toLocaleString("pt-BR")}<span className="text-xs font-normal text-muted-foreground"> (unico)</span></p>
              <button onClick={() => handle("implantacao", "Implantacao Starter", implPrice)} className={btnClass(isAdmin)} style={{ backgroundColor: "#10b981" }}>Contratar Implantacao</button>
            </Card>
          );
        })()}
      </div>

      <UpsellModal item={upsellItem} onClose={() => setUpsellItem(null)} />
    </div>
  );
}

// ─── UPSELL MODAL ─────────────────────────────────────────────────────────────
function UpsellModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [payTab, setPayTab] = useState<"pix" | "boleto" | "cartao">("pix");
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGeneratePix = async () => {
    setLoading(true);
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
            <div className="border border-border bg-secondary/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{item.label}</span><span className="font-bold">+R$ {item.value.toLocaleString("pt-BR")}/mês</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-bold"><span>1ª cobrança hoje</span><span className="text-primary">R$ {item.value.toLocaleString("pt-BR")}</span></div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} style={{ backgroundColor: "var(--wl-primary)" }} className="text-white">Continuar para pagamento →</Button>
            </DialogFooter>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2 p-1 bg-secondary">
              {(["pix", "boleto", "cartao"] as const).map(t => (
                <button key={t} onClick={() => setPayTab(t)} className={`flex-1 py-2 text-sm font-bold transition-all ${payTab === t ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                  {t === "pix" ? "PIX" : t === "boleto" ? "Boleto" : "Cartão"}
                </button>
              ))}
            </div>
            {payTab === "pix" && (
              <div className="space-y-3 text-center">
                {!pixCode ? (
                  <Button onClick={handleGeneratePix} disabled={loading} className="w-full" style={{ backgroundColor: "var(--wl-primary)" }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar QR Code PIX"}
                  </Button>
                ) : (
                  <>
                    <div className="bg-white p-4 mx-auto w-32 h-32 flex items-center justify-center text-4xl">📱</div>
                    <div className="flex gap-2">
                      <input readOnly value={pixCode.substring(0, 40) + "..."} className="flex-1 bg-secondary px-3 py-2 text-xs font-mono" />
                      <Button size="icon" variant="outline" onClick={copyPix}>{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Aguardando confirmação... O recurso será ativado automaticamente.</p>
                  </>
                )}
              </div>
            )}
            {payTab === "boleto" && (
              <div className="text-center space-y-3">
                <Button className="w-full" style={{ backgroundColor: "var(--wl-primary)" }} onClick={() => { toast.success("Boleto gerado! Acesse sua caixa de email."); onClose(); }}>Gerar Boleto</Button>
                <p className="text-xs text-muted-foreground">Após compensação (1-2 dias úteis), o recurso é ativado automaticamente.</p>
              </div>
            )}
            {payTab === "cartao" && (
              <Button className="w-full text-white" style={{ backgroundColor: "var(--wl-primary)" }} onClick={() => { toast.success("Pagamento aprovado! Recurso ativado."); onClose(); }}>
                Pagar R$ {item.value.toLocaleString("pt-BR")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── LICENSE HISTORY ──────────────────────────────────────────────────────────
function LicenseHistory({ tenantId }: { tenantId?: string }) {
  const { data: history } = useQuery({
    queryKey: ["license-history", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      // Try license_history table first
      const { data } = await supabase
        .from("license_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const typeLabel: Record<string, string> = {
    initial: "Criação", upsell: "Expansão", renewal: "Renovação", admin_edit: "Ajuste", suspension: "Suspensão", reactivation: "Reativação",
  };
  const typeColor: Record<string, string> = {
    initial: "bg-emerald-500/10 text-emerald-400", upsell: "bg-blue-500/10 text-blue-400",
    renewal: "bg-amber-500/10 text-amber-400", admin_edit: "bg-slate-500/10 text-slate-400",
    suspension: "bg-rose-500/10 text-rose-400", reactivation: "bg-emerald-500/10 text-emerald-400",
  };

  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Histórico de Contratações</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">O que mudou</th>
                <th className="px-4 py-3 font-medium">Por</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any) => (
                <tr key={h.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(h.created_at)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeColor[h.change_type] || "bg-slate-500/10 text-slate-400"}`}>{typeLabel[h.change_type] || h.change_type}</span></td>
                  <td className="px-4 py-3">{h.reason || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.changed_by_role || "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
