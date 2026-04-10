-- Support manual name editing with cascade to contacts/customers
ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS name_edited_manually BOOLEAN DEFAULT false;
ALTER TABLE whatsapp_leads ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
