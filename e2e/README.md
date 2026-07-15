# Testes E2E com Playwright

Esta pasta contém os testes automatizados end-to-end (E2E) do sistema usando o Playwright.

## 📋 Pré-requisitos

- Node.js instalado
- Projeto Next.js rodando (`npm run dev`)
- Supabase configurado (para testes que envolvem autenticação)

## 🚀 Como Rodar os Testes

### Rodar todos os testes
```bash
npm run test:e2e
```

### Rodar com interface visual (recomendado para desenvolvimento)
```bash
npm run test:e2e:ui
```

### Rodar com navegador visível (debug)
```bash
npm run test:e2e:headed
```

### Rodar em modo debug (passo a passo)
```bash
npm run test:e2e:debug
```

### Rodar apenas um arquivo específico
```bash
npx playwright test e2e/login.spec.ts
```

### Rodar apenas um teste específico
```bash
npx playwright test -g "deve mostrar a página de login"
```

## 📁 Estrutura

```
e2e/
├── example.spec.ts       # Exemplos básicos de teste
├── login.spec.ts         # Testes de login
├── properties.spec.ts    # Testes da página de imóveis (precisa auth)
└── README.md            # Este arquivo
```

## 🎯 Padrão de IDs

Todos os elementos interativos têm IDs no formato:
```
{page}-{section}-{element}
```

Exemplos:
- `login-username` - Campo de usuário na página de login
- `properties-new-button` - Botão de novo imóvel
- `rentals-form-submit` - Botão de submeter formulário de locação

Use esses IDs nos testes:
```typescript
await page.locator('#login-username').fill('usuario@exemplo.com');
```

## ✍️ Como Criar Novos Testes

### 1. Criar um novo arquivo `.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Nome do Grupo de Testes', () => {
  test('deve fazer algo específico', async ({ page }) => {
    await page.goto('/sua-pagina');
    
    // Suas ações e verificações aqui
    await page.locator('#seu-elemento-id').click();
    await expect(page.locator('#outro-elemento')).toBeVisible();
  });
});
```

### 2. Principais comandos do Playwright

**Navegação:**
```typescript
await page.goto('/login');
await page.goBack();
await page.reload();
```

**Localizar elementos (use os IDs que criamos!):**
```typescript
await page.locator('#element-id')           // Por ID (preferido)
await page.locator('button')                // Por tag
await page.locator('text=Login')            // Por texto
await page.locator('[data-testid="btn"]')  // Por data attribute
```

**Ações:**
```typescript
await page.locator('#button-id').click();
await page.locator('#input-id').fill('texto');
await page.locator('#checkbox-id').check();
await page.locator('#select-id').selectOption('valor');
```

**Verificações:**
```typescript
await expect(page.locator('#element')).toBeVisible();
await expect(page.locator('#input')).toHaveValue('texto');
await expect(page.locator('h1')).toContainText('Título');
await expect(page).toHaveURL(/.*dashboard/);
```

**Esperar por elementos:**
```typescript
await page.waitForSelector('#element-id');
await page.waitForURL('**/dashboard');
await page.waitForLoadState('networkidle');
```

## 🔐 Autenticação nos Testes

Para testar páginas que precisam de autenticação, você tem 3 opções:

### Opção 1: Login manual em cada teste
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-username').fill('admin@exemplo.com');
  await page.locator('#login-password').fill('senha123');
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard');
});
```

### Opção 2: State reutilizável (recomendado)
Crie um arquivo `e2e/auth.setup.ts`:
```typescript
import { test as setup } from '@playwright/test';

setup('autenticar', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-username').fill('admin@exemplo.com');
  await page.locator('#login-password').fill('senha123');
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard');
  
  // Salvar estado de autenticação
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

Depois use nos testes:
```typescript
test.use({ storageState: 'e2e/.auth/user.json' });
```

### Opção 3: API Token (mais rápido)
Se você tiver endpoint de geração de token:
```typescript
test.beforeEach(async ({ page }) => {
  const token = await getAuthToken(); // Sua função
  await page.context().addCookies([{
    name: 'auth_token',
    value: token,
    domain: 'localhost',
    path: '/'
  }]);
});
```

## 📊 Relatórios

Após rodar os testes, um relatório HTML é gerado automaticamente:

```bash
npx playwright show-report
```

## 🐛 Debug de Testes

### 1. Ver o que está acontecendo
Use `--headed` para ver o navegador:
```bash
npm run test:e2e:headed
```

### 2. Modo debug com breakpoints
```bash
npm run test:e2e:debug
```

### 3. Adicionar console.log nos testes
```typescript
test('exemplo', async ({ page }) => {
  console.log('Navegando para /login');
  await page.goto('/login');
  
  const text = await page.locator('h1').textContent();
  console.log('Título encontrado:', text);
});
```

### 4. Capturar screenshot manualmente
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### 5. Pausar execução
```typescript
await page.pause(); // Abre o Playwright Inspector
```

## 📝 Boas Práticas

1. ✅ **Use os IDs que criamos** - São estáveis e não mudam
2. ✅ **Testes independentes** - Cada teste deve funcionar sozinho
3. ✅ **Limpe dados de teste** - Use beforeEach/afterEach quando necessário
4. ✅ **Nomes descritivos** - "deve fazer login com sucesso" não "test1"
5. ✅ **Não use timeouts fixos** - Prefira `waitFor...` ao invés de `wait(5000)`
6. ✅ **Um conceito por teste** - Teste apenas uma coisa de cada vez

## ❌ Evite

1. ❌ Seletores baseados em CSS frágil (`.class1 > div:nth-child(2)`)
2. ❌ Timeouts arbitrários (`await page.waitForTimeout(5000)`)
3. ❌ Testes que dependem da ordem de execução
4. ❌ Hard-coded values - Use variáveis de ambiente
5. ❌ Testar muita coisa em um único teste

## 🎓 Recursos

- [Documentação Oficial do Playwright](https://playwright.dev)
- [Cheat Sheet de Seletores](https://playwright.dev/docs/selectors)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 💡 Dicas

**Gerar testes automaticamente gravando suas ações:**
```bash
npx playwright codegen http://localhost:3000
```

**Ver traços de execução detalhados:**
```bash
npx playwright show-trace trace.zip
```

**Rodar apenas testes que falharam:**
```bash
npx playwright test --last-failed
```

---

**Pronto para começar!** 🚀

Execute `npm run test:e2e:ui` e veja a mágica acontecer!