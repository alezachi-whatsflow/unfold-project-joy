/**
 * telegram-proxy
 * Edge Function that acts as public bridge to the internal telegram-service.
 * Frontend calls this → this calls the Docker-internal microservice.
 * Validates Supabase JWT, resolves tenant, forwards request.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TELEGRAM_SERVICE_URL = Deno.env.get("TELEGRAM_SERVICE_URL") || "http://whatsflow-telegram-service:3100";
const TELEGRAM_SERVICE_API_KEY = Deno.env.get("TELEGRAM_SERVICE_API_KEY") || "tgsvc_k8Qm2vXr9pL4nJ7wB3yF6hD0cA5eT1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user via Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map frontend actions to internal API endpoints
    const routes: Record<string, { method: string; path: string }> = {
      "generate-qr": { method: "POST", path: "/api/telegram/generate-qr" },
      "send-message": { method: "POST", path: "/api/telegram/send-message" },
      "disconnect": { method: "POST", path: "/api/telegram/disconnect" },
      "status": { method: "GET", path: `/api/telegram/status/${params.integration_id || ""}` },
      "clients": { method: "GET", path: "/api/telegram/clients" },
    };

    const route = routes[action];
    if (!route) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward to internal telegram-service
    const internalUrl = `${TELEGRAM_SERVICE_URL}${route.path}`;
    const fetchOpts: RequestInit = {
      method: route.method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": TELEGRAM_SERVICE_API_KEY,
      },
    };
    if (route.method === "POST") {
      fetchOpts.body = JSON.stringify(params);
    }

    const upstream = await fetch(internalUrl, fetchOpts);
    const data = await upstream.json().catch(() => ({}));

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[telegram-proxy] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
