import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { messageService } from "@/services/messageService";
import { toast } from "sonner";
import {
  Send, Loader2, Type, Image, MapPin, User, CreditCard, ArrowLeft,
  Clock, Users, Tag, X, Plus, AlertTriangle,
} from "lucide-react";

interface MessageComposerProps {
  onClose?: () => void;
}

export default function MessageComposer({ onClose }: MessageComposerProps) {
  const tenantId = useTenantId();
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [sending, setSending] = useState(false);
  const [msgType, setMsgType] = useState("text");
  const [trackEnabled, setTrackEnabled] = useState(false);
  const [trackSource, setTrackSource] = useState("financeiro");
  const [trackId, setTrackId] = useState("");

  // Mode: individual or mass
  const [mode, setMode] = useState<"individual" | "mass">("mass");

  // Individual
  const [phone, setPhone] = useState("");

  // Mass sending
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [excludeTagInput, setExcludeTagInput] = useState("");
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; failed: number } | null>(null);

  // Message fields
  const [text, setText] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "document" | "audio">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locName, setLocName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pixType, setPixType] = useState<"CPF" | "CNPJ" | "PHONE" | "EMAIL" | "EVP">("EVP");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("Pix");

  useEffect(() => {
    supabase.from("whatsapp_instances").select("*").eq("status", "connected")
      .then(({ data }) => { if (data) setInstances(data); });
  }, []);

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ["all-contact-tags", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data: contacts } = await supabase.from("crm_contacts").select("tags").eq("tenant_id", tenantId).not("tags", "is", null);
      const { data: leads } = await supabase.from("whatsapp_leads").select("lead_tags");
      const tagSet = new Set<string>();
      for (const c of contacts || []) for (const t of (c.tags as string[]) || []) tagSet.add(t);
      for (const l of leads || []) for (const t of (l.lead_tags as string[]) || []) tagSet.add(t);
      return Array.from(tagSet).sort();
    },
    enabled: !!tenantId,
  });

  // Fetch contacts matching include/exclude tags
  const { data: matchedContacts = [] } = useQuery({
    queryKey: ["mass-contacts", tenantId, includeTags, excludeTags],
    queryFn: async () => {
      if (!tenantId || includeTags.length === 0) return [];
      // Get contacts with include tags
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("id, name, phone, tags")
        .eq("tenant_id", tenantId)
        .overlaps("tags", includeTags);

      // Get leads with include tags
      const { data: leads } = await supabase
        .from("whatsapp_leads")
        .select("id, lead_name, chat_id, lead_tags");

      const all: { phone: string; name: string }[] = [];
      const seen = new Set<string>();

      for (const c of contacts || []) {
        if (!c.phone) continue;
        const tags = (c.tags as string[]) || [];
        // Exclude if has any exclude tag
        if (excludeTags.some((et) => tags.includes(et))) continue;
        if (seen.has(c.phone)) continue;
        seen.add(c.phone);
        all.push({ phone: c.phone, name: c.name || c.phone });
      }

      for (const l of leads || []) {
        const tags = (l.lead_tags as string[]) || [];
        if (!includeTags.some((it) => tags.includes(it))) continue;
        if (excludeTags.some((et) => tags.includes(et))) continue;
        const phone = l.chat_id?.replace(/@.*$/, "");
        if (!phone || seen.has(phone)) continue;
        seen.add(phone);
        all.push({ phone, name: l.lead_name || phone });
      }

      return all;
    },
    enabled: !!tenantId && includeTags.length > 0,
  });

  const getTrackFields = () => trackEnabled ? { track_source: trackSource, track_id: trackId || undefined } : {};

  const addIncludeTag = (tag: string) => {
    if (tag && !includeTags.includes(tag) && includeTags.length < 10) {
      setIncludeTags([...includeTags, tag]);
    }
    setTagInput("");
  };

  const addExcludeTag = (tag: string) => {
    if (tag && !excludeTags.includes(tag) && excludeTags.length < 5) {
      setExcludeTags([...excludeTags, tag]);
    }
    setExcludeTagInput("");
  };

  const handleSendIndividual = async () => {
    if (!selectedInstance || !phone.trim()) { toast.error("Selecione instância e número."); return; }
    setSending(true);
    try {
      if (msgType === "text" && text.trim()) {
        await messageService.sendText(selectedInstance, phone, text, getTrackFields());
      } else if (msgType === "media" && mediaUrl.trim()) {
        await messageService.sendMedia(selectedInstance, phone, { type: mediaType, file: mediaUrl, text: caption, ...getTrackFields() });
      } else if (msgType === "location" && lat && lng) {
        await messageService.sendLocation(selectedInstance, phone, Number(lat), Number(lng), locName, getTrackFields());
      } else if (msgType === "contact" && contactName && contactPhone) {
        await messageService.sendContact(selectedInstance, phone, { name: contactName, phone: contactPhone, ...getTrackFields() });
      } else if (msgType === "pix" && pixKey) {
        await messageService.sendPixButton(selectedInstance, phone, { pixType, pixKey, pixName, ...getTrackFields() });
      } else {
        toast.error("Preencha os campos da mensagem."); return;
      }
      toast.success("Mensagem enviada!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSending(false);
    }
  };

  const handleSendMass = async () => {
    if (!selectedInstance) { toast.error("Selecione uma instância."); return; }
    if (matchedContacts.length === 0) { toast.error("Nenhum contato corresponde às tags selecionadas."); return; }
    if (msgType === "text" && !text.trim()) { toast.error("Digite a mensagem."); return; }

    setSending(true);
    setSendProgress({ current: 0, total: matchedContacts.length, failed: 0 });
    let failed = 0;

    for (let i = 0; i < matchedContacts.length; i++) {
      const contact = matchedContacts[i];
      try {
        if (msgType === "text") {
          await messageService.sendText(selectedInstance, contact.phone, text, getTrackFields());
        } else if (msgType === "media") {
          await messageService.sendMedia(selectedInstance, contact.phone, { type: mediaType, file: mediaUrl, text: caption, ...getTrackFields() });
        }
      } catch {
        failed++;
      }

      setSendProgress({ current: i + 1, total: matchedContacts.length, failed });

      // Wait delay between messages (except last)
      if (i < matchedContacts.length - 1 && delaySeconds > 0) {
        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      }
    }

    setSending(false);
    setSendProgress(null);
    toast.success(`Envio concluído: ${matchedContacts.length - failed} enviados, ${failed} falhas`);
  };

  const estimatedTime = matchedContacts.length > 0
    ? Math.ceil((matchedContacts.length - 1) * delaySeconds / 60)
    : 0;

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Envios em Massa</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button variant={mode === "mass" ? "default" : "outline"} size="sm" onClick={() => setMode("mass")} className="gap-1">
            <Users size={14} /> Envio em Massa
          </Button>
          <Button variant={mode === "individual" ? "default" : "outline"} size="sm" onClick={() => setMode("individual")} className="gap-1">
            <User size={14} /> Individual
          </Button>
        </div>

        {/* Instance */}
        <div className="space-y-1.5">
          <Label>Instância</Label>
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {instances.map((i) => (
                <SelectItem key={i.instance_name} value={i.instance_name}>
                  {i.profile_name || i.label || i.instance_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "individual" ? (
          /* Individual: phone number */
          <div className="space-y-1.5">
            <Label>Número destino</Label>
            <Input placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        ) : (
          /* Mass: tag selection + delay */
          <>
            {/* Include tags */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Tag size={12} /> Tags para enviar (destinatários)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {includeTags.map((t) => (
                  <Badge key={t} className="gap-1 text-xs" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>
                    {t}
                    <button onClick={() => setIncludeTags(includeTags.filter((x) => x !== t))}><X size={10} /></button>
                  </Badge>
                ))}
              </div>
              <Select value="" onValueChange={addIncludeTag}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Adicionar tag..." /></SelectTrigger>
                <SelectContent>
                  {availableTags.filter((t) => !includeTags.includes(t)).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exclude tags (max 5) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><X size={12} className="text-red-400" /> Tags para EXCLUIR (máx. 5)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {excludeTags.map((t) => (
                  <Badge key={t} variant="destructive" className="gap-1 text-xs">
                    {t}
                    <button onClick={() => setExcludeTags(excludeTags.filter((x) => x !== t))}><X size={10} /></button>
                  </Badge>
                ))}
              </div>
              {excludeTags.length < 5 && (
                <Select value="" onValueChange={addExcludeTag}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Excluir tag..." /></SelectTrigger>
                  <SelectContent>
                    {availableTags.filter((t) => !excludeTags.includes(t) && !includeTags.includes(t)).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Delay between messages */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Clock size={12} /> Intervalo entre mensagens (segundos)</Label>
              <div className="flex items-center gap-3">
                <Input type="number" min={1} max={3600} value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center" />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {delaySeconds < 60 ? `${delaySeconds}s` : `${Math.floor(delaySeconds / 60)}min ${delaySeconds % 60}s`} entre cada envio
                </span>
              </div>
            </div>

            {/* Summary */}
            {includeTags.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                  <Users size={14} style={{ color: "var(--acc)" }} />
                  <span className="font-medium">{matchedContacts.length} contatos</span>
                  <span style={{ color: "var(--text-muted)" }}>correspondem aos filtros</span>
                </div>
                {matchedContacts.length > 0 && (
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={12} />
                    Tempo estimado: ~{estimatedTime} minuto{estimatedTime !== 1 ? "s" : ""}
                  </div>
                )}
                {excludeTags.length > 0 && (
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <AlertTriangle size={12} className="text-amber-400" />
                    Excluindo contatos com: {excludeTags.join(", ")}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Message type tabs */}
        <Tabs value={msgType} onValueChange={setMsgType}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="text" className="gap-1"><Type className="h-3.5 w-3.5" /> Texto</TabsTrigger>
            <TabsTrigger value="media" className="gap-1"><Image className="h-3.5 w-3.5" /> Mídia</TabsTrigger>
            <TabsTrigger value="location" className="gap-1"><MapPin className="h-3.5 w-3.5" /> Localização</TabsTrigger>
            <TabsTrigger value="contact" className="gap-1"><User className="h-3.5 w-3.5" /> Contato</TabsTrigger>
            <TabsTrigger value="pix" className="gap-1"><CreditCard className="h-3.5 w-3.5" /> PIX</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 pt-3">
            <Textarea placeholder="Digite sua mensagem..." value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          </TabsContent>
          <TabsContent value="media" className="space-y-3 pt-3">
            <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="audio">Áudio</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="URL do arquivo" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
            <Input placeholder="Legenda (opcional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </TabsContent>
          <TabsContent value="location" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" step="any" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
              <Input type="number" step="any" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <Input placeholder="Nome do local (opcional)" value={locName} onChange={(e) => setLocName(e.target.value)} />
          </TabsContent>
          <TabsContent value="contact" className="space-y-3 pt-3">
            <Input placeholder="Nome do contato" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input placeholder="Telefone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </TabsContent>
          <TabsContent value="pix" className="space-y-3 pt-3">
            <Select value={pixType} onValueChange={(v) => setPixType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CPF", "CNPJ", "PHONE", "EMAIL", "EVP"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Chave PIX" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            <Input placeholder="Beneficiário" value={pixName} onChange={(e) => setPixName(e.target.value)} />
          </TabsContent>
        </Tabs>

        {/* Tracking */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <Switch checked={trackEnabled} onCheckedChange={setTrackEnabled} />
          <span className="text-xs text-muted-foreground">Rastrear envio</span>
          {trackEnabled && (
            <div className="flex gap-2 flex-1">
              <Input placeholder="Origem" value={trackSource} onChange={(e) => setTrackSource(e.target.value)} className="text-xs" />
              <Input placeholder="ID externo" value={trackId} onChange={(e) => setTrackId(e.target.value)} className="text-xs" />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {sendProgress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
              <span>Enviando {sendProgress.current}/{sendProgress.total}</span>
              <span>{sendProgress.failed > 0 ? `${sendProgress.failed} falhas` : ""}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${(sendProgress.current / sendProgress.total) * 100}%`,
                background: sendProgress.failed > 0 ? "#f59e0b" : "var(--acc)",
              }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" /> Sair
            </Button>
          )}
          <Button
            onClick={mode === "individual" ? handleSendIndividual : handleSendMass}
            disabled={sending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? `Enviando... (${sendProgress?.current || 0}/${sendProgress?.total || 0})`
              : mode === "mass" ? `Enviar para ${matchedContacts.length} contatos` : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
