-- Desabilitar RLS completamente na tabela management_fee_exempt_locations
ALTER TABLE management_fee_exempt_locations DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS auth_delete_management_fee_exempt ON management_fee_exempt_locations;
DROP POLICY IF EXISTS auth_insert_management_fee_exempt ON management_fee_exempt_locations;
DROP POLICY IF EXISTS auth_read_management_fee_exempt ON management_fee_exempt_locations;
DROP POLICY IF EXISTS auth_update_management_fee_exempt ON management_fee_exempt_locations;

COMMENT ON TABLE management_fee_exempt_locations IS 'Locais isentos de taxa de gerenciamento - RLS desabilitado para acesso livre';