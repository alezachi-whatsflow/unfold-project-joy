#!/usr/bin/env npx ts-node
/**
 * import_legacy_data.ts
 * Imports legacy CSV data into the Golden Record (customers table).
 *
 * Usage:
 *   npx ts-node scripts/import_legacy_data.ts \
 *     --csv-asaas=data/asaas_export.csv \
 *     --csv-legacy=data/plataforma_antiga.csv \
 *     --tenant-id=0f84e587-aa9c-4b02-ba84-2887f4e640d9 \
 *     --dry-run
 *
 * Environment:
 *   SUPABASE_URL (or uses default)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *
 * CSV A (Asaas) expected columns:
 *   id, name, email, cpfCnpj, phone, mobilePhone, value, billingType, status
 *
 * CSV B (Legacy) expected columns:
 *   nome, email, telefone, cpf_cnpj, plano, status, data_ativacao
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as readline from "readline";

// ── Config ──
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const CSV_ASAAS = getArg("csv-asaas") || "";
const CSV_LEGACY = getArg("csv-legacy") || "";
const TENANT_ID = getArg("tenant-id") || process.env.TENANT_ID || "";
const DRY_RUN = args.includes("--dry-run");
const BATCH_SIZE = 100;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.whatsflow.com.br";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}
if (!TENANT_ID) {
  console.error("❌ --tenant-id is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Phone Normalization (mirrors PostgreSQL normalize_br_phone) ──
function normalizePhoneForMatch(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 8) return null; // Too short / garbage

  // Add country code if missing
  if (!digits.startsWith("55")) {
    if (digits.length >= 10 && digits.length <= 11) {
      digits = "55" + digits;
    } else if (digits.length >= 8 && digits.length <= 9) {
      return null; // No DDD, can't normalize reliably
    }
  }

  if (digits.length < 12 || digits.length > 13) return null;

  const ddd = digits.substring(2, 4);
  let numberPart = digits.substring(4);

  // Add 9th digit for cellphones
  if (numberPart.length === 8) {
    const firstDigit = numberPart[0];
    if (["6", "7", "8", "9"].includes(firstDigit)) {
      numberPart = "9" + numberPart;
    }
  }

  return "55" + ddd + numberPart;
}

// ── CSV Parser (zero dependencies) ──
async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  if (!filePath || !fs.existsSync(filePath)) return [];

  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;

    // Simple CSV split (handles quoted fields with commas)
    const cells = parseCsvLine(line);

    if (lineNum === 1) {
      headers = cells.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      continue;
    }

    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = (cells[i] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Unified Customer Record ──
interface GoldenRecord {
  tenant_id: string;
  nome: string;
  email: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  status: string;
  data_ativacao: string | null;
  asaas_customer_id: string | null;
  origem: string;
  checkout: string | null;
  valor_ultima_cobranca: number | null;
  condicao: string | null;
}

// ── Main ──
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Golden Record Import — Legacy Data ETL");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Tenant:  ${TENANT_ID}`);
  console.log(`  CSV A:   ${CSV_ASAAS || "(not provided)"}`);
  console.log(`  CSV B:   ${CSV_LEGACY || "(not provided)"}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log("");

  // ── Parse CSVs ──
  const asaasRows = await parseCsv(CSV_ASAAS);
  const legacyRows = await parseCsv(CSV_LEGACY);
  console.log(`📄 CSV A (Asaas):  ${asaasRows.length} rows`);
  console.log(`📄 CSV B (Legacy): ${legacyRows.length} rows`);

  // ── Build unified map by normalized phone / cpf / email ──
  const recordMap = new Map<string, GoldenRecord>();
  let skippedAsaas = 0;
  let skippedLegacy = 0;
  let mergedCount = 0;

  // Process Asaas CSV first (has financial data)
  for (const row of asaasRows) {
    const phone = normalizePhoneForMatch(row.phone || row.mobilephone || row.celular);
    const email = (row.email || "").toLowerCase().trim() || null;
    const cpf = (row.cpfcnpj || row.cpf_cnpj || "").replace(/\D/g, "") || null;
    const name = row.name || row.nome || "";

    if (!phone && !email && !cpf) {
      skippedAsaas++;
      continue;
    }

    // Use normalized phone as primary key, fallback to cpf, then email
    const key = phone || cpf || email || "";

    const record: GoldenRecord = {
      tenant_id: TENANT_ID,
      nome: name,
      email,
      cpf_cnpj: cpf,
      telefone: row.phone || row.mobilephone || row.celular || null,
      status: mapStatus(row.status),
      data_ativacao: row.datecreated || row.data_ativacao || null,
      asaas_customer_id: row.id || null,
      origem: "asaas_import",
      checkout: "Asaas",
      valor_ultima_cobranca: parseFloat(row.value || row.valor || "0") || null,
      condicao: row.billingtype || row.condicao || null,
    };

    recordMap.set(key, record);
  }

  // Process Legacy CSV — merge or add
  for (const row of legacyRows) {
    const phone = normalizePhoneForMatch(row.telefone || row.phone || row.celular);
    const email = (row.email || "").toLowerCase().trim() || null;
    const cpf = (row.cpf_cnpj || row.cpfcnpj || row.documento || "").replace(/\D/g, "") || null;
    const name = row.nome || row.name || "";

    if (!phone && !email && !cpf && !name) {
      skippedLegacy++;
      continue;
    }

    const key = phone || cpf || email || "";

    if (recordMap.has(key)) {
      // Merge: enrich existing Asaas record with legacy data
      const existing = recordMap.get(key)!;
      if (!existing.nome && name) existing.nome = name;
      if (!existing.email && email) existing.email = email;
      if (!existing.cpf_cnpj && cpf) existing.cpf_cnpj = cpf;
      if (!existing.telefone && (row.telefone || row.phone)) {
        existing.telefone = row.telefone || row.phone;
      }
      if (!existing.data_ativacao && row.data_ativacao) {
        existing.data_ativacao = row.data_ativacao;
      }
      existing.origem = "merged";
      mergedCount++;
    } else {
      // New record from legacy only
      const record: GoldenRecord = {
        tenant_id: TENANT_ID,
        nome: name,
        email,
        cpf_cnpj: cpf,
        telefone: row.telefone || row.phone || row.celular || null,
        status: mapStatus(row.status),
        data_ativacao: row.data_ativacao || null,
        asaas_customer_id: null,
        origem: "legacy_import",
        checkout: null,
        valor_ultima_cobranca: null,
        condicao: row.plano || row.condicao || null,
      };
      recordMap.set(key, record);
    }
  }

  const records = Array.from(recordMap.values());
  console.log("");
  console.log(`📊 Results:`);
  console.log(`   Total records:  ${records.length}`);
  console.log(`   Merged (A+B):   ${mergedCount}`);
  console.log(`   Asaas only:     ${asaasRows.length - mergedCount - skippedAsaas}`);
  console.log(`   Legacy only:    ${records.length - asaasRows.length + skippedAsaas}`);
  console.log(`   Skipped (A):    ${skippedAsaas}`);
  console.log(`   Skipped (B):    ${skippedLegacy}`);

  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN — No data will be written.");
    console.log("\nSample records (first 5):");
    for (const r of records.slice(0, 5)) {
      console.log(`  ${r.nome} | ${r.telefone} → ${normalizePhoneForMatch(r.telefone)} | ${r.email || "—"} | ${r.asaas_customer_id || "no asaas"}`);
    }
    process.exit(0);
  }

  // ── Bulk Upsert ──
  console.log(`\n⬆️  Upserting ${records.length} records in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    const { error } = await supabase.from("customers").upsert(
      batch.map((r) => ({
        ...r,
        updated_at: new Date().toISOString(),
      })),
      {
        onConflict: "tenant_id,normalized_phone",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error(`  ❌ Batch ${batchNum}/${totalBatches}: ${error.message}`);
      errors += batch.length;

      // Fallback: try one by one
      for (const record of batch) {
        const { error: singleErr } = await supabase.from("customers").upsert(
          { ...record, updated_at: new Date().toISOString() },
          { onConflict: "tenant_id,normalized_phone" }
        );
        if (singleErr) {
          // Try by email
          if (record.email) {
            const { error: emailErr } = await supabase.from("customers").upsert(
              { ...record, updated_at: new Date().toISOString() },
              { onConflict: "tenant_id,email" }
            );
            if (!emailErr) { inserted++; errors--; continue; }
          }
          console.error(`    ⚠️  Failed: ${record.nome} (${record.telefone}): ${singleErr.message}`);
        } else {
          inserted++;
          errors--;
        }
      }
    } else {
      inserted += batch.length;
      process.stdout.write(`  ✅ Batch ${batchNum}/${totalBatches} (${inserted} records)\r`);
    }

    // Rate limit: 200ms between batches
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\n═══════════════════════════════════════════════`);
  console.log(`  ✅ Import complete`);
  console.log(`  Inserted/Updated: ${inserted}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`═══════════════════════════════════════════════`);
}

function mapStatus(raw: string | undefined): string {
  if (!raw) return "Ativo";
  const s = raw.toLowerCase().trim();
  if (["active", "ativo", "a"].includes(s)) return "Ativo";
  if (["inactive", "inativo", "i", "cancelled", "cancelado"].includes(s)) return "Cancelado";
  if (["blocked", "bloqueado"].includes(s)) return "Bloqueado";
  return "Ativo";
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
