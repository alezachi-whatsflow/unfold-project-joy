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
const META_CLIENT_SECRET = Deno.env.get("META_CLIENT_SECRET") || "";
const FRONTEND_URL = Deno.env.get("APP_URL") || "https://unfold-project-joy-production.up.railway.app";

async function graphGet(path: string, token: string): Promise<any> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(`Graph API: ${data.error.message}`);
  return data;
}

Deno.serve(async (req) => {
  // Handle both GET (Meta redirect) and POST (frontend call)
  const url = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // Extract params from query string (GET redirect from Meta)
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorReason = url.searchParams.get("error_reason");

    if (error) {
      console.error(`[meta-oauth-callback] OAuth error: ${error} — ${errorReason}`);
      return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=${encodeURIComponent(errorReason || error)}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=missing_code_or_state`, 302);
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
      return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=invalid_state`, 302);
    }

    // Mark state as used
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
      const detail = JSON.stringify(tokenData.error || tokenData);
      console.error("[meta-oauth-callback] Token exchange failed:", detail);
      console.error("[meta-oauth-callback] redirect_uri used:", redirect_uri);
      console.error("[meta-oauth-callback] code length:", code?.length);
      return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=${encodeURIComponent(msg)}`, 302);
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

    // 4. Check for duplicates
    if (provider === "WABA" && integrationData.phone_number_id) {
      const { data: existing } = await adminClient
        .from("channel_integrations")
        .select("id")
        .eq("phone_number_id", integrationData.phone_number_id)
        .maybeSingle();

      if (existing) {
        // Update existing instead of creating duplicate
        await adminClient.from("channel_integrations").update({
          ...integrationData,
          access_token: accessToken,
          status: "active",
          error_message: null,
        }).eq("id", existing.id);
        console.log(`[meta-oauth-callback] Updated existing WABA integration ${existing.id}`);
        return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?success=whatsapp_updated`, 302);
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
        return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?success=instagram_updated`, 302);
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
      return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=${encodeURIComponent(insertErr.message)}`, 302);
    }

    const successParam = provider === "WABA" ? "whatsapp_connected" : "instagram_connected";
    console.log(`[meta-oauth-callback] ${provider} integration created for tenant ${tenant_id}`);
    return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?success=${successParam}`, 302);

  } catch (e: any) {
    console.error("[meta-oauth-callback] Error:", e);
    return Response.redirect(`${FRONTEND_URL}/app/whatsflow/integracoes?error=${encodeURIComponent(e.message)}`, 302);
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
  try {
    const debug = await graphGet("debug_token?input_token=" + token, token);
    console.log("[discoverWhatsApp] debug_token scopes:", JSON.stringify(debug?.data?.granular_scopes?.map((s: any) => ({ scope: s.scope, targets: s.target_ids?.length || 0 }))));

    const wabaScope = debug?.data?.granular_scopes?.find(
      (s: any) => s.scope === "whatsapp_business_management"
    );
    const sharedWabas = wabaScope?.target_ids || [];

    if (sharedWabas.length > 0) {
      wabaId = sharedWabas[0];
      console.log("[discoverWhatsApp] Found WABA via debug_token:", wabaId);
    }
  } catch (e: any) {
    console.warn("[discoverWhatsApp] debug_token failed:", e.message);
  }

  // Strategy 2: If no WABA from debug_token, try business portfolio
  if (!wabaId) {
    try {
      const me = await graphGet("me?fields=id,name", token);
      console.log("[discoverWhatsApp] me:", me.id, me.name);

      // Try direct businesses endpoint
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
      console.warn("[discoverWhatsApp] Business portfolio fallback failed:", e.message);
    }
  }

  // Strategy 3: If still no WABA, try the system user token as last resort
  if (!wabaId) {
    const sysToken = Deno.env.get("META_SYSTEM_USER_TOKEN");
    if (sysToken) {
      try {
        const bizId = Deno.env.get("META_BUSINESS_ID") || "688498549631942";
        const wabas = await graphGet(`${bizId}/owned_whatsapp_business_accounts?fields=id,name&limit=50`, sysToken);
        // Find the most recently created WABA (likely the one just created by Embedded Signup)
        if (wabas?.data?.length > 0) {
          // Check each WABA for the phone numbers to find the newly created one
          for (const waba of wabas.data) {
            try {
              const phones = await graphGet(`${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name`, sysToken);
              for (const phone of phones?.data || []) {
                // If this phone was just registered, it might be pending
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
      // Try with system token
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

  name = verifiedName || (displayPhoneNumber ? `WhatsApp ${displayPhoneNumber}` : "WhatsApp (pendente)");

  console.log(`[discoverWhatsApp] Final result: wabaId=${wabaId}, phoneNumberId=${phoneNumberId}, phone=${displayPhoneNumber}, name=${name}`);

  return {
    waba_id: wabaId,
    phone_number_id: phoneNumberId || null,
    display_phone_number: displayPhoneNumber || null,
    verified_name: verifiedName || null,
    name,
  };
}

// ─── INSTAGRAM DISCOVERY ─────────────────────────────────────────────────────
async function discoverInstagram(token: string, tenantId: string) {
  // Get user's Facebook pages
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

  // Subscribe page to webhook for messaging
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
