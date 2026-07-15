import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E
 * Documentação: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Executar testes em paralelo */
  fullyParallel: true,
  
  /* Falhar no CI se você acidentalmente deixou test.only */
  forbidOnly: !!process.env.CI,
  
  /* Retry em CI apenas */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out de testes paralelos no CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: 'html',
  
  /* Configuração compartilhada para todos os projetos */
  use: {
    /* URL base da aplicação */
    baseURL: 'http://localhost:3000',
    
    /* Capturar screenshot apenas quando falhar */
    screenshot: 'only-on-failure',
    
    /* Capturar vídeo apenas quando falhar */
    video: 'retain-on-failure',
    
    /* Trace apenas quando falhar */
    trace: 'on-first-retry',
  },

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomente para testar em outros navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Teste em Mobile viewports */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* Executar servidor de desenvolvimento antes dos testes */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});