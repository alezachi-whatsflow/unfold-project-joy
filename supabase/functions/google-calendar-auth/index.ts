/**
 * google-calendar-auth
 * Initiates Google OAuth2 flow for Calendar integration.
 * Resolves Google credentials from the user's partner (whitelabel_config)
 * or falls back to global GOOGLE_CLIENT_ID env var.
 *
 * GET /functions/v1/google-calendar-auth?jwt=ACCESS_TOKEN
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const jwt = url.searchParams.get("jwt");
    if (!jwt) {
      return new Response("Missing jwt parameter", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant → license → parent license → whitelabel_config
    const { data: userTenant } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const tenantId = userTenant?.tenant_id || null;
    let googleClientId: string | null = null;
    let googleClientSecret: string | null = null;
    let partnerName = "Whatsflow";

    if (tenantId) {
      // Find this tenant's license → parent WL license
      const { data: license } = await supabase
        .from("licenses")
        .select("id, parent_license_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (license) {
        const wlLicenseId = license.parent_license_id || license.id;

        // Get partner's Google credentials
        const { data: wlConfig } = await supabase
          .from("whitelabel_config")
          .select("google_client_id, google_client_secret, display_name")
          .eq("license_id", wlLicenseId)
          .maybeSingle();

        if (wlConfig?.google_client_id && wlConfig?.google_client_secret) {
          googleClientId = wlConfig.google_client_id;
          googleClientSecret = wlConfig.google_client_secret;
          partnerName = wlConfig.display_name || "Whatsflow";
        }
      }
    }

    // Fallback to global env var
    if (!googleClientId) {
      googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || null;
      googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || null;
    }

    if (!googleClientId || !googleClientSecret) {
      return new Response("Google Calendar não configurado para este parceiro. Configure as credenciais Google no painel do Partner.", {
        status: 400, headers: corsHeaders,
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    // Encode state with user info + partner credentials reference
    const state = btoa(JSON.stringify({
      user_id: user.id,
      tenant_id: tenantId,
      email: user.email,
      partner: partnerName,
      // Pass client_id in state so callback knows which credentials to use
      gcid: googleClientId,
    }));

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", googleClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    console.log(`[google-calendar-auth] Redirecting user=${user.id} tenant=${tenantId} partner=${partnerName}`);

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: authUrl.toString() },
    });
  } catch (err: any) {
    console.error("[google-calendar-auth] Error:", err);
    return new Response(err.message || "Internal error", {
      status: 500, headers: corsHeaders,
    });
  }
});
