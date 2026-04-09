/**
 * asaas-setup — Smart Onboarding (Plug & Play)
 * User provides ONLY the API Key.
 * System: auto-detects environment → validates → fetches wallet → registers webhook.
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

/** Build Asaas headers — strictly per Asaas docs: access_token header (NOT Authorization Bearer) */
function asaasHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "access_token": apiKey,
  };
}

/** Auto-detect environment from API Key prefix */
function detectEnvironment(apiKey: string): "sandbox" | "production" {
  const key = apiKey.trim().toLowerCase();
  if (key.includes("sandbox") || key.includes("_test_") || key.startsWith("$aact_ytm")) return "sandbox";
  if (key.includes("_prod_") || key.startsWith("$aact_prod")) return "production";
  // Heuristic: production keys are typically longer
  return "production";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ── Authenticate caller via Supabase JWT ──
    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { data: ut } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = ut?.tenant_id;
    if (!tenantId) return json({ error: "Tenant não encontrado" }, 400);

    const body = await req.json();
    const apiKey = (body.api_key || "").trim();
    if (!apiKey || apiKey.length < 10) {
      return json({ error: "API Key inválida", error_code: "INVALID_KEY" }, 400);
    }

    // Auto-detect environment from key prefix (user can override)
    const environment = body.environment || detectEnvironment(apiKey);
    const baseUrl = environment === "sandbox" ? ASAAS_SANDBOX : ASAAS_PRODUCTION;
    const headers = asaasHeaders(apiKey);

    console.log(`[asaas-setup] Starting: tenant=${tenantId}, env=${environment}, key=${apiKey.substring(0, 15)}...`);

    // ═══ STEP 1: Validate API Key via /myAccount ═══
    const accountRes = await fetch(`${baseUrl}/myAccount`, { method: "GET", headers });

    if (!accountRes.ok) {
      const status = accountRes.status;
      const errBody = await accountRes.json().catch(() => ({}));
      const errMsg = errBody?.errors?.[0]?.description || `Erro ${status}`;
      console.error(`[asaas-setup] Validation failed (${status}):`, JSON.stringify(errBody));

      // If 401 on production, try sandbox automatically
      if (status === 401 && environment === "production") {
        console.log("[asaas-setup] Retrying with sandbox...");
        const sandboxRes = await fetch(`${ASAAS_SANDBOX}/myAccount`, { method: "GET", headers });
        if (sandboxRes.ok) {
          // Recursion-free: just update env and continue below
          return json({
            error: "Esta chave pertence ao ambiente Sandbox",
            error_code: "WRONG_ENVIRONMENT",
            message: "A chave fornecida é de Sandbox. Selecione 'Sandbox' no ambiente e tente novamente.",
            detected_environment: "sandbox",
          }, 400);
        }
      }

      return json({
        error: errMsg,
        error_code: status === 401 ? "INVALID_KEY" : "API_ERROR",
        message: "Verifique se a chave está correta e pertence ao ambiente selecionado.",
      }, 400);
    }

    const account = await accountRes.json();
    const accountName = account.tradingName || account.company || account.name || "Conta Asaas";
    console.log(`[asaas-setup] Account: ${accountName} (id=${account.id})`);

    // ═══ STEP 2: Get Wallet ID ═══
    let walletId: string | null = account.walletId || null;

    // Asaas myAccount sometimes returns walletId, sometimes not.
    // The account.id in Asaas doubles as the walletId for split payments.
    if (!walletId && account.id) {
      walletId = account.id;
    }

    // Double-check via /finance/balance (validates the wallet exists)
    if (walletId) {
      try {
        const balRes = await fetch(`${baseUrl}/finance/balance`, { method: "GET", headers });
        if (balRes.ok) {
          const bal = await balRes.json();
          console.log(`[asaas-setup] Balance confirmed: R$ ${bal.balance || 0}`);
        }
      } catch {}
    }

    console.log(`[asaas-setup] Wallet ID: ${walletId}`);

    // ═══ STEP 3: Check KYC Status ═══
    let commercialStatus = "ACTIVE";
    try {
      const statusRes = await fetch(`${baseUrl}/myAccount/status`, { method: "GET", headers });
      if (statusRes.ok) {
        const sd = await statusRes.json();
        commercialStatus = sd.general || sd.commercialInfo || "ACTIVE";
        console.log(`[asaas-setup] KYC status: ${commercialStatus}`);
      }
    } catch {}

    if (commercialStatus === "DENIED" || commercialStatus === "REJECTED") {
      return json({
        error: "Conta Asaas reprovada na análise documental",
        error_code: "KYC_REJECTED",
        message: "Complete a verificação no painel do Asaas antes de conectar.",
      }, 400);
    }

    // ═══ STEP 4: Auto-Register Webhook ═══
    const publicBase = Deno.env.get("SUPABASE_PUBLIC_URL")
      || Deno.env.get("API_EXTERNAL_URL")
      || "https://supabase.whatsflow.com.br";
    const webhookUrl = `${publicBase.replace(/\/$/, "")}/functions/v1/asaas-webhook`;
    const webhookToken = crypto.randomUUID().replace(/-/g, "");
    let webhookRegistered = false;
    let webhookId: string | null = null;

    // 4a. List existing webhooks
    let existingWebhook: any = null;
    try {
      const listRes = await fetch(`${baseUrl}/webhooks`, { method: "GET", headers });
      if (listRes.ok) {
        const listData = await listRes.json();
        const webhooks = listData?.data || (Array.isArray(listData) ? listData : []);
        existingWebhook = webhooks.find((w: any) => w.url === webhookUrl);
        console.log(`[asaas-setup] Existing webhooks: ${webhooks.length}, ours=${!!existingWebhook}`);
      } else {
        const errText = await listRes.text().catch(() => "");
        console.warn(`[asaas-setup] Webhook list failed ${listRes.status}: ${errText.substring(0, 200)}`);
      }
    } catch (e: any) {
      console.warn("[asaas-setup] Webhook list error:", e.message);
    }

    // 4b. Create or update webhook
    const webhookPayload = {
      name: "Whatsflow Finance",
      url: webhookUrl,
      email: "webhook@whatsflow.com.br",
      sendType: "SEQUENTIALLY",
      apiVersion: 3,
      enabled: true,
      interrupted: false,
      authToken: webhookToken,
      events: [
        "PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
        "PAYMENT_REFUNDED",
      ],
    };

    if (existingWebhook?.id) {
      try {
        const upRes = await fetch(`${baseUrl}/webhooks/${existingWebhook.id}`, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload),
        });
        const upData = await upRes.json().catch(() => ({}));
        webhookRegistered = upRes.ok;
        webhookId = upData?.id || existingWebhook.id;
        console.log(`[asaas-setup] Webhook updated: ${webhookId}, ok=${webhookRegistered}`);
        if (!webhookRegistered) console.warn("[asaas-setup] Update failed:", JSON.stringify(upData));
      } catch (e: any) {
        console.warn("[asaas-setup] Webhook update error:", e.message);
      }
    } else {
      try {
        const crRes = await fetch(`${baseUrl}/webhooks`, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload),
        });
        const crData = await crRes.json().catch(() => ({}));
        webhookRegistered = crRes.ok;
        webhookId = crData?.id || null;
        console.log(`[asaas-setup] Webhook created: ${webhookId}, ok=${webhookRegistered}`);
        if (!webhookRegistered) console.warn("[asaas-setup] Create failed:", JSON.stringify(crData));
      } catch (e: any) {
        console.warn("[asaas-setup] Webhook create error:", e.message);
      }
    }

    // ═══ STEP 5: Save to Database ═══
    const { error: dbErr } = await supabase.from("asaas_connections").upsert({
      tenant_id: tenantId,
      environment,
      api_key_encrypted: apiKey,
      api_key_hint: apiKey.slice(-6),
      wallet_id: walletId,
      webhook_token: webhookRegistered ? webhookToken : null,
      account_status: commercialStatus,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,environment" });

    if (dbErr) {
      console.error("[asaas-setup] DB error:", dbErr.message);
      return json({ error: "Erro ao salvar: " + dbErr.message }, 500);
    }

    console.log(`[asaas-setup] ✓ Complete: tenant=${tenantId}, wallet=${walletId}, webhook=${webhookRegistered}`);

    return json({
      success: true,
      account_name: accountName,
      wallet_id: walletId,
      environment,
      webhook_registered: webhookRegistered,
      webhook_id: webhookId,
      webhook_url: webhookUrl,
    });

  } catch (err: any) {
    console.error("[asaas-setup] Fatal:", err);
    return json({ error: err.message || "Erro inesperado" }, 500);
  }
});
