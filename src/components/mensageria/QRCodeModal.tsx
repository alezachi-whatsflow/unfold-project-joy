import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppInstance } from "./ConnectionCard";

type Props = {
  instance: WhatsAppInstance | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string, numero?: string) => void;
};

export default function QRCodeModal({ instance, onClose, onStatusChange }: Props) {
  const [timer, setTimer] = useState(45);
  const [status, setStatus] = useState<"loading" | "waiting" | "connected" | "error">("loading");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchQR = useCallback(async () => {
    if (!instance) return;
    setStatus("loading");
    setQrImage(null);
    setErrorMsg("");
    setTimer(45);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-proxy", {
        body: { action: "qr-code", instance_id: instance.id },
      });
      if (error) {
        console.error("QR invoke error:", error);
        setErrorMsg("Erro de conexão com o servidor. Tente novamente.");
        setStatus("error");
        return;
      }
      if (data?.error) {
        setErrorMsg(data.error);
        setStatus("error");
        return;
      }
      if (data?.qr_base64) {
        const base64 = data.qr_base64;
        setQrImage(base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`);
        setStatus("waiting");
      } else {
        setErrorMsg("QR não retornado pela API. Verifique as credenciais e se a instância existe no provedor.");
        setStatus("error");
      }
    } catch (err: any) {
      console.error("QR fetch error:", err);
      setErrorMsg(err?.message || "Erro ao buscar QR Code");
      setStatus("error");
    }
  }, [instance]);

  // Poll status while waiting
  useEffect(() => {
    if (!instance || status !== "waiting") return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("whatsapp-proxy", {
          body: { action: "status", instance_id: instance.id },
        });
        if (data?.connected) {
          setStatus("connected");
          onStatusChange?.(instance.id, "connected", data.phone);
        }
      } catch {}
    }, 5000);
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
          <DialogTitle>Escaneie para conectar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="w-56 h-56 border-2 border-dashed border-emerald-500/40 bg-muted/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5" />
            {status === "loading" && (
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400/60" />
            )}
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
              QR expira em <span className={timer <= 10 ? "text-destructive font-bold" : "font-semibold"}>{timer}s</span>
            </p>
          )}

          <p className="text-sm">
            {status === "loading" && <span className="text-muted-foreground">Gerando QR Code...</span>}
            {status === "waiting" && <span className="text-yellow-400">⏳ Aguardando leitura...</span>}
            {status === "connected" && <span className="text-emerald-400">✅ Conectado!</span>}
            {status === "error" && <span className="text-destructive">❌ Erro ao gerar QR</span>}
          </p>

          <Button variant="outline" size="sm" onClick={fetchQR} disabled={status === "connected" || status === "loading"} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Gerar novo QR
          </Button>

          <p className="text-xs text-center text-muted-foreground max-w-xs">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
