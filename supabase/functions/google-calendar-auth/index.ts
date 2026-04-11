/**
 * google-calendar-auth
 * Initiates Google OAuth2 flow for Calendar integration.
 * Redirects user to Google consent screen.
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

    // Verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Google OAuth config
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    if (!clientId) {
      return new Response("GOOGLE_CLIENT_ID not configured", { status: 500, headers: corsHeaders });
    }

    // Build Google OAuth URL
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    // Store user_id + tenant_id in state param for the callback
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tenant } = await serviceClient
      .from("tenant_profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const state = btoa(JSON.stringify({
      user_id: user.id,
      tenant_id: tenant?.tenant_id || null,
      email: user.email,
    }));

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    // Redirect to Google
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: authUrl.toString() },
    });
  } catch (err: any) {
    console.error("[google-calendar-auth] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
