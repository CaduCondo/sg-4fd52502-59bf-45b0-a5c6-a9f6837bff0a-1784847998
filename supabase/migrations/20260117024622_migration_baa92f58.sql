-- Criar tabela de usuários do sistema
CREATE TABLE system_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Policy para acesso público (já que é sistema interno)
CREATE POLICY "Public Access" ON system_users
  FOR ALL USING (true);

-- Inserir usuário padrão (Carlos Eduardo Pires)
INSERT INTO system_users (name, email, password, role, active)
VALUES 
  ('Carlos Eduardo Pires', 'cadu.pires@example.com', 'senha123', 'admin', true);

-- Criar índice para busca por email
CREATE INDEX idx_system_users_email ON system_users(email);