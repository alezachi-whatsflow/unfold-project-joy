# Fluxo de Dados (Data Flow)

**1. Fluxo de Criação (Autenticação / Registro)**
`Frontend UI (SignUp)` -> `Supabase Auth (GoTrue)` -> Supabase emite email mágico / Token OTP -> Trigger SQL executa `handle_new_user()` -> Cria linha default em tabelas de Perfil / Tenant -> Retorna `Session JWT` ao Frontend -> `useAuth.tsx` decodifica e renderiza Rota Protegida.

**2. Fluxo CRM de Inserção de Lead**
`Interface DataInputPage / NegocioCreateModal` `->` Zod Schema Validation `->` RPC ou Supabase Insert RPC/Tabela `negocios` `->` DB verifica RLS usando `jwt() -> auth.uid()` `->` Se permitido, grava na tabela com `tenant_id` implícito / explícito `->` Cliente recebe Toast Status "Lead Cadastrado".

**3. Fluxo Digital Intelligence**
`Backend / Script Externo ou Func` que faz Scraping / Captura de Domínio de Mapas `->` Recebe Data `->` Supabase API insere na Pipeline do Tenant correspondente as anotações do lead capturado como `prospeccao`. Frontend assina Realtime ou faz refetches de React Query ao entrar no `VendasPipeline.tsx`.