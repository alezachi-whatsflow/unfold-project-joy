import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ML_API = "https://api.mercadolibre.com";

// ═══════════════════════════════════════════════════════════════
// ML OAuth Callback — Exchange code for tokens and save integration
//
// Body: { code, tenant_id, redirect_uri }
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { code, tenant_id, redirect_uri } = await req.json();
    if (!code || !tenant_id) return json({ error: "code and tenant_id are required" }, 400);

    // Read credentials from DB (user configured via UI) with .env fallback
    const { data: existingInt } = await supabase
      .from("channel_integrations")
      .select("ml_app_id, credentials")
      .eq("tenant_id", tenant_id)
      .eq("provider", "MERCADOLIVRE")
      .maybeSingle();

    const mlAppId = existingInt?.ml_app_id || Deno.env.get("ML_APP_ID");
    const mlSecret = (existingInt?.credentials as any)?.client_secret || Deno.env.get("ML_APP_SECRET");
    if (!mlAppId || !mlSecret) return json({ error: "Credenciais do ML não encontradas. Configure App ID e Secret na tela de Integrações." }, 400);

    // 1. Exchange code for tokens
    const tokenRes = await fetch(`${ML_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: mlAppId,
        client_secret: mlSecret,
        code,
        redirect_uri: redirect_uri || `${Deno.env.get("SUPABASE_URL")}/functions/v1/ml-oauth-callback`,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok) {
      return json({
        error: tokens.message || `Token exchange failed: ${tokenRes.status}`,
        details: tokens,
      }, 400);
    }

    const { access_token, refresh_token, expires_in, user_id } = tokens;

    // 2. Fetch ML user profile
    const profileRes = await fetch(`${ML_API}/users/${user_id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    const sellerName = profile.nickname || profile.first_name || `Vendedor ${user_id}`;

    // 3. Upsert channel_integrations
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ml-webhook`;

    // Check if exists, then update or insert (no unique constraint on channel_id)
    const integrationData = {
      channel_id: `ml_${user_id}`,
      name: sellerName,
      ml_user_id: String(user_id),
      ml_app_id: mlAppId,
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + (expires_in || 21600) * 1000).toISOString(),
      webhook_url: webhookUrl,
      status: "active",
      credentials: {
        user_id,
        nickname: profile.nickname,
        site_id: profile.site_id,
        permalink: profile.permalink,
        seller_reputation: profile.seller_reputation?.level_id,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existingML } = await supabase.from("channel_integrations")
      .select("id").eq("tenant_id", tenant_id).eq("provider", "MERCADOLIVRE").maybeSingle();

    let upsertErr: any = null;
    if (existingML) {
      ({ error: upsertErr } = await supabase.from("channel_integrations")
        .update(integrationData).eq("id", existingML.id));
    } else {
      ({ error: upsertErr } = await supabase.from("channel_integrations")
        .insert({ tenant_id, provider: "MERCADOLIVRE", ...integrationData }));
    }

    if (upsertErr) {
      return json({ error: `Failed to save: ${upsertErr.message}` }, 500);
    }

    // 4. Subscribe to ML webhook notifications
    try {
      await fetch(`${ML_API}/applications/${mlAppId}/webhooks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          topics: ["messages", "questions", "orders_v2"],
        }),
      });
    } catch {
      // Non-critical: webhook can be configured later
    }

    return json({
      success: true,
      seller_name: sellerName,
      ml_user_id: user_id,
    });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
