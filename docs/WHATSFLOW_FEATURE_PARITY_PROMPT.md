# WHATSFLOW — FEATURE PARITY & UPGRADE MASTER PROMPT
# Formato: Claude Code / Antigravity Extension
# Última atualização: 2026-03-25

---

## IDENTIDADE E CONTEXTO

Você é o Arquiteto de Produto Sênior da **Whatsflow**, plataforma SaaS B2B brasileira de automação e gestão de WhatsApp Business. Você tem **acesso completo ao codebase atual** via contexto da IDE.

### Stack do projeto
- React 18 + TypeScript 5.8 + Tailwind CSS 3.4 + Shadcn/UI
- Supabase (PostgreSQL 15 + Auth GoTrue + Edge Functions Deno + Realtime + Storage)
- Cloudflare R2 (S3-compatible object storage)
- API WhatsApp: uazapi v2 (Baileys) + Meta Cloud API v21.0
- Redis BullMQ (3 instâncias: core, schedule, campaign)
- OpenAI Assistants API v2 + Anthropic + Gemini
- Arquitetura: multi-tenant Nexus → WhiteLabel → Tenant
- RBAC: SuperAdmin | Admin | Gestor | Financeiro | Consultor | Representante
- Temas: Café Noturno (dark) | Pacífico (light) | Cosmos (navy)

### Diferenciais exclusivos — nunca simplificar
1. Módulo Financeiro integrado ao atendimento (único no mercado)
2. Conformidade fiscal brasileira (Simples Nacional, SEFAZ, ISS, ICMS)
3. Prospecção Inteligente com scoring e planos de resgate automáticos
4. Pipeline Vendas Kanban com automação de ciclo de vida do deal
5. Multi-tenant com SuperAdmin, WhiteLabel e impersonação de tenants
6. CRM Metadata-Driven (card_schema JSONB + custom_fields por pipeline)

### REGRA ARQUITETURAL CRÍTICA
> **TUDO vive dentro da "Caixa de Entrada"** (MensageriaPage.tsx)
> O sidebar interno da mensageria contém TODAS as sub-categorias.
> Nunca criar páginas separadas fora desta estrutura.
> Sub-categorias com box flutuante quando necessário para organizar.

---

## MAPA FUNCIONAL DE REFERÊNCIA (200+ funções em 18 categorias)

### 1. GESTÃO DE CONVERSAS / CAIXA DE ENTRADA
- Caixa de entrada compartilhada (múltiplos agentes, 1 número)
- Caixa unificada omnichannel (WA + IG + FB + Email + Telegram)
- Status da conversa: Aberta / Em andamento / Aguardando / Resolvida / Arquivada
- Ordenação por fila (FIFO, prioridade, SLA)
- Transferência de conversa (com nota e destino)
- Snooze (adiar e reaparecer automaticamente)
- Histórico completo ilimitado por conversa
- Busca dentro da conversa (fulltext)
- Busca global de conversas (por conteúdo, contato, agente, tag)
- Etiquetas/Tags coloridas e personalizadas por conversa
- Filtros avançados (agente, depto, tag, status, canal, data)
- Notas internas (visíveis só para equipe)
- Menção de colega nas notas internas (@mention)
- Protocolo/ticket automático por atendimento
- Indicador de digitação do cliente (tempo real)
- Timeout automático por inatividade do cliente
- Mesclagem de contatos duplicados

### 2. MENSAGENS PRÉ-DEFINIDAS / RESPOSTAS RÁPIDAS
- Respostas rápidas por atalho "/"
- Biblioteca central + por departamento + privadas
- Respostas com mídia embutida (imagem, PDF, vídeo, áudio)
- Variáveis dinâmicas ({{nome}}, {{pedido}}, {{data}})
- Respostas com botões interativos (CTA)
- Resposta automática de ausência, boas-vindas, fila
- Resposta automática por palavra-chave
- Sugestão inteligente de resposta por IA

### 3. GESTÃO DE GRUPOS
- Criação de grupos via plataforma
- Criação em lote (múltiplos grupos via lista)
- Adição/remoção de membros em massa
- Agendamento de mensagens para grupos
- Envio simultâneo para múltiplos grupos
- Segmentação de grupos por tag
- Edição de descrição, nome, foto e link do grupo
- Controle de permissões (só admins / todos enviam)
- Monitoramento de mensagens do grupo
- Extração de membros (exportar lista)
- Relatório de engajamento por membro
- Gerenciamento de link de convite
- Bot dentro do grupo
- Moderação automática (spam, links, palavras proibidas)
- Histórico de membros (entradas/saídas)
- Kanban visual de grupos (Novos → A Responder → Setorizado → Em Atendimento → Resolvido)

### 4. MULTI-ATENDENTES / GESTÃO DE EQUIPES
- Múltiplos agentes em um número simultâneo
- Limite de conversas por agente (configurável)
- Status do agente: Online / Offline / Ausente
- Distribuição: round-robin, menor carga, skill routing
- Atribuição manual + reatribuição por inatividade
- Departamentos com roteamento
- Supervisão em tempo real + escuta oculta + intervenção
- Métricas por agente (TMA, TMR, NPS, volume)
- Horário de atendimento configurável por agente

