import { test, expect } from '@playwright/test';

/**
 * Teste de exemplo - verificar se a página de login carrega
 */
test('página de login deve carregar corretamente', async ({ page }) => {
  // Navegar para a página de login
  await page.goto('/login');

  // Verificar se o título está presente
  await expect(page.locator('h1')).toContainText('Bem-vindo');

  // Verificar se os campos estão presentes (usando os IDs que adicionamos)
  await expect(page.locator('#login-username')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(page.locator('#login-submit-button')).toBeVisible();
});

/**
 * Teste de exemplo - campos de formulário
 */
test('campos de login devem aceitar input', async ({ page }) => {
  await page.goto('/login');

  // Preencher o campo de usuário
  await page.locator('#login-username').fill('teste@example.com');
  await expect(page.locator('#login-username')).toHaveValue('teste@example.com');

  // Preencher o campo de senha
  await page.locator('#login-password').fill('senha123');
  await expect(page.locator('#login-password')).toHaveValue('senha123');
});

/**
 * Teste de exemplo - toggle de mostrar senha
 */
test('botão de mostrar/ocultar senha deve funcionar', async ({ page }) => {
  await page.goto('/login');

  const passwordInput = page.locator('#login-password');
  const toggleButton = page.locator('#login-toggle-password');

  // Verificar que começa como type="password"
  await expect(passwordInput).toHaveAttribute('type', 'password');

  // Clicar no botão de toggle
  await toggleButton.click();

  // Verificar que mudou para type="text"
  await expect(passwordInput).toHaveAttribute('type', 'text');
});