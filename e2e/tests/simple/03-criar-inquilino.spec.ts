import { test, expect } from '@playwright/test';

/**
 * Teste 3: Criar inquilino
 * Criar um inquilino simples e validar que aparece na lista
 */
test.describe('03. Criar Inquilino', () => {
  
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@softgen.ai');
    await page.fill('input[type="password"]', 'Softgen@2025');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });
  
  test('Deve criar um inquilino com sucesso', async ({ page }) => {
    // Navegar para página de inquilinos
    await page.click('a[href="/tenants"]');
    await page.waitForURL('**/tenants');
    
    // Aguardar a página carregar
    await page.waitForLoadState('networkidle');
    
    // Gerar dados únicos para este teste
    const timestamp = Date.now();
    const name = `Teste Inquilino ${timestamp}`;
    const email = `teste${timestamp}@example.com`;
    
    // Clicar no botão "Novo Inquilino"
    await page.click('button:has-text("Novo Inquilino")');
    
    // Aguardar o dialog abrir
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Preencher formulário básico
    await page.fill('#tenant-name', name);
    await page.fill('#tenant-cpf', '123.456.789-00');
    await page.fill('#tenant-email', email);
    await page.fill('#tenant-phone', '(11) 99999-9999');
    
    // Salvar
    await page.click('button:has-text("Salvar")');
    
    // Aguardar processamento
    await page.waitForTimeout(2000);
    
    // Validar que o inquilino aparece na lista
    const tenantInList = page.locator(`text=${name}`);
    await expect(tenantInList).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Inquilino ${name} criado com sucesso!`);
  });
  
});