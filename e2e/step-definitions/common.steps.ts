import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Page, BrowserContext, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import DatabaseHelper from '../helpers/database.helper';
import { createAuthHelper } from '../helpers/auth.helper';
import TEST_CONFIG from '../config/test.config';

// Aumentar timeout para 60 segundos
setDefaultTimeout(60 * 1000);

// Variáveis globais para compartilhar entre steps
let browser: Browser;
let context: BrowserContext;
let page: Page;
let loginPage: LoginPage;
let dashboardPage: DashboardPage;

// Antes de cada cenário
Before(async function() {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  page = await context.newPage();
  
  loginPage = new LoginPage(page);
  dashboardPage = new DashboardPage(page);
  
  // Armazenar no contexto do Cucumber para acesso em outros steps
  this.page = page;
  this.loginPage = loginPage;
  this.dashboardPage = dashboardPage;
});

// Depois de cada cenário
After(async function() {
  await page?.close();
  await context?.close();
  await browser?.close();
});

/**
 * ===================
 * NAVEGAÇÃO
 * ===================
 */

Given('que estou na página de login', async function() {
  await this.loginPage.goto();
  await expect(this.page).toHaveURL(/.*login/);
});

Given('que estou na página {string}', async function(url: string) {
  await this.page.goto(url);
  await this.page.waitForLoadState('networkidle');
});

When('acesso o dashboard', async function() {
  await this.page.goto('/dashboard');
  await this.page.waitForLoadState('networkidle');
});

When('acesso a página {string}', async function(url: string) {
  await this.page.goto(url);
  await this.page.waitForLoadState('networkidle');
});

When('navego para {string}', async function(url: string) {
  await this.page.goto(url);
  await this.page.waitForLoadState('networkidle');
});

When('retorno para {string}', async function(url: string) {
  await this.page.goto(url);
  await this.page.waitForLoadState('networkidle');
});

/**
 * ===================
 * AUTENTICAÇÃO
 * ===================
 */

Given('que fiz login como {string}', async function(role: string) {
  const authHelper = createAuthHelper(this.page);
  
  switch(role.toLowerCase()) {
    case 'admin':
      await authHelper.loginAsAdmin();
      break;
    case 'financial':
    case 'financeiro':
      await authHelper.loginAsFinancial();
      break;
    case 'management':
    case 'gestao':
    case 'gestão':
      await authHelper.loginAsManagement();
      break;
    default:
      throw new Error(`Perfil desconhecido: ${role}`);
  }
  
  await this.page.waitForURL('**/dashboard', { timeout: 10000 });
});

When('preencho o campo {string} com {string}', async function(field: string, value: string) {
  let locator;
  
  switch(field.toLowerCase()) {
    case 'usuário':
    case 'usuario':
      locator = this.page.locator('#username');
      break;
    case 'senha':
      locator = this.page.locator('#password');
      break;
    default:
      throw new Error(`Campo desconhecido: ${field}`);
  }
  
  await locator.fill(value);
});

When('clico no botão {string}', async function(buttonText: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await button.click();
});

When('clico em {string}', async function(text: string) {
  const element = this.page.getByText(new RegExp(text, 'i'));
  await element.click();
});

/**
 * ===================
 * VALIDAÇÕES
 * ===================
 */

Then('devo ser redirecionado para {string}', async function(url: string) {
  await this.page.waitForURL(`**${url}`, { timeout: 10000 });
  await expect(this.page).toHaveURL(new RegExp(url));
});

Then('devo permanecer na página de login', async function() {
  await expect(this.page).toHaveURL(/.*login/);
});

Then('devo ver a página do dashboard', async function() {
  await expect(this.page.locator('#dashboard-page')).toBeVisible({ timeout: 5000 });
});

Then('devo ver uma mensagem de erro', async function() {
  // Aguardar qualquer mensagem de erro aparecer
  const errorMessage = this.page.locator('[role="alert"]').or(
    this.page.getByText(/erro|inválid|falhou/i)
  );
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});

