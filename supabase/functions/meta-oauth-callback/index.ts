/**
 * meta-oauth-callback
 * Receives OAuth callback from Meta, exchanges code for token,
 * discovers accounts (WABA + phone numbers / Instagram pages),
 * persists the integration, configures webhook.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_ID = Deno.env.get("META_APP_ID") || "440046068424112";
const META_CLIENT_SECRET = Deno.env.get("META_CLIENT_SECRET") || Deno.env.get("META_APP_SECRET") || "";
const FRONTEND_URL = Deno.env.get("APP_URL") || "https://unfold-project-joy-production.up.railway.app";

// ─── Error Code Mapping ─────────────────────────────────────────────────────
const META_ERROR_MAP: Record<string, { code: string; message: string }> = {
  // Number conflicts
  "already registered": {
    code: "NUMBER_IN_OTHER_WABA_OR_APP",
    message: "Este número já está registrado em outro WhatsApp Business ou no app pessoal. Exclua a conta WhatsApp do celular para liberar o número.",
  },
  "phone number is already being used": {
    code: "NUMBER_IN_OTHER_WABA_OR_APP",
    message: "Este número já está registrado em outro WhatsApp Business ou no app pessoal. Exclua a conta WhatsApp do celular para liberar o número.",
  },
  "currently being migrated": {
    code: "NUMBER_IN_OTHER_BSP",
    message: "Este número está retido por outro provedor (BSP). Desative a Verificação em Duas Etapas (2FA) no provedor antigo para forçar a migração.",
  },
  "two step verification": {
    code: "NUMBER_IN_OTHER_BSP",
    message: "A Verificação em Duas Etapas está ativa no provedor antigo. Desative o 2FA para liberar o número para migração.",
  },
  "another business service provider": {
    code: "NUMBER_IN_OTHER_BSP",
    message: "Este número está registrado com outro BSP (Business Service Provider). Solicite a desvinculação no provedor antigo.",
  },
};

function classifyGraphError(errorMessage: string): { code: string; message: string } | null {
  const lower = errorMessage.toLowerCase();
  for (const [pattern, mapped] of Object.entries(META_ERROR_MAP)) {
    if (lower.includes(pattern)) return mapped;
  }
  return null;
}

/** Returns an HTML page that posts a structured message to the opener and closes the popup */
function popupResponse(result: {
  success: boolean;
  message: string;
  error_code?: string;
  provider?: string;
  details?: Record<string, any>;
}) {
  const payload = JSON.stringify(result);
  const isSuccess = result.success;
  const icon = isSuccess ? "✅" : "❌";
  const title = isSuccess ? "Conexão realizada!" : "Erro na conexão";
  const detailsHtml = result.details
    ? Object.entries(result.details)
        .filter(([, v]) => v)
        .map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #222"><span style="color:#888">${k}</span><span style="color:#e0e0e0;font-weight:500">${v}</span></div>`)
        .join("")
    : "";

  // For errors, don't auto-close — let user read
  const autoClose = isSuccess ? `setTimeout(function() { window.close(); }, 2500);` : `setTimeout(function() { window.close(); }, 4000);`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;background:#0D0E14;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;max-width:420px;padding:32px">
  <div style="font-size:48px;margin-bottom:16px">${icon}</div>
  <h2 style="margin:0 0 8px;font-size:20px;color:${isSuccess ? '#39F7B2' : '#f87171'}">${title}</h2>
  <p style="margin:0 0 20px;color:#888;font-size:14px">${result.message}</p>
  ${detailsHtml ? `<div style="background:#161820;border-radius:8px;padding:12px 16px;text-align:left;font-size:13px;margin-bottom:20px">${detailsHtml}</div>` : ""}
  <p style="color:#555;font-size:12px">Esta janela fechará automaticamente...</p>
</div>
<script>
  try { window.opener && window.opener.postMessage(${payload}, "*"); } catch(e) {}
  ${autoClose}
</script>
</body></html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function graphGet(path: string, token: string): Promise<any> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(`Graph API: ${data.error.message}`);
  return data;
}

