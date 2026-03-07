# PROMPT COMPLETO — Whatsflow Finance: Níveis de Acesso & Permissões
> Envie **uma fase por vez** no Lovable. Aguarde a confirmação antes de enviar a próxima.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 1 — ESTRUTURA DE ROLES E CONTEXTO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Criar a estrutura base de controle de acesso (RBAC — Role-Based Access Control) com os 5 perfis do sistema, sem ainda alterar nenhuma tela existente.

## 1.1 — Definição dos Perfis (Roles)

Criar o arquivo `src/types/roles.ts` com os tipos e constantes dos perfis:

```typescript
export type UserRole =
  | 'admin'           // Administrador Geral
  | 'gestor'          // Gestor
  | 'financeiro'      // Financeiro
  | 'consultor'       // Consultor Interno
  | 'representante';  // Representante Externo

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:          'Administrador Geral',
  gestor:         'Gestor',
  financeiro:     'Financeiro',
  consultor:      'Consultor Interno',
  representante:  'Representante Externo',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:         '#4ade80',  // verde
  gestor:        '#60a5fa',  // azul
  financeiro:    '#f59e0b',  // âmbar
  consultor:     '#a78bfa',  // roxo
  representante: '#fb923c',  // laranja
};
```

## 1.2 — Matriz de Permissões

Criar o arquivo `src/config/permissions.ts` com a matriz completa de permissões por módulo:

```typescript
// Estrutura: permissions[role][module] = { view, create, edit, delete, export }

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export type ModulePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
};

export type PermissionMatrix = Record<string, ModulePermission>;

export const DEFAULT_PERMISSIONS: Record<string, PermissionMatrix> = {

  admin: {
    dashboard:    { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    cobrancas:    { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    comissoes:    { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    receitas:     { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    despesas:     { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    clientes:     { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    produtos:     { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    fiscal:       { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    intelligence: { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    relatorios:   { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    configuracoes:{ view: true,  create: true,  edit: true,  delete: true,  export: true  },
    usuarios:     { view: true,  create: true,  edit: true,  delete: true,  export: true  },
    inserir_dados:{ view: true,  create: true,  edit: true,  delete: true,  export: true  },
  },

  gestor: {
    dashboard:    { view: true,  create: false, edit: false, delete: false, export: true  },
    cobrancas:    { view: true,  create: true,  edit: true,  delete: false, export: true  },
    comissoes:    { view: true,  create: true,  edit: true,  delete: false, export: true  },
    receitas:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    despesas:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    clientes:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    produtos:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    fiscal:       { view: true,  create: false, edit: false, delete: false, export: true  },
    intelligence: { view: true,  create: false, edit: false, delete: false, export: true  },
    relatorios:   { view: true,  create: false, edit: false, delete: false, export: true  },
    configuracoes:{ view: false, create: false, edit: false, delete: false, export: false },
    usuarios:     { view: true,  create: true,  edit: true,  delete: false, export: false },
    inserir_dados:{ view: true,  create: true,  edit: true,  delete: false, export: false },
  },

  financeiro: {
    dashboard:    { view: true,  create: false, edit: false, delete: false, export: true  },
    cobrancas:    { view: true,  create: true,  edit: true,  delete: false, export: true  },
    comissoes:    { view: true,  create: false, edit: false, delete: false, export: true  },
    receitas:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    despesas:     { view: true,  create: true,  edit: true,  delete: false, export: true  },
    clientes:     { view: true,  create: false, edit: false, delete: false, export: false },
    produtos:     { view: true,  create: false, edit: false, delete: false, export: false },
    fiscal:       { view: true,  create: true,  edit: true,  delete: false, export: true  },
    intelligence: { view: true,  create: false, edit: false, delete: false, export: true  },
    relatorios:   { view: true,  create: false, edit: false, delete: false, export: true  },
    configuracoes:{ view: false, create: false, edit: false, delete: false, export: false },
    usuarios:     { view: false, create: false, edit: false, delete: false, export: false },
    inserir_dados:{ view: true,  create: true,  edit: false, delete: false, export: false },
  },

  consultor: {
    dashboard:    { view: true,  create: false, edit: false, delete: false, export: false },
    cobrancas:    { view: true,  create: false, edit: false, delete: false, export: false },
    comissoes:    { view: true,  create: false, edit: false, delete: false, export: false },
    receitas:     { view: true,  create: false, edit: false, delete: false, export: false },
    despesas:     { view: false, create: false, edit: false, delete: false, export: false },
    clientes:     { view: true,  create: true,  edit: true,  delete: false, export: false },
    produtos:     { view: true,  create: false, edit: false, delete: false, export: false },
    fiscal:       { view: false, create: false, edit: false, delete: false, export: false },
    intelligence: { view: true,  create: false, edit: false, delete: false, export: false },
    relatorios:   { view: true,  create: false, edit: false, delete: false, export: true  },
    configuracoes:{ view: false, create: false, edit: false, delete: false, export: false },
    usuarios:     { view: false, create: false, edit: false, delete: false, export: false },
    inserir_dados:{ view: false, create: false, edit: false, delete: false, export: false },
  },

  representante: {
    dashboard:    { view: true,  create: false, edit: false, delete: false, export: false },
    cobrancas:    { view: false, create: false, edit: false, delete: false, export: false },
    comissoes:    { view: true,  create: false, edit: false, delete: false, export: false },
    receitas:     { view: false, create: false, edit: false, delete: false, export: false },
    despesas:     { view: false, create: false, edit: false, delete: false, export: false },
    clientes:     { view: true,  create: true,  edit: false, delete: false, export: false },
    produtos:     { view: true,  create: false, edit: false, delete: false, export: false },
    fiscal:       { view: false, create: false, edit: false, delete: false, export: false },
    intelligence: { view: false, create: false, edit: false, delete: false, export: false },
    relatorios:   { view: true,  create: false, edit: false, delete: false, export: false },
    configuracoes:{ view: false, create: false, edit: false, delete: false, export: false },
    usuarios:     { view: false, create: false, edit: false, delete: false, export: false },
    inserir_dados:{ view: true,  create: true,  edit: false, delete: false, export: false },
  },
};
```

## 1.3 — Hook de Permissões

Criar `src/hooks/usePermissions.ts`:

```typescript
// Hook que retorna as permissões do usuário logado
// e funções helper para verificar permissões

export function usePermissions() {
  // Obter role do usuário logado (do contexto de auth já existente no projeto)
  // Retornar:
  //   can(module, action): boolean
  //   canView(module): boolean
  //   canCreate(module): boolean
  //   canEdit(module): boolean
  //   canDelete(module): boolean
  //   canExport(module): boolean
  //   userRole: UserRole
  //   isAdmin: boolean
  //   isGestor: boolean
}
```

## 1.4 — Resultado esperado desta fase
- ✅ Arquivo de tipos `roles.ts` criado
- ✅ Matriz de permissões `permissions.ts` criada
- ✅ Hook `usePermissions` criado e funcional
- ✅ Nenhuma tela existente alterada ainda

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 2 — PROTEÇÃO DE ROTAS E SIDEBAR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Aplicar as permissões na navegação: ocultar itens do menu e bloquear rotas que o usuário não tem acesso.

## 2.1 — Componente ProtectedRoute

Criar `src/components/auth/ProtectedRoute.tsx`:

- Recebe `module` e `action` (padrão: `'view'`) como props
- Se o usuário não tiver permissão:
  - Redireciona para `/acesso-negado`
  - OU exibe componente inline de "Acesso Negado" (configurável via prop `inline`)
- Se tiver permissão: renderiza os filhos normalmente

Exemplo de uso:
```tsx
<ProtectedRoute module="fiscal" action="view">
  <FiscalPage />
</ProtectedRoute>
```

## 2.2 — Página de Acesso Negado `/acesso-negado`

