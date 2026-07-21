-- Criar tabela payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_display_order ON public.payment_methods(display_order);

-- Habilitar RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Política de leitura para todos os usuários autenticados
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de inserção para administradores
CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'financial')
    )
  );

-- Política de atualização para administradores
CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'financial')
    )
  );

-- Política de exclusão para administradores
CREATE POLICY "payment_methods_delete" ON public.payment_methods
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Inserir dados iniciais
INSERT INTO public.payment_methods (name, code, active, display_order)
VALUES 
  ('Pix', 'pix', true, 1),
  ('Dinheiro', 'cash', true, 2)
ON CONFLICT (code) DO NOTHING;

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_methods_updated_at();