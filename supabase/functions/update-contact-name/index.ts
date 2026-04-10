/**
 * update-contact-name
 * Cascading name update: Lead → Contact → Customer → Negocios
 * Sets name_edited_manually=true so webhooks don't overwrite.
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
    // Authenticate
    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { chat_id, instance_name, new_name, email, cpf_cnpj } = await req.json();
    if (!chat_id || !instance_name || !new_name) {
      return json({ error: "chat_id, instance_name e new_name obrigatórios" }, 400);
    }

    const phone = chat_id.replace(/@.*$/, "");
    const now = new Date().toISOString();
    const updates: string[] = [];

    // 1. Update whatsapp_leads (primary source)
    const { error: leadErr } = await supabase
      .from("whatsapp_leads")
      .update({
        lead_name: new_name,
        lead_full_name: new_name,
        name_edited_manually: true,
        updated_at: now,
      })
      .eq("chat_id", chat_id)
      .eq("instance_name", instance_name);

    if (leadErr) {
      console.error("[update-contact-name] Lead update error:", leadErr.message);
    } else {
      updates.push("lead");
    }

    // 2. Update whatsapp_contacts (all instances with same jid)
    const { error: contactErr } = await supabase
      .from("whatsapp_contacts")
      .update({ name: new_name, updated_at: now })
      .eq("jid", chat_id);

    if (!contactErr) updates.push("contacts");

    // 3. Find or create customer using normalized phone
    const { data: normResult } = await supabase.rpc("normalize_br_phone", { phone_text: phone });
    const normalizedPhone = normResult || phone;

    // Resolve tenant
    const { data: ut } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantIdForCustomer = ut?.tenant_id;

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("normalized_phone", normalizedPhone)
      .eq("tenant_id", tenantIdForCustomer)
      .maybeSingle();

    let customerId = existingCustomer?.id || null;

    if (customerId) {
      // Update existing customer
      const updateData: Record<string, any> = { nome: new_name };
      if (email) updateData.email = email;
      if (cpf_cnpj) updateData.cpf_cnpj = cpf_cnpj;

      await supabase.from("customers").update(updateData).eq("id", customerId);
      updates.push("customer_updated");
    } else {
      // Resolve tenant
      const { data: ut } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ut?.tenant_id) {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            tenant_id: ut.tenant_id,
            nome: new_name,
            telefone: phone,
            email: email || null,
            cpf_cnpj: cpf_cnpj || null,
            origem: "inbox",
          })
          .select("id")
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
          updates.push("customer_created");
        }
      }
    }

    // 4. Link customer to lead
    if (customerId) {
      await supabase
        .from("whatsapp_leads")
        .update({ customer_id: customerId })
        .eq("chat_id", chat_id)
        .eq("instance_name", instance_name);
    }

    // 5. Update related negocios
    const { data: negocios } = await supabase
      .from("negocios")
      .select("id")
      .or(`cliente_nome.eq.${phone},cliente_nome.eq.${chat_id}`)
      .limit(10);

    if (negocios?.length) {
      for (const n of negocios) {
        await supabase.from("negocios").update({ cliente_nome: new_name }).eq("id", n.id);
      }
      updates.push(`negocios(${negocios.length})`);
    }

    console.log(`[update-contact-name] ${chat_id} → "${new_name}" | Updated: ${updates.join(", ")}`);

    return json({
      success: true,
      updated: updates,
      customer_id: customerId,
    });
  } catch (err: any) {
    console.error("[update-contact-name] Error:", err);
    return json({ error: err.message }, 500);
  }
});