Criar página simples com:
- Ícone de cadeado (LockKeyhole do Lucide)
- Título: "Acesso Restrito"
- Texto: "Você não tem permissão para acessar esta área. Entre em contato com o administrador."
- Botão: "Voltar ao Dashboard"
- Estilo: tema dark padrão do projeto, centralizado na tela

## 2.3 — Sidebar com Controle de Visibilidade

No componente Sidebar, aplicar o hook `usePermissions` para:
- **Ocultar completamente** itens que o usuário não tem `view: true`
- **Nunca mostrar item desabilitado** — item invisível é mais seguro que item cinza
- Exceção: Dashboard sempre visível para todos os perfis
- Manter os grupos (labels de seção) visíveis apenas se tiver ao menos 1 item visível no grupo

## 2.4 — Wrapping das Rotas Existentes

Envolver cada rota com `ProtectedRoute` e o module correspondente:

```
/dashboard        → module="dashboard"
/cobrancas        → module="cobrancas"
/comissoes        → module="comissoes"
/receitas         → module="receitas"
/despesas         → module="despesas"
/clientes         → module="clientes"
/produtos         → module="produtos"
/fiscal           → module="fiscal"
/intelligence     → module="intelligence"
/relatorios       → module="relatorios"
/configuracoes    → module="configuracoes"
/inserir-dados    → module="inserir_dados"
```

## 2.5 — Resultado esperado desta fase
- ✅ Rotas protegidas por permissão
- ✅ Redirecionamento para /acesso-negado quando sem permissão
- ✅ Menu lateral exibe apenas itens que o usuário pode acessar
- ✅ Página de Acesso Negado criada com botão de retorno

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 3 — PROTEÇÃO DE AÇÕES DENTRO DAS PÁGINAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Ocultar ou desabilitar botões e ações (criar, editar, excluir, exportar) dentro de cada página conforme o perfil do usuário.

## 3.1 — Componente PermissionGate

Criar `src/components/auth/PermissionGate.tsx`:

```tsx
// Renderiza os filhos apenas se o usuário tiver a permissão
// Props: module, action, fallback (opcional — o que mostrar se não tiver permissão)

<PermissionGate module="cobrancas" action="create">
  <Button>+ Nova Cobrança</Button>
</PermissionGate>

// Com fallback:
<PermissionGate module="clientes" action="delete" fallback={null}>
  <Button variant="destructive">Excluir</Button>
</PermissionGate>
```

Se não houver fallback definido: o componente renderiza `null` (invisível).

## 3.2 — Aplicar PermissionGate nas páginas existentes

Para cada página abaixo, envolver as ações com PermissionGate:

**Cobranças:**
- Botão "Sincronizar" → `action="edit"`
- Botão ações de linha (olho/ações em lote) → `action="edit"`

**Receitas / Despesas:**
- Botão "+ Nova Receita / + Nova Despesa" → `action="create"`
- Botão editar registro → `action="edit"`
- Botão excluir registro → `action="delete"`
- Botão exportar → `action="export"`

**Clientes:**
- Botão "+ Novo Cliente" → `action="create"`
- Botão editar → `action="edit"`
- Botão excluir → `action="delete"`

**Produtos:**
- Botão "+ Novo Produto" → `action="create"`
- Botão editar → `action="edit"`
- Botão excluir → `action="delete"`

**Fiscal:**
- Botão "+ Emitir Nota" → `action="create"`
- Botão cancelar NF → `action="delete"`
- Botão exportar CSV → `action="export"`
- Aba "Configurações Fiscais" inteira → `action="edit"` (oculta a aba se sem permissão)
- Aba "Certificados" → `action="edit"`

**Relatórios:**
- Botão exportar → `action="export"`

