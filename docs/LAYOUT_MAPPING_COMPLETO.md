# MAPEAMENTO COMPLETO DE LAYOUTS — Whatsflow/IAZIS
## Para Geração de Previews Visuais de Alta Fidelidade

**Data:** 12 de Abril de 2026
**Versão:** 1.0
**68 telas mapeadas · Excluído: Central de Controle**

---

## BLOCO 1 — MÓDULO MENSAGERIA (18 componentes)

### TELA: Caixa de Entrada · `/mensageria` → inbox

#### Zona de Layout
| Zona | Tipo | Conteúdo | Componente |
|------|------|----------|------------|
| Topbar filtros | Tabs/Pills coloridas | Em atendimento (#0E8A5C), Fila (#E8A84A), Msgs Grupos (#5B9EF7), Finalizados (#A09888) | InboxTab |
| Lista esquerda | Scroll vertical 25% | Avatar + nome + preview + hora + canal badge + unread count | LeftPanel → ConversationItem |
| Área central | Chat ou empty state | Mensagens ou "Suas mensagens são protegidas..." + ícone cadeado | ChatPanel |
| Painel direito | Sidebar 320px | Dados do contato, pipeline, tags, info do lead | RightPanel |
| Input mensagem | Fixed bottom | Emoji + Attach + Textarea + Grammar + Send/Mic | ChatInput |

#### Dados Exibidos (ConversationItem)
| Campo | Tipo | Exemplo | Fonte |
|-------|------|---------|-------|
| Nome | string | "Anselmo Netto" | whatsapp_leads.lead_name |
| Última mensagem | string | "Documento 📄 Automação..." | whatsapp_messages.body |
| Horário | timestamp | "17:28" | whatsapp_messages.created_at |
| Canal | enum | WA Web, Cloud API, IG, FB, TG | whatsapp_instances.type |
| Unread count | number | 3 | computed from messages |
| Avatar | color + initials | Círculo verde "AN" | computed |
| SLA breach | boolean | Borda vermelha se true | sla_rules check |
| Assigned | string | "AZ" | whatsapp_leads.assigned_attendant_id |

#### Quick Action Chips (ChatPanel header)
| Chip | Ícone | Cor | Ação |
|------|-------|-----|------|
| Transferir | RefreshCw | Orange | Modal com lista de atendentes |
| Finalizar | CheckCircle2 | Green | Resolve a conversa |
| IA: ON/OFF | Bot | Purple | Toggle chatbot |
| Tag | Tag | Blue | Modal de tags |
| Notas | StickyNote | Gray | Modal de notas internas |
| Criar Lead | UserPlus | Green | QuickLeadDrawer |
| Abrir Ticket | LifeBuoy | Purple | Cria ticket vinculado |
| Mais | MoreHorizontal | Gray | Menu expandido |

#### Painel Direito (RightPanel) — Seções
| Seção | Campos | Editável |
|-------|--------|----------|
| Avatar + Nome | 64px avatar, nome editável inline, telefone | Sim (nome) |
| Ações | Mensagem, Ligar, Mais | — |
| Enviar para Pipeline | Lista de pipelines com stage count | Sim (1 clique) |
| Tags e Status | Tags coloridas, Ticket badge, Atendente ID | — |
| Informações do Lead | Nome, Empresa, Telefone, Email, CPF/CNPJ, Salvar | Sim (todos) |

#### Tipos de Mensagem Renderizados (MessageRenderers)
| Tipo | Renderer | Visual |
|------|----------|--------|
| text | TextRenderer | Texto com detecção de assinatura *Nome* |
| image | ImageRenderer | Thumbnail 240x300 + legenda |
| video | VideoRenderer | Player 280x200 + legenda |
| audio | AudioRenderer | Player HTML5 200px min |
| document | DocumentRenderer | Card com ícone colorido (PDF=vermelho, XLS=verde) + download |
| sticker | StickerRenderer | Imagem 120x120 |
| location | LocationRenderer | 📍 + nome do local |
| contact | ContactRenderer | 👤 + nome + telefone |
| reaction | ReactionRenderer | Emoji grande |
| poll | PollRenderer | 📊 + pergunta |
| system | SystemRenderer | Texto centralizado cinza |
| transfer | TransferRenderer | Alert verde com ícone |
| unsupported | UnknownRenderer | Card amigável "📎 Mensagem não suportada" |

#### Attachment Picker (ChatInput)
| Tipo | Ícone | Cor | Accept |
|------|-------|-----|--------|
| Fotos e vídeos | Image | #7C3AED | image/*, video/* |
| Documentos | FileText | #0EA5E9 | PDF, DOC, XLS, CSV, TXT, PPT |
| Localização | MapPin | #10B981 | lat + lng inputs |
| Contato | User | #F59E0B | nome + telefone |
| Enquete | BarChart3 | #EF4444 | pergunta + opções |
| Áudio | Music | #00A884 | audio/* |

#### Estados
| Estado | Visual |
|--------|--------|
| Empty (sem conversa selecionada) | Ícone cadeado + "Suas mensagens são protegidas" + botão "Nova Conversa" |
| Loading | Spinner centralizado |
| Fila (botão Atender) | Badge verde "Atender" com ícone Headphones |
| Gravando áudio | Círculo vermelho pulsante + timer + botões parar/cancelar |

---

### TELA: Envios em Massa · `/mensageria` → enviar

#### Zona de Layout
| Zona | Tipo | Conteúdo | Componente |
|------|------|----------|------------|
| Tabs | 3 abas | Novo Envio, Campanhas, Relatórios | MassSendHub |
| Conteúdo | Variável | MessageComposer / CampaignsTab / UsageReportTable | Por tab |

---

### TELA: Leads · `/mensageria` → leads

#### Zona de Layout
| Zona | Tipo | Conteúdo | Componente |
|------|------|----------|------------|
| Header | Card | Título + botão refresh | LeadKanban |
| Kanban | Grid 4 colunas | Cards de leads por status | LeadKanban |

#### Colunas Kanban
| Key | Label | Cor |
|-----|-------|-----|
| novo | Novo | blue-500/20 |
| em_atendimento | Em Atendimento | yellow-500/20 |
| qualificado | Qualificado | emerald-500/20 |
| finalizado | Finalizado | muted/30 |

---

### TELA: Métricas · `/mensageria` → metricas

#### Seções de KPIs
| Seção | Cards | Dados |
|-------|-------|-------|
| Tempos de Atendimento | Espera, Resposta, Total, Inatividade | conversations (claimed_at, first_response_at, resolved_at) |
| Volume e Taxas | Total msgs, Contatos únicos, Finalização, Abandono | whatsapp_messages count |
| Funil de Vendas | Total negócios, Qualificados, Conversão, Tempo qualificação | negocios |
| Por Atendente | Msgs/dia média, Sistema, Automação | whatsapp_messages por agente |
| CSAT | Média, Distribuição (1-5 estrelas) | csat_ratings |
| Métricas Avançadas | Multitarefas, Tempo Ocioso, FCR | computed |
| **Qualidade (Auditor IA)** | Score Geral, Abaixo do Padrão, Follow-ups, Avaliações | audit_evaluations, follow_up_logs |
| Ranking Concierges | Tabela agentes por score | audit_evaluations |
| Critérios de Qualidade | Barras horizontais por critério | audit_evaluations.criteria_scores |
| Erros Frequentes | Grid top 5 erros | audit_evaluations.errors_found |

---

### TELA: Modelos de Msgs · `/mensageria` → msg-predefinidas

#### Tabs
| Tab | Cor | Componente |
|-----|-----|------------|
| Msgs Rápidas | #10B981 (verde) | QuickReplyManager |
| Cadência de Msgs | #818CF8 (roxo) | CadenciaManager |
| Templates HSM | #3B82F6 (azul) | HSMTemplateManager |

#### Quick Reply Card
| Campo | Tipo | Exemplo |
|-------|------|---------|
| Título | string bold | "Boas-vindas" |
| Atalho | mono badge | /ola |
| Visibilidade | icon badge | 🌐 Todos / 🏢 Setor / 🔒 Exclusivo |
| Categoria | badge | Saudação |
| Body | text | "Olá! Tudo bem? Como posso ajudar?" |
| Uso | count | "Usado 5×" |

#### Cadência Step Builder
| Tipo | Ícone | Cor | Conteúdo |
|------|-------|-----|----------|
| Texto | Aa | #10B981 | Textarea |
| Imagem | 🖼 | #3B82F6 | Upload + legenda |
| Áudio | 🎤 | #F59E0B | Upload |
| Vídeo | 🎬 | #EF4444 | Upload + legenda |
| Documento | 📄 | #818CF8 | Upload + legenda |

---

### Demais Telas Mensageria (resumo)

| Tela | Layout | Dados principais |
|------|--------|-----------------|
| ADM Grupos | GroupDashboard | Grupos WA com participantes, mensagens agendadas |
| Contatos | ContactChecker | Lista de contatos com busca e verificação |
| Logs | LogsTab | Timeline de eventos do sistema |
| Atendentes | AgentDashboard | Status online/offline, conversas simultâneas, max |
| Setores | DepartmentManager | Departamentos com distribuição (round_robin/least_busy/manual) |
| SLA | SlaConfigPanel | Regras por departamento: primeira resposta + resolução (minutos) |
| Tags de Contato | ContactTagManager | Tags com cor, categoria, auto-import de leads |
| Automações | AutomationManager | Triggers (keyword/event) + ações (reply/assign/tag/webhook/typebot) |

---

## BLOCO 2 — MÓDULO FINANCEIRO

### TELA: Inserir Dados · `/input`

#### Tabs
| Tab | Conteúdo |
|-----|----------|
| Financeiro | MonthlyInputForm + CSVImport + CostDetailTable |
| Clientes | CustomerCSVImport |
| CRM Contatos | CrmCSVImport |
| Produtos | Placeholder "Em construção" |

---

### TELA: Receitas · `/revenue`

#### KPIs (4 cards)
| Card | Ícone | Cor |
|------|-------|-----|
| Total Receitas | DollarSign | primary |
| Recebido | CheckCircle | green |
| Pendente | Clock | yellow |
| Vencido | TrendingUp | red |

#### Modal Nova Receita
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Descrição | autocomplete | Sim |
| Cliente | autocomplete | Não |
| Categoria | dropdown (7 opções) | Não |
| Valor Total | currency | Sim |
| Parcelamento | dropdown (À vista, 2x-12x) | Não |
| Forma Pagamento | dropdown (PIX, Boleto, Cartão...) | Não |
| Data Lançamento | date | Sim |
| Vencimento | date | Sim |
| Status | dropdown (5 opções) | Sim |
| Observações | textarea | Não |

---

### TELA: Despesas · `/expenses`

#### Seções
| Seção | Componente | Dados |
|-------|------------|-------|
| Previsibilidade (topo) | PredictabilityDashboard | 3 cards + gráfico barras 12 meses |
| Summary Cards | DespesaSummaryCards | Total, Pendente, Pago, IA count |
| Filtros | DespesaFilterBar | Busca + Período + Categoria + Status + Origem |
| Tabela | DespesaTable | Data, Fornecedor, Descrição, Categoria, Valor, Status, Origem |

#### Modal Extrator IA
| Etapa | Visual |
|-------|--------|
| 1. Upload | Drag-drop com ícone Bot roxo |
| 2. Processando | Spinner "Extraindo..." |
| 3. Review | Campos editáveis + confidence % (verde/amarelo/vermelho) |
| 4. Salvar | Botão primário → insere com origem "IA" |

---

### TELA: Cobranças · `/cobrancas`

#### Tabs (5)
| Tab | Ícone | Componente |
|-----|-------|------------|
| Cockpit | Gauge | AsaasCockpitPanel |
| Cobranças | Receipt | AsaasPaymentsPanel |
| Criar | Send | AsaasBillingManagerPanel |
| Régua | Shield | AsaasDunningPanel |
| Reconciliar | ArrowLeftRight | AsaasReconciliationPanel |

---

### TELA: Fiscal · `/fiscal`

#### Tabs (5)
| Tab | Componente | Permissão |
|-----|------------|-----------|
| Visão Geral | VisaoGeralTab | view |
| Notas Fiscais | NotasFiscaisTab | view |
| Tributos | TributosTab | view |
| Certificados | CertificadosTab | edit |
| Configurações | ConfiguracoesFiscaisTab | edit |

---

### TELA: Comissões · `/comissoes`

#### Tabs (3)
| Tab | Componente |
|-----|------------|
| Dashboard | CommissionDashboardTab — KPIs + gráficos |
| Regras | CommissionRulesTab — Builder de regras |
| Fechamento | CommissionClosingTab — Fechamento mensal |

---

## BLOCO 3 — VENDAS & CRM

### TELA: Vendas · `/vendas`

#### Tabs (5, filtradas por role)
| Tab | Ícone | Visível para | Componente |
|-----|-------|-------------|------------|
| Pipeline | Kanban | Admin | VendasPipeline |
| Lista | List | Admin | VendasLista |
| Atividades | CheckSquare | Todos | VendasAtividades |
| Relatórios | BarChart3 | Admin | VendasRelatorios |
| Negócios Fechados | User | Todos | VendasMeusNegocios |

#### Pipeline KPIs (4 cards)
| Card | Dado | Formato |
|------|------|---------|
| Pipeline Total | Sum valor_liquido (ativos) | Currency |
| Previsão Mês | Sum com data_previsao no mês | Currency |
| Ganhos (mês) | Sum fechado_ganho no mês | Currency |
| Taxa Conversão | ganhos / (ganhos + perdidos) × 100 | Percentual |

#### Card do Negócio no Kanban
| Campo | Posição | Estilo |
|-------|---------|--------|
| Título | Topo | font-semibold truncate |
| Cliente | 2ª linha | muted + User icon |
| Telefone | 3ª linha | primary + Phone icon |
| Valor | Direita inferior | font-bold currency |
| Probabilidade | Badge | amber % |
| Digital Intelligence | Tag inferior | primary + Radar icon |
| ICP Score | Badge direita | Color-coded /10 |

#### NegocioDrawer (painel lateral)
| Seção | Campos | Ações |
|-------|--------|-------|
| Header | Nome editável, Status dropdown | Edit, Delete, Close |
| Botões fechamento | Fechar como Ganho / Perdido | Modal de confirmação |
| Resumo Financeiro | Valor, Forma pgto, Condição | — |
| Informações | Cliente, Consultor, Origem, Probabilidade, Fechamento | — |
| Integrações | Cobrança (Não gerada), NF (Não emitida) | Gerar |
| Histórico | Timeline de eventos com data/hora/autor | Adicionar nota |
| Rodapé | Ligação, E-mail, Reunião | Quick actions |

#### NegocioCreateModal (3 steps)
| Step | Campos |
|------|--------|
| 1. Info Básica | Título, Cliente, Origem, Consultor, Status, Tags |
| 2. Produtos | Lista produtos + qtd + preço, Desconto, Forma/Condição pagto |
| 3. Fechamento | Data prevista, Probabilidade (slider), Notas, Gerar Cobrança, Gerar NF |

---

### TELA: Clientes · `/customers`

#### KPIs (4 cards)
| Card | Ícone | Cor |
|------|-------|-----|
| Total Clientes | Users | neutral |
| Ativos | UserCheck | green |
| Desativados | UserX | red |
| MRR | DollarSign | accent |

#### Tabela — Colunas
| Coluna | Tipo | Filtrável |
|--------|------|-----------|
| Empresa/Titular | Text | — |
| Email | Text | — |
| Status | Badge | Sim |
| Ativação | Date | — |
| Disp. Oficial | Number | — |
| Atendentes | Number | — |
| Checkout | Text | Sim |
| Condição | Badge | Sim |
| Valor | Currency | — |

---

### TELA: Atividades · `/atividades`

#### Tabs
| Tab | Componente | Layout |
|-----|------------|--------|
| Kanban | ActivityKanban | 3 colunas: Todo, In Progress, Done |
| Calendário | ActivityCalendar | Grade mensal com dots de atividade |

---

### TELA: Inteligência Digital · `/intelligence`

#### Seções (4)
| Seção | Sub-tabs | Componentes |
|-------|----------|-------------|
| Análise Digital | Visão Geral, Website, Instagram, Perfil, Meta, Prospecção | WebAnalysisCard, InstagramAnalysisCard, GoogleBusinessCard |
| Módulo de IA | — | IASkillsPage (4 skills: Auditor, Assistente, Closer, Qualificador) |
| Playbooks | — | PlaybookManager |
| Auditor | — | IAAuditorPage |

---

### TELA: Relatórios · `/reports`

#### Tabs (3)
| Tab | KPIs | Cards de dados |
|-----|------|---------------|
| Vendas | Receita, Conversão, Ticket Médio, Pipeline | Negócios por Status, por Origem |
| Atendimento | Conversas, Abertas, Resolvidas, Taxa | Volume Msgs, Msgs por Dispositivo |
| Equipe | — | Ranking consultores (🥇🥈🥉) |

---

## BLOCO 4 — SISTEMA

### TELA: Integrações · `/integracoes`

#### Tabs (3)
| Tab | Conteúdo |
|-----|----------|
| Canais de Atendimento | WhatsApp Web, Meta Cloud, Mercado Livre, Telegram, Webchat |
| Financeiro & Gateways | Checkout Whatsflow, Asaas |
| Automação | n8n, Google Calendar |

#### Card de Canal (expandido)
| Zona | Dados | Estilo |
|------|-------|--------|
| Header | Ícone + Nome + Subtítulo + Status dot | bg verde claro |
| Body | Instâncias conectadas em grid | Cards com badges |
| Instância | Nome, Status, Tempo conectado, Data criação, Automação | Ícones de ação |

---

### TELA: Configurações · `/settings`

| Categoria | Sub-itens |
|-----------|----------|
| Aparência do Menu | Layout (4 opções), Densidade, Largura |
| Tema | Café Noturno, Pacífico, Cosmos |
| Dados da Empresa | Nome, CNPJ, Logo, Endereço |
| Pipeline de Vendas | Estágios, Automações, Campos custom |
| Webhooks | URL, eventos, segredo |

---

## BLOCO 5 — ESTADOS ESPECIAIS

### Empty States
| Módulo | Tela | Ícone | Mensagem | CTA |
|--------|------|-------|----------|-----|
| Inbox | Chat | 🔒 Cadeado | "Suas mensagens são protegidas com criptografia" | "+ Nova Conversa" |
| Vendas | Pipeline coluna | — | (nenhum card na coluna) | — |
| Clientes | Lista | — | "Nenhum cliente importado" | "+ Novo Cliente" |
| Despesas | Tabela | FileText | "Nenhuma despesa encontrada" | — |
| Leads | Kanban | — | "Nenhum lead encontrado" | — |
| Métricas | Auditor | — | "Nenhuma avaliação no período" | — |
| Modelos | Lista | MessageSquareText | "Nenhum modelo cadastrado" | "+ Novo Modelo" |

### Telas de Auth
| Tela | Campos | CTAs | Redirect |
|------|--------|------|----------|
| Login | Email, Senha | "Entrar", "Criar conta", "Esqueci a senha" | /home |
| Signup | Nome, Email, Senha, Confirmar | "Criar conta" | /onboarding |
| Reset Password | Email | "Enviar link" | /login |
| Checkout | Plano, Pagamento | "Assinar" | /onboarding |

### Responsividade
| Tela | Mobile (<768) | Tablet (768-1024) | Desktop (>1024) |
|------|---------------|-------------------|-----------------|
| Caixa de Entrada | Lista full → tap chat full | Lista 40% + chat 60% | Lista 25% + chat + painel |
| Pipeline | Colunas scroll horizontal | 2 colunas | 4+ colunas |
| NegocioDrawer | Bottom sheet 75vh | Sidebar 300px | Sidebar 300px |
| Clientes | Tabela scroll horizontal | Tabela completa | Tabela + filtros |
| Métricas | Cards 1 coluna | Cards 2 colunas | Cards 4 colunas |

---

*ANTIGRAVITY_LAYOUT_MAPPING v1.0 — Whatsflow · Abril 2026*
*68 telas · 5 blocos · Excluído: Central de Controle*
