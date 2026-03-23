/**
 * meta-oauth-start
 * Generates OAuth state, builds Meta authorization URL, returns it.
 * Supports: WABA (WhatsApp Embedded Signup) and INSTAGRAM.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_ID = Deno.env.get("META_APP_ID") || "440046068424112";
const META_WHATSAPP_CONFIG_ID = Deno.env.get("META_WHATSAPP_CONFIG_ID") || "389404487314896";
const META_INSTAGRAM_CONFIG_ID = Deno.env.get("META_INSTAGRAM_CONFIG_ID") || "816342840311378";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { provider, tenant_id } = await req.json();
    if (!provider || !tenant_id) throw new Error("provider e tenant_id são obrigatórios");
    if (!["WABA", "INSTAGRAM"].includes(provider)) throw new Error("provider deve ser WABA ou INSTAGRAM");

    // Validate tenant exists
    const { data: tenant } = await adminClient.from("tenants").select("id").eq("id", tenant_id).single();
    if (!tenant) throw new Error("Tenant não encontrado");

    // Build callback URL
    const webhookBaseUrl = Deno.env.get("META_WEBHOOK_BASE_URL") || `${supabaseUrl}/functions/v1`;
    const redirectUri = `${webhookBaseUrl}/meta-oauth-callback`;

    // Determine config ID
    const configId = provider === "WABA" ? META_WHATSAPP_CONFIG_ID : META_INSTAGRAM_CONFIG_ID;

    // Create OAuth state (anti-CSRF)
    const { data: stateRow, error: stateErr } = await adminClient
      .from("oauth_states")
      .insert({
        tenant_id,
        provider,
        redirect_uri: redirectUri,
        meta_config_id: configId,
      })
      .select("state_token")
      .single();

    if (stateErr || !stateRow) throw new Error("Falha ao criar estado OAuth");

    // Build Meta OAuth URL
    let authUrl: string;

    if (provider === "WABA") {
      // WhatsApp Embedded Signup
      const params = new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        config_id: configId,
        state: stateRow.state_token,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
      });
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    } else {
      // Instagram OAuth
      const params = new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        config_id: configId,
        state: stateRow.state_token,
        scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging",
      });
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }

    console.log(`[meta-oauth-start] ${provider} OAuth started for tenant ${tenant_id}`);

    return new Response(JSON.stringify({
      auth_url: authUrl,
      state: stateRow.state_token,
      provider,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[meta-oauth-start]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
