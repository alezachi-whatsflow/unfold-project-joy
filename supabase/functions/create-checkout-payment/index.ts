// create-checkout-payment
// Called by the frontend when entering the payment step.
// Creates Asaas customer (if needed) + charge (PIX/boleto/credit_card)
// and saves the asaas_payment_id back to checkout_sessions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX = "https://sandbox.asaas.com/api/v3";
const ASAAS_PROD    = "https://api.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY")!;
    const ENV       = Deno.env.get("ASAAS_ENV") || "sandbox"; // "production" or "sandbox"
    const BASE_URL  = ENV === "production" ? ASAAS_PROD : ASAAS_SANDBOX;

    const { session_id, payment_method } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    // 1. Load session
    const { data: session, error: sErr } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sErr || !session) throw new Error("Session not found");
    if (session.status !== "pending") throw new Error("Session already processed");

    const asaasHeaders = { "Content-Type": "application/json", access_token: ASAAS_KEY };

    // 2. Create or reuse Asaas customer
    let customerId = session.asaas_customer_id;
    if (!customerId) {
      const cpfCnpj = session.buyer_document?.replace(/\D/g, "") || "";
      const cRes = await fetch(`${BASE_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: session.buyer_name || session.company_name,
          email: session.buyer_email,
          phone: session.buyer_phone || "",
          cpfCnpj: cpfCnpj || undefined,
          externalReference: session.id,
        }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(`Asaas customer error: ${JSON.stringify(cData)}`);
      customerId = cData.id;

      await supabase.from("checkout_sessions").update({ asaas_customer_id: customerId }).eq("id", session_id);
    }

    // 3. Create charge
    const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    const billingTypeMap: Record<string, string> = {
      pix: "PIX",
      boleto: "BOLETO",
      cartao: "CREDIT_CARD",
    };
    const billingType = billingTypeMap[payment_method] || "PIX";

    const chargePayload: Record<string, any> = {
      customer: customerId,
      billingType,
      value: session.first_charge,
      dueDate,
      description: `Whatsflow — ${session.plan} — ${session.company_name}`,
      externalReference: session.id,
    };

    const pRes = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(chargePayload),
    });
    const pData = await pRes.json();
    if (!pRes.ok) throw new Error(`Asaas payment error: ${JSON.stringify(pData)}`);

    // 4. Save payment id to session
    await supabase.from("checkout_sessions").update({
      asaas_payment_id: pData.id,
      asaas_payment_link: pData.invoiceUrl || pData.bankSlipUrl || null,
      payment_method,
    }).eq("id", session_id);

    // 5. Return payment data to frontend
    const result: Record<string, any> = {
      payment_id: pData.id,
      status: pData.status,
      invoice_url: pData.invoiceUrl || null,
      bank_slip_url: pData.bankSlipUrl || null,
    };

    // PIX: return QR code
    if (billingType === "PIX" && pData.id) {
      const pixRes = await fetch(`${BASE_URL}/payments/${pData.id}/pixQrCode`, { headers: asaasHeaders });
      const pixData = await pixRes.json();
      result.pix_code = pixData.payload || "";
      result.pix_qr_base64 = pixData.encodedImage || "";
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[create-checkout-payment]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
