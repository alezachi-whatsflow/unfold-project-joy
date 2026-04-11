/**
 * google-calendar-callback
 * Handles Google OAuth2 callback — exchanges code for tokens,
 * fetches user info, saves config to google_calendar_configs table.
 *
 * GET /functions/v1/google-calendar-callback?code=AUTH_CODE&state=STATE
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // If user denied access
    if (error) {
      return redirectToApp("Acesso negado pelo usuário", "error");
    }

    if (!code || !stateRaw) {
      return redirectToApp("Parâmetros inválidos", "error");
    }

    // Decode state
    let state: { user_id: string; tenant_id: string | null; email: string };
    try {
      state = JSON.parse(atob(stateRaw));
    } catch {
      return redirectToApp("Estado inválido", "error");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error("[google-calendar-callback] Token exchange failed:", tokens);
      return redirectToApp("Falha na autenticação com Google", "error");
    }

    // 2. Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // 3. Get primary calendar
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const calData = await calRes.json();
    const primaryCal = (calData.items || []).find((c: any) => c.primary) || calData.items?.[0];

    // 4. Upsert google_calendar_configs
    const configPayload = {
      user_id: state.user_id,
      tenant_id: state.tenant_id,
      google_email: userInfo.email,
      google_name: userInfo.name || null,
      google_picture: userInfo.picture || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      selected_calendar_id: primaryCal?.id || "primary",
      selected_calendar_name: primaryCal?.summary || "Agenda principal",
      is_active: true,
      sync_to_google: true,
      sync_from_google: true,
      auto_add_meet: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("google_calendar_configs")
      .upsert(configPayload, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[google-calendar-callback] Upsert error:", upsertErr);
      return redirectToApp("Erro ao salvar configuração", "error");
    }

    console.log(`[google-calendar-callback] Connected: ${userInfo.email} for user ${state.user_id}`);

    return redirectToApp("Google Calendar conectado com sucesso!", "success");
  } catch (err: any) {
    console.error("[google-calendar-callback] Error:", err);
    return redirectToApp("Erro interno: " + err.message, "error");
  }
});

function redirectToApp(message: string, type: "success" | "error") {
  // Redirect back to the app's integrations page with status
  const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://app.whatsflow.com.br";
  const redirectUrl = `${appUrl}/app/whatsflow/integracoes?gcal=${type}&msg=${encodeURIComponent(message)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: redirectUrl },
  });
}
