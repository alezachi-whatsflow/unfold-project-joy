# WHATSFLOW FINANCE — Relatório Técnico e Funcional Completo

**Data do Relatório:** 08 de Março de 2026  
**Versão:** 1.0  
**URL de Produção:** https://unfold-project-joy.lovable.app

---

## SUMÁRIO EXECUTIVO

O **Whatsflow Finance** é uma plataforma SaaS de gestão financeira, comercial e operacional voltada para empresas que operam com modelos de receita recorrente. Desenvolvido com tecnologias modernas (React, TypeScript, Tailwind CSS), o sistema oferece uma experiência completa de dashboard financeiro com módulos integrados de vendas, cobranças, fiscal, inteligência digital e relatórios avançados.

A plataforma é multi-tenant, suportando múltiplas empresas com isolamento de dados, e conta com um sistema robusto de controle de acesso baseado em funções (RBAC) com 5 níveis hierárquicos.

---

## 1. ARQUITETURA TECNOLÓGICA

### 1.1 Stack Frontend
| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.3.1 | Framework de UI |
| TypeScript | — | Tipagem estática |
| Vite | — | Build tool e dev server |
| Tailwind CSS | — | Sistema de design utilitário |
| React Router DOM | 6.30.1 | Roteamento SPA |
| TanStack React Query | 5.83.0 | Gerenciamento de estado server-side |
| Recharts | 2.15.4 | Visualização de dados e gráficos |
| Radix UI | — | Componentes acessíveis (Dialog, Select, Tabs, etc.) |
| Lucide React | 0.462.0 | Biblioteca de ícones |
| shadcn/ui | — | Sistema de componentes UI |
| Framer Motion* | — | Animações e transições |

### 1.2 Stack Backend (Lovable Cloud / Supabase)
| Componente | Função |
|---|---|
| PostgreSQL | Banco de dados relacional |
| Edge Functions (Deno) | Lógicas serverless (proxy Asaas, webhooks, scrapers) |
| Row-Level Security (RLS) | Segurança a nível de linha |
| Auth | Autenticação com JWT |
| Realtime | Notificações em tempo real |
| Storage | Armazenamento de arquivos |

### 1.3 Integrações Externas
| Serviço | Função |
|---|---|
| Asaas | Gateway de pagamentos (cobranças, PIX, boleto, cartão) |
| Firecrawl | Web scraping para análise digital |
| Instagram Scraper | Análise de perfis de redes sociais |
| Google Business Scraper | Análise de presença no Google Meu Negócio |

---

## 2. MÓDULOS DO SISTEMA

O sistema é dividido em **14 módulos principais**, cada um com permissões granulares de acesso:

### 2.1 Dashboard (/)
**Descrição:** Painel central com visão consolidada de todas as métricas financeiras e operacionais.

**Funcionalidades:**
- KPIs em tempo real: MRR, ARR, CAC, LTV, LTV/CAC Ratio
- Taxa de Churn (receita e logo)
- Margem bruta e líquida
- EBITDA e Burn Rate
- Runway (meses restantes de caixa)
- Gráficos interativos:
  - Receita por período (MRR, New MRR, Expansion, Churn)
  - Decomposição de custos por bloco contábil
  - Visão geral Receita vs. Custos vs. Lucro
  - Tendência de margens
  - Crescimento de clientes
  - Tendência de churn
- Filtro por período: Mensal, Trimestral, Semestral, Anual
- Integração com dados do Asaas (cobranças por tipo de pagamento)

### 2.2 Vendas (/vendas)
**Descrição:** CRM completo com pipeline de vendas visual estilo Kanban.

**Funcionalidades:**
- **Pipeline Visual:** Colunas drag-and-drop com etapas: Prospecção → Qualificação → Proposta → Negociação → Fechamento
- **Lista de Negócios:** Visualização em tabela com filtros avançados
- **Meus Negócios:** Filtro por consultor logado
- **Relatórios de Vendas:** Dashboard analítico com:
  - Receita fechada, taxa de conversão, ciclo médio, ticket médio
  - Pipeline ativo e previsão de 30 dias
  - Receita por mês (ganho vs. perdido)
  - Funil por status
  - Negócios por origem (Inbound, Outbound, Indicação, etc.)
  - Motivos de perda
  - Ranking de consultores
