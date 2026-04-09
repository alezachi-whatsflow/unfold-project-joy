/**
 * asaas-setup — Smart Onboarding
 * Receives ONLY the API Key from the frontend.
 * Automatically: validates key → fetches account info → gets wallet ID → registers webhook.
 * Zero manual configuration for the user.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX = "https://sandbox.asaas.com/api/v3";
const ASAAS_PRODUCTION = "https://api.asaas.com/v3";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Types ──
interface AsaasAccount {
  id: string;
  name: string;
  email: string;
  company: string;
  companyType: string;
  cpfCnpj: string;
  walletId: string;
  tradingName?: string;
  commercialInfoExpiration?: string;
  accountNumber?: { agency: string; account: string; digit: string };
}

interface SetupResult {
  success: boolean;
  account_name: string;
  wallet_id: string;
  environment: string;
  webhook_registered: boolean;
  error?: string;
  error_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ── Authenticate caller ──
    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    // Resolve tenant
    const { data: ut } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = ut?.tenant_id;
    if (!tenantId) return json({ error: "Tenant não encontrado" }, 400);

    const { api_key, environment = "production" } = await req.json();
    if (!api_key || typeof api_key !== "string" || api_key.length < 10) {
      return json({ error: "API Key inválida", error_code: "INVALID_KEY" }, 400);
    }

    const baseUrl = environment === "sandbox" ? ASAAS_SANDBOX : ASAAS_PRODUCTION;
    const headers = { "Content-Type": "application/json", access_token: api_key };

    console.log(`[asaas-setup] Starting for tenant ${tenantId}, env=${environment}`);

    // ═══ STEP 1: Validate API Key + Get Account Info ═══
    const accountRes = await fetch(`${baseUrl}/myAccount`, { headers });
    if (!accountRes.ok) {
      const errData = await accountRes.json().catch(() => ({}));
      const errMsg = errData?.errors?.[0]?.description || "Chave de API inválida";
      console.error("[asaas-setup] Account validation failed:", errMsg);
      return json({
        error: errMsg,
        error_code: "INVALID_KEY",
        message: "Verifique se a chave está correta e se pertence ao ambiente selecionado (Sandbox/Produção).",
      }, 400);
    }

    const account: AsaasAccount = await accountRes.json();
    const walletId = account.walletId;
    const accountName = account.tradingName || account.company || account.name || "Conta Asaas";

    console.log(`[asaas-setup] Account validated: ${accountName}, wallet=${walletId}`);

    // Check commercial/KYC status
    const statusRes = await fetch(`${baseUrl}/myAccount/status`, { headers }).catch(() => null);
    let commercialStatus = "ACTIVE";
    if (statusRes?.ok) {
      const statusData = await statusRes.json().catch(() => ({}));
      commercialStatus = statusData?.general || statusData?.commercialInfo || "ACTIVE";
    }

    if (commercialStatus === "DENIED" || commercialStatus === "REJECTED") {
      return json({
        error: "Conta Asaas reprovada",
        error_code: "KYC_REJECTED",
        message: "Sua conta Asaas foi reprovada na análise. Entre em contato com o suporte do Asaas.",
      }, 400);
    }

    // ═══ STEP 2: Auto-Register Webhook ═══
    const publicBase = Deno.env.get("SUPABASE_PUBLIC_URL")
      || Deno.env.get("API_EXTERNAL_URL")
      || "https://supabase.whatsflow.com.br";
    const webhookUrl = `${publicBase.replace(/\/$/, "")}/functions/v1/asaas-webhook`;
    const webhookToken = crypto.randomUUID().replace(/-/g, "");

    let webhookRegistered = false;

    // First check if webhook already exists
    const existingRes = await fetch(`${baseUrl}/webhooks?url=${encodeURIComponent(webhookUrl)}`, { headers });
    const existingData = await existingRes.json().catch(() => ({ data: [] }));
    const existingWebhook = (existingData?.data || []).find((w: any) => w.url === webhookUrl);

    if (existingWebhook) {
      // Update existing webhook with new token
      const updateRes = await fetch(`${baseUrl}/webhooks/${existingWebhook.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          authToken: webhookToken,
          apiVersion: 3,
          events: [
            "PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED",
            "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
            "PAYMENT_REFUNDED", "PAYMENT_BANK_SLIP_VIEWED",
          ],
        }),
      });
      webhookRegistered = updateRes.ok;
      console.log(`[asaas-setup] Updated existing webhook: ${existingWebhook.id}, ok=${webhookRegistered}`);
    } else {
      // Create new webhook
      const createRes = await fetch(`${baseUrl}/webhooks`, {
        method: "POST",
        headers,
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
      const createData = await createRes.json().catch(() => ({}));
      webhookRegistered = createRes.ok;
      console.log(`[asaas-setup] Created webhook: ${createData?.id || "?"}, ok=${webhookRegistered}`);

      if (!webhookRegistered) {
        console.warn("[asaas-setup] Webhook registration failed:", JSON.stringify(createData));
      }
    }

    // ═══ STEP 3: Persist to Database (RLS via service role) ═══
    const { error: upsertErr } = await supabase.from("asaas_connections").upsert({
      tenant_id: tenantId,
      environment,
      api_key_encrypted: api_key,
      api_key_hint: api_key.slice(-6),
      wallet_id: walletId,
      webhook_token: webhookToken,
      account_status: commercialStatus,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,environment" });

    if (upsertErr) {
      console.error("[asaas-setup] DB upsert error:", upsertErr.message);
      return json({ error: "Erro ao salvar configuração", details: upsertErr.message }, 500);
    }

    console.log(`[asaas-setup] Setup complete for tenant ${tenantId}: wallet=${walletId}, webhook=${webhookRegistered}`);

    // ═══ Return Success ═══
    return json({
      success: true,
      account_name: accountName,
      wallet_id: walletId,
      environment,
      webhook_registered: webhookRegistered,
      webhook_url: webhookUrl,
    });

  } catch (err: any) {
    console.error("[asaas-setup] Error:", err);
    return json({ error: err.message || "Erro inesperado" }, 500);
  }
});
