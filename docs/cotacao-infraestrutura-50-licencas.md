# SOLICITAÇÃO DE COTAÇÃO — INFRAESTRUTURA SaaS

**Empresa:** Whatsflow  
**Data:** 11/03/2026  
**Objetivo:** Cotação de infraestrutura para operação de **50 licenças ativas simultâneas**  
**Contato:** [Seu e-mail aqui]  

---

## 1. VISÃO GERAL DO PROJETO

Sistema SaaS B2B de gestão empresarial com os seguintes módulos integrados:

- **CRM & Pipeline de Vendas** (Kanban com drag-and-drop)
- **Gestão Financeira** (Receitas, Despesas, Comissões, DRE)
- **Cobranças Automatizadas** (Integração com gateway de pagamento Asaas)
- **Mensageria WhatsApp** (Múltiplas instâncias, chatbot, campanhas em massa)
- **Inteligência Digital** (Scraping e análise de presença digital)
- **Módulo Fiscal** (NFS-e, tributos, certificados digitais)
- **Gestão de Usuários** (RBAC com 5 perfis de acesso)

### Stack Tecnológica
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| APIs Externas | UAZAPI (WhatsApp), Asaas (Pagamentos), Firecrawl/Apify (Scraping) |
| Deploy | Lovable Cloud (CDN + build automático) |

---

## 2. REQUISITOS POR FORNECEDOR

---

### 2.1 SUPABASE — Banco de Dados, Autenticação e Functions

**Uso atual:** Plano Free  
**Necessidade:** Plano Pro ou superior

| Recurso | Demanda estimada (50 licenças) |
|---------|-------------------------------|
| Conexões simultâneas ao Postgres | 80–120 |
| Armazenamento de banco | 2–4 GB |
| Usuários autenticados (MAU) | 200–500 |
| Edge Function invocações/mês | 500K–1M |
| Storage (anexos, comprovantes) | 5–10 GB |
| Realtime connections | 50–100 simultâneas |
| Bandwidth | 50–100 GB/mês |

**Perguntas para o fornecedor:**
1. O Plano Pro ($25/mês) suporta 120 conexões simultâneas com PgBouncer habilitado?
2. Qual o custo adicional por GB excedente de banco e storage?
3. Existe SLA de uptime garantido no plano Pro?
4. É possível configurar read replicas para queries pesadas de relatórios?
5. Qual o limite de invocações de Edge Functions antes de cobrança adicional?

---

### 2.2 UAZAPI — API WhatsApp (Instâncias e Mensageria)

**Uso atual:** Instâncias individuais  
**Necessidade:** Pacote para até 50 instâncias simultâneas

| Recurso | Demanda estimada |
|---------|-----------------|
| Instâncias WhatsApp ativas | Até 50 (1 por licença) |
| Mensagens enviadas/mês (estimativa) | 50.000–200.000 |
| Webhooks recebidos/mês | 100.000–500.000 |
| Campanhas em massa simultâneas | 10–20 |
| Chatbot ativo por instância | Sim |

**Perguntas para o fornecedor:**
1. Qual o valor unitário por instância WhatsApp ativa?
2. Existe desconto progressivo para pacotes de 25, 50 ou 100 instâncias?
3. Qual o limite de mensagens por instância/dia antes de throttling?
4. O webhook suporta alta frequência (100+ eventos/minuto por instância)?
5. Existe SLA de disponibilidade? Qual o tempo médio de reconexão após queda?
6. É possível ter um servidor dedicado para 50+ instâncias?
7. Qual o custo de instâncias adicionais além do pacote contratado?

---

### 2.3 ASAAS — Gateway de Pagamento e Cobranças

**Uso atual:** Conta ativa com API integrada  
**Necessidade:** Validar limites para volume de 50 clientes

| Recurso | Demanda estimada |
|---------|-----------------|
| Cobranças geradas/mês | 500–2.000 |
| Tipos de cobrança | PIX, Boleto, Cartão de Crédito |
| Splits de pagamento | 50–200/mês |
| Webhooks recebidos/mês | 2.000–10.000 |
| Réguas de cobrança (dunning) | 10–50 ativas |

