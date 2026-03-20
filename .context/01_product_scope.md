# Escopo do Produto

## Módulos e Funcionalidades (Implementado)
- **CRM Vendas**: DrawerDetalhes, Kanban Pipeline, Tabela de Listagem. Criação de Negócios, Alteração de Status, Previsões Financeiras e Vínculos WA. Score de ICP Profile e geração rápida de relatórios de leads.
- **Cobranças/Financeiro**: Extratos, geração de PIX e links (Integração ASAAS parcial).
- **Multitenancy**: Sistema isola dados por `tenant_id` usando RLS (Row Level Security) nativo do Supabase. Criação de convites (invites) para empresas.
- **Inteligência**: Prospecção digital (Digital Intelligence) com IA/Scraping analisando pontuação (Score) de domínios ou locais de mapa.

## Funcionalidades Planejadas/Parciais
- Relatórios avançados de IA Auditor.
- Controle unificado Multi-Tenant (Interface visual do superadmin STATUS: Parcial).
- Automação complexa de fluxos de E-mail/WhatsApp via triggers pgbouncer.

## Atores / Tipos de Usuários
1. **Super Admin**: Acesso raiz à instância do Supabase e painel de superadmin para gerenciar Tenants completos e pagamentos globais.
2. **Owner/Admin do Tenant**: Dono da conta, cadastra membros, configura Asaas, WA API, cria filiais.
3. **Membro / Vendedor**: Trabalha no CRM Pipeline usando permissões básicas configuradas (`usePermissions.ts`). Restrito por licenças.