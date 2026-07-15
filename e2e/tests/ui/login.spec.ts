import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import TEST_CONFIG from '../../config/test.config';

/**
 * Testes de UI - Página de Login
 * 
 * Usando Page Object Model
 */

test.describe('Login Page - UI Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('deve carregar a página corretamente', async () => {
    await loginPage.isLoaded();
  });

  test('deve preencher campos de usuário e senha', async ({ page }) => {
    await loginPage.usernameInput.fill('teste@exemplo.com');
    await expect(loginPage.usernameInput).toHaveValue('teste@exemplo.com');

    await loginPage.passwordInput.fill('senha123');
    await expect(loginPage.passwordInput).toHaveValue('senha123');
  });

  test('deve alternar visibilidade da senha', async () => {
    await loginPage.passwordInput.fill('MinhaSenh@123');
    
    // Verificar que começa oculta
    expect(await loginPage.isPasswordVisible()).toBe(false);
    
    // Mostrar senha
    await loginPage.togglePasswordVisibility();
    expect(await loginPage.isPasswordVisible()).toBe(true);
    
    // Ocultar novamente
    await loginPage.togglePasswordVisibility();
    expect(await loginPage.isPasswordVisible()).toBe(false);
  });

  test('deve abrir e fechar modal de recuperação de senha', async () => {
    await loginPage.openForgotPasswordModal();
    await expect(loginPage.forgotPasswordDialog).toBeVisible();
    
    await loginPage.closeForgotPasswordModal();
    await expect(loginPage.forgotPasswordDialog).not.toBeVisible();
  });

  test('deve validar email inválido no modal de recuperação', async ({ page }) => {
    await loginPage.openForgotPasswordModal();
    await loginPage.submitForgotPassword('emailinvalido');
    
    // Verificar mensagem de erro
    await expect(page.getByText('Por favor, insira um e-mail válido.')).toBeVisible();
  });

  test('deve processar email válido no modal de recuperação', async () => {
    await loginPage.openForgotPasswordModal();
    await loginPage.submitForgotPassword('usuario@exemplo.com');
    
    // Aguardar processamento
    await loginPage.page.waitForTimeout(2000);
    
    // Verificar sucesso
    await expect(loginPage.resetSuccessMessage).toBeVisible();
    await expect(loginPage.resetCloseButton).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async () => {
    const { email, password } = TEST_CONFIG.users.invalid;
    await loginPage.login(email, password);
    
    // Aguardar resposta
    await loginPage.page.waitForTimeout(3000);
    
    // Deve permanecer na página de login
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });
});