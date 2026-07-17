import { test, expect } from '@playwright/test';

/**
 * Teste 1: Login básico
 * O mais simples possível - apenas fazer login e validar que chegou no dashboard
 */
test.describe('01. Login Básico', () => {
  
  test('Deve fazer login com sucesso e chegar no dashboard', async ({ page }) => {
    // Ir para página de login
    await page.goto('http://localhost:3000/login');
    
    // Aguardar página carregar
    await page.waitForLoadState('networkidle');
    
    // Preencher email
    await page.fill('input[type="email"]', 'admin@softgen.ai');
    
    // Preencher senha
    await page.fill('input[type="password"]', 'Softgen@2025');
    
    // Clicar no botão entrar
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Validar que estamos no dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Validar que o texto "Dashboard" aparece na página
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    console.log('✅ Login realizado com sucesso!');
  });
  
});