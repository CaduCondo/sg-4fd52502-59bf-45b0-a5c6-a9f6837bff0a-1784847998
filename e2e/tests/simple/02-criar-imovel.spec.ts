import { test, expect } from '@playwright/test';

/**
 * Teste 2: Criar imóvel
 * Criar um imóvel simples e validar que aparece na lista
 */
test.describe('02. Criar Imóvel', () => {
  
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@softgen.ai');
    await page.fill('input[type="password"]', 'Softgen@2025');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });
  
  test('Deve criar um imóvel com sucesso', async ({ page }) => {
    // Navegar para página de imóveis
    await page.click('a[href="/properties"]');
    await page.waitForURL('**/properties');
    
    // Aguardar a página carregar completamente
    await page.waitForLoadState('networkidle');
    
    // Gerar identificador único para este teste
    const timestamp = Date.now();
    const identifier = `TESTE-${timestamp}`;
    
    // Clicar no botão "Novo Imóvel"
    await page.click('button:has-text("Novo Imóvel")');
    
    // Aguardar o dialog abrir
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Preencher formulário básico
    await page.fill('#property-identifier', identifier);
    
    // Selecionar primeiro local disponível
    await page.click('#property-location-select');
    await page.waitForTimeout(500);
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Preencher outros campos obrigatórios
    await page.fill('#property-complement', `APTO ${timestamp}`);
    await page.fill('#property-value', '1500');
    
    // Salvar
    await page.click('button:has-text("Salvar")');
    
    // Aguardar um pouco para o sistema processar
    await page.waitForTimeout(2000);
    
    // Validar que o imóvel aparece na lista
    const propertyInList = page.locator(`text=${identifier}`);
    await expect(propertyInList).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Imóvel ${identifier} criado com sucesso!`);
  });
  
});