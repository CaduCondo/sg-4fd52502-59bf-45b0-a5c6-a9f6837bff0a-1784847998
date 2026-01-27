-- Remover a política que criei com erro e manter as políticas existentes que já funcionam
DROP POLICY IF EXISTS "Public can view available properties" ON properties;