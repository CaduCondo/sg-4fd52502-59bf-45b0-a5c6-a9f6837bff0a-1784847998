-- Adicionar índices em todas as foreign keys conforme recomendação Supabase
-- Isso melhora performance e segurança

-- Índices para tabela properties
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON properties(location_id);

-- Índices para tabela rentals
CREATE INDEX IF NOT EXISTS idx_rentals_property_id ON rentals(property_id);
CREATE INDEX IF NOT EXISTS idx_rentals_tenant_id ON rentals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rentals_is_active ON rentals(is_active);

-- Índices para tabela payments
CREATE INDEX IF NOT EXISTS idx_payments_rental_id ON payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- Índices para tabela user_location_permissions
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_user_id ON user_location_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_permissions_location_id ON user_location_permissions(location_id);

-- Índices para tabela broker_fee_exemptions
CREATE INDEX IF NOT EXISTS idx_broker_fee_exemptions_user_id ON broker_fee_exemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_fee_exemptions_location_id ON broker_fee_exemptions(location_id);

-- Índices para tabela location_expenses
CREATE INDEX IF NOT EXISTS idx_location_expenses_location_id ON location_expenses(location_id);

-- Índices para tabela role_menu_permissions
CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_role ON role_menu_permissions(role);