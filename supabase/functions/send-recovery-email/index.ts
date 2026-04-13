// send-recovery-email
// Generates a Supabase recovery link and sends via partner or global SMTP.
// Supports WL branding: dynamic sender, logo, app name.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, resolveEmailBranding } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = Deno.env.get("APP_URL") || "https://unfold-project-joy-production.up.railway.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email } = await req.json();
    if (!email) throw new Error("Email é obrigatório");

    const redirectUrl = `${PRODUCTION_URL}/reset-password`;
    const normalizedEmail = email.trim().toLowerCase();

    // Generate recovery link via Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: redirectUrl },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.warn("[send-recovery] Link error:", linkError?.message || "No action_link");
      // Don't reveal if user exists — always return success
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace any lovable.app domain with production URL
    const safeLink = linkData.properties.action_link.replace(
      /https?:\/\/[^/]*lovable[^/]*\//g,
      `${PRODUCTION_URL}/`
    );

    // Resolve tenant_id from user → user_tenants to get WL branding
    const userId = linkData.user?.id;
    let tenantId: string | undefined;
    let userName = "";

    if (userId) {
      const [{ data: profile }, { data: ut }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        supabase.from("user_tenants").select("tenant_id").eq("user_id", userId).limit(1).maybeSingle(),
      ]);
      userName = profile?.full_name || "";
      tenantId = ut?.tenant_id;
    }

    // Resolve branding (partner name, logo, colors)
    const branding = await resolveEmailBranding(tenantId);

    const html = `
      <div style="font-family:'Open Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          ${branding.logoHtml || `<div style="font-size:24px;font-weight:900;color:${branding.primaryColor};">${branding.appName}</div>`}
        </div>
        <h2 style="color:#344767;margin:0 0 8px;font-size:20px;">Recuperação de senha</h2>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 16px;">
          ${userName ? `Olá <strong>${userName}</strong>,` : "Olá,"} recebemos uma solicitação para redefinir sua senha no ${branding.appName}.
        </p>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Clique no botão abaixo para criar uma nova senha:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 32px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
            Redefinir minha senha
          </a>
        </p>
        <p style="color:#adb5bd;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e9ecef;padding-top:16px;">
          Se você não solicitou a recuperação de senha, ignore este e-mail.<br/>
          Este link expira em 24 horas.
        </p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject: `Recuperação de senha — ${branding.appName}`,
      html,
      from: `${branding.fromName} <${branding.fromEmail}>`,
      tenant_id: tenantId,
    });

    console.log(`[send-recovery] Recovery email sent to ${normalizedEmail} via ${tenantId ? "partner" : "global"} SMTP`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-recovery] Error:", e);
    // Always return success to not leak user existence
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
