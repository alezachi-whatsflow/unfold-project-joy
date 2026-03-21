// encrypt-old-files
// Processa a fila de criptografia de arquivos com 6+ meses.
// Criptografa com AES-256-GCM usando chave única por tenant.
// Chamado diariamente às 03:00 BRT pelo pg_cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Converte string hex para Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Importa chave AES-256-GCM da Web Crypto API
async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Criptografa buffer com AES-256-GCM
// Formato: [12 bytes IV][encrypted data]
async function encryptBuffer(buffer: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), 12);
  return result.buffer;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  const BUCKET = 'whatsapp-media';
  const BATCH_SIZE = 500;

  // Buscar lote de arquivos para criptografar
  const { data: items, error: fetchError } = await supabase
    .from('data_lifecycle_queue')
    .select('*')
    .eq('operation_type', 'encrypt_file')
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!items?.length) {
    return new Response(
      JSON.stringify({ encrypted: 0, message: 'Nenhum arquivo pendente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let encrypted = 0;
  let failed = 0;
  let skipped = 0;

  // Cache de chaves por tenant para evitar queries repetidas
  const keyCache: Record<string, CryptoKey> = {};

  for (const item of items) {
    try {
      // Marcar como processing
      await supabase
        .from('data_lifecycle_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', item.id);

      if (!item.storage_path || !item.tenant_id) {
        await supabase
          .from('data_lifecycle_queue')
          .update({ status: 'skipped', completed_at: new Date().toISOString() })
          .eq('id', item.id);
        skipped++;
        continue;
      }

      // Obter chave do tenant (ou gerar uma nova)
      if (!keyCache[item.tenant_id]) {
        const { data: keyData, error: keyError } = await supabase
          .rpc('get_tenant_decrypted_key', { p_tenant_id: item.tenant_id });

        if (keyError) throw new Error(`Chave não encontrada: ${keyError.message}`);
        keyCache[item.tenant_id] = await importAesKey(keyData.key_material);
      }

      const cryptoKey = keyCache[item.tenant_id];

      // Baixar arquivo original do Storage
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(item.storage_path);

      if (downloadError || !fileBlob) {
        // Arquivo não existe mais — marcar como skipped
        await supabase
          .from('data_lifecycle_queue')
          .update({ status: 'skipped', completed_at: new Date().toISOString() })
          .eq('id', item.id);
        skipped++;
        continue;
      }

      const originalType = fileBlob.type;
      const arrayBuffer = await fileBlob.arrayBuffer();

      // Criptografar
      const encryptedBuffer = await encryptBuffer(arrayBuffer, cryptoKey);
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });

      // Substituir arquivo original pelo criptografado
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(item.storage_path, encryptedBlob, {
          upsert: true,
          contentType: 'application/octet-stream',
        });

      if (uploadError) throw new Error(uploadError.message);

      // Atualizar registro no banco de dados
      if (item.target_table && item.target_id) {
        await supabase
          .from(item.target_table)
          .update({
            file_encrypted: true,
            file_encrypted_at: new Date().toISOString(),
          })
          .eq('id', item.target_id);
      }

      // Marcar como completed
      await supabase
        .from('data_lifecycle_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...(item.metadata || {}),
            original_type: originalType,
            original_size: arrayBuffer.byteLength,
            encrypted_size: encryptedBuffer.byteLength,
          },
        })
        .eq('id', item.id);

      encrypted++;
    } catch (error: any) {
      await supabase
        .from('data_lifecycle_queue')
        .update({
          status: (item.attempts || 0) >= 3 ? 'failed' : 'pending',
          error_message: error.message,
          attempts: (item.attempts || 0) + 1,
        })
        .eq('id', item.id);
      failed++;
    }
  }

  // Registrar no audit log
  if (encrypted > 0 || failed > 0) {
    await supabase.from('data_lifecycle_audit').insert({
      operation_type: 'encrypt_old_files_batch',
      operation_status: failed > 0 ? 'partial' : 'completed',
      files_encrypted: encrypted,
      triggered_by: 'pg_cron',
      execution_duration_ms: Date.now() - startTime,
      metadata: { encrypted, failed, skipped, batch_size: items.length },
    });
  }

  return new Response(
    JSON.stringify({
      encrypted,
      failed,
      skipped,
      duration_ms: Date.now() - startTime,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