- **Criação de Negócio:** Modal completo com:
  - Seleção de produtos com cálculo automático de valor
  - Descontos (percentual ou valor fixo)
  - Forma e condição de pagamento
  - Previsão de fechamento e probabilidade
  - Tags e notas
  - Opção de gerar cobrança e NF automaticamente
- **Fechamento Ganho:** Modal com geração automática de cobrança via Asaas
- **Fechamento Perdido:** Modal com seleção de motivo de perda

### 2.3 Cobranças (/cobrancas)
**Descrição:** Módulo de gestão de cobranças integrado com o gateway Asaas.

**Funcionalidades:**
- **Cockpit de Cobranças:** Visão geral com cards de status (pendentes, recebidas, atrasadas, etc.)
- **Gestão de Pagamentos:** Tabela com filtros por status, tipo de cobrança e período
- **Timeline de Pagamentos:** Histórico detalhado de cada cobrança
- **Notificações:** Alertas de cobranças próximas do vencimento
- **Billing Manager:** Criação de cobranças com:
  - Seleção de cliente
  - Configuração de split de pagamento por vendedor
  - Geração de boleto, PIX e cartão de crédito
  - Artefatos de pagamento (QR Code PIX, link de boleto, fatura)
- **Dunning (Régua de Cobrança):** Sistema automatizado de cobrança com:
  - Regras configuráveis por etapas
  - Templates pré-definidos
  - Execução automática
  - Histórico de tentativas
- **Conciliação:** Painel de reconciliação financeira
- **Fontes de Checkout:** Cadastro de diferentes fontes/checkouts
- **Regras de Receita:** Classificação automática de receitas por tipo

### 2.4 Receitas (/revenue)
**Descrição:** Gestão centralizada de entradas financeiras.

**Funcionalidades:**
- Lançamentos manuais e sincronizados do Asaas
- Parcelamento automático com geração de registros individuais
- Categorização (Mensalidade, Serviço Avulso, Setup, etc.)
- Sugestões inteligentes (autocomplete baseado em histórico)
- Conversão de cobranças Asaas em registros de receita
- Filtros por período, status e categoria

### 2.5 Despesas (/expenses)
**Descrição:** Controle completo de saídas financeiras.

**Funcionalidades:**
- Cadastro de despesas com categorização
- Centro de custo e fornecedor
- Despesas recorrentes e agendadas
- Controle de pagamento (pago/pendente)
- Anexos de comprovantes
- Parcelamento

### 2.6 Inserir Dados (/input)
**Descrição:** Módulo de entrada de dados financeiros mensais com estrutura contábil.

**Funcionalidades:**
- Formulário mensal com blocos contábeis:
  - **Receita:** MRR, New MRR, Expansion MRR, Churned MRR, Outras Receitas
  - **Custos CSP:** Custo de Prestação de Serviço
  - **Custos MKT:** Marketing e Aquisição
  - **Custos SAL:** Salários, Benefícios, Terceirizados
  - **Custos G&A:** Administrativo e Custos Fixos
  - **Custos FIN:** Financeiro e Infraestrutura
  - **Custos TAX:** Impostos
  - **Clientes:** Total, Novos, Churned
  - **Caixa:** Saldo em caixa
- Importação via CSV com mapeamento inteligente de colunas
- Linhas de custo personalizáveis com templates
- Detalhamento de custos por linha (CostDetailTable)

### 2.7 Clientes (/customers)
**Descrição:** Gestão completa da base de clientes.

