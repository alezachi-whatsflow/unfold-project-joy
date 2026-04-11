/**
 * extract-expense-ocr
 * Receives an image (URL or base64) of a receipt/invoice and returns
 * structured expense data extracted via Vision AI.
 *
 * Uses the shared ai.ts extractExpenseData() which supports OpenAI, Anthropic, Gemini.
 *
 * Body: { image_url?: string, image_base64?: string }
 * Returns: { success: true, data: ExtractedExpense }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractExpenseData } from "../_shared/ai.ts";

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

  try {
    // Auth — require logged-in user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    // Resolve tenant from user's profile
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient
      .from("tenant_profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;

    // Parse body
    const body = await req.json();
    const { image_url, image_base64 } = body;

    if (!image_url && !image_base64) {
      return json({ error: "image_url ou image_base64 obrigatório" }, 400);
    }

    // Build the image URL for Vision API
    let finalUrl: string;
    if (image_base64) {
      // Data URI for base64 images
      const mimeType = image_base64.startsWith("/9j/") ? "image/jpeg"
        : image_base64.startsWith("iVBOR") ? "image/png"
        : "image/jpeg";
      finalUrl = `data:${mimeType};base64,${image_base64}`;
    } else {
      finalUrl = image_url!;
    }

    console.log(`[extract-expense-ocr] Processing for user=${user.id}, tenant=${tenantId}, url=${finalUrl.substring(0, 60)}...`);

    // Call the shared extraction engine
    const extracted = await extractExpenseData(finalUrl, undefined, tenantId || undefined);

    console.log(`[extract-expense-ocr] Extracted: ${extracted.supplier} R$${extracted.amount} (${extracted.confidence * 100}%)`);

    return json({
      success: true,
      data: {
        supplier: extracted.supplier,
        value: extracted.amount,
        category: extracted.category,
        date: extracted.date,
        description: extracted.description,
        confidence: extracted.confidence,
      },
    });
  } catch (err: any) {
    console.error("[extract-expense-ocr] Error:", err);
    return json({ error: err.message || "Erro na extração" }, 500);
  }
});