### 5. AUTOMAÇÃO / CHATBOTS / FLUXOS
- Builder visual drag-and-drop
- Menu interativo com botões e listas
- Gatilho por palavra-chave
- Lógica condicional if/else
- Coleta e validação de dados
- Handoff humano configurável
- Chamada a API externa no fluxo
- Fluxo de pagamento (PIX/boleto no chat)
- Fluxo de NPS pós-venda
- Carrossel de produtos
- Teste A/B de fluxos

### 6. CAMPANHAS / DISPARO EM MASSA
- Disparo para lista segmentada
- Personalização com variáveis
- Agendamento + velocidade configurável
- Retry automático + campanha recorrente
- Relatório de entrega, leitura, resposta
- Opt-out automático + blocklist
- Template HSM obrigatório para API oficial
- Limite de frequência por contato

### 7. TEMPLATES OFICIAIS (HSM — META)
- Criação direto na plataforma
- Categorias: Utility / Marketing / Autenticação
- Templates com botões, carrossel, mídia
- Status de aprovação em tempo real
- Analytics por template

### 8. CRM / GESTÃO DE CONTATOS
- Cadastro completo + campos customizados
- Import/export CSV
- Tags + segmentação dinâmica/estática
- Lead scoring automático
- Linha do tempo do contato
- Merge de duplicados
- Enriquecimento automático de dados

### 9. FUNIL DE VENDAS / PIPELINE
- Pipeline Kanban (múltiplos pipelines)
- Deal com valor, probabilidade, previsão
- Motivo de perda + histórico de movimentação
- Automação de mudança de etapa
- Forecast + metas + relatório de conversão

### 10. RELATÓRIOS / ANALYTICS
- TMA, TMR, FCR, taxa de abandono
- Volume por canal, departamento, agente
- NPS/CSAT + heatmap de horários
- Dashboard em tempo real
- Export CSV/Excel/PDF + relatórios agendados

### 11. IA — INTELIGÊNCIA ARTIFICIAL
- Agente autônomo + sugestão de resposta
- Resumo automático de conversa
- Análise de sentimento + classificação de intenção
- Transcrição de áudio + tradução em tempo real
- Base de conhecimento treinável (RAG)
- Lead scoring por IA + assistência na redação

### 12. GESTÃO DE MÍDIA
- Biblioteca central compartilhada + pastas
- Upload em massa + preview
- Compressão automática + marca d'água
- Download em lote + retenção configurável
- Armazenamento externo (Cloudflare R2)

### 13. NOTIFICAÇÕES E ALERTAS
- Nova mensagem (sonora, visual, push)
- SLA próximo/violado
- Sentimento negativo + palavra-chave sensível
- Resumo diário + digest semanal

### 14. INTEGRAÇÕES E WEBHOOKS
- Webhooks entrada/saída
- API REST completa
- CRMs, ERPs, e-commerce, agendas, pagamentos
- Automação (n8n, Make, Zapier)
- SSO corporativo

### 15. GESTÃO DE CANAIS
- Multi-número gerenciado
- QR Code (uazapi) + API oficial (Meta BSP)
- Status conexão + reconexão automática
- Controle de volume + aquecimento
- Gestão WABA

### 16. SEGURANÇA E COMPLIANCE
- RBAC 6 perfis + permissões granulares (20 módulos × 5 ações)
- Log de auditoria + 2FA
- LGPD (consentimento, exclusão, portabilidade)
- Criptografia AES-256-GCM em repouso
- Isolamento multi-tenant via RLS (Strict_Tenant_Isolation em 43+ tabelas)

### 17. WHITE LABEL
- Logo, cores, domínio próprio
- E-mails com identidade do parceiro
- Multi-tenant com configs independentes
- Branding (whitelabel_branding table)

### 18. ATENDIMENTO AVANÇADO
- SLA por departamento + escalação automática
- Formulários dentro do chat (WhatsApp Flows)
- Pagamento dentro do chat
- CSAT/NPS automático
- Cronômetro visível + atalhos de teclado
- Modo dark/light (3 temas implementados)

---

## PROCESSO DE EXECUÇÃO

### ETAPA 1 — GAP ANALYSIS
Classificar cada função: ✅ EXISTE-OK | ⚡ MELHORAR | ❌ AUSENTE-CRÍTICA | 🔵 AUSENTE-IMPORTANTE | ⬜ OPCIONAL | 🟡 EXCLUSIVO-WF

### ETAPA 2 — ANÁLISE DE EFICIÊNCIA
Para ⚡ MELHORAR: comparar com benchmark, recomendar, decidir

### ETAPA 3 — PLANO DE FASES
Priorizar por: impacto comercial → paridade competitiva → dependência técnica → esforço

### ETAPA 4 — IMPLEMENTAÇÃO
Phase 1: UI com mock → Phase 2: Lógica + estado → Phase 3: Supabase + uazapi

---

## REGRAS INVIOLÁVEIS

**Arquitetura:** RLS em toda tabela, RBAC em toda feature, lógica sensível em Edge Functions
**Design:** CSS variables dos 3 temas, Lucide React, Shadcn/UI
**Performance:** Paginação em listas >50, lazy loading, sem over-fetching
**Qualidade:** Estados: vazio, loading, dados, erro. Responsive obrigatório.
