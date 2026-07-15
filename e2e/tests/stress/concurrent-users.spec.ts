import { test, expect } from '@playwright/test';

/**
 * @stress
 * Testes de Estresse - Múltiplos Usuários Simultâneos
 */

test.describe('Stress - Usuários Concorrentes', () => {
  test('deve suportar 10 logins simultâneos @stress', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    // Criar 10 contextos de navegador (simular 10 usuários)
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
    }

    console.log('🚀 Iniciando 10 logins simultâneos...');
    const startTime = Date.now();

    // Executar logins em paralelo
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto('/login');
        await page.locator('#username').fill(`user${index}@teste.com`);
        await page.locator('#password').fill('Test123');
        await page.locator('#login-submit-button').click();
      })
    );

    const endTime = Date.now();
    console.log(`⏱️ 10 logins completados em ${endTime - startTime}ms`);

    // Limpar
    for (const context of contexts) {
      await context.close();
    }

    // Deve completar em menos de 15 segundos
    expect(endTime - startTime).toBeLessThan(15000);
  });

  test('deve suportar 20 requisições simultâneas à API @stress @api', async ({ request }) => {
    console.log('🚀 Iniciando 20 requisições simultâneas...');
    const startTime = Date.now();

    const requests = Array(20).fill(null).map(() => 
      request.get('/api/properties/available')
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    console.log(`⏱️ 20 requisições completadas em ${endTime - startTime}ms`);

    // Todas devem responder
    responses.forEach(response => {
      expect(response.status()).toBeLessThan(500);
    });

    // Deve completar em menos de 10 segundos
    expect(endTime - startTime).toBeLessThan(10000);
  });
});