import { test, expect } from '@playwright/test';

/**
 * Testes básicos da página de login
 */
test('página de login deve carregar corretamente', async ({ page }) => {
  // Navegar para a página de login
  await page.goto('/login');

  // Verificar se o título está presente
  await expect(page.locator('h1')).toContainText("D'Uvo Enterprise");

  // Verificar se os campos estão presentes (usando os IDs corretos)
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#login-submit-button')).toBeVisible();
});

/**
 * Teste de preenchimento dos campos
 */
test('campos de login devem aceitar input', async ({ page }) => {
  await page.goto('/login');

  // Preencher o campo de usuário
  await page.locator('#username').fill('teste@example.com');
  await expect(page.locator('#username')).toHaveValue('teste@example.com');

  // Preencher o campo de senha
  await page.locator('#password').fill('senha123');
  await expect(page.locator('#password')).toHaveValue('senha123');
});

/**
 * Teste do botão de mostrar/ocultar senha
 */
test('botão de mostrar/ocultar senha deve funcionar', async ({ page }) => {
  await page.goto('/login');

  const passwordInput = page.locator('#password');
  const toggleButton = page.locator('#login-toggle-password');

  // Verificar que começa como type="password"
  await expect(passwordInput).toHaveAttribute('type', 'password');

  // Clicar no botão de toggle
  await toggleButton.click();

  // Verificar que mudou para type="text"
  await expect(passwordInput).toHaveAttribute('type', 'text');

  // Clicar novamente para ocultar
  await toggleButton.click();

  // Verificar que voltou para type="password"
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

/**
 * Teste do link "Esqueci minha senha"
 */
test('link esqueci minha senha deve abrir modal', async ({ page }) => {
  await page.goto('/login');

  // Clicar no link
  await page.locator('#login-forgot-password-link').click();

  // Aguardar modal aparecer
  await page.waitForTimeout(300);

  // Verificar que o modal abriu
  await expect(page.locator('#login-forgot-password-dialog')).toBeVisible();

  // Verificar elementos do modal
  await expect(page.getByText('Recuperar Senha')).toBeVisible();
  await expect(page.locator('#reset-email')).toBeVisible();
  await expect(page.locator('#login-forgot-password-submit')).toBeVisible();
  await expect(page.locator('#login-forgot-password-cancel')).toBeVisible();
});

/**
 * Teste de validação de email no modal de esqueci senha
 */
test('modal de esqueci senha deve validar email', async ({ page }) => {
  await page.goto('/login');

  // Abrir modal
  await page.locator('#login-forgot-password-link').click();
  await page.waitForTimeout(300);

  // Tentar enviar com email inválido
  await page.locator('#reset-email').fill('email-invalido');
  await page.locator('#login-forgot-password-submit').click();

  // Deve mostrar mensagem de erro (texto exato da página)
  await expect(page.getByText('Por favor, insira um e-mail válido.')).toBeVisible();

  // Preencher com email válido
  await page.locator('#reset-email').fill('teste@example.com');
  await page.locator('#login-forgot-password-submit').click();

  // Aguardar mensagem de sucesso (texto exato da página)
  await page.waitForTimeout(2000);
  await expect(page.getByText('E-mail enviado!')).toBeVisible();
  await expect(page.getByText(/Verifique sua caixa de entrada/i)).toBeVisible();
});