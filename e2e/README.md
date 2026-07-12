# 🧪 Testes E2E Automatizados - Sistema de Gerenciamento de Locações

Testes end-to-end automatizados usando **Playwright** + **BDD (Cucumber/Gherkin)** com integração CI/CD no GitHub Actions.

## 📋 Índice

- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Executando Testes](#-executando-testes)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Cenários de Teste](#-cenários-de-teste)
- [CI/CD GitHub Actions](#-cicd-github-actions)
- [Relatórios](#-relatórios)
- [Troubleshooting](#-troubleshooting)

---

## 🔧 Pré-requisitos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**
- Aplicação rodando localmente em `http://localhost:3000` (ou configurar `BASE_URL`)

---

## 📦 Instalação

### 1. Clone o repositório (se ainda não fez)

```bash
git clone <seu-repositorio>
cd <nome-do-projeto>
```

### 2. Instale as dependências dos testes

```bash
cd e2e
npm install
```

### 3. Instale os browsers do Playwright

```bash
npx playwright install
```

Isso instalará Chromium, Firefox e WebKit automaticamente.

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na pasta `e2e/` com as seguintes variáveis:

```env
# URL da aplicação
BASE_URL=http://localhost:3000

# Credenciais de teste (usuário dedicado para testes)
TEST_USER_EMAIL=teste@exemplo.com
TEST_USER_PASSWORD=SenhaSegura123!

# Supabase (para limpeza de dados)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

⚠️ **IMPORTANTE:** 
- Use um **usuário de teste dedicado**, não use sua conta real
- Use uma **base de dados de teste**, nunca produção
- A `SUPABASE_SERVICE_ROLE_KEY` é necessária para limpeza automática de dados

---

## 🚀 Executando Testes

### Todos os testes (modo headless)

```bash
npm test
```

### Com interface visual (headed mode)

```bash
npm run test:headed
```

### Com UI interativa do Playwright

```bash
npm run test:ui
```

### Modo debug (para debugar um teste específico)

```bash
npm run test:debug
```

### Apenas Chromium

```bash
npm run test:chromium
```

### Ver relatório HTML após execução

```bash
npm run test:report
```

---

## 📁 Estrutura do Projeto

```
e2e/
├── README.md                          # Esta documentação
├── package.json                       # Dependências dos testes
├── playwright.config.ts               # Configuração do Playwright
├── .env                               # Variáveis de ambiente (não commitado)
│
├── features/                          # Cenários BDD em Gherkin
│   ├── rental-complete-flow.feature   # Fluxo completo de locação
│   └── financial-validation.feature   # Validações financeiras
│
├── steps/                             # Implementação dos steps BDD
│   ├── common.steps.ts                # Steps compartilhados
│   ├── property.steps.ts              # Steps de imóveis
│   ├── tenant.steps.ts                # Steps de inquilinos
│   ├── rental.steps.ts                # Steps de locações
│   ├── payment.steps.ts               # Steps de pagamentos
│   └── financial.steps.ts             # Steps de financeiro
│
├── support/                           # Helpers e utilitários
│   ├── auth.ts                        # Autenticação
│   ├── test-data.ts                   # Dados mock
│   └── db-cleanup.ts                  # Limpeza de dados
│
└── test-results/                      # Artefatos gerados (não commitado)
    ├── html-report/                   # Relatório HTML
    ├── artifacts/                     # Screenshots, vídeos, traces
    ├── report.json                    # Relatório JSON
    └── junit.xml                      # Relatório JUnit (CI/CD)
```

---

## 📝 Cenários de Teste

### 1. Fluxo Completo de Locação

**Arquivo:** `features/rental-complete-flow.feature`

Cobre o fluxo completo:

1. ✅ **Criar Imóvel**
   - Preenche formulário com dados completos
   - Valida criação com sucesso
   - Verifica exibição na lista

2. ✅ **Criar Inquilino**
   - Preenche formulário com dados pessoais
   - Valida criação com sucesso
   - Verifica exibição na lista

3. ✅ **Testar Deleção Antes da Locação**
   - Tenta deletar imóvel (deve funcionar)
   - Tenta deletar inquilino (deve funcionar)

4. ✅ **Criar Locação**
   - Vincula imóvel e inquilino criados
   - Define período, valores, vencimento
   - Configura caução parcelada
   - Valida criação automática de pagamentos

5. ✅ **Validar Pagamentos Automáticos**
   - Verifica 12 parcelas de aluguel criadas
   - Verifica 5 parcelas de caução criadas
   - Valida valores e datas de vencimento

6. ✅ **Testar Deleção com Locação Ativa** (deve falhar)
   - Tenta deletar imóvel vinculado
   - Tenta deletar inquilino vinculado
   - Valida mensagens de erro corretas

### 2. Pagamentos com Multas e Juros

**Cenários:**

1. **Pagamento dentro do prazo** (sem multa/juros)
   - Data pagamento = data vencimento
   - Valor = valor esperado

2. **Pagamento 5 dias atrasado**
   - Multa: 2% do valor
   - Juros: 0,033% ao dia × 5 dias
   - Valida cálculo automático

3. **Pagamento 30 dias atrasado**
   - Multa: 2% do valor
   - Juros: 0,033% ao dia × 30 dias
   - Valida cálculo automático

### 3. Validação Tela Financeiro

Valida:
- Totalizadores de receitas por período
- Discriminação: Aluguel + Caução + Taxa Admin
- Valores de multas e juros separados
- Gráficos de evolução mensal

### 4. Limpeza Final

Deleta todos os dados criados:
1. Pagamentos realizados
2. Locação encerrada
3. Imóvel deletado
4. Inquilino deletado

---

## 🔄 CI/CD GitHub Actions

### Workflow Automático

O arquivo `.github/workflows/e2e-tests.yml` executa:

1. **Trigger:** Em todo `push` ou `pull_request` na branch `main`
2. **Setup:** Instala Node.js, dependências, browsers
3. **Testes:** Executa todos os testes E2E
4. **Relatórios:** Gera HTML, JSON, JUnit
5. **Artifacts:** Upload de screenshots, vídeos, traces
6. **Email:** Envia relatório para `stefcadu@gmail.com`
7. **Deploy:** Só faz deploy se TODOS os testes passarem

### Status Badge

Adicione ao `README.md` principal:

```markdown
![E2E Tests](https://github.com/seu-usuario/seu-repo/workflows/E2E%20Tests/badge.svg)
```

### Ver Resultados no GitHub

1. Acesse **Actions** no repositório
2. Clique no workflow **E2E Tests**
3. Veja logs, screenshots, vídeos nos **Artifacts**

---

## 📊 Relatórios

### Relatório HTML Interativo

Após executar os testes:

```bash
npm run test:report
```

Isso abrirá um relatório HTML com:
- ✅ Testes passados/falhados
- 📸 Screenshots de falhas
- 🎥 Vídeos de execução
- ⏱️ Tempos de execução
- 🔍 Trace viewer para debug

### Relatório JSON

Gerado automaticamente em `test-results/report.json`

Útil para integração com outras ferramentas.

### Relatório JUnit XML

Gerado automaticamente em `test-results/junit.xml`

Padrão usado por ferramentas de CI/CD.

---

## 🐛 Troubleshooting

### Testes falhando: "Timeout waiting for element"

**Causa:** Elemento não apareceu no tempo esperado

**Solução:**
```typescript
// Aumente o timeout nas configurações
await page.waitForSelector('seletor', { timeout: 30000 });
```

### Erro: "Cannot find module '@cucumber/cucumber'"

**Causa:** Dependências não instaladas

**Solução:**
```bash
cd e2e
npm install
```

### Erro: "Browser not found"

**Causa:** Browsers do Playwright não instalados

**Solução:**
```bash
npx playwright install
```

### Erro: "Authentication failed"

**Causa:** Credenciais incorretas no `.env`

**Solução:** Verifique `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`

### Testes passam localmente mas falham no CI

**Causa:** Diferenças de ambiente (timing, dados, etc.)

**Solução:**
- Aumente `retries` em `playwright.config.ts`
- Adicione `waitForLoadState('networkidle')` após navegações
- Use seletores mais estáveis (data-testid)

### Limpeza de dados não funciona

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` ausente ou incorreta

**Solução:** Verifique a chave no Supabase Dashboard > Settings > API

---

## 📧 Email com Relatórios

O GitHub Actions envia automaticamente um email para `stefcadu@gmail.com` após cada execução com:

- ✅/❌ Status geral dos testes
- 📊 Resumo de passados/falhados
- 🔗 Link para ver detalhes no GitHub
- 📸 Screenshots de falhas (se houver)

### Configurar Email Customizado

Edite `.github/workflows/e2e-tests.yml`:

```yaml
- name: Send Email Report
  env:
    EMAIL_TO: seu-email@exemplo.com  # Trocar aqui
```

---

## 🎯 Boas Práticas

### 1. Use data-testid para seletores estáveis

```tsx
<Button data-testid="save-button">Salvar</Button>
```

```typescript
await page.click('[data-testid="save-button"]');
```

### 2. Aguarde carregamento completo

```typescript
await page.waitForLoadState('networkidle');
```

### 3. Use asserções específicas

```typescript
// ❌ Ruim
await expect(page.locator('div')).toBeVisible();

// ✅ Bom
await expect(page.locator('[data-testid="success-message"]')).toHaveText('Sucesso!');
```

### 4. Isole dados de teste

- Use sempre dados de teste únicos
- Limpe dados antes/depois dos testes
- Não compartilhe dados entre testes paralelos

### 5. Capture evidências em falhas

```typescript
if (testFailed) {
  await page.screenshot({ path: 'screenshot.png' });
  await page.video()?.saveAs('video.webm');
}
```

---

## 📚 Recursos Adicionais

- [Playwright Docs](https://playwright.dev/)
- [Cucumber Docs](https://cucumber.io/docs/cucumber/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## 👨‍💻 Autor

**Stefan Cadu**  
Email: stefcadu@gmail.com

---

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar