# Frontend

**Frameworks**: React 18, compilado por Vite usando o plugin `@vitejs/plugin-react-swc`.
**Sistema de Rotas**: `react-router-dom` com lazy loading (componentes carregados sob demanda). As rotas raízes ficam em `src/App.tsx` ou `src/Index.tsx`.

**Estrutura de Páginas Encontradas**:
- `AcessoNegadoPage`
- `ActivitiesPage`
- `AnalyticsPage`
- `AssinaturaPage`
- `CobrancasPage`
- `ComissoesPage`
- `ConversationsPage`
- `CrmPage`
- `CustomersPage`
- `DataInputPage`
- `ExpensesPage`
- `FiscalPage`
- `ForgotPasswordPage`
- `HomePage`
- `IAAuditorPage`
- `IASkillsPage`
- `Index`
- `IntegracoesPage`
- `IntelligencePage`
- `LoginPage`
- `ManualPage`
- `MensageriaPage`
- `NotFound`
- `ProductsPage`
- `ProfilePage`
- `ReportsPage`
- `ResetPasswordPage`
- `RevenuePage`
- `SettingsPage`
- `SignupPage`
- `UsersPage`
- `VendasPage`
- `WaConnectionsPage`
- `WhatsAppPage`

**Componentes Chave (UI)**:
- Biblioteca **shadcn/ui** integrando Radix (@radix-ui) para acessibilidade (Modals/Dialogs, Drawers, Tabs, Dropdowns). Tailwind v3.4 com animate para os estilos de classes.
- Gerenciamento de Formulários por **React Hook Form** integrado ao **Zod** para tipagem em tempo real e esquemas de validação no cliente.

**Gerenciamento de Estado**:
- Servidor: **React Query** (assumivelmente para caching e staleness das chamadas `supabase.from`).
- UI Local / Hooks React: Estados voláteis locais `useState` em grande parte, modais globais e contextos Auth em `useAuth.tsx` ou Zustand (se usado internamente).