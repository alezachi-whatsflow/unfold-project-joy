# Débitos Técnicos e Avisos de Operação (Known Issues)

- **Senhas em repouso de DB Script**: Mantenha atenção máxima nos arquivos `reset_db.*`. Eles podem conter Hardcoded Passwords inseridos pontualmente para bypassing de bloqueio do Supabase host e NÃO devem ser committados se as credenciais mudarem ou pertencerem ao admin global.
- **Complexidade do Drawer do CRM**: O componente `NegocioDrawer.tsx` carrega múltiplas responsabilidades (Geração de documento, fetch, update, estado dos modais de Ganho/Perda). Ele precisará ser quebrado em fragmentos atomizados em breve.
- **Atenção nas Permissões**: Componentes renderizados por trás do `PermissionGate` podem sumir globalmente se as tabelas de roles forem mal construídas/limpadas por acidente via admin base.