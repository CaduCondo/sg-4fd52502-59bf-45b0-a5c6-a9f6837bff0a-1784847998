-- ETAPA 2: REMOVER DUPLICATAS DE PROPERTIES
-- Remover garage_value e has_partner_broker de properties
-- (essas colunas já existem em rentals onde devem estar)

-- 2.1. Remover garage_value de properties
ALTER TABLE properties DROP COLUMN IF EXISTS garage_value;

-- 2.2. Remover has_partner_broker de properties
ALTER TABLE properties DROP COLUMN IF EXISTS has_partner_broker;

-- Confirmar limpeza
SELECT 'Etapa 2 concluída: Colunas duplicadas de properties removidas!' as message;