**Funcionalidades:**
- Cadastro com campos específicos para SaaS:
  - Nome, e-mail, CPF/CNPJ
  - Status (Ativo, Bloqueado, Cancelado)
  - Data de ativação, bloqueio, cancelamento, desbloqueio
  - Whitelabel associado
  - Tipo de pagamento e condição
  - Número de atendentes e dispositivos (oficial e não-oficial)
  - Valor da última cobrança
  - Checkout e receita associados
- Filtros avançados por status, whitelabel e busca textual
- Importação via CSV
- Calendário visual para campos de data (padrão Popover + Calendar)

### 2.8 Produtos (/products)
**Descrição:** Catálogo de produtos e serviços.

**Funcionalidades:**
- Cadastro de produtos com nome, preço e descrição
- Vinculação com negócios no pipeline de vendas
- Gestão de catálogo para seleção em propostas

### 2.9 Fiscal (/fiscal)
**Descrição:** Módulo completo de conformidade tributária e fiscal.

**Funcionalidades organizadas em 5 abas:**

1. **Visão Geral:**
   - Dashboard com cards de resumo (total NFs, impostos pagos, status certificado, regime tributário)
   - Gráfico comparativo de 6 meses (Valor Bruto vs. Líquido vs. Impostos)
   - Gráfico de pizza para composição tributária
   - Central de alertas (certificados vencendo, NFs rejeitadas, configurações incompletas)

2. **Notas Fiscais:**
   - Emissão de NFs com modal completo
   - Tabela com filtros por status e período
   - Visualização detalhada (NFViewDialog)
   - Cancelamento com justificativa (NFCancelDialog)
   - Dashboard de cards com métricas de NFs

3. **Tributos:**
   - Seção Federal (IRPJ, CSLL, PIS, COFINS)
   - Seção Estadual (ICMS)
   - Seção Municipal (ISS) com formulário de cadastro por município

4. **Certificados:**
   - Upload e gestão de certificados digitais (A1/A3)
   - Cards de status por certificado
   - Alertas de expiração (≤30 dias)
   - Toggle de ambiente (Produção/Homologação)

5. **Configurações Fiscais:**
   - Configuração de regime tributário
   - Dados do emitente
   - Séries de numeração

### 2.10 Comissões (/comissoes)
**Descrição:** Sistema de gestão de comissões por vendedor.

**Funcionalidades organizadas em 3 abas:**

1. **Dashboard:**
   - Visão geral das comissões por período
   - Métricas consolidadas

2. **Regras de Comissão:**
   - Cadastro de regras por produto
   - Tipos: baseada em parcelas ou recorrente
   - Taxas por parcela (ex: 1ª parcela 10%, 2ª parcela 8%, etc.)
   - Taxas recorrentes (mín/máx) a partir de determinada parcela
   - Ativação/desativação de regras

3. **Fechamento:**
   - Relatório mensal de comissões por vendedor
   - Exportação para PDF e CSV

### 2.11 Intelligence (/intelligence)
**Descrição:** Módulo de análise de presença digital e inteligência competitiva.

**Funcionalidades:**
- **Busca por empresa:** Formulário de pesquisa com nome, website e Instagram
- **Análise Web:** Score de presença digital baseado em scraping do site
- **Google Business:** Avaliação de presença no Google Meu Negócio (rating, reviews)
- **Instagram:** Análise de perfil (seguidores, engajamento, estratégia de conteúdo)
- **Meta Verification:** Verificação de conformidade com padrões Meta
- **Neuromarketing:** Análise baseada em princípios de neuromarketing com knowledge base proprietário
- **WhatsApp Button:** Avaliação da presença de botão WhatsApp
- **Dados Legais:** Consulta de dados jurídicos da empresa
- **Diagnóstico de Autoridade:** Score consolidado de autoridade digital
- **Plano de Resgate:** Geração de plano de ação para melhorias (via IA)
- **Barra de Threshold:** Indicador visual de score geral
- **Histórico de Análises:** Persistência no banco de dados
- **Exportação HTML:** Relatório premium standalone com design da marca
- **Registro de Exportações:** Auditoria na tabela export_logs

