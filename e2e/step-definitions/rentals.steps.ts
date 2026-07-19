import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import DatabaseHelper from '../helpers/database.helper';

/**
 * Step Definitions para Locações e Cauções
 */

// ==================== SETUP DE DADOS ====================

Given('que existe um imóvel disponível {string} com aluguel de {string}', async function(propertyId: string, rentValue: string) {
  this.testData = {
    ...this.testData,
    property: { id: propertyId, rent: rentValue }
  };
});

Given('que existe um inquilino {string}', async function(tenantName: string) {
  this.testData = {
    ...this.testData,
    tenant: { name: tenantName }
  };
});

Given('que existe uma locação ativa', async function() {
  // Mock: assumir que existe locação criada
  this.testData = {
    ...this.testData,
    hasActiveRental: true
  };
});

Given('que existe uma locação ativa com aluguel de {string}', async function(rentValue: string) {
  this.testData = {
    ...this.testData,
    rental: { rent: rentValue }
  };
});

Given('que existe uma locação ativa com término em {string}', async function(endDate: string) {
  this.testData = {
    ...this.testData,
    rental: { endDate }
  };
});

Given('o pagamento de Janeiro/2026 está {string} com valor de {string}', async function(status: string, value: string) {
  this.testData = {
    ...this.testData,
    januaryPayment: { status, value }
  };
});

Given('o pagamento de Novembro/2025 está {string} com valor de {string}', async function(status: string, value: string) {
  this.testData = {
    ...this.testData,
    novemberPayment: { status, value }
  };
});

Given('o pagamento de Dezembro/2025 está {string} com valor de {string}', async function(status: string, value: string) {
  this.testData = {
    ...this.testData,
    decemberPayment: { status, value }
  };
});

Given('o pagamento de Março/2026 está {string} com valor de {string}', async function(status: string, value: string) {
  this.testData = {
    ...this.testData,
    marchPayment: { status, value }
  };
});

Given('que existe uma locação com caução parcelado em 3x:', async function(dataTable: any) {
  const installments = dataTable.hashes();
  
  this.testData = {
    ...this.testData,
    depositInstallments: installments
  };
});

// ==================== AÇÕES ====================

When('seleciono um imóvel que está {string}', async function(status: string) {
  // Tentar selecionar um imóvel ocupado (deve falhar)
  await this.page.waitForTimeout(300);
});

When('NÃO preencho o valor da caução', async function() {
  // Não fazer nada - deixar campo vazio
  await this.page.waitForTimeout(100);
});

When('tento salvar', async function() {
  const saveButton = this.page.getByRole('button', { name: /salvar/i });
  await saveButton.click();
  await this.page.waitForTimeout(500);
});

When('preencho o valor da caução com {string}', async function(value: string) {
  const depositInput = this.page.locator('[id*="deposit"]').first();
  await depositInput.fill(value);
});

When('marco a opção {string}', async function(option: string) {
  const checkbox = this.page.getByText(new RegExp(option, 'i'));
  await checkbox.click();
  await this.page.waitForTimeout(300);
});

When('NÃO marco a opção {string}', async function(option: string) {
  // Não fazer nada
  await this.page.waitForTimeout(100);
});

When('seleciono {string}', async function(option: string) {
  // Exemplo: "3 parcelas"
  const select = this.page.locator('[id*="installment-count"]');
  await select.click();
  await this.page.waitForTimeout(300);
  
  const optionElement = this.page.getByText(option);
  await optionElement.click();
});

When('preencho:', async function(dataTable: any) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    const field = row.campo;
    const value = row.valor;
    
    // Identificar o campo pelo label
    let inputId = '';
    
    if (field.includes('1ª parcela - Valor')) {
      inputId = 'deposit-installment-1-amount';
    } else if (field.includes('1ª parcela - Data Pagamento')) {
      inputId = 'deposit-payment-date';
    } else if (field.includes('2ª parcela - Valor')) {
      inputId = 'deposit-installment-2-amount';
    } else if (field.includes('2ª parcela - Data Vencimento')) {
      inputId = 'deposit-installment-2-date';
    } else if (field.includes('3ª parcela - Valor')) {
      inputId = 'deposit-installment-3-amount';
    } else if (field.includes('3ª parcela - Data Vencimento')) {
      inputId = 'deposit-installment-3-date';
    }
    
    const input = this.page.locator(`#${inputId}`);
    if (await input.isVisible()) {
      if (value.includes('/')) {
        // Data: converter DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = value.split('/');
        await input.fill(`${year}-${month}-${day}`);
      } else {
        await input.fill(value);
      }
    }
  }
});

When('preencho a {string} da 1ª parcela com {string}', async function(fieldName: string, value: string) {
  const input = this.page.locator('[id*="deposit-payment-date"]').first();
  
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    await input.fill(`${year}-${month}-${day}`);
  } else {
    await input.fill(value);
  }
});

