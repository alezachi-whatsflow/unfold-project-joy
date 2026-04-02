import { useState, useEffect, useMemo } from "react";
import { FeatureHint } from "@/components/ui/FeatureHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Send, AlertTriangle, Zap, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { campaignService } from "@/services/campaignService";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/dateUtils";

interface Instance {
  instance_name: string;
  label: string;
  provider: "uazapi" | "meta";
}

interface HsmTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  body_text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CampaignCreateDialog({ open, onClose, onCreated }: Props) {
  const tenantId = useTenantId();
  const [creating, setCreating] = useState(false);

  // Instances (both uazapi and meta)
  const [instances, setInstances] = useState<Instance[]>([]);
  const [templates, setTemplates] = useState<HsmTemplate[]>([]);

  // Form state
  const [selectedInstance, setSelectedInstance] = useState("");
  const [name, setName] = useState("");
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(30);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Derived provider
  const provider = useMemo(() => {
    const inst = instances.find(i => i.instance_name === selectedInstance);
    return inst?.provider || null;
  }, [selectedInstance, instances]);

  // Load instances
  useEffect(() => {
    if (!open) return;
    (async () => {
      // uazapi instances
      const { data: uazapiInsts } = await (supabase as any)
        .from("whatsapp_instances")
        .select("instance_name, label")
        .eq("provedor", "uazapi")
        .eq("status", "connected");

      // Meta (WABA) integrations
      const { data: metaInsts } = await (supabase as any)
        .from("channel_integrations")
        .select("id, name, phone_number_id, display_phone_number, provider")
        .eq("provider", "WABA")
        .eq("status", "active");

      const all: Instance[] = [
        ...(uazapiInsts || []).map((i: any) => ({
          instance_name: i.instance_name,
          label: `${i.label || i.instance_name} (WhatsApp Web)`,
          provider: "uazapi" as const,
        })),
        ...(metaInsts || []).map((i: any) => ({
          instance_name: `meta:${i.phone_number_id}`,
          label: `${i.name || i.display_phone_number} (Meta API)`,
          provider: "meta" as const,
        })),
      ];
      setInstances(all);
    })();
  }, [open]);

  // Load templates when Meta selected
  useEffect(() => {
    if (provider !== "meta" || !tenantId) { setTemplates([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("hsm_templates")
        .select("id, name, language, status, category, body_text")
        .eq("tenant_id", tenantId)
        .eq("status", "APPROVED")
        .order("name");
      setTemplates(data || []);
    })();
  }, [provider, tenantId]);

  // Clean fields on provider change
  useEffect(() => {
    setMessage("");
    setSelectedTemplate("");
    setDelayMin(10);
    setDelayMax(30);
  }, [provider]);

  const selectedTemplateFull = templates.find(t => t.id === selectedTemplate);
  const contactCount = numbers.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean).length;

  const canSubmit = () => {
    if (!selectedInstance || contactCount === 0 || !name.trim()) return false;
    if (provider === "meta") return !!selectedTemplate;
    if (provider === "uazapi") return !!message.trim() && delayMin >= 5;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setCreating(true);
    try {
      const contactList = numbers.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);

      if (provider === "uazapi") {
        const result = await campaignService.createSimple(selectedInstance, {
          numbers: contactList,
          type: "text",
          text: message,
          delayMin,
          delayMax,
          scheduled_for: 0,
          info: name,
        });

        await (supabase as any).from("whatsapp_campaigns").insert({
          name,
          instance_name: selectedInstance,
          type: "simple",
          status: "scheduled",
          total_contacts: contactList.length,
          delay_min: delayMin,
          delay_max: delayMax,
          folder_id: result?.folder_id || null,
          message_type: "text",
          info: name,
          tenant_id: tenantId,
        });
      } else if (provider === "meta") {
        // Meta: send template to each contact via meta-proxy or direct API
        // For now, save campaign and mark as scheduled
        await (supabase as any).from("whatsapp_campaigns").insert({
          name,
          instance_name: selectedInstance,
          type: "template",
          status: "scheduled",
          total_contacts: contactList.length,
          message_type: "hsm",
          info: `Template: ${selectedTemplateFull?.name || selectedTemplate}`,
          tenant_id: tenantId,
        });
      }

      toast.success(`Campanha "${name}" criada com ${contactList.length} contatos!`);
      onCreated();
      onClose();
      // Reset
      setName(""); setNumbers(""); setMessage(""); setSelectedInstance(""); setSelectedTemplate("");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Falha ao criar campanha"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nova Campanha de Disparo
            <FeatureHint
              title="Campanhas Inteligentes"
              description="O formulario se adapta ao canal escolhido. Meta Cloud API usa templates aprovados. WhatsApp Web permite texto livre com delay anti-ban."
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campaign Name */}
          <div>
            <Label>Nome da Campanha *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday 2026" />
          </div>