### 2.12 Relatórios (/reports)
**Descrição:** Central de exportação de relatórios financeiros e operacionais.

**Relatórios disponíveis:**
| Relatório | Descrição | Formatos |
|---|---|---|
| DRE | Demonstrativo de Resultados (receitas, custos, margens por mês) | PDF, CSV |
| KPIs SaaS | MRR, ARR, CAC, LTV, Churn e mais | PDF, CSV |
| Análise de Custos | Decomposição por bloco contábil (CSP, MKT, SAL, G&A, FIN, TAX) | PDF, CSV |
| Relatório de Clientes | Evolução, novos, churn e net adds | PDF, CSV |
| Fluxo de Caixa | Posição de caixa, burn rate e runway | PDF, CSV |
| Fechamento de Comissões | Relatório mensal de comissões por vendedor | PDF, CSV |

**Características técnicas:**
- PDFs gerados via jsPDF com logo da marca
- CSVs com BOM para compatibilidade com Excel
- Filtros por categoria (Financeiro, Clientes, Comissões)
- Gate de permissão para exportação

### 2.13 Usuários (/usuarios)
**Descrição:** Gestão de usuários e papéis de acesso.

**Funcionalidades:**
- Listagem de usuários com perfil e papel
- Atribuição de papéis (admin, gestor, financeiro, consultor, representante)
- Permissões customizáveis por módulo
- Gestão de perfis

### 2.14 Configurações (/settings)
**Descrição:** Painel de configuração do sistema.

**Funcionalidades:**
- **Gestão de Tenant:** Configuração da empresa (nome, documento, e-mail)
- **Aparência do Menu:** 4 layouts de sidebar personalizáveis:
  - **Grouped Cards:** Grupos visuais com labels estilo monospace
  - **Dual Rail:** Rail de ícones fixo + painel contextual expansível
  - **Spotlight:** Foco em busca ⌘K com accordions colapsáveis
  - **Personalizado:** Layout flexível com controle total
- **Densidade:** Compacto, Padrão, Confortável
- **Largura:** Estreita, Padrão, Larga
- **Command Palette (⌘K):** Busca global com atalhos de teclado
- **Personalização Avançada (modo Custom):**
  - Toggle de visibilidade por categoria e item
  - Fixar itens no topo (até 5)
  - Ativar/desativar labels e ações rápidas

---

## 3. SISTEMA DE AUTENTICAÇÃO E AUTORIZAÇÃO

### 3.1 Autenticação
- Login com e-mail e senha
- Cadastro com verificação de e-mail
- Recuperação de senha via e-mail
- Reset de senha com token
- Sessão persistente via JWT
- Guard de rotas (AuthGuard) com redirect para /login

### 3.2 Controle de Acesso (RBAC)
O sistema implementa 5 níveis de acesso hierárquicos:

| Papel | Descrição |
|---|---|
| **Admin** | Acesso total a todos os módulos e ações (view, create, edit, delete, export) |
| **Gestor** | Gestão operacional completa; CRUD sem delete; sem acesso a Configurações |
| **Financeiro** | Foco em módulos financeiros (Receitas, Despesas, Cobranças, Fiscal); visualização de Vendas e Clientes |
| **Consultor** | Acesso a Vendas e Clientes com CRUD; visualização de Dashboard e Relatórios |
| **Representante** | Acesso restrito a seus próprios negócios; criação de clientes; inserção de dados |

### 3.3 Permissões por Módulo
Cada módulo possui 5 ações granulares:
- **view:** Visualizar o módulo
- **create:** Criar registros
- **edit:** Editar registros existentes
- **delete:** Excluir registros
- **export:** Exportar dados (PDF, CSV, HTML)

### 3.4 Componentes de Segurança
- **ProtectedRoute:** Bloqueia acesso a rotas sem permissão (redirect para /acesso-negado)
- **PermissionGate:** Controle granular de elementos na UI (botões, ações)
- **Permissões Customizáveis:** Override de permissões padrão por usuário via campo custom_permissions no perfil

---

