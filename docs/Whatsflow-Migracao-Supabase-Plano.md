# Whatsflow — Plano de Migracao Supabase
## De Lovable para Projeto Proprio

---

## Situacao Atual

| Item | Projeto Lovable | Seu Projeto |
|------|----------------|-------------|
| **Ref** | knnwgijcrpbgqhdzmdrp | jtlrglzcsmqmapizqgzu |
| **Acesso Dashboard** | NAO (pertence ao Lovable) | SIM (controle total) |
| **Acesso Management API** | NAO | SIM |
| **Deploy Edge Functions** | Apenas via Lovable chat | SIM (via CLI) |
| **Configurar Auth/Email** | NAO | SIM |
| **Tabelas criadas** | SIM (com dados) | SIM (vazias) |
| **Dados** | 751 tenants, 14 negocios | 0 |

## Por que Migrar

1. Voce NAO tem acesso ao dashboard do projeto Lovable
2. NAO consegue alterar templates de email
3. NAO consegue configurar Auth (Site URL, redirects)
4. NAO consegue deploy de Edge Functions diretamente
5. Depende de creditos do Lovable para qualquer mudanca no backend
6. Risco: se o Lovable mudar algo, seu app pode quebrar

## Plano de Migracao

### Etapa 1 — Exportar dados do Lovable (30 min)

1. Usar a anon key do Lovable para exportar tabelas publicas
2. Para tabelas protegidas por RLS, pedir ao Lovable via chat:
   "Export all data from tables: profiles, licenses, nexus_users, user_tenants as JSON"
3. Ou usar o SQL Editor do Lovable para fazer SELECT * e copiar

Tabelas para exportar:
- tenants (751 registros)
- profiles
- user_tenants
- licenses
- negocios
- nexus_users
- nexus_audit_logs
- whatsapp_instances
- whitelabel_config

### Etapa 2 — Importar no seu projeto (30 min)

1. Usar service_role_key do seu projeto para inserir dados
2. Script Node.js que le os JSONs e insere via Supabase client
3. Manter os mesmos UUIDs para nao quebrar relacionamentos

### Etapa 3 — Migrar Auth (usuarios) (15 min)

1. Exportar usuarios do Lovable:
   "Export auth.users table as JSON" (pedir via Lovable chat)
2. Importar no seu projeto usando admin API:
   supabase.auth.admin.createUser() para cada usuario
3. Usuarios precisarao redefinir senha (inevitavel na migracao)

### Etapa 4 — Deploy Edge Functions (10 min)

No seu projeto voce tem acesso total:
```bash
npx supabase login
npx supabase functions deploy invite-user --project-ref jtlrglzcsmqmapizqgzu
npx supabase functions deploy whatsapp-webhook-receiver --project-ref jtlrglzcsmqmapizqgzu
```

### Etapa 5 — Configurar Auth no seu projeto (5 min)

Ja feito via Management API! Site URL e Redirect URLs ja estao configurados.
Falta apenas o email template (pode ser feito pelo dashboard).

### Etapa 6 — Atualizar client.ts (2 min)

Trocar:
```typescript
const SUPABASE_URL = "https://knnwgijcrpbgqhdzmdrp.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...antigo";
```

Para:
```typescript
const SUPABASE_URL = "https://jtlrglzcsmqmapizqgzu.supabase.co";
const SUPABASE_ANON_KEY = "nova_anon_key_do_seu_projeto";
```

### Etapa 7 — Testar (15 min)

1. Login funciona
2. Dados aparecem
3. Criar negocio funciona
4. Convite de usuario funciona (email em portugues!)
5. Edge Functions respondem

### Etapa 8 — Atualizar Railway (5 min)

Adicionar/atualizar variaveis no Railway se necessario.

---

## Tempo Total Estimado: ~2 horas

## Riscos

- Usuarios precisam redefinir senha apos migracao
- Webhooks externos (Asaas, WhatsApp) precisam ser atualizados para novo URL
- Dados em tempo real (Realtime) precisam ser reconfigurados

## Quando Fazer

Recomendado: em um horario de baixo uso (sabado de manha ou domingo)
Avisar usuarios antes: "Manutencao programada — redefina sua senha apos"

---

*Documento gerado em 22/03/2026*
