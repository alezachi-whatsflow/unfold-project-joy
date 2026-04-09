import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomHex(bytes = 16) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const typebotServerUrl = Deno.env.get("TYPEBOT_SERVER_URL");
  const typebotBuildUrl = Deno.env.get("TYPEBOT_BUILD_URL");
  const typebotViewerUrl = Deno.env.get("TYPEBOT_VIEWER_URL");

  if (!typebotServerUrl || !typebotBuildUrl || !typebotViewerUrl) {
    return json({ status: "error", message: "Variáveis do Typebot não configuradas" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ status: "error", message: "Não autorizado" }, 401);
    }

    const user = authData.user;

    const { data: userTenant, error: userTenantError } = await adminClient
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (userTenantError) throw userTenantError;
    if (!userTenant?.tenant_id) {
      return json({ status: "error", message: "Tenant não encontrado" }, 400);
    }

    const tenantId = userTenant.tenant_id;

    const { data: existingAccount, error: existingAccountError } = await adminClient
      .from("typebot_accounts")
      .select("typebot_id, typebot_token, typebot_url_builder, typebot_url_viewer")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existingAccountError) throw existingAccountError;

    let account = existingAccount;

    if (!account) {
      const [{ data: tenant }, { data: companyProfile }] = await Promise.all([
        adminClient.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
        adminClient.from("company_profile").select("company_name").eq("tenant_id", tenantId).maybeSingle(),
      ]);

      const companyName = companyProfile?.company_name || tenant?.name || user.email || "Whatsflow";
      const userEmail = `${randomHex(16)}@sys.whatsflow.com.br`;

      const createResponse = await fetch(typebotServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          company: companyName,
          name: companyName,
          email: userEmail,
          emailVerified: null,
        }),
      });

      const createPayload = await createResponse.json().catch(() => null);

      if (!createResponse.ok) {
        const message =
          createPayload?.message ||
          createPayload?.error ||
          "Não foi possível criar a conta do Typebot";
        return json({ status: "error", message }, 400);
      }

      const createdUserId = createPayload?.createdUser?.id;
      const createdToken = createPayload?.token;
      if (!createdUserId || !createdToken) {
        return json({ status: "error", message: "Resposta inválida ao criar conta Typebot" }, 500);
      }

      const { data: insertedAccount, error: insertError } = await adminClient
        .from("typebot_accounts")
        .insert({
          tenant_id: tenantId,
          typebot_id: createdUserId,
          typebot_url_builder: typebotBuildUrl,
          typebot_url_viewer: typebotViewerUrl,
          typebot_token: createdToken,
          login_email: userEmail,
        })
        .select("typebot_id, typebot_token, typebot_url_builder, typebot_url_viewer")
        .single();

      if (insertError) throw insertError;
      account = insertedAccount;
    }

    const buildUrl = new URL(account.typebot_url_builder);
    const redirectUrl =
      `${account.typebot_url_builder.replace(/\/$/, "")}/api/whatsflow/magic-login` +
      `?authWfID=${encodeURIComponent(account.typebot_id)}` +
      `&authJwt=${encodeURIComponent(account.typebot_token)}` +
      `&domain=${encodeURIComponent(buildUrl.host)}` +
      `&schema=${encodeURIComponent(buildUrl.protocol.replace(":", ""))}`;

    return json({
      status: "success",
      message: "Autorização Typebot gerada com sucesso",
      auth: {
        authWfID: account.typebot_id,
        authJwt: account.typebot_token,
      },
      redirect_url: redirectUrl,
      urls: {
        builder: account.typebot_url_builder,
        viewer: account.typebot_url_viewer,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[typebot-authorize]", message, error);
    return json({ status: "error", message }, 500);
  }
});
