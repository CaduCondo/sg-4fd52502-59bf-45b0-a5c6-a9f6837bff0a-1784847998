/**
 * Configuração do Cucumber para Playwright
 */
import { defineConfig } from '@cucumber/cucumber';

export default defineConfig({
  require: ['e2e/step-definitions/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: [
    'progress-bar',
    'html:e2e/reports/cucumber-report.html',
    'json:e2e/reports/cucumber-report.json'
  ],
  formatOptions: {
    snippetInterface: 'async-await'
  },
  publishQuiet: true
});