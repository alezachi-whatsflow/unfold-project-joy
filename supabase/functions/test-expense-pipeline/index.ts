import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// TEST EXPENSE PIPELINE — Diagnostic endpoint
// Call via browser: /functions/v1/test-expense-pipeline
// Returns step-by-step results for debugging
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    pipeline: "expense-extractor-diagnostic",
  };

  try {
    // ── STEP 0: Find test instance ──
    const { data: inst, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, instance_token, server_url, tenant_id")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    results.step0_instance = inst ? {
      status: "success",
      instance_name: inst.instance_name,
      server_url: inst.server_url,
      tenant_id: inst.tenant_id,
    } : { status: "failed", error: instErr?.message || "No connected instance found" };

    if (!inst) return json(results);

    // ── STEP 1: Check license has expense_extractor active ──
    const { data: license, error: licErr } = await supabase
      .from("licenses")
      .select("ai_active_skills")
      .eq("tenant_id", inst.tenant_id)
      .maybeSingle();

    const isActive = license?.ai_active_skills?.expense_extractor === true;
    results.step1_license = {
      status: isActive ? "success" : "failed",
      ai_active_skills: license?.ai_active_skills || null,
      expense_extractor: isActive,
      error: licErr?.message || (!isActive ? "expense_extractor not active in license" : null),
    };

    // ── STEP 2: Find latest image with "Despesa" caption ──
    const { data: imgMsg, error: imgErr } = await supabase
      .from("whatsapp_messages")
      .select("id, message_id, media_url, body, caption, instance_name, remote_jid, created_at")
      .eq("type", "image")
      .eq("direction", "incoming")
      .or("body.ilike.%despesa%,caption.ilike.%despesa%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    results.step2_find_image = imgMsg ? {
      status: "success",
      message_id: imgMsg.message_id,
      body: imgMsg.body,
      caption: imgMsg.caption,
      media_url: imgMsg.media_url?.substring(0, 80) + "...",
      instance: imgMsg.instance_name,
      created_at: imgMsg.created_at,
    } : { status: "failed", error: imgErr?.message || "No image with 'Despesa' caption found" };

    if (!imgMsg) return json(results);

    // ── STEP 3: Get instance token for that message's instance ──
    const { data: msgInst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url")
      .eq("instance_name", imgMsg.instance_name)
      .maybeSingle();

    results.step3_instance_token = msgInst ? {
      status: "success",
      has_token: !!msgInst.instance_token,
      server_url: msgInst.server_url,
    } : { status: "failed", error: "Instance not found for message" };

    if (!msgInst?.instance_token) return json(results);

    // ── STEP 4: Download media via uazapi ──
    let imageUrl: string | null = null;
    try {
      const dlRes = await fetch(`${msgInst.server_url}/message/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: msgInst.instance_token },
        body: JSON.stringify({ id: imgMsg.message_id, return_link: true }),
      });

      const dlText = await dlRes.text();
      let dlData: any = null;
      try { dlData = JSON.parse(dlText); } catch { /* not json */ }

      imageUrl = dlData?.fileURL || dlData?.url || null;

      results.step4_download = {
        status: imageUrl ? "success" : "failed",
        http_status: dlRes.status,
        fileURL: imageUrl,
        raw_response: dlText.substring(0, 300),
      };
    } catch (e: any) {
      results.step4_download = { status: "error", error: e.message };
    }

    if (!imageUrl) return json(results);

    // ── STEP 5: Test image is accessible ──
    try {
      const imgTest = await fetch(imageUrl, { method: "HEAD" });
      results.step5_image_accessible = {
        status: imgTest.ok ? "success" : "failed",
        http_status: imgTest.status,
        content_type: imgTest.headers.get("content-type"),
      };
    } catch (e: any) {
      results.step5_image_accessible = { status: "error", error: e.message };
    }

    // ── STEP 6: Check AI configuration ──
    const { data: aiConfig, error: aiErr } = await supabase
      .from("ai_configurations")
      .select("provider, model, api_key, is_active")
      .or(`tenant_id.eq.${inst.tenant_id},is_global.eq.true`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    results.step6_ai_config = aiConfig ? {
      status: "success",
      provider: aiConfig.provider,
      model: aiConfig.model,
      has_api_key: !!aiConfig.api_key,
      key_prefix: aiConfig.api_key?.substring(0, 10) + "...",
    } : { status: "failed", error: aiErr?.message || "No AI configuration found" };

    if (!aiConfig?.api_key) return json(results);

    // ── STEP 7: Call Vision AI ──
    try {
      const { extractExpenseData } = await import("../_shared/ai.ts");
      const expense = await extractExpenseData(imageUrl, "despesa", inst.tenant_id);

      results.step7_vision_ai = {
        status: "success",
        extracted: expense,
      };

      // ── STEP 8: Insert into asaas_expenses ──
      try {
        const { data: inserted, error: insertErr } = await supabase
          .from("asaas_expenses")
          .insert({
            tenant_id: inst.tenant_id,
            description: expense.description || `Despesa via teste — ${expense.supplier}`,
            date: expense.date,
            value: expense.amount,
            category: expense.category,
            supplier: expense.supplier,
            attachment_url: imageUrl,
            attachment_name: `receipt_test_${imgMsg.message_id}.jpg`,
          })
          .select("id")
          .single();

        results.step8_insert = inserted ? {
          status: "success",
          expense_id: inserted.id,
        } : { status: "failed", error: insertErr?.message };
      } catch (e: any) {
        results.step8_insert = { status: "error", error: e.message };
      }
    } catch (e: any) {
      results.step7_vision_ai = { status: "error", error: e.message, stack: e.stack?.substring(0, 300) };
    }

  } catch (e: any) {
    results.fatal_error = { message: e.message, stack: e.stack?.substring(0, 500) };
  }

  return json(results);
});