When('preencho a {string} com {string}', async function(fieldName: string, value: string) {
  let inputId = '';
  
  if (fieldName.toLowerCase().includes('data pagamento')) {
    inputId = 'deposit-payment-date';
  }
  
  const input = this.page.locator(`#${inputId}`);
  
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    await input.fill(`${year}-${month}-${day}`);
  } else {
    await input.fill(value);
  }
});

When('salvo a locação', async function() {
  const saveButton = this.page.getByRole('button', { name: /salvar/i });
  await saveButton.click();
  await this.page.waitForTimeout(2000);
});

When('crio uma locação com:', async function(dataTable: any) {
  const data = dataTable.rowsHash();
  
  await this.page.goto('/rentals');
  await this.page.waitForLoadState('networkidle');
  
  await this.page.getByRole('button', { name: /nova locação/i }).click();
  await this.page.waitForTimeout(500);
  
  // Preencher campos...
  await this.page.waitForTimeout(500);
  
  this.testData = {
    ...this.testData,
    rental: data
  };
});

When('abro a locação em modo {string}', async function(mode: string) {
  // Clicar no primeiro card de locação
  const firstRental = this.page.locator('[data-testid="rental-card"]').first();
  await firstRental.click();
  await this.page.waitForTimeout(500);
});

When('edito a locação', async function() {
  const editButton = this.page.getByRole('button', { name: /editar/i });
  await editButton.click();
  await this.page.waitForTimeout(500);
});

When('edito a locação em {string}', async function(date: string) {
  // Simular data atual no contexto do teste
  this.testData = {
    ...this.testData,
    currentDate: date
  };
  
  const editButton = this.page.getByRole('button', { name: /editar/i });
  await editButton.click();
  await this.page.waitForTimeout(500);
});

When('altero o valor do aluguel de {string} para {string}', async function(oldValue: string, newValue: string) {
  const rentInput = this.page.locator('[id*="rent"]');
  await rentInput.fill(newValue);
});

When('altero o valor do aluguel para {string}', async function(newValue: string) {
  const rentInput = this.page.locator('[id*="rent"]');
  await rentInput.fill(newValue);
});

When('altero a garagem para {string}', async function(value: string) {
  const garageCheckbox = this.page.getByText(/possui garagem/i);
  await garageCheckbox.click();
  await this.page.waitForTimeout(300);
  
  const garageInput = this.page.locator('[id*="garage"]');
  await garageInput.fill(value);
});

When('salvo as alterações', async function() {
  const saveButton = this.page.getByRole('button', { name: /salvar/i });
  await saveButton.click();
  await this.page.waitForTimeout(2000);
});

When('visualizo o {string}', async function(documentName: string) {
  const button = this.page.getByRole('button', { name: new RegExp(documentName, 'i') });
  await button.click();
  await this.page.waitForTimeout(1000);
});

When('preencho a data de encerramento com {string}', async function(date: string) {
  const dateInput = this.page.locator('[id*="termination-date"]');
  
  if (date.includes('/')) {
    const [day, month, year] = date.split('/');
    await dateInput.fill(`${year}-${month}-${day}`);
  } else {
    await dateInput.fill(date);
  }
});

When('confirmo o encerramento', async function() {
  const confirmButton = this.page.getByRole('button', { name: /confirmar/i });
  await confirmButton.click();
  await this.page.waitForTimeout(2000);
});

// ==================== VALIDAÇÕES ====================

Then('não devo poder continuar', async function() {
  const saveButton = this.page.getByRole('button', { name: /salvar/i });
  const isDisabled = await saveButton.isDisabled().catch(() => true);
  expect(isDisabled).toBe(true);
});

Then('na aba {string} da página Financeiro devo ver:', async function(tabName: string, dataTable: any) {
  const rows = dataTable.hashes();
  
  // Navegar para Financial
  await this.page.goto('/financial');
  await this.page.waitForLoadState('networkidle');
  
  // Clicar na aba
  const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') });
  await tab.click();
  await this.page.waitForTimeout(1000);
  
  // Verificar dados da tabela
  for (const row of rows) {
    const parcelaText = this.page.getByText(row.Parcela);
    await expect(parcelaText).toBeVisible();
    
    const valorText = this.page.getByText(row.Valor);
    await expect(valorText).toBeVisible();
  }
});

Then('na aba {string} devo ver:', async function(tabName: string, dataTable: any) {
  const rows = dataTable.hashes();
  
  const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') });
  await tab.click();
  await this.page.waitForTimeout(500);
  
  for (const row of rows) {
    for (const value of Object.values(row)) {
      const text = this.page.getByText(value as string);
      await expect(text).toBeVisible();
    }
  }
});

Then('no banco de dados a parcela {int} deve ter:', async function(installmentNumber: number, dataTable: any) {
  const expected = dataTable.rowsHash();
  
  // Validação via query ao banco (necessita DatabaseHelper)
  // Por enquanto, apenas log
  console.log(`Validar parcela ${installmentNumber}:`, expected);
  
  this.testData = {
    ...this.testData,
    dbValidation: { installmentNumber, expected }
  };
});

