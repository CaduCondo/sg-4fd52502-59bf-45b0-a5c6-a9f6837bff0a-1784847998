import { test, expect } from '@playwright/test';

/**
 * Testes da página de Inquilinos
 */

test.describe.skip('Página de Inquilinos (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/tenants');
  });

  test('deve exibir a página de inquilinos', async ({ page }) => {
    await expect(page.locator('#tenants-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /inquilinos/i })).toBeVisible();

    // Botões de visualização
    await expect(page.locator('#tenants-view-grid')).toBeVisible();
    await expect(page.locator('#tenants-view-table')).toBeVisible();

    // Botão novo inquilino
    await expect(page.locator('#tenants-new-button')).toBeVisible();
  });

  test('deve alternar entre visualizações', async ({ page }) => {
    await page.locator('#tenants-view-grid').click();
    await page.waitForTimeout(300);

    await page.locator('#tenants-view-table').click();
    await page.waitForTimeout(300);
  });

  test('deve abrir formulário de novo inquilino', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    // Verificar campos do formulário
    await expect(page.locator('#tenant-name')).toBeVisible();
    await expect(page.locator('#tenant-document')).toBeVisible();
    await expect(page.locator('#tenant-phone')).toBeVisible();
    await expect(page.locator('#tenant-email')).toBeVisible();
  });

  test('deve alternar entre CPF e CNPJ', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    // Começar com CPF (padrão)
    await page.locator('#tenant-doc-type-cpf').click();
    await expect(page.locator('#tenant-document')).toHaveAttribute('placeholder', /000.000.000-00/);

    // Alternar para CNPJ
    await page.locator('#tenant-doc-type-cnpj').click();
    await expect(page.locator('#tenant-document')).toHaveAttribute('placeholder', /00.000.000\/0000-00/);
  });

  test('deve preencher dados pessoais', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    await page.locator('#tenant-name').fill('João Silva');
    await page.locator('#tenant-phone').fill('11999887766');
    await page.locator('#tenant-email').fill('joao@exemplo.com');

    await expect(page.locator('#tenant-name')).toHaveValue('João Silva');
    await expect(page.locator('#tenant-email')).toHaveValue('joao@exemplo.com');
  });

  test('deve preencher endereço', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    await page.locator('#tenant-cep').fill('01310-100');
    await page.locator('#tenant-street').fill('Av. Paulista');
    await page.locator('#tenant-number').fill('1000');
    await page.locator('#tenant-city').fill('São Paulo');
    await page.locator('#tenant-state').fill('SP');

    await expect(page.locator('#tenant-city')).toHaveValue('São Paulo');
    await expect(page.locator('#tenant-state')).toHaveValue('SP');
  });

  test('busca deve filtrar inquilinos', async ({ page }) => {
    const searchInput = page.locator('#tenant-filters-search');

    await searchInput.fill('João');
    await page.waitForTimeout(500);

    await expect(searchInput).toHaveValue('João');
  });

  test('filtro de status deve funcionar', async ({ page }) => {
    await page.locator('#tenant-filters-status').click();
    await page.waitForTimeout(300);

    // Selecionar um status
    await page.locator('#tenant-status-rented').click();
    await page.waitForTimeout(300);
  });
});

test.describe('Página de Inquilinos - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});