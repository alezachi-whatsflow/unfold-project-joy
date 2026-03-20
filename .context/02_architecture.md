# Arquitetura do Sistema

A arquitetura segue o modelo moderno de **Backend as a Service (BaaS)** impulsionado por reatividade no frontend.

## Diagrama Lógico (Textual)
[ UI Client - Vite/React SPA ] <----(HTTPS / WSS)----> [ Supabase API Gateway ]
       |                                                    |--- Auth (GoTrue)
       |--> [ Componentes Shadcn ]                          |--- DB (Postgres via PostgREST)
       |--> [ Estado Global / React Query ]                 |--- Storage
       |--> [ Rotas React Router ]                          |--- Edge Functions (Deno) <---> [ Asaas / OpenAI / Evolution API ]

## Backend e Banco
- **Postgres (Supabase)**: Banco relacional atuando como a única fonte da verdade. O RLS é o guardião dos dados multitenancy.
- **Edge Functions**: Scripts serverless hospedados no Supabase para rodar lógicas críticas que expõem credenciais privadas (Webhook de PIX, integração Whatsapp API oficial/Evolution).

## Organização Front-end
- Arquitetura baseada em features em `src/`: `pages/`, `components/`, `hooks/` para regras de negócios (ex: `useNegocios`, `useICPProfile`), e `lib/` para configurações e utils gerais.

STATUS RLS: Implementado nativamente usando `auth.uid()` e junções na tabela de filiação de workspace.