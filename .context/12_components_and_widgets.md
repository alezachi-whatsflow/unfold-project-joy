# Componentes e Widgets Shared

Base do UI: **Shadcn/UI** e RadixPrimitives instalados através de scripts `npx shadcn@latest add`, resultando em dezenas de arquivos limpos em `src/components/ui/`.

**Componentes Customizados Core**:
- `NegocioDrawer`: Componente robusto de `> 500 linhas` lidando com a camada "Card do Negócio" no CRM. Gerencia status, score de IA, relatórios em tempo de renderização com print HMTL, notas históricas, Link para Wa.me em tags e nome.
- `PipelineManager`: Gerenciador de colunas de Kanban.
- `VendasPipeline` e `VendasLista`: Visualizações intercaláveis para o objeto `negocios`.
- `PermissionGate`: Widget HOC (Higher-Order Component) blindando renderizações de base nos perigos ACL (Access Control) dos usuários do sistema.