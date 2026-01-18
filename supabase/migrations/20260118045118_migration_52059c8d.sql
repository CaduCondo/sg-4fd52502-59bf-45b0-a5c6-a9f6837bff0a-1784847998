-- 2. Remover políticas permissivas de locations
DROP POLICY IF EXISTS "Usuários autenticados podem criar locais" ON locations;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar locais" ON locations;