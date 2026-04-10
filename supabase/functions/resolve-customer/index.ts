/**
 * resolve-customer — Identity Resolution (Golden Record)
 * Given a phone number (any format), finds or creates a unified customer.
 * Uses normalize_br_phone() in PostgreSQL for reliable phone matching.
 * Links: whatsapp_leads ↔ customers ↔ asaas_customers
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { phone, name, email, cpf_cnpj, tenant_id, source } = await req.json();
    if (!phone || !tenant_id) {
      return json({ error: "phone e tenant_id obrigatórios" }, 400);
    }

    // 1. Normalize the phone using PostgreSQL function
    const { data: normResult } = await supabase.rpc("normalize_br_phone", { phone_text: phone });
    const normalizedPhone = normResult || phone.replace(/\D/g, "");

    console.log(`[resolve-customer] Input: ${phone} → Normalized: ${normalizedPhone}, tenant=${tenant_id}`);

    // 2. Search for existing customer by normalized phone
    const { data: existing } = await supabase
      .from("customers")
      .select("id, nome, email, cpf_cnpj, telefone, normalized_phone, asaas_customer_id")
      .eq("tenant_id", tenant_id)
      .eq("normalized_phone", normalizedPhone)
      .maybeSingle();

    if (existing) {
      // 3a. Found — update with new info if provided
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name && (!existing.nome || /^\d+$/.test(existing.nome))) updates.nome = name;
      if (email && !existing.email) updates.email = email;
      if (cpf_cnpj && !existing.cpf_cnpj) updates.cpf_cnpj = cpf_cnpj;

      if (Object.keys(updates).length > 1) {
        await supabase.from("customers").update(updates).eq("id", existing.id);
      }

      console.log(`[resolve-customer] Found existing: ${existing.id} (${existing.nome})`);
      return json({
        customer_id: existing.id,
        nome: name || existing.nome,
        is_new: false,
        normalized_phone: normalizedPhone,
        asaas_customer_id: existing.asaas_customer_id,
      });
    }

    // 3b. Not found by phone — try email match
    if (email) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("id, nome, telefone, asaas_customer_id")
        .eq("tenant_id", tenant_id)
        .eq("email", email)
        .maybeSingle();

      if (byEmail) {
        // Update phone on existing record
        await supabase.from("customers").update({
          telefone: phone,
          updated_at: new Date().toISOString(),
        }).eq("id", byEmail.id);

        console.log(`[resolve-customer] Matched by email: ${byEmail.id}`);
        return json({
          customer_id: byEmail.id,
          nome: byEmail.nome,
          is_new: false,
          normalized_phone: normalizedPhone,
          asaas_customer_id: byEmail.asaas_customer_id,
        });
      }
    }

    // 4. Not found — check asaas_customers table
    const { data: asaasCust } = await supabase
      .from("asaas_customers")
      .select("asaas_id, name, email, cpf_cnpj")
      .eq("tenant_id", tenant_id)
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone},mobilePhone.eq.${normalizedPhone},mobilePhone.eq.${phone}`)
      .maybeSingle();

    // 5. Create new customer (Golden Record)
    const customerName = name || asaasCust?.name || phone;
    const customerEmail = email || asaasCust?.email || null;
    const customerCpfCnpj = cpf_cnpj || asaasCust?.cpf_cnpj || null;

    const { data: newCustomer, error: insertErr } = await supabase
      .from("customers")
      .insert({
        tenant_id,
        nome: customerName,
        telefone: phone,
        email: customerEmail,
        cpf_cnpj: customerCpfCnpj,
        asaas_customer_id: asaasCust?.asaas_id || null,
        origem: source || "auto",
        status: "Ativo",
        data_ativacao: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (insertErr) {
      // Duplicate race condition — retry lookup
      if (insertErr.message?.includes("duplicate") || insertErr.message?.includes("unique")) {
        const { data: retry } = await supabase
          .from("customers")
          .select("id, nome, asaas_customer_id")
          .eq("tenant_id", tenant_id)
          .eq("normalized_phone", normalizedPhone)
          .maybeSingle();
        if (retry) {
          return json({ customer_id: retry.id, nome: retry.nome, is_new: false, normalized_phone: normalizedPhone });
        }
      }
      console.error("[resolve-customer] Insert error:", insertErr.message);
      return json({ error: insertErr.message }, 500);
    }

    console.log(`[resolve-customer] Created new: ${newCustomer.id} (${customerName})`);

    return json({
      customer_id: newCustomer.id,
      nome: customerName,
      is_new: true,
      normalized_phone: normalizedPhone,
      asaas_customer_id: asaasCust?.asaas_id || null,
    });

  } catch (err: any) {
    console.error("[resolve-customer] Error:", err);
    return json({ error: err.message }, 500);
  }
});
