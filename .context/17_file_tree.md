# Árvore de Arquivos Críticos do Projeto

```
/
├── supabase/
│   ├── migrations/      # Todas as 45+ migrações SQL definindo estruturas (PONTO MAIS CRÍTICO DE ENGENHARIA DO DB)
│   └── functions/       # (Se houver) Supabase Edge functions Deno base/ts.
├── src/
│   ├── App.tsx          # Roteador mestre do React Router Dom interno ao código.
│   ├── components/      # (ui, dashboard, CRM_parts)
│   │   ├── vendas/      # Modais e Telas densas de controle do CRM de Leads, Drawer e Kanban (VendasPipeline).
│   │   └── auth/        # Acesso Gateways, wrappers React que gerenciam bloqueios de telas não-logadas.
│   ├── pages/           # Camada Final das Views de URL
│   ├── hooks/           # Camada Model-Controller onde lógicas Supabase SDK e stores de context operam.
│   ├── types/           # Tipagens estritas do TypeScript garantindo integridade das regras da tabela.
│   └── lib/             # Shadcn formatters / Axios wrappers.
├── package.json         # Gestor Vite de deps e scripts.
└── .env                 # Segredos não "commitáveis" base.
```