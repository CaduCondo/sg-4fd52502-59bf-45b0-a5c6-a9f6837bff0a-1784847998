import { Page } from '@playwright/test';

/**
 * Credenciais de teste
 * IMPORTANTE: Trocar para credenciais reais do ambiente de teste
 */
const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'SenhaSegura123!',
};

/**
 * Realiza login no sistema
 * @param page - Página do Playwright
 */
export async function login(page: Page) {
  // Navega para página de login
  await page.goto('/login');
  
  // Aguarda formulário de login estar visível
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  
  // Preenche credenciais
  await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  
  // Clica no botão de login
  await page.click('button[type="submit"]');
  
  // Aguarda redirecionamento para dashboard
  await page.waitForURL('/dashboard', { timeout: 15000 });
  
  // Aguarda página carregar completamente
  await page.waitForLoadState('networkidle');
  
  console.log('✓ Login realizado com sucesso');
}

/**
 * Realiza logout do sistema
 * @param page - Página do Playwright
 */
export async function logout(page: Page) {
  // Clica no menu de usuário
  await page.click('[data-testid="user-menu"]');
  
  // Clica em sair
  await page.click('text=Sair');
  
  // Aguarda redirecionamento para login
  await page.waitForURL('/login', { timeout: 10000 });
  
  console.log('✓ Logout realizado com sucesso');
}

/**
 * Verifica se usuário está autenticado
 * @param page - Página do Playwright
 * @returns true se autenticado, false caso contrário
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Verifica se está na página de dashboard/dashboard
    const url = page.url();
    return url.includes('/dashboard') || url.includes('/properties') || url.includes('/rentals');
  } catch {
    return false;
  }
}