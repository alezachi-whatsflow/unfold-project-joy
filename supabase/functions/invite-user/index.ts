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

    // Verify the caller is admin/superadmin
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

    // Check caller role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
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

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User already exists - just make sure profile has correct role and tenant
      await adminClient
        .from("profiles")
        .update({ role: role || "consultor", full_name })
        .eq("id", existingUser.id);

      if (tenant_id) {
        await adminClient
          .from("user_tenants")
          .upsert(
            { user_id: existingUser.id, tenant_id, is_owner: false },
            { onConflict: "user_id,tenant_id" }
          );
      }

      return new Response(
        JSON.stringify({ message: "Usuário já existe. Perfil e acesso atualizados." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite new user via admin API - sends magic link email
    const redirectUrl = req.headers.get("origin") || "https://unfold-project-joy.lovable.app";
    
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, role: role || "consultor", tenant_id },
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

    // Update the profile that was auto-created by the trigger
    if (inviteData?.user?.id) {
      await adminClient
        .from("profiles")
        .update({ role: role || "consultor", full_name })
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
      JSON.stringify({ message: `Convite enviado para ${email}`, user_id: inviteData?.user?.id }),
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
