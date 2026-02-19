-- Criar bucket 'uploads' no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política para permitir uploads autenticados
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Política para permitir uploads públicos (para mobile)
CREATE POLICY "Public can upload files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'uploads');

-- Política para permitir leitura pública
CREATE POLICY "Public can view uploaded files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Política para permitir atualização por usuários autenticados
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Política para permitir deleção por usuários autenticados
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');