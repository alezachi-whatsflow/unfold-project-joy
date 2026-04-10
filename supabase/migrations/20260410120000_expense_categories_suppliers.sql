-- ══════════════════════════════════════════════════════════════════════════
-- Expense Categories & Suppliers — Normalized tables for expense management
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Expense Categories (hierarchical — parent_id for subcategories)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'tag',
  parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name, parent_id)
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict_Tenant_Isolation_expense_categories" ON expense_categories
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_expense_categories_tenant ON expense_categories(tenant_id, is_active, sort_order);

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  normalized_phone TEXT GENERATED ALWAYS AS (normalize_br_phone(phone)) STORED,
  address TEXT,
  bank_info JSONB DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict_Tenant_Isolation_suppliers" ON suppliers
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id, is_active);
CREATE INDEX idx_suppliers_normalized_phone ON suppliers(normalized_phone) WHERE normalized_phone IS NOT NULL;

-- 3. Expense Tags (flexible tagging system)
CREATE TABLE IF NOT EXISTS expense_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict_Tenant_Isolation_expense_tags" ON expense_tags
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

-- 4. Link expenses to normalized foreign keys
ALTER TABLE asaas_expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;
ALTER TABLE asaas_expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE asaas_expenses ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_expenses_category ON asaas_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON asaas_expenses(supplier_id);

-- 5. Seed default categories for existing tenants
INSERT INTO expense_categories (tenant_id, name, color, icon, sort_order)
SELECT t.id, cat.name, cat.color, cat.icon, cat.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('Escritório', '#6B7280', 'building', 1),
  ('Marketing', '#8B5CF6', 'megaphone', 2),
  ('Tecnologia', '#3B82F6', 'cpu', 3),
  ('Pessoal', '#F59E0B', 'user', 4),
  ('Impostos', '#EF4444', 'receipt', 5),
  ('Serviços', '#10B981', 'wrench', 6),
  ('Viagens', '#EC4899', 'plane', 7),
  ('Outros', '#9CA3AF', 'more-horizontal', 8)
) AS cat(name, color, icon, sort_order)
ON CONFLICT (tenant_id, name, parent_id) DO NOTHING;
