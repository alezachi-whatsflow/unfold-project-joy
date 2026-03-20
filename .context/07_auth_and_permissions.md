# Autenticação e Permissões

- **Modelo**: Supabase Auth com JWTs.
- **Autorização (Telas)**: Configurado em `PermissionGate.tsx` e `usePermissions.ts`. Ele amarra a permissão do Frontend à role ativada para o usuário naquele Tenant / License.
- **Autorização (Banco / RLS)**: Política Padrão usada agressivamente:
  ```sql
  CREATE POLICY "Tenant isolation" ON public.minha_tabela
  FOR ALL
  USING (tenant_id = auth.uid()_in_tenants_function()); -- PSEUDOCODE
  ```
- O Role `service_role` (JWT Especial de Admin) destrói RLS. Ele está restrito APENAS as instâncias base e edge functions. Nunca é expulso ao cliente.