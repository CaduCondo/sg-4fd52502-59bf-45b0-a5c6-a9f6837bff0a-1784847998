-- Criar tabela para locais isentos de taxa de gerenciamento
CREATE TABLE IF NOT EXISTS management_fee_exempt_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(location_id)
);

-- Habilitar RLS
ALTER TABLE management_fee_exempt_locations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesma lógica da admin_fee_exempt_locations)
CREATE POLICY "auth_read_management_fee_exempt" ON management_fee_exempt_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_insert_management_fee_exempt" ON management_fee_exempt_locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_update_management_fee_exempt" ON management_fee_exempt_locations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_delete_management_fee_exempt" ON management_fee_exempt_locations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Adicionar comentários
COMMENT ON TABLE management_fee_exempt_locations IS 'Locais isentos de taxa de gerenciamento';
COMMENT ON COLUMN management_fee_exempt_locations.location_id IS 'Referência ao local isento';