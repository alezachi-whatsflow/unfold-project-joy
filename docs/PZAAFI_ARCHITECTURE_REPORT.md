# RELATÓRIO DE ARQUITETURA — PZAAFI CHECKOUT
**Data:** 30/03/2026 | **Versão:** 1.0

---

## 1. VISÃO GERAL

O Pzaafi é um módulo de **Payment Orchestration + Embedded Checkout** embutido dentro da plataforma Whatsflow. Não é um produto separado — é uma feature licenciada por tenant, acessível via **Integrações → Financeiro & Gateways → Checkout Whatsflow**.

### Números

| Métrica | Valor |
|---------|-------|
| Tabelas no banco | 21 (16 foundation + 2 split/payout + 3 whitelabel) |
| Arquivos TypeScript | 56 |
| Edge Functions | 3 deployadas |
| Conectores implementados | 1 (Asaas) — 2 planejados (PJBank, Getnet) |
| Roles RBAC | 5 (owner, finance, support, ops, viewer) |
| Permissões RBAC | 24 |
| Tipos TypeScript | 7 types + 15 interfaces |

---

## 2. ACESSO E NAVEGAÇÃO

### Onde o usuário encontra o Pzaafi

```
Sidebar → Integrações → aba "Financeiro & Gateways" → Card "Checkout Whatsflow"
```

O card mostra o status:
- **"Ativo"** (verde) → se `licenses.pzaafi_tier` está definido
- **"Não configurado"** (muted) → se `pzaafi_tier` é null

Ao expandir o card, o `PzaafiModule` renderiza inline o dashboard do tier correspondente.

### Rotas

| Rota | Auth | Propósito |
|------|------|-----------|
| `/app/:slug/integracoes` | Sim | Página de integrações com card Pzaafi |
| `/app/:slug/pzaafi` | Sim | Acesso direto ao módulo (URL bookmarkável) |
| `/pay/:slug` | **Não** | Checkout público para compradores |

---

## 3. HIERARQUIA DE 3 TIERS

```
╔═══════════════════════════════════════════════════════════╗
║  TIER 0 — NEXUS (Alessandro / Admin Pzaafi)              ║
║  Dashboard: PzaafiNexusDashboard                         ║
║  Vê: TODAS as organizações de todos os tiers             ║
║  Pode: criar orgs, ativar/desativar, gerenciar KYC       ║
║  KPIs: Total Orgs, Ativas, Pendente KYC, MRR             ║
╠═══════════════════════════════════════════════════════════╣
║  TIER 1 — WHITELABEL (Parceiro revenda)                  ║
║  Dashboard: PzaafiWhiteLabelDashboard                    ║
║  Vê: apenas subcontas da carteira dele                   ║
║  Pode: criar subcontas, configurar comissão, KYC         ║
║  KPIs: Total Subcontas, Ativas, Pendente KYC, Comissão   ║
╠═══════════════════════════════════════════════════════════╣
║  TIER 2 — CLIENTE (Merchant final)                       ║
║  Dashboard: PzaafiClienteDashboard                       ║
║  Vê: apenas seus próprios dados                          ║
║  Pode: ver wallet, ver pedidos, configurar checkout      ║
║  KPIs: Disponível, Pendente, Bloqueado, Em disputa       ║
╠═══════════════════════════════════════════════════════════╣
║  BUYER SCOPE — Comprador final (sem login)               ║
║  Página: /pay/:slug                                      ║
║  Vê: produto + preço + formulário de pagamento           ║
║  Pode: pagar via PIX, Cartão ou Boleto                   ║
╚═══════════════════════════════════════════════════════════╝
```

### Detecção de Tier

```typescript
// PzaafiModule.tsx
1. auth.getUser() → user.id
2. user_tenants WHERE user_id = user.id → tenant_id
3. licenses WHERE tenant_id = X AND pzaafi_tier IS NOT NULL → tier
4. switch(tier):
   'nexus'     → PzaafiNexusDashboard
   'whitelabel' → PzaafiWhiteLabelDashboard
   'cliente'    → PzaafiClienteDashboard
   null         → PzaafiUpgradePrompt
```

---

## 4. MÓDULOS DE BACKEND

### Módulo B — Orquestração (`components/orchestration/`)

| Serviço | Função |
|---------|--------|
| `selectConnector()` | Escolhe conector primário por org |
| `selectFallbackConnector()` | Fallback quando primário falha |
| `executeWithFailover()` | Retry automático com failover |
| `orchestratePayment()` | Fluxo completo: routing → execute → persist |
| `syncConnectorHealth()` | Atualiza status de saúde dos conectores |
| `usePzaafiOrchestration` | Hook React com health sync |

