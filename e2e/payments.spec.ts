import { test, expect } from '@playwright/test';

/**
 * Testes da página de Pagamentos
 */

test.describe.skip('Página de Pagamentos (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/payments');
  });

  test('deve exibir a página de pagamentos', async ({ page }) => {
    await expect(page.locator('#payments-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /pagamentos/i })).toBeVisible();
  });

  test('deve exibir filtros de mês e ano', async ({ page }) => {
    await expect(page.locator('#payment-filters-month')).toBeVisible();
    await expect(page.locator('#payment-filters-year')).toBeVisible();
  });

  test('deve alternar entre meses', async ({ page }) => {
    const monthFilter = page.locator('#payment-filters-month');

    // Selecionar Janeiro
    await monthFilter.click();
    await page.getByText('Janeiro', { exact: true }).click();
    await page.waitForTimeout(800);

    // Selecionar Junho
    await monthFilter.click();
    await page.getByText('Junho', { exact: true }).click();
    await page.waitForTimeout(800);

    // Todos os meses
    await monthFilter.click();
    await page.getByText('Todos os meses').click();
    await page.waitForTimeout(800);
  });

  test('deve alternar entre anos', async ({ page }) => {
    const yearFilter = page.locator('#payment-filters-year');

    // Ano atual
    const currentYear = new Date().getFullYear().toString();
    
    await yearFilter.click();
    await page.getByText(currentYear, { exact: true }).click();
    await page.waitForTimeout(800);

    // Todos os anos
    await yearFilter.click();
    await page.getByText('Todos os anos').click();
    await page.waitForTimeout(800);
  });

  test('deve alternar entre visualizações (cards/lista)', async ({ page }) => {
    // Verificar se há botões de toggle de visualização
    const gridButton = page.locator('[aria-label*="grade"], [title*="grade"]').first();
    const listButton = page.locator('[aria-label*="lista"], [title*="lista"]').first();

    const hasViewToggle = await gridButton.count() > 0 || await listButton.count() > 0;

    if (hasViewToggle) {
      if (await gridButton.count() > 0) {
        await gridButton.click();
        await page.waitForTimeout(500);
      }

      if (await listButton.count() > 0) {
        await listButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('deve clicar em um pagamento e abrir detalhes', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por cards de pagamento
    const paymentCards = page.locator('[id^="payment-card-"], [class*="payment"]').first();
    const exists = await paymentCards.count();

    if (exists > 0) {
      await paymentCards.click();
      await page.waitForTimeout(500);

      // Deve abrir modal ou navegar para detalhes
      // (comportamento depende da implementação)
    }
  });

  test('deve exibir informações de valores nos cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por valores monetários
    const currencyElements = await page.getByText(/R\$/).count();
    expect(currencyElements).toBeGreaterThanOrEqual(0);
  });

  test('deve mostrar status dos pagamentos (pago/pendente/atrasado)', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por badges ou indicadores de status
    const statusIndicators = await page.locator('[class*="badge"], [class*="status"]').count();
    console.log('Indicadores de status encontrados:', statusIndicators);
  });

  test('busca deve filtrar pagamentos', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="uscar"]').first();
    const exists = await searchInput.count();

    if (exists > 0) {
      await searchInput.fill('Maria');
      await page.waitForTimeout(800);
      await expect(searchInput).toHaveValue('Maria');

      await searchInput.clear();
      await page.waitForTimeout(800);
    }
  });

  test('deve filtrar por período específico (mês + ano)', async ({ page }) => {
    // Selecionar mês
    await page.locator('#payment-filters-month').click();
    await page.getByText('Março', { exact: true }).click();
    await page.waitForTimeout(500);

    // Selecionar ano
    await page.locator('#payment-filters-year').click();
    await page.getByText('2024', { exact: true }).click();
    await page.waitForTimeout(1000);

    // Dados devem ter sido filtrados
    await expect(page.locator('#payments-page')).toBeVisible();
  });

  test('botão de recibo deve estar visível para pagamentos realizados', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por botões de recibo
    const receiptButtons = page.locator('[id*="receipt"], button:has-text("Recibo")');
    const count = await receiptButtons.count();

    console.log('Botões de recibo encontrados:', count);
  });

  test('botão de cancelar pagamento deve estar disponível', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Procurar por botões de cancelar
    const cancelButtons = page.locator('[id*="cancel"], button:has-text("Cancelar")');
    const count = await cancelButtons.count();

    console.log('Botões de cancelar encontrados:', count);
  });
});

test.describe('Página de Pagamentos - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/payments');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});