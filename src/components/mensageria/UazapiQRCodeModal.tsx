import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Loader2, Smartphone, QrCode as QrIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { instanceService } from "@/services/instanceService";
import { toast } from "sonner";
import type { UazapiInstance } from "./InstanceCard";

type Props = {
  instance: UazapiInstance | null;
  onClose: () => void;
  onStatusChange?: () => void;
};

export default function UazapiQRCodeModal({ instance, onClose, onStatusChange }: Props) {
  const [timer, setTimer] = useState(120);
  const [status, setStatus] = useState<"loading" | "waiting" | "connected" | "error">("loading");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [tab, setTab] = useState("qr");

  const fetchQR = useCallback(async () => {
    if (!instance) return;
    setStatus("loading");
    setQrImage(null);
    setPairCode(null);
    setErrorMsg("");
    setTimer(120);

    try {
      const data = await instanceService.connect(instance.instance_name);

      if (data?.instance?.status === "connected" || data?.state === "connected" || data?.status === "connected" || data?.status?.connected === true) {
        setStatus("connected");
        toast.success("Instância conectada com sucesso!");
        // Update DB status
        await supabase.from("whatsapp_instances").update({ status: "connected" }).eq("id", instance.id);
        onStatusChange?.();
        setTimeout(() => onClose(), 1500);
        return;
      }

      const qr = data?.instance?.qrcode || data?.qrcode || data?.qr || data?.base64 || null;
      const pc = data?.instance?.paircode || data?.paircode || null;

      if (qr) {
        setQrImage(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        setStatus("waiting");
      } else if (pc) {
        setPairCode(pc);
        setStatus("waiting");
        setTab("code");
      } else {
        setErrorMsg("QR não retornado. Verifique se a instância existe no servidor.");
        setStatus("error");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao conectar");
      setStatus("error");
    }
  }, [instance, onStatusChange]);

  const fetchPairCode = async () => {
    if (!instance || !phone) return;
    setStatus("loading");
    setPairCode(null);
    setErrorMsg("");

    try {
      const data = await instanceService.connect(instance.instance_name, phone);
      const pc = data?.instance?.paircode || data?.paircode || null;
      if (pc) {
        setPairCode(pc);
        setStatus("waiting");
      } else {
        setErrorMsg("Código de pareamento não retornado.");
        setStatus("error");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao gerar código");
      setStatus("error");
    }
  };

  // Poll status via Realtime
  useEffect(() => {
    if (!instance || status !== "waiting") return;
    const channel = supabase
      .channel(`inst-${instance.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "whatsapp_instances",
        filter: `id=eq.${instance.id}`,
      }, (payload: any) => {
        if (payload.new?.status === "connected") {
          setStatus("connected");
          toast.success("Instância conectada com sucesso!");
          onStatusChange?.();
          setTimeout(() => onClose(), 1500);
        }
        if (payload.new?.qr_code) {
          const qr = payload.new.qr_code;
          setQrImage(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [instance, status, onStatusChange, onClose]);

  // Fallback poll
  useEffect(() => {
    if (!instance || status !== "waiting") return;
    const interval = setInterval(async () => {
      try {
        const data = await instanceService.getStatus(instance.instance_name);
        const state = data?.state || data?.status || data?.instance?.state || data?.status?.state || "";
        const connected = state === "connected" || state === "open" || data?.status?.connected === true;
        if (connected) {
          setStatus("connected");
          toast.success("Instância conectada com sucesso!");
          await supabase.from("whatsapp_instances").update({ status: "connected" }).eq("id", instance.id);
          onStatusChange?.();
          setTimeout(() => onClose(), 1500);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [instance, status, onStatusChange]);

  useEffect(() => {
    if (instance) fetchQR();
  }, [instance, fetchQR]);

  // Timer countdown
  useEffect(() => {
    if (status !== "waiting" || timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [status, timer]);

  if (!instance) return null;

  return (
    <Dialog open={!!instance} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Instância</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="qr" className="flex-1 gap-1"><QrIcon className="h-3.5 w-3.5" /> QR Code</TabsTrigger>
            <TabsTrigger value="code" className="flex-1 gap-1"><Smartphone className="h-3.5 w-3.5" /> Código</TabsTrigger>
          </TabsList>

          <TabsContent value="qr">
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="w-56 h-56 rounded-xl border-2 border-dashed border-emerald-500/40 bg-muted/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-emerald-400/60" />}
                {status === "connected" && (
                  <div className="text-center space-y-2">
                    <div className="text-4xl">✓</div>
                    <p className="text-emerald-400 font-medium text-sm">Conectado!</p>
                  </div>
                )}
                {status === "error" && (
                  <div className="text-center space-y-2 px-4">
                    <p className="text-destructive text-xs">{errorMsg}</p>
                  </div>
                )}
                {status === "waiting" && qrImage && (
                  <img src={qrImage} alt="QR Code" className="w-48 h-48 object-contain" />
                )}
              </div>

              {status === "waiting" && (
                <p className="text-sm text-muted-foreground">
                  Expira em <span className={timer <= 15 ? "text-destructive font-bold" : "font-semibold"}>{timer}s</span>
                </p>
              )}

              <Button variant="outline" size="sm" onClick={fetchQR} disabled={status === "connected" || status === "loading"} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar QR
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="code">
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="w-full space-y-2">
                <Label>Número do telefone (com DDI)</Label>
                <div className="flex gap-2">
                  <Input placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Button onClick={fetchPairCode} disabled={!phone || status === "loading"} className="bg-emerald-600 hover:bg-emerald-700">
                    {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
                  </Button>
                </div>
              </div>

              {pairCode && (
                <div className="text-center space-y-2 py-4">
                  <p className="text-sm text-muted-foreground">Código de pareamento:</p>
                  <p className="text-3xl font-mono font-bold tracking-widest text-emerald-400">{pairCode}</p>
                  <p className="text-xs text-muted-foreground">Válido por 5 minutos</p>
                </div>
              )}

              {status === "connected" && (
                <div className="text-center space-y-2">
                  <div className="text-4xl">✓</div>
                  <p className="text-emerald-400 font-medium text-sm">Conectado!</p>
                </div>
              )}

              {status === "error" && <p className="text-destructive text-xs">{errorMsg}</p>}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground">
          WhatsApp → 📱 → Dispositivos Vinculados → Vincular Dispositivo
        </p>
      </DialogContent>
    </Dialog>
  );
}
