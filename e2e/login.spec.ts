import { test, expect } from '@playwright/test';

/**
 * Testes do fluxo de login
 * 
 * NOTA: Para testar login real, você precisa ter:
 * 1. Supabase rodando
 * 2. Credenciais válidas no banco de dados
 * 
 * Estes testes usam seletores baseados nos IDs que adicionamos.
 */

test.describe('Fluxo de Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página de login antes de cada teste
    await page.goto('/login');
  });

  test('deve mostrar a página de login corretamente', async ({ page }) => {
    // Verificar elementos principais
    await expect(page.locator('h1')).toContainText('Bem-vindo');
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-submit-button')).toBeVisible();
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    // Tentar submeter formulário vazio
    await page.locator('#login-submit-button').click();

    // Navegação não deve acontecer (ainda estamos em /login)
    await expect(page).toHaveURL(/.*login/);
  });

  test('deve preencher os campos corretamente', async ({ page }) => {
    // Preencher usuário
    await page.locator('#login-username').fill('usuario@exemplo.com');
    await expect(page.locator('#login-username')).toHaveValue('usuario@exemplo.com');

    // Preencher senha
    await page.locator('#login-password').fill('MinhaSenh@123');
    await expect(page.locator('#login-password')).toHaveValue('MinhaSenh@123');
  });

  test('botão de toggle senha deve funcionar', async ({ page }) => {
    const passwordInput = page.locator('#login-password');
    const toggleButton = page.locator('#login-toggle-password');

    // Senha oculta por padrão
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Mostrar senha
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Ocultar novamente
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('link "esqueci minha senha" deve abrir modal', async ({ page }) => {
    // Clicar no link
    await page.locator('#login-forgot-password-link').click();

    // Verificar que o modal abriu
    await expect(page.locator('#login-forgot-password-dialog')).toBeVisible();
    
    // Verificar que tem campo de email no modal
    await expect(page.locator('#login-forgot-password-email')).toBeVisible();
  });

  // TESTE DE LOGIN REAL - DESCOMENTE E AJUSTE COM SUAS CREDENCIAIS
  // test.skip('deve fazer login com credenciais válidas', async ({ page }) => {
  //   // SUBSTITUA com credenciais válidas do seu ambiente de teste
  //   await page.locator('#login-username').fill('admin@seudominio.com');
  //   await page.locator('#login-password').fill('SuaSenhaSegura123');
  //   
  //   // Submeter formulário
  //   await page.locator('#login-submit-button').click();
  //   
  //   // Aguardar navegação para dashboard
  //   await page.waitForURL('**/dashboard', { timeout: 5000 });
  //   
  //   // Verificar que estamos no dashboard
  //   await expect(page).toHaveURL(/.*dashboard/);
  //   await expect(page.locator('h1')).toContainText('Dashboard');
  // });
});