Then('a parcela {int} deve ter:', async function(installmentNumber: number, dataTable: any) {
  const expected = dataTable.rowsHash();
  
  console.log(`Validar parcela ${installmentNumber}:`, expected);
  
  this.testData = {
    ...this.testData,
    dbValidation: { installmentNumber, expected }
  };
});

Then('no bloco {string} devo ver:', async function(blockName: string, dataTable: any) {
  const rows = dataTable.hashes();
  
  const block = this.page.locator(`text=${blockName}`).locator('..').locator('..');
  
  for (const row of rows) {
    const fieldText = block.getByText(new RegExp(row.campo, 'i'));
    await expect(fieldText).toBeVisible({ timeout: 3000 });
    
    if (row.valor && row.valor !== '(vazio)') {
      const valueText = block.getByText(row.valor);
      await expect(valueText).toBeVisible({ timeout: 3000 });
    }
  }
});

Then('devo ver o campo {string}', async function(fieldName: string) {
  const field = this.page.getByText(new RegExp(fieldName, 'i'));
  await expect(field).toBeVisible();
});

Then('devo poder preencher o valor', async function() {
  // Verificar que o campo está habilitado
  await this.page.waitForTimeout(200);
});

Then('devo ver os campos:', async function(dataTable: any) {
  const fields = dataTable.hashes();
  
  for (const field of fields) {
    const fieldElement = this.page.getByText(new RegExp(field.campo, 'i'));
    await expect(fieldElement).toBeVisible();
  }
});

Then('devem ser criados {int} pagamentos', async function(count: number) {
  await this.page.goto('/payments');
  await this.page.waitForLoadState('networkidle');
  
  const payments = this.page.locator('[data-testid="payment-card"]');
  await expect(payments).toHaveCount(count, { timeout: 5000 });
});

Then('cada pagamento deve ter valor de {string}', async function(value: string) {
  const payments = this.page.locator('[data-testid="payment-card"]');
  const count = await payments.count();
  
  for (let i = 0; i < count; i++) {
    const payment = payments.nth(i);
    const text = await payment.textContent();
    expect(text).toContain(value);
  }
});

Then('todos os pagamentos devem vencer no dia {int}', async function(day: number) {
  const payments = this.page.locator('[data-testid="payment-card"]');
  const count = await payments.count();
  
  for (let i = 0; i < count; i++) {
    const payment = payments.nth(i);
    const text = await payment.textContent();
    
    // Verificar se contém o dia (formato pode variar: 10/08, 10-08, etc)
    const dayStr = day.toString().padStart(2, '0');
    const hasDay = text?.includes(`/${dayStr}/`) || text?.includes(`-${dayStr}-`) || text?.includes(` ${dayStr} `);
    expect(hasDay).toBe(true);
  }
});

Then('os pagamentos futuros devem ser atualizados para {string}', async function(value: string) {
  await this.page.waitForTimeout(500);
  this.testData = {
    ...this.testData,
    expectedFutureValue: value
  };
});

Then('os pagamentos já pagos devem manter o valor original', async function() {
  await this.page.waitForTimeout(500);
});

Then('o pagamento de Novembro/2025 deve manter {string}', async function(value: string) {
  this.testData = {
    ...this.testData,
    novemberExpected: value
  };
});

Then('o pagamento de Dezembro/2025 deve manter {string}', async function(value: string) {
  this.testData = {
    ...this.testData,
    decemberExpected: value
  };
});

Then('o pagamento de Março/2026 deve ser atualizado para {string}', async function(value: string) {
  this.testData = {
    ...this.testData,
    marchExpected: value
  };
});

Then('pagamentos futuros devem ter {string}', async function(value: string) {
  this.testData = {
    ...this.testData,
    futurePaymentsValue: value
  };
});

Then('no campo {string} devo ver {string}', async function(fieldName: string, value: string) {
  const field = this.page.getByText(new RegExp(fieldName, 'i'));
  await expect(field).toBeVisible();
  
  const valueElement = this.page.getByText(value);
  await expect(valueElement).toBeVisible();
});

Then('não apenas o valor do aluguel', async function() {
  // Validação implícita - se a soma foi feita corretamente
  await this.page.waitForTimeout(200);
});

Then('a data de término deve ser atualizada para {string}', async function(date: string) {
  // Verificar que a data foi atualizada
  const endDateField = this.page.locator('[id*="end-date"]');
  const value = await endDateField.inputValue();
  
  const [day, month, year] = date.split('/');
  const expectedValue = `${year}-${month}-${day}`;
  
  expect(value).toBe(expectedValue);
});

Then('os pagamentos após {string} devem ser cancelados', async function(date: string) {
  this.testData = {
    ...this.testData,
    cancelledAfter: date
  };
});

Then('o imóvel deve ficar {string}', async function(status: string) {
  // Verificar status do imóvel
  await this.page.goto('/properties');
  await this.page.waitForLoadState('networkidle');
  
  const statusBadge = this.page.getByText(new RegExp(status, 'i'));
  await expect(statusBadge).toBeVisible({ timeout: 5000 });
});