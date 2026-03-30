// ─────────────────────────────────────────────────────────────
// Pzaafi — Edge Function: pzaafi-checkout
// Deno / Supabase Edge Functions
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const body = await req.json()
    const { organization_id, order_id, payload, preferred_connector, max_retries } = body

    if (!organization_id || !order_id || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, order_id, payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Verify user belongs to the organization
    const { data: orgMember } = await supabase
      .from('pzaafi_org_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return new Response(JSON.stringify({ error: 'Forbidden: not a member of this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch active connector for the organization
    const { data: connection } = await supabase
      .from('pzaafi_provider_connections')
      .select('connector_id, credentials_encrypted')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'No active payment connector configured' }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const connectorId = preferred_connector ?? connection.connector_id

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('pzaafi_payments')
      .insert({
        order_id,
        organization_id,
        connector_id: connectorId,
        method: payload.method,
        status: 'pending',
        amount: payload.amount,
        fee: 0,
        net: payload.amount,
        metadata: payload.metadata ?? {},
      })
      .select('id')
      .single()

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: `Failed to create payment: ${paymentError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // TODO: Call the actual connector API here with decrypted credentials
    // For now, return the pending payment record so the client can poll
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        connector_id: connectorId,
        status: 'pending',
        max_retries: max_retries ?? 1,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('[pzaafi-checkout]', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