### Módulo C — Ledger (`components/ledger/`)

| Serviço | Função |
|---------|--------|
| `writeLedgerEntry()` | Escrita via RPC (NUNCA insert direto) |
| `onPaymentConfirmed()` | 2 lançamentos: crédito pending + débito fee |
| `onSettlementExecuted()` | 2 lançamentos: débito pending + crédito available |
| `onRefundCreated()` | 2 lançamentos: débito available + crédito refunded |
| `onChargebackOpened()` | 2 lançamentos: débito available + crédito disputed |
| `getWallet()` / `ensureWallet()` | Gestão de wallets por org+connector |
| `getWalletSummary()` | Saldos agregados (6 tipos) |
| `getSettlementSchedule()` | Agenda de recebíveis (local + API) |
| `emitFiscalDocument()` | NFS-e/NF-e via parceiro externo |
| `usePzaafiLedger` | Hook com cursor pagination + realtime |
| `usePzaafiWallet` | Hook com saldo em tempo real |

### Módulo D — Split (`components/split/`)

| Serviço | Função |
|---------|--------|
| `validateSplitReceivers()` | Valida % = 100% e valores positivos |
| `calculateSplitAmounts()` | Calcula valor por recebedor (centavo residual no último) |
| `executeSplit()` | Double-entry no ledger por recebedor |
| `schedulePayout()` | Agenda saque (daily/weekly/monthly/on_demand) |
| `executePayout()` | Executa via connector.executePayout() |
| `usePzaafiSplit` | Hook CRUD de regras |

### Módulo E — WhiteLabel (`components/whitelabel/`)

| Serviço | Função |
|---------|--------|
| `hasPermission()` | Verifica permissão por role (24 permissões) |
| `getUserRole()` | Busca role do user na org |
| `createSubaccount()` | Cria org filho (tier: cliente, active: false) |
| `activateSubaccount()` | Ativa após KYC aprovado |
| `updateBranding()` | Logo, cor, domínio customizado |
| `calculateCommission()` | Calcula % ou fixo por transação |
| `chargeCommission()` | Double-entry: débito filho + crédito pai |
| `initiateKYC()` | Verificação via API externa ou manual |
| `usePzaafiRBAC` | Hook com `can()` permission check |

---

## 5. CONECTOR ASAAS

### Interface Canônica (`IConnector`)

```typescript
interface IConnector {
  createCharge(payload) → ChargeResult      // Criar cobrança
  captureCharge(id) → ChargeResult          // Capturar pré-auth
  cancelCharge(id) → void                   // Cancelar
  refundCharge(id, amount?) → RefundResult  // Estornar
  tokenizeCard(card) → string               // Tokenizar cartão
  getChargeStatus(id) → PaymentStatus       // Consultar status
  receiveWebhook(payload, sig) → Event      // Normalizar webhook
  generateSplit(id, rules) → void           // Instruir split
  getSettlementSchedule(orgId) → Schedule[] // Agenda de recebíveis
  executePayout?(walletId, amount) → string // Transferência
}
```

### Registry

```typescript
const registry = Map([
  ['asaas', asaasConnector],  // ✅ Implementado
  // ['pjbank', pjbankConnector],  // MVP 2
  // ['getnet', getnetConnector],  // MVP 2
])
```

### HTTP Client

- Timeout: 10s
- Retry: 3 tentativas com backoff exponencial
- Circuit breaker: abre após 5 falhas, reseta em 60s
- Erro 4xx: não faz retry (erro de negócio)

---

## 6. EDGE FUNCTIONS

| Function | Propósito | Auth |
|----------|-----------|------|
| `pzaafi-checkout` | Cria order + payment, chama connector | Bearer token (user) |
| `pzaafi-webhook-asaas` | Recebe webhook Asaas, normaliza, salva | Token header (Asaas) |
| `pzaafi-ledger-events` | Processa eventos pendentes → ledger | Service role |

### Fluxo de Pagamento Completo

```
1. Comprador abre /pay/:slug
2. Vê: produto + preço + branding da org
3. Escolhe: PIX / Cartão / Boleto
4. Preenche: nome, email, CPF, telefone
5. Clica "Pagar"
   ↓
6. POST /functions/v1/pzaafi-checkout
7. orchestratePayment() → selectConnector() → asaasConnector.createCharge()
8. Salva em pzaafi_payments (status: pending)
9. Retorna: pixCode + pixQrCode (ou boletoUrl)
   ↓
10. Comprador paga (PIX/Boleto/Cartão)
    ↓
11. Asaas envia webhook PAYMENT_RECEIVED
12. pzaafi-webhook-asaas normaliza → pzaafi_webhook_events
    ↓
13. pzaafi-ledger-events processa:
    - pzaafi_ledger_entry() → crédito pending
    - pzaafi_payments.status → paid
    - pzaafi_orders.status → paid
    ↓
14. Settlement dia D+2:
    - pzaafi_ledger_entry() → débito pending + crédito available
    ↓
15. Split executa (se configurado):
    - débito seller + crédito receiver (por recebedor)
    ↓
16. Payout (se agendado):
    - connector.executePayout() → transferência bancária
```

