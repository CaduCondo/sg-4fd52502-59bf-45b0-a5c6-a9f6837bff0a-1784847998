# 🚀 Setup e Comandos Simples

## 📦 1. SETUP LOCAL (fazer UMA VEZ)

### Passo 1: Limpar tudo e atualizar do repositório
```bash
# Descartar TODAS as alterações locais
git reset --hard HEAD

# Baixar última versão do repositório
git pull origin main

# Instalar dependências
npm install

# Instalar navegadores do Playwright (apenas primeira vez)
npx playwright install
```

---

## 🧪 2. RODAR OS TESTES

### Opção 1: TUDO (Completo com Relatório)
```bash
npm run test:all
```
**O que faz:**
- ✅ Roda TODOS os testes (Smoke, Critical, UI, API, Permissions)
- ✅ Gera relatório HTML completo com screenshots
- ✅ Continua mesmo se encontrar erros
- ✅ Limpa dados de teste automaticamente no final

**Ver relatório depois:**
```bash
npx playwright show-report
```

---

### Opção 2: Apenas CRÍTICOS (Relatório Completo)
```bash
npm run test:critical
```
**O que faz:**
- ✅ Roda apenas testes @smoke e @critical (os mais importantes)
- ✅ Mais rápido (~5-10 minutos)
- ✅ Gera relatório HTML
- ✅ Ideal para validação rápida

**Ver relatório depois:**
```bash
npx playwright show-report
```

---

### Opção 3: Apenas SMOKE (Relatório Completo)
```bash
npm run test:smoke
```
**O que faz:**
- ✅ Roda apenas testes @smoke (fluxos críticos básicos)
- ✅ MUITO rápido (~2-5 minutos)
- ✅ Gera relatório HTML
- ✅ Ideal para verificação rápida antes de commit

**Ver relatório depois:**
```bash
npx playwright show-report
```

---

## 📊 3. RELATÓRIOS

Todos os comandos acima geram relatórios automaticamente em:
- `playwright-report/index.html`

**Abrir relatório:**
```bash
npx playwright show-report
```

**O relatório contém:**
- ✅ Total de testes passados/falhos
- ✅ Screenshots de cada passo
- ✅ Vídeos de testes que falharam
- ✅ Logs detalhados
- ✅ Tempo de execução

---

## 🔄 4. WORKFLOW RECOMENDADO

### Antes de fazer commit:
```bash
# 1. Atualizar do repositório
git pull origin main

# 2. Rodar smoke tests (rápido)
npm run test:smoke

# 3. Se passar, fazer commit
git add .
git commit -m "sua mensagem"
git push
```

### Antes de deploy:
```bash
# Rodar testes críticos (mais completo)
npm run test:critical

# Se tudo passar, pode deployar
```

### Testes completos (semanal/antes de release):
```bash
# Rodar TUDO
npm run test:all

# Revisar relatório
npx playwright show-report
```

---

## 🤖 5. CONFIGURAÇÃO PARA CI/CD

### GitHub Actions (.github/workflows/tests.yml)
```yaml
name: Testes E2E

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run tests
        run: npm run test:all
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Vercel (vercel.json)
```json
{
  "buildCommand": "npm run build && npm run test:critical",
  "installCommand": "npm install && npx playwright install"
}
```

---

## ❓ DÚVIDAS COMUNS

### "Teste falhou mas não entendo o erro"
```bash
# Abrir relatório visual
npx playwright show-report

# Ou rodar em modo debug
npm run test:e2e:debug
```

### "Quero ver os testes rodando"
```bash
# Rodar com navegador visível
npm run test:e2e:headed
```

### "Dados de teste ficaram no banco"
Não se preocupe! Os testes limpam automaticamente ao final.

Mas se quiser limpar manualmente:
```bash
# Abrir console do Supabase
# SQL > Execute:
DELETE FROM rentals WHERE created_at > NOW() - INTERVAL '1 hour';
DELETE FROM properties WHERE name LIKE '%[TEST]%';
DELETE FROM tenants WHERE name LIKE '%Teste%';
```

### "Comando não encontrado"
```bash
# Reinstalar dependências
npm install

# Reinstalar Playwright
npx playwright install
```

---

## 📋 RESUMO DOS 3 COMANDOS PRINCIPAIS

```bash
# 1. TUDO (completo, ~30min)
npm run test:all

# 2. CRÍTICOS (importantes, ~10min)
npm run test:critical

# 3. SMOKE (rápido, ~5min)
npm run test:smoke

# Ver relatório de qualquer um
npx playwright show-report
```

---

**Pronto! Apenas 3 comandos simples.** 🎉