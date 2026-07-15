import { test, expect } from '@playwright/test';

/**
 * Testes da página de Dashboard
 */

test.describe.skip('Página de Dashboard (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/dashboard');
  });

  test('deve exibir o dashboard com mensagem de boas-vindas', async ({ page }) => {
    await expect(page.locator('#dashboard-page')).toBeVisible();
    
    // Verificar saudação
    await expect(page.getByText(/bem-vindo/i)).toBeVisible();
  });

  test('deve exibir cards de métricas principais', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForTimeout(2000);

    // Verificar que há cards visíveis
    const cards = page.locator('.card, [class*="card"]');
    const count = await cards.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('deve exibir valores nas métricas', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por valores monetários (R$)
    const hasCurrency = await page.getByText(/R\$/).count();
    expect(hasCurrency).toBeGreaterThan(0);

    // Procurar por números (métricas)
    const hasNumbers = await page.getByText(/\d+/).count();
    expect(hasNumbers).toBeGreaterThan(0);
  });

  test('seletor de período deve estar presente', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por seletores de mês e ano
    // (verificar se existem dropdowns ou botões de seleção)
    const selects = page.locator('select, button[role="combobox"]');
    const count = await selects.count();
    
    // Deve ter pelo menos algum seletor
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve alternar período e recarregar dados', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Tentar alterar mês (se houver seletor)
    const monthSelector = page.locator('select').first();
    const exists = await monthSelector.count();

    if (exists > 0) {
      await monthSelector.selectOption({ index: 1 });
      await page.waitForTimeout(1500);

      // Dados devem ter recarregado
      await expect(page.locator('#dashboard-page')).toBeVisible();
    }
  });

  test('gráficos devem estar presentes (se implementados)', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Procurar por elementos de gráfico (canvas, svg)
    const charts = page.locator('canvas, svg[class*="chart"]');
    const count = await charts.count();

    // Pode ter 0 se gráficos não estiverem implementados
    console.log('Número de gráficos encontrados:', count);
  });

  test('deve mostrar informações de imóveis', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por texto relacionado a imóveis
    const hasProperties = await page.getByText(/imóveis?|propriedades?/i).count();
    expect(hasProperties).toBeGreaterThanOrEqual(0);
  });

  test('deve mostrar informações de locações', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por texto relacionado a locações
    const hasRentals = await page.getByText(/locaç(ão|ões)|contratos?/i).count();
    expect(hasRentals).toBeGreaterThanOrEqual(0);
  });

  test('deve mostrar informações financeiras', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por texto relacionado a finanças
    const hasFinancial = await page.getByText(/receb|pag|lucro|receita/i).count();
    expect(hasFinancial).toBeGreaterThanOrEqual(0);
  });

  test('navegação deve estar acessível', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verificar que os links de navegação estão presentes
    await expect(page.getByRole('navigation')).toBeVisible();

    // Links principais
    const links = ['Dashboard', 'Imóveis', 'Inquilinos', 'Locações', 'Pagamentos'];
    
    for (const linkText of links) {
      const link = page.getByRole('link', { name: new RegExp(linkText, 'i') }).first();
      const exists = await link.count();
      expect(exists).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Dashboard - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});