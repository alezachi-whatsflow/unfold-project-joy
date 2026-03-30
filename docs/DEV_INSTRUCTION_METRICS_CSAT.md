# Instruções para o Desenvolvedor — Métricas de Atendimento + CSAT
> Documento técnico para ativação completa do sistema de métricas
> Última atualização: 2026-03-26

---

## 1. VISÃO GERAL

O sistema de Métricas de Atendimento coleta dados de **3 fontes** para gerar **17 indicadores** em tempo real:

```
whatsapp_messages (msgs enviadas/recebidas)
        │
        ▼
  conversations (tracking de atendimento)
        │
        ▼
    negocios (funil de vendas/CRM)
        │
        ▼
   csat_ratings (satisfação do cliente)
```

**Localização na plataforma:** Caixa de Entrada → Sidebar → "Métricas"

**Arquivo principal:** `src/components/mensageria/metrics/AttendanceMetrics.tsx`

---

## 2. O QUE JÁ ESTÁ IMPLEMENTADO (não mexer)

### 2.1 Banco de Dados
- Tabela `csat_ratings` criada com RLS
- Colunas adicionadas em `conversations`: `first_response_at`, `claimed_at`, `resolved_at`, `csat_sent`, `csat_rating`
- Colunas adicionadas em `whatsapp_messages`: `sender_name`, `assigned_agent_id`
- Migration: `20260326214119_activate_attendance_metrics.sql`

### 2.2 Edge Functions Deployadas
- `uazapi-webhook` — atualizado para popular `first_response_at`, `claimed_at` e capturar CSAT
- `send-csat` — envia pesquisa de satisfação via WhatsApp
- `messenger-send` — envio via Facebook Messenger

### 2.3 Frontend
- Dashboard de métricas com 5 seções (Tempos, Volume, Funil, Atendentes, CSAT)
- Seletor de período (Hoje, 7d, 30d, 90d)
- Cards com KPIs + tabelas de ranking por atendente

---

## 3. O QUE PRECISA SER FEITO (pendências)

### 3.1 CRÍTICO — Popular `first_response_at` e `claimed_at`

**Problema:** O webhook popula esses campos apenas para novas conversas. Conversas existentes têm esses campos como `NULL`.

**Ação 1:** Executar SQL para popular dados históricos:

```sql
-- Popular first_response_at com base na primeira msg outgoing por conversa
UPDATE conversations c
SET first_response_at = sub.first_out
FROM (
  SELECT DISTINCT ON (remote_jid)
    remote_jid,
    MIN(created_at) FILTER (WHERE direction = 'outgoing') as first_out
  FROM whatsapp_messages
  WHERE direction = 'outgoing'
  GROUP BY remote_jid
) sub
WHERE c.first_response_at IS NULL
  AND c.tenant_id IS NOT NULL;

-- Popular claimed_at = first_response_at quando não existe
UPDATE conversations
SET claimed_at = first_response_at
WHERE claimed_at IS NULL AND first_response_at IS NOT NULL;

-- Popular resolved_at para conversas com status "resolved"
UPDATE conversations
SET resolved_at = updated_at
WHERE status = 'resolved' AND resolved_at IS NULL;
```

**Ação 2:** Verificar que o webhook `uazapi-webhook` está populando corretamente:
- Quando uma mensagem **outgoing** é salva → verificar se `conversations.first_response_at` é NULL → se sim, setar com `now()`
- Quando uma mensagem **outgoing** é salva → verificar se `conversations.claimed_at` é NULL → se sim, setar com `now()`

**Arquivo:** `supabase/functions/uazapi-webhook/index.ts` (linhas ~535-575)

**Teste:** Envie uma mensagem de teste e verifique no Supabase se os campos foram preenchidos:
```sql
SELECT id, first_response_at, claimed_at, resolved_at
FROM conversations
WHERE tenant_id = 'SEU_TENANT_ID'
ORDER BY created_at DESC LIMIT 5;
```

---

### 3.2 CRÍTICO — Vincular `conversations` ao WhatsApp

**Problema atual:** As `conversations` são criadas pelo sistema de chat_messages (Meta Cloud API), mas as conversas do WhatsApp Web (uazapi) são rastreadas via `whatsapp_messages` usando `remote_jid` — **não criam `conversations` automaticamente**.

**Ação:** O webhook precisa criar/atualizar uma `conversation` para cada `remote_jid` individual:

