import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone } from "lucide-react";
import type { WhatsAppInstance } from "./ConnectionCard";

type Props = {
  instance: WhatsAppInstance | null;
  onClose: () => void;
};

export default function QRCodeModal({ instance, onClose }: Props) {
  const [timer, setTimer] = useState(45);
  const [status, setStatus] = useState<"waiting" | "connected">("waiting");

  const resetTimer = useCallback(() => {
    setTimer(45);
    setStatus("waiting");
  }, []);

  useEffect(() => {
    if (!instance) return;
    resetTimer();
  }, [instance, resetTimer]);

  useEffect(() => {
    if (!instance || status === "connected") return;
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [instance, timer, status]);

  if (!instance) return null;

  return (
    <Dialog open={!!instance} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escaneie para conectar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* QR Placeholder */}
          <div className="w-56 h-56 rounded-xl border-2 border-dashed border-emerald-500/40 bg-muted/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            {status === "connected" ? (
              <div className="text-center space-y-2">
                <div className="text-4xl">✓</div>
                <p className="text-emerald-400 font-medium text-sm">Conectado!</p>
              </div>
            ) : (
              <div className="text-center space-y-2 animate-pulse">
                <Smartphone className="h-10 w-10 mx-auto text-emerald-400/60" />
                <p className="text-xs text-muted-foreground">QR Code placeholder</p>
              </div>
            )}
          </div>

          {/* Timer */}
          {status === "waiting" && (
            <p className="text-sm text-muted-foreground">
              QR expira em <span className={timer <= 10 ? "text-red-400 font-bold" : "font-semibold"}>{timer}s</span>
            </p>
          )}

          {/* Status */}
          <p className="text-sm">
            {status === "waiting" ? (
              <span className="text-yellow-400">⏳ Aguardando leitura...</span>
            ) : (
              <span className="text-emerald-400">✅ Conectado!</span>
            )}
          </p>

          <Button variant="outline" size="sm" onClick={resetTimer} disabled={status === "connected"} className="gap-2">
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
