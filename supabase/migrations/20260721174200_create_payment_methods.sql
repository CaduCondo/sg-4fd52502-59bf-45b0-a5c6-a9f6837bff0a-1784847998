-- Criar tabela payment_methods para controlar as formas de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos autenticados podem ler, apenas admin pode modificar
CREATE POLICY "Todos podem ler formas de pagamento" ON payment_methods
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admin pode inserir formas de pagamento" ON payment_methods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar formas de pagamento" ON payment_methods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar formas de pagamento" ON payment_methods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM system_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir formas de pagamento padrão
INSERT INTO payment_methods (name, code, active, display_order) VALUES
  ('PIX', 'pix', true, 1),
  ('Dinheiro', 'dinheiro', true, 2)
ON CONFLICT (code) DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();