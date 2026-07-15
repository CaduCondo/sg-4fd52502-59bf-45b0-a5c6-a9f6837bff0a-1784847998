import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model - Página de Login
 * 
 * Encapsula todos os elementos e ações da página de login
 */

export class LoginPage {
  readonly page: Page;
  
  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly togglePasswordButton: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  
  // Modal de recuperação de senha
  readonly forgotPasswordDialog: Locator;
  readonly resetEmailInput: Locator;
  readonly resetSubmitButton: Locator;
  readonly resetCancelButton: Locator;
  readonly resetCloseButton: Locator;
  readonly resetSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Inicializar locators
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.togglePasswordButton = page.locator('#login-toggle-password');
    this.submitButton = page.locator('#login-submit-button');
    this.forgotPasswordLink = page.locator('#login-forgot-password-link');
    this.errorMessage = page.locator('text=Credenciais inválidas');
    
    // Modal
    this.forgotPasswordDialog = page.locator('#login-forgot-password-dialog');
    this.resetEmailInput = page.locator('#reset-email');
    this.resetSubmitButton = page.locator('#login-forgot-password-submit');
    this.resetCancelButton = page.locator('#login-forgot-password-cancel');
    this.resetCloseButton = page.locator('#login-forgot-password-close');
    this.resetSuccessMessage = page.getByText('E-mail enviado!');
  }

  /**
   * Navegar para a página de login
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Fazer login
   */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Verificar se a página foi carregada
   */
  async isLoaded() {
    await expect(this.page.locator('h1')).toContainText("D'Uvo Enterprise");
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Alternar visibilidade da senha
   */
  async togglePasswordVisibility() {
    await this.togglePasswordButton.click();
  }

  /**
   * Verificar se a senha está visível
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Abrir modal de recuperação de senha
   */
  async openForgotPasswordModal() {
    await this.forgotPasswordLink.click();
    await this.page.waitForTimeout(300);
    await expect(this.forgotPasswordDialog).toBeVisible();
  }

  /**
   * Fechar modal de recuperação de senha
   */
  async closeForgotPasswordModal() {
    await this.resetCancelButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Enviar email de recuperação
   */
  async submitForgotPassword(email: string) {
    await this.resetEmailInput.fill(email);
    await this.resetSubmitButton.click();
  }

  /**
   * Verificar mensagem de erro
   */
  async hasError(): Promise<boolean> {
    try {
      await expect(this.errorMessage).toBeVisible({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verificar se está na página de login
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}