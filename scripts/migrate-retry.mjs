#!/usr/bin/env node
/**
 * RETRY MIGRATION — handles schema mismatches by stripping unknown columns
 */

const OLD_URL = 'https://jtlrglzcsmqmapizqgzu.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHJnbHpjc21xbWFwaXpxZ3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU5NDg4NCwiZXhwIjoyMDg2MTcwODg0fQ.f7ZtkOwUnZnZdqeJRRsbcT0bvcFO7TGkR09onHN4CoY'
const NEW_URL = 'https://supabase.whatsflow.com.br'
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzQwMjk4MDAsImV4cCI6MTkzMTcwOTgwMH0.fVZ2xocweHQ_DeHwwqmVx9ytb-LEtXWr6Mrz9OPWLqk'
const PAGE_SIZE = 500

// Tables that failed + reason
const RETRY_TABLES = [
  'profiles', 'licenses', 'whatsapp_instances', 'whatsapp_contacts',
  'whatsapp_leads', 'whatsapp_messages', 'sales_pipelines', 'negocios',
  'asaas_expenses', 'channel_integrations', 'company_profile',
  'whatsapp_groups', 'whatsapp_providers', 'departments', 'tenant_tags',
  'quick_replies', 'conversation_notes', 'automation_triggers',
  'pzaafi_organizations',
]

async function getNewTableColumns(table) {
  // Insert empty row to get error with column list, or use a dummy select
  const res = await fetch(`${NEW_URL}/rest/v1/${table}?select=*&limit=0`, {
    headers: { 'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}` },
  })
  if (!res.ok) return null
  // Parse columns from response headers or empty array structure
  return res.ok ? 'exists' : null
}

async function fetchAll(url, key, table) {
  const rows = []
  let offset = 0
  while (true) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return rows
}

async function discoverColumns(url, key, table) {
  // Try inserting empty to discover what columns exist
  const testRes = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  })
  if (!testRes.ok) return null
  const testData = await testRes.json()
  if (testData.length > 0) return Object.keys(testData[0])
  // Empty table — try inserting a minimal row to get error
  return null
}

async function insertWithColumnFilter(table, rows) {
  if (!rows.length) return 0

  // Try full insert first
  let testRes = await fetch(`${NEW_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([rows[0]]),
  })

  if (testRes.ok) {
    // Full row works — insert all in batches
    let inserted = 1
    for (let i = 1; i < rows.length; i += 100) {
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
    }
    return inserted
  }

  // Failed — find the bad column
  const errText = await testRes.text()
  const colMatch = errText.match(/Could not find the '(\w+)' column/)
  if (!colMatch) {
    console.log(`    Unknown error: ${errText.substring(0, 150)}`)
    return 0
  }

  // Strip bad columns iteratively
  let badCols = new Set()
  let currentRows = rows
  let attempts = 0

  while (attempts < 20) {
    const match = errText.match(/Could not find the '(\w+)' column/)
    // We need to re-test after stripping
    badCols.add(colMatch[1])

    // Strip all known bad columns
    currentRows = rows.map(row => {
      const clean = { ...row }
      for (const col of badCols) delete clean[col]
      return clean
    })

    const retryRes = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([currentRows[0]]),
    })

    if (retryRes.ok) break

    const retryErr = await retryRes.text()
    const nextBad = retryErr.match(/Could not find the '(\w+)' column/)
    if (!nextBad) {
      // Different error — maybe constraint
      if (retryErr.includes('duplicate') || retryErr.includes('already exists')) break
      console.log(`    Non-column error: ${retryErr.substring(0, 150)}`)
      break
    }
    badCols.add(nextBad[1])
    attempts++
  }

  if (badCols.size) console.log(`    Stripped columns: ${[...badCols].join(', ')}`)

  // Now insert all cleaned rows in batches
  let inserted = 0
  for (let i = 0; i < currentRows.length; i += 100) {
    const batch = currentRows.slice(i, i + 100)
    const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (res.ok) {
      inserted += batch.length
    } else {
      // Try individual
      for (const row of batch) {
        const sRes = await fetch(`${NEW_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': NEW_KEY, 'Authorization': `Bearer ${NEW_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(row),
        })
        if (sRes.ok) inserted++
      }
    }
  }
  return inserted
}

async function main() {
  console.log('═══ RETRY MIGRATION (schema-adaptive) ═══\n')

  for (const table of RETRY_TABLES) {
    process.stdout.write(`  ${table}... `)
    const rows = await fetchAll(OLD_URL, OLD_KEY, table)
    if (!rows.length) { console.log('EMPTY/ERROR'); continue }
    console.log(`fetched ${rows.length} → `)
    const inserted = await insertWithColumnFilter(table, rows)
    console.log(`    ✓ ${inserted}/${rows.length} rows inserted`)
  }

  console.log('\n═══ RETRY DONE ═══')
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
