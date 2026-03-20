# Referências de API Internas

**PostgREST do Supabase**:
A maioria da arquitetura opera diretamente no REST gerado pelo GoTrue/Supabase via SDK Cliente (`@supabase/supabase-js`). Não há rotas tradicionais GET /api/v1/*.

**Exemplo de Consumo Front-End (Supabase SDK)**:
```javascript
const { data, error } = await supabase
  .from('negocios')
  .select('*, clientes(nome), users(nome)')
  .eq('tenant_id', MY_TENANT);
```

**Edge Functions** (Supabase CLI -> `functions/...`):
Existem funções externas que podem ser invocadas via `supabase.functions.invoke('webhook-asaas', { body: data } )`. Elas agem como a verdadeira API privada.
STATUS: APIs parciais identificadas nos controllers e integradores do Frontend.