Then('devo ver a mensagem {string}', async function(message: string) {
  const element = this.page.getByText(new RegExp(message, 'i'));
  await expect(element).toBeVisible({ timeout: 5000 });
});

Then('devo ver o botão {string}', async function(buttonText: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await expect(button).toBeVisible();
});

Then('devo ver {string}', async function(text: string) {
  const element = this.page.getByText(new RegExp(text, 'i'));
  await expect(element).toBeVisible({ timeout: 5000 });
});

/**
 * ===================
 * MENUS E NAVEGAÇÃO
 * ===================
 */

When('clico no menu {string}', async function(menuName: string) {
  const menu = this.page.getByRole('link', { name: new RegExp(menuName, 'i') });
  await menu.click();
  await this.page.waitForLoadState('networkidle');
});

Then('devo ver os seguintes menus:', async function(dataTable: any) {
  const menuItems = dataTable.hashes();
  
  for (const item of menuItems) {
    const menu = this.page.getByRole('link', { name: new RegExp(item.menu, 'i') });
    await expect(menu).toBeVisible({ timeout: 5000 });
  }
});

Then('NÃO devo ver os seguintes menus:', async function(dataTable: any) {
  const menuItems = dataTable.hashes();
  
  for (const item of menuItems) {
    const menu = this.page.getByRole('link', { name: new RegExp(item.menu, 'i') });
    await expect(menu).not.toBeVisible();
  }
});

/**
 * ===================
 * LISTAS E TABELAS
 * ===================
 */

Then('devo ver a lista de {string}', async function(entityName: string) {
  // Aguardar a tabela ou grid carregar
  await this.page.waitForSelector('table, [role="grid"]', { timeout: 5000 });
  const hasContent = await this.page.locator('table, [role="grid"]').count() > 0;
  expect(hasContent).toBe(true);
});

Then('devo ver as colunas:', async function(dataTable: any) {
  const columns = dataTable.hashes();
  
  for (const col of columns) {
    const header = this.page.getByRole('columnheader', { name: new RegExp(col.coluna, 'i') });
    await expect(header).toBeVisible({ timeout: 5000 });
  }
});

/**
 * ===================
 * PERMISSÕES
 * ===================
 */

When('tento acessar {string}', async function(url: string) {
  await this.page.goto(url);
  await this.page.waitForTimeout(2000);
});

Then('devo ser bloqueado', async function() {
  // Verificar se foi redirecionado ou se há mensagem de erro
  const currentUrl = this.page.url();
  const hasError = await this.page.getByText(/não autorizado|sem permissão|403/i).isVisible().catch(() => false);
  const redirectedToDashboard = currentUrl.includes('/dashboard');
  
  expect(hasError || redirectedToDashboard).toBe(true);
});

Then('devo permanecer no dashboard ou ver página de erro 403', async function() {
  const currentUrl = this.page.url();
  const isDashboard = currentUrl.includes('/dashboard');
  const is403 = currentUrl.includes('/403') || currentUrl.includes('/unauthorized');
  const hasError = await this.page.getByText(/não autorizado|sem permissão|403/i).isVisible().catch(() => false);
  
  expect(isDashboard || is403 || hasError).toBe(true);
});

/**
 * ===================
 * FORMULÁRIOS
 * ===================
 */

When('preencho todos os campos obrigatórios', async function() {
  // Implementação genérica - pode ser sobrescrita em steps específicos
  await this.page.waitForTimeout(500);
});

When('tento salvar sem preencher o {string}', async function(fieldName: string) {
  // Tentar salvar direto
  const saveButton = this.page.getByRole('button', { name: /salvar/i });
  await saveButton.click();
});

Then('o campo {string} deve estar {string}', async function(fieldName: string, state: string) {
  let locator;
  
  if (fieldName.toLowerCase().includes('senha')) {
    locator = this.page.locator('#password');
  }
  
  if (state === 'oculto') {
    await expect(locator).toHaveAttribute('type', 'password');
  } else if (state === 'visível') {
    await expect(locator).toHaveAttribute('type', 'text');
  }
});

export { page, loginPage, dashboardPage };