## 3.3 — Resultado esperado desta fase
- ✅ Componente PermissionGate criado
- ✅ Botões de criar/editar/excluir/exportar controlados por permissão
- ✅ Usuário sem permissão não vê os botões (invisível, não desabilitado)
- ✅ Sem alteração na lógica de negócio das páginas

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 4 — MÓDULO DE GESTÃO DE USUÁRIOS E PERMISSÕES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Criar a página de gerenciamento de usuários, acessível apenas para Admin e Gestor, onde é possível convidar, editar perfis e personalizar permissões individualmente.

## 4.1 — Adicionar ao Menu Lateral

No grupo **SISTEMA** da sidebar, adicionar:

```
SISTEMA
  - Usuários  ← NOVO (ícone: Users do Lucide) | visível apenas para admin e gestor
  - Configurações
```

Rota: `/usuarios` — protegida com `module="usuarios" action="view"`

## 4.2 — Página de Usuários `/usuarios`

**Header:**
- Título: "Usuários & Permissões"
- Subtítulo: "Gerencie os acessos da equipe ao Whatsflow Finance"
- Botão "+ Convidar Usuário" (apenas admin)

**Cards de resumo (linha superior):**
| Card | Conteúdo |
|------|----------|
| Total de Usuários | Quantidade ativa |
| Admins | Quantidade |
| Gestores | Quantidade |
| Pendentes | Convites aguardando aceite |

**Tabela de usuários:**
| Avatar | Nome | E-mail | Perfil (badge colorido) | Último acesso | Status | Ações |
|--------|------|--------|------------------------|---------------|--------|-------|

Badge de perfil com cor por role (conforme `ROLE_COLORS`):
- 🟢 Administrador Geral
- 🔵 Gestor
- 🟡 Financeiro
- 🟣 Consultor Interno
- 🟠 Representante Externo

Ações por linha (somente para quem tem permissão):
- ✏️ Editar perfil e permissões
- 🔒 Suspender acesso (toggle)
- 🗑️ Remover usuário (somente admin)
- 📧 Reenviar convite (se pendente)

## 4.3 — Modal: Convidar Novo Usuário

Campos:
- Nome completo
- E-mail
- Perfil base: select com os 5 roles (com descrição de cada)
- Módulos com acesso: checklist pré-preenchido conforme o role selecionado (editável)

Botão "Enviar Convite" → toast "✅ Convite enviado para email@exemplo.com"

## 4.4 — Modal: Editar Usuário e Permissões Customizadas

**Aba 1 — Dados do Usuário:**
- Nome, e-mail, cargo/título (campo livre), telefone

**Aba 2 — Perfil Base:**
- Select do role base
- Texto explicativo: "As permissões abaixo são baseadas no perfil selecionado. Você pode personalizá-las individualmente."

**Aba 3 — Permissões Customizadas:**

Tabela interativa com todos os módulos e as 5 ações (view, create, edit, delete, export):

```
Módulo           | Ver | Criar | Editar | Excluir | Exportar
─────────────────|─────|───────|────────|─────────|─────────
Dashboard        | ✅  |  —    |  —     |  —      |  ✅
Cobranças        | ✅  |  ✅   |  ✅    |  ❌     |  ✅
Receitas         | ✅  |  ✅   |  ✅    |  ❌     |  ✅
...
```

- Toggles individuais para cada célula
- Botão "Resetar para padrão do perfil" (restaura os defaults do role base)
- Botão "Salvar Permissões" com toast de confirmação

**Regra de segurança:** Admin não pode rebaixar a si mesmo nem remover o próprio acesso a Usuários.

## 4.5 — Resultado esperado desta fase
- ✅ Item "Usuários" no menu (visível apenas admin/gestor)
- ✅ Página com cards de resumo e tabela de usuários
- ✅ Modal de convite com seleção de perfil
- ✅ Modal de edição com permissões customizáveis por módulo/ação
- ✅ Badges coloridos por perfil
- ✅ Proteção: admin não se auto-rebaixa

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 5 — PERFIL DO USUÁRIO LOGADO + INDICADOR NO MENU
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objetivo
Exibir o perfil e role do usuário logado no rodapé da sidebar e criar a página de perfil pessoal.

