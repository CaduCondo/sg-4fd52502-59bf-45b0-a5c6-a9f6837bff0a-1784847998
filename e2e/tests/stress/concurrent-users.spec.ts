import { test, expect } from '@playwright/test';

/**
 * @stress
 * Testes de Estresse - Múltiplos Usuários Simultâneos
 * 
 * NOTA: Estes testes são mais pesados e podem demorar mais
 * Rode separadamente com: npx playwright test stress
 */

test.describe('Stress - Usuários Concorrentes', () => {
  // Marcar como slow (permite mais tempo)
  test.slow();

  test('deve suportar 5 requisições simultâneas à API @stress @api', async ({ request }) => {
    console.log('🚀 Iniciando 5 requisições simultâneas...');
    const startTime = Date.now();

    const requests = Array(5).fill(null).map(() => 
      request.get('/api/health')
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    console.log(`⏱️ 5 requisições completadas em ${endTime - startTime}ms`);

    // Todas devem responder com sucesso
    for (const response of responses) {
      expect(response.status()).toBeLessThan(500);
    }

    // Deve completar em tempo razoável (30 segundos)
    expect(endTime - startTime).toBeLessThan(30000);
  });
});