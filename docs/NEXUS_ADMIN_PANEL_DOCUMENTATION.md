# Whatsflow Nexus Admin Panel — Documentação Completa
> Versão 1.0 | Atualizado em 2026-03-26

---

## 1. O que é o Painel Nexus?

O **Nexus** é o painel administrativo interno da Whatsflow, acessível exclusivamente pela equipe interna (SuperAdmins, Desenvolvedores, Suporte, Financeiro e Customer Success). Ele é o **centro de comando** de toda a operação SaaS, permitindo:

- Gerenciar **718+ licenças** de clientes
- Administrar **parceiros WhiteLabel** (revendedores)
- Controlar **faturamento e inadimplência**
- Monitorar a **saúde operacional** da plataforma
- Gerenciar **IA, feature flags e configurações globais**
- Garantir **conformidade LGPD** com lifecycle de dados

**URL de acesso:** `/nexus`
**Autenticação:** Requer registro na tabela `nexus_users` com `is_active = true`

---

## 2. Estrutura e Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/nexus` | Dashboard | Visão geral com KPIs críticos |
| `/nexus/licencas` | Licenças | Gestão completa de todas as licenças |
| `/nexus/licencas/:id` | Detalhe da Licença | Visão 360° de uma licença específica |
| `/nexus/whitelabels` | WhiteLabels | Gestão de parceiros revendedores |
| `/nexus/financeiro` | Financeiro | MRR, ARR, inadimplência, billing |
| `/nexus/checkouts` | Checkouts | Sessões de pagamento e conversão |
| `/nexus/equipe` | Equipe Nexus | Membros internos da equipe |
| `/nexus/auditoria` | Auditoria | Log imutável de todas as ações |
| `/nexus/flags` | Feature Flags | Controle global de funcionalidades |
| `/nexus/tickets` | Tickets | Suporte interno e incidentes |
| `/nexus/lifecycle` | Lifecycle | Fila de encriptação/exclusão LGPD |
| `/nexus/ia` | IA Config | Chaves de API (OpenAI, Anthropic, Gemini) |
| `/nexus/configuracoes` | Configurações | Sincronização de dados entre tenants |

---

## 3. Papéis e Permissões (RBAC)

### 3.1 Papéis Disponíveis

| Papel | Descrição | Nível |
|-------|-----------|-------|
| `nexus_superadmin` | Acesso total a tudo | Máximo |
| `nexus_dev_senior` | Licenças, WLs, lifecycle, audit, flags, tickets | Alto |
| `nexus_suporte_senior` | Licenças, WLs, tickets, auditoria | Médio-Alto |
| `nexus_financeiro` | Dashboard, financeiro, licenças, checkouts | Médio |
| `nexus_suporte_junior` | Dashboard, licenças, tickets | Básico |
| `nexus_customer_success` | Dashboard, licenças, WLs, tickets | Médio |

### 3.2 Matriz de Acesso

| Módulo | SuperAdmin | Dev Sr | Suporte Sr | Financeiro | Suporte Jr | CS |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Licenças | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WhiteLabels | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Financeiro | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Checkouts | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Equipe | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Auditoria | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Feature Flags | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tickets | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Lifecycle | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| IA Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Funcionalidades por Módulo

### 4.1 Dashboard
- **7 KPIs em tempo real:** Licenças ativas, MRR total, inadimplentes, expirando em 30 dias, inativas, módulo IA, tickets abertos
- **Alertas:** Licenças expirando nos próximos 15 dias (cards de urgência)

### 4.2 Licenças
- **Tabela paginada** (10 a 1000 por página) com busca e filtros avançados
- **3 modos de visualização:** Analytics (gráficos), Cards (grid), Operacional (tabela)
- **Analytics integrado:** Pie chart de status, distribuição por plano, tendência MRR (12 meses), adoção de IA
- **Ações:** Criar, editar, bloquear, desbloquear, excluir (individual e em lote)
- **Import/Export CSV**
- **Acesso como Admin:** Login direto no portal do cliente

### 4.3 Detalhe da Licença
- **Resumo:** Tipo, plano, valor, ciclo, ativação, vencimento, Facilite, módulo IA
- **Recursos:** Barras de uso (dispositivos web/meta, atendentes, mensagens/mês, storage)
- **Relacionamentos:** Sub-licenças (se WhiteLabel), licença pai (se filha)
- **Histórico:** Últimos 6 meses de uso, últimos 20 logs de auditoria, últimos 10 tickets
- **Observações Internas:** Campo de texto livre para notas da equipe

