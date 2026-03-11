import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { messageService, formatPhone } from "@/services/messageService";
import { toast } from "sonner";
import { Send, Loader2, Type, Image, MapPin, User, CreditCard, ArrowLeft } from "lucide-react";

interface MessageComposerProps {
  onClose?: () => void;
}

export default function MessageComposer({ onClose }: MessageComposerProps) {
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [msgType, setMsgType] = useState("text");
  const [trackEnabled, setTrackEnabled] = useState(false);
  const [trackSource, setTrackSource] = useState("financeiro");
  const [trackId, setTrackId] = useState("");

  // Text
  const [text, setText] = useState("");
  // Media
  const [mediaType, setMediaType] = useState<"image" | "video" | "document" | "audio">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  // Location
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locName, setLocName] = useState("");
  // Contact
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  // PIX
  const [pixType, setPixType] = useState<"CPF" | "CNPJ" | "PHONE" | "EMAIL" | "EVP">("EVP");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("Pix");

  useEffect(() => {
    supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("provedor", "uazapi")
      .eq("status", "connected")
      .then(({ data }) => {
        if (data) setInstances(data);
      });
  }, []);

  const getTrackFields = () =>
    trackEnabled ? { track_source: trackSource, track_id: trackId || undefined } : {};

  const handleSend = async () => {
    if (!selectedInstance || !phone.trim()) {
      toast.error("Selecione uma instância e informe o número.");
      return;
    }
    setSending(true);
    try {
      const inst = instances.find((i) => i.instance_name === selectedInstance);
      if (!inst) throw new Error("Instância não encontrada");

      switch (msgType) {
        case "text":
          if (!text.trim()) { toast.error("Digite uma mensagem."); return; }
          await messageService.sendText(selectedInstance, phone, text, getTrackFields());
          break;
        case "media":
          if (!mediaUrl.trim()) { toast.error("Informe a URL do arquivo."); return; }
          await messageService.sendMedia(selectedInstance, phone, {
            type: mediaType,
            file: mediaUrl,
            text: caption,
            ...getTrackFields(),
          });
          break;
        case "location":
          if (!lat.trim() || !lng.trim()) { toast.error("Informe latitude e longitude."); return; }
          await messageService.sendLocation(selectedInstance, phone, Number(lat), Number(lng), locName, getTrackFields());
          break;
        case "contact":
          if (!contactName.trim() || !contactPhone.trim()) { toast.error("Informe nome e telefone do contato."); return; }
          await messageService.sendContact(selectedInstance, phone, {
            name: contactName,
            phone: contactPhone,
            ...getTrackFields(),
          });
          break;
        case "pix":
          if (!pixKey.trim()) { toast.error("Informe a chave PIX."); return; }
          await messageService.sendPixButton(selectedInstance, phone, {
            pixType,
            pixKey,
            pixName,
            ...getTrackFields(),
          });
          break;
      }
      toast.success("Mensagem enviada!");
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Enviar Mensagem</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instance + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-1.5">
            <Label>Número destino</Label>
            <Input placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

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
            <div className="space-y-1.5">
              <Label>Tipo de mídia</Label>
              <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL do arquivo</Label>
              <Input placeholder="https://..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Legenda (opcional)</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do local (opcional)</Label>
              <Input value={locName} onChange={(e) => setLocName(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label>Nome do contato</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="5511999999999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="pix" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label>Tipo de chave PIX</Label>
              <Select value={pixType} onValueChange={(v) => setPixType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CPF", "CNPJ", "PHONE", "EMAIL", "EVP"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chave PIX</Label>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do beneficiário</Label>
              <Input value={pixName} onChange={(e) => setPixName(e.target.value)} />
            </div>
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

        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" /> Sair
            </Button>
          )}
          <Button onClick={handleSend} disabled={sending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
