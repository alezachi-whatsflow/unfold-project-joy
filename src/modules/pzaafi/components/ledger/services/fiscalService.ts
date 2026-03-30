// ─────────────────────────────────────────────────────────────
// Pzaafi — Fiscal Service (Module C)
// Emits fiscal documents (NF-e / NFS-e) via external API
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'

// ── Types ────────────────────────────────────────────────────

export interface FiscalDocument {
  id: string
  org_id: string
  payment_id: string | null
  order_id: string | null
  doc_type: 'nfe' | 'nfse'
  status: 'pending' | 'issued' | 'failed' | 'cancelled'
  external_id: string | null
  series: string | null
  number: string | null
  issued_at: string | null
  pdf_url: string | null
  xml_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface EmitFiscalDocumentParams {
  org_id: string
  payment_id?: string
  order_id?: string
  doc_type: 'nfe' | 'nfse'
  /** External fiscal API endpoint (organization-configured) */
  fiscal_api_url: string
  /** API key for the fiscal service */
  fiscal_api_key: string
  /** Payload to send to the fiscal API */
  payload: Record<string, unknown>
}

export interface EmitFiscalResult {
  document_id: string
  status: 'pending' | 'issued' | 'failed'
  external_id?: string
  pdf_url?: string
  xml_url?: string
}

// ── Emit fiscal document ────────────────────────────────────

export async function emitFiscalDocument(
  params: EmitFiscalDocumentParams,
): Promise<EmitFiscalResult> {
  // 1. Create pending record in database
  const { data: doc, error: insertError } = await supabase
    .from('pzaafi_fiscal_documents')
    .insert({
      org_id: params.org_id,
      payment_id: params.payment_id ?? null,
      order_id: params.order_id ?? null,
      doc_type: params.doc_type,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) throw new Error(`[FiscalService] Insert failed: ${insertError.message}`)

  const documentId = doc.id as string

  // 2. Call external fiscal API
  try {
    const response = await fetch(params.fiscal_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.fiscal_api_key}`,
      },
      body: JSON.stringify(params.payload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Fiscal API returned ${response.status}: ${errorBody}`)
    }

    const result = (await response.json()) as {
      id?: string
      series?: string
      number?: string
      pdf_url?: string
      xml_url?: string
    }

    // 3. Update record with success
    await supabase
      .from('pzaafi_fiscal_documents')
      .update({
        status: 'issued',
        external_id: result.id ?? null,
        series: result.series ?? null,
        number: result.number ?? null,
        pdf_url: result.pdf_url ?? null,
        xml_url: result.xml_url ?? null,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return {
      document_id: documentId,
      status: 'issued',
      external_id: result.id,
      pdf_url: result.pdf_url,
      xml_url: result.xml_url,
    }
  } catch (err) {
    // 4. Update record with failure
    const errorMessage = err instanceof Error ? err.message : 'Unknown fiscal API error'
    await supabase
      .from('pzaafi_fiscal_documents')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return {
      document_id: documentId,
      status: 'failed',
    }
  }
}
