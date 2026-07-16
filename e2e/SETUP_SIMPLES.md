# 🚀 Setup Definitivo de Testes E2E - Passo a Passo

## ⚠️ SIGA NA ORDEM - NÃO PULE PASSOS

### **PASSO 1: Instalar Dependências Necessárias**

```bash
# Instalar dotenv (OBRIGATÓRIO para carregar .env.local)
npm install dotenv --save-dev

# Instalar Playwright e navegadores (se ainda não fez)
npx playwright install
```

**Aguarde instalação completa antes de prosseguir.**

---

### **PASSO 2: Verificar Arquivo .env.local**

Abra o arquivo `.env.local` na raiz do projeto e confirme que estas 3 variáveis existem:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

✅ **Se existem:** Prossiga para PASSO 3  
❌ **Se faltam:** Copie do Supabase Dashboard → Settings → API

---

### **PASSO 3: Rodar Testes**

```bash
# Rodar TODOS os testes
npm run test:e2e
```

**O que vai acontecer:**
1. ✅ Next.js vai iniciar em http://localhost:3000
2. ✅ Variáveis do .env.local serão carregadas
3. ✅ Testes começarão a executar
4. ✅ Relatório HTML será gerado automaticamente

---

### **PASSO 4: Ver Relatório**

Quando os testes terminarem:

```bash
# Abrir relatório HTML no navegador
npx playwright show-report e2e/reports/playwright-report
```

---

## 🐛 Solução de Problemas

### **Erro: "supabaseUrl is required"**

**Causa:** Variáveis do .env.local não foram carregadas.

**Solução:**
```bash
# 1. Verificar se dotenv está instalado
npm list dotenv

# 2. Se não aparecer na lista, instalar:
npm install dotenv --save-dev

# 3. Rodar testes novamente
npm run test:e2e
```

---

### **Erro: "Cannot find module 'dotenv'"**

**Solução:**
```bash
npm install dotenv --save-dev
```

---

### **Erro: "Timed out waiting for WebServer"**

**Causa:** Next.js não conseguiu iniciar em 120s.

**Solução:**
```bash
# Matar processos Node.js rodando
taskkill /F /IM node.exe

# Rodar testes novamente
npm run test:e2e
```

---

### **Erro: "Port 3000 already in use"**

**Solução:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <numero_do_pid> /F

# Rodar testes novamente
npm run test:e2e
```

---

## ✅ Checklist Final

Antes de rodar os testes, confirme:

- [ ] `npm install dotenv --save-dev` executado com sucesso
- [ ] `.env.local` existe na raiz do projeto
- [ ] `.env.local` contém as 3 variáveis do Supabase
- [ ] Nenhum processo rodando na porta 3000
- [ ] Internet conectada (precisa acessar Supabase)

---

## 🎯 Comandos Rápidos

```bash
# Setup completo (rode UMA VEZ)
npm install dotenv --save-dev && npx playwright install

# Rodar testes
npm run test:e2e

# Ver relatório
npx playwright show-report e2e/reports/playwright-report
```

---

**Seguindo estes passos NA ORDEM, os testes funcionarão!** 🚀