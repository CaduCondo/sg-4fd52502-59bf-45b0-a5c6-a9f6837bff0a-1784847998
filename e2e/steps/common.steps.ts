import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { login, logout } from '../support/auth';
import { safeCleanup } from '../support/db-cleanup';

/**
 * Steps comuns usados em múltiplos cenários
 */

Before(async function() {
  // Limpa dados de teste antes de cada cenário
  await safeCleanup();
  console.log('🧪 Iniciando novo cenário de teste');
});

After(async function() {
  // Captura screenshot em caso de falha
  if (this.result?.status === 'failed') {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }
});

Given('que estou autenticado no sistema', async function() {
  await login(this.page);
});

Given('estou na página inicial', async function() {
  await this.page.goto('/dashboard');
  await this.page.waitForLoadState('networkidle');
});

When('eu acesso a tela {string}', async function(screenName: string) {
  const routes: Record<string, string> = {
    'Propriedades': '/properties',
    'Inquilinos': '/tenants',
    'Locações': '/rentals',
    'Pagamentos': '/payments',
    'Financeiro': '/financial',
  };
  
  const route = routes[screenName];
  if (!route) {
    throw new Error(`Tela "${screenName}" não mapeada`);
  }
  
  await this.page.goto(route);
  await this.page.waitForLoadState('networkidle');
  console.log(`✓ Navegou para tela: ${screenName}`);
});

Then('devo ver a mensagem {string}', async function(message: string) {
  // Aguarda toast/notification aparecer
  const toast = this.page.locator(`text=${message}`).first();
  await expect(toast).toBeVisible({ timeout: 10000 });
  console.log(`✓ Mensagem exibida: ${message}`);
});

Then('devo ver erro indicando que {string}', async function(errorMessage: string) {
  // Aguarda mensagem de erro aparecer
  const error = this.page.locator(`text*=${errorMessage}`).first();
  await expect(error).toBeVisible({ timeout: 10000 });
  console.log(`✓ Erro exibido corretamente: ${errorMessage}`);
});