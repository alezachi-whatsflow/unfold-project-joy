# Prompt para Lovable — Exportar dados para novo projeto
## Colar no chat do Lovable (1 crédito)

---

```
I need to export data from this project's Supabase to my own Supabase project.

Create a temporary Edge Function called "export-all-data" that:

1. Uses the SUPABASE_SERVICE_ROLE_KEY (from Deno.env) to bypass RLS
2. Reads ALL rows from these tables (using service_role client):
   - profiles
   - user_tenants
   - licenses
   - nexus_users
   - nexus_audit_logs
   - nexus_feature_flags
   - nexus_tickets
   - whitelabel_config
   - conversations
   - chat_messages
   - negocios
   - sales_pipelines
   - activities
   - icp_profiles
   - notifications
   - audit_logs

3. Returns a JSON response with ALL the data:
   { "profiles": [...], "user_tenants": [...], "licenses": [...], etc }

4. The function must:
   - Accept GET request (no auth required — temporary function)
   - Use CORS headers (allow all origins)
   - Handle tables that might not exist (skip silently)
   - Fetch up to 10000 rows per table using .select('*').limit(10000)

Here's the code — just create the file and deploy:

supabase/functions/export-all-data/index.ts:

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tables = [
    "profiles","user_tenants","licenses","nexus_users","nexus_audit_logs",
    "nexus_feature_flags","nexus_tickets","whitelabel_config",
    "conversations","chat_messages","negocios","sales_pipelines",
    "activities","icp_profiles","notifications","audit_logs"
  ];

  const result: Record<string, any[]> = {};
  for (const t of tables) {
    try {
      const { data } = await sb.from(t).select("*").limit(10000);
      result[t] = data || [];
    } catch { result[t] = []; }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

Deploy this function immediately. I will call it once to get the data, then delete it.
```
