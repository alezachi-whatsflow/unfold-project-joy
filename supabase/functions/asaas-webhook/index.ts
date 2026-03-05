import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json();
    const eventType = payload.event;
    const eventId = payload.id || null;

    console.log(`[asaas-webhook] Received event: ${eventType}, id: ${eventId}`);

    // Idempotency check
    if (eventId) {
      const { data: existing } = await supabase
        .from("webhook_events")
        .select("id")
        .eq("asaas_event_id", eventId)
        .maybeSingle();

      if (existing) {
        console.log(`[asaas-webhook] Duplicate event ${eventId}, skipping`);
        return new Response(JSON.stringify({ status: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Store raw event
    const { error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        event_type: eventType,
        asaas_event_id: eventId,
        payload,
        processed: false,
      });

    if (insertError) {
      console.error("[asaas-webhook] Error storing event:", insertError);
    }

    // Process payment events
    const paymentData = payload.payment;
    if (paymentData && paymentData.id) {
      await processPaymentEvent(supabase, eventType, paymentData);
    }

    // Mark event as processed
    if (eventId) {
      await supabase
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("asaas_event_id", eventId);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[asaas-webhook] Error:", error);
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

async function processPaymentEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  paymentData: Record<string, unknown>
) {
  const asaasId = paymentData.id as string;
  const status = paymentData.status as string;

  console.log(`[asaas-webhook] Processing payment ${asaasId} -> ${status}`);

  // Upsert payment record
  const { error } = await supabase
    .from("asaas_payments")
    .upsert(
      {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        asaas_id: asaasId,
        asaas_customer_id: paymentData.customer as string,
        billing_type: paymentData.billingType || "UNDEFINED",
        status: status,
        value: paymentData.value || 0,
        net_value: paymentData.netValue || null,
        due_date: paymentData.dueDate,
        payment_date: paymentData.paymentDate || null,
        confirmed_date: paymentData.confirmedDate || null,
        invoice_url: paymentData.invoiceUrl || null,
        bank_slip_url: paymentData.bankSlipUrl || null,
        description: paymentData.description || null,
        external_reference: paymentData.externalReference || null,
        raw_data: paymentData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,asaas_id" }
    );

  if (error) {
    console.error(`[asaas-webhook] Error upserting payment ${asaasId}:`, error);
  }
}
