import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";

// Retry with exponential backoff for 429 errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 5
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000 + Math.random() * 1000;

      console.warn(
        `Rate limited (429), attempt ${attempt + 1}/${maxRetries}. Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(delayMs, 60000))
      );
      continue;
    }

    return response;
  }

  throw new Error(`Max retries (${maxRetries}) exceeded for ${url}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY not configured in secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      endpoint,        // e.g. "/customers", "/payments"
      method = "GET",
      params = {},     // query params for GET, body for POST/PUT
      environment = "sandbox",
      limit = 100,
      offset = 0,
    } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "endpoint is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl =
      environment === "production" ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;

    let url = `${baseUrl}${endpoint}`;

    // Build query string for GET requests
    if (method === "GET") {
      const queryParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        ...params,
      });
      url += `?${queryParams.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
    };

    if (method !== "GET" && Object.keys(params).length > 0) {
      fetchOptions.body = JSON.stringify(params);
    }

    console.log(`[asaas-proxy] ${method} ${url}`);

    const response = await fetchWithRetry(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[asaas-proxy] Error ${response.status}:`, data);
      return new Response(
        JSON.stringify({
          error: `Asaas API error`,
          status: response.status,
          details: data,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[asaas-proxy] Internal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
