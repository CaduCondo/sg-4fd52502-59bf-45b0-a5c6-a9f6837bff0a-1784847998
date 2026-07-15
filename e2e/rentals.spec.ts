import { test, expect } from '@playwright/test';

/**
 * Testes da página de Locações/Contratos
 */

test.describe.skip('Página de Locações (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/rentals');
  });

  test('deve exibir a página de locações', async ({ page }) => {
    await expect(page.locator('#rentals-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /locações|contratos/i })).toBeVisible();

    // Botão nova locação
    await expect(page.locator('#rentals-new-button')).toBeVisible();
  });

  test('deve exibir tabs de status de contratos', async ({ page }) => {
    // Tabs de filtro
    await expect(page.locator('#rentals-tab-all')).toBeVisible();
    await expect(page.locator('#rentals-tab-active')).toBeVisible();
    await expect(page.locator('#rentals-tab-pending')).toBeVisible();
    await expect(page.locator('#rentals-tab-terminated')).toBeVisible();
  });

  test('deve alternar entre tabs e filtrar contratos', async ({ page }) => {
    // Todos
    await page.locator('#rentals-tab-all').click();
    await page.waitForTimeout(500);

    // Ativos
    await page.locator('#rentals-tab-active').click();
    await page.waitForTimeout(500);

    // Pendentes
    await page.locator('#rentals-tab-pending').click();
    await page.waitForTimeout(500);

    // Rescindidos
    await page.locator('#rentals-tab-terminated').click();
    await page.waitForTimeout(500);
  });

  test('deve abrir formulário de nova locação', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Verificar campos principais
    await expect(page.locator('#rental-property')).toBeVisible();
    await expect(page.locator('#rental-tenant')).toBeVisible();
    await expect(page.locator('#rental-start-date')).toBeVisible();
    await expect(page.locator('#rental-payment-day')).toBeVisible();
  });

  test('deve preencher formulário de nova locação - dados básicos', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Selecionar imóvel
    await page.locator('#rental-property').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Selecionar inquilino
    await page.locator('#rental-tenant').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Data de início
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    await page.locator('#rental-start-date').fill(startDate);

    // Dia de pagamento
    await page.locator('#rental-payment-day').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  });

  test('deve ativar e preencher campo de garagem', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Marcar checkbox de garagem
    await page.locator('#rental-has-garage').check();
    await page.waitForTimeout(300);

    // Campo de valor deve aparecer
    await expect(page.locator('#rental-garage-value')).toBeVisible();

    // Preencher valor
    await page.locator('#rental-garage-value').fill('200');
    await expect(page.locator('#rental-garage-value')).toHaveValue(/200/);
  });

  test('deve ativar e preencher caução', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Preencher valor da caução
    await page.locator('#rental-deposit-amount').fill('2500');

    // Data de pagamento da caução
    const today = new Date().toISOString().split('T')[0];
    await page.locator('#rental-deposit-date').fill(today);

    // Código PIX (opcional)
    await page.locator('#rental-deposit-pix').fill('00020126330014BR.GOV.BCB.PIX');

    await expect(page.locator('#rental-deposit-amount')).toHaveValue(/2500/);
  });

  test('deve ativar caução parcelado e selecionar parcelas', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Ativar parcelamento
    await page.locator('#rental-deposit-installment').check();
    await page.waitForTimeout(300);

    // Selecionar número de parcelas
    await expect(page.locator('#rental-installment-count')).toBeVisible();
    
    await page.locator('#rental-installment-count').click();
    await page.getByText('2 parcelas').click();
    await page.waitForTimeout(500);

    // Campos de 2ª parcela devem aparecer
    await expect(page.getByText(/2ª Parcela/i)).toBeVisible();
  });

  test('deve marcar corretor parceiro', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    const checkbox = page.locator('#rental-partner-broker');
    
    // Marcar
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Desmarcar
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('busca deve filtrar locações', async ({ page }) => {
    const searchInput = page.locator('#rentals-search-input');
    
    await searchInput.fill('João');
    await page.waitForTimeout(800);
    await expect(searchInput).toHaveValue('João');

    await searchInput.clear();
    await page.waitForTimeout(800);
  });

  test('deve validar campos obrigatórios ao criar locação', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Tentar submeter sem preencher
    await page.locator('#rental-form-submit').click();
    await page.waitForTimeout(500);

    // Deve permanecer no formulário
    await expect(page.locator('#rental-form-submit')).toBeVisible();
  });

  test('deve fechar formulário ao cancelar', async ({ page }) => {
    await page.locator('#rentals-new-button').click();
    await page.waitForTimeout(500);

    // Preencher algo
    await page.locator('#rental-deposit-amount').fill('1000');

    // Cancelar
    await page.locator('#rental-form-cancel').click();
    await page.waitForTimeout(500);

    // Formulário deve fechar
    await expect(page.locator('#rental-property')).not.toBeVisible();
  });
});

test.describe('Página de Locações - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/rentals');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});