## 5.1 — Rodapé da Sidebar (User Card)

No rodapé da sidebar (onde hoje aparece o e-mail), substituir por um card compacto:

**Estado expandido:**
```
[Avatar/Inicial]  João Silva
                  Financeiro        ← badge colorido com o role
```

- Clicar no card → abre dropdown com:
  - 👤 Meu Perfil → `/perfil`
  - 🌙 Tema (Dark/Light toggle)
  - 🚪 Sair

**Estado colapsado (Rail):**
- Exibir apenas o avatar/inicial com tooltip "João Silva — Financeiro"

## 5.2 — Página de Perfil Pessoal `/perfil`

**Seções:**

**Dados pessoais (editável pelo próprio usuário):**
- Nome, cargo/título, telefone, foto de perfil (upload)

**Meu acesso (read-only — o usuário vê mas não edita):**
- Badge do perfil com nome e cor
- Tabela de módulos aos quais tem acesso (view only — verde ✅ / sem acesso —)
- Texto: "Para solicitar acesso adicional, entre em contato com o administrador."

**Segurança:**
- Alterar senha (campos: senha atual, nova senha, confirmar)
- Histórico de acessos: tabela com data, hora e IP dos últimos 10 logins

## 5.3 — Resultado esperado desta fase
- ✅ User card no rodapé da sidebar com nome, badge de role e dropdown
- ✅ Página /perfil com dados pessoais editáveis
- ✅ Visualização read-only das permissões do próprio usuário
- ✅ Troca de senha funcional
- ✅ Histórico de acessos

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REVISÃO COMPLETA — CHECKLIST GERAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Cole no Lovable **após concluir as 5 fases**.

```
Faça uma revisão completa de tudo que foi criado no sistema de Níveis de Acesso
do Whatsflow Finance. Verifique cada item abaixo e confirme ✅ implementado ou
❌ faltando/com problema. Para cada ❌, corrija automaticamente.

ESTRUTURA BASE
[ ] Arquivo src/types/roles.ts criado com os 5 roles
[ ] Arquivo src/config/permissions.ts criado com a matriz completa
[ ] Hook usePermissions criado e funcional
[ ] 5 roles definidos: admin, gestor, financeiro, consultor, representante

PROTEÇÃO DE ROTAS
[ ] Componente ProtectedRoute criado
[ ] Todas as rotas principais envolvidas com ProtectedRoute
[ ] Página /acesso-negado criada com botão de retorno
[ ] Redirecionamento funcional ao acessar rota sem permissão

SIDEBAR DINÂMICA
[ ] Menu oculta itens sem permissão view (não desabilita — oculta)
[ ] Grupos de seção somem quando não há itens visíveis no grupo
[ ] Dashboard sempre visível para todos os perfis
[ ] Item "Usuários" visível apenas para admin e gestor

PROTEÇÃO DE AÇÕES NAS PÁGINAS
[ ] Componente PermissionGate criado
[ ] Botões criar/editar/excluir/exportar controlados por permissão
[ ] Cobranças: ações protegidas
[ ] Receitas e Despesas: ações protegidas
[ ] Clientes e Produtos: ações protegidas
[ ] Fiscal: emitir NF, cancelar, exportar protegidos
[ ] Relatórios: exportar protegido

MÓDULO DE USUÁRIOS
[ ] Item "Usuários" no menu (grupo Sistema)
[ ] Rota /usuarios protegida (apenas admin/gestor)
[ ] Cards de resumo no topo da página
[ ] Tabela de usuários com badges coloridos por role
[ ] Modal de convite com seleção de perfil
[ ] Modal de edição com permissões customizáveis por módulo/ação
[ ] Toggles individuais por ação (view/create/edit/delete/export)
[ ] Botão "Resetar para padrão do perfil"
[ ] Proteção: admin não se auto-rebaixa

PERFIL DO USUÁRIO
[ ] User card no rodapé da sidebar com nome e badge de role
[ ] Dropdown: Meu Perfil, Tema, Sair
[ ] Página /perfil com dados pessoais editáveis
[ ] Visualização read-only das permissões do próprio usuário
[ ] Troca de senha funcional
[ ] Histórico de últimos 10 acessos

QUALIDADE GERAL
[ ] Tema dark preservado em todo o módulo
[ ] Nenhuma rota existente quebrada
[ ] Sem erros no console
[ ] Responsividade mantida
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TESTES — SOLICITAÇÃO FINAL AO LOVABLE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Cole no Lovable **após a revisão ser concluída com todos os itens ✅**.

```
Execute a bateria de testes abaixo no sistema de Níveis de Acesso.
Simule cada cenário e reporte PASSOU ✅ ou FALHOU ❌ + descrição.
Para cada falha, corrija e execute novamente até zerar.

