# 🚀 Guia Rápido de Testes

## 📦 Setup Inicial (rode UMA VEZ)

```bash
# 1. Limpar alterações locais e atualizar
git reset --hard HEAD
git pull origin main

# 2. Instalar dependências
npm install

# 3. Instalar navegadores do Playwright
npx playwright install
```

---

## 🧪 Comandos de Teste

### **1. TODOS os testes (sem navegador) + relatório:**
```bash
npx playwright test --reporter=html
npx playwright show-report
```

### **2. CRÍTICOS apenas (rápido) + relatório:**
```bash
npx playwright test --grep "@smoke|@critical" --reporter=html
npx playwright show-report
```

### **3. SMOKE apenas (super rápido) + relatório:**
```bash
npx playwright test --grep @smoke --reporter=html
npx playwright show-report
```

### **4. Com navegador VISÍVEL (debug):**
```bash
npx playwright test --headed --grep @smoke
```

### **5. Interface visual (melhor para explorar):**
```bash
npx playwright test --ui
```

---

## 🏷️ Testes por Categoria

```bash
# Performance
npx playwright test --grep @performance

# Segurança
npx playwright test --grep @security

# Estresse
npx playwright test --grep @stress

# Permissões
npx playwright test --grep @permissions

# API
npx playwright test --grep @api
```

---

## 📊 Relatórios

Após rodar testes, veja:
- **HTML:** `npx playwright show-report`
- **Pasta:** `playwright-report/`

---

## ✅ CI/CD (GitHub Actions)

O arquivo `.github/workflows/tests.yml` roda automaticamente:
- ✅ Push para `main` ou `develop`
- ✅ Gera relatório HTML
- ✅ Disponível em Artifacts

---

## 🐛 Troubleshooting

**Erro "browser not installed":**
```bash
npx playwright install
```

**Limpar cache:**
```bash
rm -rf playwright-report/ test-results/
```

**Ver testes disponíveis:**
```bash
npx playwright test --list
```

---

**Simples assim!** 🎉