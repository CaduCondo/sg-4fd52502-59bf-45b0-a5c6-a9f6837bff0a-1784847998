import { Page } from '@playwright/test';
import TEST_CONFIG from '../config/test.config';

/**
 * Helper de Autenticação
 * 
 * Funções reutilizáveis para login/logout nos testes
 */

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Fazer login com credenciais
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.locator('#username').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#login-submit-button').click();
    
    // Aguardar navegação para dashboard
    await this.page.waitForURL('**/dashboard', { 
      timeout: TEST_CONFIG.timeouts.navigation 
    });
  }

  /**
   * Login como Admin
   */
  async loginAsAdmin() {
    const { email, password } = TEST_CONFIG.users.admin;
    await this.login(email, password);
  }

  /**
   * Login como Financeiro
   */
  async loginAsFinancial() {
    const { email, password } = TEST_CONFIG.users.financial;
    await this.login(email, password);
  }

  /**
   * Login como Gestão
   */
  async loginAsManagement() {
    const { email, password } = TEST_CONFIG.users.management;
    await this.login(email, password);
  }

  /**
   * Logout
   */
  async logout() {
    // Clicar no menu do usuário
    await this.page.locator('#layout-user-menu-trigger').click();
    await this.page.waitForTimeout(300);
    
    // Clicar em logout
    await this.page.locator('#layout-logout-button').click();
    
    // Aguardar redirect para login
    await this.page.waitForURL('**/login', { 
      timeout: TEST_CONFIG.timeouts.medium 
    });
  }

  /**
   * Verificar se está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url();
    return !url.includes('/login');
  }

  /**
   * Verificar se está na página de login
   */
  async isOnLoginPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/login');
  }
}

/**
 * Helper function para criar instância
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page);
}