import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

interface TelegramSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

const TelegramSection = ({ expanded, onToggle }: TelegramSectionProps) => {
  const [tgToken, setTgToken] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgIntegration, setTgIntegration] = useState<any>(null);
  const [tgStep, setTgStep] = useState<"form" | "connected">("form");
  const tenantId = useTenantId();

  // Load existing Telegram integration
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("channel_integrations")
      .select("id, bot_token, bot_username, name, status")
      .eq("tenant_id", tenantId)
      .eq("provider", "TELEGRAM")
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.status === "active") {
          setTgIntegration(data);
          setTgStep("connected");
        }
      });
  }, [tenantId]);

  const saveTelegramBot = async () => {
    if (!tgToken.trim()) { toast.error("Informe o Bot Token"); return; }
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setTgSaving(true);
    try {
      const token = tgToken.trim();
      const sbUrl = import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br";
      const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // 1. Validate token via Edge Function proxy (avoids CORS)
      const meRes = await fetch(`${sbUrl}/functions/v1/telegram-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sbKey}` },
        body: JSON.stringify({ action: "getMe", bot_token: token }),
      });
      const meData = await meRes.json();
      if (meData.error) throw new Error(meData.error);
      const me = meData.result || meData;
      const botId = me.id || me.result?.id;
      const botUsername = me.username || me.result?.username || "";
      const botName = me.first_name || me.result?.first_name || `Bot @${botUsername}`;

      if (!botId) throw new Error("Token inválido — não foi possível obter o ID do bot");

      const webhookUrl = `${sbUrl}/functions/v1/telegram-webhook?token=${encodeURIComponent(token)}`;

      // 2. Save to DB — check if exists first, then update or insert
      const channelId = `tg_${botId}`;
      const { data: existing } = await supabase.from("channel_integrations")
        .select("id").eq("tenant_id", tenantId).eq("provider", "TELEGRAM").maybeSingle();

      if (existing) {
        const { error } = await supabase.from("channel_integrations")
          .update({ channel_id: channelId, name: botName, bot_token: token, bot_username: botUsername, webhook_url: webhookUrl, status: "active", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("channel_integrations").insert({
          tenant_id: tenantId, provider: "TELEGRAM", channel_id: channelId, name: botName,
          bot_token: token, bot_username: botUsername, webhook_url: webhookUrl, status: "active",
          access_token: token,
        });
        if (error) throw error;
      }

      // 3. Auto-register webhook via Edge Function proxy
      await fetch(`${sbUrl}/functions/v1/telegram-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sbKey}` },
        body: JSON.stringify({ action: "setWebhook", bot_token: token, url: webhookUrl }),
      });

      setTgIntegration({ bot_username: botUsername, name: botName, status: "active" });
      setTgStep("connected");
      setTgToken("");
      toast.success(`Bot @${botUsername} conectado! Webhook configurado automaticamente.`);
    } catch (err: any) {
      console.error("saveTelegramBot error:", err);
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setTgSaving(false);
    }
  };

  return (
    <Card
      style={{
        border: expanded ? "1px solid rgba(34,158,217,0.4)" : "1px solid var(--border)",
        background: "var(--bg-card)", borderRadius: 12, overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "16px 20px", border: "none", cursor: "pointer",
          background: expanded ? "rgba(34,158,217,0.06)" : "transparent",
          textAlign: "left",
        }}
      >
        <ChannelIcon channel="telegram" size="lg" variant="icon" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Telegram Bot</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte seu bot via BotFather para roteamento centralizado</p>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: expanded ? "#229ED9" : "var(--border)" }} />
      </button>
      {expanded && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          {tgStep === "connected" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(34,158,217,0.08)", border: "1px solid rgba(34,158,217,0.2)" }}>
                <ChannelIcon channel="telegram" size="md" variant="rounded" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{tgIntegration?.name || "Telegram Bot"}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>@{tgIntegration?.bot_username} · Webhook ativo</p>
                </div>
                <span style={{ fontSize: 10, padding: "3px 8px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>Conectado</span>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Desconectar Telegram Bot? O webhook será removido.")) return;
                  if (tgIntegration?.bot_token) {
                    const sbUrl = import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br";
                    const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    await fetch(`${sbUrl}/functions/v1/telegram-send`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sbKey}` },
                      body: JSON.stringify({ action: "setWebhook", bot_token: tgIntegration.bot_token, url: "" }),
                    });
                  }
                  const { error } = await supabase.from("channel_integrations").delete().eq("id", tgIntegration?.id);
                  if (error) { toast.error(error.message); return; }
                  setTgIntegration(null);
                  setTgStep("form");
                  setTgToken("");
                  toast.success("Telegram Bot desconectado.");
                }}
                style={{
                  marginTop: 12, padding: "8px 16px", border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-muted)", fontSize: 12,
                  cursor: "pointer", width: "100%",
                }}
              >
                Desconectar
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, textAlign: "center" }}>
                Insira o token gerado pelo{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: "#229ED9", textDecoration: "underline" }}>@BotFather</a>
                {" "}no Telegram.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Bot Token</label>
                <input
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="Ex: 123456789:AABBccDDee..."
                  type="password"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 0, fontSize: 13, fontFamily: "monospace",
                    border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))",
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>
              <button
                onClick={saveTelegramBot}
                disabled={tgSaving || !tgToken.trim()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", padding: "10px", borderRadius: 0, cursor: "pointer",
                  border: "none",
                  background: !tgToken.trim() ? "var(--border)" : "#000000",
                  color: !tgToken.trim() ? "var(--text-muted)" : "#FFFFFF",
                  fontSize: 13, fontWeight: 600,
                  opacity: tgSaving ? 0.6 : 1,
                }}
              >
                {tgSaving && <Loader2 size={14} className="animate-spin" />}
                Salvar Token
              </button>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 12, textAlign: "center" }}>
                O webhook será configurado automaticamente após salvar.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TelegramSection;
