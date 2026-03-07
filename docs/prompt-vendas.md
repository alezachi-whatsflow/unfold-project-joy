# PROMPT COMPLETO — Whatsflow Finance: Módulo de Vendas
> Inspirado no HubSpot Sales Hub. Envie **uma fase por vez** no Lovable.
> Aguarde confirmação antes de enviar a próxima.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 1 — ESTRUTURA BASE + MENU + TIPOS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Criar os tipos, a estrutura de dados e a entrada no menu lateral para o módulo de Vendas.

## 1.1 — Menu Lateral

No grupo **PRINCIPAL** da sidebar, adicionar o item **"Vendas"** logo após "Dashboard":

```
PRINCIPAL
  - Dashboard
  - Vendas      ← NOVO (ícone: TrendingUp ou ShoppingCart do Lucide)
  - Cobranças
```

- Rota: `/vendas`
- Badge dinâmico: exibir contagem de negócios em status "Em negociação" ou "Proposta enviada"
- Permissão: visível para admin, gestor, financeiro e consultor (oculto para representante externo — ele acessa via /vendas/meus-negocios)

## 1.2 — Tipos e Estrutura de Dados

Criar `src/types/vendas.ts`:

```typescript
export type NegocioStatus =
  | 'prospeccao'       // Prospecção
  | 'qualificado'      // Qualificado
  | 'proposta'         // Proposta Enviada
  | 'negociacao'       // Em Negociação
  | 'fechado_ganho'    // Fechado — Ganho ✅
  | 'fechado_perdido'; // Fechado — Perdido ❌

export type NegocioOrigem =
  | 'indicacao'
  | 'outbound'
  | 'inbound'
  | 'representante'
  | 'renovacao'
  | 'upsell';

export interface Negocio {
  id: string;
  titulo: string;
  status: NegocioStatus;
  origem: NegocioOrigem;

  // Relacionamentos (IDs referenciando entidades já existentes no projeto)
  clienteId: string;           // → módulo Clientes
  consultorId: string;         // → módulo Usuários (role: consultor ou representante)
  produtos: NegocioProduto[];  // → módulo Produtos

  // Valores
  valorTotal: number;
  desconto: number;            // % ou R$
  valorLiquido: number;        // calculado

  // Datas
  dataCriacao: Date;
  dataPrevisaoFechamento: Date;
  dataFechamento?: Date;

  // Integração fiscal
  gerarNF: boolean;            // → módulo Fiscal
  nfEmitidaId?: string;

  // Integração cobrança
  gerarCobranca: boolean;      // → módulo Cobranças
  cobrancaId?: string;
  formaPagamento: 'boleto' | 'pix' | 'cartao' | 'transferencia' | 'a_definir';
  condicaoPagamento: string;   // Ex: "30/60/90 dias", "À vista"

  // Metadados
  probabilidade: number;       // 0–100%
  notas: string;
  tags: string[];
  historico: HistoricoItem[];
}

export interface NegocioProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  valorTotal: number;
}

export interface HistoricoItem {
  id: string;
  data: Date;
  tipo: 'nota' | 'email' | 'ligacao' | 'reuniao' | 'status_change' | 'proposta';
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
}
```

## 1.3 — Constantes de Status

```typescript
export const NEGOCIO_STATUS_CONFIG = {
  prospeccao:      { label: 'Prospecção',        color: '#60a5fa', ordem: 1 },
  qualificado:     { label: 'Qualificado',        color: '#a78bfa', ordem: 2 },
  proposta:        { label: 'Proposta Enviada',   color: '#f59e0b', ordem: 3 },
  negociacao:      { label: 'Em Negociação',      color: '#fb923c', ordem: 4 },
  fechado_ganho:   { label: 'Fechado — Ganho',    color: '#4ade80', ordem: 5 },
  fechado_perdido: { label: 'Fechado — Perdido',  color: '#f87171', ordem: 6 },
};
```

## 1.4 — Página Base com 4 Abas

Criar `src/pages/VendasPage.tsx` com as abas:
1. `Pipeline` — visão kanban dos negócios
2. `Lista` — tabela com filtros avançados
3. `Relatórios` — métricas e gráficos
4. `Meus Negócios` — visão filtrada pelo consultor/representante logado

Estado inicial: placeholders com título e ícone em cada aba.

