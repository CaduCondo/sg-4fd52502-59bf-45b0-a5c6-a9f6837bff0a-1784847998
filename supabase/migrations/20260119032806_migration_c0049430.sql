-- ============================================================
-- FIX RLS POLICIES FOR CONFIGS TABLE
-- ============================================================
-- Remove políticas antigas que usam auth.uid()
DROP POLICY IF EXISTS "Anyone authenticated can view configs" ON configs;
DROP POLICY IF EXISTS "Anyone authenticated can insert configs" ON configs;
DROP POLICY IF EXISTS "Anyone authenticated can update configs" ON configs;
DROP POLICY IF EXISTS "Anyone authenticated can delete configs" ON configs;

-- Criar políticas públicas para permitir todas as operações
CREATE POLICY "Allow public read access"
  ON configs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert"
  ON configs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update"
  ON configs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete"
  ON configs FOR DELETE
  USING (true);