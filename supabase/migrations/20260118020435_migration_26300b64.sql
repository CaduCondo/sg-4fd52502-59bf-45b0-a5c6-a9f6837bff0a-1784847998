-- Fase 4: Remover campo locations da tabela configs (agora obsoleto)
ALTER TABLE configs DROP COLUMN IF EXISTS locations;