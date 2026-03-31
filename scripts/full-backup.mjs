#!/usr/bin/env node
/**
 * FULL BACKUP — Exports all data from old Supabase to JSON files
 * Saves to F:\Bkp_WFW_old\ as individual JSON files per table
 * Also exports auth.users via Admin API
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const OLD_URL = 'https://jtlrglzcsmqmapizqgzu.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU5NDg4NCwiZXhwIjoyMDg2MTcwODg0fQ.f7ZtkOwUnZnZdqeJRRsbcT0bvcFO7TGkR09onHN4CoY'

const BACKUP_DIR = 'F:\\Bkp_WFW_old'
const PAGE_SIZE = 1000

// ALL tables to backup
const TABLES = [
  'tenants', 'profiles', 'user_tenants', 'licenses',
  'whatsapp_instances', 'whatsapp_contacts', 'whatsapp_leads',
  'whatsapp_messages', 'whatsapp_groups', 'whatsapp_group_members',
  'whatsapp_campaigns', 'whatsapp_providers',
  'sales_pipelines', 'crm_contacts', 'negocios', 'activities', 'leads',
  'asaas_customers', 'asaas_payments', 'asaas_revenue', 'asaas_expenses',
  'channel_integrations', 'departments', 'tenant_tags', 'quick_replies',
  'company_profile', 'ai_configurations', 'conversation_notes',
  'conversations', 'nexus_users', 'nexus_audit_logs', 'nexus_tickets',
  'nexus_feature_flags', 'nexus_license_usage',
  'data_lifecycle_queue', 'data_lifecycle_audit',
  'tenant_sync_configs', 'tenant_sync_logs',
  'checkout_sessions', 'activation_tokens', 'accounts',
  'whitelabel_config', 'automation_triggers',
  'message_logs', 'audit_logs', 'mass_send_history',
  'nexus_system_metrics', 'sla_configs',
  'pzaafi_organizations', 'pzaafi_wallet_accounts',
  'pzaafi_provider_connections', 'pzaafi_checkouts',
  'pzaafi_products', 'pzaafi_orders', 'pzaafi_payments',
]

async function fetchAll(table) {
  const rows = []
  let offset = 0
  while (true) {
    const res = await fetch(`${OLD_URL}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { 'apikey': OLD_KEY, 'Authorization': `Bearer ${OLD_KEY}` },
    })
    if (!res.ok) {
      if (res.status === 404) return { rows: [], error: 'not_found' }
      if (res.status === 403) return { rows: [], error: 'permission_denied' }
      return { rows: [], error: `http_${res.status}` }
    }
    const data = await res.json()
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return { rows, error: null }
}

async function fetchAuthUsers() {
  const res = await fetch(`${OLD_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { 'apikey': OLD_KEY, 'Authorization': `Bearer ${OLD_KEY}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.users || data || []
}

async function main() {
  mkdirSync(BACKUP_DIR, { recursive: true })

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  FULL BACKUP → F:\\Bkp_WFW_old            ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // 1. Auth users
  process.stdout.write('  auth.users... ')
  const users = await fetchAuthUsers()
  writeFileSync(join(BACKUP_DIR, 'auth_users.json'), JSON.stringify(users, null, 2))
  console.log(`✓ ${users.length} users`)

  // 2. All tables
  let totalRows = 0
  const summary = []

  for (const table of TABLES) {
    process.stdout.write(`  ${table}... `)
    const { rows, error } = await fetchAll(table)

    if (error) {
      console.log(`SKIP (${error})`)
      summary.push({ table, rows: 0, status: error })
      continue
    }

    if (rows.length === 0) {
      console.log('EMPTY')
      summary.push({ table, rows: 0, status: 'empty' })
      continue
    }

    writeFileSync(join(BACKUP_DIR, `${table}.json`), JSON.stringify(rows, null, 2))
    totalRows += rows.length
    console.log(`✓ ${rows.length} rows → ${table}.json`)
    summary.push({ table, rows: rows.length, status: 'ok' })
  }

  // 3. Save summary
  writeFileSync(join(BACKUP_DIR, '_BACKUP_SUMMARY.json'), JSON.stringify({
    date: new Date().toISOString(),
    source: OLD_URL,
    auth_users: users.length,
    tables: summary,
    total_rows: totalRows,
  }, null, 2))

  console.log('\n═══ BACKUP COMPLETE ═══')
  console.log(`  Location: ${BACKUP_DIR}`)
  console.log(`  Auth users: ${users.length}`)
  console.log(`  Tables: ${summary.filter(s => s.status === 'ok').length} with data`)
  console.log(`  Total rows: ${totalRows}`)
  console.log(`  Files: ${summary.filter(s => s.status === 'ok').length + 2} JSON files`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
