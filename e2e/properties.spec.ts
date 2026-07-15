import { test, expect } from '@playwright/test';

/**
 * Testes da página de Imóveis
 * 
 * NOTA: Estes testes requerem autenticação.
 * Para rodar, você precisa fazer login primeiro ou usar um contexto autenticado.
 */

test.describe.skip('Página de Imóveis (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação antes de cada teste
    // await loginHelper(page, 'usuario@exemplo.com', 'senha123');
    await page.goto('/properties');
  });

  test('deve exibir a página de imóveis', async ({ page }) => {
    // Verificar elementos principais
    await expect(page.locator('#properties-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /imóveis/i })).toBeVisible();

    // Botões de visualização
    await expect(page.locator('#properties-view-grid')).toBeVisible();
    await expect(page.locator('#properties-view-table')).toBeVisible();

    // Botão novo imóvel
    await expect(page.locator('#properties-new-button')).toBeVisible();
  });

  test('deve alternar entre visualização em grade e tabela', async ({ page }) => {
    // Começar em grade (padrão)
    await page.locator('#properties-view-grid').click();
    await page.waitForTimeout(300);

    // Alternar para tabela
    await page.locator('#properties-view-table').click();
    await page.waitForTimeout(300);

    // Alternar de volta para grade
    await page.locator('#properties-view-grid').click();
    await page.waitForTimeout(300);
  });

  test('deve abrir modal de novo imóvel', async ({ page }) => {
    // Clicar no botão novo
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Verificar que o formulário abriu
    await expect(page.locator('#property-location')).toBeVisible();
    await expect(page.locator('#property-complement')).toBeVisible();
    await expect(page.locator('#property-rooms')).toBeVisible();
    await expect(page.locator('#property-bathrooms')).toBeVisible();
  });

  test('deve preencher formulário de novo imóvel', async ({ page }) => {
    // Abrir formulário
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Preencher campos
    await page.locator('#property-location').click();
    // Selecionar primeira opção (depende dos dados)
    
    await page.locator('#property-complement').fill('Apto 101');
    await page.locator('#property-rooms').fill('3');
    await page.locator('#property-bathrooms').fill('2');
    await page.locator('#property-area').fill('80');
    await page.locator('#property-value').fill('1500');

    // Verificar que campos foram preenchidos
    await expect(page.locator('#property-complement')).toHaveValue('Apto 101');
    await expect(page.locator('#property-rooms')).toHaveValue('3');
    await expect(page.locator('#property-bathrooms')).toHaveValue('2');
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    // Abrir formulário
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Tentar submeter sem preencher campos obrigatórios
    await page.locator('#property-form-submit').click();

    // Deve permanecer no formulário (validação HTML5 ou mensagem de erro)
    await expect(page.locator('#property-form-submit')).toBeVisible();
  });

  test('deve fechar modal ao clicar em cancelar', async ({ page }) => {
    // Abrir formulário
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Preencher algo
    await page.locator('#property-complement').fill('Teste');

    // Cancelar
    await page.locator('#property-form-cancel').click();
    await page.waitForTimeout(300);

    // Modal deve fechar (campos não devem estar mais visíveis)
    await expect(page.locator('#property-complement')).not.toBeVisible();
  });

  test('filtros devem funcionar', async ({ page }) => {
    // Abrir filtro de localização
    await page.locator('#property-filters-location-desktop').click();
    await page.waitForTimeout(300);

    // Deve mostrar opções de locais
    // (depende dos dados no banco)

    // Fechar filtro
    await page.keyboard.press('Escape');

    // Testar filtro de status
    await page.locator('#property-filters-status-desktop').click();
    await page.waitForTimeout(300);

    // Selecionar uma opção
    await page.getByText('Disponível', { exact: true }).click();
    await page.waitForTimeout(300);
  });

  test('busca deve filtrar resultados', async ({ page }) => {
    const searchInput = page.locator('#property-filters-search');

    // Buscar por algo
    await searchInput.fill('Centro');
    await page.waitForTimeout(500);

    // Busca deve ter sido aplicada
    await expect(searchInput).toHaveValue('Centro');

    // Limpar busca
    await searchInput.clear();
    await page.waitForTimeout(500);
  });
});

/**
 * Testes básicos sem autenticação
 */
test.describe('Página de Imóveis - Redirecionamento', () => {
  test('deve redirecionar para login se não autenticado', async ({ page }) => {
    // Tentar acessar sem auth
    await page.goto('/properties');

    // Deve ser redirecionado para login
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});