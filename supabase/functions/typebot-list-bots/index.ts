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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ status: "error", message: "Nao autorizado" }, 401);
    }

    const { data: userTenant } = await adminClient
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", authData.user.id)
      .limit(1)
      .maybeSingle();

    if (!userTenant?.tenant_id) {
      return json({ status: "error", message: "Tenant nao encontrado" }, 400);
    }

    const { data: account } = await adminClient
      .from("typebot_accounts")
      .select("typebot_id, typebot_token, typebot_url_builder, typebot_url_viewer")
      .eq("tenant_id", userTenant.tenant_id)
      .maybeSingle();

    if (!account) {
      return json({
        status: "success",
        typebots: [],
        has_account: false,
        message: "Conta Typebot nao configurada. Clique em 'Fluxo Typebot' para configurar.",
      });
    }

    const baseUrl = account.typebot_url_builder.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${account.typebot_token}`,
      Accept: "application/json",
    };

    // 1. Buscar todos os workspaces
    const wsResponse = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: "GET",
      headers,
    });

    if (!wsResponse.ok) {
      const errorBody = await wsResponse.text().catch(() => "");
      console.error("[typebot-list-bots] Workspaces error:", wsResponse.status, errorBody);
      return json({ status: "error", message: "Erro ao buscar workspaces do Typebot" }, 400);
    }

    const wsPayload = await wsResponse.json();
    const workspaces = wsPayload.workspaces || [];

    // 2. Para cada workspace, buscar os typebots
    const typebots: { id: string; name: string; publicId: string | null }[] = [];

    for (const workspace of workspaces) {
      const tbResponse = await fetch(
        `${baseUrl}/api/v1/typebots?workspaceId=${workspace.id}`,
        { method: "GET", headers },
      );

      if (!tbResponse.ok) {
        console.error("[typebot-list-bots] Typebots error for workspace", workspace.id, tbResponse.status);
        continue;
      }

      const tbPayload = await tbResponse.json();
      for (const tb of tbPayload.typebots || []) {
        typebots.push({
          id: tb.id,
          name: tb.name,
          publicId: tb.publicId || null,
        });
      }
    }

    return json({
      status: "success",
      typebots,
      has_account: true,
      viewer_url: account.typebot_url_viewer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[typebot-list-bots]", message, error);
    return json({ status: "error", message }, 500);
  }
});
