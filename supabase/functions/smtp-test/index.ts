// smtp-test
// Tests a partner's SMTP configuration by sending a test email to the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { whitelabel_config_id } = await req.json();
    if (!whitelabel_config_id) throw new Error("whitelabel_config_id é obrigatório");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const now = new Date().toISOString();

    try {
      // Send test email using the partner's SMTP config
      await sendEmail({
        to: user.email,
        subject: "Teste SMTP — Configuração OK",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
            <h1 style="font-size:20px;font-weight:800;margin:0 0 16px;color:#10b981;">Teste SMTP bem-sucedido!</h1>
            <p style="color:#94a3b8;">Se você está lendo este e-mail, sua configuração SMTP está funcionando corretamente.</p>
            <p style="color:#64748b;font-size:12px;margin-top:24px;">Enviado em: ${new Date().toLocaleString("pt-BR")}</p>
          </div>
        `,
        whitelabel_config_id,
      });

      // Update test status
      await adminClient.from("partner_smtp_config").update({
        last_test_at: now,
        last_test_ok: true,
        last_error: null,
      }).eq("whitelabel_config_id", whitelabel_config_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (smtpError: any) {
      // Update test status with error
      await adminClient.from("partner_smtp_config").update({
        last_test_at: now,
        last_test_ok: false,
        last_error: smtpError.message?.substring(0, 500),
      }).eq("whitelabel_config_id", whitelabel_config_id);

      return new Response(JSON.stringify({ success: false, error: smtpError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("[smtp-test]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
