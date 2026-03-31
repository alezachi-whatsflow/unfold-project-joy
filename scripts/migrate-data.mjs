#!/usr/bin/env node
/**
 * WHATSFLOW DATA MIGRATION
 * Old Supabase Cloud → New Self-Hosted
 *
 * Migrates ALL data from all tables via REST API (service_role)
 * Handles: pagination, foreign key order, auth.users
 */

const OLD_URL = 'https://jtlrglzcsmqmapizqgzu.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU5NDg4NCwiZXhwIjoyMDg2MTcwODg0fQ.f7ZtkOwUnZnZdqeJRRsbcT0bvcFO7TGkR09onHN4CoY'

const NEW_URL = 'https://supabase.whatsflow.com.br'
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzQwMjk4MDAsImV4cCI6MTkzMTcwOTgwMH0.fVZ2xocweHQ_DeHwwqmVx9ytb-LEtXWr6Mrz9OPWLqk'

const PAGE_SIZE = 500

// Tables in dependency order (parents first)
const TABLES = [
  // Core identity
  'tenants',
  'profiles',
  'user_tenants',
  'licenses',

  // WhatsApp
  'whatsapp_instances',
  'whatsapp_contacts',
  'whatsapp_leads',
  'whatsapp_messages',
  'whatsapp_groups',
  'whatsapp_group_members',
  'whatsapp_campaigns',

  // CRM
  'sales_pipelines',
  'crm_contacts',
  'negocios',
  'activities',
  'leads',

  // Finance
  'asaas_customers',
  'asaas_payments',
  'asaas_revenue',
  'asaas_expenses',

  // Integrations
  'channel_integrations',
  'whatsapp_providers',

  // Config
  'departments',
  'tenant_tags',
  'quick_replies',
  'company_profile',
  'ai_configurations',
  'conversation_notes',
  'conversations',

  // Nexus
  'nexus_users',
  'nexus_audit_logs',
  'nexus_tickets',
  'nexus_feature_flags',
  'nexus_license_usage',

  // Lifecycle
  'data_lifecycle_queue',
  'data_lifecycle_audit',

  // Sync
  'tenant_sync_configs',
  'tenant_sync_logs',

  // Checkout
  'checkout_sessions',
  'activation_tokens',

  // Accounts
  'accounts',
  'whitelabel_config',

  // Automation
  'automation_triggers',

  // Logs
  'message_logs',
  'audit_logs',
  'mass_send_history',

  // System metrics
  'nexus_system_metrics',
  'sla_configs',

  // Pzaafi (if any data exists)
  'pzaafi_organizations',
  'pzaafi_wallet_accounts',
  'pzaafi_provider_connections',
  'pzaafi_checkouts',
  'pzaafi_products',
  'pzaafi_orders',
  'pzaafi_payments',
  'pzaafi_split_rules',
  'pzaafi_settlements',
  'pzaafi_refunds',
  'pzaafi_chargebacks',
  'pzaafi_ledger_entries',
  'pzaafi_webhook_events',
  'pzaafi_subscriptions',
  'pzaafi_fiscal_documents',
  'pzaafi_audit_log',
  'pzaafi_org_members',
  'pzaafi_kyc_records',
  'pzaafi_commission_rules',
  'pzaafi_split_executions',
  'pzaafi_payouts',
]

async function fetchAll(baseUrl, key, table) {
  const rows = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'count=exact',
        },
      }
    )

    if (!res.ok) {
      const err = await res.text()
      if (res.status === 404 || err.includes('does not exist')) {
        return { rows: [], exists: false }
      }
      throw new Error(`Fetch ${table}: ${res.status} ${err}`)
    }

    const data = await res.json()
    rows.push(...data)

    const total = res.headers.get('content-range')
    hasMore = data.length === PAGE_SIZE
    offset += PAGE_SIZE
  }

  return { rows, exists: true }
}

