import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Shield, RefreshCw, Webhook, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { MetaBusinessPartnerBadge } from "@/components/ui/MetaBusinessPartnerBadge";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import MetaChannelsTab from "@/components/integracoes/MetaChannelsTab";
import { CheckoutIntegrationsCard } from "@/components/settings/CheckoutIntegrationsCard";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";

const IntegracoesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedSection, setExpandedSection] = useState<string | null>("uazapi");
  const [codeCopied, setCodeCopied] = useState(false);

  // Telegram state
  const [tgToken, setTgToken] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgIntegration, setTgIntegration] = useState<any>(null);
  const [tgStep, setTgStep] = useState<"form" | "connected">("form");
  const [mlConnecting, setMlConnecting] = useState(false);
  const [mlStep, setMlStep] = useState<"credentials" | "auth" | "connected">("credentials");
  const [mlForm, setMlForm] = useState({ appId: "", clientSecret: "" });
  const [mlSaving, setMlSaving] = useState(false);
  const [mlIntegration, setMlIntegration] = useState<any>(null);
  // n8n state
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nApiKey, setN8nApiKey] = useState("");
  const [n8nSaving, setN8nSaving] = useState(false);
  const [n8nIntegration, setN8nIntegration] = useState<any>(null);
  const [n8nCopied, setN8nCopied] = useState<string | null>(null);
  const tenantId = useTenantId();

  // Asaas state
  const { environment, setEnvironment, isSyncing, syncAll } = useAsaas();
  const [testing, setTesting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [registering, setRegistering] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co"}/functions/v1/asaas-webhook`;

  const testAsaasConnection = async () => {
    setTesting(true); setApiStatus(null);
    try {
      await callAsaasProxy({ endpoint: "/customers", method: "GET", environment, limit: 1 });
      setApiStatus("ok"); toast.success("Conexão com Asaas OK!");
    } catch {
      setApiStatus("error"); toast.error("Falha na conexão com Asaas.");
    } finally { setTesting(false); }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await callAsaasProxy({ endpoint: "/webhooks", method: "GET", environment });
      setWebhooks(Array.isArray(res?.data) ? res.data : []);
    } catch { setWebhooks([]); }
    finally { setLoadingWebhooks(false); }
  };

  const registerWebhook = async () => {
    setRegistering(true);
    try {
      await callAsaasProxy({
        endpoint: "/webhooks", method: "POST", environment,
        body: { url: webhookUrl, email: "", apiVersion: 3, enabled: true,
          events: ["PAYMENT_RECEIVED","PAYMENT_CONFIRMED","PAYMENT_OVERDUE","PAYMENT_DELETED","PAYMENT_REFUNDED","PAYMENT_CREATED","PAYMENT_UPDATED"],
        },
      });
      toast.success("Webhook registrado!"); loadWebhooks();
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setRegistering(false); }
  };

  useEffect(() => { loadWebhooks(); }, [environment]);

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

  // Load n8n integration
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("channel_integrations")
      .select("id, access_token, webhook_url, status")
      .eq("tenant_id", tenantId)
      .eq("provider", "N8N")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setN8nIntegration(data);
          setN8nApiKey(data.access_token || "");
          setN8nWebhookUrl(data.webhook_url || "");
        }
      });
  }, [tenantId]);

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "wf_n8n_";
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const saveN8nIntegration = async () => {
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setN8nSaving(true);
    try {
      const apiKey = n8nApiKey || generateApiKey();
      const { data: existing } = await supabase.from("channel_integrations")
        .select("id").eq("tenant_id", tenantId).eq("provider", "N8N").maybeSingle();

      if (existing) {
        const { error } = await supabase.from("channel_integrations")
          .update({ webhook_url: n8nWebhookUrl.trim(), access_token: apiKey, status: "active", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("channel_integrations").insert({
          tenant_id: tenantId, provider: "N8N", channel_id: `n8n_${tenantId}`,
          name: "n8n Automation", access_token: apiKey, webhook_url: n8nWebhookUrl.trim(), status: "active",
        });
        if (error) throw error;
      }
      setN8nApiKey(apiKey);
      setN8nIntegration({ access_token: apiKey, webhook_url: n8nWebhookUrl.trim(), status: "active" });
      toast.success("Integração n8n salva!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setN8nSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setN8nCopied(label);
    setTimeout(() => setN8nCopied(null), 2000);
  };

  const saveTelegramBot = async () => {
    if (!tgToken.trim()) { toast.error("Informe o Bot Token"); return; }
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setTgSaving(true);
    try {
      const token = tgToken.trim();
      const sbUrl = import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co";
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

  // Handle OAuth callbacks (Meta + ML)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const mlCode = searchParams.get("code");

    if (success) {
      toast.success(
        success.includes("mercadolivre") ? "Mercado Livre conectado!" :
        success.includes("instagram") ? "Instagram conectado!" : "Conectado!"
      );
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
    }
    if (error) {
      toast.error(`Erro: ${decodeURIComponent(error)}`);
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }

    // ML OAuth callback: exchange code for tokens
    if (mlCode && tenantId) {
      setMlConnecting(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      supabase.functions.invoke("ml-oauth-callback", {
        body: { code: mlCode, tenant_id: tenantId, redirect_uri: redirectUri },
      }).then(({ data, error: invokeErr }) => {
        setMlConnecting(false);
        searchParams.delete("code");
        setSearchParams(searchParams, { replace: true });
        if (invokeErr || data?.error) {
          toast.error(`Erro ao conectar ML: ${data?.error || invokeErr?.message}`);
        } else {
          toast.success(`Mercado Livre conectado: ${data?.seller_name || "Vendedor"}`);
          setMlIntegration({ ...mlIntegration, name: data?.seller_name, ml_user_id: data?.ml_user_id, status: "active", credentials: data?.credentials });
          setMlStep("connected");
          setExpandedSection("ml");
        }
      });
    }
  }, [searchParams, setSearchParams, tenantId]);

  // Load existing ML integration
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("channel_integrations")
      .select("id, ml_app_id, ml_user_id, name, status, credentials")
      .eq("tenant_id", tenantId)
      .eq("provider", "MERCADOLIVRE")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMlIntegration(data);
          setMlForm({ appId: data.ml_app_id || "", clientSecret: "" }); // secret not shown
          if (data.status === "active" && data.ml_user_id) setMlStep("connected");
          else if (data.ml_app_id) setMlStep("auth");
          else setMlStep("credentials");
        }
      });
  }, [tenantId]);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Step 1: Save credentials to DB
  const saveMLCredentials = async () => {
    if (!mlForm.appId.trim() || !mlForm.clientSecret.trim()) {
      toast.error("Preencha App ID e Client Secret"); return;
    }
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setMlSaving(true);
    const { data: existingML } = await supabase.from("channel_integrations")
      .select("id").eq("tenant_id", tenantId).eq("provider", "MERCADOLIVRE").maybeSingle();
    let error: any = null;
    if (existingML) {
      ({ error } = await supabase.from("channel_integrations").update({
        channel_id: `ml_pending_${tenantId}`, name: "Mercado Livre (pendente)",
        ml_app_id: mlForm.appId.trim(), credentials: { client_secret: mlForm.clientSecret.trim() },
        status: "pending", updated_at: new Date().toISOString(),
      }).eq("id", existingML.id));
    } else {
      ({ error } = await supabase.from("channel_integrations").insert({
        tenant_id: tenantId, provider: "MERCADOLIVRE", channel_id: `ml_pending_${tenantId}`,
        name: "Mercado Livre (pendente)", ml_app_id: mlForm.appId.trim(),
        credentials: { client_secret: mlForm.clientSecret.trim() }, status: "pending",
        access_token: "pending",
      }));
    }
    setMlSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Credenciais salvas! Agora autentique sua conta.");
    setMlStep("auth");
  };

  // Step 2: Start OAuth using saved App ID
  const startMLOAuth = () => {
    const appId = mlForm.appId || mlIntegration?.ml_app_id;
    if (!appId) { toast.error("App ID não configurado"); return; }
    const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
    window.location.href = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}`;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Integrações</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Gerencie todas as suas conexões em um só lugar.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* WhatsApp Web (uazapi) */}
        <Card
          style={{
            border: expandedSection === "uazapi" ? "1px solid var(--inbox-active-border, rgba(14,138,92,0.25))" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("uazapi")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "uazapi" ? "var(--inbox-active-bg, rgba(14,138,92,0.08))" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="whatsapp_web" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>API WhatsApp Web</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte via QR Code — configuração automática</p>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: expandedSection === "uazapi" ? "#25D366" : "var(--border)",
            }} />
          </button>
          {expandedSection === "uazapi" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <UazapiInstancesTab />
            </div>
          )}
        </Card>

        {/* WhatsApp Cloud API + Instagram (Meta) */}
        <Card
          style={{
            border: expandedSection === "meta" ? "1px solid var(--inbox-active-border, rgba(14,138,92,0.25))" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("meta")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "meta" ? "var(--inbox-active-bg, rgba(14,138,92,0.08))" : "transparent",
              textAlign: "left",
            }}
          >
            <MetaBusinessPartnerBadge size="md" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Contas Cloud API Meta + Instagram + Facebook</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>API oficial com templates HSM</p>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: expandedSection === "meta" ? "#0088FF" : "var(--border)",
            }} />
          </button>
          {expandedSection === "meta" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <MetaChannelsTab />
            </div>
          )}
        </Card>

        {/* Mercado Livre */}
        <Card
          style={{
            border: expandedSection === "ml" ? "1px solid rgba(255,230,0,0.5)" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("ml")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "ml" ? "rgba(255,230,0,0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="mercadolivre" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mercado Livre</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Perguntas de pré-venda e mensagens de pedidos</p>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: expandedSection === "ml" ? "#FFE600" : "var(--border)",
            }} />
          </button>
          {expandedSection === "ml" && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
              {mlConnecting ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "#3483FA" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Conectando ao Mercado Livre...</span>
                </div>

              ) : mlStep === "connected" ? (
                /* ── Step 3: Connected ── */
                <div style={{ padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(52,131,250,0.08)", border: "1px solid rgba(52,131,250,0.2)" }}>
                    <ChannelIcon channel="mercadolivre" size="md" variant="rounded" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{mlIntegration?.name || "Mercado Livre"}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>ID: {mlIntegration?.ml_user_id} · {(mlIntegration?.credentials as any)?.site_id || "MLB"}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 8px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>Conectado</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("Desconectar Mercado Livre? Você perderá o acesso às mensagens e perguntas.")) return;
                      const { error } = await supabase.from("channel_integrations").delete().eq("id", mlIntegration?.id);
                      if (error) { toast.error(error.message); return; }
                      setMlIntegration(null);
                      setMlStep("credentials");
                      setMlForm({ appId: "", clientSecret: "" });
                      toast.success("Mercado Livre desconectado.");
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

              ) : mlStep === "auth" ? (
                /* ── Step 2: Credentials saved, authorize account ── */
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                    ✅ Credenciais salvas (App ID: {mlForm.appId || mlIntegration?.ml_app_id})
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                    Agora autorize sua conta no Mercado Livre para ativar a integração.
                  </p>
                  <button onClick={startMLOAuth} style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: "#FFE600", color: "#2D3277", fontSize: 13, fontWeight: 600,
                  }}>
                    <ChannelIcon channel="mercadolivre" size="sm" variant="rounded" />
                    Autenticar Conta do Mercado Livre
                  </button>
                  <button onClick={() => setMlStep("credentials")} style={{
                    display: "block", margin: "12px auto 0", background: "none", border: "none",
                    fontSize: 11, color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline",
                  }}>
                    Alterar credenciais
                  </button>
                </div>

              ) : (
                /* ── Step 1: Enter credentials ── */
                <div style={{ maxWidth: 400, margin: "0 auto" }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, textAlign: "center" }}>
                    Insira as credenciais do seu aplicativo do Mercado Livre. Você encontra em{" "}
                    <a href="https://developers.mercadolivre.com.br/detalhe_aplicacao" target="_blank" rel="noopener" style={{ color: "#3483FA", textDecoration: "underline" }}>
                      developers.mercadolivre.com.br
                    </a>
                  </p>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>App ID (Client ID)</label>
                    <input
                      value={mlForm.appId}
                      onChange={(e) => setMlForm({ ...mlForm, appId: e.target.value })}
                      placeholder="Ex: 1234567890123456"
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))",
                        color: "var(--text-primary)", outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Client Secret (Chave Secreta)</label>
                    <input
                      type="password"
                      value={mlForm.clientSecret}
                      onChange={(e) => setMlForm({ ...mlForm, clientSecret: e.target.value })}
                      placeholder="Ex: aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))",
                        color: "var(--text-primary)", outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, background: "rgba(52,131,250,0.06)", border: "1px solid rgba(52,131,250,0.15)" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#3483FA", margin: "0 0 4px" }}>URL de Redirecionamento (cole no painel do ML):</p>
                    <code style={{ fontSize: 10, color: "var(--text-secondary)", wordBreak: "break-all" }}>
                      {window.location.origin}{window.location.pathname}
                    </code>
                  </div>

                  <button
                    onClick={saveMLCredentials}
                    disabled={mlSaving || !mlForm.appId || !mlForm.clientSecret}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: (!mlForm.appId || !mlForm.clientSecret) ? "var(--border)" : "#FFE600",
                      color: (!mlForm.appId || !mlForm.clientSecret) ? "var(--text-muted)" : "#2D3277",
                      fontSize: 13, fontWeight: 600,
                      opacity: mlSaving ? 0.6 : 1,
                    }}
                  >
                    {mlSaving && <Loader2 size={14} className="animate-spin" />}
                    Salvar Credenciais
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Future: More integrations */}
        {/* Asaas (Pagamentos) */}
        <Card
          style={{
            border: expandedSection === "asaas" ? "1px solid rgba(0,166,81,0.4)" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("asaas")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "asaas" ? "rgba(0,166,81,0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#00A651", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={20} color="#FFF" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Asaas — Pagamentos & Checkout</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>PIX, Boleto, Cartão de Crédito, Webhooks e Links de Checkout</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: expandedSection === "asaas" ? "#00A651" : "var(--border)" }} />
          </button>
          {expandedSection === "asaas" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                {/* Ambiente */}
                <Card style={{ border: "1px solid var(--border)" }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4" /> Ambiente Asaas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">🧪 Sandbox (testes)</SelectItem>
                        <SelectItem value="production">🚀 Production (real)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={testAsaasConnection} disabled={testing} className="text-xs gap-1">
                        {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Testar
                      </Button>
                      {apiStatus === "ok" && <Badge className="bg-green-600 text-[9px]"><CheckCircle className="mr-1 h-3 w-3" /> OK</Badge>}
                      {apiStatus === "error" && <Badge variant="destructive" className="text-[9px]"><XCircle className="mr-1 h-3 w-3" /> Falha</Badge>}
                    </div>
                  </CardContent>
                </Card>

                {/* Sincronização */}
                <Card style={{ border: "1px solid var(--border)" }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4" /> Sincronização</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={syncAll} disabled={isSyncing} size="sm" className="w-full text-xs gap-1">
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sincronizar Tudo
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Webhooks */}
              <Card style={{ border: "1px solid var(--border)", marginTop: 16 }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm"><Webhook className="h-4 w-4" /> Webhooks Asaas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="border p-2">
                    <Label className="text-[10px] text-muted-foreground">URL do Webhook</Label>
                    <p className="font-mono text-[10px] text-foreground break-all mt-1">{webhookUrl}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={registerWebhook} disabled={registering} className="text-xs gap-1">
                    {registering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Webhook className="h-3 w-3" />} Registrar Webhook
                  </Button>
                  {webhooks.length > 0 && (
                    <div className="space-y-1">
                      {webhooks.map((wh: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 rounded border p-1.5 text-[10px]">
                          <Badge variant={wh.enabled ? "default" : "secondary"} className="text-[8px]">{wh.enabled ? "Ativo" : "Off"}</Badge>
                          <span className="font-mono text-muted-foreground truncate">{wh.url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkout */}
              <div style={{ marginTop: 16 }}>
                <CheckoutIntegrationsCard />
              </div>
            </div>
          )}
        </Card>

        {/* Telegram */}
        <Card
          style={{
            border: expandedSection === "telegram" ? "1px solid rgba(34,158,217,0.4)" : "1px solid var(--border)",
            background: "var(--bg-card)", borderRadius: 12, overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("telegram")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "telegram" ? "rgba(34,158,217,0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="telegram" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Telegram Bot</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte seu bot via BotFather para roteamento centralizado</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: expandedSection === "telegram" ? "#229ED9" : "var(--border)" }} />
          </button>
          {expandedSection === "telegram" && (
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
                      // Remove webhook from Telegram
                      if (tgIntegration?.bot_token) {
                        const sbUrl = import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co";
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

        {/* Webchat Nativo */}
        <Card
          style={{
            border: expandedSection === "webchat" ? "1px solid rgba(17,188,118,0.4)" : "1px solid var(--border)",
            background: "#FFFFFF", borderRadius: 0, overflow: "hidden", boxShadow: "none",
          }}
        >
          <button
            onClick={() => toggleSection("webchat")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "webchat" ? "rgba(17,188,118,0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="webchat" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#000", margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>Webchat Nativo</p>
              <p style={{ fontSize: 11, color: "#666", margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>Injete a infraestrutura Pzaafi diretamente no seu website.</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: expandedSection === "webchat" ? "#11bc76" : "var(--border)" }} />
          </button>
          {expandedSection === "webchat" && (
            <div style={{ padding: "20px", borderTop: "1px solid #E8E5DF" }}>

              {/* ── Two-column layout: Simulator + Instructions ── */}
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>

                {/* LEFT — Visual Simulator */}
                <div style={{ flex: "1 1 340px", minWidth: 300 }}>
                  <p style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
                    color: "#999", margin: "0 0 8px", fontFamily: "Inter, system-ui, sans-serif",
                  }}>Simulador</p>
                  <div style={{
                    background: "#EDEDED", border: "1px solid #D0D0D0", borderRadius: 0,
                    padding: 0, position: "relative", overflow: "hidden",
                    height: 320, boxShadow: "none",
                  }}>
                    {/* Fake browser chrome */}
                    <div style={{
                      background: "#E0E0E0", height: 28, display: "flex", alignItems: "center",
                      padding: "0 10px", gap: 6, borderBottom: "1px solid #D0D0D0",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{
                        flex: 1, marginLeft: 8, height: 14, background: "#FFF",
                        borderRadius: 0, border: "1px solid #D0D0D0",
                        display: "flex", alignItems: "center", padding: "0 8px",
                      }}>
                        <span style={{ fontSize: 8, color: "#999", fontFamily: "monospace" }}>seusite.com.br</span>
                      </div>
                    </div>

                    {/* Fake website content */}
                    <div style={{ padding: "24px 20px", position: "relative", height: "calc(100% - 28px)" }}>
                      <p style={{
                        fontSize: 28, fontWeight: 900, color: "#000", margin: "0 0 8px",
                        fontFamily: "Inter, system-ui, sans-serif", letterSpacing: -1, lineHeight: 1,
                      }}>PZAAFI</p>
                      <p style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase",
                        color: "#999", margin: "0 0 20px", fontFamily: "Inter, system-ui, sans-serif",
                      }}>THE PRIMORDIAL VOID</p>
                      {/* Fake content lines */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ width: "90%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "75%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "82%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "60%", height: 6, background: "#DDD" }} />
                      </div>

                      {/* Webchat widget mockup — bottom right */}
                      <div style={{
                        position: "absolute", bottom: 16, right: 16,
                        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
                      }}>
                        {/* Mini chat panel */}
                        <div style={{
                          width: 180, background: "#FFF", border: "1px solid #000",
                          borderRadius: 0, boxShadow: "none", overflow: "hidden",
                        }}>
                          <div style={{
                            background: "#000", color: "#FFF", padding: "6px 10px",
                            fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
                            fontFamily: "Inter, system-ui, sans-serif",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                            <span>CONEXÃO ATIVA</span>
                            <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.6 }}>✕</span>
                          </div>
                          <div style={{ padding: "8px", background: "#FAFAFA", minHeight: 60 }}>
                            <div style={{
                              background: "#E8E8E8", padding: "4px 8px", fontSize: 8,
                              fontFamily: "Inter, system-ui, sans-serif", color: "#333",
                              display: "inline-block", maxWidth: "85%",
                            }}>Olá! Como posso ajudar?</div>
                          </div>
                          <div style={{
                            display: "flex", borderTop: "1px solid #000",
                          }}>
                            <div style={{
                              flex: 1, padding: "5px 8px", fontSize: 8, color: "#999",
                              fontFamily: "Inter, system-ui, sans-serif",
                            }}>Digite sua mensagem...</div>
                            <div style={{
                              background: "#000", color: "#FFF", padding: "5px 8px",
                              fontSize: 7, fontWeight: 700, letterSpacing: 1,
                              fontFamily: "Inter, system-ui, sans-serif",
                              display: "flex", alignItems: "center",
                            }}>ENVIAR</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Instructions + Code */}
                <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                  <p style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
                    color: "#999", margin: "0 0 8px", fontFamily: "Inter, system-ui, sans-serif",
                  }}>Instalação DIY</p>

                  {/* Steps */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "Inter, system-ui, sans-serif",
                        minWidth: 16,
                      }}>1.</span>
                      <span style={{ fontSize: 12, color: "#333", fontFamily: "Inter, system-ui, sans-serif" }}>
                        Copie o script abaixo.
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "Inter, system-ui, sans-serif",
                        minWidth: 16,
                      }}>2.</span>
                      <span style={{ fontSize: 12, color: "#333", fontFamily: "Inter, system-ui, sans-serif" }}>
                        Cole antes da tag de fechamento{" "}
                        <code style={{
                          fontFamily: "monospace", background: "#F0F0F0", padding: "1px 4px",
                          border: "1px solid #E0E0E0", fontSize: 11,
                        }}>&lt;/body&gt;</code>{" "}do seu site.
                      </span>
                    </div>
                  </div>

                  {/* Code block — black monolith */}
                  <pre style={{
                    background: "#000000", color: "#FFFFFF",
                    padding: "16px 20px", fontSize: 12, lineHeight: 1.7,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    overflowX: "auto", border: "none", borderRadius: 0,
                    margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
                    boxShadow: "none",
                  }}>
                    <code>{`<script\n  data-tenant="${tenantId || "SEU_TENANT_ID"}"\n  src="https://cdn.pzaafi.com/webchat.js"\n></script>`}</code>
                  </pre>

                  {/* Copy button — square, white bg, black border */}
                  <button
                    onClick={() => {
                      const code = `<script data-tenant="${tenantId || "SEU_TENANT_ID"}" src="https://cdn.pzaafi.com/webchat.js"></script>`;
                      navigator.clipboard.writeText(code).then(() => {
                        setCodeCopied(true);
                        toast.success("Código copiado!");
                        setTimeout(() => setCodeCopied(false), 2000);
                      });
                    }}
                    style={{
                      display: "block", width: "100%", marginTop: 0,
                      padding: "10px", fontSize: 11, fontWeight: 700,
                      letterSpacing: 2, textTransform: "uppercase" as const,
                      fontFamily: "Inter, system-ui, sans-serif",
                      cursor: "pointer", borderRadius: 0, boxShadow: "none",
                      border: "1px solid #000", borderTop: "none",
                      background: codeCopied ? "#000" : "#FFF",
                      color: codeCopied ? "#FFF" : "#000",
                      transition: "all 0.15s",
                    }}
                  >
                    {codeCopied ? "✓ COPIADO" : "COPIAR CÓDIGO"}
                  </button>

                  {/* Tenant ID info */}
                  <div style={{
                    marginTop: 16, padding: 12, background: "#FAFAFA",
                    border: "1px solid #E8E5DF", borderRadius: 0,
                  }}>
                    <p style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
                      color: "#999", margin: "0 0 4px", fontFamily: "Inter, system-ui, sans-serif",
                    }}>Seu Tenant ID</p>
                    <code style={{
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      color: "#000", wordBreak: "break-all",
                    }}>
                      {tenantId || "Carregando..."}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* n8n Automation */}
        <Card style={{ border: expandedSection === "n8n" ? "1px solid rgba(255,106,0,0.4)" : "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, overflow: "hidden" }}>
          <button onClick={() => toggleSection("n8n")} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 20px", border: "none", cursor: "pointer", background: expandedSection === "n8n" ? "rgba(255,106,0,0.04)" : "transparent", textAlign: "left" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FF6A00", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#FFF", fontWeight: 800, fontSize: 14 }}>n8n</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>n8n — Automações</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte workflows n8n para automação bidirecional</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: n8nIntegration?.status === "active" ? "#10b981" : expandedSection === "n8n" ? "#FF6A00" : "var(--border)" }} />
          </button>
          {expandedSection === "n8n" && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>

              {/* API Key */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Sua API Key (use no n8n como Bearer Token)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={n8nApiKey} readOnly placeholder="Clique em Gerar para criar sua chave" style={{ flex: 1, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }} />
                  {!n8nApiKey ? (
                    <button onClick={() => setN8nApiKey(generateApiKey())} style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "#FF6A00", color: "#FFF", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Gerar</button>
                  ) : (
                    <button onClick={() => copyToClipboard(n8nApiKey, "apikey")} style={{ padding: "8px 12px", border: "1px solid var(--border)", background: n8nCopied === "apikey" ? "#10b981" : "transparent", color: n8nCopied === "apikey" ? "#FFF" : "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {n8nCopied === "apikey" ? "Copiado!" : "Copiar"}
                    </button>
                  )}
                </div>
              </div>

              {/* Webhook URL */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>URL do Webhook n8n (receberá as mensagens)</label>
                <input value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} placeholder="https://seu-n8n.com/webhook/abc123" style={{ width: "100%", padding: "8px 12px", fontSize: 12, border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }} />
              </div>

              {/* Save */}
              <button onClick={saveN8nIntegration} disabled={n8nSaving || (!n8nApiKey && !n8nWebhookUrl)} style={{ width: "100%", padding: "10px", border: "none", background: "#FF6A00", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: n8nSaving ? 0.6 : 1 }}>
                {n8nSaving ? "Salvando..." : n8nIntegration ? "Atualizar Integração" : "Ativar Integração"}
              </button>

              {n8nIntegration?.status === "active" && (
                <button onClick={async () => {
                  if (!confirm("Desconectar n8n? Os workflows deixarão de receber mensagens.")) return;
                  await supabase.from("channel_integrations").delete().eq("id", n8nIntegration.id);
                  setN8nIntegration(null); setN8nApiKey(""); setN8nWebhookUrl("");
                  toast.success("n8n desconectado.");
                }} style={{ width: "100%", marginTop: 8, padding: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                  Desconectar
                </button>
              )}

              {/* ── Documentation Express ── */}
              <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>Documentação Expressa</p>

                {/* Snippet 1: Payload recebido pelo n8n */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>1. Payload enviado ao seu Webhook (o que o n8n recebe):</p>
                  <div style={{ position: "relative" }}>
                    <pre style={{ background: "#1a1a1a", color: "#e0e0e0", padding: 14, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", overflow: "auto", margin: 0, lineHeight: 1.5 }}>{`{
  "contact_phone": "5511999998888",
  "text": "Olá, preciso de ajuda",
  "session_id": "5511999998888@s.whatsapp.net",
  "channel": "whatsapp_web",
  "instance_name": "MinhaInstancia",
  "sender_name": "João Silva",
  "timestamp": "2026-03-27T14:00:00Z",
  "type": "text",
  "media_url": null
}`}</pre>
                    <button onClick={() => copyToClipboard(`{
  "contact_phone": "5511999998888",
  "text": "Olá, preciso de ajuda",
  "session_id": "5511999998888@s.whatsapp.net",
  "channel": "whatsapp_web",
  "instance_name": "MinhaInstancia",
  "sender_name": "João Silva",
  "timestamp": "2026-03-27T14:00:00Z",
  "type": "text",
  "media_url": null
}`, "payload")} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", border: "none", background: n8nCopied === "payload" ? "#10b981" : "#333", color: "#FFF", fontSize: 10, cursor: "pointer" }}>
                      {n8nCopied === "payload" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
                    No n8n, use: <code style={{ background: "var(--bg-muted)", padding: "1px 4px", fontSize: 10 }}>{"{{ $json.body.text }}"}</code> para acessar o texto da mensagem.
                  </p>
                </div>

                {/* Snippet 2: Node HTTP Request para responder */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>2. Responder o cliente (Node HTTP Request no n8n):</p>
                  <div style={{ position: "relative" }}>
                    <pre style={{ background: "#1a1a1a", color: "#e0e0e0", padding: 14, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", overflow: "auto", margin: 0, lineHeight: 1.5 }}>{`// Configure um nó "HTTP Request" no n8n:
