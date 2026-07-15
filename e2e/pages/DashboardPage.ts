import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model - Página de Dashboard
 */

export class DashboardPage {
  readonly page: Page;
  
  // Navigation
  readonly dashboardMenuItem: Locator;
  readonly propertiesMenuItem: Locator;
  readonly tenantsMenuItem: Locator;
  readonly rentalsMenuItem: Locator;
  readonly paymentsMenuItem: Locator;
  readonly financialMenuItem: Locator;
  readonly settingsMenuItem: Locator;
  
  // User menu
  readonly userMenuTrigger: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Menu items
    this.dashboardMenuItem = page.locator('#nav-dashboard');
    this.propertiesMenuItem = page.locator('#nav-properties');
    this.tenantsMenuItem = page.locator('#nav-tenants');
    this.rentalsMenuItem = page.locator('#nav-rentals');
    this.paymentsMenuItem = page.locator('#nav-payments');
    this.financialMenuItem = page.locator('#nav-financial');
    this.settingsMenuItem = page.locator('#nav-settings');
    
    // User menu
    this.userMenuTrigger = page.locator('#layout-user-menu-trigger');
    this.logoutButton = page.locator('#layout-logout-button');
  }

  /**
   * Navegar para dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Verificar se está na página
   */
  async isLoaded() {
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  /**
   * Verificar quais menus estão visíveis
   */
  async getVisibleMenuItems(): Promise<string[]> {
    const menus = {
      dashboard: this.dashboardMenuItem,
      properties: this.propertiesMenuItem,
      tenants: this.tenantsMenuItem,
      rentals: this.rentalsMenuItem,
      payments: this.paymentsMenuItem,
      financial: this.financialMenuItem,
      settings: this.settingsMenuItem
    };

    const visible: string[] = [];

    for (const [name, locator] of Object.entries(menus)) {
      try {
        if (await locator.isVisible({ timeout: 1000 })) {
          visible.push(name);
        }
      } catch {
        // Menu não visível
      }
    }

    return visible;
  }

  /**
   * Fazer logout
   */
  async logout() {
    await this.userMenuTrigger.click();
    await this.page.waitForTimeout(300);
    await this.logoutButton.click();
  }
}