```typescript
// No uazapi-webhook, após salvar a mensagem:
const jid = normalized.remote_jid;
if (!jid.endsWith("@g.us")) {  // Só individuais, não grupos
  await supabase.from("conversations").upsert({
    tenant_id: tenantId,
    channel: "whatsapp",
    status: "open",
    last_message_at: new Date().toISOString(),
    // wa_connection_id pode ser o instance_name
  }, { onConflict: "tenant_id,channel" });  // ATENÇÃO: precisa de unique constraint
}
```

**ATENÇÃO:** A tabela `conversations` pode não ter um unique constraint que permita upsert por `tenant_id + remote_jid`. Verificar e criar se necessário:

```sql
-- Adicionar campo para identificar conversa por JID
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_external
  ON conversations(tenant_id, external_id) WHERE external_id IS NOT NULL;
```

---

### 3.3 IMPORTANTE — Ativar envio automático de CSAT

**Fluxo esperado:**
```
1. Agente clica "Resolver" na conversa
2. Frontend chama API para mudar status → "resolved"
3. Frontend ou trigger chama Edge Function send-csat
4. Mensagem de avaliação é enviada ao cliente
5. Cliente responde 1-5
6. Webhook detecta resposta e salva em csat_ratings
```

**Onde integrar no frontend:**

Arquivo: `src/components/whatsapp/panels/ChatPanel.tsx` (botão "Resolver")

```typescript
// Quando o agente clica em "Resolver":
async function handleResolve() {
  // 1. Atualizar status da conversa
  await supabase.from("conversations").update({
    status: "resolved",
    resolved_at: new Date().toISOString()
  }).eq("id", conversationId);

  // 2. Enviar CSAT automaticamente
  await supabase.functions.invoke("send-csat", {
    body: {
      conversation_id: conversationId,
      phone: contactPhone,  // número do cliente
      instance_name: instanceName,  // instância uazapi
      tenant_id: tenantId,
    },
  });
}
```

**Edge Function `send-csat`:** Já está deployada em `supabase/functions/send-csat/index.ts`

**Mensagem enviada ao cliente:**
```
⭐ Avaliação de Atendimento

Olá! Seu atendimento foi finalizado.

Por favor, avalie de 1 a 5 como foi sua experiência:

1️⃣ Péssimo
2️⃣ Ruim
3️⃣ Regular
4️⃣ Bom
5️⃣ Excelente

Responda apenas com o número de 1 a 5.
```

**Detecção da resposta:** Já implementada no `uazapi-webhook`:
- Quando uma mensagem incoming contém apenas "1", "2", "3", "4" ou "5"
- Verifica se existe conversa com `csat_sent = true` e `csat_rating = null`
- Salva o rating em `csat_ratings` e atualiza `conversations.csat_rating`

**Teste:**
1. Resolver uma conversa manualmente
2. Chamar send-csat via curl:
```bash
curl -X POST \
  -H "apikey: ANON_KEY" \
  -H "Authorization: Bearer SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "https://supabase.whatsflow.com.br/functions/v1/send-csat" \
  -d '{"phone":"554396443912","instance_name":"Teste Ale SP","tenant_id":"00000000-0000-0000-0000-000000000001"}'
```
3. Responder com "4" no WhatsApp
4. Verificar em `csat_ratings`:
```sql
SELECT * FROM csat_ratings ORDER BY created_at DESC LIMIT 5;
```

---

### 3.4 IMPORTANTE — 5 Métricas pendentes

| Métrica | Como implementar | Esforço |
|---------|-----------------|---------|
| **Taxa de multitarefas** | Contar conversas simultâneas por agente (overlap de claimed_at → resolved_at) | Médio |
| **Tempo ocioso** | Gap entre resolved_at de uma conversa e claimed_at da próxima, por agente | Médio |
| **Primeira resposta resolutiva** | Conversas resolvidas com ≤2 mensagens do agente | Baixo |
| **Tempo até primeiro "sim"** | Análise de texto: buscar "sim", "ok", "pode", "fechado" em msgs incoming após proposta | Alto (IA) |
| **Índice de reclamações** | Usar `keyword_alerts` table + busca por palavras: "reclamar", "procon", "cancelar", "insatisfeito" | Médio |

