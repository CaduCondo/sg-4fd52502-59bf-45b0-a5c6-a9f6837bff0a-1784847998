import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Steps específicos para Login
 */

When('clico no botão de visualizar senha', async function() {
  const toggleButton = this.page.locator('#login-toggle-password');
  await toggleButton.click();
});

When('clico no botão de visualizar senha novamente', async function() {
  const toggleButton = this.page.locator('#login-toggle-password');
  await toggleButton.click();
});

When('clico em {string}', async function(linkText: string) {
  if (linkText.toLowerCase().includes('esqueci')) {
    await this.page.locator('#login-forgot-password-link').click();
  } else {
    const link = this.page.getByText(new RegExp(linkText, 'i'));
    await link.click();
  }
  await this.page.waitForTimeout(300);
});

Then('devo ver o modal de recuperação de senha', async function() {
  const modal = this.page.locator('#login-forgot-password-dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });
});

When('preencho o email de recuperação com {string}', async function(email: string) {
  const emailInput = this.page.locator('#reset-email');
  await emailInput.fill(email);
});

When('clico no menu do usuário', async function() {
  await this.dashboardPage.openUserMenu();
});