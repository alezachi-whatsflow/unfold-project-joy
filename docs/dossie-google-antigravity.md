# Dossiê Técnico: Google Antigravity — IDE Agent-First

> Versão corrigida e verificada com fontes públicas (março 2026)

---

## 1. Visão Geral

O **Google Antigravity** é um ambiente de desenvolvimento (IDE) *agent-first* criado pela equipe **Advanced Agentic Coding do Google DeepMind**. Anunciado em **18 de novembro de 2025** junto com o lançamento do Gemini 3, está disponível em *public preview* gratuito para indivíduos, compatível com macOS, Windows e Linux.

Diferente de assistentes de autocompletar, o Antigravity é um **orquestrador de engenharia de software autônomo** — a IA não apenas responde a prompts, mas planeja, executa, valida e itera em tarefas complexas com mínima intervenção humana.

**Fundação técnica:**
- Fork nativo e completo do **VS Code** (não é sandbox isolado)
- Acesso irrestrito ao sistema de arquivos e terminal local
- Suporte multi-modelo: **Gemini 3.1 Pro** (High/Low), **Gemini 3 Flash**, **Claude Sonnet 4.6**, **Claude Opus 4.6**, **GPT-OSS 120B**

**Pricing:**
- **Gratuito** — todos os modelos com rate limits (refresh ~5h)
- **AI Pro** — $20/mês (limites expandidos)

---

## 2. Arquitetura Dual: Editor View + Manager View

O Antigravity opera com duas interfaces fundamentais:

### Editor View
Interface clássica de codificação com **agent sidebar** (similar ao Cursor/GitHub Copilot). O desenvolvedor interage diretamente com um agente de IA para escrever, editar e refatorar código.

### Manager View (Agent Manager)
Painel de controle central para **orquestração de múltiplos agentes** trabalhando em paralelo. Funciona como um "Mission Control" onde você:

- Cria e monitora agentes autônomos executando tarefas assíncronas
- Acompanha progresso em tempo real de múltiplos workspaces
- Pode ter um agente refatorando um módulo legado, outro escrevendo testes unitários, e um terceiro pesquisando uma nova biblioteca — tudo simultaneamente
- Revisa **Artifacts** gerados pelos agentes antes de aprovar mudanças

---

## 3. Sistema Multi-Agente

### Browser Subagent (Interação Visual)
Diferencial crítico do Antigravity. Via **extensão nativa do Chrome** e **Gemini Computer Use**, o agente:

- Lança a aplicação em `localhost` e interage com a UI
- Clica em botões, preenche formulários, navega entre páginas
- Valida layouts responsivos (mobile/desktop) automaticamente
- **Grava todas as ações em vídeo WebP** — criando prova visual verificável
- Captura screenshots automáticos para contexto

### Terminal & File Agents
Trabalham em conjunto para:
- Ler a estrutura inteira do projeto
- Executar scripts no terminal (`npm run build`, `npx tsc`, etc.)
- Modificar múltiplos arquivos simultaneamente
- Gerenciar dependências e configurações

### Knowledge Subagent
Ao final de cada conversa, um agente especializado:
- Analisa a conversa e extrai informações-chave
- Salva como **Knowledge Items (KIs)** — fatos curados que persistem indefinidamente
- Diferente do histórico de conversa (session-bound), KIs são memória permanente

---

## 4. MCP — Model Context Protocol (Integrações Externas)

O MCP atua como ponte segura entre o IDE e serviços externos. Adicionado no início de 2026, permite que agentes se conectem autonomamente a ferramentas externas.

### Integrações disponíveis:
- **Supabase** — Conexão direta ao PostgreSQL. O agente pode analisar esquema ao vivo, escrever políticas RLS, criar tabelas e orquestrar Edge Functions baseado no banco real
- **GitHub** — Gestão de repositórios, PRs, issues diretamente pelo agente
- **APIs externas** — Qualquer serviço que exponha MCP server
- **Bancos de dados** — Consultas diretas e análise de schema

O MCP permite que agentes busquem informações granulares de servidores remotos **dinamicamente e autonomamente**, exatamente quando necessário pela lógica de execução.

---

## 5. Governança, Artefatos e Segurança

### Artifacts (Provas de Trabalho)
Em vez de forçar revisão manual de diffs extensos, os agentes geram **Artifacts** — entregas estruturadas que incluem:

- Planos de implementação e listas de tarefas
- Screenshots e gravações do browser
- Diffs de código anotados
- Logs de raciocínio arquitetural

Isso permite validar o design técnico **antes** de a IA alterar o código.

### Governance UI (Modos de Segurança)
Controlável via settings. No **Strict Mode**:

