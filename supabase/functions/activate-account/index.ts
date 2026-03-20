// activate-account
// Called server-side by ActivationPage after Supabase Auth signup.
// Marks the activation_token as used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token } = await req.json();
    if (!token) throw new Error("token is required");

    // Validate token
    const { data: tokenRow, error } = await supabase
      .from("activation_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) throw new Error("Token not found");
    if (tokenRow.status === "used") throw new Error("Token already used");
    if (new Date(tokenRow.expires_at) < new Date()) throw new Error("Token expired");

    // Mark used
    await supabase.from("activation_tokens").update({
      status: "used",
      used_at: new Date().toISOString(),
    }).eq("token", token);

    console.log(`[activate-account] Token ${token} marked as used`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[activate-account]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
