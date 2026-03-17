import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["admin", "superadmin", "gestor"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão para convidar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, role, tenant_id } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "E-mail e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://unfold-project-joy.lovable.app";
    const redirectUrl = `${origin}/reset-password`;
    const assignedRole = role || "consultor";

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Upsert profile (may have been deleted)
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (existingProfile) {
        await adminClient
          .from("profiles")
          .update({
            role: assignedRole,
            full_name,
            invitation_status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: caller.id,
          })
          .eq("id", existingUser.id);
      } else {
        // Profile was deleted, recreate it
        await adminClient
          .from("profiles")
          .insert({
            id: existingUser.id,
            role: assignedRole,
            full_name,
            invitation_status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: caller.id,
          });
      }

      if (tenant_id) {
        await adminClient
          .from("user_tenants")
          .upsert(
            { user_id: existingUser.id, tenant_id, is_owner: false },
            { onConflict: "user_id,tenant_id" }
          );
      }

      // Send recovery email so the user can create a new password
      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        console.error("Reset email error:", resetError);
        return new Response(
          JSON.stringify({ error: "O usuário existe, mas houve falha ao enviar o e-mail para criar a nova senha." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: `Usuário já existia. Perfil restaurado e e-mail para criar uma nova senha enviado para ${email}.`,
          user_id: existingUser.id,
          already_exists: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite new user - Supabase sends the invite email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          role: assignedRole,
          tenant_id,
        },
        redirectTo: redirectUrl,
      }
    );

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the profile with invitation tracking
    if (inviteData?.user?.id) {
      await adminClient
        .from("profiles")
        .update({
          role: assignedRole,
          full_name,
          invitation_status: "invited",
          invited_at: new Date().toISOString(),
          invited_by: caller.id,
        })
        .eq("id", inviteData.user.id);

      if (tenant_id) {
        await adminClient
          .from("user_tenants")
          .upsert(
            { user_id: inviteData.user.id, tenant_id, is_owner: false },
            { onConflict: "user_id,tenant_id" }
          );
      }
    }

    return new Response(
      JSON.stringify({
        message: `Convite enviado para ${email}`,
        user_id: inviteData?.user?.id,
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