// Método: POST
// URL: ${import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co"}/functions/v1/api-n8n-inbound

// Headers:
//   Authorization: Bearer ${n8nApiKey || "<SUA_API_KEY>"}
//   Content-Type: application/json

// Body (JSON):
{
  "phone": "={{ $json.body.contact_phone }}",
  "text": "Sua resposta automática aqui"
}`}</pre>
                    <button onClick={() => copyToClipboard(JSON.stringify({
                      parameters: {
                        method: "POST",
                        url: `${import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co"}/functions/v1/api-n8n-inbound`,
                        authentication: "genericCredentialType",
                        genericAuthType: "httpHeaderAuth",
                        sendHeaders: true,
                        headerParameters: { parameters: [{ name: "Authorization", value: `Bearer ${n8nApiKey || "<SUA_API_KEY>"}` }] },
                        sendBody: true,
                        bodyParameters: { parameters: [
                          { name: "phone", value: "={{ $json.body.contact_phone }}" },
                          { name: "text", value: "Sua resposta automática aqui" },
                        ] },
                      },
                      type: "n8n-nodes-base.httpRequest",
                      typeVersion: 4.2,
                      position: [800, 300],
                      name: "Responder Whatsflow",
                    }, null, 2), "node")} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", border: "none", background: n8nCopied === "node" ? "#10b981" : "#333", color: "#FFF", fontSize: 10, cursor: "pointer" }}>
                      {n8nCopied === "node" ? "Copiado!" : "Copiar Node JSON"}
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
                    Cole o JSON copiado no n8n: Ctrl+V no canvas para importar o nó configurado.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Future */}
        <Card style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, opacity: 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={20} style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mais integrações em breve</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Email, Zapier, Make e mais</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default IntegracoesPage;
