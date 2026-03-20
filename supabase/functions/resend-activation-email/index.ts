// resend-activation-email
// Generates a new activation token and resends the email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const APP_URL    = Deno.env.get("APP_URL") || "https://app.whatsflow.com.br";

    const { token: oldToken } = await req.json();
    if (!oldToken) throw new Error("token is required");

    // Load old token
    const { data: existing } = await supabase
      .from("activation_tokens")
      .select("*, checkout_sessions(*), accounts:account_id(slug, name, whitelabel_id)")
      .eq("token", oldToken)
      .single();

    if (!existing) throw new Error("Token not found");
    if (existing.status === "used") throw new Error("Token already used — account is active");

    const session = existing.checkout_sessions;
    const account = existing.accounts;

    // Expire old token
    await supabase.from("activation_tokens").update({ status: "expired" }).eq("token", oldToken);

    // Create new token
    const { data: newToken } = await supabase.from("activation_tokens").insert({
      checkout_session_id: session.id,
      account_id: existing.account_id,
      status: "pending",
    }).select().single();

    if (!newToken || !RESEND_KEY) throw new Error("Could not create new token or RESEND_API_KEY missing");

    // Load WL branding
    let fromEmail = "noreply@whatsflow.com.br";
    let fromName  = "Whatsflow";
    let appName   = "Whatsflow";
    let logoHtml  = "";

    if (account?.whitelabel_id) {
      const { data: wb } = await supabase.from("whitelabel_branding")
        .select("app_name, logo_url, support_email").eq("account_id", account.whitelabel_id).single();
      if (wb) {
        appName = wb.app_name || "Sistema"; fromName = appName;
        if (wb.support_email) fromEmail = wb.support_email;
        if (wb.logo_url) logoHtml = `<img src="${wb.logo_url}" alt="${appName}" style="height:40px;margin-bottom:24px;" />`;
      }
    }

    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
      ${logoHtml || `<div style="font-size:22px;font-weight:900;margin-bottom:24px;color:#10b981;">${appName}</div>`}
      <h1 style="font-size:20px;font-weight:800;margin:0 0 16px;">Novo link de ativação</h1>
      <p style="color:#94a3b8;">Aqui está seu novo link para ativar a conta <strong style="color:#e2e8f0;">${session.company_name}</strong>.</p>
      <a href="${APP_URL}/ativar/${newToken.token}" style="display:inline-block;background:#10b981;color:white;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin:24px 0;">Ativar minha conta →</a>
      <p style="color:#64748b;font-size:12px;">Link válido por 24h · Uso único.</p>
    </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [session.buyer_email],
        subject: `Novo link de ativação — ${appName}`,
        html,
      }),
    });

    console.log(`[resend-activation] New email sent to ${session.buyer_email}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[resend-activation]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
