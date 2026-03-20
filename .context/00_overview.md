# Visão Geral do Sistema (Overview)

**Nome do Projeto**: vite_react_shadcn_ts
**Objetivo do Sistema**: Plataforma B2B para gestão empresarial unificada integrando inteligência digital, vendas (CRM), financeiro (asaas), mensageria (whatsapp) e IA (auditoria e interações).
**Problema Que Resolve**: Fragmentação de dados em múltiplas ferramentas, falta de análise de leads inteligente e multitenancy inadequado para PMEs.
**Público-Alvo**: Empresas, indústrias, e negócios que precisam gerenciar fluxo de vendas, leads (digital intelligence) e cobranças (Asaas) dentro do mesmo ecossistema com suporte multicontas.

**Stack Tecnológica:**
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn/UI, React Router, React Query, React Hook Form + Zod, Zustand/Contexts.
- **Backend / Infra**: Supabase (PostgreSQL, Edge Functions Deno, Storage, Auth), Evolution API (Instância WA), Node.js (scripts utilitários).

**Principais Módulos:**
- CRM Vendas (Pipeline, Leads, Qualificação ICP)
- Digital Intelligence (Análise de sites/Google Maps)
- Financeiro (Receitas, Despesas, Fiscal, Comissões, Assinaturas Asaas)
- Integrações WhatsApp (Mensageria, evolution-api)
- Configurações, Perfil, Multitenancy/Superadmin
- IA Skills & IA Auditor (Automatizações via OpenAI)

**Status Atual**: Em Produção (Parcial/Evolutivo)
**Funcionalidades Implementadas**: Autenticação, Multitenancy por License/Tenant, CRM de Vendas Completo, Cobranças Asaas, API de Wa/EvolutionAPI Básica.