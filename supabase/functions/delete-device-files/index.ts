// delete-device-files
// Processa a fila de exclusão de arquivos de dispositivos removidos.
// Chamado a cada hora pelo pg_cron via net.http_post.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();

  // Buscar itens pendentes (max 100 por execução)
  const { data: pendingItems, error: fetchError } = await supabase
    .from('data_lifecycle_queue')
    .select('*')
    .in('operation_type', ['delete_device_files', 'delete_tenant_storage'])
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!pendingItems?.length) {
    return new Response(
      JSON.stringify({ processed: 0, message: 'Nenhum item pendente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processed = 0;
  let failed = 0;
  let totalBytesFreed = 0;
  const BUCKET = 'whatsapp-media';

  for (const item of pendingItems) {
    try {
      // Marcar como processing
      await supabase
        .from('data_lifecycle_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', item.id);

      const storagePath = item.storage_path;
      if (!storagePath) {
        await supabase
          .from('data_lifecycle_queue')
          .update({ status: 'skipped', completed_at: new Date().toISOString() })
          .eq('id', item.id);
        continue;
      }

      // Listar arquivos no caminho
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(storagePath, { limit: 1000 });

      if (listError || !files?.length) {
        // Path não existe ou vazio — marcar como skipped
        await supabase
          .from('data_lifecycle_queue')
          .update({ status: 'skipped', completed_at: new Date().toISOString() })
          .eq('id', item.id);
        processed++;
        continue;
      }

      // Calcular bytes antes de deletar
      const bytesFreed = files.reduce((sum: number, f: any) => sum + (f.metadata?.size || 0), 0);
      totalBytesFreed += bytesFreed;

      // Deletar todos os arquivos do path
      const filePaths = files.map((f: any) => `${storagePath}/${f.name}`);
      const { error: deleteError } = await supabase.storage.from(BUCKET).remove(filePaths);

      if (deleteError) throw new Error(deleteError.message);

      // Tentar deletar subpastas também
      for (const file of files) {
        if (file.id === null) {
          // É uma pasta — listar e deletar recursivamente
          const { data: subFiles } = await supabase.storage
            .from(BUCKET)
            .list(`${storagePath}/${file.name}`);

          if (subFiles?.length) {
            const subPaths = subFiles.map((sf: any) => `${storagePath}/${file.name}/${sf.name}`);
            await supabase.storage.from(BUCKET).remove(subPaths);
          }
        }
      }

      await supabase
        .from('data_lifecycle_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: { ...(item.metadata || {}), files_deleted: files.length, bytes_freed: bytesFreed },
        })
        .eq('id', item.id);

      // Atualizar audit log com bytes liberados
      if (item.tenant_id) {
        await supabase.from('data_lifecycle_audit').insert({
          tenant_id: item.tenant_id,
          operation_type: item.operation_type,
          operation_status: 'completed',
          files_deleted: files.length,
          storage_bytes_freed: bytesFreed,
          triggered_by: 'edge_function',
          metadata: { storage_path: storagePath, connection_id: item.connection_id },
        });
      }

      processed++;
    } catch (error: any) {
      await supabase
        .from('data_lifecycle_queue')
        .update({
          status: item.attempts >= 3 ? 'failed' : 'pending',
          error_message: error.message,
          attempts: (item.attempts || 0) + 1,
        })
        .eq('id', item.id);
      failed++;
    }
  }

  const duration = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      processed,
      failed,
      bytes_freed: totalBytesFreed,
      duration_ms: duration,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
