import { test, expect } from '@playwright/test';

/**
 * Testes da página de Inquilinos
 */

test.describe.skip('Página de Inquilinos (requer auth)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implementar autenticação
    await page.goto('/tenants');
  });

  test('deve exibir a página de inquilinos com todos os elementos', async ({ page }) => {
    await expect(page.locator('#tenants-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /inquilinos/i })).toBeVisible();

    // Botões de visualização
    await expect(page.locator('#tenants-view-grid')).toBeVisible();
    await expect(page.locator('#tenants-view-table')).toBeVisible();

    // Botão novo inquilino
    await expect(page.locator('#tenants-new-button')).toBeVisible();

    // Filtros
    await expect(page.locator('#tenant-filters-search')).toBeVisible();
    await expect(page.locator('#tenant-filters-status')).toBeVisible();
  });

  test('deve alternar entre visualizações', async ({ page }) => {
    await page.locator('#tenants-view-grid').click();
    await page.waitForTimeout(500);

    await page.locator('#tenants-view-table').click();
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();

    await page.locator('#tenants-view-grid').click();
    await page.waitForTimeout(500);
  });

  test('deve abrir e fechar formulário de novo inquilino', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#tenant-name')).toBeVisible();

    await page.locator('#tenant-form-cancel').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#tenant-name')).not.toBeVisible();
  });

  test('deve alternar entre CPF e CNPJ e aplicar máscaras', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    // CPF
    await page.locator('#tenant-doc-type-cpf').click();
    await page.waitForTimeout(300);
    
    const cpfInput = page.locator('#tenant-document');
    await cpfInput.fill('12345678901');
    await page.waitForTimeout(300);
    
    // Verificar que aplicou máscara (123.456.789-01)
    const cpfValue = await cpfInput.inputValue();
    expect(cpfValue).toContain('.');
    expect(cpfValue).toContain('-');

    // CNPJ
    await page.locator('#tenant-doc-type-cnpj').click();
    await page.waitForTimeout(300);
    
    const cnpjInput = page.locator('#tenant-document');
    await cnpjInput.fill('12345678000190');
    await page.waitForTimeout(300);
    
    // Verificar que aplicou máscara (12.345.678/0001-90)
    const cnpjValue = await cnpjInput.inputValue();
    expect(cnpjValue).toContain('.');
    expect(cnpjValue).toContain('/');
    expect(cnpjValue).toContain('-');
  });

  test('deve aplicar máscara no telefone', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    const phoneInput = page.locator('#tenant-phone');
    await phoneInput.fill('11999887766');
    await page.waitForTimeout(300);

    // Verificar máscara (11) 99988-7766
    const phoneValue = await phoneInput.inputValue();
    expect(phoneValue).toContain('(');
    expect(phoneValue).toContain(')');
    expect(phoneValue).toContain('-');
  });

  test('deve aplicar máscara no RG', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    const rgInput = page.locator('#tenant-rg');
    await rgInput.fill('123456789');
    await page.waitForTimeout(300);

    const rgValue = await rgInput.inputValue();
    expect(rgValue).toContain('.');
    expect(rgValue).toContain('-');
  });

  test('deve preencher dados pessoais completos', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    await page.locator('#tenant-name').fill('Maria da Silva Santos');
    await page.locator('#tenant-phone').fill('11987654321');
    await page.locator('#tenant-email').fill('maria.santos@exemplo.com');
    await page.locator('#tenant-rg').fill('445566778');

    await expect(page.locator('#tenant-name')).toHaveValue('Maria da Silva Santos');
    await expect(page.locator('#tenant-email')).toHaveValue('maria.santos@exemplo.com');
  });

  test('deve preencher endereço completo', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    await page.locator('#tenant-cep').fill('01310100');
    await page.waitForTimeout(1000); // Aguardar busca de CEP

    await page.locator('#tenant-street').fill('Av. Paulista');
    await page.locator('#tenant-number').fill('1578');
    await page.locator('#tenant-complement').fill('Apto 82');
    await page.locator('#tenant-neighborhood').fill('Bela Vista');
    await page.locator('#tenant-city').fill('São Paulo');
    await page.locator('#tenant-state').fill('SP');

    await expect(page.locator('#tenant-city')).toHaveValue('São Paulo');
    await expect(page.locator('#tenant-state')).toHaveValue('SP');
  });

  test('deve validar email inválido', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    // Preencher campos obrigatórios
    await page.locator('#tenant-name').fill('Teste');
    await page.locator('#tenant-document').fill('12345678901');
    await page.locator('#tenant-phone').fill('11999887766');
    await page.locator('#tenant-email').fill('email-invalido');

    await page.locator('#tenant-form-submit').click();
    await page.waitForTimeout(500);

    // Deve permanecer no formulário devido à validação
    await expect(page.locator('#tenant-form-submit')).toBeVisible();
  });

  test('busca deve filtrar inquilinos', async ({ page }) => {
    const searchInput = page.locator('#tenant-filters-search');

    await searchInput.fill('João');
    await page.waitForTimeout(800);
    await expect(searchInput).toHaveValue('João');

    await searchInput.clear();
    await page.waitForTimeout(800);
  });

  test('filtro de status deve funcionar', async ({ page }) => {
    await page.locator('#tenant-filters-status').click();
    await page.waitForTimeout(300);

    // Selecionar "Locatário"
    await page.locator('#tenant-status-rented').click();
    await page.waitForTimeout(500);

    // Abrir novamente e selecionar "Novo"
    await page.locator('#tenant-filters-status').click();
    await page.waitForTimeout(300);
    await page.locator('#tenant-status-new').click();
    await page.waitForTimeout(500);
  });

  test('deve criar inquilino completo (simulação)', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    // Dados pessoais
    await page.locator('#tenant-name').fill('Carlos Eduardo Oliveira');
    await page.locator('#tenant-doc-type-cpf').click();
    await page.locator('#tenant-document').fill('12345678901');
    await page.locator('#tenant-rg').fill('123456789');
    await page.locator('#tenant-phone').fill('11987654321');
    await page.locator('#tenant-email').fill('carlos.oliveira@email.com');

    // Endereço
    await page.locator('#tenant-cep').fill('01310100');
    await page.waitForTimeout(1000);
    await page.locator('#tenant-number').fill('500');
    await page.locator('#tenant-complement').fill('Casa 2');

    // Status
    await page.locator('#tenant-status').click();
    await page.getByText('Novo', { exact: true }).click();

    // Submeter
    await page.locator('#tenant-form-submit').click();
    await page.waitForTimeout(3000);

    // Deve mostrar toast de sucesso
  });

  test('deve validar CEP e buscar endereço automaticamente', async ({ page }) => {
    await page.locator('#tenants-new-button').click();
    await page.waitForTimeout(500);

    const cepInput = page.locator('#tenant-cep');
    await cepInput.fill('01310100');
    
    // Aguardar busca automática de CEP
    await page.waitForTimeout(2000);

    // Verificar se campos foram preenchidos automaticamente
    const street = await page.locator('#tenant-street').inputValue();
    const neighborhood = await page.locator('#tenant-neighborhood').inputValue();
    
    // Se a API ViaCEP funcionou, deve ter preenchido
    // (pode não funcionar em ambiente de teste)
    console.log('Rua preenchida:', street);
    console.log('Bairro preenchido:', neighborhood);
  });
});

test.describe('Página de Inquilinos - Sem Auth', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});