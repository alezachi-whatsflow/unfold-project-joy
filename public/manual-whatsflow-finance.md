# 📘 Manual Completo — Whatsflow Finance

**Versão:** 1.0  
**Data:** 12 de Março de 2026  
**Plataforma:** Whatsflow Finance — SaaS Multi-Tenant de Gestão Financeira, CRM e Mensageria

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Autenticação e Controle de Acesso](#2-autenticação-e-controle-de-acesso)
3. [Home — Painel Inicial](#3-home--painel-inicial)
4. [Dashboard Financeiro](#4-dashboard-financeiro)
5. [Módulo Financeiro](#5-módulo-financeiro)
   - 5.1 [Inserir Dados](#51-inserir-dados)
   - 5.2 [Receitas](#52-receitas)
   - 5.3 [Despesas](#53-despesas)
   - 5.4 [Cobranças (Asaas)](#54-cobranças-asaas)
   - 5.5 [Fiscal](#55-fiscal)
   - 5.6 [Comissões](#56-comissões)
6. [Clientes & Produtos](#6-clientes--produtos)
   - 6.1 [CRM Contatos](#61-crm-contatos)
   - 6.2 [Clientes](#62-clientes)
   - 6.3 [Produtos](#63-produtos)
   - 6.4 [Vendas (Pipeline)](#64-vendas-pipeline)
   - 6.5 [Conversas](#65-conversas)
   - 6.6 [Mensageria](#66-mensageria)
7. [Analytics](#7-analytics)
   - 7.1 [Dashboard](#71-dashboard)
   - 7.2 [Analytics Avançado](#72-analytics-avançado)
   - 7.3 [Inteligência Digital](#73-inteligência-digital)
   - 7.4 [Relatórios](#74-relatórios)
8. [Sistema](#8-sistema)
   - 8.1 [Usuários](#81-usuários)
   - 8.2 [Conexões WhatsApp](#82-conexões-whatsapp)
   - 8.3 [Integrações](#83-integrações)
   - 8.4 [Assinatura](#84-assinatura)
   - 8.5 [Configurações](#85-configurações)
9. [Portal SuperAdmin](#9-portal-superadmin)
10. [Multi-Tenancy](#10-multi-tenancy)
11. [Permissões e Papéis (RBAC)](#11-permissões-e-papéis-rbac)
12. [Atalhos e Produtividade](#12-atalhos-e-produtividade)

---

## 1. Visão Geral

O **Whatsflow Finance** é uma plataforma SaaS multi-tenant que combina:

- **Gestão Financeira** completa (receitas, despesas, cobranças, fiscal, comissões)
- **CRM e Pipeline de Vendas** com Kanban drag-and-drop
- **Mensageria Omnichannel** (WhatsApp Web + Meta Oficial)
- **Inteligência Digital** (análise de presença online, prospecção de leads)
- **Analytics e Relatórios** com KPIs em tempo real
- **Licenciamento e Auditoria** com conformidade LGPD

Cada empresa (tenant) opera com dados completamente isolados, garantindo segurança e privacidade.

---

## 2. Autenticação e Controle de Acesso

### 2.1 Login
- **Rota:** `/login`
- Autenticação via email e senha
- Sessão persistente com refresh automático de tokens

### 2.2 Cadastro
- **Rota:** `/signup`
- Registro com nome completo, email e senha
- Confirmação de email obrigatória antes do primeiro acesso

### 2.3 Recuperação de Senha
- **Rota:** `/forgot-password`
- Envio de link de redefinição por email
- **Rota:** `/reset-password` — formulário de nova senha

### 2.4 Papéis de Usuário
O sistema possui 6 níveis de acesso hierárquicos:

| Papel | Descrição |
|-------|-----------|
| **SuperAdmin** | Acesso global a todos os tenants e configurações da plataforma |
| **Admin** | Controle total dentro do tenant (empresa) |
| **Gestor** | Gerenciamento operacional com restrições em configurações críticas |
| **Consultor** | Acesso a vendas, clientes e relatórios |
| **Representante** | Acesso limitado aos próprios negócios e pipeline pessoal |
| **Financeiro** | Foco em módulos financeiros (receitas, despesas, cobranças) |

---

## 3. Home — Painel Inicial

- **Rota:** `/`
- Tela inicial após login com acesso rápido aos módulos principais
- Cards de navegação organizados por categoria
- Indicadores resumidos de atividade recente

---

## 4. Dashboard Financeiro

- **Rota:** `/dashboard`
- **Permissão:** módulo `dashboard`

### KPIs Principais
- **MRR** (Receita Recorrente Mensal)
- **Churn Rate** (Taxa de cancelamento)
- **Total de Clientes Ativos**
- **Margem Operacional**
- **Burn Rate** (Taxa de queima de caixa)

### Gráficos Disponíveis
- **Visão Geral:** Receitas vs Despesas ao longo do tempo
- **Crescimento de Clientes:** Evolução mensal da base
- **Tendência de Churn:** Análise de cancelamentos
- **Composição de Custos:** Breakdown por categoria (CSP, MKT, SAL, G&A, FIN, TAX)
- **Margem:** Evolução da margem operacional
- **Receita:** Detalhamento das fontes de receita

---

## 5. Módulo Financeiro

### 5.1 Inserir Dados

- **Rota:** `/input`
- **Permissão:** módulo `inserir_dados`

#### Funcionalidades:
- **Formulário Mensal:** Entrada manual de dados financeiros por mês (MRR, clientes, custos)
- **Importação CSV:** Upload de planilhas com mapeamento automático de colunas
- **Tabela de Detalhamento de Custos:** Edição granular de linhas de custo por categoria
- **Linhas Não Correspondidas:** Dialog para resolução de linhas de CSV que não puderam ser mapeadas automaticamente

#### Blocos Contábeis Suportados:
| Bloco | Descrição |
|-------|-----------|
| CSP | Custo de Prestação de Serviço (COGS) |
| MKT | Marketing e Aquisição |
| SAL | Salários, Benefícios e Terceirizados |
| G&A | Despesas Administrativas Fixas |
| FIN | Infraestrutura e Financeiro |
| TAX | Impostos |
| REV- | Deduções de Receita |

---

### 5.2 Receitas

- **Rota:** `/revenue`
- **Permissão:** módulo `receitas`

#### Funcionalidades:
- **Lançamento Manual:** Cadastro de receitas avulsas (consultoria, serviços)
- **Sincronização Asaas:** Conversão automática de cobranças recebidas em registros de receita
- **Parcelamento Automático:** Ao definir parcelas (ex: 4x), o sistema gera automaticamente registros individuais com vencimentos mensais subsequentes
- **Sugestões Inteligentes:** Autocomplete para descrição e nome do cliente baseado em histórico
- **Categorização:** Classificação por tipo (MRR, Serviço, Avulso, etc.)
- **Filtros:** Por período, categoria, status de pagamento e cliente

---

### 5.3 Despesas

- **Rota:** `/expenses`
- **Permissão:** módulo `despesas`

#### Funcionalidades:
- **Cadastro Completo:** Descrição, valor, data, categoria, fornecedor, centro de custo
- **Métodos de Pagamento:** PIX, Boleto, Cartão de Crédito, Transferência
- **Recorrência:** Marcação de despesas recorrentes com período (mensal, trimestral, anual)
- **Agendamento:** Despesas futuras com data de vencimento
- **Anexos:** Upload de comprovantes e notas fiscais
- **Parcelamento:** Controle de parcelas com acompanhamento individual
- **Código de Referência:** Código interno para rastreabilidade

---

### 5.4 Cobranças (Asaas)

- **Rota:** `/cobrancas`
- **Permissão:** módulo `cobrancas`

O módulo de cobranças integra-se diretamente com a API do **Asaas** para gestão completa do faturamento.

#### Sub-módulos:

##### Cockpit de Pagamentos
- Visão consolidada de todos os pagamentos
- Timeline de status (PENDING → CONFIRMED → RECEIVED)
- Notificações de eventos em tempo real
- Filtros por status, período e tipo de cobrança

##### Gestor de Cobranças
- **Modo Automático:** Geração em lote baseada em regras predefinidas
- **Modo Manual:** Criação individual de cobranças
- Seleção de cliente (Asaas ou local com auto-cadastro)
- Tipos suportados: **BOLETO** (híbrido Boleto/PIX), **PIX**, **CREDIT_CARD**
- Configuração de vencimento via calendário
- **Presets** de configuração reutilizáveis

##### Split de Pagamentos
- Divisão automática de valores entre vendedores/parceiros
- Configuração por percentual ou valor fixo
- Vinculação de wallet_id do Asaas

##### Régua de Cobrança (Dunning)
- Automação de cobranças inadimplentes
- Regras configuráveis por etapa (dias de atraso)
- Ações: notificação WhatsApp, email, negativação
- Templates reutilizáveis
- Histórico de execuções

##### Conciliação
- Comparação entre cobranças emitidas e recebidas
- Identificação de divergências
- Relatórios de reconciliação

---

### 5.5 Fiscal

- **Rota:** `/fiscal`
- **Permissão:** módulo `fiscal`

#### Abas Disponíveis:

##### Visão Geral
- Dashboard de métricas fiscais consolidadas
- Composição tributária por nível (Municipal, Estadual, Federal)
- Alertas de vencimento de certificados

##### Notas Fiscais
- **Emissão:** Fluxo guiado em 4 etapas (Dados → Serviço → Impostos → Revisão)
- **Tipos:** NFS-e (Serviços) e NF-e (Mercadorias)
- **Cancelamento:** Com justificativa obrigatória
- **Dashboard:** KPIs de NFs emitidas, canceladas e valores totais
- **Filtros:** Por período, status, tipo e cliente

##### Tributos
- **Municipal (ISS):** Configuração de alíquotas por código de serviço (CNAE/LC116)
- **Estadual (ICMS):** Regras por UF, substituição tributária, diferencial de alíquota
- **Federal:** PIS, COFINS, IRPJ, CSLL com regimes Simples Nacional, Lucro Presumido e Real

##### Certificados Digitais
- **Upload:** Suporte a certificados A1 (.pfx) e A3
- **Metadados:** Extração automática de validade, titular e CNPJ
- **Alertas:** Notificações de vencimento (30, 15, 7 dias)
- **Ambiente:** Toggle entre Homologação e Produção

##### Configurações Fiscais
- Dados da empresa emissora
- Integração com ViaCEP para preenchimento automático de endereço
- Regime tributário
- Série e numeração de NFs

---

### 5.6 Comissões

- **Rota:** `/comissoes`
- **Permissão:** módulo `comissoes`

#### Abas:

##### Dashboard de Comissões
- Visão consolidada de comissões por período
- Ranking de vendedores
- Métricas de performance

##### Regras de Comissão
- **Tipo:** Baseada em parcelas (installment_based) ou recorrência
- **Configuração por Produto:** Cada produto pode ter regras específicas
- **Tabela de Parcelas:** Percentual diferenciado por número da parcela
- **Recorrência:** Taxa mínima e máxima para parcelas recorrentes
- **Ativação/Desativação:** Controle individual por regra

##### Fechamento
- Consolidação periódica de comissões
- Aprovação por gestores
- Exportação para pagamento

---

## 6. Clientes & Produtos

### 6.1 CRM Contatos

- **Rota:** `/crm`
- **Permissão:** módulo `clientes`

#### Funcionalidades:
- **CRUD Completo:** Cadastro, edição e exclusão de contatos
- **Campos:** Nome, email, telefone, empresa, origem, estágio, tags, notas
- **Estágios:** Lead → Qualificado → Oportunidade → Cliente → Inativo
- **Filtros:** Por estágio, tags, origem e período
- **Proprietário:** Atribuição de responsável por contato
- **Avatar:** Foto do contato
- **Isolamento:** Dados filtrados por tenant automaticamente via RLS

---

### 6.2 Clientes

- **Rota:** `/customers`
- **Permissão:** módulo `clientes`

#### Funcionalidades:
- **Base de Clientes:** Gestão do cadastro de clientes da plataforma Whatsflow
- **Campos Específicos:**
  - Status (Ativo, Bloqueado, Cancelado)
  - Dispositivos (Oficial e Não-Oficial)
  - Atendentes
  - Checkout e Whitelabel
  - Datas de ativação, bloqueio, desbloqueio e cancelamento
  - Valor da última cobrança
- **Importação CSV:** Upload em massa com mapeamento de colunas
- **Filtros Avançados:** Por status, tipo de pagamento, condição, período
- **Edição em Formulário:** Dialog modal com todos os campos

---

### 6.3 Produtos

- **Rota:** `/products`
- **Permissão:** módulo `produtos`

#### Funcionalidades:
- Catálogo de produtos e serviços
- Campos: nome, descrição, preço, categoria, status
- Vinculação com regras de comissão
- Utilizado na composição de negócios (vendas)

---

### 6.4 Vendas (Pipeline)

- **Rota:** `/vendas`
- **Permissão:** módulo `vendas`

#### Abas (variam por papel):

##### Pipeline (Kanban)
- **Drag-and-Drop:** Movimentação de negócios entre etapas
- **Multi-Pipeline:** Suporte a múltiplos funis de vendas (até 10+)
- **Etapas Personalizáveis:** Cada pipeline possui suas próprias fases, cores e probabilidades
- **Filtros:** Por pipeline, consultor, período, tags

##### Lista
- Visualização tabular de todos os negócios
- Ordenação por valor, data, status
- Busca textual

##### Relatórios
- Métricas de conversão por etapa
- Tempo médio no funil
- Forecast de receita

##### Meus Negócios
- Visão filtrada para o usuário logado (obrigatória para representantes)
- Pipeline pessoal

#### Funcionalidades do Negócio:
- **Criação:** Modal com seleção de pipeline, cliente, produtos, consultor
- **Edição Avançada (Modal):**
  - **Informações:** Título, cliente, consultor, origem, probabilidade (slider colorido)
  - **Tags:** Etiquetas personalizáveis
  - **Produtos:** Grid com quantidade, valor unitário e subtotal calculado
  - **Pagamento:** Forma, condição, desconto (% ou fixo), valor líquido automático
  - **Fechamento:** Toggles de automação (gerar cobrança / gerar NF), data de previsão
- **Drawer de Detalhes:** Histórico de alterações, ferramentas de diagnóstico para leads
- **Fechamento como Ganho:** Modal de confirmação com geração opcional de cobrança e NF
- **Fechamento como Perda:** Modal com motivo obrigatório e detalhamento

---

### 6.5 Conversas

- **Rota:** `/conversas`
- **Permissão:** módulo `mensageria`

#### Funcionalidades:
- **Layout 3 Colunas:** Lista de conversas | Área de chat | Painel do contato
- **Filtros de Conversa:**
  - 💬 **Caixa de Entrada:** Conversas individuais abertas/pendentes
  - 👤 **Fila:** Clientes sem atendente atribuído
  - 👥 **Grupos:** Exclusivamente JIDs `@g.us`
  - ✅ **Finalizados:** Status `resolved`
- **Notas Internas:** Anotações visíveis apenas para a equipe
- **Estados:** Aberta → Resolvida
- **Integração CRM:** Link direto ao perfil do contato
- **Realtime:** Atualização automática via WebSocket
- **Multi-Provedor:** Web (uazapi) e Meta Oficial roteados automaticamente pelo prefixo `meta:`

---

### 6.6 Mensageria

- **Rota:** `/mensageria`
- **Permissão:** módulo `mensageria`

#### Abas:

##### Caixa de Entrada
- Interface de chat estilo WhatsApp integrada
- Histórico completo de mensagens
- Atendimento em tempo real

##### Enviar
- **Composer de Mensagens:** Envio individual ou em massa
- Seleção de instância/conexão
- Tipos: texto, imagem, documento, áudio

##### Campanhas
- Criação de campanhas de envio em massa
- Agendamento
- Métricas de entrega e leitura

##### Leads
- **Kanban de Leads:** Gestão visual de potenciais clientes
- Movimentação entre etapas
- Vinculação com conversas

##### Contatos
- **Verificador de Contatos:** Validação de números WhatsApp
- Status de conta (ativo/inativo)

##### Cobrança
- **Régua de Cobrança por Mensagem:** Automação de envio de lembretes
- Configuração de templates por dia de atraso
- Modal de criação/edição de regras

##### Logs
- Histórico completo de mensagens enviadas/recebidas
- Filtros por período, status, direção e origem
- Rastreabilidade completa

---

## 7. Analytics

### 7.1 Dashboard

- **Rota:** `/dashboard`
- **Permissão:** módulo `dashboard`
- KPIs e gráficos financeiros (detalhado na seção 4)

---

### 7.2 Analytics Avançado

- **Rota:** `/analytics`
- **Permissão:** módulo `dashboard`

#### Funcionalidades:
- KPIs de performance geral
- Gráfico de volume de mensagens ao longo do tempo
- Análise de pipeline (negócios por etapa)
- Métricas de conversão
- Comparação entre períodos

---

### 7.3 Inteligência Digital

- **Rota:** `/intelligence`
- **Permissão:** módulo `intelligence`

#### Sub-módulos:

##### Análise Digital
Diagnóstico completo da presença online de uma empresa:

- **Formulário de Busca:** Entrada de nome/URL da empresa
- **Google Business:** Avaliações, rating, localização, categoria
- **Website:** Performance, SEO, tecnologias utilizadas (via Firecrawl)
- **Instagram:** Seguidores, engajamento, frequência de posts (via Apify)
- **Meta Verificação:** Status de verificação da conta
- **Neuromarketing:** Análise de gatilhos mentais e persuasão
- **WhatsApp Business:** Presença e configuração do canal
- **Autoridade Digital:** Score consolidado com classificação
- **Plano de Resgate:** Recomendações personalizadas geradas por IA

##### Barra de Threshold
- Score visual com classificação em faixas (Crítico → Excelente)
- Comparação com benchmarks do setor

##### Histórico de Análises
- Banco de dados de todas as análises realizadas
- Exportação para HTML standalone
- Botão de salvar análise

##### Prospecção de Leads
- **Busca por Nicho/Cidade:** Varredura de leads via Google Maps
- **Cards de Lead:** Nome, categoria, rating, reviews, telefone, site
- **Ações por Lead:**
  - ✅ **Enviar para CRM:** Mini-modal com etapa, responsável e valor
  - 🔍 **Analisar:** Diagnóstico automático via URL
  - 📄 **Relatório:** Geração de HTML standalone
- **Histórico de Campanhas:** Registro de todas as buscas realizadas
- **Contexto de Nicho:** Banner inteligente com insights do segmento

---

### 7.4 Relatórios

- **Rota:** `/reports`
- **Permissão:** módulo `relatorios`

#### Funcionalidades:
- Relatórios financeiros consolidados
- Exportação em PDF e CSV
- Filtros por período e categorias
- Templates pré-configurados

---

## 8. Sistema

### 8.1 Usuários

- **Rota:** `/usuarios`
- **Permissão:** módulo `usuarios`

#### Funcionalidades:
- Lista de usuários do tenant
- Atribuição de papéis (admin, gestor, consultor, representante, financeiro)
- Permissões customizadas por módulo (override da matriz padrão)
- Status ativo/inativo

---

### 8.2 Conexões WhatsApp

- **Rota:** `/wa-connections`
- **Permissão:** módulo `mensageria`

#### Funcionalidades:
- **Gestão Unificada:** Conexões Web (uazapi) e Meta Oficial em uma única interface
- **Web (uazapi):**
  - QR Code para pareamento
  - Status de conexão em tempo real
  - Configuração de webhook automático
- **Meta Oficial:**
  - App ID, Access Token, WABA ID
  - Configuração de webhook com verify token
  - Phone Number ID e display
- **Validação de Licença:** Limite de dispositivos verificado antes de criar nova conexão
- **Status Cards:** Indicadores visuais de saúde de cada conexão

---

### 8.3 Integrações

- **Rota:** `/integracoes`
- **Permissão:** módulo `mensageria`

#### Funcionalidades:
- Gestão centralizada de integrações externas
- Configuração de APIs de terceiros
- Status de conectividade

---

### 8.4 Assinatura

- **Rota:** `/assinatura`
- Acessível a todos os usuários autenticados

#### Funcionalidades:
- **Resumo do Plano:** Nome, status, período de vigência
- **Limites de Uso:**
  - Dispositivos Web (usados / total)
  - Dispositivos Meta (usados / total)
  - Atendentes (usados / total)
  - Usuários (usados / total)
- **Barras de Progresso:** Indicação visual de utilização
- **Add-ons Ativos:** Módulo IA, Facilite, Implantação Starter
- **Alertas:** Banner de notificação para licenças próximas do vencimento ou suspensas

---

### 8.5 Configurações

- **Rota:** `/settings`
- **Permissão:** módulo `configuracoes`

#### Funcionalidades:

##### Gestão de Empresas (Multi-Tenancy)
- **CRUD de Tenants:** Criar, editar e excluir empresas
- **Slug Automático:** Geração de identificador amigável
- **Empresa Padrão:** Marcação com ícone de estrela (⭐)
  - Persistida via `whatsflow_default_tenant_id` no localStorage
  - Filtra automaticamente todos os dados do dashboard
  - Não pode ser excluída enquanto for padrão
- **Evento Global:** `tenant-changed` disparado ao trocar de empresa

##### Layout Customizado da Sidebar
- **Layouts:** Agrupado por cards, lista plana, ícones compactos
- **Densidade:** Default, compacto, confortável
- **Largura:** Default, estreita, larga
- **Opções:** Labels, atalhos de teclado, highlight do item ativo
- **Quick Actions:** Seleção de itens para acesso rápido

##### Configuração de Funil de Vendas
- Gestão centralizada de todos os pipelines
- Criação de novos funis com etapas personalizadas
- Cores, ícones e probabilidades por etapa
- Ordenação drag-and-drop
- Proteção contra exclusão das etapas "Ganhos" e "Perdidos"

---

## 9. Portal SuperAdmin

- **Rota:** `/superadmin`
- **Acesso:** Exclusivo para usuários com papel `superadmin`

### 9.1 Dashboard Global
- **MRR Total:** Soma de todas as licenças ativas
- **Tenants Ativos:** Contagem de empresas em operação
- **Alertas de Vencimento:** Licenças próximas da expiração
- **Distribuição de Planos:** Gráfico por tipo de plano

### 9.2 Gestão de Tenants
- Lista completa de todas as empresas
- Criação com geração automática de slug e license_key
- Edição de dados (nome, CNPJ, email, slug)
- Ativação / Suspensão / Cancelamento
- Filtros por status e plano

### 9.3 Licenças
- Configuração granular por tenant:
  - Plano base (Básico / Profissional)
  - Dispositivos Web e Meta (base + extras)
  - Atendentes (base + extras)
  - Módulo de IA (ativo/inativo + limite de agentes)
  - Integração Facilite (Nenhum / Básico / Intermediário / Avançado)
  - Implantação Starter
- **Cálculo de MRR em Tempo Real:** Atualizado conforme alterações nos add-ons
- Ciclo de cobrança (mensal/anual)

### 9.4 Audit Log
- Registro de todas as ações realizadas na plataforma
- Campos: ator, papel, ação, recurso, tenant, data/hora, IP
- **Filtros:** Por ação, tenant e período
- **Exportação CSV:** Conformidade LGPD
- Dados imutáveis (sem edição ou exclusão)

### 9.5 Configurações Globais
- Parâmetros gerais da plataforma
- Feature flags
- Configurações de ambiente

---

## 10. Multi-Tenancy

### Conceito
Cada empresa (tenant) opera com dados completamente isolados. Um usuário pode pertencer a múltiplos tenants.

### Mecanismo de Isolamento
- **Coluna `tenant_id`:** Presente em todas as tabelas operacionais
- **RLS (Row Level Security):** Políticas automáticas que filtram dados por tenant
- **Função `get_my_tenant_ids()`:** Retorna todos os tenants do usuário logado
- **Tabela `user_tenants`:** Associação N:N entre usuários e empresas

### Troca de Empresa
1. Acesse **Configurações** → **Empresas**
2. Clique no ícone ⭐ para definir a empresa padrão
3. Todos os dados do sistema serão filtrados automaticamente
4. Evento `tenant-changed` notifica todos os componentes

---

## 11. Permissões e Papéis (RBAC)

### Matriz de Permissões

Cada módulo possui 5 ações: `view`, `create`, `edit`, `delete`, `export`

| Módulo | SuperAdmin | Admin | Gestor | Consultor | Representante | Financeiro |
|--------|:----------:|:-----:|:------:|:---------:|:-------------:|:----------:|
| Dashboard | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | 👁 View | 👁 View |
| Vendas | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View+Create | ❌ |
| Inserir Dados | ✅ Todas | ✅ Todas | ✅ Todas | ❌ | ❌ | ✅ Todas |
| Cobranças | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | ❌ | ✅ Todas |
| Despesas | ✅ Todas | ✅ Todas | ✅ Todas | ❌ | ❌ | ✅ Todas |
| Receitas | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | ❌ | ✅ Todas |
| Fiscal | ✅ Todas | ✅ Todas | ✅ Todas | ❌ | ❌ | ✅ Todas |
| Comissões | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | 👁 View | 👁 View |
| Clientes | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | 👁 View |
| Produtos | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | 👁 View | ❌ |
| Intelligence | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas | ❌ | ❌ |
| Configurações | ✅ Todas | ✅ Todas | 👁 View | ❌ | ❌ | ❌ |
| Usuários | ✅ Todas | ✅ Todas | 👁 View | ❌ | ❌ | ❌ |
| Relatórios | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View+Export | ❌ | 👁 View+Export |
| Mensageria | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas | 👁 View | ❌ |

### Permissões Customizadas
Administradores podem sobrescrever a matriz padrão para usuários específicos através do campo `custom_permissions` no perfil.

---

## 12. Atalhos e Produtividade

### Command Palette
- **Atalho:** `Ctrl + K` (ou `Cmd + K` no Mac)
- Busca rápida de páginas e ações
- Navegação instantânea entre módulos

### Temas
- **Escuro (Dark):** Padrão da plataforma
- **Claro (Light):** Alternativa para ambientes com muita luz
- **Alternância:** Via ícone no header ou configurações da sidebar

### Sidebar Personalizável
- **Colapsar/Expandir:** Toggle lateral
- **Quick Actions:** Até 3 ações rápidas fixas no topo
- **Densidade:** Ajuste de espaçamento entre itens
- **Highlight Ativo:** Destaque visual do módulo atual

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **MRR** | Monthly Recurring Revenue — Receita Recorrente Mensal |
| **Churn** | Taxa de cancelamento de clientes |
| **Tenant** | Empresa/organização isolada no sistema multi-tenant |
| **RLS** | Row Level Security — Segurança a nível de linha no banco de dados |
| **Pipeline** | Funil de vendas com etapas configuráveis |
| **Dunning** | Régua de cobrança automatizada para inadimplentes |
| **Split** | Divisão de pagamento entre múltiplos recebedores |
| **LGPD** | Lei Geral de Proteção de Dados |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica |
| **NF-e** | Nota Fiscal Eletrônica (mercadorias) |
| **WABA** | WhatsApp Business Account |
| **Facilite** | Módulo integrado de suporte/help desk |

---

> **Whatsflow Finance** © 2026 — Todos os direitos reservados.