          {/* Channel Selection */}
          <div>
            <Label>Canal de Envio *</Label>
            <Select value={selectedInstance} onValueChange={setSelectedInstance}>
              <SelectTrigger><SelectValue placeholder="Selecione a instancia..." /></SelectTrigger>
              <SelectContent>
                {instances.length === 0 && (
                  <SelectItem value="_none" disabled>Nenhuma instancia conectada</SelectItem>
                )}
                {instances.map((inst) => (
                  <SelectItem key={inst.instance_name} value={inst.instance_name}>
                    <div className="flex items-center gap-2">
                      {inst.provider === "meta" ? <Smartphone className="h-3 w-3 text-blue-500" /> : <Zap className="h-3 w-3 text-emerald-500" />}
                      {inst.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {provider && (
              <Badge variant="outline" className="mt-1 text-[10px]">
                {provider === "meta" ? "Meta Cloud API — Templates obrigatorios" : "uazapi — Texto livre + Delay anti-ban"}
              </Badge>
            )}
          </div>

          {/* ═══ CONDITIONAL: Meta Cloud API ═══ */}
          {provider === "meta" && (
            <div className="space-y-3 p-3 border border-blue-500/20 rounded-lg bg-blue-500/5">
              <p className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Envio via Meta Cloud API
              </p>

              <div>
                <Label>Template Aprovado *</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 && (
                      <SelectItem value="_none" disabled>Nenhum template aprovado</SelectItem>
                    )}
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.language}) — {t.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplateFull && (
                <div className="bg-muted/50 p-3 rounded text-xs">
                  <p className="font-semibold mb-1">Preview:</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{selectedTemplateFull.body_text}</p>
                </div>
              )}

              <div className="flex items-start gap-2 text-[10px] text-blue-500/80">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>A Meta exige templates pre-aprovados para iniciar conversas. O throughput e gerenciado pela API oficial.</span>
              </div>
            </div>
          )}

          {/* ═══ CONDITIONAL: uazapi (WhatsApp Web) ═══ */}
          {provider === "uazapi" && (
            <div className="space-y-3 p-3 border border-emerald-500/20 rounded-lg bg-emerald-500/5">
              <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" /> Envio via WhatsApp Web (uazapi)
              </p>

              <div>
                <Label>Mensagem *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Digite a mensagem que sera enviada para todos os contatos..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variaveis: {"{{nome}}"}, {"{{empresa}}"}, {"{{telefone}}"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Delay Minimo (seg) *</Label>
                  <Input
                    type="number"
                    min={5}
                    value={delayMin}
                    onChange={(e) => setDelayMin(Math.max(5, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <Label>Delay Maximo (seg)</Label>
                  <Input
                    type="number"
                    min={delayMin}
                    value={delayMax}
                    onChange={(e) => setDelayMax(Math.max(delayMin, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-[10px] text-amber-500">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Delay obrigatorio para evitar ban. Recomendado: minimo 10s, maximo 30s.</span>
              </div>
            </div>
          )}

          {/* Contacts */}
          <div>
            <Label>Contatos * <span className="text-muted-foreground font-normal">({contactCount} numeros)</span></Label>
            <Textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={4}
              placeholder="Cole os numeros separados por linha, virgula ou ponto-e-virgula:&#10;5511999998888&#10;5511888887777"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || creating}
            className="gap-1"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {creating ? "Criando..." : `Criar Campanha (${contactCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
