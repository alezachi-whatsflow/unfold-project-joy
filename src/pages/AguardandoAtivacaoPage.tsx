import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SessionStatus = "loading" | "pending" | "paid" | "expired" | "cancelled";

export default function AguardandoAtivacaoPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [buyerEmail, setBuyerEmail] = useState("");

  const fetchSession = async () => {
    if (!sessionId) { setStatus("expired"); return; }
    const { data } = await supabase
      .from("checkout_sessions")
      .select("status, buyer_email")
      .eq("id", sessionId)
      .single();

    if (!data) { setStatus("expired"); return; }
    setBuyerEmail(data.buyer_email || "");
    setStatus(data.status as SessionStatus);
  };

  useEffect(() => {
    fetchSession();
    // Poll every 10s while pending
    const interval = setInterval(() => {
      setStatus(prev => {
        if (prev === "pending" || prev === "loading") fetchSession();
        return prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* LOADING */}
        {status === "loading" && (
          <>
            <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Verificando pagamento...</h1>
          </>
        )}

        {/* PENDING */}
        {status === "pending" && (
          <>
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                <RefreshCcw className="h-9 w-9 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Aguardando confirmação</h1>
            <p className="text-muted-foreground">
              Estamos aguardando a confirmação do seu pagamento. Assim que confirmado, você receberá o email de ativação em{" "}
              <strong>{buyerEmail}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">Esta página atualiza automaticamente a cada 10 segundos.</p>
          </>
        )}

        {/* PAID */}
        {status === "paid" && (
          <>
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-emerald-500">Pagamento confirmado!</h1>
            <p className="text-muted-foreground">
              Enviamos um email para <strong>{buyerEmail}</strong> com o link para criar sua senha e acessar o sistema.
            </p>
            <div className="rounded-xl border border-white/10 bg-secondary/20 p-4 text-sm text-muted-foreground">
              📬 Verifique também a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong> caso não receba em alguns minutos.
            </div>
          </>
        )}

        {/* EXPIRED / CANCELLED */}
        {(status === "expired" || status === "cancelled") && (
          <>
            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-9 w-9 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-rose-400">Link expirado</h1>
            <p className="text-muted-foreground">
              Este link de checkout expirou ou foi cancelado. Por favor, realize um novo cadastro.
            </p>
            <Link to="/checkout"
              className="inline-block px-6 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
              Novo Checkout →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
