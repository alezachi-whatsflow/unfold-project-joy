-- ============================================================
-- TABLE COMMENTS: Metadados para documentação e escala
-- Cada tabela recebe COMMENT com: função + nível de permissão
-- Níveis: NEXUS (god-level), WL (whitelabel), TENANT (operacional)
-- ============================================================

-- ══ CORE MULTI-TENANT ══
COMMENT ON TABLE public.tenants IS 'Empresas/organizações. Cada tenant é uma empresa cliente. Nível: NEXUS (criação), TENANT (leitura).';
COMMENT ON TABLE public.accounts IS 'Contas de alto nível (direct_client, wl_client). Vincula tenants a licenças e whitelabels. Nível: NEXUS.';
COMMENT ON TABLE public.user_tenants IS 'Vínculo N:N entre auth.users e tenants. Define acesso do usuário aos tenants. Nível: TENANT.';
COMMENT ON TABLE public.profiles IS 'Perfil do usuário: role, custom_permissions, avatar, signature. Extends auth.users. Nível: TENANT.';
COMMENT ON TABLE public.licenses IS 'Licença de uso: plano, limites de dispositivos/atendentes, módulos IA, pricing_config. 1:1 com tenant. Nível: NEXUS (CRUD), TENANT (leitura).';
COMMENT ON TABLE public.license_history IS 'Histórico de alterações em licenças: upsell, renewal, suspension. Auditoria imutável. Nível: NEXUS.';

-- ══ NEXUS ADMIN ══
COMMENT ON TABLE public.nexus_users IS 'Equipe interna Whatsflow. Roles: superadmin, dev_senior, suporte, financeiro, CS. Nível: NEXUS.';
COMMENT ON TABLE public.nexus_audit_logs IS 'Log de auditoria imutável do Nexus: login, block, impersonate, config changes. Nível: NEXUS.';
COMMENT ON TABLE public.nexus_feature_flags IS 'Feature flags globais para rollout gradual. Nível: NEXUS.';
COMMENT ON TABLE public.nexus_tickets IS 'Tickets de suporte interno do Nexus. Nível: NEXUS.';

-- ══ WHITELABEL ══
COMMENT ON TABLE public.whitelabel_branding IS 'Branding customizado por WhiteLabel: logo, cores, domínio, suporte. Nível: WL.';

-- ══ MENSAGERIA ══
COMMENT ON TABLE public.whatsapp_instances IS 'Dispositivos WhatsApp Web (uazapi v2). Cada instância = 1 número conectado. Nível: TENANT.';
COMMENT ON TABLE public.whatsapp_messages IS 'Todas as mensagens de todos os canais (WhatsApp, Telegram, Instagram, ML). Tabela de maior volume. Nível: TENANT.';
COMMENT ON TABLE public.whatsapp_contacts IS 'Contatos sincronizados dos dispositivos. Nome, foto, telefone. Nível: TENANT (via instance_name).';
COMMENT ON TABLE public.whatsapp_leads IS 'Leads de vendas originados do WhatsApp. Status de funil, tags, atribuição. Nível: TENANT.';
COMMENT ON TABLE public.whatsapp_campaigns IS 'Campanhas de envio em massa. Status, progresso, delay config. Nível: TENANT.';
COMMENT ON TABLE public.whatsapp_groups IS 'Grupos WhatsApp com kanban board. Atribuição, SLA, tags. Nível: TENANT.';
COMMENT ON TABLE public.group_kanban_columns IS 'Colunas do kanban de grupos. Posição, cor, SLA. Nível: TENANT.';
COMMENT ON TABLE public.group_attributions IS 'Atribuição agente↔grupo para shared inbox. Nível: TENANT.';
COMMENT ON TABLE public.channel_integrations IS 'Integrações multi-canal: WABA, Instagram, Telegram, Messenger, ML. OAuth tokens. Nível: TENANT.';
COMMENT ON TABLE public.message_logs IS 'Log de entrega de mensagens para debugging. Legado. Nível: TENANT.';

-- ══ COMUNICAÇÕES UNIFICADAS ══
COMMENT ON TABLE public.conversations IS 'Estado de conversa/ticket unificado. Status, canal, SLA, sentiment. Nível: TENANT.';
COMMENT ON TABLE public.chat_messages IS 'Mensagens unificadas multi-canal com notas internas. Nível: TENANT.';

-- ══ CRM / VENDAS ══
COMMENT ON TABLE public.sales_pipelines IS 'Pipelines de vendas com stages e card_schema (JSONB dinâmico). Nível: TENANT.';
COMMENT ON TABLE public.negocios IS 'Negócios/oportunidades do CRM. custom_fields, produtos, histórico. Tabela core de vendas. Nível: TENANT.';
COMMENT ON TABLE public.crm_contacts IS 'Contatos unificados do CRM. Nome, telefone, email, tags, stage. Nível: TENANT.';
COMMENT ON TABLE public.activities IS 'Tarefas, reuniões e follow-ups. Kanban de atividades. Nível: TENANT.';
COMMENT ON TABLE public.customers IS 'Clientes cadastrados. Endereço, documentos, dados comerciais. Nível: TENANT.';

