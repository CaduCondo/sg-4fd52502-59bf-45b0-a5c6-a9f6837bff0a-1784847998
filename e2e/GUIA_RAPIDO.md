# 🚀 Guia Rápido - Como Rodar os Testes

## ✅ Pré-requisitos

Tudo já está configurado! Você só precisa ter:
- ✅ Node.js instalado
- ✅ Projeto rodando localmente (`npm run dev`)
- ✅ `.env.local` configurado (já está!)

---

## 📋 Comandos Principais

### 🎯 **Rodar TODOS os testes:**
```bash
npm run test:e2e
```
Roda todos os testes em modo headless (sem abrir navegador).

### 🎨 **Rodar com Interface Visual (RECOMENDADO):**
```bash
npm run test:e2e:ui
```
Abre uma interface web onde você pode:
- Ver todos os testes
- Rodar individualmente
- Ver o navegador em tempo real
- Debugar falhas

### 👀 **Rodar Vendo o Navegador:**
```bash
npm run test:e2e:headed
```
Roda os testes mostrando o navegador (bom para ver o que está acontecendo).

### 🐛 **Modo Debug:**
```bash
npm run test:e2e:debug
```
Pausa em cada passo, permite inspecionar elementos.

---

## 🎯 Rodar Testes Específicos

### Por pasta:
```bash
npx playwright test tests/ui/           # Apenas testes de UI
npx playwright test tests/api/          # Apenas testes de API
npx playwright test tests/permissions/  # Apenas testes de permissões
```

### Por arquivo:
```bash
npx playwright test login.spec.ts
npx playwright test tests/permissions/financial-role.spec.ts
```

### Por nome do teste:
```bash
npx playwright test -g "deve validar email"
npx playwright test -g "Financeiro"
```

---

## 📊 Ver Relatório de Resultados

Após rodar os testes, veja o relatório detalhado:
```bash
npx playwright show-report
```

Mostra:
- ✅ Testes que passaram
- ❌ Testes que falharam
- ⏭️ Testes pulados
- 📸 Screenshots de falhas
- ⏱️ Tempo de execução

---

## 🎭 Ordem Recomendada para Começar

### 1️⃣ **Primeiro: Interface Visual**
```bash
npm run test:e2e:ui
```
- Melhor para explorar e entender os testes
- Interface amigável
- Fácil de debugar

### 2️⃣ **Depois: Modo Headless**
```bash
npm run test:e2e
```
- Mais rápido
- Ideal para rodar todos os testes
- Gera relatório automaticamente

---

## 📁 O que vai rodar?

Quando você executa `npm run test:e2e`, ele roda:

### ✅ **Testes ATIVOS** (18 testes - vão executar):
- `example.spec.ts` - 5 testes básicos de login
- `login.spec.ts` - 13 testes completos de autenticação
- `tests/ui/login.spec.ts` - 7 testes com Page Objects
- `tests/api/auth.api.spec.ts` - 3 testes de API

### ⏭️ **Testes DESABILITADOS** (67 testes - marcados como `.skip`):
- `properties.spec.ts` - 14 testes (requerem auth)
- `tenants.spec.ts` - 15 testes (requerem auth)
- `rentals.spec.ts` - 14 testes (requerem auth)
- `payments.spec.ts` - 13 testes (requerem auth)
- `dashboard.spec.ts` - 11 testes (requerem auth)

### 🔐 **Testes de Permissões** (2 testes - requerem configuração):
- `tests/permissions/financial-role.spec.ts` - validação de perfil Financeiro

---

## ⚙️ Configurar Usuários de Teste

Se quiser rodar os testes de permissões, edite:
```
e2e/config/test.config.ts
```

E altere as credenciais dos usuários de teste:
```typescript
users: {
  financial: {
    email: 'seu-email@teste.com',    // ← Altere aqui
    password: 'SuaSenha@123',         // ← Altere aqui
    name: 'Nome do Usuário',
    role: 'financial'
  }
}
```

---

## 🎯 Exemplo Prático

### **Cenário: Quero rodar todos os testes e ver o resultado**

**Passo 1:** Abra o terminal no projeto

**Passo 2:** Execute:
```bash
npm run test:e2e
```

**Passo 3:** Aguarde a execução (leva ~30 segundos)

**Passo 4:** Veja o relatório:
```bash
npx playwright show-report
```

**Resultado esperado:**
```
Running 18 tests
  ✓ example.spec.ts (5 passed)
  ✓ login.spec.ts (13 passed)

18 passed (30s)
```

---

## 🐛 Problemas Comuns

### ❌ "Cannot find module '@playwright/test'"
**Solução:**
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### ❌ "Port 3000 is already in use"
**Solução:** O servidor já está rodando. Isso é normal! Os testes vão se conectar ao servidor existente.

### ❌ "Error: page.goto: net::ERR_CONNECTION_REFUSED"
**Solução:** O servidor não está rodando. Execute em outro terminal:
```bash
npm run dev
```

### ❌ Testes falhando
**Solução:** Veja o relatório detalhado:
```bash
npx playwright show-report
```
E procure por screenshots das falhas.

---

## 📸 Gravar Novos Testes

Quer criar testes sem programar? Use o **Codegen**:

```bash
npx playwright codegen http://localhost:3000
```

Isso abre:
1. Navegador para você usar o app
2. Janela com código gerado automaticamente
3. Copie e cole o código nos arquivos de teste

---

## ✨ Resumo

**Comando mais útil:**
```bash
npm run test:e2e:ui
```
☝️ Use este para explorar e debugar

**Comando para CI/CD:**
```bash
npm run test:e2e
```
☝️ Use este para rodar tudo rapidamente

---

**Pronto!** 🎉 Agora você sabe tudo para rodar os testes!

Dúvidas? Veja o README completo em `e2e/README.md`