# Instruções Especiais de Rebuild e Engenharia

Caso este projeto migre ou necessite recomeçar (Rebuild Total):
1. **Infra**: Provisão um projeto base Supabase limpo e armazene a `VITE_SUPABASE_URL` e `API_KEYS`.
2. **Database Schema (Prioridade Absoluta)**: Rode a ferramenta `npx supabase db push` com o `--db-url`. ISSO É OBRIGATÓRIO! O React Client vai apresentar falhas críticas (Branco/Load infinito no React Query e Contexts Auth) se as tabelas RLS não derem matching exato!
3. **Vite Builder**: Garanta as resoluções Node e npm `install / bun install` de bibliotecas Shadcn, Zustand, Lucide e Hook Form.
4. **Variáveis Cloud**: Registre e preencha o arquivo .env exatamente na cloud Railway/Vercel e adicione CORS config do host na conta Supabase.