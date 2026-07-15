# 📋 Guia Completo de Comandos de Teste

## 🚀 Instalação (rode UMA VEZ antes dos testes)

```bash
npm install
```

Isso instalará todas as dependências necessárias, incluindo:
- `@cucumber/cucumber` - Para testes Gherkin
- `@playwright/test` - Framework de testes
- `ts-node` - Para executar TypeScript

---

## 🎯 Comandos Principais

### **Rodar TODOS os testes (headless - sem abrir navegador):**
```bash
npm run test:all
```

### **Rodar TODOS os testes (headed - ABRINDO o navegador):**
```bash
npm run test:all:headed
```

### **Rodar TODOS os testes com interface visual (recomendado para debug):**
```bash
npm run test:e2e:ui
```

---

## 🏷️ Comandos por TAG (Tipo de Teste)

### **Por Nível de Teste:**

```bash
# Testes Unitários
npm run test:unit

# Testes de Integração
npm run test:integration

# Testes de Sistema
npm run test:system

# Testes de Aceitação
npm run test:acceptance
```

### **Por Tipo Funcional:**

```bash
# Testes de Regressão
npm run test:regression

# Testes de Fumaça (mais críticos, rápidos)
npm run test:smoke

# Testes de UI
npm run test:ui

# Testes de API
npm run test:api

# Testes de Permissões
npm run test:permissions
```

### **Por Tipo Não-Funcional:**

```bash
# Testes de Performance
npm run test:performance

# Testes de Segurança
npm run test:security

# Testes de Estresse
npm run test:stress
```

### **Combinações Úteis:**

```bash
# Testes Críticos (smoke + critical tags)
npm run test:critical

# Suite Completa (regression + system + integration)
npm run test:full
```

---

## 🥒 Comandos Gherkin (Cucumber)

```bash
# Rodar todos os testes Gherkin (headless)
npm run test:cucumber

# Rodar testes Gherkin com navegador visível
npm run test:cucumber:headed

# Rodar feature específica
npx cucumber-js e2e/features/1-autenticacao.feature

# Rodar cenário específico (por linha)
npx cucumber-js e2e/features/2-permissoes-admin.feature:15
```

---

## 📊 Ver Relatórios

### **Relatório HTML do Playwright:**
```bash
npx playwright show-report
```

Isso abre um navegador com o relatório visual completo.

### **Relatório Cucumber:**
```bash
npm run test:cucumber:report
```

---

## 🐛 Debug

### **Debug mode (pausa em cada passo):**
```bash
npm run test:e2e:debug
```

### **Rodar teste específico:**
```bash
npx playwright test e2e/tests/smoke/critical-flows.spec.ts
```

### **Rodar com navegador visível:**
```bash
npm run test:e2e:headed
```

---

## 🧹 Limpeza de Dados

Os dados de teste são **AUTOMATICAMENTE LIMPOS** após a execução completa da suite.

Se precisar limpar manualmente:
```bash
# Execute qualquer teste - a limpeza roda automaticamente no final
npm run test:smoke
```

---

## 📁 Estrutura de Testes

```
e2e/
├── tests/
│   ├── smoke/          # Testes críticos, rápidos
│   ├── performance/    # Testes de tempo de carregamento
│   ├── security/       # Testes de segurança
│   ├── stress/         # Testes de carga/estresse
│   ├── ui/             # Testes de interface
│   ├── api/            # Testes de API
│   └── permissions/    # Testes de permissões por perfil
└── features/           # Arquivos Gherkin (.feature)
```

---

## 🎬 Workflow Recomendado

### **1. Desenvolvimento Diário:**
```bash
# Rode os testes críticos (rápido)
npm run test:smoke
```

### **2. Antes de Commit:**
```bash
# Rode testes de regressão
npm run test:regression
```

### **3. Antes de Deploy:**
```bash
# Rode TUDO
npm run test:all
```

### **4. Para Investigar Bugs:**
```bash
# Use a interface visual
npm run test:e2e:ui
```

---

## ⚙️ Configuração Importante

Os testes estão configurados para:
- ✅ **NÃO parar ao encontrar erros** - continua até o fim
- ✅ **Cleanup automático** - deleta dados de teste automaticamente
- ✅ **Rastreamento seguro** - só deleta o que foi criado durante os testes
- ✅ **Relatórios múltiplos** - HTML, JSON, JUnit
- ✅ **Screenshots** - captura quando falha
- ✅ **Vídeos** - grava quando falha

---

## 🎯 Tags Disponíveis

- `@smoke` - Testes críticos, rápidos
- `@critical` - Funcionalidades essenciais
- `@regression` - Testes de regressão
- `@ui` - Testes de interface
- `@api` - Testes de API
- `@permissions` - Testes de permissões
- `@performance` - Testes de performance
- `@security` - Testes de segurança
- `@stress` - Testes de estresse
- `@unit` - Testes unitários
- `@integration` - Testes de integração
- `@system` - Testes de sistema
- `@acceptance` - Testes de aceitação

---

## 💡 Dicas

1. **Primeiro teste?** Rode `npm run test:smoke` (1-2 min)
2. **Debugando?** Use `npm run test:e2e:ui` (interface visual)
3. **CI/CD?** Use `npm run test:all` (headless, completo)
4. **Teste rápido?** Use `npm run test:critical` (só os críticos)
5. **Teste específico?** Use `npx playwright test caminho/do/arquivo.spec.ts`

---

## 📞 Ajuda

Se algo não funcionar:
1. Verifique se rodou `npm install`
2. Verifique se o `.env.local` está configurado
3. Verifique se o servidor de dev está rodando (`npm run dev`)
4. Veja os logs no terminal
5. Veja o relatório HTML (`npx playwright show-report`)

---

**Pronto para testar!** 🚀