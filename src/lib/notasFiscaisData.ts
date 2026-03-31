import { NotaFiscal } from "@/types/notasFiscais";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "fiscal_notas_fiscais";

export async function loadNotas(tenantId?: string): Promise<NotaFiscal[]> {
  if (tenantId) {
    const { data, error } = await (supabase as any)
      .from("fiscal_notes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("data_emissao", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map(dbToNota);
    }
  }

  // Fallback to localStorage (migration)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate to DB if tenant available
      if (tenantId && parsed.length > 0) {
        migrateNotasToDb(parsed, tenantId);
      }
      return parsed;
    }
  } catch {}
  return [];
}

export async function saveNotas(notas: NotaFiscal[], tenantId?: string) {
  if (tenantId) {
    for (const nota of notas) {
      await (supabase as any)
        .from("fiscal_notes")
        .upsert(notaToDb(nota, tenantId), { onConflict: "id" });
    }
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
  }
}

export function getNextNFNumber(notas: NotaFiscal[]): string {
  const nums = notas.map((n) => parseInt(n.numero)).filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return String(next).padStart(6, "0");
}

function dbToNota(row: any): NotaFiscal {
  return {
    id: row.id,
    numero: row.numero || "",
    tipo: row.tipo || "NFS-e",
    clienteNome: row.cliente_nome || "",
    clienteCpfCnpj: row.cliente_cpf_cnpj || "",
    clienteEmail: row.cliente_email || "",
    clienteEndereco: row.cliente_endereco || "",
    valor: Number(row.valor) || 0,
    impostos: Number(row.impostos) || 0,
    dataEmissao: row.data_emissao || new Date().toISOString(),
    status: row.status || "pendente",
    itens: row.itens || [],
    tributos: row.tributos || {},
    observacoes: row.metadata?.observacoes || "",
    motivoCancelamento: row.metadata?.motivoCancelamento || undefined,
  };
}

function notaToDb(nota: NotaFiscal, tenantId: string): Record<string, any> {
  return {
    id: nota.id,
    tenant_id: tenantId,
    numero: nota.numero,
    tipo: nota.tipo,
    cliente_nome: nota.clienteNome,
    cliente_cpf_cnpj: nota.clienteCpfCnpj,
    cliente_email: nota.clienteEmail,
    cliente_endereco: nota.clienteEndereco,
    valor: nota.valor,
    impostos: nota.impostos,
    data_emissao: nota.dataEmissao,
    status: nota.status,
    itens: nota.itens,
    tributos: nota.tributos,
    metadata: { observacoes: nota.observacoes, motivoCancelamento: nota.motivoCancelamento },
    updated_at: new Date().toISOString(),
  };
}

async function migrateNotasToDb(notas: NotaFiscal[], tenantId: string) {
  for (const nota of notas) {
    await (supabase as any)
      .from("fiscal_notes")
      .upsert(notaToDb(nota, tenantId), { onConflict: "id" })
      .then(({ error }: any) => {
        if (error) console.warn("[FiscalNotes] Migration error:", error);
      });
  }
  localStorage.removeItem(STORAGE_KEY);
  console.log(`[FiscalNotes] Migrated ${notas.length} notas from localStorage to DB`);
}
