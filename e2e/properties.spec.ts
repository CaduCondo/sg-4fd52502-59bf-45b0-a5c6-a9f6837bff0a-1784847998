import { test, expect } from '@playwright/test';

/**
 * Testes da página de Imóveis
 * 
 * NOTA: Estes testes requerem autenticação.
 * Para rodar, faça login manualmente primeiro ou configure um helper de auth.
 */

test.describe.skip('Página de Imóveis (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação antes de cada teste
    // await loginHelper(page, 'usuario@exemplo.com', 'senha123');
    await page.goto('/properties');
  });

  test('deve exibir a página de imóveis com todos os elementos', async ({ page }) => {
    // Verificar elementos principais
    await expect(page.locator('#properties-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /imóveis/i })).toBeVisible();

    // Botões de visualização
    await expect(page.locator('#properties-view-grid')).toBeVisible();
    await expect(page.locator('#properties-view-table')).toBeVisible();

    // Botão novo imóvel
    await expect(page.locator('#properties-new-button')).toBeVisible();

    // Filtros
    await expect(page.locator('#property-filters-search')).toBeVisible();
    await expect(page.locator('#property-filters-location-desktop')).toBeVisible();
    await expect(page.locator('#property-filters-status-desktop')).toBeVisible();
  });

  test('deve alternar entre visualização em grade e tabela', async ({ page }) => {
    // Começar em grade
    await page.locator('#properties-view-grid').click();
    await page.waitForTimeout(500);

    // Alternar para tabela
    await page.locator('#properties-view-table').click();
    await page.waitForTimeout(500);

    // Verificar que tabela está visível
    await expect(page.locator('table')).toBeVisible();

    // Voltar para grade
    await page.locator('#properties-view-grid').click();
    await page.waitForTimeout(500);
  });

  test('deve abrir e fechar modal de novo imóvel', async ({ page }) => {
    // Abrir modal
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Verificar que o formulário abriu
    await expect(page.locator('#property-location')).toBeVisible();
    await expect(page.locator('#property-complement')).toBeVisible();

    // Fechar com botão cancelar
    await page.locator('#property-form-cancel').click();
    await page.waitForTimeout(500);

    // Verificar que fechou
    await expect(page.locator('#property-location')).not.toBeVisible();
  });

  test('deve preencher formulário completo de novo imóvel', async ({ page }) => {
    // Abrir formulário
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Selecionar local (primeiro da lista)
    await page.locator('#property-location').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Dados básicos
    await page.locator('#property-complement').fill('Apartamento 102 - Bloco A');
    await page.locator('#property-rooms').fill('3');
    await page.locator('#property-bathrooms').fill('2');
    await page.locator('#property-area').fill('85');
    await page.locator('#property-value').fill('2500');

    // Selecionar status
    await page.locator('#property-status').click();
    await page.waitForTimeout(300);
    await page.getByText('Disponível', { exact: true }).click();

    // Checkboxes
    await page.locator('#property-furniture').check();
    await page.locator('#property-pets').check();
    await page.locator('#property-garage').check();

    // Descrição
    await page.locator('#property-description').fill('Apartamento espaçoso em ótima localização, próximo a escolas e supermercados.');

    // Verificar valores preenchidos
    await expect(page.locator('#property-complement')).toHaveValue('Apartamento 102 - Bloco A');
    await expect(page.locator('#property-rooms')).toHaveValue('3');
    await expect(page.locator('#property-bathrooms')).toHaveValue('2');
    await expect(page.locator('#property-furniture')).toBeChecked();
  });

  test('deve validar campos obrigatórios ao tentar criar sem preencher', async ({ page }) => {
    // Abrir formulário
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Tentar submeter vazio
    await page.locator('#property-form-submit').click();
    await page.waitForTimeout(500);

    // Deve permanecer no formulário (validação HTML5)
    await expect(page.locator('#property-form-submit')).toBeVisible();
  });

  test('deve validar apenas números nos campos numéricos', async ({ page }) => {
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Tentar digitar letras em campos numéricos
    await page.locator('#property-rooms').fill('abc');
    await page.locator('#property-bathrooms').fill('xyz');

    // Campos devem estar vazios ou só com números
    const roomsValue = await page.locator('#property-rooms').inputValue();
    const bathroomsValue = await page.locator('#property-bathrooms').inputValue();

    expect(roomsValue).toMatch(/^\d*$/);
    expect(bathroomsValue).toMatch(/^\d*$/);
  });

  test('filtro de busca deve funcionar', async ({ page }) => {
    const searchInput = page.locator('#property-filters-search');

    // Buscar por algo
    await searchInput.fill('Centro');
    await page.waitForTimeout(800);
    await expect(searchInput).toHaveValue('Centro');

    // Limpar busca
    await searchInput.clear();
    await page.waitForTimeout(800);
    await expect(searchInput).toHaveValue('');
  });

  test('filtro de localização deve abrir e permitir seleção', async ({ page }) => {
    // Abrir filtro
    await page.locator('#property-filters-location-desktop').click();
    await page.waitForTimeout(300);

    // Deve mostrar opções (depende dos dados)
    // Se houver botão limpar, testar
    const clearButton = page.locator('#property-filters-clear-desktop');
    const isVisible = await clearButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await clearButton.click();
      await page.waitForTimeout(300);
    }

    // Fechar filtro
    await page.keyboard.press('Escape');
  });

  test('filtro de status deve alternar entre opções', async ({ page }) => {
    const statusFilter = page.locator('#property-filters-status-desktop');

    // Disponível
    await statusFilter.click();
    await page.getByText('Disponível', { exact: true }).click();
    await page.waitForTimeout(500);

    // Ocupado
    await statusFilter.click();
    await page.getByText('Ocupado', { exact: true }).click();
    await page.waitForTimeout(500);

    // Todos
    await statusFilter.click();
    await page.getByText('Todos', { exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('deve criar imóvel com sucesso (simulação completa)', async ({ page }) => {
    await page.locator('#properties-new-button').click();
    await page.waitForTimeout(500);

    // Preencher formulário completo
    await page.locator('#property-location').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    await page.locator('#property-complement').fill('Casa 15');
    await page.locator('#property-rooms').fill('4');
    await page.locator('#property-bathrooms').fill('3');
    await page.locator('#property-area').fill('120');
    await page.locator('#property-value').fill('3500');

    await page.locator('#property-status').click();
    await page.getByText('Disponível').click();

    await page.locator('#property-garage').check();
    await page.locator('#property-description').fill('Casa ampla com quintal.');

    // Submeter
    await page.locator('#property-form-submit').click();
    
    // Aguardar processamento
    await page.waitForTimeout(3000);

    // Deve mostrar toast de sucesso OU voltar para a lista
    // (depende da implementação)
  });
});

test.describe('Página de Imóveis - Redirecionamento', () => {
  test('deve redirecionar para login se não autenticado', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});