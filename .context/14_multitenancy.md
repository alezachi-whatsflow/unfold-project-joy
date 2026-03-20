# Multitenancy (Isolamento de Contas)

O sistema possui um Multitenancy Forte operado com a lógica B2B SaaS.

**Identificação (Como Funciona)**
1. O Usuário X loga.
2. O App `useUserTenants` `useCompanyProfile` resgata O `tenant` ativo do localStorage ou da primeira indexação da DB.
3. Se um usuário pertencer a múltiplos Tenants, ele pode trocar explicitamente de Workspace.

**Isolamento dos Dados (Banco de Dados RLS)**
Todas as policies (Políticas) do PostgREST validam isso usando funções JWT em PL/pgSQL. 
Se um Client em Vite mandar um `select * from leads` sem passar a ID do Tenant, ou passar um Tenant que ele não pertence, o PostgreSQL devolve `[]` vazios ou Access Denied graças aos RLS.

**Impacto Backend e Frontend**: É obrigatório injetar explicitamente os headers de Tenant ou enviar o ID do tenant em criações C.R.U.D caso o default do banco não seja configurado nativamente.