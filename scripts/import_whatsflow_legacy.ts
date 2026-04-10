#!/usr/bin/env npx ts-node
/**
 * import_whatsflow_legacy.ts
 * Custom importer for Whatsflow's specific CSV formats.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." npx ts-node scripts/import_whatsflow_legacy.ts \
 *     --csv-asaas="data/Clientes Asaas - Sheet0.csv" \
 *     --csv-legacy="data/Clientes Asaas - clientes (12).csv" \
 *     --tenant-id=0f84e587-aa9c-4b02-ba84-2887f4e640d9 \
 *     --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as readline from "readline";

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const CSV_ASAAS = getArg("csv-asaas") || "";
const CSV_LEGACY = getArg("csv-legacy") || "";
const TENANT_ID = getArg("tenant-id") || process.env.TENANT_ID || "";
const DRY_RUN = args.includes("--dry-run");
const BATCH_SIZE = 50;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.whatsflow.com.br";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) { console.error("❌ SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }
if (!TENANT_ID) { console.error("❌ --tenant-id required"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Phone Normalization (mirrors PostgreSQL) ──
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 8) return null;
  if (!digits.startsWith("55")) {
    if (digits.length >= 10 && digits.length <= 11) digits = "55" + digits;
    else return null;
  }
  if (digits.length < 12 || digits.length > 13) return null;
  const ddd = digits.substring(2, 4);
  let num = digits.substring(4);
  if (num.length === 8 && ["6", "7", "8", "9"].includes(num[0])) num = "9" + num;
  return "55" + ddd + num;
}

// ── CSV Parser ──
function parseCsvLine(line: string, sep?: string): string[] {
  // Auto-detect separator
  if (!sep) {
    if (line.includes("\t")) sep = "\t";
    else if (line.includes(";")) sep = ";";
    else sep = ",";
  }
  const result: string[] = [];
  let current = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if ((ch === sep) && !inQ) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  if (!filePath || !fs.existsSync(filePath)) { console.warn(`⚠️ File not found: ${filePath}`); return []; }
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (lineNum === 1) {
      headers = cells.map((h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
      continue;
    }
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = (cells[i] || "").trim();
    rows.push(row);
  }
  return rows;
}

// ── Parse BRL value ──
function parseBRL(val: string | undefined): number | null {
  if (!val) return null;
  const clean = val.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// ── Customer record ──
interface CustomerRecord {
  tenant_id: string;
  nome: string;
  email: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  whitelabel: string | null;
  status: string;
  data_ativacao: string | null;
  data_vencimento: string | null;
  dispositivos_oficial: number;
  atendentes: number;
  checkout: string | null;
  condicao: string | null;
  valor_ultima_cobranca: number | null;
  origem: string;
}

// ── Main ──
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Whatsflow Legacy Import (Golden Record)");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Tenant:  ${TENANT_ID}`);
  console.log(`  Dry Run: ${DRY_RUN}\n`);

  const asaasRows = await parseCsv(CSV_ASAAS);
  const legacyRows = await parseCsv(CSV_LEGACY);
  console.log(`📄 CSV A (Asaas):  ${asaasRows.length} rows`);
  console.log(`📄 CSV B (Legacy): ${legacyRows.length} rows`);

  // Build map by email (primary key for merge — no Asaas ID available)
  const recordMap = new Map<string, CustomerRecord>();
  let merged = 0, skippedA = 0, skippedB = 0;

  // Process CSV A (Asaas financial data)
  for (const row of asaasRows) {
    const email = (row.email || "").toLowerCase().trim();
    const phone = row.celular || row.fone || null;
    const cpf = (row.cpf_ou_cnpj || row.cpf_cnpj || "").replace(/\D/g, "") || null;
    const nome = row.nome || "";
    const valor = parseBRL(row.valor_pago);

    if (!email && !phone && !cpf) { skippedA++; continue; }
    const key = email || normalizePhone(phone) || cpf || "";
    if (!key) { skippedA++; continue; }

    // Skip cancelled entries in name
    if (nome.toLowerCase().includes("(cancelado)") || nome.toLowerCase().includes("cancelado")) continue;

    recordMap.set(key, {
      tenant_id: TENANT_ID,
      nome,
      email: email || null,
      cpf_cnpj: cpf,
      telefone: phone,
      whitelabel: null,
      status: valor && valor > 0 ? "Ativo" : "Inativo",
      data_ativacao: null,
      data_vencimento: null,
      dispositivos_oficial: 0,
      atendentes: 0,
      checkout: "Asaas",
      condicao: null,
      valor_ultima_cobranca: valor,
      origem: "asaas_import",
    });
  }

  // Process CSV B (Legacy platform) — merge or add
  for (const row of legacyRows) {
    const email = (row.email || "").toLowerCase().trim();
    const nome = row.empresa__titular || row.nome || "";
    const wl = row.whitelabel || null;
    const status = row.status || "Inativo";
    const ativacao = row.ativacao || null;
    const vencimento = row.vencimento || null;
    const dispOficial = parseInt(row.disp_oficial || "0") || 0;
    const atendentes = parseInt(row.atendentes || "0") || 0;
    const checkout = row.checkout || null;
    const condicao = row.condicao || null;
    const valor = parseBRL(row.valor_cobranca);

    if (!email && !nome) { skippedB++; continue; }

    // Skip test/fake entries
    if (email.includes("@teste.com") || email.includes("@test.com") || email.includes("@gmail.com.br") ||
        email.includes("undefined") || email.includes("@staging") || email.includes("@clint.digital") ||
        nome.toLowerCase().includes("teste") || nome.toLowerCase().includes("excluir") ||
        nome.toLowerCase().includes("deletar")) {
      skippedB++;
      continue;
    }

    const key = email || nome.toLowerCase();

    if (recordMap.has(key)) {
      // Merge with Asaas record
      const existing = recordMap.get(key)!;
      if (!existing.whitelabel && wl) existing.whitelabel = wl;
      if (!existing.data_ativacao && ativacao) existing.data_ativacao = ativacao;
      if (!existing.data_vencimento && vencimento) existing.data_vencimento = vencimento;
      if (dispOficial > existing.dispositivos_oficial) existing.dispositivos_oficial = dispOficial;
      if (atendentes > existing.atendentes) existing.atendentes = atendentes;
      if (!existing.checkout && checkout) existing.checkout = checkout;
      if (!existing.condicao && condicao) existing.condicao = condicao;
      if (status === "Ativo") existing.status = "Ativo";
      if (!existing.valor_ultima_cobranca && valor) existing.valor_ultima_cobranca = valor;
      existing.origem = "merged";
      merged++;
    } else {
      recordMap.set(key, {
        tenant_id: TENANT_ID,
        nome,
        email: email || null,
        cpf_cnpj: null,
        telefone: null,
        whitelabel: wl,
        status,
        data_ativacao: ativacao,
        data_vencimento: vencimento,
        dispositivos_oficial: dispOficial,
        atendentes,
        checkout,
        condicao,
        valor_ultima_cobranca: valor,
        origem: "legacy_import",
      });
    }
  }

  // Filter: only keep customers with real data (nome + email)
  const records = Array.from(recordMap.values()).filter((r) => r.nome && r.email);

  console.log(`\n📊 Results:`);
  console.log(`   Total unique:    ${records.length}`);
  console.log(`   Merged (A+B):    ${merged}`);
  console.log(`   Skipped (A):     ${skippedA}`);
  console.log(`   Skipped (B):     ${skippedB}`);
  console.log(`   Active:          ${records.filter((r) => r.status === "Ativo").length}`);
  console.log(`   Inactive:        ${records.filter((r) => r.status !== "Ativo").length}`);

  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN — Sample (first 10 active):");
    const sample = records.filter((r) => r.status === "Ativo").slice(0, 10);
    for (const r of sample) {
      console.log(`  ${r.nome.padEnd(35)} ${(r.email || "").padEnd(35)} ${r.whitelabel || "—"} ${r.checkout || "—"} R$${r.valor_ultima_cobranca || 0}`);
    }
    process.exit(0);
  }

  // ── Insert with check-before-insert (conditional index doesn't work with REST upsert) ──
  console.log(`\n⬆️  Importing ${records.length} records...`);
  let ok = 0, updated = 0, errors = 0;

  for (const r of records) {
    // Check if exists by email
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("email", r.email!)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: upErr } = await supabase
        .from("customers")
        .update({ ...r, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (upErr) { errors++; console.error(`  ❌ Update ${r.nome}: ${upErr.message}`); }
      else { updated++; }
    } else {
      // Insert new
      const { error: insErr } = await supabase
        .from("customers")
        .insert({ ...r, updated_at: new Date().toISOString() });
      if (insErr) { errors++; console.error(`  ❌ Insert ${r.nome}: ${insErr.message}`); }
      else { ok++; }
    }
    process.stdout.write(`  ✅ ${ok + updated}/${records.length} (${ok} new, ${updated} updated)\r`);
    // Small delay to avoid rate limiting
    if ((ok + updated + errors) % 10 === 0) await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n\n✅ Import complete: ${ok} OK, ${errors} errors`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
