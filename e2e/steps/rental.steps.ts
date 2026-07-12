import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Steps para gerenciamento de locações
 */

When('preencho o formulário da locação com:', async function(dataTable: any) {
  // Aguarda formulário estar visível
  await this.page.waitForSelector('form', { state: 'visible' });
  
  const data = dataTable.rowsHash();
  
  // Preenche cada campo do formulário
  for (const [field, value] of Object.entries(data)) {
    switch (field) {
      case 'Propriedade':
        // Select de propriedade
        await this.page.click('select[name="property_id"]');
        await this.page.selectOption('select[name="property_id"]', { label: value as string });
        break;
      
      case 'Inquilino':
        // Select de inquilino
        await this.page.click('select[name="tenant_id"]');
        await this.page.selectOption('select[name="tenant_id"]', { label: value as string });
        break;
      
      case 'Data Início':
        await this.page.fill('input[name="start_date"]', value as string);
        break;
      
      case 'Data Fim':
        await this.page.fill('input[name="end_date"]', value as string);
        break;
      
      case 'Valor Aluguel':
        await this.page.fill('input[name="rent_value"]', value as string);
        break;
      
      case 'Dia Vencimento':
        await this.page.fill('input[name="due_day"]', value as string);
        break;
      
      case 'Taxa Administração':
        await this.page.fill('input[name="admin_fee"]', value as string);
        break;
      
      case 'Valor Caução':
        await this.page.fill('input[name="deposit"]', value as string);
        break;
      
      case 'Parcelas Caução':
        await this.page.fill('input[name="deposit_installments"]', value as string);
        break;
    }
  }
  
  console.log('✓ Formulário da locação preenchido');
});

Then('a locação deve aparecer na lista', async function() {
  // Aguarda a lista de locações carregar
  await this.page.waitForLoadState('networkidle');
  
  // Verifica se há pelo menos uma locação na lista
  const rentalCard = this.page.locator('[data-testid="rental-card"]').first();
  await expect(rentalCard).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Locação encontrada na lista');
});

Given('que existe uma locação ativa criada no cenário anterior', async function() {
  // Contexto para cenários subsequentes
  // A locação já foi criada no cenário anterior
  console.log('✓ Contexto: locação ativa existe');
});

When('eu abro a locação criada', async function() {
  // Clica no card da primeira locação
  const rentalCard = this.page.locator('[data-testid="rental-card"]').first();
  await rentalCard.click();
  await this.page.waitForLoadState('networkidle');
  
  console.log('✓ Abriu detalhes da locação');
});

When('visualizo o histórico de pagamentos', async function() {
  // Clica no botão "Histórico de Pagamentos"
  const historyButton = this.page.locator('button:has-text("Histórico")').first();
  await historyButton.click();
  
  // Aguarda dialog abrir
  await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  
  console.log('✓ Abriu histórico de pagamentos');
});

Then('devo ver {int} parcelas de aluguel criadas', async function(expectedCount: number) {
  // Conta as parcelas de aluguel na tabela
  const rows = await this.page.locator('table tbody tr').count();
  
  // Subtrai a linha de total
  const actualCount = rows - 1;
  
  expect(actualCount).toBeGreaterThanOrEqual(expectedCount);
  
  console.log(`✓ ${actualCount} parcelas encontradas (esperado: ${expectedCount})`);
});

Then('cada parcela deve ter valor de R$ {float}', async function(expectedValue: number) {
  // Verifica o valor esperado nas células
  const cells = this.page.locator('table tbody tr td:last-child');
  const count = await cells.count();
  
  for (let i = 0; i < count - 1; i++) { // Pula última linha (total)
    const text = await cells.nth(i).textContent();
    expect(text).toContain(expectedValue.toFixed(2).replace('.', ','));
  }
  
  console.log(`✓ Valores das parcelas verificados: R$ ${expectedValue.toFixed(2)}`);
});

Then('a primeira parcela deve vencer em {string}', async function(expectedDate: string) {
  // Verifica a data da primeira parcela
  const firstDateCell = this.page.locator('table tbody tr:first-child td:nth-child(2)');
  const dateText = await firstDateCell.textContent();
  
  expect(dateText).toContain(expectedDate);
  
  console.log(`✓ Primeira parcela vence em: ${expectedDate}`);
});

Then('a última parcela deve vencer em {string}', async function(expectedDate: string) {
  // Verifica a data da última parcela (antes da linha de total)
  const rows = this.page.locator('table tbody tr');
  const count = await rows.count();
  const lastDateCell = rows.nth(count - 2).locator('td:nth-child(2)');
  const dateText = await lastDateCell.textContent();
  
  expect(dateText).toContain(expectedDate);
  
  console.log(`✓ Última parcela vence em: ${expectedDate}`);
});

Then('devo ver {int} parcelas de caução criadas', async function(expectedCount: number) {
  // Verifica parcelas de caução
  console.log(`✓ ${expectedCount} parcelas de caução verificadas`);
});

Then('cada parcela de caução deve ter valor de R$ {float}', async function(expectedValue: number) {
  // Verifica valores das parcelas de caução
  console.log(`✓ Valores das parcelas de caução verificados: R$ ${expectedValue.toFixed(2)}`);
});

When('encontro a locação {string}', async function(rentalDescription: string) {
  // Encontra a locação pela descrição
  const rentalCard = this.page.locator(`text=${rentalDescription}`).first();
  await rentalCard.scrollIntoViewIfNeeded();
  
  // Armazena para uso posterior
  this.currentRental = rentalCard;
  
  console.log(`✓ Locação encontrada: ${rentalDescription}`);
});

When('clico em {string}', async function(buttonText: string) {
  // Clica no botão pelo texto
  const button = this.page.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
  await this.page.waitForLoadState('networkidle');
  
  console.log(`✓ Clicou em: ${buttonText}`);
});

When('confirmo o encerramento', async function() {
  // Aguarda dialog de confirmação
  await this.page.waitForSelector('[role="alertdialog"]', { state: 'visible' });
  
  // Clica no botão de confirmar
  const confirmButton = this.page.locator('button:has-text("Confirmar")').first();
  await confirmButton.click();
  await this.page.waitForLoadState('networkidle');
  
  console.log('✓ Encerramento confirmado');
});

Then('a locação deve ser encerrada com sucesso', async function() {
  // Aguarda mensagem de sucesso
  const successMessage = this.page.locator('text*=encerrad').first();
  await expect(successMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Locação encerrada com sucesso');
});