-- ══ FINANCEIRO ══
COMMENT ON TABLE public.asaas_connections IS 'Conexões com Asaas (sandbox/production). API key, webhook token. Nível: TENANT.';
COMMENT ON TABLE public.asaas_payments IS 'Cobranças sincronizadas do Asaas. PIX, Boleto, Cartão. Nível: TENANT.';
COMMENT ON TABLE public.asaas_customers IS 'Clientes sincronizados do Asaas. CPF/CNPJ, endereço. Nível: TENANT.';
COMMENT ON TABLE public.asaas_expenses IS 'Despesas com suporte a IA (extração de recibos). Categorias, anexos. Nível: TENANT.';
COMMENT ON TABLE public.asaas_revenue IS 'Receitas por período e categoria. Nível: TENANT.';
COMMENT ON TABLE public.financial_entries IS 'Consolidado mensal: MRR, custos, clientes, cash balance. Nível: TENANT.';
COMMENT ON TABLE public.checkout_sessions IS 'Sessões de checkout: plano, extras, pagamento. Fluxo de ativação. Nível: NEXUS.';

-- ══ FISCAL ══
COMMENT ON TABLE public.fiscal_configurations IS 'Config fiscal do tenant: CNPJ, regime tributário, endereço. Nível: TENANT.';
COMMENT ON TABLE public.fiscal_notes IS 'Notas fiscais (NFS-e, NF-e). Itens, tributos, status. Nível: TENANT.';
COMMENT ON TABLE public.tax_configurations IS 'Configurações tributárias por escopo (municipal, estadual, federal). Nível: TENANT.';
COMMENT ON TABLE public.fiscal_certificates IS 'Certificados digitais A1. Status, validade, ambiente. Nível: TENANT.';

-- ══ PRODUTOS ══
COMMENT ON TABLE public.products IS 'Catálogo de produtos/serviços. Preço, custos, MRR, métricas. Compartilhado com pipeline. Nível: TENANT.';

-- ══ BILLING / CHECKOUT ══
COMMENT ON TABLE public.checkout_connections IS 'Conexões com gateways de pagamento. Credenciais criptografadas. Nível: TENANT.';
COMMENT ON TABLE public.billing_presets IS 'Templates de cobrança reutilizáveis. Nível: TENANT.';

-- ══ IA / INTELIGÊNCIA ══
COMMENT ON TABLE public.ai_configurations IS 'Chaves de API de IA (OpenAI, Anthropic, Gemini, Firecrawl, Apify). Tenant-specific ou global. Nível: TENANT/NEXUS.';
COMMENT ON TABLE public.ai_playbooks IS 'Playbooks de IA: agentes autônomos para coleta de dados via WhatsApp. Limite: 20/tenant. Nível: TENANT.';
COMMENT ON TABLE public.ai_playbook_sessions IS 'Sessões de execução de playbooks. Status, dados extraídos, escalação. Nível: TENANT.';

-- ══ SUPORTE / TICKETS ══
COMMENT ON TABLE public.tickets IS 'Tickets de suporte com referência polimórfica (CRM, WhatsApp). Chat dual. Nível: TENANT.';
COMMENT ON TABLE public.ticket_messages IS 'Mensagens de tickets: is_internal separa equipe de cliente. Nível: TENANT.';

-- ══ COMUNICAÇÕES AGENDADAS ══
COMMENT ON TABLE public.scheduled_communications IS 'Agendamento de WhatsApp/Email/SMS futuros. Criado pelo Assistente Autônomo. Nível: TENANT.';

-- ══ INTELIGÊNCIA DIGITAL ══
COMMENT ON TABLE public.web_scraps IS 'Scraping de websites via Firecrawl. Markdown, links, SEO. Nível: TENANT.';
COMMENT ON TABLE public.profiles_analysis IS 'Análise de perfis Instagram. Followers, engagement, authority score. Nível: TENANT.';
COMMENT ON TABLE public.business_leads IS 'Leads de prospecção via Google Maps. Rating, reviews, contato. Nível: TENANT.';
COMMENT ON TABLE public.digital_analyses IS 'Análises digitais consolidadas. Score geral, por canal, detalhes. Nível: TENANT.';

-- ══ CONFIGURAÇÕES ══
COMMENT ON TABLE public.departments IS 'Departamentos/setores da equipe. Distribuição round-robin. Nível: TENANT.';
COMMENT ON TABLE public.sla_rules IS 'Regras de SLA por departamento. Tempo de resposta, resolução. Nível: TENANT.';
COMMENT ON TABLE public.quick_replies IS 'Respostas rápidas (atalhos /). Shortcut, body, variáveis. Nível: TENANT.';
COMMENT ON TABLE public.tenant_tags IS 'Tags de contato/conversa. Nome, cor, categoria. Nível: TENANT.';
COMMENT ON TABLE public.automation_triggers IS 'Automações por keyword. Trigger → ação (reply, assign, tag). Nível: TENANT.';

-- ══ NOTIFICAÇÕES ══
COMMENT ON TABLE public.notifications IS 'Notificações in-app por categoria (mensageria, CRM, financeiro). Realtime. Nível: TENANT.';
COMMENT ON TABLE public.notification_preferences IS 'Preferências de notificação por usuário. Toggle por categoria + som. Nível: TENANT.';

-- ══ ONBOARDING / MANUAL ══
COMMENT ON TABLE public.onboarding_steps IS 'Progresso do onboarding interativo por usuário. Nível: TENANT.';
COMMENT ON TABLE public.manual_articles IS 'Artigos do manual de uso. Categorias, markdown, progresso. Nível: GLOBAL.';

-- ══ DATA LIFECYCLE / LGPD ══
COMMENT ON TABLE public.data_lifecycle_queue IS 'Fila de operações de lifecycle: encrypt, delete, archive. Nível: SERVICE_ROLE.';
COMMENT ON TABLE public.tenant_encryption_keys IS 'Chaves AES-256 por tenant para criptografia de arquivos >6 meses. Nível: SERVICE_ROLE.';
