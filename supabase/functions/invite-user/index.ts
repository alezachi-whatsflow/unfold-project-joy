import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = "https://unfold-project-joy-production.up.railway.app";

function buildInviteEmail(full_name: string, actionLink: string) {
  // Replace the lovable.app domain in the link with Railway production URL
  const safeLink = actionLink.replace(
    /https?:\/\/[^/]*lovable[^/]*\//g,
    `${PRODUCTION_URL}/`
  );

  return {
    subject: "Você foi convidado para o Whatsflow",
    html: `
      <div style="font-family:'Open Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
        <h2 style="color:#344767;margin:0 0 8px;">Bem-vindo ao Whatsflow!</h2>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Olá <strong>${full_name}</strong>, você recebeu um convite para acessar o <strong>Whatsflow Finance</strong>.
        </p>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Clique no botão abaixo para confirmar seu acesso e criar sua senha:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 32px;background:#5e72e4;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
            Criar minha senha
          </a>
        </p>
        <p style="color:#adb5bd;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e9ecef;padding-top:16px;">
          Se você não esperava este convite, ignore este e-mail.<br/>
          Este link expira em 24 horas.
        </p>
      </div>
    `,
  };
}

function buildRecoveryEmail(full_name: string, actionLink: string) {
  const safeLink = actionLink.replace(
    /https?:\/\/[^/]*lovable[^/]*\//g,
    `${PRODUCTION_URL}/`
  );

  return {
    subject: "Crie sua senha — Whatsflow",
    html: `
      <div style="font-family:'Open Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;">
        <h2 style="color:#344767;margin:0 0 8px;">Criar sua senha</h2>
        <p style="color:#67748e;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Olá <strong>${full_name}</strong>, clique no botão abaixo para criar sua senha de acesso ao Whatsflow Finance:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${safeLink}" style="display:inline-block;padding:14px 32px;background:#5e72e4;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
            Criar minha senha
          </a>
        </p>
        <p style="color:#adb5bd;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e9ecef;padding-top:16px;">
          Se você não solicitou isso, ignore este e-mail.<br/>
          Este link expira em 24 horas.
        </p>
      </div>
    `,
  };
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Whatsflow <noreply@whatsflow.com.br>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    // Fallback: try with default Resend domain
    const res2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Whatsflow <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res2.ok) {
      const err2 = await res2.text();
      throw new Error(`Falha ao enviar email: ${err2}`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller permissions
    const [{ data: callerProfile }, { data: callerNexus }] = await Promise.all([
      adminClient.from("profiles").select("role, full_name").eq("id", caller.id).single(),
      adminClient.from("nexus_users").select("role, is_active").eq("auth_user_id", caller.id).eq("is_active", true).maybeSingle(),
    ]);

    const isTenantAdmin = callerProfile && ["admin", "superadmin", "gestor"].includes(callerProfile.role);
    const isNexusUser = !!callerNexus;

    if (!isTenantAdmin && !isNexusUser) {
      return new Response(JSON.stringify({ error: "Sem permissão para convidar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, role, tenant_id, license_id } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "E-mail e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUrl = `${PRODUCTION_URL}/reset-password`;
    const assignedRole = role || "consultor";

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Update profile
      await adminClient.from("profiles").upsert({
        id: existingUser.id,
        role: assignedRole,
        full_name,
        invitation_status: "invited",
        invited_at: new Date().toISOString(),
        invited_by: caller.id,
      }, { onConflict: "id" });

      if (tenant_id) {
        await adminClient.from("user_tenants").upsert(
          { user_id: existingUser.id, tenant_id, is_owner: false },
          { onConflict: "user_id,tenant_id" }
        );
      }

      // Generate recovery link and send custom email
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectUrl },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error("Generate link error:", linkError);
        return new Response(
          JSON.stringify({ error: "Falha ao gerar link de acesso." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailContent = buildRecoveryEmail(full_name, linkData.properties.action_link);
      await sendEmail(email, emailContent.subject, emailContent.html);

      return new Response(
        JSON.stringify({
          message: `E-mail para criar senha enviado para ${email}`,
          user_id: existingUser.id,
          already_exists: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NEW USER: Create user + generate invite link + send custom email
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name, role: assignedRole, tenant_id },
    });

    if (createError || !newUser?.user) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Erro ao criar usuário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with invitation tracking
    await adminClient.from("profiles").upsert({
      id: newUser.user.id,
      role: assignedRole,
      full_name,
      invitation_status: "invited",
      invited_at: new Date().toISOString(),
      invited_by: caller.id,
      ...(license_id ? { license_id } : {}),
    }, { onConflict: "id" });

    if (tenant_id) {
      await adminClient.from("user_tenants").upsert(
        { user_id: newUser.user.id, tenant_id, is_owner: false },
        { onConflict: "user_id,tenant_id" }
      );
    }

    // Generate invite link (type=recovery so user creates password)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: redirectUrl },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Generate link error:", linkError);
      return new Response(
        JSON.stringify({
          message: `Usuário criado, mas falha ao enviar email. Gere um novo convite.`,
          user_id: newUser.user.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send custom email in Portuguese via Resend
    const emailContent = buildInviteEmail(full_name, linkData.properties.action_link);
    await sendEmail(email, emailContent.subject, emailContent.html);

    return new Response(
      JSON.stringify({
        message: `Convite enviado para ${email}`,
        user_id: newUser.user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