TESTE 1 — Perfil Representante Externo
- Simular login como usuário com role "representante"
- Verificar que o menu exibe apenas: Dashboard, Clientes, Produtos,
  Relatórios e Inserir Dados
- Tentar acessar /fiscal diretamente pela URL → deve redirecionar para /acesso-negado
- Tentar acessar /configuracoes pela URL → deve redirecionar para /acesso-negado
- Verificar que em Clientes NÃO aparecem botões de editar ou excluir
- Verificar que em Relatórios NÃO aparece botão de exportar

TESTE 2 — Perfil Financeiro
- Simular login como usuário com role "financeiro"
- Verificar que o menu exibe: Dashboard, Cobranças, Receitas, Despesas,
  Inserir Dados, Fiscal, Intelligence, Relatórios
- Verificar que Usuários e Configurações NÃO aparecem no menu
- Verificar que em Fiscal aparecem os botões de emitir NF e exportar
- Verificar que em Clientes o usuário consegue visualizar mas NÃO vê botão "+ Novo Cliente"
- Tentar acessar /usuarios pela URL → deve redirecionar para /acesso-negado

TESTE 3 — Perfil Gestor
- Simular login como usuário com role "gestor"
- Verificar que "Usuários" aparece no menu (grupo Sistema)
- Verificar que "Configurações" NÃO aparece no menu
- Em Usuários: verificar que pode convidar e editar usuários
- Verificar que NÃO aparece botão de excluir usuários (apenas admin pode)
- Em Cobranças: verificar que pode criar mas NÃO excluir

TESTE 4 — Permissões Customizadas
- Como admin, acessar /usuarios
- Editar um usuário com role "consultor"
- Na aba Permissões Customizadas, habilitar "create" em Receitas (que por padrão é false)
- Salvar
- Simular login como esse usuário
- Verificar que o botão "+ Nova Receita" agora aparece para ele

TESTE 5 — Proteção de Auto-rebaixamento
- Como admin, acessar /usuarios
- Tentar editar o próprio usuário e remover permissão de "view" em Usuários
- Deve exibir mensagem de erro: "Você não pode remover seu próprio acesso administrativo"
- Tentar alterar o próprio role para "representante"
- Deve bloquear a ação com mensagem de aviso

TESTE 6 — Perfil na Sidebar
- Para qualquer perfil logado, verificar que o rodapé da sidebar exibe:
  - Nome do usuário
  - Badge colorido com o nome do role
- Clicar no card do usuário → dropdown com Meu Perfil, Tema, Sair
- Clicar em "Meu Perfil" → abre /perfil corretamente
- Em /perfil, verificar que a tabela de permissões é somente leitura

TESTE 7 — Sidebar Colapsada (Rail)
- Colapsar a sidebar para modo Rail
- Verificar que apenas os ícones dos itens com permissão aparecem
- Verificar que itens sem permissão continuam ocultos no modo Rail
- Hover em cada ícone → tooltip com o nome do módulo

Reporte cada teste com PASSOU ✅ / FALHOU ❌.
Corrija todas as falhas antes de concluir.
```