/** Attempt to register a phone number with the WABA (required for Cloud API) */
async function registerPhoneNumber(phoneNumberId: string, token: string): Promise<{ ok: boolean; error_code?: string; message?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: "000000", // Default 6-digit PIN for new registrations
      }),
    });
    const data = await res.json();

    if (data.error) {
      const classified = classifyGraphError(data.error.message);
      if (classified) {
        console.warn(`[registerPhoneNumber] Classified error: ${classified.code} — ${data.error.message}`);
        return { ok: false, error_code: classified.code, message: classified.message };
      }
      // Unknown Graph error — log full detail but return generic
      console.error(`[registerPhoneNumber] Unclassified error:`, JSON.stringify(data.error));
      return { ok: false, message: data.error.message };
    }

    console.log(`[registerPhoneNumber] Success for ${phoneNumberId}`);
    return { ok: true };
  } catch (e: any) {
    console.error(`[registerPhoneNumber] Exception:`, e.message);
    return { ok: false, message: e.message };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorReason = url.searchParams.get("error_reason");

    // ── User denied/cancelled the OAuth popup ──
    if (error) {
      const isUserCancel = error === "access_denied" || errorReason === "user_denied";
      console.error(`[meta-oauth-callback] OAuth error: ${error} — ${errorReason}`);
      return popupResponse({
        success: false,
        error_code: isUserCancel ? "USER_CANCELLED" : "OAUTH_ERROR",
        message: isUserCancel
          ? "Você cancelou a autorização. Clique em 'Tentar Novamente' para retomar."
          : (errorReason || error),
      });
    }

    if (!code || !state) {
      return popupResponse({
        success: false,
        error_code: "MISSING_PARAMS",
        message: "Código ou estado ausente na resposta do Meta.",
      });
    }

    // 1. Validate state (anti-CSRF)
    const { data: oauthState } = await adminClient
      .from("oauth_states")
      .select("*")
      .eq("state_token", state)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!oauthState) {
      console.error("[meta-oauth-callback] Invalid or expired state");
      return popupResponse({
        success: false,
        error_code: "EXPIRED_STATE",
        message: "Estado OAuth inválido ou expirado. Tente novamente.",
      });
    }

    await adminClient.from("oauth_states").update({ used: true }).eq("id", oauthState.id);
    const { tenant_id, provider, redirect_uri } = oauthState;

    // 2. Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_CLIENT_SECRET,
      code,
      redirect_uri,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      const msg = tokenData.error?.message || "Falha ao trocar code por token";
      console.error("[meta-oauth-callback] Token exchange failed:", JSON.stringify(tokenData.error || tokenData));
      return popupResponse({
        success: false,
        error_code: "TOKEN_EXCHANGE_FAILED",
        message: msg,
      });
    }

    const accessToken = tokenData.access_token;
    console.log(`[meta-oauth-callback] Token obtained for ${provider}, tenant ${tenant_id}, token length: ${accessToken.length}`);

    // 3. Discover accounts based on provider
    let integrationData: Record<string, any>;

    if (provider === "WABA") {
      integrationData = await discoverWhatsApp(accessToken, tenant_id);
    } else {
      integrationData = await discoverInstagram(accessToken, tenant_id);
    }

    // 3b. INCOMPLETE_SIGNUP: no WABA or phone discovered
    if (provider === "WABA" && !integrationData.waba_id && !integrationData.phone_number_id) {
      console.warn("[meta-oauth-callback] No WABA or phone discovered — INCOMPLETE_SIGNUP");
      // Do NOT save partial data — tenant_id is preserved in the popup response
      return popupResponse({
        success: false,
        error_code: "INCOMPLETE_SIGNUP",
        message: "Quase lá! Precisamos que você escolha o número de telefone na tela do Facebook. Clique em 'Tentar Novamente' para retomar.",
        provider: "WABA",
      });
    }

    // 3c. Check phone status and attempt registration only if needed
    if (provider === "WABA" && integrationData.phone_number_id) {
      // First check if phone is already registered (status = CONNECTED)
      let alreadyRegistered = false;
      try {
        const phoneStatus = await graphGet(
          `${integrationData.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
          accessToken
        );
        const status = phoneStatus?.code_verification_status;
        alreadyRegistered = status === "VERIFIED" || status === "NOT_VERIFIED";
        // Also grab quality_rating if not already set
        if (phoneStatus?.quality_rating && !integrationData.quality_rating) {
          integrationData.quality_rating = phoneStatus.quality_rating;
        }
        console.log(`[meta-oauth-callback] Phone ${integrationData.phone_number_id} status: ${status}, alreadyRegistered: ${alreadyRegistered}`);
      } catch (e: any) {
        console.warn("[meta-oauth-callback] Phone status check failed:", e.message);
      }

      if (!alreadyRegistered) {
        // Only attempt registration for truly new/unregistered numbers
        const regResult = await registerPhoneNumber(integrationData.phone_number_id, accessToken);
        if (!regResult.ok && regResult.error_code) {
          // Registration failed with a classified error — but still save the integration
          // The number exists in the WABA, it just can't be re-registered right now
          console.warn(`[meta-oauth-callback] Phone registration issue: ${regResult.error_code} — saving integration anyway`);
          integrationData.registration_warning = regResult.message;
        }
      } else {
        console.log("[meta-oauth-callback] Phone already registered — skipping registration step");
      }
    }

    // 4. Check for duplicates
    if (provider === "WABA" && integrationData.phone_number_id) {
      const { data: existing } = await adminClient
        .from("channel_integrations")
        .select("id")
        .eq("phone_number_id", integrationData.phone_number_id)
        .maybeSingle();

      if (existing) {
        await adminClient.from("channel_integrations").update({
          ...integrationData,
          access_token: accessToken,
          status: "active",
          error_message: null,
        }).eq("id", existing.id);
        console.log(`[meta-oauth-callback] Updated existing WABA integration ${existing.id}`);
        return popupResponse({
          success: true,
          message: "WhatsApp reconectado com sucesso!",
          provider: "WABA",
          details: {
            "Telefone": integrationData.display_phone_number || "—",
            "Nome verificado": integrationData.verified_name || "—",
            "WABA": integrationData.waba_name || integrationData.waba_id || "—",
            "Qualidade": integrationData.quality_rating || "—",
          },
        });
      }
    }

    if (provider === "INSTAGRAM" && integrationData.instagram_business_account_id) {
      const { data: existing } = await adminClient
        .from("channel_integrations")
        .select("id")
        .eq("instagram_business_account_id", integrationData.instagram_business_account_id)
        .maybeSingle();

      if (existing) {
        await adminClient.from("channel_integrations").update({
          ...integrationData,
          access_token: accessToken,
          status: "active",
          error_message: null,
        }).eq("id", existing.id);
        console.log(`[meta-oauth-callback] Updated existing Instagram integration ${existing.id}`);
        return popupResponse({
          success: true,
          message: "Instagram reconectado com sucesso!",
          provider: "INSTAGRAM",
          details: {
            "Usuário": integrationData.instagram_username ? `@${integrationData.instagram_username}` : "—",
            "Página Facebook": integrationData.facebook_page_id || "—",
          },
        });
      }
    }

    // 5. Persist new integration
    const webhookBaseUrl = Deno.env.get("META_WEBHOOK_BASE_URL") || `${supabaseUrl}/functions/v1`;
    const webhookVerifyToken = crypto.randomUUID().replace(/-/g, "");

    const { error: insertErr } = await adminClient.from("channel_integrations").insert({
      tenant_id,
      provider,
      name: integrationData.name || (provider === "WABA" ? "WhatsApp" : "Instagram"),
      access_token: accessToken,
      webhook_verify_token: webhookVerifyToken,
      webhook_url: `${webhookBaseUrl}/meta-webhook`,
      status: "active",
      ...integrationData,
    });

    if (insertErr) {
      console.error("[meta-oauth-callback] Insert error:", insertErr);
      return popupResponse({ success: false, message: insertErr.message });
    }

    console.log(`[meta-oauth-callback] ${provider} integration created for tenant ${tenant_id}`);
    const details = provider === "WABA"
      ? {
          "Telefone": integrationData.display_phone_number || "—",
          "Nome verificado": integrationData.verified_name || "—",
          "WABA": integrationData.waba_name || integrationData.waba_id || "—",
          "Qualidade": integrationData.quality_rating || "—",
        }
      : {
          "Usuário": integrationData.instagram_username ? `@${integrationData.instagram_username}` : "—",
          "Nome": integrationData.name || "—",
          "Página Facebook": integrationData.facebook_page_id || "—",
        };

    return popupResponse({
      success: true,
      message: provider === "WABA" ? "WhatsApp conectado com sucesso!" : "Instagram conectado com sucesso!",
      provider,
      details,
    });

  } catch (e: any) {
    console.error("[meta-oauth-callback] Error:", e);
    // Try to classify unexpected Graph errors
    const classified = classifyGraphError(e.message || "");
    if (classified) {
      return popupResponse({
        success: false,
        error_code: classified.code,
        message: classified.message,
      });
    }
    return popupResponse({
      success: false,
      error_code: "UNKNOWN_ERROR",
      message: e.message || "Erro inesperado na conexão",
    });
  }
});

// ─── WHATSAPP DISCOVERY ──────────────────────────────────────────────────────
async function discoverWhatsApp(token: string, tenantId: string) {
  let wabaId = "";
  let phoneNumberId = "";
  let displayPhoneNumber = "";
  let verifiedName = "";
  let name = "WhatsApp";

  // Strategy 1: debug_token to find shared WABAs (works for Embedded Signup)
  // Use app access token (APP_ID|APP_SECRET) for debug_token — works for system user tokens too
  const appAccessToken = META_APP_ID && META_CLIENT_SECRET ? `${META_APP_ID}|${META_CLIENT_SECRET}` : token;
  try {
    const debug = await graphGet(`debug_token?input_token=${token}`, appAccessToken);
    console.log("[discoverWhatsApp] debug_token scopes:", JSON.stringify(debug?.data?.granular_scopes?.map((s: any) => ({ scope: s.scope, targets: s.target_ids?.length || 0 }))));

    const wabaScope = debug?.data?.granular_scopes?.find(
      (s: any) => s.scope === "whatsapp_business_management"
    );
    const sharedWabas = wabaScope?.target_ids || [];

    if (sharedWabas.length > 0) {
      wabaId = sharedWabas[0];
      console.log("[discoverWhatsApp] Found WABA via debug_token:", wabaId);
    }

    // Also check whatsapp_business_messaging scope for phone number IDs
    if (!wabaId) {
      const msgScope = debug?.data?.granular_scopes?.find(
        (s: any) => s.scope === "whatsapp_business_messaging"
      );
      const msgTargets = msgScope?.target_ids || [];
      if (msgTargets.length > 0) {
        // These could be WABA IDs or phone number IDs
        for (const targetId of msgTargets) {
          try {
            // Try as WABA first
            const wabaCheck = await graphGet(`${targetId}?fields=id,name`, token);
            if (wabaCheck?.id) {
              wabaId = wabaCheck.id;
              console.log("[discoverWhatsApp] Found WABA via messaging scope:", wabaId);
              break;
            }
          } catch (_) {
            // May be a phone number ID instead — try to get its WABA
            try {
              const phoneCheck = await graphGet(`${targetId}?fields=id,display_phone_number,verified_name`, token);
              if (phoneCheck?.display_phone_number) {
                phoneNumberId = phoneCheck.id;
                displayPhoneNumber = phoneCheck.display_phone_number;
                verifiedName = phoneCheck.verified_name || "";
                console.log("[discoverWhatsApp] Found phone via messaging scope:", phoneNumberId, displayPhoneNumber);
              }
            } catch (_) { /* not a phone either */ }
          }
        }
      }
    }
  } catch (e: any) {
    console.warn("[discoverWhatsApp] debug_token failed:", e.message);
  }

  // Strategy 2: If no WABA from debug_token, try business portfolio
  if (!wabaId && !phoneNumberId) {
    try {
      const me = await graphGet("me?fields=id,name", token);
      console.log("[discoverWhatsApp] me:", me.id, me.name);

      // 2a: Try direct businesses endpoint (regular user tokens)
      try {
        const businesses = await graphGet(`${me.id}/businesses?fields=id,name`, token);
        for (const biz of businesses?.data || []) {
          const wabas = await graphGet(`${biz.id}/owned_whatsapp_business_accounts?fields=id,name`, token);
          if (wabas?.data?.[0]) {
            wabaId = wabas.data[0].id;
            console.log("[discoverWhatsApp] Found WABA via business portfolio:", wabaId, wabas.data[0].name);
            break;
          }
        }
      } catch (e: any) {
        console.warn("[discoverWhatsApp] Business portfolio failed:", e.message);
      }

      // 2b: For system users — try assigned_pages to find linked WABAs
      if (!wabaId) {
        try {
          const pages = await graphGet(`${me.id}/assigned_pages?fields=id,name,whatsapp_business_account`, token);
          for (const page of pages?.data || []) {
            if (page.whatsapp_business_account?.id) {
              wabaId = page.whatsapp_business_account.id;
              console.log("[discoverWhatsApp] Found WABA via assigned_pages:", wabaId);
              break;
            }
          }
        } catch (e: any) {
          console.warn("[discoverWhatsApp] assigned_pages failed:", e.message);
        }
      }

      // 2c: For system users — try direct WABA fetch via Business Manager
      if (!wabaId) {
        const bizId = Deno.env.get("META_BUSINESS_ID") || "688498549631942";
        try {
          const wabas = await graphGet(`${bizId}/owned_whatsapp_business_accounts?fields=id,name&limit=50`, token);
          if (wabas?.data?.[0]) {
            wabaId = wabas.data[0].id;
            console.log("[discoverWhatsApp] Found WABA via BM with user token:", wabaId);
          }
        } catch (e: any) {
          console.warn("[discoverWhatsApp] BM WABA fetch with user token failed:", e.message);
        }
      }
    } catch (e: any) {
      console.warn("[discoverWhatsApp] Strategy 2 (me) failed:", e.message);
    }
  }

  // Strategy 3: If still no WABA, try the system user token as last resort
  if (!wabaId) {
    const sysToken = Deno.env.get("META_SYSTEM_USER_TOKEN");
    if (sysToken) {
      try {
        const bizId = Deno.env.get("META_BUSINESS_ID") || "688498549631942";
        const wabas = await graphGet(`${bizId}/owned_whatsapp_business_accounts?fields=id,name&limit=50`, sysToken);
        if (wabas?.data?.length > 0) {
          for (const waba of wabas.data) {
            try {
              const phones = await graphGet(`${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name`, sysToken);
              for (const phone of phones?.data || []) {
                if (phone.display_phone_number) {
                  wabaId = waba.id;
                  phoneNumberId = phone.id;
                  displayPhoneNumber = phone.display_phone_number;
                  verifiedName = phone.verified_name || "";
                  console.log("[discoverWhatsApp] Found via system token scan:", wabaId, phoneNumberId, displayPhoneNumber);
                  break;
                }
              }
              if (phoneNumberId) break;
            } catch (_) { /* skip this WABA */ }
          }
        }
      } catch (e: any) {
        console.warn("[discoverWhatsApp] System token fallback failed:", e.message);
      }
    }
  }

  // Get phone numbers from discovered WABA (if not already found via Strategy 3)
  if (wabaId && !phoneNumberId) {
    try {
      const phones = await graphGet(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`, token);
      const firstPhone = phones?.data?.[0];
      if (firstPhone) {
        phoneNumberId = firstPhone.id;
        displayPhoneNumber = firstPhone.display_phone_number || "";
        verifiedName = firstPhone.verified_name || "";
      }
    } catch (e: any) {
      console.warn("[discoverWhatsApp] Phone number fetch failed with user token, trying system token");
      const sysToken = Deno.env.get("META_SYSTEM_USER_TOKEN");
      if (sysToken) {
        try {
          const phones = await graphGet(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`, sysToken);
          const firstPhone = phones?.data?.[0];
          if (firstPhone) {
            phoneNumberId = firstPhone.id;
            displayPhoneNumber = firstPhone.display_phone_number || "";
            verifiedName = firstPhone.verified_name || "";
          }
        } catch (_) { /* failed */ }
      }
    }
  }

  // Fetch WABA name and quality rating
  let wabaName = "";
  let qualityRating = "";
  if (wabaId) {
    try {
      const wabaInfo = await graphGet(`${wabaId}?fields=name,account_review_status`, token);
      wabaName = wabaInfo?.name || "";
      console.log("[discoverWhatsApp] WABA info:", wabaInfo?.name, wabaInfo?.account_review_status);
    } catch (e: any) {
      console.warn("[discoverWhatsApp] WABA info fetch failed:", e.message);
      const sysToken = Deno.env.get("META_SYSTEM_USER_TOKEN");
      if (sysToken) {
        try {
          const wabaInfo = await graphGet(`${wabaId}?fields=name`, sysToken);
          wabaName = wabaInfo?.name || "";
        } catch (_) { /* skip */ }
      }
    }
  }

  if (phoneNumberId) {
    try {
      const phoneInfo = await graphGet(`${phoneNumberId}?fields=quality_rating`, token);
      qualityRating = phoneInfo?.quality_rating || "";
    } catch (_) {
      const sysToken = Deno.env.get("META_SYSTEM_USER_TOKEN");
      if (sysToken) {
        try {
          const phoneInfo = await graphGet(`${phoneNumberId}?fields=quality_rating`, sysToken);
          qualityRating = phoneInfo?.quality_rating || "";
        } catch (_) { /* skip */ }
      }
    }
  }

  name = verifiedName || wabaName || (displayPhoneNumber ? `WhatsApp ${displayPhoneNumber}` : "WhatsApp (pendente)");

  console.log(`[discoverWhatsApp] Final result: wabaId=${wabaId}, wabaName=${wabaName}, phoneNumberId=${phoneNumberId}, phone=${displayPhoneNumber}, quality=${qualityRating}, name=${name}`);

  return {
    waba_id: wabaId,
    waba_name: wabaName || null,
    phone_number_id: phoneNumberId || null,
    display_phone_number: displayPhoneNumber || null,
    verified_name: verifiedName || null,
    quality_rating: qualityRating || null,
    name,
  };
}

// ─── INSTAGRAM DISCOVERY ─────────────────────────────────────────────────────
async function discoverInstagram(token: string, tenantId: string) {
  const pages = await graphGet("me/accounts?fields=id,name,instagram_business_account{id,name,username}", token);

  let facebookPageId = "";
  let instagramBusinessAccountId = "";
  let instagramUsername = "";
  let name = "Instagram";

  for (const page of pages?.data || []) {
    if (page.instagram_business_account) {
      facebookPageId = page.id;
      instagramBusinessAccountId = page.instagram_business_account.id;
      instagramUsername = page.instagram_business_account.username || "";
      name = page.instagram_business_account.name || page.instagram_business_account.username || `Instagram (${page.name})`;
      break;
    }
  }

  if (!instagramBusinessAccountId) {
    throw new Error("Nenhuma conta Instagram Business encontrada. Verifique se sua página do Facebook tem um perfil Instagram Business vinculado.");
  }

  try {
    await fetch(`https://graph.facebook.com/v21.0/${facebookPageId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ subscribed_fields: ["messages", "messaging_postbacks"] }),
    });
  } catch (e) {
    console.warn("[discoverInstagram] Failed to subscribe page to webhook:", e);
  }

  return {
    facebook_page_id: facebookPageId,
    instagram_business_account_id: instagramBusinessAccountId,
    instagram_username: instagramUsername,
    name,
  };
}