**Perguntas para o fornecedor:**
1. Existe limite de cobranças por mês no plano atual?
2. Qual a taxa por transação para PIX, Boleto e Cartão?
3. O split de pagamento tem custo adicional por operação?
4. É possível ter subconta por tenant/empresa do nosso SaaS?
5. Existe desconto por volume (500+ cobranças/mês)?
6. Qual o SLA de processamento de webhooks?

---

### 2.4 FIRECRAWL — Web Scraping e Análise Digital

**Uso atual:** API com chave configurada  
**Necessidade:** Volume para análises digitais de leads

| Recurso | Demanda estimada |
|---------|-----------------|
| Scrapes/mês | 1.000–5.000 |
| Páginas por scrape | 1–5 |
| Dados extraídos | Markdown + metadados |

**Perguntas para o fornecedor:**
1. Qual plano suporta 5.000 scrapes/mês?
2. Existe rate limiting por minuto? Qual o limite?
3. Qual o custo por scrape excedente?
4. Há suporte a scraping de páginas com JavaScript rendering?

---

### 2.5 APIFY — Scraping Google Business e Instagram

**Uso atual:** API com chave configurada  
**Necessidade:** Análises de presença digital em escala

| Recurso | Demanda estimada |
|---------|-----------------|
| Execuções de actors/mês | 500–2.000 |
| Google Business scrapes | 300–1.000 |
| Instagram profile scrapes | 200–500 |

**Perguntas para o fornecedor:**
1. Qual plano cobre 2.000 execuções/mês?
2. Existe custo por compute unit? Qual a estimativa por actor run?
3. É possível ter actors dedicados para menor latência?
4. Qual o rate limit por actor?

---

## 3. RESUMO CONSOLIDADO DE CUSTOS ESPERADOS

| Fornecedor | Serviço | Custo estimado/mês (USD) |
|------------|---------|--------------------------|
| Supabase | Pro (DB + Auth + Functions + Storage) | $25–50 |
| UAZAPI | 50 instâncias WhatsApp | **A cotar** |
| Asaas | Taxas por transação | Variável (~1–3% por transação) |
| Firecrawl | Plano Growth | $19–49 |
| Apify | Plano por uso | $49–99 |
| Domínio + DNS | Cloudflare | $0 (gratuito) |
| **TOTAL ESTIMADO** | | **$93–198/mês + UAZAPI** |
| **Custo por licença** | (sem UAZAPI) | **$1,86–3,96/mês** |

---

## 4. REQUISITOS TÉCNICOS OBRIGATÓRIOS

Para todos os fornecedores, solicitamos informação sobre:

- [ ] **SLA de uptime** (mínimo 99.5%)
- [ ] **Suporte técnico** (canais e tempo de resposta)
- [ ] **Política de escalabilidade** (como expandir de 50 para 200 e 500 licenças)
- [ ] **Backup e recuperação de dados**
- [ ] **Compliance** (LGPD, dados em território brasileiro quando aplicável)
- [ ] **Período de teste** ou trial disponível
- [ ] **Contrato mínimo** (mensal ou anual, com desconto)
- [ ] **Migração** (suporte para migração de dados caso necessário)

---

## 5. CRONOGRAMA

| Fase | Período | Meta |
|------|---------|------|
| Recebimento de propostas | Até DD/MM/2026 | Respostas de todos os fornecedores |
| Análise e negociação | +7 dias | Comparativo de custos e SLAs |
| Contratação | +14 dias | Ativação dos serviços |
| Go-live 50 licenças | +30 dias | Operação em produção |

---

## 6. INFORMAÇÕES PARA RESPOSTA

Favor enviar proposta para:  
**E-mail:** [seu-email@empresa.com]  
**Assunto:** Cotação Infraestrutura SaaS — Whatsflow — 50 Licenças  
**Prazo para resposta:** [DATA LIMITE]

---

*Documento gerado automaticamente pelo sistema Whatsflow em 11/03/2026.*
