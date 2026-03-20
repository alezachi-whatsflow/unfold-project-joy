import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Minus, Plus, Loader2, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------- TYPES ----------
type Plan = "solo_pro" | "profissional";
type FacilitePlan = "none" | "basico" | "intermediario" | "avancado";

interface CheckoutState {
  plan: Plan;
  extraDevicesWeb: number;
  extraDevicesMeta: number;
  extraAttendants: number;
  hasAiModule: boolean;
  facilitePlan: FacilitePlan;
  hasImplantacaoStarter: boolean;
}

interface PricePreview {
  monthly_value: number;
  setup_fee: number;
  first_charge: number;
}

interface WLBranding {
  app_name: string;
  logo_url: string;
  primary_color: string;
  support_whatsapp: string;
}

// ---------- PRICE HELPERS ----------
function calcTierWeb(qty: number): number {
  if (qty <= 5) return 150;
  if (qty <= 20) return 125;
  return 100;
}
function calcTierMeta(qty: number): number {
  if (qty <= 5) return 100;
  if (qty <= 20) return 80;
  return 60;
}
function calcTierAtt(qty: number): number {
  if (qty <= 5) return 80;
  if (qty <= 10) return 75;
  if (qty <= 20) return 70;
  return 60;
}
function calcFacilite(plan: FacilitePlan): number {
  if (plan === "basico") return 250;
  if (plan === "intermediario") return 700;
  if (plan === "avancado") return 1500;
  return 0;
}
function calcCheckout(s: CheckoutState): PricePreview {
  const base = s.plan === "solo_pro" ? 259 : 359;
  const web = s.extraDevicesWeb > 0 ? s.extraDevicesWeb * calcTierWeb(s.extraDevicesWeb) : 0;
  const meta = s.extraDevicesMeta > 0 ? s.extraDevicesMeta * calcTierMeta(s.extraDevicesMeta) : 0;
  const att = s.extraAttendants > 0 ? s.extraAttendants * calcTierAtt(s.extraAttendants) : 0;
  const ai = s.hasAiModule ? 350 : 0;
  const fac = calcFacilite(s.facilitePlan);
  const monthly = base + web + meta + att + ai + fac;
  const setup = s.hasImplantacaoStarter ? 2000 : 0;
  return { monthly_value: monthly, setup_fee: setup, first_charge: monthly + setup };
}

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- STEP INDICATOR ----------
function Stepper({ step }: { step: number }) {
  const steps = ["Plano", "Personalizar", "Seus Dados", "Pagamento"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? "bg-[var(--co-primary)] border-[var(--co-primary)] text-white" : i === step ? "border-[var(--co-primary)] text-[var(--co-primary)] bg-transparent" : "border-border text-muted-foreground bg-transparent"}`}>
            {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ---------- COUNTER ----------
function Counter({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-40" disabled={value <= min}>
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-8 text-center font-bold text-lg">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent transition-colors">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------- ORDER SUMMARY ----------
function OrderSummary({ state, price, onContinue }: { state: CheckoutState; price: PricePreview; onContinue: () => void }) {
  const base = state.plan === "solo_pro" ? 259 : 359;
  const items = [
    { label: `Plano ${state.plan === "solo_pro" ? "Solo Pro" : "Profissional"}`, value: base },
    state.extraDevicesWeb > 0 ? { label: `+${state.extraDevicesWeb} Disp. Web`, value: state.extraDevicesWeb * calcTierWeb(state.extraDevicesWeb) } : null,
    state.extraDevicesMeta > 0 ? { label: `+${state.extraDevicesMeta} Disp. Meta`, value: state.extraDevicesMeta * calcTierMeta(state.extraDevicesMeta) } : null,
    state.extraAttendants > 0 ? { label: `+${state.extraAttendants} Atendentes`, value: state.extraAttendants * calcTierAtt(state.extraAttendants) } : null,
    state.hasAiModule ? { label: "Módulo I.A.", value: 350 } : null,
    state.facilitePlan !== "none" ? { label: `Facilite ${state.facilitePlan}`, value: calcFacilite(state.facilitePlan) } : null,
    state.hasImplantacaoStarter ? { label: "Implantação Starter", value: 2000, oneTime: true } : null,
  ].filter(Boolean) as { label: string; value: number; oneTime?: boolean }[];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 sticky top-6">
      <h3 className="font-bold text-lg">Resumo do Pedido</h3>
      <div className="space-y-2 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted-foreground">{item.label}{item.oneTime ? " (único)" : "/mês"}</span>
            <span className="font-medium">{formatBRL(item.value)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total mensal</span><span className="font-bold">{formatBRL(price.monthly_value)}/mês</span></div>
        {price.setup_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa única</span><span className="font-bold">{formatBRL(price.setup_fee)}</span></div>}
        <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
          <span>1ª cobrança hoje</span>
          <span style={{ color: "var(--co-primary)" }}>{formatBRL(price.first_charge)}</span>
        </div>
      </div>
      <button onClick={onContinue} className="w-full py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--co-primary)" }}>
        Continuar →
      </button>
    </div>
  );
}

// ---------- MAIN COMPONENT ----------
export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const wlSlug = searchParams.get("wl");
  const sessionId = searchParams.get("session");

  const [step, setStep] = useState(0);
  const [wlBranding, setWlBranding] = useState<WLBranding | null>(null);
  const [state, setState] = useState<CheckoutState>({
    plan: "profissional",
    extraDevicesWeb: 0,
    extraDevicesMeta: 0,
    extraAttendants: 0,
    hasAiModule: false,
    facilitePlan: "none",
    hasImplantacaoStarter: false,
  });

  // Buyer form
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [document, setDocument] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Payment
  const [payTab, setPayTab] = useState<"pix" | "boleto" | "cartao">("pix");
  const [pixCode, setPixCode] = useState("");
  const [pixCopied, setPixCopied] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  const price = calcCheckout(state);

  // Load WL branding
  useEffect(() => {
    if (!wlSlug) return;
    (async () => {
      const { data } = await supabase.from("whitelabel_branding").select("*").eq("slug", wlSlug).single();
      if (data) {
        setWlBranding({
          app_name: data.app_name || "Sistema",
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#10b981",
          support_whatsapp: data.support_whatsapp || "",
        });
      }
    })();
  }, [wlSlug]);

  // Load pre-configured session (from WL-generated link)
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data } = await supabase.from("checkout_sessions").select("*").eq("id", sessionId).single();
      if (data) {
        setState({
          plan: data.plan as Plan,
          extraDevicesWeb: data.extra_devices_web,
          extraDevicesMeta: data.extra_devices_meta,
          extraAttendants: data.extra_attendants,
          hasAiModule: data.has_ai_module,
          facilitePlan: data.facilite_plan as FacilitePlan,
          hasImplantacaoStarter: data.has_implantacao_starter,
        });
        setStep(2); // Skip plan & addon steps — go straight to data
      }
    })();
  }, [sessionId]);

  // Slug validation debounce
  useEffect(() => {
    if (!companyName) return;
    setSlug(slugify(companyName));
  }, [companyName]);

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("accounts").select("id").eq("slug", slug).maybeSingle();
      setSlugStatus(data ? "taken" : "ok");
    }, 500);
    return () => clearTimeout(t);
  }, [slug]);

  const handleCreatePayment = useCallback(async () => {
    setIsCreatingSession(true);
    try {
      const { data: session, error } = await supabase.from("checkout_sessions").insert({
        checkout_type: "new_account",
        whitelabel_id: null, // populated by WL session if applicable
        buyer_name: buyerName,
        buyer_email: email,
        buyer_phone: phone,
        buyer_document: document,
        company_name: companyName,
        company_slug: slug,
        plan: state.plan,
        extra_devices_web: state.extraDevicesWeb,
        extra_devices_meta: state.extraDevicesMeta,
        extra_attendants: state.extraAttendants,
        has_ai_module: state.hasAiModule,
        facilite_plan: state.facilitePlan,
        has_implantacao_starter: state.hasImplantacaoStarter,
        billing_cycle: "monthly",
        monthly_value: price.monthly_value,
        setup_fee: price.setup_fee,
        first_charge: price.first_charge,
        status: "pending",
      }).select().single();

      if (error) throw error;
      setCheckoutSessionId(session.id);

      // Call Edge Function to create Asaas customer + PIX
      const { data: payData } = await supabase.functions.invoke("create-checkout-payment", {
        body: { session_id: session.id, payment_method: payTab },
      });

      if (payData?.pix_code) setPixCode(payData.pix_code);

    } catch (err: any) {
      toast.error("Erro ao iniciar pagamento: " + err.message);
    } finally {
      setIsCreatingSession(false);
    }
  }, [buyerName, email, phone, document, companyName, slug, state, price, payTab]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  const primaryColor = wlBranding?.primary_color || "#10b981";
  const appName = wlBranding?.app_name || "Whatsflow";

  // Inject CSS variable
  const styleVars = { "--co-primary": primaryColor } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background text-foreground" style={styleVars}>
      {/* HEADER */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        {wlBranding?.logo_url
          ? <img src={wlBranding.logo_url} alt={appName} className="h-8 rounded" />
          : <div className="h-8 px-3 py-1 rounded-lg font-black text-sm text-white" style={{ backgroundColor: primaryColor }}>{appName}</div>
        }
        <span className="text-sm text-muted-foreground">/ Criar nova conta</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <Stepper step={step} />

        {/* ===== STEP 0: PLAN SELECTION ===== */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold">Escolha seu plano</h1>
              <p className="text-muted-foreground mt-2">Comece agora. Cancele quando quiser.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {(["solo_pro", "profissional"] as Plan[]).map((p) => {
                const isSelected = state.plan === p;
                const isRecommended = p === "profissional";
                return (
                  <button key={p} onClick={() => { setState(s => ({ ...s, plan: p })); setStep(1); }}
                    className={`relative rounded-2xl border-2 p-8 text-left transition-all hover:shadow-lg ${isSelected ? "border-[var(--co-primary)] bg-[var(--co-primary)]/5" : "border-border hover:border-[var(--co-primary)]/50"}`}>
                    {isRecommended && (
                      <span className="absolute -top-3 right-4 text-[10px] font-black uppercase px-3 py-1 rounded-full text-white" style={{ backgroundColor: primaryColor }}>
                        ★ Recomendado
                      </span>
                    )}
                    <div className="text-2xl font-black mb-1">{p === "solo_pro" ? "Solo Pro" : "Profissional"}</div>
                    <div className="text-4xl font-black mb-6" style={{ color: primaryColor }}>
                      R$ {p === "solo_pro" ? "259" : "359"}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> 1 Dispositivo Web WhatsApp</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> 1 Dispositivo Meta (bônus)</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> {p === "solo_pro" ? "1 Atendente" : "3 Atendentes"}</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> CRM, Pipeline, Conversas, Financeiro</li>
                    </ul>
                    <div className="mt-6 py-3 rounded-xl font-bold text-white text-center text-sm" style={{ backgroundColor: primaryColor }}>
                      Escolher {p === "solo_pro" ? "Solo Pro" : "Profissional"} →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 1: ADD-ONS ===== */}
        {step === 1 && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold">Personalize seu plano</h1>
                <p className="text-muted-foreground mt-1">Todos os add-ons são opcionais. Ajuste conforme sua operação cresce.</p>
              </div>

              {/* Devices Web */}
              <div className="rounded-2xl border border-border p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold">Dispositivos Web WhatsApp extras</h3><p className="text-sm text-muted-foreground">Conecte mais números WhatsApp à sua operação.</p></div>
                  {state.extraDevicesWeb > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">Tier {state.extraDevicesWeb <= 5 ? "1 — R$ 150/un" : state.extraDevicesWeb <= 20 ? "2 — R$ 125/un" : "3 — R$ 100/un"}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <Counter value={state.extraDevicesWeb} onChange={v => setState(s => ({ ...s, extraDevicesWeb: v }))} />
                  {state.extraDevicesWeb > 0 && <span className="text-sm font-bold" style={{ color: primaryColor }}>{formatBRL(state.extraDevicesWeb * calcTierWeb(state.extraDevicesWeb))}/mês</span>}
                </div>
              </div>

              {/* Devices Meta */}
              <div className="rounded-2xl border border-border p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold">Dispositivos Meta Business extras</h3><p className="text-sm text-muted-foreground">Números via API oficial do Meta.</p></div>
                  {state.extraDevicesMeta > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">Tier {state.extraDevicesMeta <= 5 ? "1 — R$ 100/un" : state.extraDevicesMeta <= 20 ? "2 — R$ 80/un" : "3 — R$ 60/un"}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <Counter value={state.extraDevicesMeta} onChange={v => setState(s => ({ ...s, extraDevicesMeta: v }))} />
                  {state.extraDevicesMeta > 0 && <span className="text-sm font-bold" style={{ color: primaryColor }}>{formatBRL(state.extraDevicesMeta * calcTierMeta(state.extraDevicesMeta))}/mês</span>}
                </div>
              </div>

              {/* Attendants */}
              <div className="rounded-2xl border border-border p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold">Atendentes extras</h3><p className="text-sm text-muted-foreground">Mais usuários de atendimento na operação.</p></div>
                  {state.extraAttendants > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">Tier {state.extraAttendants <= 5 ? "1 — R$ 80/un" : state.extraAttendants <= 10 ? "2 — R$ 75/un" : state.extraAttendants <= 20 ? "3 — R$ 70/un" : "4 — R$ 60/un"}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <Counter value={state.extraAttendants} onChange={v => setState(s => ({ ...s, extraAttendants: v }))} />
                  {state.extraAttendants > 0 && <span className="text-sm font-bold" style={{ color: primaryColor }}>{formatBRL(state.extraAttendants * calcTierAtt(state.extraAttendants))}/mês</span>}
                </div>
              </div>

              {/* AI Module */}
              <div className="rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="font-bold">Módulo I.A.</h3><p className="text-sm text-muted-foreground">Até 5 agentes IA para automação de atendimento — R$ 350/mês</p></div>
                  <button onClick={() => setState(s => ({ ...s, hasAiModule: !s.hasAiModule }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.hasAiModule ? "bg-[var(--co-primary)]" : "bg-secondary"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${state.hasAiModule ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Facilite */}
              <div className="rounded-2xl border border-border p-6 space-y-3">
                <h3 className="font-bold">Facilite Whatsflow</h3>
                <p className="text-sm text-muted-foreground">Suporte especializado com horas mensais dedicadas.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["none", "basico", "intermediario", "avancado"] as FacilitePlan[]).map(f => (
                    <button key={f} onClick={() => setState(s => ({ ...s, facilitePlan: f }))}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${state.facilitePlan === f ? "border-[var(--co-primary)] bg-[var(--co-primary)]/10" : "border-border hover:border-[var(--co-primary)]/50"}`}>
                      <div className="text-xs font-bold">{f === "none" ? "Nenhum" : f === "basico" ? "Básico" : f === "intermediario" ? "Intermediário" : "Avançado"}</div>
                      {f !== "none" && <div className="text-xs text-muted-foreground mt-1">{formatBRL(calcFacilite(f))}/mês</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Implantação */}
              <div className="rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="font-bold">Implantação Starter</h3><p className="text-sm text-muted-foreground">Configuração profissional em até 15 dias úteis — R$ 2.000 (taxa única)</p></div>
                  <button onClick={() => setState(s => ({ ...s, hasImplantacaoStarter: !s.hasImplantacaoStarter }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.hasImplantacaoStarter ? "bg-[var(--co-primary)]" : "bg-secondary"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${state.hasImplantacaoStarter ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </button>
              </div>
            </div>

            <div>
              <OrderSummary state={state} price={price} onContinue={() => setStep(2)} />
            </div>
          </div>
        )}

        {/* ===== STEP 2: BUYER DATA ===== */}
        {step === 2 && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold">Seus dados</h1>
                <p className="text-muted-foreground mt-1">Essas informações serão usadas para criar sua conta.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium">Nome da empresa *</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Minha Empresa Ltda"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] transition" />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium">Endereço da conta *</label>
                  <div className="flex rounded-xl border border-border overflow-hidden focus-within:ring-2 ring-[var(--co-primary)]">
                    <span className="bg-secondary px-3 flex items-center text-sm text-muted-foreground whitespace-nowrap">app.whatsflow.com.br/app/</span>
                    <input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="minha-empresa"
                      className="flex-1 bg-background px-3 py-3 text-sm outline-none" />
                    <span className="pr-3 flex items-center">
                      {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {slugStatus === "ok" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      {slugStatus === "taken" && <span className="text-xs text-rose-500 font-bold">Indisponível</span>}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">CNPJ / CPF *</label>
                  <input value={document} onChange={e => setDocument(e.target.value)} placeholder="00.000.000/0001-00"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] transition" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">WhatsApp *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] transition" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome do responsável *</label>
                  <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="João da Silva"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] transition" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">E-mail do responsável *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="joao@empresa.com"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] transition" />
                  <p className="text-xs text-muted-foreground">Este email será o login do administrador da conta.</p>
                </div>
              </div>

              <div className="flex gap-3">
                {!sessionId && (
                  <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                )}
              </div>
            </div>

            <div>
              <OrderSummary state={state} price={price} onContinue={() => { if (slugStatus === "ok" && email && buyerName && companyName) setStep(3); else toast.error("Preencha todos os campos obrigatórios."); }} />
            </div>
          </div>
        )}

        {/* ===== STEP 3: PAYMENT ===== */}
        {step === 3 && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold">Pagamento</h1>
                <p className="text-muted-foreground mt-1">Escolha a forma de pagamento para finalizar.</p>
              </div>

              {/* Pay tabs */}
              <div className="flex gap-2 p-1 bg-secondary rounded-xl w-fit">
                {(["pix", "boleto", "cartao"] as const).map(t => (
                  <button key={t} onClick={() => setPayTab(t)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${payTab === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {t === "pix" ? "PIX" : t === "boleto" ? "Boleto" : "Cartão"}
                  </button>
                ))}
              </div>

              {/* PIX */}
              {payTab === "pix" && (
                <div className="rounded-2xl border border-border p-6 space-y-5">
                  {!pixCode ? (
                    <button onClick={handleCreatePayment} disabled={isCreatingSession}
                      className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-60"
                      style={{ backgroundColor: primaryColor }}>
                      {isCreatingSession ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</> : "Gerar QR Code PIX"}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-6 rounded-xl mx-auto w-48 h-48 flex items-center justify-center">
                        <div className="text-6xl font-black text-black text-center">📷<br /><span className="text-sm font-normal">QR Code</span></div>
                      </div>
                      <div className="flex gap-2">
                        <input readOnly value={pixCode} className="flex-1 bg-secondary px-3 py-2 rounded-lg text-xs font-mono text-muted-foreground overflow-hidden" />
                        <button onClick={copyPix} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors flex items-center gap-2 text-sm font-medium">
                          {pixCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          {pixCopied ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">Aguardando confirmação do pagamento... Após o pagamento você receberá o email de ativação.</p>
                    </div>
                  )}
                </div>
              )}

              {/* BOLETO */}
              {payTab === "boleto" && (
                <div className="rounded-2xl border border-border p-6 space-y-4 text-center">
                  <div className="text-4xl">📄</div>
                  <p className="font-medium">Gere o boleto e pague em qualquer banco ou app.</p>
                  <p className="text-sm text-muted-foreground">Após compensação (1–2 dias úteis), você receberá o link de ativação por email.</p>
                  <button onClick={handleCreatePayment} disabled={isCreatingSession}
                    className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}>
                    {isCreatingSession ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Gerar Boleto"}
                  </button>
                </div>
              )}

              {/* CARTÃO */}
              {payTab === "cartao" && (
                <div className="rounded-2xl border border-border p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium">Número do cartão</label>
                      <input placeholder="0000 0000 0000 0000" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome no cartão</label>
                      <input placeholder="JOAO DA SILVA" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Validade</label>
                        <input placeholder="MM/AA" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">CVV</label>
                        <input placeholder="123" type="password" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--co-primary)] font-mono" />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleCreatePayment} disabled={isCreatingSession}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}>
                    {isCreatingSession ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Pagar ${formatBRL(price.first_charge)}`}
                  </button>
                  <p className="text-xs text-center text-muted-foreground">🔒 Dados criptografados via Asaas. Nunca passam pelo nosso servidor.</p>
                </div>
              )}

              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            </div>

            {/* Order summary (readonly) */}
            <div>
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4 sticky top-6">
                <h3 className="font-bold">Resumo</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">{companyName || "Sua empresa"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span>{state.plan === "solo_pro" ? "Solo Pro" : "Profissional"}</span></div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between font-bold"><span>1ª cobrança</span><span style={{ color: primaryColor }}>{formatBRL(price.first_charge)}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span className="text-muted-foreground">Mensalidade</span><span>{formatBRL(price.monthly_value)}/mês</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {wlBranding?.support_whatsapp && (
        <div className="fixed bottom-4 right-4">
          <a href={`https://wa.me/${wlBranding.support_whatsapp}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg"
            style={{ backgroundColor: primaryColor }}>
            💬 Suporte
          </a>
        </div>
      )}
    </div>
  );
}
