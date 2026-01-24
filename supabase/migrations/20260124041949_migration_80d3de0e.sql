-- Adicionar colunas de comissões na tabela deposit_installments
ALTER TABLE deposit_installments
ADD COLUMN IF NOT EXISTS partner_commission DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS internal_commission DECIMAL(10,2) DEFAULT 0;

-- Comentários nas colunas
COMMENT ON COLUMN deposit_installments.partner_commission IS 'Valor pago de corretagem ao corretor parceiro';
COMMENT ON COLUMN deposit_installments.internal_commission IS 'Valor pago de corretagem interno';