**Para implementar "Primeira resposta resolutiva":**
```sql
SELECT
  count(*) FILTER (WHERE agent_msgs <= 2) as first_contact_resolved,
  count(*) as total_resolved,
  ROUND(100.0 * count(*) FILTER (WHERE agent_msgs <= 2) / NULLIF(count(*), 0), 1) as fcr_rate
FROM (
  SELECT c.id,
    (SELECT count(*) FROM whatsapp_messages m
     WHERE m.remote_jid = c.external_id
     AND m.direction = 'outgoing') as agent_msgs
  FROM conversations c
  WHERE c.status = 'resolved'
    AND c.tenant_id = 'TENANT_ID'
    AND c.created_at >= NOW() - INTERVAL '30 days'
) sub;
```

---

## 4. ARQUITETURA DOS DADOS

### 4.1 Fluxo de uma conversa completa

```
T=0   Cliente envia mensagem
      → whatsapp_messages INSERT (direction=incoming)
      → conversations INSERT (status=open, created_at=now)

T=5min Agente vê e assume a conversa
      → conversations UPDATE (claimed_at=now, assigned_to=agent_id)

T=6min Agente responde
      → whatsapp_messages INSERT (direction=outgoing)
      → conversations UPDATE (first_response_at=now)

T=20min Conversa continua...
      → whatsapp_messages INSERT (várias)
      → conversations UPDATE (last_message_at=now)

T=30min Agente resolve
      → conversations UPDATE (status=resolved, resolved_at=now)
      → send-csat INVOKE (envia pesquisa)
      → conversations UPDATE (csat_sent=true)

T=35min Cliente avalia
      → whatsapp_messages INSERT (body="4", direction=incoming)
      → csat_ratings INSERT (rating=4)
      → conversations UPDATE (csat_rating=4)
```

### 4.2 Tabelas envolvidas

```
whatsapp_messages
├── id, tenant_id, instance_name
├── remote_jid (identifica o contato)
├── direction (incoming/outgoing)
├── body, type, status
├── sender_name (nome do agente)
├── created_at, updated_at
└── assigned_agent_id

conversations
├── id, tenant_id
├── channel (whatsapp/instagram/messenger)
├── status (open/pending/resolved)
├── assigned_to (UUID do agente)
├── created_at (início da conversa)
├── claimed_at (agente assumiu)
├── first_response_at (primeira resposta)
├── resolved_at (finalizada)
├── last_message_at (última msg)
├── csat_sent (pesquisa enviada?)
├── csat_rating (nota 1-5)
└── external_id (remote_jid)

csat_ratings
├── id, tenant_id
├── conversation_id
├── contact_phone, contact_name
├── rating (1-5)
├── comment (opcional)
├── channel (whatsapp/instagram/messenger)
├── agent_id, agent_name
└── created_at

negocios
├── id, tenant_id, pipeline_id
├── status (prospeccao → qualificado → proposta → ...)
├── stage_entered_at (quando mudou de status)
├── consultor_id, consultor_nome
├── created_at
└── valor_total, valor_liquido
```

---

## 5. COMO CALCULAR CADA MÉTRICA

### 5.1 Tempo de espera até atendimento (TME)
```sql
SELECT AVG(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 60) as avg_minutes
FROM conversations
WHERE tenant_id = ? AND claimed_at IS NOT NULL AND created_at >= ?;
```

### 5.2 Tempo médio de resposta (TMR)
```sql
SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_minutes
FROM conversations
WHERE tenant_id = ? AND first_response_at IS NOT NULL AND created_at >= ?;
```

### 5.3 Tempo total de atendimento (TTA)
```sql
SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - claimed_at)) / 60) as avg_minutes
FROM conversations
WHERE tenant_id = ? AND resolved_at IS NOT NULL AND claimed_at IS NOT NULL AND created_at >= ?;
```

### 5.4 Atendimentos por atendente/dia
```sql
SELECT
  sender_name,
  COUNT(*) as total_msgs,
  COUNT(DISTINCT DATE(created_at)) as days_active,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT DATE(created_at)), 0), 1) as msgs_per_day
FROM whatsapp_messages
WHERE tenant_id = ? AND direction = 'outgoing' AND created_at >= ?
GROUP BY sender_name
ORDER BY total_msgs DESC;
```

### 5.5 Taxa de finalização
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'resolved') / NULLIF(COUNT(*), 0), 1) as rate
FROM conversations
WHERE tenant_id = ? AND created_at >= ?;
```

### 5.6 Taxa de conversão por atendente
```sql
SELECT
  consultor_nome,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'fechado_ganho') as won,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'fechado_ganho') / NULLIF(COUNT(*), 0), 1) as conversion_rate
