ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS has_ia_auditor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ia_copiloto boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ia_closer boolean DEFAULT false;
