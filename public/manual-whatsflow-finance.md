# 📘 Manual Completo e Detalhado — Whatsflow Finance

**Versão:** 2.0  
**Data:** 12 de Março de 2026  
**Plataforma:** Whatsflow Finance — SaaS Multi-Tenant de Gestão Financeira, CRM e Mensageria

---

## Sumário

1. [Visão Geral da Plataforma](#1-visão-geral-da-plataforma)
2. [Primeiro Acesso e Autenticação](#2-primeiro-acesso-e-autenticação)
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
   - 7.1 [Dashboard Financeiro](#71-dashboard-financeiro)
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
10. [Multi-Tenancy — Como Funciona](#10-multi-tenancy--como-funciona)
11. [Permissões e Papéis (RBAC)](#11-permissões-e-papéis-rbac)
12. [Atalhos e Produtividade](#12-atalhos-e-produtividade)
13. [Glossário](#13-glossário)

---

## 1. Visão Geral da Plataforma

O **Whatsflow Finance** é uma plataforma SaaS multi-tenant (multi-empresa) que integra em um único ambiente:

- **Gestão Financeira Completa:** Receitas, despesas, cobranças automatizadas, módulo fiscal (NFS-e/NF-e), comissões por vendedor e dashboards com KPIs em tempo real.
- **CRM e Pipeline de Vendas:** Kanban visual com múltiplos funis personalizáveis, catálogo de produtos, gestão de negócios com histórico completo e integração direta com cobranças.
- **Mensageria Omnichannel:** Envio e recebimento de mensagens via WhatsApp (Web/uazapi e Meta Oficial), campanhas em massa, caixa de entrada unificada e réguas de cobrança automatizadas.
- **Inteligência Digital:** Diagnóstico completo de presença online (website, Instagram, Google Business), prospecção automatizada de leads e geração de relatórios para clientes.
- **Analytics e Relatórios:** KPIs financeiros, métricas de conversão, volume de mensagens e análise de pipeline com gráficos interativos.
- **Licenciamento e Auditoria:** Controle granular de licenças por empresa, logs de auditoria imutáveis para conformidade LGPD e portal administrativo global.

**Cada empresa (tenant) opera com dados completamente isolados**, garantindo que nenhum dado de uma empresa possa ser visualizado por outra.

---

## 2. Primeiro Acesso e Autenticação

### 2.1 Como Criar sua Conta

1. Acesse a plataforma pelo endereço fornecido pelo administrador.
2. Na tela de login, clique no link **"Criar conta"** (parte inferior do formulário).
3. Preencha os campos obrigatórios:
   - **Nome Completo:** Seu nome que aparecerá no sistema.
   - **Email:** Endereço de email válido (será seu identificador de login).
   - **Senha:** Mínimo de 6 caracteres. Use uma senha forte.
   - **Confirmar Senha:** Repita a mesma senha.
4. Clique em **"Criar conta"**.
5. **Importante:** Você receberá um email de confirmação. Abra o email e clique no link de verificação.
6. Após confirmar o email, retorne à tela de login e entre com suas credenciais.

### 2.2 Como Fazer Login

1. Acesse a página de login (`/login`).
2. Digite seu **email** e **senha**.
3. Clique em **"Entrar"**.
4. Você será redirecionado automaticamente para a **Home** da plataforma.
5. Sua sessão é mantida automaticamente — não é necessário logar novamente enquanto o token estiver válido.

### 2.3 Como Recuperar sua Senha

1. Na tela de login, clique em **"Esqueceu sua senha?"**.
2. Digite o email cadastrado.
3. Clique em **"Enviar link de redefinição"**.
4. Abra o email recebido e clique no link de redefinição.
5. Na página que abrir (`/reset-password`), digite e confirme a nova senha.
6. Clique em **"Redefinir senha"**.
7. Retorne ao login e entre com a nova senha.

### 2.4 Papéis de Usuário — O que Cada Um Pode Fazer

O sistema possui **6 níveis de acesso** que determinam quais funcionalidades cada pessoa pode acessar:

| Papel | O que faz | O que NÃO pode fazer |
|-------|-----------|----------------------|
| **SuperAdmin** | Acesso total a TODAS as empresas e configurações globais. Gerencia tenants, licenças e audit log. | Nenhuma restrição. |
| **Admin** | Controle total dentro da SUA empresa. Gerencia usuários, configurações e todos os módulos. | Não acessa outras empresas nem o portal SuperAdmin. |
| **Gestor** | Gerencia operações: vendas, cobranças, receitas, despesas, mensageria. Pode criar e editar, mas não excluir. | Não pode acessar configurações avançadas nem gerenciar usuários plenamente. |
| **Consultor** | Trabalha com vendas, clientes e relatórios. Pode criar negócios e contatos CRM. | Não acessa financeiro (despesas, fiscal), configurações ou gestão de usuários. |
| **Representante** | Visualiza apenas seus próprios negócios na aba "Meus Negócios". Pode criar novos negócios. | Não vê Pipeline global, não acessa cobranças, fiscal, inteligência digital ou mensageria. |
| **Financeiro** | Foco em receitas, despesas, cobranças, fiscal e comissões. | Não acessa vendas (pipeline), configurações ou gestão de usuários. |

---

## 3. Home — Painel Inicial

**Rota:** `/` (após login)

### O que é
A Home é a primeira tela que aparece após o login. Funciona como um **hub de navegação rápida** com indicadores resumidos.

### O que você encontra na Home

1. **Saudação personalizada:** "Bom dia/Boa tarde/Boa noite, [seu nome]" com a data atual.
2. **4 KPIs em tempo real:**
   - 💰 **MRR Atual:** Receita recorrente mensal baseada no último registro financeiro.
   - ⏳ **Cobranças Pendentes:** Quantidade de pagamentos com status PENDING no Asaas.
   - 📊 **Pipeline Ativo:** Número de negócios ativos (não fechados como ganho ou perdido).
   - 💬 **Mensagens Hoje:** Total de mensagens registradas no dia.
3. **Dock de navegação:** Ícones organizados por grupo que levam direto a cada módulo:
   - Grupo 1: Inserir Dados, Receitas, Despesas, Cobranças, Fiscal, Comissões
   - Grupo 2: Clientes, Produtos, Vendas, Mensageria
   - Grupo 3: Dashboard, Intelligence, Relatórios
   - Grupo 4: Configurações, Integrações
4. **Atividade recente:** Últimas 3 mensagens recebidas/enviadas com preview do conteúdo.

### Como usar
- Clique em qualquer ícone do dock para navegar diretamente ao módulo.
- No mobile, use o botão ☰ para expandir o menu lateral.
- O dock mostra badges (contadores) quando há itens pendentes.

---

## 4. Dashboard Financeiro

**Rota:** `/dashboard`  
**Permissão necessária:** módulo `dashboard` (ver)

### O que é
O Dashboard apresenta a **saúde financeira da empresa** em KPIs e gráficos interativos, calculados automaticamente a partir dos dados inseridos.

### KPIs Exibidos no Topo

| KPI | O que significa | Como é calculado |
|-----|----------------|-----------------|
| **MRR** | Receita Recorrente Mensal | Valor do campo `mrr` do mês mais recente |
| **Churn Rate** | Taxa de cancelamento | `churned_customers / total_customers * 100` |
| **Total Clientes** | Clientes ativos | Campo `total_customers` do mês atual |
| **Margem Operacional** | Quanto sobra da receita | `(receita - custos totais) / receita * 100` |
| **Burn Rate** | Velocidade de gasto | Total de custos operacionais mensais |
| **Cash Balance** | Saldo em caixa | Campo `cash_balance` do mês atual |

### Gráficos Disponíveis

1. **Visão Geral (OverviewChart):**
   - Tipo: Gráfico de barras + linha
   - Mostra: Receitas totais vs Despesas totais ao longo dos meses
   - Como ler: Barras verdes (receita) devem ser maiores que as vermelhas (custo)

2. **Crescimento de Clientes (CustomerGrowthChart):**
   - Tipo: Gráfico de área
   - Mostra: Evolução mensal da base de clientes (novos vs cancelados)
   - Como ler: A área deve crescer consistentemente

3. **Tendência de Churn (ChurnTrendChart):**
   - Tipo: Gráfico de linha
   - Mostra: Evolução do percentual de churn
   - Como ler: A linha deve tender para baixo (menos cancelamentos)

4. **Composição de Custos (CostBreakdownChart):**
   - Tipo: Gráfico de pizza/rosca
   - Mostra: Distribuição dos custos por categoria
   - Categorias: CSP (prestação de serviço), MKT (marketing), SAL (salários), G&A (administrativo), FIN (financeiro/infra), TAX (impostos)

5. **Margem Operacional (MarginTrendChart):**
   - Tipo: Gráfico de linha com área
   - Mostra: Evolução da margem ao longo dos meses
   - Como ler: Percentual acima de 0% indica operação lucrativa

6. **Receita Detalhada (RevenueChart):**
   - Tipo: Gráfico de barras empilhadas
   - Mostra: MRR + New MRR + Expansion MRR + Other Revenue

### Passo a passo para interpretar o Dashboard

1. Acesse **Analytics → Dashboard** no menu lateral.
2. Verifique os KPIs no topo — indicadores verdes são positivos, vermelhos indicam atenção.
3. Role para baixo para ver os gráficos detalhados.
4. Cada gráfico tem tooltip — passe o mouse sobre os pontos para ver valores exatos.
5. Se os gráficos estiverem vazios, você precisa primeiro **inserir dados** (seção 5.1).

---

## 5. Módulo Financeiro

### 5.1 Inserir Dados

**Rota:** `/input`  
**Permissão:** módulo `inserir_dados`

#### O que é
Módulo para inserção de dados financeiros mensais que alimentam o Dashboard e os relatórios. É o **primeiro passo** para utilizar a plataforma financeira.

#### Passo a passo — Inserção Manual

1. Acesse **Financeiro → Inserir Dados** no menu lateral.
2. No **formulário mensal**, selecione o mês de referência (ex: "2026-03").
3. Preencha cada campo numérico:

   **Bloco de Receita:**
   - **MRR:** Receita recorrente mensal (assinaturas ativas × valor médio)
   - **Novo MRR:** MRR de clientes novos do mês
   - **Expansion MRR:** Receita adicional de upsells/upgrades
   - **Outras Receitas:** Receitas não-recorrentes (consultorias, projetos)

   **Bloco de Clientes:**
   - **Total Clientes:** Quantidade total de clientes ativos ao final do mês
   - **Novos Clientes:** Clientes adquiridos no mês
   - **Clientes Churn:** Clientes que cancelaram no mês
   - **MRR Churn:** Valor de MRR perdido com cancelamentos

   **Bloco de Custos (por categoria):**
   - **Folha de Pagamento:** Salários brutos dos funcionários
   - **Benefícios:** VT, VR, plano de saúde, etc.
   - **Terceirizados:** PJ, freelancers, consultores externos
   - **Marketing:** Investimento em aquisição (anúncios, eventos)
   - **Infraestrutura:** Servidores, softwares, licenças
   - **Impostos:** Tributos sobre receita
   - **Custos Fixos:** Aluguel, energia, internet
   - **Custos Variáveis:** Comissões, taxas de gateway

   **Bloco de Caixa:**
   - **Saldo em Caixa:** Dinheiro disponível ao final do mês

4. Clique em **"Salvar"** para registrar os dados.
5. Se o mês já possui registro, os dados serão atualizados. Caso contrário, um novo registro será criado.

#### Passo a passo — Importação CSV

1. Na aba **"Importar CSV"**, clique em **"Selecionar arquivo"**.
2. Escolha um arquivo `.csv` do seu computador.
3. O sistema exibirá uma **pré-visualização** das colunas encontradas.
4. Para cada coluna do CSV, selecione o campo correspondente no Whatsflow (dropdown de mapeamento).
5. Clique em **"Importar"**.
6. Se houver linhas que não puderam ser mapeadas, o dialog **"Linhas Não Correspondidas"** será exibido, permitindo revisão manual.
7. Confirme a importação.

#### Tabela de Detalhamento de Custos

- Abaixo do formulário principal, a **tabela de custos** permite inserir linhas individuais de custo.
- Cada linha contém: **Descrição**, **Categoria** (CSP/MKT/SAL/G&A/FIN/TAX/REV-), **Valor** e **Observações**.
- Clique em **"+ Adicionar Linha"** para inserir nova despesa detalhada.
- As linhas são somadas automaticamente nos blocos do formulário.
- Templates pré-configurados estão disponíveis para agilizar o preenchimento.

---

### 5.2 Receitas

**Rota:** `/revenue`  
**Permissão:** módulo `receitas`

#### O que é
Gestão de todas as entradas financeiras da empresa — desde receitas recorrentes (MRR) até lançamentos avulsos.

#### Passo a passo — Cadastrar uma Receita

1. Acesse **Financeiro → Receitas** no menu lateral.
2. Clique no botão **"+ Nova Receita"** (canto superior direito).
3. Preencha os campos no formulário:
   - **Descrição:** Nome/título da receita (ex: "Assinatura Plano Pro - Empresa XYZ"). O campo possui **autocomplete** — ao começar a digitar, sugestões baseadas em registros anteriores aparecerão.
   - **Valor (R$):** Valor da receita. Use ponto ou vírgula para centavos.
   - **Data:** Data de referência (competência).
   - **Categoria:** Selecione entre MRR, Serviço, Avulso, Consultoria, etc.
   - **Cliente:** Nome do cliente. Também possui **autocomplete** com histórico.
   - **Status:** Pendente, Confirmado, Recebido.
   - **Tipo de Cobrança:** PIX, Boleto, Cartão, Transferência.
   - **Parcelas:** Se for parcelado, selecione o número de parcelas (ex: "4x").
   - **Data de Vencimento:** Quando o pagamento deve ser feito.
   - **Data de Pagamento:** Quando foi efetivamente pago (se já recebido).
   - **Notas:** Observações adicionais.
4. Clique em **"Salvar"**.

#### Como funciona o Parcelamento Automático

1. Ao cadastrar uma receita de R$ 1.200,00 e selecionar **"4 parcelas"**:
2. O sistema criará automaticamente **4 registros** de R$ 300,00 cada.
3. Cada parcela terá vencimento no dia correspondente dos 4 meses seguintes.
4. As parcelas são numeradas: "1/4", "2/4", "3/4", "4/4".
5. Cada parcela pode ser individualmente marcada como paga.

#### Como funciona a Sincronização com Asaas

- Quando uma cobrança do Asaas é confirmada/recebida, um registro de receita é automaticamente criado.
- O campo `asaas_payment_id` vincula a receita ao pagamento original.
- O campo `source` será marcado como "asaas" (versus "manual" para lançamentos manuais).

#### Filtros Disponíveis

- **Período:** Filtrar por mês/ano ou intervalo de datas.
- **Categoria:** MRR, Serviço, Avulso, etc.
- **Status:** Pendente, Confirmado, Recebido.
- **Cliente:** Busca por nome.

---

### 5.3 Despesas

**Rota:** `/expenses`  
**Permissão:** módulo `despesas`

#### O que é
Controle completo de todas as saídas financeiras, com suporte a recorrência, parcelamento, categorização e anexos.

#### Passo a passo — Cadastrar uma Despesa

1. Acesse **Financeiro → Despesas** no menu lateral.
2. Clique em **"+ Nova Despesa"**.
3. Preencha os campos:
   - **Descrição:** Nome da despesa (ex: "Aluguel escritório"). Campo obrigatório.
   - **Valor (R$):** Valor da despesa. Campo obrigatório.
   - **Data:** Data da despesa (competência).
   - **Categoria:** Selecione entre: Infraestrutura, Marketing, Pessoal, Administrativo, Financeiro, Impostos, Outros.
   - **Fornecedor:** Nome do fornecedor ou prestador.
   - **Centro de Custo:** Departamento ou projeto.
   - **Método de Pagamento:** PIX, Boleto, Cartão de Crédito, Transferência.
   - **Conta de Pagamento:** Conta bancária utilizada.
   - **Parcelas:** "À vista" ou número de parcelas (ex: "3x").
   - **Data de Vencimento:** Quando deve ser pago.
   - **Código de Referência:** Código interno para rastreamento (ex: NF do fornecedor).
   - **Notas:** Observações adicionais.
4. **Opções especiais:**
   - **☑ Pago:** Marque se a despesa já foi paga.
   - **☑ Agendado:** Marque se é um pagamento futuro programado.
   - **☑ Recorrente:** Marque se a despesa se repete periodicamente.
     - Se marcado, selecione o **Período de Recorrência:** Mensal, Trimestral, Semestral ou Anual.
5. **Anexar Comprovante:**
   - Clique em **"Anexar arquivo"** para upload de comprovantes (PDF, imagem).
   - O arquivo será armazenado e vinculado à despesa.
   - O nome do arquivo será exibido no registro.
6. Clique em **"Salvar"**.

#### Como gerenciar despesas existentes

- **Visualizar:** A tabela exibe todas as despesas com colunas: Descrição, Valor, Data, Categoria, Status, Vencimento.
- **Editar:** Clique no ícone de edição (lápis) na coluna "Ações" de qualquer despesa.
- **Excluir:** Clique no ícone de lixeira. Uma confirmação será solicitada.
- **Filtrar:** Use os filtros no topo: por período, categoria, status de pagamento e fornecedor.
- **Marcar como Pago:** Altere o toggle "Pago" diretamente na edição.

---

### 5.4 Cobranças (Asaas)

**Rota:** `/cobrancas`  
**Permissão:** módulo `cobrancas`

#### O que é
Módulo integrado com a API do **Asaas** (gateway de pagamentos brasileiro) para criação, acompanhamento e automação de cobranças via Pix, Boleto e Cartão de Crédito.

#### Pré-requisito
É necessário ter uma **conexão Asaas configurada** em Configurações. A conexão armazena a chave API e o ambiente (sandbox/produção).

#### Sub-módulos e Passo a Passo

##### A) Cockpit de Pagamentos

1. Acesse **Financeiro → Cobranças**.
2. A aba **"Cockpit"** é a visão padrão.
3. Você verá uma **lista de todos os pagamentos** sincronizados do Asaas.
4. Para cada pagamento, são exibidos:
   - **ID Asaas:** Identificador único no gateway.
   - **Cliente:** Nome do pagador.
   - **Valor:** R$ com valor líquido (após taxas).
   - **Vencimento:** Data de vencimento.
   - **Status:** Badge colorido — PENDING (amarelo), CONFIRMED (azul), RECEIVED (verde), OVERDUE (vermelho), REFUNDED (cinza).
   - **Tipo:** BOLETO, PIX, CREDIT_CARD.
5. **Clique em qualquer pagamento** para abrir o **dialog de Timeline**:
   - Mostra a sequência cronológica de eventos do pagamento.
   - Exibe links para: fatura (invoice_url), boleto (bank_slip_url), QR Code PIX.
6. **Filtros disponíveis:**
   - Status: Pendente, Confirmado, Recebido, Vencido, Estornado.
   - Tipo de cobrança: Boleto, PIX, Cartão.
   - Período: Data de vencimento.
   - Cliente: Busca por nome.
7. **Card de Notificações:** Exibe eventos recentes do webhook (pagamentos confirmados, vencidos, etc.).

##### B) Gestor de Cobranças (Billing Manager)

1. Acesse a aba **"Gerar Cobranças"**.
2. **Selecione o cliente:**
   - Digite o nome para buscar entre os clientes cadastrados no Asaas.
   - Se o cliente não existir, o sistema oferece **auto-cadastro**: preencha nome, CPF/CNPJ e email, e o cliente será criado no Asaas automaticamente.
3. **Configure a cobrança:**
   - **Tipo:** Selecione BOLETO (gera boleto + opção PIX), PIX (somente QR Code) ou CREDIT_CARD (cartão).
   - **Valor (R$):** Valor da cobrança.
   - **Vencimento:** Selecione a data usando o calendário.
   - **Descrição:** Texto que aparecerá na fatura do cliente.
4. **Configurar Split (opcional):**
   - Marque **"Configurar Split"** para dividir o pagamento.
   - Informe o **Wallet ID** do recebedor secundário (ex: vendedor).
   - Defina o **tipo:** Percentual (ex: 10%) ou Valor Fixo (ex: R$ 50,00).
   - O split é processado automaticamente pelo Asaas.
5. Clique em **"Gerar Cobrança"**.
6. O sistema retornará:
   - **Link da fatura** (para envio ao cliente).
   - **QR Code PIX** (se aplicável).
   - **Código PIX copia-e-cola**.
   - **Link do boleto** (se tipo BOLETO).
7. Um dialog **"Artefatos de Pagamento"** permite copiar qualquer um desses links.

##### C) Régua de Cobrança (Dunning)

1. Acesse a aba **"Régua de Cobrança"**.
2. Clique em **"+ Nova Régua"** para criar uma automação.
3. Configure:
   - **Nome:** Identificação da régua (ex: "Cobrança Padrão 30 dias").
   - **Descrição:** Detalhamento do fluxo.
   - **Status:** Rascunho (draft), Ativo (active) ou Pausado (paused).
4. **Adicione etapas (steps):**
   - **Etapa 1:** Dia 1 de atraso → Enviar lembrete por WhatsApp.
   - **Etapa 2:** Dia 5 de atraso → Enviar email com link de pagamento.
   - **Etapa 3:** Dia 15 de atraso → Notificação urgente.
   - **Etapa 4:** Dia 30 de atraso → Negativação via Asaas.
5. Para cada etapa, configure:
   - **Dias de atraso:** Quantos dias após o vencimento.
   - **Ação:** whatsapp, email, sms, negativacao.
   - **Template:** Texto da mensagem com variáveis (ex: `{nome_cliente}`, `{valor}`, `{link_pagamento}`).
6. Clique em **"Salvar"**.
7. Ative a régua mudando o status para **"Ativo"**.
8. A régua rodará automaticamente para cobranças com status OVERDUE.
9. O **Histórico de Execuções** mostra todas as ações já executadas, com data, resultado e status de sucesso.

##### D) Conciliação

1. Acesse a aba **"Conciliação"**.
2. O sistema compara:
   - Cobranças emitidas (esperadas) × Pagamentos recebidos (confirmados).
3. Identifica divergências:
   - Cobranças sem pagamento correspondente.
   - Pagamentos não vinculados a cobranças.
   - Diferenças de valor.
4. Permite ação corretiva manual para cada divergência.

---

### 5.5 Fiscal

**Rota:** `/fiscal`  
**Permissão:** módulo `fiscal`

#### O que é
Módulo completo para gestão tributária, emissão de notas fiscais eletrônicas e gerenciamento de certificados digitais.

#### Abas e Passo a Passo

##### A) Visão Geral

1. Acesse **Financeiro → Fiscal**.
2. A aba **"Visão Geral"** exibe:
   - **Total de NFs emitidas** no mês.
   - **Valor total faturado.**
   - **Composição tributária** por nível (Municipal, Estadual, Federal).
   - **Alertas** de certificados próximos do vencimento.

##### B) Notas Fiscais — Como Emitir

1. Acesse a aba **"Notas Fiscais"**.
2. Visualize o **Dashboard de NFs:** cards com total emitidas, canceladas, valor total e NFs pendentes.
3. Clique em **"+ Emitir NF"**.
4. O fluxo de emissão possui **4 etapas:**

   **Etapa 1 — Dados do Tomador (Cliente):**
   - Nome/Razão Social
   - CPF/CNPJ (com validação automática)
   - Email
   - Endereço completo (CEP com auto-preenchimento via ViaCEP)

   **Etapa 2 — Dados do Serviço:**
   - Descrição do serviço prestado
   - Código CNAE / Item da Lista de Serviços (LC 116)
   - Valor total do serviço
   - Quantidade e valor unitário

   **Etapa 3 — Impostos:**
   - Os impostos são **calculados automaticamente** conforme o regime tributário configurado.
   - ISS: Alíquota municipal (ex: 5%)
   - PIS: Conforme regime (Simples: isento, Lucro Presumido: 0,65%)
   - COFINS: Conforme regime (Simples: isento, LP: 3%)
   - IRPJ, CSLL: Se aplicáveis
   - Você pode ajustar valores manualmente se necessário.

   **Etapa 4 — Revisão e Confirmação:**
   - Revise todos os dados.
   - Clique em **"Emitir NF"**.
   - A nota será registrada com status "Emitida" e número sequencial.

5. **Após emissão:**
   - A NF aparece na tabela com colunas: Número, Data, Tomador, Valor, Status, Ações.
   - Clique no ícone 👁 para **visualizar** os detalhes completos.
   - Clique no ícone ❌ para **cancelar** (será solicitada justificativa obrigatória).

6. **Filtros:** Por período, status (Emitida, Cancelada), tipo (NFS-e, NF-e) e cliente.

##### C) Tributos — Configuração de Alíquotas

1. Acesse a aba **"Tributos"**.
2. Três seções divididas por nível:

   **Municipal (ISS):**
   - Configure a alíquota padrão de ISS da sua cidade.
   - Defina códigos de serviço (CNAE/LC 116) com alíquotas específicas.
   - Informe se há retenção de ISS na fonte.

   **Estadual (ICMS):**
   - Configure regras por UF de destino.
   - Defina alíquotas internas e interestaduais.
   - Configure substituição tributária (ICMS-ST) se aplicável.
   - Diferencial de alíquota (DIFAL) para vendas interestaduais.

   **Federal:**
   - Selecione o regime: **Simples Nacional**, **Lucro Presumido** ou **Lucro Real**.
   - Configure alíquotas de PIS, COFINS, IRPJ e CSLL conforme o regime.
   - O Simples Nacional usa alíquota unificada da tabela do Simples.

##### D) Certificados Digitais

1. Acesse a aba **"Certificados"**.
2. Visualize os **cards de status:**
   - **Certificados Válidos:** Quantidade e próximo vencimento.
   - **Certificados Vencendo:** Alertas para os próximos 30 dias.
   - **Certificados Expirados:** Que precisam de renovação imediata.
3. **Para adicionar um certificado:**
   - Clique em **"+ Upload Certificado"**.
   - Selecione o arquivo `.pfx` (certificado A1).
   - Digite a **senha do certificado**.
   - O sistema extrairá automaticamente: titular, CNPJ, validade, cadeia certificadora.
   - Clique em **"Salvar"**.
4. **Toggle de Ambiente:**
   - Alterne entre **Homologação** (testes) e **Produção** (real).
   - Em homologação, as NFs não têm valor fiscal.
5. **Alertas automáticos:**
   - 30 dias antes do vencimento: alerta amarelo.
   - 15 dias: alerta laranja.
   - 7 dias ou menos: alerta vermelho.
   - O banner de alerta aparece no topo da tela do módulo fiscal.

##### E) Configurações Fiscais

1. Acesse a aba **"Configurações"**.
2. Preencha os dados da empresa emissora:
   - Razão Social, CNPJ, Inscrição Estadual, Inscrição Municipal.
   - Endereço completo (com auto-preenchimento pelo CEP via ViaCEP).
   - Regime tributário selecionado.
   - Série e número inicial das notas fiscais.
   - Contato fiscal (email, telefone).

---

### 5.6 Comissões

**Rota:** `/comissoes`  
**Permissão:** módulo `comissoes`

#### O que é
Gestão de regras de comissionamento para equipe de vendas, com cálculo automático baseado em parcelas e recorrência.

#### Abas e Passo a Passo

##### A) Dashboard de Comissões

1. Acesse **Financeiro → Comissões**.
2. A aba **"Dashboard"** exibe:
   - **Total de comissões no período.**
   - **Ranking de vendedores** por valor comissionado.
   - **Gráfico de evolução** mensal.
   - **Métricas por vendedor:** Total vendido, comissão gerada, ticket médio.

##### B) Regras de Comissão — Como Criar

1. Acesse a aba **"Regras"**.
2. Clique em **"+ Nova Regra"**.
3. Preencha:
   - **Nome da Regra:** Ex: "Comissão Plano Enterprise".
   - **Produto:** Selecione do catálogo (ou informe manualmente nome e preço).
   - **Tipo:** "Baseada em Parcelas" (installment_based).
4. **Configure a tabela de parcelas:**
   - Para cada parcela (1ª, 2ª, 3ª...), defina o **percentual de comissão**.
   - Exemplo:
     - Parcela 1: 15%
     - Parcela 2: 10%
     - Parcela 3: 8%
     - Parcela 4: 5%
5. **Configure recorrência (para assinaturas):**
   - **A partir da parcela:** Ex: 5ª parcela em diante.
   - **Taxa mínima:** Percentual mínimo (ex: 3%).
   - **Taxa máxima:** Percentual máximo (ex: 5%).
   - As parcelas recorrentes usarão um percentual entre o mínimo e máximo.
6. **Notas:** Observações sobre a regra (visíveis apenas para gestores).
7. Clique em **"Salvar"**.
8. **Ativar/Desativar:** Use o toggle para ativar ou pausar a regra sem excluí-la.

##### C) Fechamento

1. Acesse a aba **"Fechamento"**.
2. Selecione o **período de fechamento** (mês/ano).
3. O sistema calcula automaticamente as comissões devidas com base em:
   - Negócios fechados como ganho no período.
   - Regras de comissão ativas vinculadas aos produtos dos negócios.
   - Parcelas confirmadas/recebidas.
4. **Revise** os valores calculados por vendedor.
5. Clique em **"Aprovar Fechamento"** para confirmar.
6. Os valores aprovados ficam disponíveis para exportação (planilha de pagamento).

---

## 6. Clientes & Produtos

### 6.1 CRM Contatos

**Rota:** `/crm`  
**Permissão:** módulo `clientes`

#### O que é
Repositório centralizado de todos os contatos da empresa, isolado por tenant. Diferente da tabela "Clientes" (que é focada em clientes da plataforma Whatsflow), o CRM é um módulo genérico para qualquer tipo de contato.

#### Passo a passo — Adicionar Contato

1. Acesse **Clientes & Produtos → CRM Contatos**.
2. Clique em **"+ Novo Contato"**.
3. Preencha os campos:
   - **Nome:** Obrigatório.
   - **Email:** Endereço de email.
   - **Telefone:** Com DDD.
   - **Empresa:** Nome da empresa do contato.
   - **Estágio:** Selecione entre Lead, Qualificado, Oportunidade, Cliente ou Inativo.
   - **Origem:** Manual, WhatsApp, Website, Indicação, Digital Intelligence.
   - **Tags:** Etiquetas para categorizar (ex: "vip", "parceiro", "revendedor"). Digite e pressione Enter.
   - **Notas:** Observações sobre o contato.
   - **Proprietário:** Usuário responsável pelo contato.
4. Clique em **"Salvar"**.

#### Como filtrar e buscar contatos

1. Use a **barra de busca** no topo para buscar por nome, email ou telefone.
2. **Filtros avançados:**
   - **Estágio:** Selecione um ou mais estágios (multi-seleção).
   - **Origem:** Filtre por canal de aquisição.
   - **Tags:** Filtre por etiqueta.
3. Os filtros são aplicados em tempo real — a lista atualiza instantaneamente.

#### Como editar ou excluir

1. Na lista de contatos, clique no ícone de **edição** (lápis) na coluna Ações.
2. Modifique os campos desejados no dialog.
3. Clique em **"Salvar"**.
4. Para excluir, clique no ícone de **lixeira** e confirme.

---

### 6.2 Clientes

**Rota:** `/customers`  
**Permissão:** módulo `clientes`

#### O que é
Tabela específica para **clientes da plataforma Whatsflow** — empresas que utilizam o sistema. Diferente do CRM, possui campos específicos para gestão de licenciamento.

#### Passo a passo — Cadastrar Cliente

1. Acesse **Clientes & Produtos → Clientes**.
2. Clique em **"+ Novo Cliente"**.
3. Preencha:
   - **Nome:** Razão social ou nome fantasia.
   - **Email:** Email principal.
   - **CPF/CNPJ:** Documento (com validação automática de formato).
   - **Status:** Ativo, Bloqueado ou Cancelado.
   - **Checkout:** Tipo de checkout utilizado.
   - **Whitelabel:** Se possui personalização de marca.
   - **Condição:** Condição comercial.
   - **Receita:** Faixa de receita.
   - **Tipo de Pagamento:** Forma de pagamento contratada.
   - **Data de Ativação:** Quando o cliente começou a usar.
   - **Data de Vencimento:** Vencimento da fatura.
   - **Dispositivos Oficiais:** Quantidade de números Meta Oficial.
   - **Dispositivos Não-Oficiais:** Quantidade de números Web (uazapi).
   - **Atendentes:** Quantidade de atendentes contratados.
   - **Adicional:** Serviços adicionais contratados.
   - **Valor Última Cobrança:** Valor da fatura mais recente.
4. Clique em **"Salvar"**.

#### Filtros Especiais por Coluna

- Os cabeçalhos das colunas da tabela possuem **popovers de filtro**.
- Clique no cabeçalho de **"Status"** para abrir um popover com multi-seleção (Ativo, Bloqueado, Cancelado).
- Clique no cabeçalho de **"Checkout"** para filtrar por tipo de checkout.
- Clique no cabeçalho de **"Condição"** para filtrar por condição comercial.
- Os filtros mostram **contadores** de quantos registros cada opção possui.
- Múltiplas opções podem ser selecionadas simultaneamente.

#### Importação CSV de Clientes

1. Clique em **"Importar CSV"**.
2. Selecione o arquivo CSV.
3. Mapeie as colunas do CSV para os campos do sistema.
4. Confirme a importação.
5. O sistema criará ou atualizará os registros correspondentes.

---

### 6.3 Produtos

**Rota:** `/products`  
**Permissão:** módulo `produtos`

#### O que é
Catálogo de produtos e serviços oferecidos pela empresa. Utilizado na composição de negócios (vendas) e nas regras de comissão.

#### Passo a passo — Cadastrar Produto

1. Acesse **Clientes & Produtos → Produtos**.
2. Clique em **"+ Novo Produto"**.
3. Preencha:
   - **Nome:** Nome do produto/serviço.
   - **Descrição:** Detalhes do produto.
   - **Preço:** Valor unitário (R$).
   - **Categoria:** Tipo de produto.
   - **Status:** Ativo ou Inativo.
4. Clique em **"Salvar"**.

#### Como os produtos são usados

- **No Pipeline de Vendas:** Ao criar/editar um negócio, você seleciona produtos do catálogo. O sistema calcula automaticamente o valor total com base em quantidade × preço unitário.
- **Nas Regras de Comissão:** Cada regra de comissão é vinculada a um produto específico para calcular o percentual correto.

---

### 6.4 Vendas (Pipeline)

**Rota:** `/vendas`  
**Permissão:** módulo `vendas`

#### O que é
Módulo de CRM de vendas com **Kanban visual** para acompanhar o progresso dos negócios em cada etapa do funil.

#### Abas disponíveis

| Aba | Quem vê | O que mostra |
|-----|---------|-------------|
| **Pipeline** | Admin, Gestor, Consultor | Kanban com todos os negócios do funil selecionado |
| **Lista** | Admin, Gestor, Consultor | Visualização em tabela de todos os negócios |
| **Relatórios** | Admin, Gestor, Consultor | Métricas, ranking e análise de conversão |
| **Meus Negócios** | Todos | Lista filtrada apenas com os negócios do usuário logado |

> **Representantes** veem apenas a aba "Meus Negócios".

#### Passo a passo — Pipeline Kanban

1. Acesse **Clientes & Produtos → Vendas**.
2. A aba **"Pipeline"** é a visão padrão (exceto para representantes).
3. **Selecionar Pipeline:**
   - No topo, você verá botões/tabs com os pipelines disponíveis (ex: "Pipeline Principal", "Pipeline 2").
   - Clique no pipeline desejado.
   - Clique em **"+ Novo Pipeline"** para criar um novo funil.
4. **KPIs do Pipeline:**
   - **Pipeline Total:** Soma dos valores de todos os negócios ativos.
   - **Previsão Mês:** Soma ponderada (valor × probabilidade) dos negócios.
   - **Ganhos (mês):** Total de negócios fechados como ganho no mês corrente.
5. **Colunas do Kanban:**
   - Cada coluna representa uma **etapa do funil** (ex: Prospecção, Qualificado, Proposta Enviada, Em Negociação).
   - Cada coluna mostra o **contador** de negócios e o **valor total**.
6. **Cards dos Negócios:**
   - **Título** do negócio.
   - **Nome do cliente** (se informado).
   - **Valor** em destaque.
   - **Probabilidade** (ex: 50%).
   - **Consultor responsável** com ícone 👤.
   - **Tags** coloridas (ex: "Digital Intelligence").
   - **Data de previsão de fechamento** (se informada).
   - **Badge de origem** (ex: "Digital Intelligence 6/10" para leads da prospecção).
7. **Mover negócios entre etapas:**
   - **Arraste e solte** o card de uma coluna para outra.
   - Ao soltar em "Fechado — Ganho", abrirá o **modal de fechamento** com opção de gerar cobrança e NF.
   - Ao soltar em "Fechado — Perdido", abrirá o **modal de motivo de perda**.
8. **Filtros:**
   - **Busca:** Digite para filtrar por título ou nome do cliente.
   - **Origem:** Filtre por canal de aquisição (Todos, Indicação, Inbound, Digital Intelligence, etc.).
   - **Toggle "Mostrar Fechados":** Mostra/oculta as colunas de Ganho e Perdido.

#### Passo a passo — Criar um Negócio

1. Clique em **"+ Novo Negócio"** (botão verde no topo).
2. O modal de criação tem **3 etapas:**

   **Etapa 1 — Informações Básicas:**
   - **Título:** Nome do negócio (ex: "Proposta Plano Pro - Empresa ABC").
   - **Cliente:** Nome da empresa/pessoa.
   - **Consultor:** Nome do responsável. Para representantes, é preenchido automaticamente.
   - **Origem:** De onde veio a oportunidade (Indicação, Inbound, Outbound, etc.).
   - **Status Inicial:** Em qual etapa do funil o negócio começa.
   - **Tags:** Etiquetas para categorizar. Digite e pressione Enter.
   - Clique em **"Próximo →"**.

   **Etapa 2 — Produtos e Pagamento:**
   - **Adicionar Produtos:**
     - Clique em **"+ Produto"**.
     - Selecione do catálogo (dropdown).
     - Defina quantidade e valor unitário (pré-preenchido do catálogo).
     - O subtotal é calculado automaticamente.
     - Adicione quantos produtos quiser.
   - **Desconto:**
     - Escolha tipo: Percentual (%) ou Valor Fixo (R$).
     - Informe o valor do desconto.
     - O **Valor Líquido** é calculado automaticamente: Total - Desconto.
   - **Forma de Pagamento:** PIX, Boleto, Cartão, Transferência, A definir.
   - **Condição:** À vista, 30 dias, 30/60, 30/60/90, 30/60/90/120.
   - Clique em **"Próximo →"**.

   **Etapa 3 — Fechamento:**
   - **Probabilidade:** Slider de 0% a 100% com cores graduais (vermelho → amarelo → verde).
   - **Data Previsão de Fechamento:** Quando espera fechar o negócio.
   - **Gerar Cobrança:** Toggle — se ativado, ao fechar como ganho, uma cobrança Asaas será criada automaticamente.
   - **Gerar NF:** Toggle — se ativado, ao fechar como ganho, uma nota fiscal será emitida.
   - **Notas:** Observações sobre o negócio.
   - Clique em **"Salvar Negócio"**.

3. O negócio aparecerá na coluna correspondente ao status selecionado.

#### Passo a passo — Visualizar Detalhes (Drawer)

1. Clique em qualquer card no Kanban (ou no ícone 👁 na Lista).
2. O **Drawer lateral** abre com:
   - **Resumo:** Título, status, cliente, valor, probabilidade.
   - **Histórico:** Timeline de todas as alterações, notas e atividades.
   - **Informações do lead:** Para negócios vindos da Inteligência Digital, exibe banner com Score, dores do nicho e botões "Analisar" e "Relatório".
3. Clique no botão **"Editar"** para abrir o modal de edição completa.

#### Passo a passo — Fechar como Ganho

1. Arraste o card para "Fechado — Ganho" OU clique no card e use o botão de ação.
2. O **Modal de Fechamento** exibirá:
   - Resumo do negócio (título, valor, cliente).
   - **☑ Gerar Cobrança:** Se marcado, cria cobrança no Asaas com os dados do negócio.
   - **☑ Gerar NF:** Se marcado, cria nota fiscal com os dados.
3. Clique em **"Confirmar Ganho"**.
4. O status muda para "Fechado — Ganho" com a data de fechamento registrada.

#### Passo a passo — Fechar como Perda

1. Arraste o card para "Fechado — Perdido" OU use o botão de ação.
2. O **Modal de Motivo de Perda** exibirá:
   - **Motivo:** Selecione entre: Preço, Concorrência, Sem budget, Timing, Sem interesse, Outro.
   - **Detalhamento:** Campo de texto livre para mais informações.
3. Clique em **"Confirmar Perda"**.
4. O registro fica no histórico para análise futura.

#### Gerenciamento de Pipelines

1. Clique no ícone ⚙ (engrenagem) ao lado dos nomes dos pipelines.
2. O **Pipeline Manager** permite:
   - **Criar novo pipeline:** Nome, descrição, etapas.
   - **Editar etapas:** Nome, cor, ordem (drag-and-drop).
   - **Remover etapas:** Exceto "Fechado — Ganho" e "Fechado — Perdido" (protegidas).
   - **Configurar:** Moeda, exibir probabilidade, exibir forecast.
   - **Definir padrão:** Marcar qual pipeline é o default.
   - **Excluir pipeline:** Desativa o pipeline (soft delete).

---

### 6.5 Conversas

**Rota:** `/conversas`  
**Permissão:** módulo `mensageria`

#### O que é
Interface de chat omnichannel para atendimento ao cliente, com suporte a múltiplos provedores de WhatsApp (Web/uazapi e Meta Oficial).

#### Layout da Tela

A tela é dividida em **3 colunas:**

| Coluna | Largura | Conteúdo |
|--------|---------|----------|
| **Esquerda** | ~30% | Lista de conversas com filtros |
| **Central** | ~40% | Área de chat (mensagens) |
| **Direita** | ~30% | Painel do contato (dados CRM) |

#### Passo a passo — Navegar nas Conversas

1. Acesse **Clientes & Produtos → Conversas**.
2. Na **coluna esquerda**, visualize a lista de conversas.
3. **Filtros por aba:**
   - 💬 **Caixa de Entrada:** Conversas abertas e pendentes de resposta.
   - 👤 **Fila:** Conversas sem atendente atribuído (esperando direcionamento).
   - 👥 **Grupos:** Conversas de grupo (IDs com `@g.us`).
   - ✅ **Finalizados:** Conversas resolvidas/encerradas.
4. **Buscar:** Use a barra de busca para encontrar conversas por nome do contato.
5. **Clique em uma conversa** para abrir na coluna central.

#### Passo a passo — Enviar Mensagem

1. Selecione uma conversa na lista.
2. Na **área de chat** (coluna central), visualize o histórico de mensagens.
3. Cada mensagem exibe:
   - **Bolha:** Verde (enviada) ou branca (recebida).
   - **Horário:** Timestamp da mensagem.
   - **Status:** ✓ Enviado, ✓✓ Entregue, ✓✓ (azul) Lido.
4. No **campo de texto** na parte inferior:
   - Digite sua mensagem.
   - Pressione **Enter** ou clique no botão de envio.
5. **Nota Interna:**
   - Clique no ícone de **nota** para alternar para modo "nota interna".
   - Notas internas são visíveis apenas pela equipe, nunca enviadas ao cliente.
   - São exibidas com fundo diferenciado na timeline.

#### Passo a passo — Gerenciar Conversa

1. Na conversa aberta, visualize a **barra de ações** no topo:
   - **Atribuir para mim:** Assume a conversa como responsável.
   - **Resolver:** Marca a conversa como encerrada.
   - **Prioridade:** Defina urgência (baixa, média, alta).
2. Na **coluna direita**, visualize o perfil do contato:
   - Nome, telefone, email.
   - Empresa e tags.
   - Link direto para o **CRM** do contato.
   - Histórico de interações anteriores.

#### Atualização em Tempo Real

- As mensagens são atualizadas automaticamente via **WebSocket** (Realtime).
- Novos contadores de mensagens não-lidas aparecem na lista.
- Não é necessário recarregar a página para ver novas mensagens.

---

### 6.6 Mensageria

**Rota:** `/mensageria`  
**Permissão:** módulo `mensageria`

#### O que é
Centro de comando da mensageria com ferramentas de envio, campanhas, lead management e automação de cobrança via WhatsApp.

#### Abas e Funcionalidades

##### A) Caixa de Entrada (Inbox)

1. Interface de chat integrada similar ao Conversas.
2. Suporte a múltiplas instâncias/conexões.
3. Visualize e responda mensagens em tempo real.

##### B) Enviar Mensagens (Composer)

1. Acesse a aba **"Enviar"**.
2. **Selecione a instância/conexão** de origem (dropdown com suas conexões ativas).
3. **Selecione o provedor:** Web (uazapi) ou Meta (API Oficial).
4. **Informe o destinatário:**
   - Digite o número de telefone com DDD (ex: 5511999887766).
   - Ou selecione de uma lista de contatos.
5. **Compose a mensagem:**
   - **Texto:** Digite a mensagem normalmente.
   - **Imagem:** Anexe uma imagem.
   - **Documento:** Anexe um arquivo.
   - **Áudio:** Grave ou anexe áudio.
6. Clique em **"Enviar"**.
7. O status da mensagem aparecerá nos **Logs**.

##### C) Campanhas

1. Acesse a aba **"Campanhas"**.
2. Clique em **"+ Nova Campanha"**.
3. Configure:
   - **Nome da campanha:** Identificação interna.
   - **Mensagem:** Texto com variáveis dinâmicas (ex: `{nome}`).
   - **Lista de destinatários:** Upload de lista ou seleção de contatos.
   - **Agendamento:** Data e horário de envio (ou enviar imediatamente).
   - **Instância:** Conexão WhatsApp a ser utilizada.
4. Clique em **"Iniciar Campanha"**.
5. Acompanhe as métricas:
   - **Enviadas:** Quantas mensagens foram despachadas.
   - **Entregues:** Quantas chegaram ao destino.
   - **Lidas:** Quantas foram abertas (se disponível via Meta).
   - **Erros:** Mensagens que falharam.

##### D) Leads (Kanban)

1. Acesse a aba **"Leads"**.
2. Visualize o **Kanban de Leads** com 4 colunas:
   - **Novo:** Leads recém-chegados via webhook.
   - **Em Atendimento:** Leads com atendimento em andamento.
   - **Qualificado:** Leads qualificados para proposta.
   - **Finalizado:** Leads encerrados.
3. Cada card exibe:
   - Nome do lead (ou número se sem nome).
   - Número de telefone.
   - Status de ticket (se aberto).
   - Tags aplicadas.
4. **Mover leads:** Clique nos botões de ação dentro do card (→ Em Atendimento, → Qualificado, etc.).
5. Os leads são criados automaticamente quando mensagens são recebidas via webhook.

##### E) Contatos (Verificador)

1. Acesse a aba **"Contatos"**.
2. Informe um ou mais números de telefone.
3. Clique em **"Verificar"**.
4. O sistema validará se cada número:
   - Possui conta WhatsApp ativa.
   - Está disponível para receber mensagens.

##### F) Régua de Cobrança por Mensagem

1. Acesse a aba **"Cobrança"**.
2. Configure regras de envio automático de lembretes.
3. **Criar regra:**
   - Defina o dia relativo ao vencimento (ex: D-3, D-1, D+1, D+5).
   - Defina a mensagem com variáveis (ex: "Olá {nome}, sua fatura de R$ {valor} vence em {data}").
   - Selecione a instância de envio.
4. As mensagens são enviadas automaticamente conforme a régua.

##### G) Logs

1. Acesse a aba **"Logs"**.
2. Visualize o histórico completo de todas as mensagens:
   - **Direção:** Enviada ou Recebida.
   - **Conversa ID:** Identificador da conversa.
   - **Conteúdo:** Preview da mensagem.
   - **Status:** Pendente, Enviado, Entregue, Lido, Erro.
   - **Origem:** Canal/instância.
   - **Timestamp:** Data e hora exatas.
3. **Filtros:**
   - Período (de/até).
   - Status (pendente, enviado, entregue, erro).
   - Direção (enviada/recebida).
   - Origem (instância).

---

## 7. Analytics

### 7.1 Dashboard Financeiro

Já detalhado na seção 4.

---

### 7.2 Analytics Avançado

**Rota:** `/analytics`  
**Permissão:** módulo `dashboard`

#### O que é
Visão ampliada de métricas operacionais além do financeiro, incluindo mensageria e vendas.

#### O que você encontra

1. **KPIs de Performance:**
   - Total de mensagens no período.
   - Total de negócios no pipeline.
   - Taxa de conversão (ganhos / total).
   - Tempo médio de fechamento.

2. **Gráfico de Volume de Mensagens:**
   - Tipo: Gráfico de barras por dia/semana.
   - Mostra: Mensagens enviadas vs recebidas ao longo do tempo.
   - Use para identificar picos de atendimento.

3. **Análise de Pipeline:**
   - Gráfico de funil mostrando quantos negócios estão em cada etapa.
   - Identifica gargalos (etapas onde negócios ficam parados).

4. **Comparação entre Períodos:**
   - Compare mês atual vs mês anterior.
   - Identifique tendências de crescimento ou queda.

---

### 7.3 Inteligência Digital

**Rota:** `/intelligence`  
**Permissão:** módulo `intelligence`

#### O que é
Ferramenta de diagnóstico de presença online e prospecção automatizada de leads. Usa web scraping e análise automatizada para gerar insights sobre empresas.

#### Sub-módulos

##### A) Análise Digital — Como Diagnosticar uma Empresa

1. Acesse **Analytics → Inteligência Digital**.
2. Na aba **"Análise"**, preencha o **formulário de busca:**
   - **Nome da empresa** ou **URL do site**.
   - **Tipo de fonte:** Website, Instagram, Google Maps.
3. Clique em **"Analisar"**.
4. O sistema iniciará a análise em módulos:

   **Módulo 1 — Google Business:**
   - Busca a empresa no Google Maps.
   - Exibe: Nome, endereço, telefone, categoria, rating (estrelas), número de avaliações.
   - Score parcial (0-10) baseado em rating e volume de reviews.

   **Módulo 2 — Website:**
   - Usa o Firecrawl para escanear o site.
   - Analisa: Performance, SEO, tecnologias (WordPress, React, etc.), proposta de valor, keywords.
   - Score parcial (0-10) baseado em qualidade técnica e clareza da mensagem.

   **Módulo 3 — Instagram:**
   - Busca o perfil no Instagram.
   - Analisa: Seguidores, seguindo, posts, taxa de engajamento, bio, frequência de postagem.
   - Score parcial (0-10) baseado em autoridade e engajamento.

   **Módulo 4 — Meta Verificação:**
   - Verifica se a empresa possui conta Meta Business verificada.
   - Score parcial (0-10).

   **Módulo 5 — Neuromarketing:**
   - Analisa gatilhos de persuasão no site/redes.
   - Verifica: Prova social, escassez, autoridade, reciprocidade, consistência, afinidade, urgência.
   - Score parcial (0-10) baseado na presença de gatilhos.

   **Módulo 6 — WhatsApp Business:**
   - Verifica presença de botão WhatsApp no site.
   - Analisa: Posicionamento, visibilidade, call-to-action.
   - Score parcial (0-10).

5. **Score Consolidado:**
   - A **Barra de Threshold** exibe o score geral (0-10) com classificação:
     - 0-3: 🔴 Crítico
     - 4-5: 🟡 Atenção
     - 6-7: 🟢 Bom
     - 8-10: 💚 Excelente
   - Comparado com benchmarks do setor.

6. **Autoridade Digital:**
   - Diagnóstico dos 7 Pilares de Autoridade:
     1. Clareza de Nicho e Proposta de Valor
     2. Autoridade e Prova Social
     3. Copy e Escrita Persuasiva
     4. Estética Estratégica
     5. Estrutura de Conversão
     6. Consistência e Estratégia de Conteúdo
     7. Presença Omnichannel
   - Cada pilar recebe nota de 0-10 com observações.

7. **Plano de Resgate:**
   - Recomendações personalizadas geradas por IA para melhorar a presença digital.
   - Ações priorizadas por impacto.

8. **Salvar Análise:**
   - Clique em **"💾 Salvar"** para registrar no banco de dados.
   - A análise ficará disponível no **Histórico**.

9. **Exportar Relatório:**
   - Clique em **"📄 Exportar HTML"**.
   - Um relatório standalone em HTML será gerado e baixado.
   - O relatório pode ser enviado diretamente ao cliente analisado.

##### B) Prospecção de Leads — Como Prospectar

1. Acesse a aba **"Prospecção"**.
2. Preencha:
   - **Nicho:** Selecione o segmento (ex: Escolas, Clínicas, Pet Shops, Restaurantes).
   - **Cidade:** Informe a cidade de busca.
3. Clique em **"🔍 Prospectar"**.
4. O sistema usará Google Maps para buscar empresas do nicho na cidade.
5. **Banner de Contexto de Nicho** aparecerá com:
   - Dores comuns do segmento.
   - Abordagens sugeridas para qualificação.
   - Perguntas-chave para o primeiro contato.
6. **Cards de Lead** exibirão:
   - **Nome da empresa.**
   - **Score de Oportunidade** (0-10) com badge colorido.
   - **Categoria** do Google Maps.
   - **Rating** (estrelas) e **número de avaliações**.
   - **Telefone** (se disponível).
   - **Site** (se disponível).

7. **Ações por Lead:**

   **Enviar para CRM (botão verde "+" ):**
   1. Clique em **"+ Enviar para CRM"**.
   2. Um mini-popover aparecerá com:
      - **Etapa:** Selecione em qual estágio do pipeline o lead entrará (Prospecção, Qualificado, Proposta, Negociação).
      - **Valor Estimado:** Informe o valor potencial do negócio.
   3. Clique em **"Confirmar"**.
   4. O negócio será criado no pipeline com:
      - Origem: "Digital Intelligence".
      - Tags: ["Digital Intelligence"].
      - Score Digital registrado nas notas.
      - Pipeline: Vinculado automaticamente ao pipeline padrão.
   5. Um toast de sucesso aparecerá com botão **"Ver no CRM"** para navegar direto ao card.

   **Analisar (ícone 🔍):**
   - Inicia um diagnóstico completo da empresa usando a URL do site.
   - Segue o mesmo fluxo descrito na seção "Análise Digital".

   **Relatório (ícone 📄):**
   - Gera um relatório HTML standalone com os dados do lead.
   - Ideal para enviar ao cliente como "presente" de qualificação.

8. **Histórico de Campanhas:**
   - Clique no ícone de **relógio** (🕐) no topo.
   - Visualize todas as buscas anteriores com data, nicho, cidade e contagem de leads.
   - Clique em qualquer campanha para **recarregar** os resultados sem precisar buscar novamente.

---

### 7.4 Relatórios

**Rota:** `/reports`  
**Permissão:** módulo `relatorios`

#### O que é
Geração de relatórios consolidados para análise gerencial e tomada de decisão.

#### Funcionalidades

1. **Relatórios Financeiros:**
   - DRE simplificado (Demonstrativo de Resultado).
   - Fluxo de Caixa.
   - Análise de margem por período.

2. **Exportação:**
   - **PDF:** Relatório formatado para impressão/envio.
   - **CSV:** Dados brutos para análise em planilha.

3. **Filtros:**
   - Período (mensal, trimestral, anual).
   - Categorias específicas.
   - Comparação entre períodos.

---

## 8. Sistema

### 8.1 Usuários

**Rota:** `/usuarios`  
**Permissão:** módulo `usuarios`

#### O que é
Gestão dos membros da equipe dentro do tenant (empresa).

#### Passo a passo — Convidar/Gerenciar Usuário

1. Acesse **Sistema → Usuários**.
2. Visualize a lista de usuários do tenant com: Nome, Email, Papel, Status.
3. **Para alterar o papel de um usuário:**
   - Clique no registro do usuário.
   - Selecione o novo papel no dropdown (Admin, Gestor, Consultor, Representante, Financeiro).
   - Confirme a alteração.
4. **Permissões Customizadas:**
   - Para casos especiais onde o papel padrão não é suficiente.
   - Acesse as permissões do usuário.
   - Para cada módulo, ative/desative individualmente: Ver, Criar, Editar, Excluir, Exportar.
   - As permissões customizadas **sobrescrevem** a matriz padrão do papel.

---

### 8.2 Conexões WhatsApp

**Rota:** `/wa-connections`  
**Permissão:** módulo `mensageria`

#### O que é
Gestão unificada de todas as conexões de WhatsApp — tanto Web (uazapi) quanto Meta API Oficial.

#### Passo a passo — Conectar WhatsApp Web (uazapi)

1. Acesse **Sistema → Conexões WA**.
2. Na seção **"Conexões Web"**, clique em **"+ Nova Conexão Web"**.
3. O sistema verificará o **limite de licença** (dispositivos web contratados vs usados).
4. Se dentro do limite, um **QR Code** será exibido.
5. No seu celular:
   - Abra o WhatsApp.
   - Acesse **Configurações → Aparelhos Conectados → Conectar Aparelho**.
   - Escaneie o QR Code exibido na tela.
6. Após escaneio, o status mudará para **"Conectado"** (verde).
7. O webhook será configurado automaticamente para receber mensagens.

#### Passo a passo — Conectar Meta API Oficial

1. Na seção **"Conexões Meta Oficial"**, clique em **"+ Nova Conexão Meta"**.
2. O sistema verificará o **limite de licença** (dispositivos Meta contratados vs usados).
3. Preencha os campos:
   - **App ID:** ID do seu aplicativo Meta (obtido em developers.facebook.com).
   - **App Secret:** Chave secreta do aplicativo.
   - **Access Token:** Token de acesso permanente.
   - **WABA ID:** ID da conta WhatsApp Business.
   - **Phone Number ID:** ID do número de telefone.
   - **Display:** Nome de exibição do número.
   - **Config ID:** ID de configuração do webhook.
4. Clique em **"Salvar"**.
5. O sistema gerará automaticamente um **Verify Token** para configuração do webhook no Meta.
6. Configure o webhook no Facebook Developers com:
   - **URL:** URL do endpoint de webhook fornecida pelo sistema.
   - **Verify Token:** Token exibido na interface.
7. Após configuração, o status do webhook mudará para "Configurado" ✅.

#### Monitoramento de Conexões

- Cada conexão exibe um **card de status:**
  - 🟢 **Conectado:** Ativo e recebendo/enviando mensagens.
  - 🟡 **Reconectando:** Tentando restabelecer conexão.
  - 🔴 **Desconectado:** Sem conexão ativa.
- O sistema verifica o status periodicamente via API.

---

### 8.3 Integrações

**Rota:** `/integracoes`  
**Permissão:** módulo `mensageria`

#### O que é
Central de gerenciamento de todas as integrações com serviços externos.

#### Integrações Disponíveis

- **Asaas:** Gateway de pagamentos (configuração de API key e ambiente).
- **uazapi:** Provedor de WhatsApp Web.
- **Meta Business:** API Oficial do WhatsApp.
- **Firecrawl:** Web scraping para Inteligência Digital.

---

### 8.4 Assinatura

**Rota:** `/assinatura`  
**Acessível a:** Todos os usuários autenticados

#### O que é
Visualização do plano contratado, limites de uso e status da licença.

#### O que você encontra

1. **Resumo do Plano:**
   - Nome do plano (Básico, Profissional).
   - Status: Ativo, Suspenso, Expirado.
   - Data de início e expiração.
   - Ciclo: Mensal ou Anual.
   - Valor mensal.

2. **Limites de Uso (com barras de progresso):**

   | Recurso | Exemplo |
   |---------|---------|
   | Dispositivos Web | 2 de 3 usados (67%) |
   | Dispositivos Meta | 1 de 2 usados (50%) |
   | Atendentes | 4 de 5 usados (80%) |
   | Usuários | 3 de 10 usados (30%) |

   - Barras verdes: Abaixo de 70% de uso.
   - Barras amarelas: Entre 70-90%.
   - Barras vermelhas: Acima de 90%.

3. **Add-ons Ativos:**
   - ☑/☐ Módulo de IA (com limite de agentes).
   - ☑/☐ Integração Facilite (com plano e horas mensais).
   - ☑/☐ Implantação Starter.

4. **Alertas:**
   - **Banner amarelo:** Licença expira em menos de 30 dias.
   - **Banner vermelho:** Licença suspensa ou expirada.

---

### 8.5 Configurações

**Rota:** `/settings`  
**Permissão:** módulo `configuracoes`

#### O que é
Central de configurações da plataforma, incluindo gestão de empresas, integrações de checkout, layout e funis de vendas.

#### Seções

##### A) Integrações de Checkout

1. Na seção **"Integrações de Checkout"**, visualize os **6 provedores** disponíveis:
   - 💳 **Asaas** — Plataforma brasileira com Split e Dunning nativos.
   - 💜 **Stripe** — Padrão global com Elements e Payment Links.
   - 🤝 **Mercado Pago** — Maior capilaridade LatAm.
   - 🟢 **Pagar.me** — Especializado em B2B e Split flexível.
   - 🟠 **Iugu** — Foco em recorrência SaaS.
   - 🔵 **PayPal** — Checkout global.
2. Cada provedor exibe:
   - Status: **Ativo** (verde) ou **Inativo** (cinza).
   - País de origem.
   - Métodos de pagamento suportados (Pix, Boleto, Cartão, etc.).
   - Modelos de integração (Payment Link, Drop-in UI, Redirect, API Direta).
3. **Para configurar um provedor:**
   - Clique em **"⚙ Configurar"**.
   - O dialog de configuração possui **3 abas:**

   **Aba "Credenciais":**
   - **Ambiente:** Sandbox (testes) ou Produção (real).
   - **API Key:** Cole sua chave de API (campo com máscara de segurança — ícone 👁 para mostrar/ocultar).
   - **Secret Key:** Cole sua chave secreta.

   **Aba "Webhook":**
   - **URL do Webhook:** Gerada automaticamente pelo sistema. Copie e configure no painel do provedor.
   - **Secret do Webhook:** Para validação de assinatura.
   - Botão **"📋 Copiar URL"** para facilitar.

   **Aba "Opções":**
   - **Modelo de Integração:** Selecione entre Payment Link, Drop-in UI, Redirect ou API Direta.
   - **☑ Ativo:** Toggle para ativar/desativar o provedor.

4. Clique em **"Salvar Configuração"**.
5. Clique em **"🔌 Testar Conexão"** para validar as credenciais.
6. Se o teste for bem-sucedido, o status mudará para **"Conectado"** (verde).

##### B) Aparência do Menu (Sidebar)

1. Na seção **"Aparência do Menu"**, configure:
   - **Layout:**
     - **Grouped Cards:** Grupos como cards visuais (padrão).
     - **Dual Rail:** Rail de ícones + painel contextual.
     - **Spotlight:** Busca ⌘K + acordeão + ações rápidas.
     - **Personalizado:** Você decide tudo.
   - **Densidade:** Default, Compacto, Confortável.
   - **Largura:** Default, Estreita, Larga.
   - **Opções (toggles):**
     - ☑ Mostrar labels dos itens.
     - ☑ Mostrar Quick Actions.
     - ☑ Highlight do item ativo.
     - ☑ Atalhos de teclado.
     - ☑ Colapsar ao navegar (mobile).
   - **Quick Actions:** Selecione até 3 itens para acesso rápido no topo do menu.
2. As alterações são aplicadas **imediatamente** — sem necessidade de salvar.
3. Clique em **"Resetar Padrão"** para voltar às configurações originais.

##### C) Configuração de Funil de Vendas

1. Na seção **"Funil de Vendas"**, gerencie todos os pipelines.
2. Cada pipeline exibe: Nome, número de etapas, status (ativo/inativo).
3. **Para editar um pipeline:**
   - Clique em **"Editar"**.
   - **Renomear:** Altere o nome e a descrição.
   - **Etapas:**
     - Arraste para **reordenar** as etapas.
     - Clique na **cor** para personalizar.
     - Clique no ícone de edição para renomear.
     - **Adicione** novas etapas clicando em **"+ Etapa"**.
     - **Remova** etapas (exceto "Ganho" e "Perdido" que são protegidas).
   - **Configurações:**
     - ☑ Exibir probabilidade nos cards.
     - ☑ Exibir forecast no topo.
     - Prefixo de moeda (ex: R$, US$, €).
   - Clique em **"Salvar"**.
4. **Para criar um novo pipeline:**
   - Clique em **"+ Novo Pipeline"**.
   - Defina nome e etapas.
   - O pipeline vem com etapas padrão que podem ser personalizadas.
5. **Para excluir um pipeline:**
   - Clique em **"Excluir"** (o pipeline será desativado, não removido permanentemente).

##### D) Gestão de Empresas (Multi-Tenancy)

1. Na seção **"Empresas"**, visualize os tenants aos quais você pertence.
2. **Para criar um novo tenant:**
   - Clique em **"+ Nova Empresa"**.
   - Informe o nome.
   - O slug (identificador) é gerado automaticamente.
   - Clique em **"Criar"**.
3. **Para definir empresa padrão:**
   - Clique no ícone ⭐ ao lado da empresa desejada.
   - Todos os dados do sistema passarão a ser filtrados por essa empresa.
   - Um evento `tenant-changed` é disparado, atualizando todos os componentes.
4. **Para editar uma empresa:**
   - Clique no ícone de edição.
   - Altere nome, slug ou CNPJ.
   - Clique em **"Salvar"**.
5. **Regra:** A empresa padrão não pode ser excluída enquanto estiver marcada como padrão.

---

## 9. Portal SuperAdmin

**Rota:** `/superadmin`  
**Acesso:** Exclusivo para usuários com papel `superadmin`

#### O que é
Painel administrativo global para gestão de **todos os tenants** (empresas) da plataforma, licenças e auditoria.

#### 9.1 Dashboard Global

1. Acesse **SuperAdmin → Dashboard**.
2. Visualize:
   - **MRR Total:** Soma dos valores mensais de todas as licenças ativas.
   - **Tenants Ativos:** Contagem de empresas em operação.
   - **Alertas de Vencimento:** Licenças que expiram nos próximos 30 dias.
   - **Gráfico de Distribuição de Planos:** Pizza/rosca mostrando quantos tenants usam cada plano.

#### 9.2 Gestão de Tenants

1. Acesse **SuperAdmin → Tenants**.
2. Visualize a lista completa de empresas com: Nome, Slug, CNPJ, Status, Plano, MRR.
3. **Para criar um novo tenant:**
   - Clique em **"+ Novo Tenant"**.
   - Preencha: Nome, CNPJ, Email do administrador.
   - O sistema gera automaticamente o slug e a license key.
   - Clique em **"Criar"**.
4. **Para editar:**
   - Clique no tenant desejado.
   - Altere dados conforme necessário.
   - Clique em **"Salvar"**.
5. **Para alterar status:**
   - **Ativar:** Libera acesso ao sistema.
   - **Suspender:** Bloqueia acesso temporariamente (dados preservados).
   - **Cancelar:** Desativa permanentemente.
6. **Filtros:** Por status (Ativo, Suspenso, Cancelado) e por plano.

#### 9.3 Licenças — Como Configurar

1. Acesse **SuperAdmin → Licenças**.
2. Selecione o tenant que deseja configurar.
3. Configure **cada aspecto** da licença:

   **Plano Base:**
   - Básico ou Profissional.
   - Cada plano tem limites default que podem ser personalizados.

   **Dispositivos:**
   - **Web (Base):** Número de conexões WhatsApp Web incluídas.
   - **Web (Extra):** Conexões adicionais (cobradas separadamente).
   - **Meta (Base):** Número de conexões Meta API incluídas.
   - **Meta (Extra):** Conexões Meta adicionais.

   **Atendentes:**
   - **Base:** Número de atendentes incluídos no plano.
   - **Extra:** Atendentes adicionais.

   **Módulo de IA:**
   - **Ativo/Inativo:** Toggle.
   - **Limite de Agentes:** Número máximo de agentes IA permitidos.

   **Integração Facilite:**
   - **Plano:** Nenhum, Básico, Intermediário ou Avançado.
   - **Horas Mensais:** Quantidade de horas incluídas.

   **Implantação Starter:**
   - **Ativo/Inativo:** Toggle para serviço de implantação inicial.

   **Financeiro:**
   - **Valor Mensal (R$):** Atualizado automaticamente conforme add-ons.
   - **Ciclo de Cobrança:** Mensal ou Anual.
   - **Data de Expiração:** Quando a licença expira.

4. O **MRR é recalculado em tempo real** conforme você altera os add-ons.
5. Clique em **"Salvar Licença"**.
6. Um registro é criado automaticamente no **Histórico de Licenças** com: plano anterior, novo plano, alterações feitas e quem alterou.

#### 9.4 Audit Log — Compliance LGPD

1. Acesse **SuperAdmin → Audit Log**.
2. Visualize o registro imutável de todas as ações na plataforma:

   | Campo | Descrição |
   |-------|-----------|
   | **Data/Hora** | Timestamp exato da ação |
   | **Ator** | ID do usuário que realizou a ação |
   | **Papel** | Papel do ator no momento da ação |
   | **Ação** | O que foi feito (ex: "create_tenant", "update_license") |
   | **Recurso** | Tipo de recurso afetado (ex: "tenant", "license") |
   | **Tenant** | Empresa onde a ação ocorreu |
   | **IP** | Endereço IP de origem |
   | **Metadados** | JSON com detalhes adicionais |

3. **Filtros:**
   - Por ação (create, update, delete, login, etc.).
   - Por tenant.
   - Por período.
4. **Exportar CSV:**
   - Clique em **"📥 Exportar CSV"** para gerar arquivo para compliance.
   - Todos os campos são incluídos na exportação.
5. **Importante:** Os registros de auditoria são **imutáveis** — não podem ser editados ou excluídos por ninguém, garantindo conformidade com a LGPD.

#### 9.5 Configurações Globais

1. Acesse **SuperAdmin → Configurações**.
2. Gerencie parâmetros globais da plataforma:
   - Feature flags (habilitar/desabilitar funcionalidades para todos os tenants).
   - Configurações de ambiente.
   - Parâmetros de integração global.

---

## 10. Multi-Tenancy — Como Funciona

### Conceito
Cada empresa (tenant) opera como se tivesse sua **própria instalação** do sistema. Os dados são completamente isolados — nenhuma empresa pode ver dados de outra.

### Como o Isolamento é Garantido

1. **Coluna `tenant_id`:** Toda tabela operacional possui uma coluna `tenant_id` que identifica a qual empresa o registro pertence.
2. **RLS (Row Level Security):** Políticas automáticas no banco de dados que filtram dados por tenant antes de qualquer consulta chegar ao aplicativo. Mesmo que houvesse um bug no código, o banco de dados impediria acesso indevido.
3. **Função `get_my_tenant_ids()`:** Retorna todos os tenants aos quais o usuário logado pertence. Usada nas políticas RLS.
4. **Tabela `user_tenants`:** Associação N:N — um usuário pode pertencer a múltiplos tenants.

### Passo a passo — Trocar de Empresa

1. Acesse **Sistema → Configurações**.
2. Na seção **"Empresas"**, visualize todos os seus tenants.
3. Clique no ícone **⭐ (estrela)** ao lado da empresa para a qual deseja trocar.
4. A estrela ficará amarela indicando que é a empresa padrão.
5. **Todos os módulos** serão automaticamente filtrados para mostrar dados dessa empresa.
6. O evento global `tenant-changed` notifica todos os componentes para recarregar dados.
7. A preferência é salva no navegador — ao relogar, a mesma empresa será selecionada.

### Regras Importantes

- A empresa padrão **não pode ser excluída** enquanto estiver marcada.
- Ao criar um novo registro (receita, despesa, negócio, etc.), o `tenant_id` é preenchido automaticamente com a empresa padrão.
- SuperAdmins podem visualizar dados de todos os tenants via o Portal SuperAdmin.

---

## 11. Permissões e Papéis (RBAC)

### Matriz Completa de Permissões

Cada módulo possui 5 ações possíveis: **Ver** (view), **Criar** (create), **Editar** (edit), **Excluir** (delete), **Exportar** (export).

| Módulo | SuperAdmin | Admin | Gestor | Consultor | Representante | Financeiro |
|--------|:----------:|:-----:|:------:|:---------:|:-------------:|:----------:|
| Dashboard | ✅ Todas | ✅ Todas | 👁+📤 Ver/Exportar | 👁 Somente Ver | 👁 Somente Ver | 👁+📤 Ver/Exportar |
| Vendas | ✅ Todas | ✅ Todas | CRUD (sem excluir) | Ver+Criar+Editar | Ver+Criar+Editar | 👁+📤 Ver/Exportar |
| Cobranças | ✅ Todas | ✅ Todas | CRUD (sem excluir) | 👁 Somente Ver | ❌ Sem acesso | CRUD (sem excluir) |
| Comissões | ✅ Todas | ✅ Todas | CRUD (sem excluir) | 👁 Somente Ver | 👁 Somente Ver | 👁+📤 Ver/Exportar |
| Receitas | ✅ Todas | ✅ Todas | CRUD (sem excluir) | 👁 Somente Ver | ❌ Sem acesso | CRUD (sem excluir) |
| Despesas | ✅ Todas | ✅ Todas | CRUD (sem excluir) | ❌ Sem acesso | ❌ Sem acesso | CRUD (sem excluir) |
| Clientes | ✅ Todas | ✅ Todas | CRUD (sem excluir) | Ver+Criar+Editar | Ver+Criar | 👁 Somente Ver |
| Produtos | ✅ Todas | ✅ Todas | CRUD (sem excluir) | 👁 Somente Ver | 👁 Somente Ver | 👁 Somente Ver |
| Fiscal | ✅ Todas | ✅ Todas | 👁+📤 Ver/Exportar | ❌ Sem acesso | ❌ Sem acesso | CRUD (sem excluir) |
| Intelligence | ✅ Todas | ✅ Todas | 👁+📤 Ver/Exportar | 👁 Somente Ver | ❌ Sem acesso | 👁+📤 Ver/Exportar |
| Relatórios | ✅ Todas | ✅ Todas | 👁+📤 Ver/Exportar | 👁+📤 Ver/Exportar | 👁 Somente Ver | 👁+📤 Ver/Exportar |
| Configurações | ✅ Todas | ✅ Todas | ❌ Sem acesso | ❌ Sem acesso | ❌ Sem acesso | ❌ Sem acesso |
| Usuários | ✅ Todas | ✅ Todas | Ver+Criar+Editar | ❌ Sem acesso | ❌ Sem acesso | ❌ Sem acesso |
| Inserir Dados | ✅ Todas | ✅ Todas | Ver+Criar+Editar | ❌ Sem acesso | Ver+Criar | Ver+Criar |
| Mensageria | ✅ Todas | ✅ Todas | CRUD (sem excluir) | 👁 Somente Ver | ❌ Sem acesso | 👁 Somente Ver |

### Permissões Customizadas

Para situações onde o papel padrão não atende:

1. Acesse **Sistema → Usuários**.
2. Selecione o usuário.
3. Clique em **"Permissões Customizadas"**.
4. Para cada módulo, ative/desative individualmente cada ação.
5. As permissões customizadas **sobrescrevem** a matriz padrão do papel.
6. As customizações são armazenadas no campo `custom_permissions` do perfil do usuário.

---

## 12. Atalhos e Produtividade

### Command Palette (Paleta de Comandos)

- **Atalho:** `Ctrl + K` (Windows/Linux) ou `Cmd + K` (Mac).
- **O que faz:** Abre uma barra de busca flutuante para navegação rápida.
- **Como usar:**
  1. Pressione o atalho.
  2. Digite o nome do módulo (ex: "receitas", "vendas", "fiscal").
  3. Os resultados aparecem em tempo real.
  4. Use setas ↑↓ para navegar e Enter para selecionar.
  5. Pressione `Esc` para fechar.

### Temas

- **Escuro (Dark):** Tema padrão da plataforma, otimizado para uso prolongado.
- **Claro (Light):** Alternativa para ambientes com muita luminosidade.
- **Como alternar:**
  - Clique no ícone de **sol/lua** (🌙/☀️) no header da aplicação.
  - Ou acesse Configurações → Aparência do Menu.

### Sidebar (Menu Lateral)

- **Colapsar/Expandir:** Clique no ícone de toggle na parte inferior do menu.
- **Quick Actions:** Até 3 ações fixas no topo para acesso instantâneo (configurável em Configurações).
- **Highlight Ativo:** O item do menu correspondente à página atual é destacado com cor primária e borda lateral.
- **Notificações no Menu:**
  - O item "Vendas" exibe um badge com a contagem de negócios em "Proposta" e "Negociação".
  - Outros itens podem exibir contadores conforme atividade.

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| **MRR** | Monthly Recurring Revenue — Receita Recorrente Mensal. Soma das assinaturas ativas. |
| **Churn** | Taxa de cancelamento de clientes em um período. |
| **Churn Rate** | Percentual: `clientes perdidos / total clientes × 100`. |
| **Tenant** | Empresa/organização isolada dentro do sistema multi-tenant. |
| **RLS** | Row Level Security — Segurança a nível de linha no banco de dados que impede acesso entre tenants. |
| **Pipeline** | Funil de vendas com etapas configuráveis onde negócios progridem visualmente. |
| **Kanban** | Método visual de gestão onde cards se movem entre colunas representando etapas. |
| **Dunning** | Régua de cobrança automatizada para cobranças em atraso. |
| **Split** | Divisão automática de um pagamento entre múltiplos recebedores (ex: empresa + vendedor). |
| **LGPD** | Lei Geral de Proteção de Dados — legislação brasileira de proteção de dados pessoais. |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica — documento fiscal para prestação de serviços. |
| **NF-e** | Nota Fiscal Eletrônica — documento fiscal para venda de mercadorias. |
| **WABA** | WhatsApp Business Account — conta empresarial verificada do WhatsApp via Meta. |
| **uazapi** | Provedor de WhatsApp Web (não-oficial) usado para conexões via QR Code. |
| **RBAC** | Role-Based Access Control — Controle de acesso baseado em papéis. |
| **Webhook** | Notificação HTTP automática enviada por um sistema quando um evento ocorre. |
| **Gateway** | Serviço intermediário que processa pagamentos (ex: Asaas, Stripe). |
| **Forecast** | Previsão de receita baseada em probabilidade × valor dos negócios no pipeline. |
| **Facilite** | Módulo integrado de suporte/help desk com horas mensais contratadas. |
| **Drop-in UI** | Componentes visuais pré-construídos de um provedor de pagamento que são incorporados no seu site. |
| **Payment Link** | Link único gerado via API que leva o cliente para uma página de pagamento. |
| **CSP** | Custo de Prestação de Serviço (equivalente a COGS — Cost of Goods Sold). |
| **Burn Rate** | Velocidade com que a empresa gasta seu caixa. |
| **Take Rate** | Percentual retido pela plataforma em cada transação processada. |

---

> **Whatsflow Finance** © 2026 — Todos os direitos reservados.  
> Manual gerado automaticamente. Versão 2.0 — Março de 2026.
