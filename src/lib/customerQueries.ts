import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerRow } from "@/types/customers";

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    whitelabel: row.whitelabel,
    nome: row.nome,
    email: row.email,
    cpfCnpj: row.cpf_cnpj || "",
    status: row.status,
    dataAtivacao: row.data_ativacao,
    dataCancelado: row.data_cancelado,
    dataBloqueio: row.data_bloqueio,
    dataDesbloqueio: row.data_desbloqueio,
    dataVencimento: row.data_vencimento,
    dispositivosOficial: row.dispositivos_oficial,
    dispositivosNaoOficial: row.dispositivos_nao_oficial,
    atendentes: row.atendentes,
    adicional: row.adicional,
    checkout: row.checkout,
    receita: row.receita,
    tipoPagamento: row.tipo_pagamento,
    condicao: row.condicao,
    valorUltimaCobranca: row.valor_ultima_cobranca,
  };
}

function customerToRow(
  customer: Customer
): Omit<CustomerRow, "created_at" | "updated_at"> {
  return {
    id: customer.id,
    whitelabel: customer.whitelabel,
    nome: customer.nome,
    email: customer.email,
    cpf_cnpj: customer.cpfCnpj || "",
    status: customer.status,
    data_ativacao: customer.dataAtivacao,
    data_cancelado: customer.dataCancelado,
    data_bloqueio: customer.dataBloqueio,
    data_desbloqueio: customer.dataDesbloqueio,
    data_vencimento: customer.dataVencimento,
    dispositivos_oficial: customer.dispositivosOficial,
    dispositivos_nao_oficial: customer.dispositivosNaoOficial,
    atendentes: customer.atendentes,
    adicional: customer.adicional,
    checkout: customer.checkout,
    receita: customer.receita,
    tipo_pagamento: customer.tipoPagamento,
    condicao: customer.condicao,
    valor_ultima_cobranca: customer.valorUltimaCobranca,
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const allData: CustomerRow[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("nome", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...(data as CustomerRow[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData.map(rowToCustomer);
}

export async function importCustomersBatch(
  customers: Customer[]
): Promise<void> {
  const emailMap = new Map<string, Customer>();
  for (const c of customers) {
    emailMap.set(c.email.toLowerCase(), c);
  }
  const unique = Array.from(emailMap.values());

  const rows = unique.map((c) => ({
    ...customerToRow(c),
    updated_at: new Date().toISOString(),
  }));

  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("customers")
      .upsert(chunk, { onConflict: "email" });
    if (error) throw error;
  }
}

export async function deleteCustomerById(id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
