import { test, expect } from '@playwright/test';

/**
 * @performance
 * Testes de Performance - Tempo de Carregamento
 */

test.describe('Performance - Tempo de Carregamento', () => {
  test('página de login deve carregar em menos de 3s @performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Tempo de carregamento da página de login: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(3000); // 3 segundos
  });

  test('dashboard deve carregar em menos de 5s @performance', async ({ page }) => {
    // Login primeiro
    await page.goto('/login');
    await page.locator('#username').fill('admin@teste.com');
    await page.locator('#password').fill('Admin@123');
    await page.locator('#login-submit-button').click();
    
    const startTime = Date.now();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Tempo de carregamento do dashboard: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(5000); // 5 segundos
  });

  test('listagem de imóveis deve carregar em menos de 4s @performance', async ({ page }) => {
    // Login e navegar
    await page.goto('/login');
    await page.locator('#username').fill('admin@teste.com');
    await page.locator('#password').fill('Admin@123');
    await page.locator('#login-submit-button').click();
    await page.waitForURL('**/dashboard');
    
    const startTime = Date.now();
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Tempo de carregamento de imóveis: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(4000); // 4 segundos
  });
});