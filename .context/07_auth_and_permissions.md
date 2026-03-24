# 07 — Auth and Permissions

## AuthN: Supabase GoTrue (JWT)
- Method: Email + Password
- Token: JWT in memory (not localStorage)
- Session: Auto-refresh via `onAuthStateChange`
- Hook: `useAuth()` → `{ user, session, signIn, signOut, resetPassword, updatePassword }`

## AuthZ: Role-Based Access Control

### Roles (profiles.role)
| Role | Level | Access |
|------|-------|--------|
| `superadmin` | Highest | Everything in tenant |
| `admin` | High | All modules, manage users |
| `gestor` | Medium | Most modules, no delete users |
| `financeiro` | Specific | Financial modules only |
| `consultor` | Specific | CRM + messaging |
| `representante` | Low | Own deals only |

### Nexus Roles (nexus_users.role)
| Role | Access |
|------|--------|
| `nexus_superadmin` | Full Nexus (all 13 pages) |
| `nexus_dev_senior` | Licenses, WL, lifecycle, flags |
| `nexus_suporte_senior` | Licenses, WL, tickets |

### Permission Matrix (src/config/permissions.ts)
12 modules × 5 actions: `view`, `create`, `edit`, `delete`, `export`
Custom overrides in `profiles.custom_permissions` (JSONB).

### Frontend Guards
- `<ProtectedRoute module="vendas">` — wraps routes
- `<PermissionGate module="usuarios" action="delete">` — wraps buttons
- `usePermissions()` → `{ canView, canEdit, canDelete, isAdmin }`

### Backend (RLS)
- `get_my_role()` → role from profiles
- `is_nexus_user()` → check nexus_users
- `get_my_tenant_ids()` → tenant IDs from user_tenants
- Edge Functions: `callerClient.auth.getUser()` for JWT verification

### Password Recovery Flow
1. `ForgotPasswordPage` → calls `send-recovery-email` Edge Function
2. Edge Function generates link via `admin.generateLink({ type: "recovery" })`
3. Sends email via SMTP2GO with custom PT-BR template
4. User clicks link → `ResetPasswordPage` → `updatePassword()`
5. Auto-activates profile if `invitation_status !== "active"`

### Invitation Flow
1. Admin clicks "Convidar Usuário" → `invite-user` Edge Function
2. Creates auth user + profile + user_tenants
3. Sends email via SMTP2GO
4. User clicks → creates password → profile activated
5. Status tracking: invited → link_acessado → conta_ativa
