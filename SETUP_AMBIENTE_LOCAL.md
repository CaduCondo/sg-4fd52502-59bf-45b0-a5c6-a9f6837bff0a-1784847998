# 🚀 Setup do Ambiente Local - Guia Definitivo

## ⚠️ FAÇA ISSO UMA VEZ - Setup Inicial da Máquina

Este guia é para configurar seu ambiente local pela primeira vez ou após limpar o repositório com `git reset`.

---

## 📋 Workflow Diário (Todo dia de manhã)

### **Passo 1: Atualizar do Git (limpar tudo e baixar versão mais recente)**

```bash
# Buscar atualizações do repositório remoto
git fetch origin

# Resetar para exatamente o que está no Git (descarta mudanças locais)
git reset --hard origin/main

# Limpar arquivos não rastreados (remove arquivos/pastas locais)
git clean -fd
```

**Resultado:** Seu código local fica EXATAMENTE igual ao Git.

**⚠️ ATENÇÃO:** Isso vai deletar:
- ✅ Todas as mudanças locais não commitadas (é isso que você quer)
- ✅ Arquivos não rastreados (node_modules, cache, etc.)
- ❌ O arquivo `.env.local` (contém suas credenciais)

---

### **Passo 2: Recriar o .env.local (se foi deletado)**

**O arquivo `.env.local` NÃO está no Git** (contém credenciais secretas), então você precisa criá-lo localmente.

```bash
# Copiar o template
cp .env.local.example .env.local
```

**Depois, edite o `.env.local` e preencha as 3 variáveis:**

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Onde: Supabase Dashboard > Settings > API > Project URL
   - Formato: `https://xxxxxxxxxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Onde: Supabase Dashboard > Settings > API > anon/public key
   - Chave pública (segura para frontend)

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Onde: Supabase Dashboard > Settings > API > service_role key
   - Chave privada (NUNCA exponha no frontend)

**Exemplo do .env.local preenchido:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### **Passo 3: Instalar Dependências**

```bash
npm install
```

**Isso vai instalar:**
- Pacotes do Next.js, React, Tailwind, etc.
- Playwright (para testes E2E)
- dotenv (para carregar .env.local nos testes)

---

### **Passo 4: Rodar o Servidor de Desenvolvimento**

```bash
npm run dev
```

**Acesse:** http://localhost:3000

---

### **Passo 5: Rodar Testes E2E (opcional)**

```bash
# Rodar todos os testes
npm run test:e2e

# Ver relatório HTML
npm run test:report
```

---

## 🐛 Troubleshooting - Problemas Comuns

### **Erro: "supabaseUrl is required"**

**Causa:** O `.env.local` não existe ou as variáveis estão vazias.

**Solução:**
1. Verifique se `.env.local` existe na raiz do projeto
2. Abra o arquivo e confirme que as 3 variáveis estão preenchidas
3. Reinicie o terminal ou servidor

---

### **Erro: "Missing script: test:all"**

**Causa:** Os scripts de teste não foram adicionados ao `package.json`.

**Solução:**
Use os scripts que já existem:
```bash
npm run test:e2e        # Rodar todos os testes
npm run test:e2e:ui     # Interface visual
npm run test:report     # Ver relatório
```

---

### **Testes falhando com erro de conexão**

**Causa:** Servidor Next.js não está rodando ou .env.local está incorreto.

**Solução:**
1. Verifique se o servidor está rodando: `npm run dev`
2. Acesse http://localhost:3000 no navegador
3. Confirme que o login funciona manualmente
4. Rode os testes novamente

---

## 📝 Checklist - Antes de Rodar Testes

- [ ] `git reset --hard origin/main` executado
- [ ] `.env.local` existe e está preenchido
- [ ] `npm install` executado sem erros
- [ ] Servidor rodando em http://localhost:3000
- [ ] Login manual funciona no navegador

---

## 🆘 Ainda com problemas?

Se após seguir todos os passos ainda houver erros, compartilhe:

1. Comando que rodou
2. Erro completo (todo o console output)
3. Conteúdo do `.env.local` (OCULTE as chaves - mostre só se estão preenchidas)
4. Versão do Node.js (`node -v`)