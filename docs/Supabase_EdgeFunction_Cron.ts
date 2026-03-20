import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    // 1. Fetch licenses expiring in 30, 15, 7, 3, or 1 days.
    // In production, you would run a date math query via RPC or directly here.
    const { data: expiringLicenses, error: fetchError } = await supabase
      .rpc('get_expiring_licenses_days'); 
      // Note: Assumes a custom RPC exists to return { account_id, days_left, valid_until, account_type, whitelabel_id }.

    if (fetchError) throw fetchError;

    if (!expiringLicenses || expiringLicenses.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring licenses today." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Process each expiring license
    for (const lic of expiringLicenses) {
      // 2.1 Fetch Account & Branding Data
      const { data: account } = await supabase
        .from('accounts')
        .select('name, email, account_type, whitelabel_id')
        .eq('id', lic.account_id)
        .single();
        
      if (!account || !account.email) continue;

      let emailBranding = {
        from: "Sistema Whatsflow <contato@whatsflow.com.br>",
        appName: "Whatsflow Finance",
        supportEmail: "suporte@whatsflow.com.br",
        logo: "https://whatsflow.com.br/logo.png"
      };

      // 2.2 If it's a WhiteLabel Client, fetch the parent's branding
      if (account.account_type === 'wl_client' && account.whitelabel_id) {
         const { data: wlBranding } = await supabase
          .from('whitelabel_branding')
          .select('*')
          .eq('account_id', account.whitelabel_id)
          .single();
          
         if (wlBranding) {
            emailBranding = {
               from: `${wlBranding.app_name} <${wlBranding.support_email}>`,
               appName: wlBranding.app_name,
               supportEmail: wlBranding.support_email,
               logo: wlBranding.logo_url
            };
         }
      }

      // 2.3 Insert Notification into database
      await supabase.from('notifications').insert({
        account_id: lic.account_id,
        type: 'license_expiring',
        title: `Licença expira em ${lic.days_left} dia(s)`,
        message: `Sua assinatura corporativa da conta ${account.name} vence no dia ${new Date(lic.valid_until).toLocaleDateString()}. Renove para evitar a suspensão.`,
        action_url: `/app/dashboard/assinatura`
      });

      // 2.4 Send Email via Resend
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
             from: emailBranding.from,
             to: [account.email],
             subject: `[${emailBranding.appName}] Aviso: Sua licença expira em ${lic.days_left} dias`,
             html: `
               <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                  <img src="${emailBranding.logo}" alt="${emailBranding.appName}" style="max-height: 50px;" />
                  <h2>Renovação de Licença Necessária</h2>
                  <p>Olá equipe <strong>${account.name}</strong>,</p>
                  <p>A sua assinatura atual do sistema vence em exatos <strong>${lic.days_left} dias</strong> (${new Date(lic.valid_until).toLocaleDateString()}).</p>
                  <p>Por favor, para garantir que as suas conexões do WhatsApp e módulos de IA continuem operando normalmente, acesse o painel e fale com nossa equipe de suporte para efetuar a renovação.</p>
                  <hr style="border: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #888;">Equipe ${emailBranding.appName} | Dúvidas? Responda este email ou fale com ${emailBranding.supportEmail}</p>
               </div>
             `
          })
        });
      }
    }

    return new Response(JSON.stringify({ message: "Processed " + expiringLicenses.length + " notifications." }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