FROM negocios
WHERE tenant_id = ? AND created_at >= ?
GROUP BY consultor_nome
ORDER BY conversion_rate DESC;
```

### 5.7 Leads qualificados (SQL/MQL)
```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('qualificado','proposta','negociacao','fechado_ganho')) as qualified,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('qualificado','proposta','negociacao','fechado_ganho')) / NULLIF(COUNT(*), 0), 1) as rate
FROM negocios
WHERE tenant_id = ? AND created_at >= ?;
```

### 5.8 CSAT Médio
```sql
SELECT
  AVG(rating) as avg_rating,
  COUNT(*) as total_ratings,
  COUNT(*) FILTER (WHERE rating >= 4) as satisfied,
  ROUND(100.0 * COUNT(*) FILTER (WHERE rating >= 4) / NULLIF(COUNT(*), 0), 1) as satisfaction_rate
FROM csat_ratings
WHERE tenant_id = ? AND created_at >= ?;
```

### 5.9 Taxa de abandono
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'open' AND first_response_at IS NULL AND created_at < NOW() - INTERVAL '24 hours') as abandoned,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'open' AND first_response_at IS NULL AND created_at < NOW() - INTERVAL '24 hours') / NULLIF(COUNT(*), 0), 1) as rate
FROM conversations
WHERE tenant_id = ? AND created_at >= ?;
```

### 5.10 Tempo de inatividade do cliente
```sql
WITH msg_gaps AS (
  SELECT
    remote_jid,
    created_at,
    LAG(created_at) OVER (PARTITION BY remote_jid ORDER BY created_at) as prev_at
  FROM whatsapp_messages
  WHERE tenant_id = ? AND direction = 'incoming' AND created_at >= ?
)
SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_at)) / 60) as avg_gap_minutes
FROM msg_gaps
WHERE prev_at IS NOT NULL;
```

---

## 6. CHECKLIST DE VALIDAÇÃO

Antes de considerar as métricas como "100% funcionando":

- [ ] Executar SQL de backfill (seção 3.1) para dados históricos
- [ ] Verificar que `first_response_at` é setado no webhook ao enviar msg outgoing
- [ ] Verificar que `claimed_at` é setado quando agente assume conversa
- [ ] Verificar que `resolved_at` é setado quando conversa é resolvida
- [ ] Testar CSAT: resolver conversa → receber pesquisa → responder 1-5 → verificar csat_ratings
- [ ] Verificar dashboard de métricas com dados reais (selecionar período "30d")
- [ ] Confirmar que cada métrica mostra valor > 0 quando há dados
- [ ] Testar filtro por período (Hoje, 7d, 30d, 90d)
- [ ] Verificar que métricas são isoladas por tenant (RLS)
- [ ] Criar `conversations.external_id` + unique constraint para upsert por JID

---

## 7. ARQUIVOS RELEVANTES

| Arquivo | Propósito |
|---------|-----------|
| `src/components/mensageria/metrics/AttendanceMetrics.tsx` | Dashboard de métricas (frontend) |
| `supabase/functions/uazapi-webhook/index.ts` | Popular first_response_at, claimed_at, CSAT detection |
| `supabase/functions/send-csat/index.ts` | Enviar pesquisa de satisfação |
| `supabase/migrations/20260326214119_activate_attendance_metrics.sql` | Tabela csat_ratings + colunas |
| `src/config/permissions.ts` | Controle de acesso por perfil |
| `src/pages/MensageriaPage.tsx` | Roteamento do menu "Métricas" |

---

## 8. TROUBLESHOOTING

**Métricas mostrando 0:**
- Verificar se `conversations` tem registros com `first_response_at` preenchido
- Executar backfill SQL da seção 3.1
- Verificar que o webhook está deployado: `npx supabase functions deploy uazapi-webhook --no-verify-jwt`

**CSAT não sendo capturado:**
- Verificar que `csat_sent = true` na conversa
- Verificar que a resposta do cliente é exatamente "1", "2", "3", "4" ou "5" (sem espaços extras)
- Checar logs da Edge Function no Supabase Dashboard

**Dados aparecendo para tenant errado:**
- RLS está ativo em todas as tabelas
- Verificar que `tenant_id` está correto nos registros
- Queries no frontend filtram por `tenantId` via `useTenantId()`

---

*Documento gerado automaticamente — Whatsflow Metrics v1.0 — Março/2026*
