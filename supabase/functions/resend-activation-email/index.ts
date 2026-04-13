// resend-activation-email
// Generates a new activation token and resends the email via partner or global SMTP.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, resolveEmailBranding } from "../_shared/smtp.ts";

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
    const APP_URL = Deno.env.get("APP_URL") || "https://unfold-project-joy-production.up.railway.app";

    const { token: oldToken } = await req.json();
    if (!oldToken) throw new Error("token is required");

    // Load old token with related data
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

    if (!newToken) throw new Error("Could not create new token");

    // Resolve WL branding (uses whitelabel_id from account)
    const branding = await resolveEmailBranding(undefined, account?.whitelabel_id);

    // Resolve tenant_id for partner SMTP routing
    let tenantId: string | undefined;
    if (existing.account_id) {
      const { data: lic } = await supabase.from("licenses")
        .select("tenant_id")
        .eq("account_id", existing.account_id)
        .maybeSingle();
      tenantId = lic?.tenant_id;
    }

    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
      ${branding.logoHtml || `<div style="font-size:22px;font-weight:900;margin-bottom:24px;color:${branding.primaryColor};">${branding.appName}</div>`}
      <h1 style="font-size:20px;font-weight:800;margin:0 0 16px;">Novo link de ativação</h1>
      <p style="color:#94a3b8;">Aqui está seu novo link para ativar a conta <strong style="color:#e2e8f0;">${session.company_name}</strong>.</p>
      <a href="${APP_URL}/ativar/${newToken.token}" style="display:inline-block;background:${branding.primaryColor};color:white;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin:24px 0;">Ativar minha conta →</a>
      <p style="color:#64748b;font-size:12px;">Link válido por 24h · Uso único.</p>
    </div>`;

    await sendEmail({
      from: `${branding.fromName} <${branding.fromEmail}>`,
      to: session.buyer_email,
      subject: `Novo link de ativação — ${branding.appName}`,
      html,
      tenant_id: tenantId,
    });

    console.log(`[resend-activation] New email sent to ${session.buyer_email} via ${tenantId ? "partner" : "global"} SMTP`);
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
