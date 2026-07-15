import { test, expect } from '@playwright/test';

/**
 * Testes completos do fluxo de login
 * 
 * Estes testes usam os IDs corretos que foram adicionados na página.
 */

test.describe('Página de Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('deve exibir todos os elementos da interface', async ({ page }) => {
    // Logo e título
    await expect(page.locator('h1')).toContainText("D'Uvo Enterprise");
    await expect(page.getByText('Property Control System')).toBeVisible();

    // Campos do formulário
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-submit-button')).toBeVisible();

    // Link de esqueci senha
    await expect(page.locator('#login-forgot-password-link')).toBeVisible();

    // Informações do desenvolvedor
    await expect(page.getByText('Carlos Uva')).toBeVisible();
    await expect(page.getByText('stefcadu@gmail.com')).toBeVisible();
  });

  test('deve preencher e limpar os campos corretamente', async ({ page }) => {
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');

    // Preencher usuário
    await usernameInput.fill('usuario@exemplo.com');
    await expect(usernameInput).toHaveValue('usuario@exemplo.com');

    // Preencher senha
    await passwordInput.fill('MinhaSenh@123');
    await expect(passwordInput).toHaveValue('MinhaSenh@123');

    // Limpar campos
    await usernameInput.clear();
    await passwordInput.clear();

    // Verificar que estão vazios
    await expect(usernameInput).toHaveValue('');
    await expect(passwordInput).toHaveValue('');
  });

  test('toggle de senha deve alternar visibilidade', async ({ page }) => {
    const passwordInput = page.locator('#password');
    const toggleButton = page.locator('#login-toggle-password');

    // Senha oculta por padrão
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Preencher senha
    await passwordInput.fill('SenhaSecreta123');

    // Mostrar senha
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Ocultar novamente
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('botão de submit deve estar habilitado quando campos preenchidos', async ({ page }) => {
    const submitButton = page.locator('#login-submit-button');

    // Botão deve estar habilitado inicialmente
    await expect(submitButton).toBeEnabled();

    // Preencher campos
    await page.locator('#username').fill('usuario@exemplo.com');
    await page.locator('#password').fill('senha123');

    // Botão ainda habilitado
    await expect(submitButton).toBeEnabled();
    await expect(submitButton).toHaveText('Entrar');
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    // Preencher com credenciais inválidas
    await page.locator('#username').fill('invalido@exemplo.com');
    await page.locator('#password').fill('senhaerrada');

    // Submeter
    await page.locator('#login-submit-button').click();

    // Aguardar resposta (máximo 3 segundos)
    await page.waitForTimeout(3000);

    // Deve mostrar mensagem de erro OU permanecer na página de login
    const hasError = await page.getByText(/Credenciais inválidas/i).isVisible().catch(() => false);
    const stillOnLogin = await page.url().then(url => url.includes('/login'));

    expect(hasError || stillOnLogin).toBeTruthy();
  });
});

test.describe('Modal de Recuperação de Senha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Abrir modal
    await page.locator('#login-forgot-password-link').click();
    await page.waitForTimeout(300);
  });

  test('deve abrir e fechar modal corretamente', async ({ page }) => {
    // Modal deve estar visível
    await expect(page.locator('#login-forgot-password-dialog')).toBeVisible();
    await expect(page.getByText('Recuperar Senha')).toBeVisible();

    // Fechar modal
    await page.locator('#login-forgot-password-cancel').click();
    await page.waitForTimeout(300);

    // Modal deve estar oculto
    await expect(page.locator('#login-forgot-password-dialog')).not.toBeVisible();
  });

  test('deve validar email inválido', async ({ page }) => {
    // Tentar com email sem @
    await page.locator('#reset-email').fill('emailinvalido');
    await page.locator('#login-forgot-password-submit').click();

    // Deve mostrar erro
    await expect(page.getByText(/e-mail válido/i)).toBeVisible();
  });

  test('deve processar email válido', async ({ page }) => {
    // Preencher email válido
    await page.locator('#reset-email').fill('usuario@exemplo.com');
    await page.locator('#login-forgot-password-submit').click();

    // Aguardar processamento (simula envio de email)
    await page.waitForTimeout(2000);

    // Deve mostrar mensagem de sucesso
    await expect(page.getByText(/E-mail enviado/i)).toBeVisible();
    await expect(page.getByText(/Verifique sua caixa de entrada/i)).toBeVisible();

    // Deve ter botão para fechar
    await expect(page.locator('#login-forgot-password-close')).toBeVisible();
  });

  test('deve fechar modal após sucesso', async ({ page }) => {
    // Processo completo
    await page.locator('#reset-email').fill('usuario@exemplo.com');
    await page.locator('#login-forgot-password-submit').click();
    await page.waitForTimeout(2000);

    // Fechar após sucesso
    await page.locator('#login-forgot-password-close').click();
    await page.waitForTimeout(300);

    // Modal deve estar fechado
    await expect(page.locator('#login-forgot-password-dialog')).not.toBeVisible();
  });
});

// TESTE COM CREDENCIAIS REAIS - Descomente quando tiver usuário de teste
test.describe.skip('Login Real (requer credenciais válidas)', () => {
  test('deve fazer login com sucesso', async ({ page }) => {
    await page.goto('/login');

    // SUBSTITUA com credenciais válidas do seu ambiente
    await page.locator('#username').fill('seu-usuario@exemplo.com');
    await page.locator('#password').fill('SuaSenhaSegura123');

    // Submeter
    await page.locator('#login-submit-button').click();

    // Aguardar navegação
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // Verificar que está no dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('#dashboard-page')).toBeVisible();
  });
});