### 4.4 WhiteLabels
- **Listagem** com busca e filtros
- **Cards de métricas:** Total WLs, ativos, MRR, ticket médio, sub-licenças
- **Configuração por WL:** Nome, logo, cor primária, email suporte, WhatsApp suporte, max sub-licenças
- **Cálculo de preço:** Base (R$170) + extras (atendentes R$30, web R$80, meta R$50, IA R$250)
- **Ações:** Criar, editar, resetar senha, excluir (cascade)

### 4.5 Financeiro
- **5 KPIs:** MRR Total, ARR Estimado, Ticket Médio, Churn (mês), Novas (mês)
- **Tabela de billing:** Empresa, plano, valor, ciclo, status, vencimento
- **Ações:** Marcar como pago, bloquear, exportar CSV

### 4.6 Checkouts
- **5 KPIs:** Total, pagos, pendentes, MRR gerado, taxas de setup
- **Tabela de sessões:** Data, tipo (new/upsell/renewal), empresa, plano, MRR, status
- **Ações:** Copiar link de checkout, ver no Asaas, criar nova sessão

### 4.7 Equipe Nexus
- **Timeline visual** por membro (convite enviado → link acessado → conta ativa)
- **Métricas:** Total, ativos, pendentes, inativos
- **Ações:** Criar membro (envia email de convite), editar papel, excluir permanentemente

### 4.8 Auditoria
- **Log imutável** de TODAS as ações administrativas
- **20+ tipos de ação:** login, logout, license_create, license_edit, license_delete, feature_flag_change, ticket_create, csv_import, billing_update, team_member_create, etc.
- **Campos:** Data/hora, ator, papel, ação, entidade alvo, IP
- **Export CSV** para compliance

### 4.9 Feature Flags
- **Toggles globais** que ligam/desligam funcionalidades em toda a plataforma
- **Campos:** Flag key (unique), descrição, valor padrão (on/off), global flag
- **Infraestrutura pronta** para overrides por licença (tabela `nexus_license_feature_flags`)

### 4.10 Tickets
- **Sistema de tickets interno** para rastreamento de incidentes e suporte
- **Prioridades:** Baixa, Normal, Alta, Crítica
- **Status:** Aberto → Em Andamento → Resolvido → Fechado
- **Atribuição** a membros da equipe
- **Vinculação** a licenças específicas

### 4.11 Lifecycle (LGPD)
- **Fila de operações:** Encriptação de arquivos, exclusão de dispositivos, exclusão de tenant
- **Auditoria de execução:** Registros, arquivos encriptados, arquivos deletados, storage liberado
- **Grace period:** 30 dias para exclusão de tenant (soft delete → hard delete)
- **Conformidade:** AES-256-GCM para encriptação em repouso

### 4.12 IA Config
- **3 provedores:** OpenAI (GPT-4o), Anthropic (Claude), Google Gemini
- **Configurações globais** (fallback para todos os tenants)
- **Configurações por tenant** (prioridade sobre global)
- **Mascaramento de API keys** na interface

### 4.13 Configurações
- **Sincronização de dados** entre tenant fonte (Whatsflow EDTECH) e demais tenants
- **6 escopos:** Layout, configurações, pipelines, regras de comissão, regras de cobrança, fontes de checkout
- **Log de sync** com timestamps e status

---

## 5. Banco de Dados (Tabelas Nexus)

| Tabela | Registros | Propósito |
|--------|:---------:|-----------|
| `nexus_users` | ~5 | Membros da equipe interna |
| `nexus_audit_logs` | ~500+ | Log imutável de ações |
| `nexus_feature_flags` | ~10 | Toggles globais |
| `nexus_license_feature_flags` | — | Overrides por licença |
| `nexus_tickets` | ~20+ | Tickets de suporte interno |
| `nexus_license_usage` | — | Uso mensal por licença |
| `licenses` | 718+ | Todas as licenças da plataforma |

---

## 6. Segurança

- **RLS:** Todas as tabelas Nexus têm `Service role bypass` policy
- **Autenticação:** JWT via Supabase GoTrue + verificação em `nexus_users`
- **Auditoria:** Toda ação logada com ator, IP, timestamp
- **Papéis:** 6 níveis com permissões granulares
- **API Keys:** Mascaradas na interface (só 8 chars + últimos 4)

---

## 7. Expectativas Futuras

### 7.1 Curto Prazo (Q2 2026)

