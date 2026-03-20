# Backend

Não existe um servidor NodeJS monolítico central rodando express. O "Backend" é na verdade diluído em três frentes principais:

1. **PostgREST (Supabase)**: As APIs CRUD completas são expostas automaticamente via schema do banco de dados (`@supabase/supabase-js`).
2. **Supabase Edge Functions**: Código backend isolado (Deno) em `supabase/functions/` destinado a segredos e conexões sensíveis:
   - Webhooks de financeiro (Asaas)
   - Chatbots / IA chamadas OpenAI diretas
3. **Database Scripts / Triggers / Functions**: Muitas das lógicas pesadas estão diretamente no SQL PL/pgSQL (`check_tenant_access`, `handle_new_user`, etc.).

**Tratamento de Erros e Eventos**: Os eventos Webhook chamam funções Edge (HTTP), que atualizam o DB, que por sua vez enviam `Realtime` eventos para o Frontend via postgrest websockets (ex: atualizar notificação de pagamento na UI).