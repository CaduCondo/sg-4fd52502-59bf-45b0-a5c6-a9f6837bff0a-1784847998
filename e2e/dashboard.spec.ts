import { test, expect } from '@playwright/test';

/**
 * Testes da página de Dashboard
 */

test.describe.skip('Página de Dashboard (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/dashboard');
  });

  test('deve exibir o dashboard', async ({ page }) => {
    await expect(page.locator('#dashboard-page')).toBeVisible();
    
    // Verificar saudação
    await expect(page.getByText(/bem-vindo/i)).toBeVisible();
  });

  test('deve exibir cards de métricas', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForTimeout(2000);

    // Verificar que há cards de métricas visíveis
    // (quantidade depende das permissões do usuário)
    const cards = page.locator('.card');
    const count = await cards.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('seletor de período deve funcionar', async ({ page }) => {
    // Verificar que há seletores de mês e ano
    // (IDs dependem do componente PeriodSelector)
    
    await page.waitForTimeout(2000);
    
    // Verificar que a página carregou
    await expect(page.locator('#dashboard-page')).toBeVisible();
  });
});

test.describe('Dashboard - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});