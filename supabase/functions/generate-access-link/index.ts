// generate-access-link
// Generates a recovery/password-creation link WITHOUT sending an email.
// Used by admins to manually share the link with users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = "https://unfold-project-joy-production.up.railway.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
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

    // Verify caller is admin or nexus user
    const adminClient = createClient(supabaseUrl, serviceKey);
    const [{ data: callerProfile }, { data: callerNexus }] = await Promise.all([
      adminClient.from("profiles").select("role").eq("id", caller.id).single(),
      adminClient.from("nexus_users").select("role, is_active").eq("auth_user_id", caller.id).eq("is_active", true).maybeSingle(),
    ]);

    const isTenantAdmin = callerProfile && ["admin", "superadmin", "gestor"].includes(callerProfile.role);
    const isNexusUser = !!callerNexus;

    if (!isTenantAdmin && !isNexusUser) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email: rawEmail, user_id } = await req.json();

    // Resolve email: either passed directly or looked up by user_id
    let email = rawEmail;
    if (!email && user_id) {
      const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(user_id);
      email = targetUser?.email;
    }
    if (!email) throw new Error("Email ou user_id é obrigatório");

    const redirectUrl = `${PRODUCTION_URL}/reset-password`;

    // Generate recovery link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: redirectUrl },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || "Falha ao gerar link");
    }

    // Replace any lovable.app domain
    const link = linkData.properties.action_link.replace(
      /https?:\/\/[^/]*lovable[^/]*\//g,
      `${PRODUCTION_URL}/`
    );

    console.log(`[generate-access-link] Link generated for ${email} by ${caller.id}`);

    return new Response(JSON.stringify({ link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[generate-access-link]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