async function insertBatch(baseUrl, key, table, rows) {
  if (!rows.length) return 0

  // Insert in batches of 100
  const BATCH = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)

    const res = await fetch(
      `${baseUrl}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      // Try individual inserts on batch failure
      if (res.status === 409 || err.includes('duplicate') || err.includes('conflict')) {
        for (const row of batch) {
          try {
            const singleRes = await fetch(
              `${baseUrl}/rest/v1/${table}`,
              {
                method: 'POST',
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal',
                },
                body: JSON.stringify(row),
              }
            )
            if (singleRes.ok) inserted++
          } catch {}
        }
        continue
      }
      console.error(`  ✗ Insert batch ${table} [${i}..${i+BATCH}]: ${err.substring(0, 200)}`)
      continue
    }

    inserted += batch.length
  }

  return inserted
}

async function migrateAuthUsers() {
  console.log('\n═══ MIGRATING AUTH USERS ═══')

  // Fetch users from old instance
  const res = await fetch(
    `${OLD_URL}/auth/v1/admin/users?page=1&per_page=1000`,
    {
      headers: {
        'apikey': OLD_KEY,
        'Authorization': `Bearer ${OLD_KEY}`,
      },
    }
  )

  if (!res.ok) {
    console.error('  ✗ Failed to fetch auth users:', res.status)
    return
  }

  const data = await res.json()
  const users = data.users || data || []
  console.log(`  Found ${users.length} auth users`)

  let migrated = 0
  for (const user of users) {
    try {
      // Create user in new instance via admin API
      const createRes = await fetch(
        `${NEW_URL}/auth/v1/admin/users`,
        {
          method: 'POST',
          headers: {
            'apikey': NEW_KEY,
            'Authorization': `Bearer ${NEW_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            phone: user.phone || undefined,
            email_confirm: true,
            phone_confirm: !!user.phone,
            user_metadata: user.user_metadata || {},
            app_metadata: user.app_metadata || {},
            // Preserve the original UUID
            id: user.id,
          }),
        }
      )

      if (createRes.ok) {
        migrated++
      } else {
        const err = await createRes.text()
        if (err.includes('already') || err.includes('duplicate')) {
          migrated++ // Already exists
        } else {
          console.error(`  ✗ User ${user.email}: ${err.substring(0, 100)}`)
        }
      }
    } catch (e) {
      console.error(`  ✗ User ${user.email}: ${e.message}`)
    }
  }

  console.log(`  ✓ Auth users: ${migrated}/${users.length} migrated`)
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  WHATSFLOW DATA MIGRATION                   ║')
  console.log('║  Old: jtlrglzcsmqmapizqgzu.supabase.co      ║')
  console.log('║  New: supabase.whatsflow.com.br              ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log()

  // 1. Migrate auth users first
  await migrateAuthUsers()

  // 2. Migrate data tables
  console.log('\n═══ MIGRATING DATA TABLES ═══')

  const results = []

  for (const table of TABLES) {
    process.stdout.write(`  ${table}... `)

    try {
      const { rows, exists } = await fetchAll(OLD_URL, OLD_KEY, table)

      if (!exists) {
        console.log('SKIP (not in old DB)')
        results.push({ table, status: 'skip', rows: 0 })
        continue
      }

      if (rows.length === 0) {
        console.log('EMPTY')
        results.push({ table, status: 'empty', rows: 0 })
        continue
      }

      const inserted = await insertBatch(NEW_URL, NEW_KEY, table, rows)
      console.log(`✓ ${inserted}/${rows.length} rows`)
      results.push({ table, status: 'ok', rows: inserted, total: rows.length })

    } catch (e) {
      console.log(`✗ ERROR: ${e.message.substring(0, 100)}`)
      results.push({ table, status: 'error', error: e.message })
    }
  }

  // Summary
  console.log('\n═══ MIGRATION SUMMARY ═══')
  const ok = results.filter(r => r.status === 'ok')
  const empty = results.filter(r => r.status === 'empty')
  const skipped = results.filter(r => r.status === 'skip')
  const errors = results.filter(r => r.status === 'error')

  console.log(`  ✓ Migrated: ${ok.length} tables (${ok.reduce((a, r) => a + r.rows, 0)} total rows)`)
  console.log(`  ○ Empty: ${empty.length} tables`)
  console.log(`  → Skipped: ${skipped.length} tables`)
  if (errors.length) {
    console.log(`  ✗ Errors: ${errors.length} tables`)
    errors.forEach(r => console.log(`    - ${r.table}: ${r.error?.substring(0, 80)}`))
  }

  console.log('\n═══ DONE ═══')
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
