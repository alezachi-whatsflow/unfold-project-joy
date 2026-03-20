# Integrações Externas

STATUS: Identificadas

### Supabase (BaaS, Auth, DB, Storage)
### Asaas (Pagamentos e Cobranças)
### Evolution API / WhatsApp
### OpenAI (Inteligência Artificial)

**1. Supabase (Core BaaS)**: Gestor principal;
**2. Asaas (Se aplicável fiscalmente)**: Cobranças, Links de pagamento do CRM e contas a receber/Pix via API Rest + Webhooks de baixa automática.
**3. Evolution API / WhatsApp**: Para interligar o WaConnectionsPage e mensagens em massa / notificações CRM nos leads contidos no painel Vendas.
**4. OpenAI**: Usada no `IAAuditorPage` / `IASkillsPage` nativamente acoplada com chaves via Supabase Edge Functions.

**Dependências Críticas**: Variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` em `.env` e `SUPABASE_SERVICE_ROLE_KEY` no servidor edge e scripts .cjs internos de infraestrutura.