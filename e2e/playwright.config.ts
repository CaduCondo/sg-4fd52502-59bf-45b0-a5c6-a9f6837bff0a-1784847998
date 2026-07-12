import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Configuração do Playwright para testes E2E
 * Suporta múltiplos browsers e ambientes
 */
export default defineConfig({
  testDir: './features',
  testMatch: '**/*.feature',
  
  /* Timeout para cada teste (5 minutos) */
  timeout: 5 * 60 * 1000,
  
  /* Expect timeout (10 segundos) */
  expect: {
    timeout: 10 * 1000
  },

  /* Configurações de execução */
  fullyParallel: false, // Executa sequencialmente para evitar conflitos de dados
  forbidOnly: !!process.env.CI, // Falha se houver .only() no CI
  retries: process.env.CI ? 2 : 0, // Retry em caso de falha no CI
  workers: 1, // Executa um teste por vez
  
  /* Reporter - Gera relatórios HTML e JSON */
  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/report.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  /* Configuração compartilhada para todos os projetos */
  use: {
    /* URL base da aplicação */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Captura screenshots apenas em falhas */
    screenshot: 'only-on-failure',
    
    /* Grava vídeo apenas em falhas */
    video: 'retain-on-failure',
    
    /* Grava trace para debug em falhas */
    trace: 'retain-on-failure',
    
    /* Timeout de navegação */
    navigationTimeout: 30 * 1000,
    
    /* Timeout de ações */
    actionTimeout: 15 * 1000,
  },

  /* Configuração de projetos (browsers) */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    /* Descomente para testar em outros browsers
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    */

    /* Testes mobile (descomente se necessário)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    */
  ],

  /* Servidor de desenvolvimento (se necessário) */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  /* Pasta para artefatos de teste */
  outputDir: 'test-results/artifacts',
});