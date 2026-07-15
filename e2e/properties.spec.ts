import { test, expect } from '@playwright/test';

/**
 * Testes da página de Imóveis
 * 
 * IMPORTANTE: Estes testes assumem que você está autenticado.
 * Para rodar, você precisará implementar um helper de autenticação
 * ou usar o Playwright para fazer login antes.
 */

test.describe('Página de Imóveis', () => {
  // TODO: Adicionar autenticação antes dos testes
  // test.beforeEach(async ({ page }) => {
  //   await loginAsAdmin(page);
  //   await page.goto('/properties');
  // });

  test.skip('deve carregar a página de imóveis', async ({ page }) => {
    await page.goto('/properties');

    // Verificar título
    await expect(page.locator('h1')).toContainText('Imóveis');

    // Verificar botão de novo imóvel
    await expect(page.locator('#properties-new-button')).toBeVisible();
  });

  test.skip('deve alternar entre visualização em grade e lista', async ({ page }) => {
    await page.goto('/properties');

    // Clicar em visualização de grade
    await page.locator('#properties-view-grid').click();
    // Aqui você verificaria que os cards estão em modo grade

    // Clicar em visualização de lista
    await page.locator('#properties-view-table').click();
    // Aqui você verificaria que está em modo tabela
  });

  test.skip('deve abrir modal de novo imóvel ao clicar no botão', async ({ page }) => {
    await page.goto('/properties');

    // Clicar no botão de novo imóvel
    await page.locator('#properties-new-button').click();

    // Verificar que o formulário apareceu
    await expect(page.locator('#property-location')).toBeVisible();
    await expect(page.locator('#property-rooms')).toBeVisible();
    await expect(page.locator('#property-bathrooms')).toBeVisible();
  });

  test.skip('deve validar campos obrigatórios ao criar imóvel', async ({ page }) => {
    await page.goto('/properties');
    
    // Abrir formulário
    await page.locator('#properties-new-button').click();

    // Tentar submeter sem preencher
    await page.locator('#property-form-submit').click();

    // O modal não deve fechar (ainda estamos na mesma página)
    await expect(page.locator('#property-form-submit')).toBeVisible();
  });
});