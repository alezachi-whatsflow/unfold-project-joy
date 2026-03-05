import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine environment from body or default to production for cron
    let environment = "production";
    try {
      const body = await req.json();
      if (body?.environment) environment = body.environment;
    } catch {
      // No body (cron call) - use production
    }

    const baseUrl = environment === "sandbox" ? ASAAS_SANDBOX_URL : ASAAS_PRODUCTION_URL;

    // Fetch active dunning rules
    const { data: rules, error: rulesErr } = await supabase
      .from("dunning_rules")
      .select("*")
      .eq("status", "active");

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active dunning rules", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch overdue payments
    const { data: overduePayments, error: payErr } = await supabase
      .from("asaas_payments")
      .select("*")
      .eq("status", "OVERDUE");

    if (payErr) throw payErr;

    let totalProcessed = 0;
    const now = new Date();

    for (const payment of overduePayments || []) {
      const dueDate = new Date(payment.due_date);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find matching rule (by checkout_source_id or generic)
      const matchingRule =
        rules.find((r: any) => r.checkout_source_id === payment.checkout_source_id) ||
        rules.find((r: any) => !r.checkout_source_id);

      if (!matchingRule) continue;

      const steps = (matchingRule.rules as any[]) || [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.days_after_due !== daysOverdue) continue;

        // Check if already executed (idempotency)
        const { data: existing } = await supabase
          .from("dunning_executions")
          .select("id")
          .eq("dunning_rule_id", matchingRule.id)
          .eq("payment_id", payment.id)
          .eq("step_index", i)
          .maybeSingle();

        if (existing) continue;

        // Execute action via Asaas API
        let success = false;
        let result: any = {};

        try {
          if (step.action === "notification" || step.action === "email") {
            const resp = await fetch(`${baseUrl}/notifications`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: asaasApiKey,
              },
              body: JSON.stringify({
                customer: payment.asaas_customer_id,
                payment: payment.asaas_id,
                type: step.action === "email" ? "EMAIL" : "PUSH",
                message: step.message,
              }),
            });
            result = await resp.json();
            success = resp.ok;
          } else if (step.action === "sms") {
            // SMS via Asaas notification API
            const resp = await fetch(`${baseUrl}/notifications`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: asaasApiKey,
              },
              body: JSON.stringify({
                customer: payment.asaas_customer_id,
                payment: payment.asaas_id,
                type: "SMS",
                message: step.message,
              }),
            });
            result = await resp.json();
            success = resp.ok;
          } else if (step.action === "protest") {
            const resp = await fetch(`${baseUrl}/paymentDunnings`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                access_token: asaasApiKey,
              },
              body: JSON.stringify({
                payment: payment.asaas_id,
                type: "CREDIT_BUREAU",
              }),
            });
            result = await resp.json();
            success = resp.ok;
          }
        } catch (err) {
          result = { error: String(err) };
          success = false;
        }

        // Log execution
        await supabase.from("dunning_executions").insert({
          tenant_id: payment.tenant_id,
          dunning_rule_id: matchingRule.id,
          payment_id: payment.id,
          step_index: i,
          action: step.action,
          success,
          result,
        });

        totalProcessed++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Dunning run complete", processed: totalProcessed, environment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-dunning error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
