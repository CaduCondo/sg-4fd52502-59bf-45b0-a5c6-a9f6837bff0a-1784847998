# Testes E2E com Playwright

Esta pasta contém os testes automatizados end-to-end (E2E) do sistema de gerenciamento de imóveis.

## 📁 Estrutura de Testes

```
e2e/
├── example.spec.ts       # 5 testes básicos da página de login
├── login.spec.ts         # 13 testes completos de autenticação
├── properties.spec.ts    # 14 testes CRUD de imóveis
├── tenants.spec.ts       # 15 testes CRUD de inquilinos
├── rentals.spec.ts       # 14 testes de gestão de locações
├── payments.spec.ts      # 13 testes de gestão de pagamentos
├── dashboard.spec.ts     # 11 testes do dashboard
└── README.md            # Este arquivo
```

**Total: 85 cenários de teste**

## 🎯 Cobertura de Testes

### ✅ Login (18 testes - ATIVOS)
- Interface completa
- Preenchimento de campos
- Toggle de senha
- Modal de recuperação de senha
- Validações de email
- Mensagens de erro

### ⏭️ Properties (14 testes - REQUEREM AUTH)
- CRUD completo
- Alternância de visualizações
- Filtros (busca, localização, status)
- Validações de campos
- Máscaras e formatação

### ⏭️ Tenants (15 testes - REQUEREM AUTH)
- CRUD completo
- Validação CPF/CNPJ
- Máscaras (telefone, RG, CEP)
- Busca automática de CEP
- Filtros e busca

### ⏭️ Rentals (14 testes - REQUEREM AUTH)
- Criação de locação
- Gestão de caução
- Parcelamento de caução
- Garagem e corretor parceiro
- Filtros por status

### ⏭️ Payments (13 testes - REQUEREM AUTH)
- Filtros por mês/ano
- Visualizações diferentes
- Gestão de recibos
- Cancelamento de pagamentos
- Busca e filtros

### ⏭️ Dashboard (11 testes - REQUEREM AUTH)
- Cards de métricas
- Gráficos
- Seleção de período
- Navegação

## 🚀 Como Executar

### 1. Executar com Interface Visual (recomendado)
```bash
npm run test:e2e:ui
```
- Interface gráfica interativa
- Veja os testes em tempo real
- Debug visual fácil
- Time-travel através das etapas

### 2. Executar Todos os Testes (headless)
```bash
npm run test:e2e
```
- Execução rápida em background
- Gera relatório HTML
- Ideal para CI/CD

### 3. Executar com Navegador Visível
```bash
npm run test:e2e:headed
```
- Ver o navegador em ação
- Debug visual
- Mais lento que headless

### 4. Debug Mode (step-by-step)
```bash
npm run test:e2e:debug
```
- Pausa em cada passo
- Console de debug
- Inspecionar elementos

## 📝 Executar Testes Específicos

### Por arquivo:
```bash
npx playwright test login.spec.ts
npx playwright test properties.spec.ts
```

### Por nome do teste:
```bash
npx playwright test -g "deve validar email"
npx playwright test -g "deve criar imóvel"
```

### Por tag/grupo:
```bash
npx playwright test --grep @smoke
npx playwright test --grep @critical
```

## 🔐 Testes que Requerem Autenticação

A maioria dos testes está marcada com `.skip` porque requer autenticação:
- properties.spec.ts (14 testes)
- tenants.spec.ts (15 testes)
- rentals.spec.ts (14 testes)
- payments.spec.ts (13 testes)
- dashboard.spec.ts (11 testes)

### Para Ativar Estes Testes:

**Opção 1: Remover `.skip` manualmente**
```typescript
// Antes
test.describe.skip('Página de Imóveis (requer auth)', () => {

// Depois
test.describe('Página de Imóveis (requer auth)', () => {
```

**Opção 2: Criar helper de autenticação**
```typescript
// e2e/helpers/auth.ts
export async function loginHelper(page, username, password) {
  await page.goto('/login');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#login-submit-button').click();
  await page.waitForURL('**/dashboard');
}

// Usar nos testes:
import { loginHelper } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginHelper(page, 'seu-usuario@exemplo.com', 'SuaSenha123');
  await page.goto('/properties');
});
```

## 📊 Relatórios

Após executar os testes, um relatório HTML é gerado automaticamente:

```bash
npx playwright show-report
```

O relatório mostra:
- ✅ Testes que passaram
- ❌ Testes que falharam
- ⏭️ Testes pulados
- 📸 Screenshots de falhas
- 🎬 Vídeos de execução (se configurado)
- 📋 Trace files para debug

## 🎬 Gravar Novos Testes

O Playwright tem um recurso incrível: **gerar testes automaticamente** enquanto você usa o app!

```bash
npx playwright codegen http://localhost:3000
```

Isso abre:
1. Um navegador para você usar o app normalmente
2. Uma janela com o código sendo gerado automaticamente
3. Copie e cole o código gerado nos arquivos de teste

## 🐛 Debugging

### Ver último teste que falhou:
```bash
npx playwright show-trace
```

### Pausar execução em breakpoints:
```typescript
test('meu teste', async ({ page }) => {
  await page.goto('/login');
  await page.pause(); // Pausa aqui
  await page.locator('#username').fill('teste');
});
```

### Inspecionar elementos:
```bash
npx playwright inspector
```

## 📋 Convenções de IDs

Todos os elementos interativos têm IDs no padrão:
```
{page}-{section}-{element}
```

Exemplos:
- `#login-submit-button`
- `#properties-new-button`
- `#tenant-name`
- `#rental-property`
- `#payment-filters-month`

## ✨ Melhores Práticas

1. **Use IDs em vez de classes ou XPath**
   ```typescript
   // ✅ Bom
   await page.locator('#login-submit-button').click();
   
   // ❌ Evite
   await page.locator('.btn.btn-primary').click();
   ```

2. **Aguarde elementos antes de interagir**
   ```typescript
   await expect(page.locator('#tenant-name')).toBeVisible();
   await page.locator('#tenant-name').fill('João');
   ```

3. **Use timeouts generosos para operações de rede**
   ```typescript
   await page.waitForTimeout(2000); // Aguardar API
   ```

4. **Limpe estado entre testes**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Resetar para estado inicial
   });
   ```

## 🔧 Configuração

Arquivo principal: `playwright.config.ts`

Principais configurações:
- **timeout**: 30 segundos por teste
- **expect timeout**: 5 segundos
- **navegadores**: Chromium (padrão), Firefox, Safari
- **viewport**: 1280x720
- **servidor local**: http://localhost:3000

## 📚 Recursos

- [Documentação Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors Guide](https://playwright.dev/docs/selectors)

---

**Pronto para começar!** 🚀

Execute `npm run test:e2e:ui` e veja a mágica acontecer!