## 4. MODELO DE DADOS (BANCO DE DADOS)

### 4.1 Tabelas Principais

| Tabela | Descrição | Registros Típicos |
|---|---|---|
| `tenants` | Empresas/organizações | Multi-tenant |
| `profiles` | Perfis de usuários | Vinculado ao auth.users |
| `financial_entries` | Dados financeiros mensais | Um registro por mês |
| `customers` | Base de clientes da plataforma | Dados operacionais |
| `negocios` | Pipeline de vendas/negócios | CRM |
| `asaas_connections` | Conexões com gateway Asaas | Configuração |
| `asaas_customers` | Clientes sincronizados do Asaas | Espelho |
| `asaas_payments` | Cobranças do Asaas | Transações |
| `asaas_splits` | Splits de pagamento | Comissões |
| `asaas_revenue` | Receitas registradas | Financeiro |
| `asaas_expenses` | Despesas registradas | Financeiro |
| `commission_rules` | Regras de comissão | Configuração |
| `sales_people` | Vendedores/consultores | Equipe comercial |
| `checkout_sources` | Fontes de checkout | Configuração |
| `revenue_rules` | Regras de classificação de receita | Configuração |
| `dunning_rules` | Réguas de cobrança | Automação |
| `dunning_executions` | Execuções de régua | Histórico |
| `payment_dunnings` | Negativações de pagamento | Cobrança |
| `tasks` | Tarefas de cobrança | Operacional |
| `digital_analyses` | Análises de presença digital | Intelligence |
| `profiles_analysis` | Análises de perfis sociais | Intelligence |
| `web_scraps` | Scraping de websites | Intelligence |
| `business_leads` | Leads de negócios (Google) | Intelligence |
| `export_logs` | Registro de exportações | Auditoria |
| `webhook_events` | Eventos de webhook recebidos | Integração |

### 4.2 Segurança de Dados
- Todas as tabelas possuem **Row-Level Security (RLS)** ativado
- Isolamento por tenant_id nas tabelas multi-tenant
- Função `get_my_role()` para verificação de papel no PostgreSQL
- Políticas específicas na tabela `profiles` (usuário só vê/edita próprio perfil; admins/gestores podem visualizar todos)

---

## 5. EDGE FUNCTIONS (BACKEND SERVERLESS)

| Função | Endpoint | Descrição |
|---|---|---|
| `asaas-proxy` | `/asaas-proxy` | Proxy seguro para API do Asaas (esconde API key) |
| `asaas-webhook` | `/asaas-webhook` | Receptor de webhooks do Asaas (atualização de status) |
| `firecrawl-scrape` | `/firecrawl-scrape` | Web scraping via Firecrawl para análise digital |
| `instagram-scraper` | `/instagram-scraper` | Scraping de perfis do Instagram |
| `google-business-scraper` | `/google-business-scraper` | Scraping do Google Meu Negócio |
| `generate-rescue-plan` | `/generate-rescue-plan` | Geração de plano de resgate via IA |
| `run-dunning` | `/run-dunning` | Execução automática da régua de cobrança |

---

## 6. INTERFACE DO USUÁRIO

