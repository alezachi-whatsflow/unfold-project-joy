-- Grant table permissions for group management tables
-- RLS handles tenant isolation; GRANTs allow PostgREST access
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_groups TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_kanban_columns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_attributions TO anon, authenticated;