---

## 7. BANCO DE DADOS

### 21 Tabelas

| Tabela | Módulo | Imutável |
|--------|--------|----------|
| `pzaafi_organizations` | Foundation | Não |
| `pzaafi_wallet_accounts` | Foundation | Não |
| `pzaafi_provider_connections` | Foundation | Não |
| `pzaafi_checkouts` | Foundation | Não |
| `pzaafi_products` | Foundation | Não |
| `pzaafi_orders` | Foundation | Não |
| `pzaafi_payments` | Foundation | Não |
| `pzaafi_split_rules` | Foundation | Não |
| `pzaafi_settlements` | Foundation | Não |
| `pzaafi_refunds` | Foundation | Não |
| `pzaafi_chargebacks` | Foundation | Não |
| `pzaafi_subscriptions` | Foundation | Não |
| `pzaafi_fiscal_documents` | Foundation | Não |
| `pzaafi_webhook_events` | Foundation | Não |
| **`pzaafi_ledger_entries`** | **Ledger** | **SIM** |
| **`pzaafi_audit_log`** | **Audit** | **SIM (LGPD)** |
| `pzaafi_split_executions` | Split | Não |
| `pzaafi_payouts` | Split | Não |
| `pzaafi_org_members` | WhiteLabel | Não |
| `pzaafi_kyc_records` | WhiteLabel | Não |
| `pzaafi_commission_rules` | WhiteLabel | Não |

### RLS

Todas as 21 tabelas com RLS ativado:
- **SELECT/INSERT/UPDATE**: `org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus()`
- **Ledger + Audit**: somente SELECT (imutáveis)
- **Webhooks**: somente Nexus pode ler
- **Service role**: ALL em todas (Edge Functions)

### Funções SQL

| Função | Propósito |
|--------|-----------|
| `get_pzaafi_tenant_ids()` | Retorna org_ids acessíveis pelo user (por tier) |
| `is_pzaafi_nexus()` | Verifica se user é admin Pzaafi |
| `pzaafi_ledger_entry()` | Único ponto de escrita no ledger (balance enforcement) |
| `pzaafi_ledger_immutable()` | Trigger que bloqueia UPDATE/DELETE no ledger e audit |

---

## 8. RBAC (5 Roles × 24 Permissões)

| Permissão | owner | finance | support | ops | viewer |
|-----------|-------|---------|---------|-----|--------|
| checkout:manage | ✅ | | | ✅ | |
| product:manage | ✅ | | | ✅ | |
| split:manage | ✅ | | | | |
| member:manage | ✅ | | | | |
| payout:execute | ✅ | ✅ | | | |
| refund:execute | ✅ | ✅ | | | |
| refund:request | | | ✅ | | |
| subaccount:create | ✅ | | | | |
| branding:edit | ✅ | | | | |
| commission:manage | ✅ | | | | |
| kyc:review | ✅ | | | | |
| ledger:view | ✅ | ✅ | | | ✅ |
| order:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| settlement:view | | ✅ | | | |
| chargeback:manage | | ✅ | | | |
| chargeback:view | | | ✅ | | |
| buyer:search | | | ✅ | | |
| checkout:view | | | | | ✅ |
| product:view | | | | | ✅ |
| split:view | | | | ✅ | |

---

## 9. SEGURANÇA

| Controle | Implementação |
|----------|--------------|
| Multi-tenancy | RLS + `get_pzaafi_tenant_ids()` (3 tiers) |
| Imutabilidade financeira | Triggers no ledger + audit (bloqueiam UPDATE/DELETE) |
| PCI Compliance | Nunca armazena PAN — apenas card_token do conector |
| Webhook auth | Token verification (Asaas header) |
| LGPD | Audit log imutável, consentimento no checkout |
| Failover | Circuit breaker (5 falhas → 60s cooldown) |
| Idempotência | `UNIQUE(connector_id, external_event_id)` em webhook_events |
| Valores monetários | Sempre centavos (integer) — zero float |

---

*Relatório gerado em 30/03/2026 — Claude Opus 4.6*
