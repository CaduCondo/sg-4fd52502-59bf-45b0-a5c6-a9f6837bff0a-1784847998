-- 1. Remover política insegura "Public Access" de configs
DROP POLICY IF EXISTS "Public Access" ON configs;