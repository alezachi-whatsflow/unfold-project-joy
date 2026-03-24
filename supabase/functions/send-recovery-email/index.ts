// send-recovery-email
// Generates a Supabase recovery link and sends it via SMTP2GO.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/smtp.ts";

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

    // Generate recovery link via Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: redirectUrl },
    });

    if (linkError) {
      console.error("[send-recovery] Link error:", linkError);
      // Don't reveal if user exists or not — always show success to frontend
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      console.warn("[send-recovery] No action_link returned");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace any lovable.app domain with production URL
    const safeLink = actionLink.replace(
      /https?:\/\/[^/]*lovable[^/]*\//g,
      `${PRODUCTION_URL}/`
    );

    // Get user name if available
    let userName = "";
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", linkData.user?.id)
      .maybeSingle();
    if (profile?.full_name) userName = profile.full_name;

    const html = `
      <div style="font-family:'Open Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:24px;font-weight:900;color:#5e72e4;">Whatsflow</div>
        </div>
        <h2 style="color:#344767;margin:0 0 8px;font-size:20px;">Recuperação de senha</h2>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 16px;">
          ${userName ? `Olá <strong>${userName}</strong>,` : "Olá,"} recebemos uma solicitação para redefinir sua senha no Whatsflow.
        </p>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Clique no botão abaixo para criar uma nova senha:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 32px;background:#5e72e4;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
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
      to: email.trim().toLowerCase(),
      subject: "Recuperação de senha — Whatsflow",
      html,
    });

    console.log(`[send-recovery] Recovery email sent to ${email}`);

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
