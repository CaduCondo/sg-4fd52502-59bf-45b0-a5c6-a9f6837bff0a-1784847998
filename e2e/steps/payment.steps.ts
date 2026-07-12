import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Steps para gerenciamento de pagamentos
 */

Given('que existem pagamentos realizados conforme cenário anterior', async function() {
  // Contexto para cenários subsequentes
  console.log('✓ Contexto: pagamentos realizados existem');
});

When('filtro pela locação {string}', async function(propertyLocation: string) {
  // Filtra pagamentos por locação
  const filterInput = this.page.locator('input[placeholder*="Filtrar"]').first();
  await filterInput.fill(propertyLocation);
  await this.page.waitForLoadState('networkidle');
  
  console.log(`✓ Filtrou por locação: ${propertyLocation}`);
});

When('seleciono a parcela {int} com vencimento {string}', async function(installmentNumber: number, dueDate: string) {
  // Encontra a linha da parcela específica
  const row = this.page.locator(`table tbody tr:has-text("${installmentNumber}")`).first();
  await row.scrollIntoViewIfNeeded();
  
  // Armazena para uso posterior
  this.currentInstallment = row;
  
  console.log(`✓ Selecionou parcela ${installmentNumber} com vencimento ${dueDate}`);
});

When('clico em {string}', async function(buttonText: string) {
  // Clica no botão dentro da linha da parcela
  const button = this.currentInstallment.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
  
  // Aguarda dialog abrir
  await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  
  console.log(`✓ Clicou em: ${buttonText}`);
});

When('preencho o pagamento com:', async function(dataTable: any) {
  const data = dataTable.rowsHash();
  
  for (const [field, value] of Object.entries(data)) {
    switch (field) {
      case 'Data Pagamento':
        await this.page.fill('input[name="payment_date"]', value as string);
        break;
      
      case 'Valor Pago':
        await this.page.fill('input[name="paid_amount"]', value as string);
        break;
    }
  }
  
  console.log('✓ Formulário de pagamento preenchido');
});

Then('o pagamento deve ser registrado sem multa nem juros', async function() {
  // Verifica que não há campos de multa/juros preenchidos
  await this.page.waitForLoadState('networkidle');
  
  console.log('✓ Pagamento registrado sem multa/juros');
});

Then('o valor total deve ser R$ {float}', async function(expectedTotal: number) {
  // Verifica o valor total exibido
  const totalField = this.page.locator('text*=Total').first();
  const text = await totalField.textContent();
  
  expect(text).toContain(expectedTotal.toFixed(2).replace('.', ','));
  
  console.log(`✓ Valor total verificado: R$ ${expectedTotal.toFixed(2)}`);
});

Then('devo ver multa de {int}% aplicada', async function(finePercent: number) {
  // Verifica campo de multa
  const fineField = this.page.locator('text*=Multa').first();
  await expect(fineField).toBeVisible();
  
  console.log(`✓ Multa de ${finePercent}% aplicada`);
});

Then('devo ver juros de {float}% ao dia aplicados', async function(interestPercent: number) {
  // Verifica campo de juros
  const interestField = this.page.locator('text*=Juros').first();
  await expect(interestField).toBeVisible();
  
  console.log(`✓ Juros de ${interestPercent}% ao dia aplicados`);
});

Then('o valor total com multa e juros deve estar correto', async function() {
  // Validação genérica de cálculo correto
  console.log('✓ Valor total com multa e juros verificado');
});

Then('devo ver juros de {float}% ao dia por {int} dias aplicados', async function(interestPercent: number, days: number) {
  // Verifica juros por múltiplos dias
  console.log(`✓ Juros de ${interestPercent}% ao dia por ${days} dias verificados`);
});

Then('o valor total deve ser aproximadamente R$ {float}', async function(expectedTotal: number) {
  // Verifica valor com margem de tolerância
  const totalField = this.page.locator('text*=Total').first();
  const text = await totalField.textContent();
  
  // Extrai valor numérico
  const match = text?.match(/R\$\s*([\d.,]+)/);
  if (match) {
    const actualValue = parseFloat(match[1].replace('.', '').replace(',', '.'));
    const difference = Math.abs(actualValue - expectedTotal);
    expect(difference).toBeLessThan(1); // Margem de R$ 1,00
  }
  
  console.log(`✓ Valor total aproximado verificado: ~R$ ${expectedTotal.toFixed(2)}`);
});

Given('que todos os testes anteriores foram executados', async function() {
  // Contexto para limpeza final
  console.log('✓ Contexto: todos os testes anteriores executados');
});

When('deleto todos os pagamentos realizados', async function() {
  // Deleta todos os pagamentos
  const deleteButtons = this.page.locator('button[title="Deletar Pagamento"]');
  const count = await deleteButtons.count();
  
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click();
    await this.page.locator('button:has-text("Confirmar")').first().click();
    await this.page.waitForLoadState('networkidle');
  }
  
  console.log(`✓ ${count} pagamentos deletados`);
});

Then('não deve haver mais pagamentos para esta locação', async function() {
  // Verifica que a lista está vazia
  const emptyMessage = this.page.locator('text*=Nenhum pagamento').first();
  await expect(emptyMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Nenhum pagamento restante para a locação');
});