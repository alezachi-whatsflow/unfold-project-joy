# Deploy & Banco de Dados

## Rodar o ambiente de desenvolvimento local
```bash
npm install # ou bun install
npm run dev # ou bun run dev
```

## Migrações de Banco de Dados
A pasta `supabase/migrations/` guarda dezenas de arquivos (timestamp_*_uuid.sql).
Eles **NÃO DEVEM** ser rodados manualmente copiando no SQL Editor.
Para rodar para produção, o Supabase CLI é usado (ex. no Railway Deploy ou Terminal):
```bash
npx supabase db push --db-url "postgres://postgres..."
```
O script utilitário `reset_db.cjs` existe localmente na premissa como "nuclear fallback" para quebrar o schema e resetar conflitos em bases limpas. **STATUS**: Cuidado.

## Deploy p/ Produção
O projeto é integrado ao GitHub via *Railway* onde `npm run build` empacota arquivos otimizados gerando a pasta `/dist/` do VITE.
A hospedagem resolve requisições Client-Side (SPA) interceptando tudo para `index.html`.