### 6.1 Design System
- **Tema:** Dark mode como padrão com suporte a light mode
- **Identidade Visual:** Preto Eclipse (#0a0a0a) e Verde Esmeralda como cores principais
- **Tipagem:** Sistema de tokens CSS semânticos (--background, --foreground, --primary, etc.)
- **Componentes:** shadcn/ui customizados com variantes
- **Responsividade:** Mobile-first com breakpoints sm/md/lg/xl
- **Animações:** Fadeins, transições suaves e skeleton loading

### 6.2 Navegação
- **Sidebar Lateral:** 4 layouts configuráveis (Grouped Cards, Dual Rail, Spotlight, Custom)
- **Command Palette (⌘K / Ctrl+K):** Busca global com navegação por teclado
- **Atalhos de Teclado:** G+V (Vendas), G+F (Fiscal), G+C (Cobranças), etc.
- **Categorias de Menu:**
  - Principal: Dashboard, Vendas, Cobranças
  - Financeiro: Inserir Dados, Receitas, Despesas, Fiscal, Comissões
  - Clientes & Produtos: Clientes, Produtos
  - Analytics: Intelligence, Relatórios
  - Sistema: Usuários, Configurações

### 6.3 Componentes Reutilizáveis
- KPICard, RevenueChart, CostBreakdownChart, OverviewChart
- CustomerFormDialog, NegocioCreateModal, NegocioDrawer
- CSVImport, CostDetailTable
- PermissionGate, ProtectedRoute
- ThemeSwitcher, CommandPalette

---

## 7. FLUXOS DE NEGÓCIO PRINCIPAIS

### 7.1 Fluxo de Venda Completo
1. Consultor cria negócio no pipeline (Prospecção)
2. Move pelas etapas: Qualificação → Proposta → Negociação
3. Ao fechar como "Ganho":
   - Gera cobrança automaticamente no Asaas (se configurado)
   - Registra receita
   - Pode emitir NF automaticamente
4. Ao fechar como "Perdido":
   - Registra motivo de perda para análise

### 7.2 Fluxo de Cobrança
1. Cobrança criada (manual ou via pipeline)
2. Webhook do Asaas atualiza status automaticamente
3. Se OVERDUE → régua de cobrança (dunning) é acionada
4. Steps configuráveis: notificação, lembrete, negativação
5. Pagamento recebido → status atualizado → receita registrada

### 7.3 Fluxo de Comissão
1. Regras configuradas por produto (taxas por parcela)
2. Venda fechada → comissão calculada automaticamente
3. Split configurado no Asaas por vendedor
4. Fechamento mensal com relatório exportável

### 7.4 Fluxo de Análise Digital
1. Usuário insere nome da empresa, website e Instagram
2. Sistema executa scraping via Edge Functions
3. Análise multi-dimensional (Web, Google, Instagram, Meta, Neuromarketing)
4. Score consolidado com barra de threshold
5. Geração de plano de resgate via IA
6. Exportação como relatório HTML premium
7. Registro na tabela de análises para histórico

---

## 8. MÉTRICAS SaaS CALCULADAS

O sistema calcula automaticamente as seguintes métricas a partir dos dados inseridos:

| Métrica | Fórmula |
|---|---|
| **MRR** | Receita Recorrente Mensal |
| **ARR** | MRR × 12 |
| **Net New MRR** | New MRR + Expansion MRR - Churned MRR |
| **Revenue Churn Rate** | Churned MRR / MRR anterior |
| **Logo Churn Rate** | Clientes perdidos / Total clientes anterior |
| **CAC** | (Marketing + Vendas) / Novos Clientes |
| **LTV** | ARPU / Revenue Churn Rate |
| **LTV/CAC Ratio** | LTV / CAC |
| **Gross Margin** | (Receita - CSP) / Receita |
| **Net Margin** | Lucro Líquido / Receita |
| **EBITDA** | Receita - (CSP + MKT + SAL + G&A) |
| **Burn Rate** | Total de Custos - Receita Total (se negativo) |
| **Runway** | Saldo em Caixa / Burn Rate |
| **Gross Profit** | Receita Total - CSP |
| **Net Profit** | Receita Total - Total de Custos |

---

## 9. BLOCOS CONTÁBEIS

O sistema organiza custos em 7 blocos contábeis padronizados:

| Bloco | Sigla | Descrição |
|---|---|---|
| Custo de Prestação de Serviço | CSP | COGS / Cost of Revenue |
| Marketing | MKT | Marketing e Aquisição de Clientes |
| Salários/Pessoal | SAL | Folha de pagamento, benefícios, terceirizados |
| General & Administrative | G&A | Custos administrativos e fixos |
| Financeiro | FIN | Tarifas bancárias, juros, IOF, infraestrutura |
| Impostos | TAX | ISS, PIS/COFINS, IRPJ/CSLL |
| Deduções de Receita | REV- | Estornos, reembolsos, chargebacks |

---

## 10. SEGURANÇA

### 10.1 Autenticação
- JWT tokens com expiração configurada
- Verificação de e-mail obrigatória (sem auto-confirm)
- Recuperação de senha via link seguro

### 10.2 Autorização
- RBAC com 5 níveis hierárquicos
- RLS em todas as tabelas do banco
- Função `get_my_role()` como security definer
- ProtectedRoute e PermissionGate na UI

### 10.3 Dados
- API keys do Asaas armazenadas como secrets no servidor
- Proxy via Edge Function (API key nunca exposta ao cliente)
- Webhook token para validação de eventos
- Isolamento multi-tenant por tenant_id

---

## 11. EXPORTAÇÕES E RELATÓRIOS

| Formato | Tecnologia | Características |
|---|---|---|
| **PDF** | jsPDF | Logo da marca, formatação profissional, tabelas estruturadas |
| **CSV** | Nativo | BOM para Excel, separador de colunas padrão |
| **HTML** | Template standalone | Design premium, sem dependências externas, Gauges SVG animados |

---

## 12. CONTEXTOS DE ESTADO (React Context)

| Contexto | Função |
|---|---|
| `AuthProvider` | Autenticação e sessão do usuário |
| `FinancialProvider` | Dados financeiros mensais e métricas |
| `CustomerProvider` | Base de clientes |
| `ProductProvider` | Catálogo de produtos |
| `CostLinesProvider` | Linhas de custo personalizáveis |
| `IntelligenceProvider` | Estado do módulo de inteligência |
| `AsaasProvider` | Conexão e dados do Asaas |
| `ThemeProvider` | Tema claro/escuro |
| `SidebarPrefsProvider` | Preferências de layout da sidebar |

---

## 13. PÁGINAS E ROTAS

| Rota | Página | Módulo de Permissão |
|---|---|---|
| `/` | Dashboard | dashboard |
| `/vendas` | Vendas (CRM/Pipeline) | vendas |
| `/cobrancas` | Cobranças | cobrancas |
| `/input` | Inserir Dados | inserir_dados |
| `/revenue` | Receitas | receitas |
| `/expenses` | Despesas | despesas |
| `/fiscal` | Fiscal | fiscal |
| `/comissoes` | Comissões | comissoes |
| `/customers` | Clientes | clientes |
| `/products` | Produtos | produtos |
| `/intelligence` | Intelligence | intelligence |
| `/reports` | Relatórios | relatorios |
| `/usuarios` | Usuários | usuarios |
| `/settings` | Configurações | configuracoes |
| `/perfil` | Perfil do Usuário | — (sem restrição) |
| `/login` | Login | Público |
| `/signup` | Cadastro | Público |
| `/forgot-password` | Recuperar Senha | Público |
| `/reset-password` | Redefinir Senha | Público |
| `/acesso-negado` | Acesso Negado | Autenticado |

---

## 14. CONSIDERAÇÕES FINAIS

O **Whatsflow Finance** é uma plataforma completa e madura para gestão financeira de empresas SaaS, combinando:

- **Visão financeira profunda** com métricas SaaS padrão de mercado
- **CRM integrado** com pipeline visual e automação de cobranças
- **Módulo fiscal completo** com emissão de NFs e gestão tributária
- **Inteligência competitiva** com análise de presença digital multi-canal
- **Controle de acesso robusto** com 5 níveis hierárquicos e permissões granulares
- **Experiência de usuário premium** com 4 layouts de sidebar, command palette e tema escuro
- **Integração nativa** com gateway de pagamentos Asaas
- **Exportações profissionais** em PDF, CSV e HTML

O sistema foi projetado para escalar, suportando múltiplas empresas (multi-tenant) com isolamento completo de dados e segurança a nível de banco de dados.

---

*Relatório gerado automaticamente — Whatsflow Finance v1.0*  
*© 2026 Whatsflow. Todos os direitos reservados.*
