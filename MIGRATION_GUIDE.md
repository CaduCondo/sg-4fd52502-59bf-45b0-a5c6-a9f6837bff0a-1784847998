# 📦 Guia de Migração de Anexos para Supabase Storage

Este guia explica como migrar todos os anexos de pagamentos da pasta local `public/uploads/` para o Supabase Storage.

## 🎯 Por que migrar?

**Problema atual:**
- Anexos estão salvos em `public/uploads/` com URLs relativas: `/uploads/file_xxx.pdf`
- URLs não funcionam fora do domínio (erro 404)
- Arquivos podem ser perdidos em redeploys

**Solução:**
- Migrar tudo para Supabase Storage
- URLs públicas permanentes: `https://xxx.supabase.co/storage/v1/object/public/uploads/payment-attachments/xxx.pdf`
- Acessível de qualquer lugar
- Backup automático

## 📋 Pré-requisitos

1. **Variáveis de ambiente configuradas em `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   ```

2. **Service Role Key:**
   - Acesse: [Supabase Dashboard](https://supabase.com/dashboard)
   - Vá em: Settings → API → Service Role Key
   - Copie a chave e adicione ao `.env.local`

3. **Bucket `uploads` criado no Supabase Storage:**
   - Acesse: Storage → Create bucket
   - Nome: `uploads`
   - Público: ✅ Sim
   - RLS desabilitado para acesso público

## 🚀 Como executar a migração

### Opção 1: Usando npm (Recomendado)

```bash
# 1. Instalar dependências do script
npm install --no-save tsx @types/node

# 2. Executar migração
npx tsx src/scripts/migrateAttachmentsToSupabase.ts
```

### Opção 2: Usando package-migrate.json

```bash
# 1. Instalar dependências
npm install

# 2. Executar migração
npm run migrate
```

## 📊 O que o script faz?

1. **Busca todos os pagamentos** com anexos no banco de dados
2. **Para cada anexo com URL antiga** (`/uploads/...`):
   - Lê o arquivo de `public/uploads/`
   - Faz upload para Supabase Storage em `payment-attachments/`
   - Gera nova URL pública
   - Atualiza o banco de dados com a nova URL
3. **Exibe relatório** com estatísticas da migração

## 📈 Exemplo de execução

```
🚀 Iniciando migração de anexos...

📋 Buscando pagamentos com anexos...
📦 Encontrados 15 pagamentos com anexos

📄 Processando pagamento abc123...
  🔄 Migrando: /uploads/file_1771289873359.pdf
  ✅ Migrado com sucesso!
     Antiga: /uploads/file_1771289873359.pdf
     Nova: https://xxx.supabase.co/storage/v1/object/public/uploads/payment-attachments/1234567890_abc123.pdf
  💾 Banco de dados atualizado com sucesso!

============================================================
📊 RESUMO DA MIGRAÇÃO
============================================================
✅ Anexos migrados com sucesso: 25
⏭️  Anexos ignorados (não encontrados): 2
❌ Erros durante migração: 0
📦 Total de pagamentos processados: 15
============================================================

✨ Migração concluída com sucesso!
💡 Os arquivos antigos em public/uploads/ podem ser removidos manualmente.
```

## ⚠️ Avisos importantes

1. **Backup:** Faça backup da pasta `public/uploads/` antes de executar
2. **Service Role Key:** NUNCA commite a Service Role Key no Git
3. **Execução única:** Execute o script apenas uma vez
4. **Verificação:** Após migração, teste alguns anexos para garantir que funcionam

## 🧹 Após a migração

1. **Testar anexos:**
   - Acesse alguns pagamentos pagos
   - Clique em "Ver Anexos"
   - Verifique se os arquivos abrem corretamente

2. **Remover arquivos antigos (opcional):**
   ```bash
   # Faça backup primeiro!
   rm -rf public/uploads/*
   ```

3. **Remover script de migração (opcional):**
   ```bash
   rm src/scripts/migrateAttachmentsToSupabase.ts
   rm package-migrate.json
   rm MIGRATION_GUIDE.md
   ```

## 🆘 Troubleshooting

### Erro: "SUPABASE_SERVICE_ROLE_KEY não definida"
**Solução:** Adicione a Service Role Key no `.env.local`

### Erro: "Bucket 'uploads' não existe"
**Solução:** Crie o bucket no Supabase Dashboard

### Erro: "Arquivo não encontrado localmente"
**Solução:** O arquivo foi deletado ou nunca existiu. O script vai ignorar e continuar.

### Erro: "Erro ao fazer upload"
**Solução:** Verifique:
- Conexão com Supabase
- Permissões do bucket
- Tamanho do arquivo (limite padrão: 50MB)

## 📞 Suporte

Se encontrar problemas durante a migração, verifique:
1. Logs detalhados no console
2. Configuração do Supabase Storage
3. Variáveis de ambiente

---

**Status:** ✅ Pronto para executar
**Última atualização:** 2026-02-22