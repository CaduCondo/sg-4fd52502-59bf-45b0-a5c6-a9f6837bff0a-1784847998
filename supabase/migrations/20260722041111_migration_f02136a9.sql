-- Recriar tabela payment_methods com RLS desabilitado temporariamente para inserir dados padrão
DROP TABLE IF EXISTS payment_methods CASCADE;

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  active boolean DEFAULT true,
  display_order int DEFAULT 99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS simplificadas - qualquer usuário autenticado pode gerenciar
CREATE POLICY "payment_methods_select" ON payment_methods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payment_methods_insert" ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "payment_methods_update" ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "payment_methods_delete" ON payment_methods
  FOR DELETE
  TO authenticated
  USING (true);

-- Inserir formas de pagamento padrão
INSERT INTO payment_methods (code, name, active, display_order) VALUES
  ('pix', 'PIX', true, 1),
  ('dinheiro', 'Dinheiro', true, 2)
ON CONFLICT (code) DO NOTHING;