| Funcionalidade | Descrição | Impacto |
|---------------|-----------|---------|
| **Feature Flags por Licença** | UI para ativar/desativar features por licença individual | Alto — controle granular para clientes enterprise |
| **Dashboard Avançado** | Gráficos interativos com Recharts (churn trend, cohort analysis, LTV) | Alto — decisões data-driven |
| **Notificações Internas** | Alertas push/email para SLA, inadimplência, tickets críticos | Alto — tempo de resposta |
| **Billing Automatizado** | Integração completa Asaas → geração automática de cobranças mensais | Alto — reduz trabalho manual |
| **Impersonação Avançada** | Login como qualquer usuário de qualquer licença (audit trail) | Médio — diagnóstico de problemas |

### 7.2 Médio Prazo (Q3 2026)

| Funcionalidade | Descrição | Impacto |
|---------------|-----------|---------|
| **Health Score por Licença** | Score automático baseado em: uso, pagamento, tickets, engajamento | Alto — predição de churn |
| **Onboarding Tracker** | Acompanhar progresso de ativação de novos clientes (wizard steps) | Alto — reduz time-to-value |
| **Relatórios Agendados** | Envio automático de relatórios por email (diário/semanal/mensal) | Médio — visibilidade para gestão |
| **API de Webhooks Nexus** | Webhooks para eventos (licença criada, paga, bloqueada, etc.) | Médio — integrações externas |
| **Multi-Currency** | Suporte a USD/EUR para clientes internacionais | Médio — expansão global |

### 7.3 Longo Prazo (Q4 2026+)

| Funcionalidade | Descrição | Impacto |
|---------------|-----------|---------|
| **IA Preditiva de Churn** | ML que identifica licenças em risco com 30 dias de antecedência | Alto — retenção proativa |
| **Marketplace de Add-ons** | Loja de módulos extras que WLs e clientes podem contratar | Alto — nova fonte de receita |
| **White Label Self-Service** | Portal onde parceiros WL gerenciam sub-licenças sem intervenção Nexus | Alto — escalabilidade |
| **SSO/SAML** | Login empresarial via Google Workspace, Microsoft 365, Okta | Médio — enterprise |
| **Multi-Region** | Dados em regiões diferentes (Brasil, EU, US) para compliance internacional | Alto — GDPR |
| **Mobile App Nexus** | App nativo para monitoramento de KPIs e alertas em tempo real | Médio — mobilidade da equipe |

### 7.4 Melhorias Técnicas Planejadas

| Melhoria | Estado Atual | Futuro |
|----------|-------------|--------|
| Paginação de licenças | Client-side (carrega tudo) | Server-side com cursor |
| Busca de logs | Filtro básico | Elasticsearch/full-text |
| Export de dados | CSV síncrono | Async com notificação |
| Cache de KPIs | React Query 60s | Redis com invalidação |
| Real-time dashboard | Polling 30s | Supabase Realtime |

---

## 8. Fluxos Operacionais Comuns

### 8.1 Criar Nova Licença
```
Nexus → Licenças → + Nova Licença → Preencher form → Salvar
→ Email de ativação enviado ao cliente
→ Cliente clica no link → Cria senha → Acessa o portal
```

### 8.2 Bloquear Licença Inadimplente
```
Nexus → Licenças → Buscar empresa → Clicar "Bloquear"
→ Status muda para "blocked" → Cliente perde acesso
→ Ação logada em Auditoria com justificativa
```

### 8.3 Criar Parceiro WhiteLabel
```
Nexus → WhiteLabels → + Novo WL → Preencher form (nome, logo, cores)
→ Licença WL criada → Email de acesso enviado
→ Parceiro acessa /wl/:slug → Gerencia sub-licenças
```

### 8.4 Resolver Ticket
```
Nexus → Tickets → Selecionar ticket → Atribuir a membro
→ Status "Em Andamento" → Resolver → Status "Resolvido"
→ Todas as mudanças logadas em Auditoria
```

---

## 9. Integrações

| Serviço | Uso no Nexus |
|---------|-------------|
| **Supabase Auth** | Autenticação de membros Nexus |
| **Supabase RLS** | Isolamento de dados por papel |
| **Asaas** | Checkout sessions, billing status |
| **SMTP2GO** | Envio de convites e notificações |
| **OpenAI/Anthropic/Gemini** | Configuração centralizada de IA |

---

*Documento gerado automaticamente via varredura do codebase.*
*Whatsflow Nexus Admin Panel v1.0 — Março/2026*