## 1.5 — Resultado esperado desta fase
- ✅ Item "Vendas" no menu com badge dinâmico
- ✅ Rota /vendas funcionando
- ✅ Tipos e constantes criados
- ✅ Página com 4 abas navegáveis

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 2 — ABA PIPELINE (KANBAN DE NEGÓCIOS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Implementar o pipeline visual estilo kanban com as colunas de status e cards de negócios.

## 2.1 — Layout Kanban

Linha de colunas horizontais com scroll, uma por status:

```
[ Prospecção ] [ Qualificado ] [ Proposta Enviada ] [ Em Negociação ] [ Fechado Ganho ] [ Fechado Perdido ]
```

**Header de cada coluna:**
- Nome do status com cor correspondente (bullet colorido)
- Quantidade de negócios na coluna
- Valor total dos negócios (ex: R$ 45.000)
- Botão "+" para adicionar negócio diretamente nessa coluna

**Card de negócio:**
- Título do negócio
- Nome do cliente (com avatar/inicial)
- Valor líquido em destaque (R$)
- Avatar + nome do consultor responsável
- Data prevista de fechamento (vermelha se vencida)
- Barra de probabilidade (%) — colorida por faixa:
  - < 30% → vermelha
  - 30–70% → âmbar
  - > 70% → verde
- Tags (chips pequenos)
- Ícones de ação rápida no hover: 👁️ Ver / ✏️ Editar / ➡️ Avançar status

**Interação:**
- Drag-and-drop entre colunas para mudar status (registrar no histórico automaticamente)
- Clicar no card → abre drawer lateral com detalhes completos

## 2.2 — Barra Superior do Pipeline

- Input de busca (filtrar por título, cliente ou consultor)
- Filtro por Consultor (select com lista de usuários)
- Filtro por Período (date range)
- Filtro por Origem
- Toggle: "Exibir fechados" (ocultar Fechado Ganho/Perdido por padrão)
- Botão **"+ Novo Negócio"** — abre modal de criação

## 2.3 — Cards de Resumo Acima do Kanban

4 cards de métricas em linha:
| Card | Dado |
|------|------|
| 💰 Pipeline Total | Soma de todos os negócios ativos em R$ |
| 🎯 Previsão Mês | Soma dos negócios com fechamento no mês atual |
| ✅ Ganhos (mês) | Valor total fechado como ganho no mês |
| 📊 Taxa de Conversão | % de fechados ganhos sobre total fechados |

## 2.4 — Resultado esperado desta fase
- ✅ Kanban com 6 colunas e scroll horizontal
- ✅ Cards de negócio com todas as informações
- ✅ Drag-and-drop funcional entre colunas
- ✅ Filtros e busca na barra superior
- ✅ 4 cards de métricas acima do kanban
- ✅ Botão "+ Novo Negócio" visível

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 3 — MODAL DE CRIAÇÃO E DRAWER DE DETALHES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Implementar o modal de criação de negócio em steps e o drawer de detalhes completo.

## 3.1 — Modal de Criação: "+ Novo Negócio" (4 steps)

**Step 1 — Identificação:**
- Título do negócio (obrigatório)
- Cliente: buscar cliente já cadastrado (autocomplete do módulo Clientes) ou "+ Novo Cliente" inline
- Consultor responsável: select com usuários de role consultor ou representante
- Origem: select (Indicação / Outbound / Inbound / Representante / Renovação / Upsell)
- Status inicial: select (padrão: Prospecção)
- Tags: input com chips (pressionar Enter para adicionar)

**Step 2 — Produtos e Valores:**
- Lista de produtos com autocomplete do módulo Produtos
  - Cada item: Produto (autocomplete), Qtd, Valor unitário, Desconto (%), Valor total (calculado)
  - Botão "+ Adicionar Produto"
- Resumo financeiro:
  - Subtotal
  - Desconto geral (% ou R$, toggle)
  - **Valor Líquido Total** (destaque)
- Condição de pagamento: select + campo livre (ex: "30/60/90 dias", "À vista")
- Forma de pagamento: Boleto / PIX / Cartão / Transferência / A definir

**Step 3 — Previsão e Probabilidade:**
- Data prevista de fechamento (date picker)
- Probabilidade de fechamento: slider 0–100% com cor dinâmica
- Notas iniciais (textarea)
- Gerar cobrança automaticamente ao fechar: toggle (padrão: Sim)
- Emitir NF automaticamente ao fechar: toggle (padrão: Sim)

**Step 4 — Revisão:**
- Resumo completo de todos os campos preenchidos
- Botão "Criar Negócio" com loading state
- Toast de confirmação: "✅ Negócio criado com sucesso"

## 3.2 — Drawer de Detalhes do Negócio

Painel lateral (drawer) que abre ao clicar em qualquer card do kanban.
Largura: 480px. Fecha com ESC ou clicando fora.

**Header do drawer:**
- Título do negócio (editável inline — clique para editar)
- Badge de status com cor (clicável para mudar status)
- Botões: ✏️ Editar completo / 🗑️ Excluir / ✕ Fechar

**Seção: Resumo Financeiro**
- Valor líquido em destaque grande
- Produtos listados com quantidades e valores
- Forma e condição de pagamento

**Seção: Informações do Negócio**
- Cliente (link para abrir ficha do cliente)
- Consultor responsável (avatar + nome)
- Origem
- Probabilidade (barra visual)
- Data prevista de fechamento
- Tags

**Seção: Integrações**
- Cobrança vinculada: badge com ID ou "Não gerada" + botão "Gerar Cobrança"
- Nota Fiscal vinculada: badge com número ou "Não emitida" + botão "Emitir NF"
- Ambos os botões executam a ação e atualizam o estado do negócio

**Seção: Histórico de Atividades**
- Timeline vertical com todas as atividades:
  - Mudanças de status (automáticas)
  - Notas manuais
  - Cobranças geradas
  - NFs emitidas
- Input no final para adicionar nova nota manual
- Botões de ação rápida: 📞 Registrar ligação / 📧 Registrar e-mail / 📅 Agendar reunião

## 3.3 — Resultado esperado desta fase
- ✅ Modal de criação em 4 steps com cálculo automático de valores
- ✅ Autocomplete de clientes e produtos integrado
- ✅ Drawer de detalhes completo com todas as seções
- ✅ Timeline de histórico funcional
- ✅ Botões de gerar cobrança e emitir NF vinculados aos módulos correspondentes

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 4 — ABA LISTA + INTEGRAÇÕES AUTOMÁTICAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Implementar a aba Lista com filtros avançados e as automações de integração com Cobranças e Fiscal.

## 4.1 — Aba Lista (Tabela)

**Filtros avançados:**
- Busca por texto
- Status (multi-select com badges coloridos)
- Consultor responsável
- Período de criação / período de fechamento previsto
- Faixa de valor (de / até)
- Origem
- Forma de pagamento
- Com/sem cobrança gerada
- Com/sem NF emitida
- Botão "Limpar filtros"

**Tabela de negócios:**
| # | Título | Cliente | Consultor | Status | Valor | Fechamento | Cobrança | NF | Ações |
|---|--------|---------|-----------|--------|-------|------------|----------|----|-------|

- Coluna **Cobrança**: ícone verde se gerada, vermelho se pendente, — se não aplicável
- Coluna **NF**: ícone verde se emitida, âmbar se pendente, — se não aplicável
- Ordenação por qualquer coluna (clique no header)
- Seleção múltipla (checkbox) para ações em lote
- Ações em lote: Mudar status / Atribuir consultor / Exportar selecionados / Excluir

**Ações por linha:**
- 👁️ Abrir drawer de detalhes
- ✏️ Editar
- 📋 Duplicar negócio
- 🗑️ Excluir

**Botão exportar CSV** — exporta todos os negócios filtrados.

## 4.2 — Automação: Fechamento Ganho → Gerar Cobrança

Quando um negócio é movido para **"Fechado — Ganho"** (via drag-and-drop ou modal):

1. Se `gerarCobranca === true`:
   - Exibir modal de confirmação: "Deseja gerar a cobrança automaticamente?"
   - Dados pré-preenchidos: cliente, valor, forma e condição de pagamento
   - Botões: "Gerar Cobrança" / "Gerar depois" / "Não gerar"
   - Ao confirmar: criar registro no módulo Cobranças e vincular o ID ao negócio
   - Toast: "✅ Cobrança gerada e vinculada ao negócio"

2. Se `emitirNF === true` E cobrança gerada:
   - Após cobrança, exibir segundo modal: "Deseja emitir a Nota Fiscal?"
   - Dados pré-preenchidos: cliente, produtos, valores, impostos calculados (módulo Fiscal)
   - Botões: "Emitir NF" / "Emitir depois" / "Não emitir"
   - Ao confirmar: criar registro no módulo Fiscal e vincular ao negócio
   - Toast: "✅ Nota Fiscal emitida e vinculada ao negócio"

## 4.3 — Automação: Fechamento Perdido → Motivo Obrigatório

Quando movido para **"Fechado — Perdido"**:
- Modal obrigatório: "Motivo da perda"
- Select: Preço / Concorrência / Sem budget / Timing / Sem interesse / Outro
- Campo texto: "Detalhes (opcional)"
- Registrar no histórico do negócio automaticamente

## 4.4 — Resultado esperado desta fase
- ✅ Aba Lista com tabela, filtros avançados e ações em lote
- ✅ Colunas de status de cobrança e NF na tabela
- ✅ Modal automático de geração de cobrança ao fechar ganho
- ✅ Modal automático de emissão de NF após cobrança
- ✅ Modal de motivo de perda obrigatório ao fechar perdido
- ✅ Exportação CSV funcional

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 5 — ABA RELATÓRIOS DE VENDAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Implementar o dashboard de relatórios do módulo de Vendas com métricas, gráficos e ranking de consultores.

## 5.1 — Cards KPI (linha superior)

| Card | Dado |
|------|------|
| 💰 Receita Fechada | R$ total de negócios ganhos no período |
| 📊 Taxa de Conversão | % ganhos / (ganhos + perdidos) |
| ⏱️ Ciclo Médio de Venda | Dias médios do status inicial ao fechamento |
| 🎯 Ticket Médio | Valor médio dos negócios fechados ganhos |
| 📋 Negócios no Pipeline | Quantidade + valor total dos negócios ativos |
| 🔥 Previsão (próx. 30 dias) | Valor dos negócios com fechamento previsto |

## 5.2 — Gráfico: Receita Fechada por Mês

Gráfico de barras (recharts) — últimos 12 meses:
- Barra verde: Fechado Ganho (R$)
- Barra vermelha: Fechado Perdido (R$)
- Linha âmbar: Meta mensal (configurável)

## 5.3 — Gráfico: Distribuição do Pipeline por Status

Gráfico de funil ou barras horizontais:
- Cada status com quantidade de negócios e valor total
- Taxa de conversão entre etapas (ex: Qualificado → Proposta: 68%)

## 5.4 — Gráfico: Negócios por Origem

Gráfico de pizza (recharts):
- Indicação / Outbound / Inbound / Representante / Renovação / Upsell
- Legenda com % e quantidade

## 5.5 — Ranking de Consultores

Tabela de performance por consultor:
| # | Consultor | Negócios Ganhos | Valor Total | Taxa Conv. | Ticket Médio | Ciclo Médio |
|---|-----------|----------------|-------------|------------|--------------|-------------|

- Ordenada por valor total (desc)
- Badge de destaque para o #1 do período
- Filtro por período (mês / trimestre / ano / customizado)

## 5.6 — Relatório de Motivos de Perda

Tabela + gráfico de barras com os motivos de perda mais frequentes:
- Quantidade de perdas por motivo
- Valor total perdido por motivo
- Consultor com mais perdas por motivo

## 5.7 — Resultado esperado desta fase
- ✅ 6 cards KPI com dados reais do pipeline
- ✅ Gráfico de barras receita fechada vs meta (12 meses)
- ✅ Gráfico de funil por status com taxas de conversão
- ✅ Gráfico pizza de origem dos negócios
- ✅ Ranking de consultores com métricas completas
- ✅ Relatório de motivos de perda
- ✅ Filtros de período globais para a aba

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 6 — ABA MEUS NEGÓCIOS + PERMISSÕES DE VENDAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Criar a visão personalizada para consultores e representantes externos, e aplicar as permissões do sistema de níveis de acesso já existente.

## 6.1 — Aba "Meus Negócios"

Visão filtrada automaticamente pelo usuário logado (consultorId === usuário atual).

Layout igual à aba Lista, mas:
- Sem filtro de consultor (fixado no usuário logado)
- Cards KPI pessoais no topo:
  - Meus negócios ativos
  - Minha receita fechada (mês)
  - Minha taxa de conversão
  - Próximo fechamento previsto

Para o perfil **Representante Externo**:
- Acessa APENAS esta aba (as demais são ocultas)
- Pode criar negócios (vinculados automaticamente a si mesmo)
- Pode editar apenas os próprios negócios
- Não vê negócios de outros consultores
- Não vê valores de cobrança detalhados (apenas confirmação "Cobrança gerada ✅")
- Não vê detalhes da NF (apenas "NF emitida ✅")

## 6.2 — Aplicar Permissões do Sistema de Acesso

Integrar com o hook `usePermissions` e `PermissionGate` já criados:

**Permissões por módulo `vendas`:**
```
admin:         view ✅ create ✅ edit ✅ delete ✅ export ✅
gestor:        view ✅ create ✅ edit ✅ delete ❌ export ✅
financeiro:    view ✅ create ❌ edit ❌ delete ❌ export ✅
consultor:     view ✅ create ✅ edit ✅ delete ❌ export ❌
representante: view ✅ create ✅ edit ✅* delete ❌ export ❌
               (* apenas os próprios negócios)
```

Adicionar o módulo `vendas` na matriz `DEFAULT_PERMISSIONS` em `src/config/permissions.ts`.

**Aplicar PermissionGate:**
- Botão "+ Novo Negócio" → `action="create"`
- Botão editar negócio → `action="edit"`
- Botão excluir negócio → `action="delete"`
- Botão exportar CSV → `action="export"`
- Aba "Relatórios" → `action="view"` com verificação de role (oculta para representante)
- Aba "Pipeline" e "Lista" → ocultas para representante (usa apenas "Meus Negócios")

## 6.3 — Badge Dinâmico no Menu

Atualizar o badge do item "Vendas" no menu lateral:
- Contar negócios em status `proposta` + `negociacao` do usuário logado (se consultor/rep)
- Para admin/gestor: contar todos os negócios nesses status
- Zerar badge quando não há negócios nessas etapas

## 6.4 — Resultado esperado desta fase
- ✅ Aba "Meus Negócios" com KPIs pessoais
- ✅ Representante vê apenas os próprios negócios
- ✅ Permissões aplicadas via PermissionGate em todas as ações
- ✅ Módulo `vendas` adicionado na matriz de permissões
- ✅ Badge dinâmico no menu corretamente calculado

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REVISÃO COMPLETA — CHECKLIST GERAL DO MÓDULO DE VENDAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Cole no Lovable **após concluir as 6 fases**.

```
Faça uma revisão completa do módulo de Vendas do Whatsflow Finance.
Confirme ✅ implementado ou ❌ faltando. Para cada ❌, corrija automaticamente.

MENU E NAVEGAÇÃO
[ ] Item "Vendas" no menu (grupo Principal, após Dashboard)
[ ] Badge dinâmico com negócios em proposta/negociação
[ ] Rota /vendas funcionando sem erro
[ ] 4 abas: Pipeline, Lista, Relatórios, Meus Negócios

TIPOS E ESTRUTURA
[ ] Arquivo src/types/vendas.ts criado com todos os tipos
[ ] Constantes NEGOCIO_STATUS_CONFIG com cores
[ ] Módulo "vendas" adicionado em permissions.ts

ABA PIPELINE (KANBAN)
[ ] 6 colunas com cores por status
[ ] Cards com: título, cliente, valor, consultor, data, probabilidade
[ ] Drag-and-drop entre colunas funcional
[ ] Mudança de status registrada no histórico
[ ] 4 cards KPI acima do kanban
[ ] Filtros e busca funcionando
[ ] Botão "+ Novo Negócio"

MODAL DE CRIAÇÃO (4 STEPS)
[ ] Step 1: identificação com autocomplete de clientes
[ ] Step 2: produtos com autocomplete + cálculo automático de valores
[ ] Step 3: previsão, probabilidade e toggles de cobrança/NF
[ ] Step 4: revisão e confirmação

DRAWER DE DETALHES
[ ] Título editável inline
[ ] Badge de status clicável para mudar
[ ] Resumo financeiro com produtos
[ ] Seção de integrações (cobrança + NF) com botões de ação
[ ] Timeline de histórico
[ ] Input para adicionar notas manuais

ABA LISTA
[ ] Tabela com todas as colunas incluindo status cobrança e NF
[ ] Filtros avançados funcionando
[ ] Seleção múltipla e ações em lote
[ ] Exportar CSV

INTEGRAÇÕES AUTOMÁTICAS
[ ] Modal de gerar cobrança ao fechar ganho (com dados pré-preenchidos)
[ ] Modal de emitir NF após cobrança (com impostos calculados)
[ ] Modal de motivo de perda ao fechar perdido
[ ] Cobrança e NF vinculadas ao negócio após geração

ABA RELATÓRIOS
[ ] 6 cards KPI com dados reais
[ ] Gráfico barras receita fechada vs meta (12 meses)
[ ] Gráfico funil por status com taxas
[ ] Gráfico pizza por origem
[ ] Ranking de consultores
[ ] Relatório motivos de perda

ABA MEUS NEGÓCIOS
[ ] KPIs pessoais do usuário logado
[ ] Representante vê apenas os próprios negócios
[ ] Representante não vê cobrança/NF detalhadas

PERMISSÕES
[ ] PermissionGate aplicado em criar/editar/excluir/exportar
[ ] Representante externo sem acesso às abas Pipeline, Lista, Relatórios
[ ] Financeiro: apenas visualiza e exporta

QUALIDADE GERAL
[ ] Tema dark preservado
[ ] Sem erros no console
[ ] Nenhuma rota existente quebrada
[ ] Responsividade ok
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TESTES — SOLICITAÇÃO FINAL AO LOVABLE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Cole no Lovable **após a revisão ser concluída com todos os ✅**.

```
Execute a bateria de testes funcionais do módulo de Vendas.
Reporte PASSOU ✅ ou FALHOU ❌ + descrição. Corrija todas as falhas.

TESTE 1 — Criação de Negócio Completo
- Clicar em "+ Novo Negócio"
- Step 1: Título "Implantação Whatsflow — Padaria Central", buscar cliente fictício,
  selecionar consultor, origem "Indicação"
- Step 2: Adicionar produto "Plano Pro", qtd 1, R$ 1.500,00; adicionar produto
  "Implementação", qtd 1, R$ 800,00; desconto geral 10%; verificar valor líquido = R$ 2.070,00
- Step 3: Data de fechamento = próximo mês, probabilidade 75%, ativar toggles de
  cobrança e NF
- Step 4: Revisar e criar → toast de confirmação
- Verificar que o card aparece na coluna "Prospecção" do kanban

TESTE 2 — Drag-and-drop e Histórico
- Arrastar o negócio criado de "Prospecção" para "Qualificado"
- Verificar que o card muda de coluna
- Abrir o drawer do negócio → verificar que o histórico registrou
  "Status alterado: Prospecção → Qualificado"

TESTE 3 — Fechamento Ganho com Automações
- Mover o negócio para "Fechado — Ganho"
- Verificar que o modal de cobrança aparece com dados pré-preenchidos
- Confirmar geração de cobrança
- Verificar que o modal de NF aparece em seguida
- Confirmar emissão de NF
- Abrir o drawer do negócio → verificar badges de cobrança e NF vinculadas
- Verificar que os registros aparecem nos módulos Cobranças e Fiscal

TESTE 4 — Fechamento Perdido com Motivo
- Criar um segundo negócio e mover para "Fechado — Perdido"
- Verificar que o modal de motivo aparece obrigatoriamente
- Tentar fechar sem preencher → deve bloquear
- Selecionar motivo "Preço" e confirmar
- Verificar que o motivo aparece no histórico do negócio

TESTE 5 — Filtros na Aba Lista
- Ir para aba Lista
- Filtrar por status "Fechado — Ganho" → deve exibir apenas os ganhos
- Filtrar por faixa de valor R$ 1.000 a R$ 3.000
- Verificar resultados coerentes
- Exportar CSV → arquivo deve conter os negócios filtrados

TESTE 6 — Perfil Representante Externo
- Simular login como representante externo
- Verificar que no menu aparece "Vendas" com badge
- Acessar /vendas → deve ir direto para aba "Meus Negócios"
- Verificar que abas Pipeline, Lista, Relatórios estão ocultas
- Criar um negócio → consultor deve ser fixado automaticamente no representante logado
- Tentar acessar /vendas?tab=relatorios pela URL → deve redirecionar

TESTE 7 — Relatórios
- Ir para aba Relatórios
- Verificar que os 6 cards KPI renderizam sem erro
- Verificar que os 4 gráficos aparecem (barras, funil, pizza, ranking)
- Alterar filtro de período para "Último trimestre"
- Verificar que os dados dos cards e gráficos atualizam

TESTE 8 — Integrações de Módulos
- Abrir um negócio com cobrança gerada → clicar no ID da cobrança
- Deve abrir/navegar para o módulo Cobranças com filtro no ID da cobrança
- Abrir negócio com NF emitida → clicar no número da NF
- Deve abrir/navegar para o módulo Fiscal com a NF destacada

Reporte PASSOU ✅ / FALHOU ❌ para cada teste.
Corrija todas as falhas antes de concluir.
```
