# Ambiente e Infraestrutura (.env)

**Variáveis Necessárias Padrão**:
- `VITE_SUPABASE_URL`: (Obrigatório) Domínio projeto *.supabase.co. Usado pelo cliente Vite.
- `VITE_SUPABASE_ANON_KEY`: (Obrigatório) Chave anon JWT, segura pro front-end fazer queries RLS.
- `VITE_SUPABASE_PROJECT_ID`: Reflete a identificação única do projeto.
- `SUPABASE_SERVICE_ROLE_KEY`: (Privado/Obrigatório no Node backend) Chave Root de bypass para migrations ou funções administrativas locais de Deploy. Não vaza para o Output do Build se não utilizar VITE prefix.

**Infraestrutura de Build**: App Vite padrão, pode ser hosteada em Railway estático, Netlify, Vercel ou S3 Cloudflare Pages.
O Banco é integralmente PaaS gerenciado via Supabase / AWS com PgBouncer Pooling habilitado (Porta `5432` e Pooler URI `6543`).