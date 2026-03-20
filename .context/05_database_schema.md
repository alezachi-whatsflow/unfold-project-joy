# Schema de Banco de Dados

**Engine**: PostgreSQL 15+ hospedado no AWS via Supabase.

## Tabelas Extraídas da Migração (Módulo Principal)
Foram listadas as seguintes tabelas / instâncias de objetos criados:
- **`tenants`**
- **`asaas_connections`**
- **`asaas_customers`**
- **`checkout_sources`**
- **`sales_people`**
- **`asaas_payments`**
- **`asaas_splits`**
- **`asaas_expenses`**
- **`revenue_rules`**
- **`dunning_rules`**
- **`dunning_executions`**
- **`webhook_events`**
- **`profiles`**
- **`payment_dunnings`**
- **`tasks`**
- **`web_scraps`**
- **`profiles_analysis`**
- **`business_leads`**
- **`financial_entries`**
- **`digital_analyses`**
- **`export_logs`**
- **`customers`**
- **`asaas_revenue`**
- **`commission_rules`**
- **`negocios`**
- **`prospect_campaigns`**
- **`whatsapp_instances`**
- **`message_logs`**
- **`whatsapp_billing_rules`**
- **`whatsapp_messages`**
- **`whatsapp_campaigns`**
- **`whatsapp_contacts`**
- **`whatsapp_leads`**
- **`user_tenants`**
- **`licenses`**
- **`meta_connections`**
- **`sales_pipelines`**
- **`audit_logs`**
- **`license_history`**
- **`notifications`**
- **`crm_contacts`**
- **`conversations`**
- **`chat_messages`**
- **`whatsapp_connections`**
- **`manual_articles`**
- **`manual_progress`**
- **`tutorials`**
- **`tutorial_progress`**
- **`onboarding_steps`**
- **`community_posts`**
- **`nexus_users`**
- **`nexus_license_usage`**
- **`nexus_audit_logs`**
- **`nexus_feature_flags`**
- **`nexus_license_feature_flags`**
- **`nexus_tickets`**
- **`whitelabel_config`**
- **`tenant_sync_configs`**
- **`tenant_sync_logs`**
- **`company_profile`**
- **`icp_profiles`**
- **`icp_questionnaires`**
- **`knowledge_base`**
- **`audit_evaluations`**
- **`audit_reports`**
- **`activities`**

**Visões (Views)**:


**Funções RLS Específicas / RPC**:
- `handle_new_user() ` (Acesso direto via supabase.rpc)
- `get_my_role() ` (Acesso direto via supabase.rpc)
- `get_my_tenant_ids() ` (Acesso direto via supabase.rpc)
- `handle_new_user_tenant() ` (Acesso direto via supabase.rpc)
- `set_whatsapp_messages_updated_at() ` (Acesso direto via supabase.rpc)
- `is_superadmin() ` (Acesso direto via supabase.rpc)
- `log_audit() ` (Acesso direto via supabase.rpc)
- `calculate_mrr() ` (Acesso direto via supabase.rpc)
- `is_nexus_user() ` (Acesso direto via supabase.rpc)
- `get_nexus_role() ` (Acesso direto via supabase.rpc)
- `validate_license_type() ` (Acesso direto via supabase.rpc)
- `handle_user_confirmed() ` (Acesso direto via supabase.rpc)

### Relações Focais do Produto
- `users` e `tenants` (Workspace) - Uma junção M-N tipicamente usando `tenant_users` / `workspace_members`.
- `negocios` (CRM): Relaciona-se com `tenants`, `users` (consultor), `clientes`. Possui controle detalhado do funil de vendas (`fase_id`).
- Todos os registros chave (`clientes`, `negocios`, etc.) **sempre** tem uma constraint PK/UUID e a coluna `tenant_id` para referenciar o multitenancy.

**Riscos ao Alterar Tabelas**: A quebra de um RLS Policy ou exclusão (cascade) de um usuário dono de tenant afeta a cascata completa das contas! NÃO altere restrições RLS em tabelas sensíveis sem recriá-las.