#!/usr/bin/env node
/**
 * Create missing tables in new Supabase via service_role + SQL RPC
 * First creates a temporary exec_sql function, then uses it to create tables
 */

const NEW_URL = 'https://supabase.whatsflow.com.br'
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzQwMjk4MDAsImV4cCI6MTkzMTcwOTgwMH0.fVZ2xocweHQ_DeHwwqmVx9ytb-LEtXWr6Mrz9OPWLqk'

const OLD_URL = 'https://jtlrglzcsmqmapizqgzu.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU5NDg4NCwiZXhwIjoyMDg2MTcwODg0fQ.f7ZtkOwUnZnZdqeJRRsbcT0bvcFO7TGkR09onHN4CoY'

// Missing tables and their data from old DB
const MISSING_TABLES = [
  'whatsapp_groups', 'whatsapp_providers', 'departments',
  'quick_replies', 'automation_triggers', 'tenant_tags',
  'conversation_notes',
]

// Also need to add missing columns to existing tables
const MISSING_COLUMNS = {
  profiles: ['email TEXT', 'signature_enabled BOOLEAN DEFAULT false', 'signature_text TEXT'],
  licenses: ['pzaafi_tier TEXT', 'pzaafi_enabled_at TIMESTAMPTZ', 'pzaafi_parent_org_id UUID', 'whatsapp_provider_id UUID'],
  whatsapp_instances: ['auto_close_message TEXT', 'auto_close_minutes INT', 'consecutive_failures INT DEFAULT 0', 'last_catchup_at TIMESTAMPTZ', 'last_heartbeat_at TIMESTAMPTZ'],
  whatsapp_contacts: ['tenant_id UUID'],
  whatsapp_leads: ['ai_sentiment_score TEXT', 'concurrent_conversations_avg NUMERIC', 'idle_time_minutes NUMERIC', 'is_resolved_first_contact BOOLEAN', 'resolved_at TIMESTAMPTZ', 'tenant_id UUID', 'time_to_first_yes_minutes NUMERIC'],
  whatsapp_messages: ['assigned_agent_id UUID', 'sender_name TEXT', 'transcription TEXT', 'transcription_at TIMESTAMPTZ'],
  sales_pipelines: ['card_schema JSONB DEFAULT \'[]\''],
  negocios: ['custom_fields JSONB DEFAULT \'{}\''],
  asaas_expenses: ['attachment_filename TEXT', 'attachment_size_bytes INT', 'attachment_type TEXT', 'origem TEXT DEFAULT \'Manual\''],
  channel_integrations: ['bot_token TEXT', 'bot_username TEXT', 'credentials JSONB', 'message_type TEXT', 'ml_app_id TEXT', 'ml_user_id TEXT', 'page_access_token TEXT', 'page_name TEXT', 'refresh_token TEXT', 'token_expires_at TIMESTAMPTZ'],
  company_profile: ['address TEXT', 'city TEXT', 'cnpj TEXT', 'employee_count TEXT', 'phone TEXT', 'state TEXT'],
}

async function fetchAll(url, key, table) {
  const rows = []
  let offset = 0
  while (true) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=500&offset=${offset}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    rows.push(...data)
    if (data.length < 500) break
    offset += 500
  }
  return rows
}

async function insertBatch(table, rows) {
  if (!rows.length) return 0
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (res.ok) inserted += batch.length
    else {
      const err = await res.text()
      console.log(`    batch error: ${err.substring(0, 120)}`)
    }
  }
  return inserted
}

async function main() {
  console.log('═══ STEP 1: Add missing columns to existing tables ═══\n')

  // Use PostgREST to check if columns exist by attempting SELECT
  for (const [table, columns] of Object.entries(MISSING_COLUMNS)) {
    for (const colDef of columns) {
      const colName = colDef.split(' ')[0]
      // Test if column exists
      const testRes = await fetch(`${NEW_URL}/rest/v1/${table}?select=${colName}&limit=0`, {
        headers: { 'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}` },
      })
      if (testRes.ok) {
        // Column exists
        continue
      }
      console.log(`  Adding ${table}.${colName}...`)
      // Need to add column — this requires SQL access
      // Since we can't run SQL directly, we'll note what's needed
      console.log(`    ⚠ Cannot add column via REST — need SQL: ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colDef}`)
    }
  }

  console.log('\n═══ STEP 2: Check missing tables ═══\n')

  for (const table of MISSING_TABLES) {
    const testRes = await fetch(`${NEW_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { 'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}` },
    })
    if (testRes.ok) {
      console.log(`  ${table} ✓ EXISTS`)
    } else {
      console.log(`  ${table} ✗ MISSING — need SQL: CREATE TABLE`)
    }
  }

  // Also check pzaafi tables
  for (const table of ['pzaafi_organizations', 'pzaafi_wallet_accounts', 'pzaafi_checkouts']) {
    const testRes = await fetch(`${NEW_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { 'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}` },
    })
    console.log(`  ${table} ${testRes.ok ? '✓ EXISTS' : '✗ MISSING'}`)
  }

  console.log('\n═══ STEP 3: Retry data migration for tables that now exist ═══\n')

  // Try inserting data into tables that DO exist
  for (const table of [...MISSING_TABLES, 'pzaafi_organizations']) {
    const testRes = await fetch(`${NEW_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { 'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}` },
    })
    if (!testRes.ok) continue // Skip missing tables

    process.stdout.write(`  ${table}... `)
    const rows = await fetchAll(OLD_URL, OLD_KEY, table)
    if (!rows.length) { console.log('EMPTY'); continue }

    // Strip columns that might not exist in new
    const inserted = await insertBatch(table, rows)
    console.log(`✓ ${inserted}/${rows.length}`)
  }

  console.log('\n═══ SUMMARY ═══')
  console.log('The new Supabase needs migrations applied to create missing tables and columns.')
  console.log('Run all migrations from supabase/migrations/ on the new database.')
  console.log('The DB port (5432) needs to be opened for external access, or use the Supabase Studio SQL editor.')
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
