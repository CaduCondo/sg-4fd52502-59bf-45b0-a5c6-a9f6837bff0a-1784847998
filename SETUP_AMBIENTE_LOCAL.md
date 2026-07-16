# 🚀 Setup do Ambiente Local - Guia Definitivo

## ⚠️ FAÇA ISSO UMA VEZ - Setup Inicial da Sua Máquina

Este guia é para configurar seu ambiente local DEPOIS de fazer o `git reset --hard`.

---

## 📋 Passo a Passo (Execute NA ORDEM)

### **1️⃣ Atualizar Repositório do Git**

```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```

✅ Isso garante que seu código está exatamente igual ao Git remoto.

---

### **2️⃣ Criar arquivo `.env.local` (SE NÃO EXISTIR)**

⚠️ **IMPORTANTE:** O `.env.local` NUNCA está no Git (contém credenciais secretas).

**Opção A - Copiar do template:**
```bash
cp .env.local.example .env.local
```

**Opção B - Criar manualmente:**
Crie o arquivo `.env.local` na raiz do projeto com este conteúdo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Onde encontrar as chaves:**
1. Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
2. Copie as 3 chaves para o `.env.local`

---

### **3️⃣ Instalar Dependências**

```bash
npm install
```

✅ Isso instala todas as dependências do `package.json`, incluindo `dotenv`.

---

### **4️⃣ Verificar se Tudo Está OK**

```bash
# Verificar se .env.local existe
ls .env.local

# Verificar se dotenv está instalado
npm list dotenv
```

✅ **Deve aparecer:** `.env.local` existe e `dotenv@X.X.X` instalado.

---

### **5️⃣ Rodar Testes**

```bash
# Rodar todos os testes
npm run test:e2e

# Ver relatório HTML
npm run test:report
```

---

## 🔄 Workflow Diário (Depois do Setup Inicial)

### **Toda manhã / Depois de atualização do Softgen:**

```bash
# 1. Atualizar código do Git
git fetch origin
git reset --hard origin/main
git clean -fd

# 2. Instalar novas dependências (se houver)
npm install

# 3. Verificar se .env.local ainda existe
# (Se você deletou, recrie seguindo o Passo 2️⃣)

# 4. Rodar testes
npm run test:e2e
```

---

## ❓ Troubleshooting

### **Erro: "supabaseUrl is required"**

**Causa:** `.env.local` não existe ou está vazio.

**Solução:**
1. Verifique se `.env.local` existe na raiz: `ls .env.local`
2. Abra o arquivo e confirme que as 3 variáveis estão preenchidas
3. Se não existir, siga o **Passo 2️⃣** acima

---

### **Erro: "Cannot find module 'dotenv'"**

**Causa:** Dependência `dotenv` não instalada.

**Solução:**
```bash
npm install
```

---

### **Testes não executam / Trava**

**Causa:** Servidor Next.js não iniciou.

**Solução:**
1. Aguarde 1-2 minutos (primeira inicialização é lenta)
2. Se travar, cancele (Ctrl+C) e rode novamente

---

## ✅ Checklist Antes de Rodar Testes

- [ ] Código atualizado do Git (`git reset --hard origin/main`)
- [ ] Dependências instaladas (`npm install`)
- [ ] `.env.local` existe e está preenchido
- [ ] `dotenv` instalado (`npm list dotenv`)

---

## 📞 Suporte

Se seguir todos os passos e ainda não funcionar, envie:
1. Output completo do console
2. Conteúdo do `.env.local` (OCULTE as chaves - mostre só se estão preenchidas)
3. Versão do Node.js (`node -v`)