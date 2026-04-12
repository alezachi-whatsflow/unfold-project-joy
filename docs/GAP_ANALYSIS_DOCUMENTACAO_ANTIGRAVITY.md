# Análise de Lacunas — Documentação Arquitetônica Antigravity
## Mapeamento de Dados Essenciais para Atualização dos Documentos Fundacionais

**Data:** 12 de Abril de 2026
**Versão:** 1.0
**Classificação:** Interno — Arquitetura

---

## Tabela de Dados Faltantes

| Categoria | Dado Faltante a ser extraído do Antigravity | Justificativa (Por que precisamos disso?) | Criticidade |
|-----------|---------------------------------------------|-------------------------------------------|-------------|
| **Técnica** | Configuração de APM (Application Performance Monitoring) — tempo de resposta médio das Edge Functions, latência P95/P99 | Sem APM, não temos baseline de performance para SLAs enterprise (Hastam exige <2min de resposta). Impossível detectar degradação antes do cliente perceber | **Alto** |
| **Técnica** | Rate Limiting por tenant nas Edge Functions e API routes | Sem rate limit, um tenant pode degradar o serviço de todos. Requisito de segurança para operação multi-tenant com 1000+ clientes | **Alto** |
| **Técnica** | Estratégia de backup do PostgreSQL (RPO/RTO) — frequência dos snapshots, retenção, processo de restore | Sem documentação de backup, não temos SLA de recuperação de dados. Risco de perda irreversível em falha do VPS | **Alto** |
| **Técnica** | Configuração de PgBouncer ou connection pooling — modo (session/transaction), pool_size, timeout | Sem pooling, o sistema não escala além de ~500 tenants simultâneos. Gargalo já identificado no Relatório Técnico | **Alto** |
| **Técnica** | Pipeline de CI/CD — testes automatizados, lint, type-check antes do deploy | Hoje o deploy é `git push → Railway auto-deploy` sem gates de qualidade. Risco de regressão em produção a cada commit | **Alto** |
| **Técnica** | Topologia de rede do VPS — firewall rules, portas abertas, IPv6 exposure do Redis | Redis exposto via IPv6 `2804:8fbc:0:5::a152` com portas 16379-16381. Se não há firewall, qualquer scan encontra | **Alto** |
| **Técnica** | Gestão de SSL/TLS — renovação automática (Let's Encrypt/Certbot), expiração do certificado do supabase.whatsflow.com.br | Certificado expirado = downtime total. Sem automação, depende de intervenção manual | **Médio** |
| **Técnica** | CDN/Edge Caching para assets estáticos (JS/CSS/imagens) | Sem CDN, cada request vai até o Railway. Com 1000+ tenants, latência e bandwidth aumentam significativamente | **Médio** |
| **Técnica** | Métricas de filas BullMQ — jobs pendentes, falhas, tempo médio de processamento por lane (core/schedule/campaign) | Sem métricas de fila, não detectamos gargalos no envio de mensagens em massa ou cadências | **Médio** |
| **Técnica** | Inventário de Edge Functions deployadas vs. existentes no código — quais estão ativas, quais falharam no deploy | Existem 65 funções no código mas nem todas estão deployadas (ex: `google-calendar-auth` precisou deploy manual). Risco de funcionalidade "fantasma" | **Médio** |
| **Técnica** | Logs estruturados — formato, retenção, ferramenta de consulta (Pino no worker, console.log nas Edge Functions) | Sem logs estruturados centralizados, debugging em produção depende de acesso SSH ao container | **Médio** |
| **Técnica** | Particionamento de tabelas grandes — `whatsapp_messages` (>1M rows previstas), estratégia de archive | Sem particionamento, queries de conversas históricas degradam exponencialmente com o crescimento | **Baixo** |
| | | | |
| **Negócio** | Lifecycle completo da assinatura Asaas — criação, upgrade, downgrade, cancelamento, inadimplência | Documentado parcialmente (setup funciona), mas o fluxo pós-ativação (upgrade de plano, dunning, churn) não está formalizado | **Alto** |
| **Negócio** | Mapeamento de feature flags ativos vs. módulos licenciados — qual flag controla qual módulo, por plano | Tabela `nexus_feature_flags` existe mas não há documentação de quais flags são obrigatórias por tier (Solo, Pro, Enterprise) | **Alto** |
| **Negócio** | Processo de onboarding de novo tenant — wizard steps, dados mínimos obrigatórios, ativação da licença | Wizard existe (`WizardLayout`) mas não há checklist formal do que constitui um tenant "pronto para operar" | **Médio** |
| **Negócio** | Métricas de consumo por tenant — mensagens enviadas/mês, storage usado, chamadas de API, agentes IA | `useLicenseLimits` verifica limites mas não há dashboard de consumo visível para o tenant ou para o Nexus | **Médio** |
| **Negócio** | Hierarquia de permissões completa — todas as combinações role × module × action documentadas | `usePermissions` e `PermissionGate` existem com RBAC, mas a matrix completa de quem pode o quê não está formalizada | **Médio** |
| **Negócio** | Processo de offboarding — o que acontece quando um tenant cancela (dados retidos por 30 dias, deletion cascade, LGPD) | Política de Privacidade menciona 30 dias mas não há edge function ou processo automatizado para isso | **Médio** |
| **Negócio** | Data export endpoint para LGPD — portabilidade de dados conforme Art. 18 da LGPD | Página de privacidade promete portabilidade mas não há endpoint implementado para exportar dados do tenant | **Médio** |
| **Negócio** | White Label provisioning automatizado — processo de criar novo partner (WL config, branding, sub-licenses) | Hoje é manual via Nexus. Para escalar a 10+ partners, precisa de self-service ou API | **Baixo** |
| | | | |
| **UX** | Code splitting / lazy loading de rotas — quais páginas são carregadas sob demanda | Bundle principal tem 3.8MB (gzip ~1MB). Sem code splitting, first load é pesado em conexões lentas | **Alto** |
| **UX** | Service Worker / PWA — status atual (desabilitado por bug de cache), plano de reativação | PWA desabilitada explicitamente no `vite.config.ts`. Impacta experiência mobile e offline | **Médio** |
| **UX** | Métricas de UX — Core Web Vitals (LCP, FID, CLS), tempo de first meaningful paint | Sem métricas de UX, não sabemos se a experiência está degradando com novos features | **Médio** |
| **UX** | Padrão de loading states — quais componentes usam Skeleton vs. Spinner vs. nenhum | Inconsistência visual: algumas telas mostram Loader2 spin, outras ficam em branco até carregar | **Baixo** |
| **UX** | Otimização de imagens — pipeline WebP/AVIF, resize on upload, thumbnails para chat | Imagens de chat são servidas em tamanho original. Com alto volume, bandwidth e tempo de render aumentam | **Baixo** |
| **UX** | Temas visuais documentados — tokens completos de cada tema (Café Noturno, Pacífico, Cosmos) | Pacífico foi reescrito 3 vezes nesta sessão. Sem spec formal, cada mudança gera inconsistência | **Baixo** |
| | | | |
| **Segurança** | Sanitização de HTML (DOMPurify) em componentes que usam `dangerouslySetInnerHTML` | `FaturaView.tsx` e `chart.tsx` usam `dangerouslySetInnerHTML` sem sanitização. Vetor de XSS | **Alto** |
| **Segurança** | Headers de segurança HTTP — CSP (Content-Security-Policy), X-Frame-Options, X-Content-Type-Options | Sem CSP, a aplicação é vulnerável a injeção de scripts terceiros e clickjacking | **Alto** |
| **Segurança** | MFA/2FA — implementação de TOTP para roles administrativos (god_admin, wl_admin) | Apenas senha. Contas admin sem 2FA são alvo prioritário de comprometimento | **Alto** |
| **Segurança** | Política de senha — complexidade mínima, expiração, histórico | Sem enforcement de complexidade, usuários podem usar "123456". GoTrue aceita qualquer senha >6 chars | **Médio** |
| **Segurança** | Session timeout configurável — duração do JWT, refresh token lifetime, forced logout por inatividade | Usa defaults do Supabase GoTrue (1h access, 7d refresh). Sem timeout por inatividade para contextos sensíveis (financeiro) | **Médio** |
| **Segurança** | Auditoria de acessos privilegiados — log de quem acessou dados de qual tenant via "Acessar como Admin" | Botão "Acessar como Admin" existe no Nexus mas as ações durante impersonação não são auditadas separadamente | **Médio** |
| **Segurança** | Criptografia de API keys em repouso — `google_client_secret`, `asaas_api_key` armazenados em plaintext nas tabelas | Embora Supabase criptografe o disco, as keys são legíveis via queries SQL por qualquer service_role | **Médio** |
| **Segurança** | CORS restritivo nas Edge Functions — `google-calendar-auth/callback` usam `Access-Control-Allow-Origin: *` | Wildcard CORS permite que qualquer domínio chame as edge functions. Deveria restringir a domínios autorizados | **Médio** |
| **Segurança** | Rate limiting nas Edge Functions — prevenção de brute force e abuse | Sem rate limit, atacante pode fazer 1000 requests/s para qualquer edge function | **Médio** |
| **Segurança** | Validação de webhook signatures — HMAC verification em uazapi-webhook e meta-webhook | uazapi-webhook não valida HMAC signature. Qualquer request com o formato correto é aceito como legítimo | **Baixo** |

---

## Priorização por Impacto

### Críticos (Resolver antes de escalar para 100+ tenants)
1. Rate limiting (Técnica + Segurança)
2. Backup strategy (Técnica)
3. DOMPurify / XSS protection (Segurança)
4. Security headers CSP (Segurança)
5. Connection pooling / PgBouncer (Técnica)
6. MFA para admins (Segurança)
7. APM / observability (Técnica)

### Importantes (Resolver antes de 500+ tenants)
8. Code splitting / lazy loading (UX)
9. LGPD data export endpoint (Negócio)
10. CI/CD pipeline com testes (Técnica)
11. Lifecycle billing Asaas completo (Negócio)
12. BullMQ metrics dashboard (Técnica)
13. Feature flags × tier matrix (Negócio)

### Planejados (Resolver antes de 1000+ tenants)
14. CDN para assets (Técnica)
15. PWA reativação (UX)
16. Table partitioning (Técnica)
17. Image optimization pipeline (UX)
18. WL self-service provisioning (Negócio)

---

*IAZIS — Ambient Intelligence*
*Análise de Lacunas v1.0 · Abril 2026*
