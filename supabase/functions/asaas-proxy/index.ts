/**
 * asaas-proxy
 * Multi-tenant proxy for Asaas API v3.
 * Resolves API key per tenant from asaas_connections table.
 * Supports: BYOK (tenant's own key) + Master (platform key with split).
 * Also handles setup: save-key, validate-account, setup-webhook.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 30000)));
      continue;
    }
    return response;
  }
  throw new Error(`Max retries exceeded`);
}

// ─── Resolve API key for a tenant ────────────────────────────────────────────
async function resolveApiKey(
  supabase: ReturnType<typeof createClient>,
  tenantId: string | null,
  environment: string,
): Promise<string | null> {
  // 1. Try tenant-specific key from DB
  if (tenantId) {
    const { data } = await supabase
      .from("asaas_connections")
      .select("api_key_encrypted")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();
    if (data?.api_key_encrypted) return data.api_key_encrypted;
  }

  // 2. Fallback to global env var (platform master key)
  return Deno.env.get("ASAAS_API_KEY") || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    let tenantId: string | null = null;

    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (user) {
        const { data: ut } = await supabase
          .from("user_tenants")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        tenantId = ut?.tenant_id || null;
      }
    }

    const body = await req.json();
    const {
      action,           // Special actions: "save-key", "validate-account", "setup-webhook"
      endpoint,         // API endpoint: "/customers", "/payments", etc.
      method = "GET",
      params = {},
      environment = "production",
      limit = 100,
      offset = 0,
      // save-key specific
      api_key,
    } = body;

    // ═══ ACTION: Save API Key ═══
    if (action === "save-key") {
      if (!tenantId || !api_key) return json({ error: "tenant_id e api_key obrigatórios" }, 400);

      // Validate the key by calling Asaas /myAccount
      const baseUrl = environment === "production" ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;
      const testRes = await fetch(`${baseUrl}/myAccount`, {
        headers: { "Content-Type": "application/json", access_token: api_key },
      });
      const accountData = await testRes.json();

      if (!testRes.ok) {
        return json({
          error: "API Key inválida",
          error_code: "INVALID_KEY",
          details: accountData,
        }, 400);
      }

      // Check KYC status
      const commercialStatus = accountData.commercialInfo?.status || accountData.accountNumber?.status || "UNKNOWN";
      const walletId = accountData.walletId || null;

      if (commercialStatus === "AWAITING_APPROVAL") {
        return json({
          error: "Conta Asaas aguardando aprovação",
          error_code: "KYC_PENDING",
          message: "Sua conta Asaas está com análise documental pendente. Complete a verificação no painel do Asaas antes de conectar.",
          account_status: commercialStatus,
        }, 400);
      }

      if (commercialStatus === "REJECTED") {
        return json({
          error: "Conta Asaas rejeitada",
          error_code: "KYC_REJECTED",
          message: "Sua conta Asaas foi reprovada na análise documental. Entre em contato com o suporte do Asaas.",
          account_status: commercialStatus,
        }, 400);
      }

      // Save key to DB (encrypted column — in production, use Supabase Vault)
      const { error: upsertErr } = await supabase.from("asaas_connections").upsert({
        tenant_id: tenantId,
        environment,
        api_key_encrypted: api_key,
        api_key_hint: api_key.slice(-4),
        wallet_id: walletId,
        account_status: commercialStatus || "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });

      if (upsertErr) return json({ error: upsertErr.message }, 500);

      console.log(`[asaas-proxy] API key saved for tenant ${tenantId}, env=${environment}, wallet=${walletId}`);
      return json({
        success: true,
        wallet_id: walletId,
        account_status: commercialStatus,
        message: "Chave API salva com sucesso",
      });
    }

    // ═══ ACTION: Setup Webhook ═══
    if (action === "setup-webhook") {
      const apiKey = await resolveApiKey(supabase, tenantId, environment);
      if (!apiKey) return json({ error: "API Key não configurada" }, 400);

      const baseUrl = environment === "production" ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;
      const publicUrl = Deno.env.get("SUPABASE_PUBLIC_URL") || Deno.env.get("API_EXTERNAL_URL") || "https://supabase.whatsflow.com.br";
      const webhookUrl = `${publicUrl.replace(/\/$/, "")}/functions/v1/asaas-webhook`;

      // Generate webhook token for this tenant
      const webhookToken = crypto.randomUUID().replace(/-/g, "");

      const res = await fetch(`${baseUrl}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey },
        body: JSON.stringify({
          url: webhookUrl,
          email: "",
          apiVersion: 3,
          enabled: true,
          authToken: webhookToken,
          events: [
            "PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED",
            "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
            "PAYMENT_REFUNDED", "PAYMENT_BANK_SLIP_VIEWED",
          ],
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("[asaas-proxy] Webhook setup failed:", data);
        return json({ error: "Erro ao registrar webhook", details: data }, res.status);
      }

      // Save webhook token for validation
      if (tenantId) {
        await supabase.from("asaas_connections").update({
          webhook_token: webhookToken,
          updated_at: new Date().toISOString(),
        }).eq("tenant_id", tenantId);
      }

      console.log(`[asaas-proxy] Webhook registered for tenant ${tenantId}: ${webhookUrl}`);
      return json({ success: true, webhook_id: data.id, webhook_url: webhookUrl });
    }

    // ═══ STANDARD PROXY: Forward to Asaas API ═══
    if (!endpoint) return json({ error: "endpoint is required" }, 400);

    const apiKey = await resolveApiKey(supabase, tenantId, environment)
      || api_key  // Fallback: API key passed in request body (from localStorage)
      || null;
    if (!apiKey) {
      return json({
        error: "API Key não configurada",
        error_code: "NO_API_KEY",
        message: "Configure sua chave API do Asaas em Integrações → Pagamentos & Checkout → Asaas → engrenagem",
      }, 400);
    }

    // Auto-save key to DB if found in body but not in DB (migration helper)
    if (api_key && tenantId) {
      const { data: existing } = await supabase.from("asaas_connections").select("id").eq("tenant_id", tenantId).maybeSingle();
      if (!existing) {
        await supabase.from("asaas_connections").upsert({
          tenant_id: tenantId, environment, api_key_encrypted: api_key,
          api_key_hint: api_key.slice(-4), is_active: true, updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });
        console.log(`[asaas-proxy] Auto-saved API key for tenant ${tenantId}`);
      }
    }

    const baseUrl = environment === "production" ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;
    let url = `${baseUrl}${endpoint}`;

    if (method === "GET") {
      const qp = new URLSearchParams({ limit: String(limit), offset: String(offset), ...params });
      url += `?${qp.toString()}`;
    }

    const fetchOpts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", access_token: apiKey },
    };

    if (method !== "GET" && Object.keys(params).length > 0) {
      fetchOpts.body = JSON.stringify(params);
    }

    console.log(`[asaas-proxy] ${method} ${url} (tenant=${tenantId || "global"})`);
    const response = await fetchWithRetry(url, fetchOpts);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[asaas-proxy] Error ${response.status}:`, data);
      return json({ error: "Asaas API error", status: response.status, details: data }, response.status);
    }

    return json(data);
  } catch (error: unknown) {
    console.error("[asaas-proxy] Internal error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
