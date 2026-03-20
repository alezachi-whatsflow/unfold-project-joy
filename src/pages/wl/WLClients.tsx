import { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Plus, Search, Edit, Play, Link, Copy, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FacilitePlan = "none" | "basico" | "intermediario" | "avancado";

function calcMonthly(plan: string, web: number, meta: number, att: number, ai: boolean, fac: FacilitePlan): number {
  const base = plan === "solo_pro" ? 259 : 359;
  const w = web > 0 ? web * (web <= 5 ? 150 : web <= 20 ? 125 : 100) : 0;
  const m = meta > 0 ? meta * (meta <= 5 ? 100 : meta <= 20 ? 80 : 60) : 0;
  const a = att > 0 ? att * (att <= 5 ? 80 : att <= 10 ? 75 : att <= 20 ? 70 : 60) : 0;
  const aiV = ai ? 350 : 0;
  const fV = fac === "basico" ? 250 : fac === "intermediario" ? 700 : fac === "avancado" ? 1500 : 0;
  return base + w + m + a + aiV + fV;
}

export default function WLClients() {
  const { slug } = useParams<{ slug: string }>();
  const { branding } = useOutletContext<{ branding: any }>();

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [plan, setPlan] = useState<"solo_pro" | "profissional">("profissional");
  const [web, setWeb] = useState(0);
  const [meta, setMeta] = useState(0);
  const [att, setAtt] = useState(0);
  const [ai, setAi] = useState(false);
  const [facilite, setFacilite] = useState<FacilitePlan>("none");
  const [implantacao, setImplantacao] = useState(false);
  const [customPrice, setCustomPrice] = useState(false);
  const [clientPrice, setClientPrice] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const monthly = calcMonthly(plan, web, meta, att, ai, facilite);
  const firstCharge = monthly + (implantacao ? 2000 : 0);
  const APP_URL = window.location.origin;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: wlAccount } = await supabase.from("accounts").select("id").eq("slug", slug).single();
      const { data: session } = await supabase.from("checkout_sessions").insert({
        checkout_type: "new_account",
        whitelabel_id: wlAccount?.id,
        buyer_email: "pending@checkout.com",
        plan,
        extra_devices_web: web,
        extra_devices_meta: meta,
        extra_attendants: att,
        has_ai_module: ai,
        facilite_plan: facilite,
        has_implantacao_starter: implantacao,
        billing_cycle: "monthly",
        monthly_value: customPrice && clientPrice ? parseFloat(clientPrice) : monthly,
        setup_fee: implantacao ? 2000 : 0,
        first_charge: customPrice && clientPrice ? parseFloat(clientPrice) + (implantacao ? 2000 : 0) : firstCharge,
        status: "pending",
      }).select().single();

      const link = `${APP_URL}/checkout?session=${session?.id}`;
      setGeneratedLink(link);
      setModalStep(3);
    } catch (e: any) {
      toast.error("Erro ao gerar link: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sendWhatsApp = () => {
    const msg = `Olá! Segue o link para contratar o ${branding?.app_name || "sistema"} e criar sua conta:\n${generatedLink}\n\nLink válido por 48 horas. Qualquer dúvida, estou à disposição!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Meus Clientes</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setShowModal(true); setModalStep(1); }}
            variant="outline" className="border-white/20 text-white hover:bg-white/10 font-medium">
            <Link className="h-4 w-4 mr-2" /> Gerar Link de Checkout
          </Button>
          <Button className="text-white font-semibold" style={{ backgroundColor: 'var(--wl-primary)' }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input 
              type="text"
              placeholder="Buscar cliente..." 
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white/80">
            <thead className="text-xs text-white/50 bg-white/5 uppercase border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Empresa</th>
                <th className="px-6 py-4 font-medium">Plano</th>
                <th className="px-6 py-4 font-medium">MRR</th>
                <th className="px-6 py-4 font-medium">Status / Venc.</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                  <div className="h-8 w-8 rounded text-white flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--wl-accent)' }}>
                    R
                  </div>
                  <div>
                    RadAdvogados
                    <div className="text-xs font-normal text-white/40">leonardo@radadvogados.com.br</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded text-xs bg-white/10 border border-white/10 text-white/80">
                    Profissional
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-emerald-400">R$ 3.074,00</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 w-fit rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Na Implantação
                    </span>
                    <span className="text-xs text-white/40">15/04/2026</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 px-2 h-8 text-xs font-medium border border-white/10">
                      <Play className="h-3 w-3 mr-1" /> Login Impersonator
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECKOUT LINK MODAL */}
      <Dialog open={showModal} onOpenChange={o => { if (!o) { setShowModal(false); setModalStep(1); setGeneratedLink(""); } }}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" style={{ color: 'var(--wl-primary)' }} />
              {modalStep === 1 ? "Configure o plano" : modalStep === 2 ? "Preço ao cliente" : "Link gerado!"}
            </DialogTitle>
          </DialogHeader>

          {/* STEP 1 */}
          {modalStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {(["solo_pro", "profissional"] as const).map(p => (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${plan === p ? "border-[var(--wl-primary)] bg-[var(--wl-primary)]/10" : "border-white/10 hover:border-white/20"}`}>
                    <div className="font-bold text-sm">{p === "solo_pro" ? "Solo Pro" : "Profissional"}</div>
                    <div className="text-xs opacity-60 mt-1">R$ {p === "solo_pro" ? "259" : "359"}/mês base</div>
                  </button>
                ))}
              </div>
              {[["Web WhatsApp extras", web, setWeb], ["Meta Business extras", meta, setMeta], ["Atendentes extras", att, setAtt]] .map(([label, val, setter]: any) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{label}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setter(Math.max(0, val - 1))} className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center font-bold">{val}</span>
                    <button onClick={() => setter(val + 1)} className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-sm">Módulo I.A. (R$ 350/mês)</span>
                <button onClick={() => setAi(v => !v)} className={`w-11 h-6 rounded-full transition-all relative ${ai ? "bg-[var(--wl-primary)]" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ai ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Implantação Starter (R$ 2.000 único)</span>
                <button onClick={() => setImplantacao(v => !v)} className={`w-11 h-6 rounded-full transition-all relative ${implantacao ? "bg-[var(--wl-primary)]" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${implantacao ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
                <span>MRR Preview</span>
                <span style={{ color: 'var(--wl-primary)' }}>R$ {monthly.toLocaleString('pt-BR')}/mês</span>
              </div>
              <DialogFooter>
                <Button onClick={() => setModalStep(2)} style={{ backgroundColor: 'var(--wl-primary)' }} className="text-white w-full">Próximo →</Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 2 */}
          {modalStep === 2 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-white/60">Por padrão, o cliente verá o preço padrão Whatsflow. Você pode personalizar o valor que aparecerá no checkout.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setCustomPrice(v => !v)} className={`w-11 h-6 rounded-full transition-all relative ${customPrice ? "bg-[var(--wl-primary)]" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${customPrice ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm">Personalizar preço para este cliente</span>
              </div>
              {customPrice && (
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Valor mensal que o cliente verá (mín. R$ {monthly})</label>
                  <input type="number" value={clientPrice} onChange={e => setClientPrice(e.target.value)}
                    min={monthly} placeholder={String(monthly)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white" />
                </div>
              )}
              <div className="text-xs text-white/40 border border-white/10 rounded-lg p-3 bg-white/5">
                ⚠️ Você não pode cobrar abaixo do valor de custo (R$ {monthly}/mês). Isso é validado pelo servidor.
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setModalStep(1)} className="text-white/60">← Voltar</Button>
                <Button onClick={handleGenerate} disabled={generating} style={{ backgroundColor: 'var(--wl-primary)' }} className="text-white">
                  {generating ? "Gerando..." : "🔗 Gerar Link"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 3 */}
          {modalStep === 3 && (
            <div className="space-y-4 py-2 text-center">
              <div className="text-4xl">🎉</div>
              <p className="text-sm text-white/70">Link de checkout gerado com sucesso! Compartilhe com seu cliente.</p>
              <div className="flex gap-2">
                <input readOnly value={generatedLink} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/70" />
                <Button size="icon" variant="outline" onClick={copyLink} className="border-white/20 text-white hover:bg-white/10">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={sendWhatsApp} className="w-full" style={{ backgroundColor: '#25D366' }}>
                📲 Enviar por WhatsApp
              </Button>
              <p className="text-xs text-white/30">Link válido por 48 horas.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
