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
    await supabase.from("webhook_events").insert({
      tenant_id: DEFAULT_TENANT_ID,
      event_type: eventType,
      asaas_event_id: eventId,
      payload,
      processed: false,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CHECKOUT INTERCEPTION — runs before Finance logic
    // If this payment belongs to a checkout_session, handle it and return.
    // ─────────────────────────────────────────────────────────────────────────
    const paymentData = payload.payment;
    if (
      paymentData?.id &&
      (eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED")
    ) {
      const { data: checkoutSession } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("asaas_payment_id", paymentData.id)
        .maybeSingle();

      if (checkoutSession) {
        console.log(`[asaas-webhook] Belongs to checkout_session ${checkoutSession.id}`);
        await handleCheckoutPayment(supabase, checkoutSession);
        if (eventId) {
          await supabase.from("webhook_events")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("asaas_event_id", eventId);
        }
        return new Response(JSON.stringify({ status: "checkout_processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING FINANCE LOGIC — unchanged
    // ─────────────────────────────────────────────────────────────────────────
    if (paymentData && paymentData.id) {
      await processPaymentEvent(supabase, eventType, paymentData);
    }

    if (eventId) {
      await supabase.from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("asaas_event_id", eventId);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[asaas-webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleCheckoutPayment(supabase: ReturnType<typeof createClient>, session: Record<string, any>) {
  if (session.status !== "pending") {
    console.log(`[checkout] Already processed (${session.status}), skipping`);
    return;
  }

  await supabase.from("checkout_sessions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", session.id);

  if (session.checkout_type === "new_account") await handleNewAccount(supabase, session);
  else if (session.checkout_type === "upsell") await handleUpsell(supabase, session);
  else if (session.checkout_type === "renewal") await handleRenewal(supabase, session);
}

async function handleNewAccount(supabase: ReturnType<typeof createClient>, session: Record<string, any>) {
  console.log(`[checkout] Creating account: ${session.company_name}`);

  const { data: account, error: accErr } = await supabase.from("accounts").insert({
    name: session.company_name,
    slug: session.company_slug,
    account_type: session.whitelabel_id ? "wl_client" : "direct_client",
    whitelabel_id: session.whitelabel_id || null,
    parent_id: session.whitelabel_id || null,
    status: "active",
    plan: session.plan,
    environment: "production",
  }).select().single();

  if (accErr || !account) { console.error("[checkout] Account error:", accErr); return; }

  const faciliteHours: Record<string, number> = { none: 0, basico: 8, intermediario: 20, avancado: 40 };

  const { data: license } = await supabase.from("licenses").insert({
    account_id: account.id,
    plan: session.plan,
    status: "active",
    base_devices_web: 1,
    base_devices_meta: 1,
    base_attendants: session.plan === "solo_pro" ? 1 : 3,
    extra_devices_web: session.extra_devices_web || 0,
    extra_devices_meta: session.extra_devices_meta || 0,
    extra_attendants: session.extra_attendants || 0,
    has_ai_module: session.has_ai_module || false,
    ai_agents_limit: session.has_ai_module ? 5 : 0,
    facilite_plan: session.facilite_plan || "none",
    facilite_monthly_hours: faciliteHours[session.facilite_plan] ?? 0,
    monthly_value: session.monthly_value,
    billing_cycle: session.billing_cycle || "monthly",
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();

  const { data: tokenRow } = await supabase.from("activation_tokens").insert({
    checkout_session_id: session.id,
    account_id: account.id,
    status: "pending",
  }).select().single();

  await supabase.from("license_history").insert({
    account_id: account.id,
    changed_by_role: "system",
    change_type: "initial",
    new_state: license,
    checkout_session_id: session.id,
    reason: "Conta criada via checkout automático",
  });

  if (tokenRow) await sendActivationEmail(supabase, session, tokenRow.token);
  console.log(`[checkout] Account created: ${account.id} (${account.slug})`);
}

async function handleUpsell(supabase: ReturnType<typeof createClient>, session: Record<string, any>) {
  const { data: license } = await supabase.from("licenses").select("*").eq("account_id", session.account_id).single();
  if (!license) return;

  const prev = { ...license };
  const upd: Record<string, any> = {
    extra_devices_web: license.extra_devices_web + (session.extra_devices_web || 0),
    extra_devices_meta: license.extra_devices_meta + (session.extra_devices_meta || 0),
    extra_attendants: license.extra_attendants + (session.extra_attendants || 0),
    monthly_value: (license.monthly_value || 0) + session.monthly_value,
  };
  if (session.has_ai_module) { upd.has_ai_module = true; upd.ai_agents_limit = 5; }
  if (session.facilite_plan && session.facilite_plan !== "none") {
    upd.facilite_plan = session.facilite_plan;
    upd.facilite_monthly_hours = ({ basico: 8, intermediario: 20, avancado: 40 } as any)[session.facilite_plan] ?? 0;
  }

  await supabase.from("licenses").update(upd).eq("id", license.id);
  await supabase.from("license_history").insert({
    account_id: session.account_id, changed_by_role: "system", change_type: "upsell",
    previous_state: prev, new_state: { ...license, ...upd }, checkout_session_id: session.id,
    reason: "Upsell via checkout",
  });
}

async function handleRenewal(supabase: ReturnType<typeof createClient>, session: Record<string, any>) {
  const { data: license } = await supabase.from("licenses").select("*").eq("account_id", session.account_id).single();
  if (!license) return;

  const base = new Date(license.valid_until || Date.now());
  const months = session.billing_cycle === "annual" ? 12 : 1;
  base.setMonth(base.getMonth() + months);

  await supabase.from("licenses").update({ valid_until: base.toISOString(), status: "active" }).eq("id", license.id);
  await supabase.from("accounts").update({ status: "active" }).eq("id", session.account_id).eq("status", "suspended");
  await supabase.from("license_history").insert({
    account_id: session.account_id, changed_by_role: "system", change_type: "renewal",
    previous_state: license, new_state: { ...license, valid_until: base.toISOString() },
    checkout_session_id: session.id, reason: "Renovação via checkout",
  });
}

async function sendActivationEmail(supabase: ReturnType<typeof createClient>, session: Record<string, any>, token: string) {
  const { sendEmail } = await import("../_shared/smtp.ts");
  const APP_URL = Deno.env.get("APP_URL") || "https://app.whatsflow.com.br";

  let fromEmail = "no-reply@whatsflow.com.br";
  let fromName = "Whatsflow";
  let appName = "Whatsflow";
  let logoHtml = "";

  if (session.whitelabel_id) {
    const { data: wb } = await supabase.from("whitelabel_branding")
      .select("app_name, logo_url, support_email, primary_color").eq("account_id", session.whitelabel_id).single();
    if (wb) {
      appName = wb.app_name || "Sistema"; fromName = appName;
      if (wb.support_email) fromEmail = wb.support_email;
      if (wb.logo_url) logoHtml = `<img src="${wb.logo_url}" alt="${appName}" style="height:40px;margin-bottom:24px;" />`;
    }
  }

  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
    ${logoHtml || `<div style="font-size:22px;font-weight:900;margin-bottom:24px;color:#10b981;">${appName}</div>`}
    <h1 style="font-size:22px;font-weight:800;margin:0 0 16px;">Sua conta foi criada! 🎉</h1>
    <p style="color:#94a3b8;">Olá, <strong>${session.buyer_name || session.buyer_email}</strong>! A conta <strong style="color:#e2e8f0;">${session.company_name}</strong> no ${appName} está pronta.</p>
    <a href="${APP_URL}/ativar/${token}" style="display:inline-block;background:#10b981;color:white;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin:24px 0;">Ativar minha conta →</a>
    <p style="color:#64748b;font-size:12px;">Link válido por 24h · Uso único · Se não foi você, ignore.</p>
  </div>`;

  await sendEmail({
    from: `${fromName} <${fromEmail}>`,
    to: session.buyer_email,
    subject: `Ative sua conta no ${appName}`,
    html,
  });
  console.log(`[checkout] Email sent to ${session.buyer_email}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING FINANCE PROCESSOR (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
async function processPaymentEvent(supabase: ReturnType<typeof createClient>, eventType: string, paymentData: Record<string, unknown>) {
  const asaasId = paymentData.id as string;
  console.log(`[asaas-webhook] Processing payment ${asaasId}`);

  await supabase.from("asaas_payments").upsert({
    tenant_id: "00000000-0000-0000-0000-000000000001",
    asaas_id: asaasId,
    asaas_customer_id: paymentData.customer as string,
    billing_type: paymentData.billingType || "UNDEFINED",
    status: paymentData.status as string,
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
  }, { onConflict: "tenant_id,asaas_id" });
}