- Execução no terminal requer **Request Review** (aprovação manual)
- Execução de JS no browser também requer review
- Acesso a arquivos fora do workspace é **proibido**
- Sandboxing habilitado
- Acesso à rede bloqueado

### Context Management (3 Pilares)
1. **Skills** — Capacidades reutilizáveis (ver seção 6)
2. **Knowledge Items** — Memória persistente entre sessões
3. **Artifacts** — Documentação transparente do trabalho

---

## 6. Skills — Capacidades Instaláveis

Skills são o mecanismo primário para definir capacidades reutilizáveis no Antigravity.

### Estrutura:
Cada Skill é um **diretório** contendo:
- `SKILL.md` — Arquivo de definição com frontmatter YAML + instruções Markdown
- Assets opcionais (scripts, referências, templates)

Os agentes **selecionam e ativam Skills automaticamente** baseado no contexto da tarefa.

### Awesome Skills (Comunidade):
Bibliotecas instaláveis com 1.300+ skills para múltiplos IDEs:

```bash
npx antigravity-awesome-skills
```

Instala regras globais em `~/.gemini/antigravity/skills/` para cenários como:
- Auditorias de segurança web
- Criação de APIs REST/GraphQL
- Estruturação de SaaS multi-tenant
- Melhores práticas PostgreSQL/Supabase

### Contexto de Projeto:
Manter arquivos como `AGENTS.md` na raiz do projeto garante que qualquer agente entenda as regras de negócio específicas da plataforma — equivalente ao `CLAUDE.md` do Claude Code.

---

## 7. Comparativo: Antigravity vs Claude Code vs Cursor

| Capacidade | Antigravity | Claude Code | Cursor |
|---|---|---|---|
| **Arquitetura** | Agent-first (multi-agente paralelo) | Single-agent CLI | Editor AI-assisted |
| **Base** | Fork VS Code (GUI) | Terminal CLI | Fork VS Code (GUI) |
| **Modelo principal** | Gemini 3.1 Pro | Claude Opus 4.6 | Múltiplos |
| **Browser Agent** | Sim (Chrome + vídeo) | Não | Não |
| **Multi-agente paralelo** | Sim (Manager View) | Sim (Agent tool) | Não |
| **MCP** | Sim | Sim | Sim |
| **Artifacts visuais** | Sim (screenshots, vídeos) | Não | Não |
| **Knowledge Items** | Sim (persistência automática) | Memory system (manual) | Não |
| **Skills/Rules** | SKILL.md (auto-seleção) | CLAUDE.md + skills | .cursorrules |
| **Gratuito** | Sim (com rate limits) | Não ($20/mês) | Não ($20/mês) |
| **Governance UI** | Sim (Strict Mode) | Permission modes | Não |

---

## 8. Aplicação no Whatsflow

Para o contexto do Whatsflow (React + Supabase + Railway), as capacidades mais relevantes são:

1. **Browser Agent** — Validação visual automática das telas de Mensageria, Vendas, Dashboard
2. **Supabase MCP** — Escrita de políticas RLS, criação de tabelas, debug de Edge Functions diretamente do IDE
3. **Multi-agente** — Um agente refatorando WhatsAppLayout.tsx enquanto outro escreve testes e um terceiro audita segurança
4. **Knowledge Items** — Regras de negócio do multi-tenant (Nexus → WhiteLabel → Tenant) persistem entre sessões
5. **Skills** — Padronização de como a IA trabalha no projeto (equivalente ao `.context/` docs)

---

## Fontes

- [Build with Google Antigravity (Google Developers Blog)](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/)
- [Google Antigravity — Wikipedia](https://en.wikipedia.org/wiki/Google_Antigravity)
- [Getting Started with Google Antigravity (Google Codelabs)](https://codelabs.developers.google.com/getting-started-google-antigravity)
- [Antigravity Agent Manager Explained (Arjan KC)](https://www.arjankc.com.np/blog/google-antigravity-agent-manager-explained/)
- [Context Management Strategies for Google Antigravity](https://datalakehousehub.com/blog/2026-03-context-management-google-antigravity/)
- [Antigravity Architecture Deep Dive (SmartScope)](https://smartscope.blog/en/generative-ai/google-gemini/antigravity-architecture-deep-dive/)
- [Antigravity Awesome Skills (GitHub)](https://github.com/sickn33/antigravity-awesome-skills)
- [Authoring Antigravity Skills (Google Codelabs)](https://codelabs.developers.google.com/getting-started-with-antigravity-skills)
- [Antigravity Codes — 1,500+ MCP Servers](https://antigravity.codes/)
- [Google Antigravity Review 2026 (AI Tool Analysis)](https://aitoolanalysis.com/google-antigravity-review/)
