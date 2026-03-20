import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TokenStatus = "loading" | "valid" | "invalid" | "used" | "expired";

interface ActivationData {
  token: string;
  account_id: string;
  account_slug: string;
  company_name: string;
  buyer_email: string;
  wl_app_name?: string;
  wl_logo_url?: string;
  wl_primary_color?: string;
}

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: "", color: "bg-secondary", width: "0%" };
  if (pw.length < 6) return { label: "Muito fraca", color: "bg-rose-500", width: "20%" };
  if (pw.length < 8) return { label: "Fraca", color: "bg-orange-500", width: "40%" };
  if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: "Média", color: "bg-amber-400", width: "65%" };
  return { label: "Forte", color: "bg-emerald-500", width: "100%" };
}

export default function ActivationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const strength = passwordStrength(password);

  useEffect(() => {
    if (!token) { setTokenStatus("invalid"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("activation_tokens")
        .select(`
          token, account_id, status, expires_at,
          checkout_sessions (
            buyer_email, company_name,
            accounts:account_id (slug)
          )
        `)
        .eq("token", token)
        .single();

      if (error || !data) { setTokenStatus("invalid"); return; }
      if (data.status === "used") { setTokenStatus("used"); return; }
      if (new Date(data.expires_at) < new Date()) { setTokenStatus("expired"); return; }

      // Fetch optional WL branding
      const { data: account } = await supabase
        .from("accounts")
        .select("whitelabel_id, slug")
        .eq("id", data.account_id)
        .single();

      let wlBranding: Partial<ActivationData> = {};
      if (account?.whitelabel_id) {
        const { data: wb } = await supabase
          .from("whitelabel_branding")
          .select("app_name, logo_url, primary_color")
          .eq("account_id", account.whitelabel_id)
          .single();
        if (wb) {
          wlBranding = {
            wl_app_name: wb.app_name,
            wl_logo_url: wb.logo_url,
            wl_primary_color: wb.primary_color,
          };
        }
      }

      setActivationData({
        token: data.token,
        account_id: data.account_id,
        account_slug: account?.slug || "",
        company_name: (data as any).checkout_sessions?.company_name || "",
        buyer_email: (data as any).checkout_sessions?.buyer_email || "",
        ...wlBranding,
      });
      setTokenStatus("valid");
    })();
  }, [token]);

  const handleActivate = async () => {
    if (!activationData) return;
    if (password.length < 8) { toast.error("A senha precisa ter ao menos 8 caracteres."); return; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem."); return; }

    setIsActivating(true);
    try {
      // Create Supabase Auth user
      const { error: signUpErr } = await supabase.auth.signUp({
        email: activationData.buyer_email,
        password,
        options: { data: { account_id: activationData.account_id } },
      });
      if (signUpErr) throw signUpErr;

      // Mark token as used via Edge Function (server-side for security)
      await supabase.functions.invoke("activate-account", {
        body: { token: activationData.token },
      });

      toast.success(`✅ Conta ativada! Bem-vindo(a) ao ${activationData.wl_app_name || "Whatsflow"}.`);
      navigate(`/app/${activationData.account_slug}`);
    } catch (err: any) {
      toast.error("Erro ao ativar conta: " + err.message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await supabase.functions.invoke("resend-activation-email", { body: { token } });
      toast.success("Novo link de ativação enviado! Verifique seu email.");
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.");
    } finally {
      setResendLoading(false);
    }
  };

  const primaryColor = activationData?.wl_primary_color || "#10b981";
  const appName = activationData?.wl_app_name || "Whatsflow";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6"
      style={{ "--act-primary": primaryColor } as React.CSSProperties}>
      <div className="max-w-md w-full space-y-6">

        {/* LOADING */}
        {tokenStatus === "loading" && (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verificando link de ativação...</p>
          </div>
        )}

        {/* INVALID / USED / EXPIRED */}
        {(tokenStatus === "invalid" || tokenStatus === "used" || tokenStatus === "expired") && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold">
              {tokenStatus === "used" ? "Link já utilizado" : "Link inválido ou expirado"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {tokenStatus === "used"
                ? "Este link de ativação já foi usado. Se você ainda não conseguiu acessar, entre em contato com o suporte."
                : "Este link de ativação não é mais válido. Solicite um novo link abaixo."}
            </p>
            {tokenStatus !== "used" && (
              <button onClick={handleResend} disabled={resendLoading}
                className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}>
                {resendLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Solicitar novo link de ativação"}
              </button>
            )}
          </div>
        )}

        {/* VALID — ACTIVATION FORM */}
        {tokenStatus === "valid" && activationData && (
          <>
            <div className="text-center space-y-2">
              {activationData.wl_logo_url
                ? <img src={activationData.wl_logo_url} alt={appName} className="h-10 mx-auto rounded" />
                : <div className="h-10 px-4 py-2 rounded-lg font-black text-white text-sm mx-auto w-fit" style={{ backgroundColor: primaryColor }}>{appName}</div>
              }
              <div>
                <h1 className="text-2xl font-extrabold mt-4">Bem-vindo(a) ao {appName}!</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Configure sua senha para acessar a conta <strong>{activationData.company_name}</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              {/* Email (read only) */}
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail</label>
                <input readOnly value={activationData.buyer_email}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha *</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} />
                  <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all rounded-full`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{strength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Confirmar senha *</label>
                <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className={`w-full bg-background border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition ${confirmPassword && confirmPassword !== password ? "border-rose-500" : "border-border"}`} />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-rose-500">As senhas não coincidem.</p>
                )}
              </div>

              <button onClick={handleActivate} disabled={isActivating || password.length < 8 || password !== confirmPassword}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}>
                {isActivating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Ativando conta...</>
                  : <><ShieldCheck className="h-4 w-4" /> Ativar minha conta →</>
                }
              </button>
            </div>

            <div className="flex items-center gap-1 justify-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Link válido por 24h · Uso único · Seus dados estão seguros
            </div>
          </>
        )}
      </div>
    </div>
  );
}
