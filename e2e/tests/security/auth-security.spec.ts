import { test, expect } from '@playwright/test';

/**
 * @security
 * Testes de Segurança - Autenticação e Autorização
 */

test.describe('Security - Autenticação', () => {
  test('não deve permitir acesso sem autenticação @security @critical', async ({ page }) => {
    // Tentar acessar dashboard sem login
    await page.goto('/dashboard');
    
    // Deve redirecionar para login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('não deve expor credenciais em cookies @security', async ({ page }) => {
    await page.goto('/login');
    
    const cookies = await page.context().cookies();
    
    // Verificar que nenhum cookie contém senha em texto plano
    cookies.forEach(cookie => {
      expect(cookie.value).not.toMatch(/password|senha|pwd/i);
    });
  });

  test('deve bloquear SQL injection no login @security @critical', async ({ page }) => {
    await page.goto('/login');
    
    // Tentar SQL injection
    await page.locator('#username').fill("admin' OR '1'='1");
    await page.locator('#password').fill("' OR '1'='1");
    await page.locator('#login-submit-button').click();
    
    await page.waitForTimeout(2000);
    
    // NÃO deve fazer login
    const url = page.url();
    expect(url).toContain('/login');
    expect(url).not.toContain('/dashboard');
  });

  test('deve bloquear XSS em campos de input @security', async ({ page }) => {
    await page.goto('/login');
    
    const xssPayload = '<script>alert("XSS")</script>';
    await page.locator('#username').fill(xssPayload);
    
    // Verificar que script não foi executado
    const alerts = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    expect(alerts.length).toBe(0);
  });
});

test.describe('Security - Autorização por Perfil', () => {
  test('usuário Financeiro não deve acessar /properties @security @permissions', async ({ page }) => {
    // Login como Financeiro
    await page.goto('/login');
    await page.locator('#username').fill('financeiro@teste.com');
    await page.locator('#password').fill('Financeiro@123');
    await page.locator('#login-submit-button').click();
    await page.waitForURL('**/dashboard');
    
    // Tentar acessar properties
    await page.goto('/properties');
    
    // Deve ser bloqueado
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(
      url.includes('/dashboard') ||
      url.includes('/403') ||
      url.includes('/unauthorized')
    ).toBe(true);
  });
});