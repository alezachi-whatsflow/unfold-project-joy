import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { uploadToR2, uploadBase64ToR2, uploadUrlToR2, generateFilename, getPublicUrl } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// R2 UPLOAD — Edge Function
//
// Accepts:
//   { file: base64, filename: string, contentType?: string }
//   { url: string, filename?: string }
//
// Returns:
//   { key, publicUrl }
//
// Files stored as: {tenantId}/{generatedFilename}
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Get user's tenant
    const { data: ut } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const tenantId = ut?.tenant_id;
    if (!tenantId) return json({ error: "No tenant found" }, 403);

    // Parse body
    const body = await req.json();
    const originalName = body.filename || "file";
    const filename = generateFilename(originalName);

    let result: { key: string; publicUrl: string };

    if (body.file) {
      // Base64 upload
      const contentType = body.contentType || "application/octet-stream";
      result = await uploadBase64ToR2(tenantId, filename, body.file, contentType);
    } else if (body.url) {
      // URL upload (download → re-upload)
      result = await uploadUrlToR2(tenantId, filename, body.url);
    } else {
      return json({ error: "Provide 'file' (base64) or 'url'" }, 400);
    }

    return json(result);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
