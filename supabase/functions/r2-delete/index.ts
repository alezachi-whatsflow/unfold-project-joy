import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteFromR2, bulkDeleteFromR2, deleteByPrefixFromR2, extractKeyFromUrl } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// R2 DELETE — Edge Function
//
// Modes:
//   { key: "tenantId/file.jpg" }               — delete single
//   { keys: ["tenantId/a.jpg", ...] }          — delete multiple
//   { prefix: "tenantId/" }                     — delete all with prefix
//   { deviceId: "xxx", tenantId: "yyy" }       — delete all device files
//   { tenantCleanup: true, tenantId: "yyy" }   — delete all tenant files
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth — requires nexus or admin
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();

    // ── Single key delete ──
    if (body.key) {
      const ok = await deleteFromR2(body.key);
      return json({ deleted: ok ? 1 : 0 });
    }

    // ── Multiple keys delete ──
    if (body.keys && Array.isArray(body.keys)) {
      const result = await bulkDeleteFromR2(body.keys);
      return json(result);
    }

    // ── Prefix delete (tenant cleanup) ──
    if (body.prefix) {
      const result = await deleteByPrefixFromR2(body.prefix);
      return json(result);
    }

    // ── Device cleanup: delete all files related to a device ──
    if (body.deviceId && body.tenantId) {
      const keysToDelete: string[] = [];

      // 1. Device profile pic
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("profile_pic_url")
        .eq("id", body.deviceId)
        .maybeSingle();

      if (instance?.profile_pic_url) {
        const key = extractKeyFromUrl(instance.profile_pic_url);
        if (key) keysToDelete.push(key);
      }

      // 2. Chat profile pics for this device
      const { data: contacts } = await supabase
        .from("whatsapp_contacts")
        .select("profile_pic_url")
        .eq("instance_id", body.deviceId);

      for (const c of contacts || []) {
        const key = extractKeyFromUrl(c.profile_pic_url);
        if (key) keysToDelete.push(key);
      }

      // 3. Media files from messages
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("media_url")
        .eq("instance_name", body.deviceId)
        .not("media_url", "is", null);

      for (const m of messages || []) {
        const key = extractKeyFromUrl(m.media_url);
        if (key) keysToDelete.push(key);
      }

      const result = await bulkDeleteFromR2(keysToDelete);
      return json({ ...result, filesFound: keysToDelete.length });
    }

    // ── Tenant cleanup: delete everything for a company ──
    if (body.tenantCleanup && body.tenantId) {
      const result = await deleteByPrefixFromR2(`${body.tenantId}/`);
      return json(result);
    }

    return json({ error: "Provide key, keys, prefix, deviceId+tenantId, or tenantCleanup+tenantId" }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
