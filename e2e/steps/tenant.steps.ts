import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Steps para gerenciamento de inquilinos
 */

When('preencho o formulário do inquilino com:', async function(dataTable: any) {
  // Aguarda formulário estar visível
  await this.page.waitForSelector('form', { state: 'visible' });
  
  const data = dataTable.rowsHash();
  
  // Preenche cada campo do formulário
  for (const [field, value] of Object.entries(data)) {
    let selector = '';
    
    switch (field) {
      case 'Nome':
        selector = 'input[name="name"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'CPF':
        selector = 'input[name="cpf"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Email':
        selector = 'input[name="email"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Telefone':
        selector = 'input[name="phone"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Data Nasc.':
        selector = 'input[name="birth_date"]';
        await this.page.fill(selector, value as string);
        break;
    }
  }
  
  console.log('✓ Formulário do inquilino preenchido');
});

Then('o inquilino {string} deve aparecer na lista', async function(tenantName: string) {
  // Aguarda a lista de inquilinos carregar
  await this.page.waitForLoadState('networkidle');
  
  // Verifica se o inquilino aparece na lista
  const tenantCard = this.page.locator(`text=${tenantName}`).first();
  await expect(tenantCard).toBeVisible({ timeout: 10000 });
  
  console.log(`✓ Inquilino encontrado na lista: ${tenantName}`);
});

When('tento deletar o inquilino {string}', async function(tenantName: string) {
  // Encontra o card do inquilino
  const tenantCard = this.page.locator(`text=${tenantName}`).first();
  await tenantCard.scrollIntoViewIfNeeded();
  
  // Clica no botão de deletar (ícone de lixeira)
  const deleteButton = tenantCard.locator('..').locator('button[title="Deletar"]');
  await deleteButton.click();
  
  console.log(`✓ Iniciou deleção do inquilino: ${tenantName}`);
});

Then('o inquilino deve ser deletado com sucesso', async function() {
  // Aguarda mensagem de sucesso
  const successMessage = this.page.locator('text*=deletad').first();
  await expect(successMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Inquilino deletado com sucesso');
});

Then('devo ver erro indicando que o inquilino está vinculado a uma locação', async function() {
  // Aguarda mensagem de erro
  const errorMessage = this.page.locator('text*=vinculado').first();
  await expect(errorMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Erro exibido corretamente - inquilino vinculado');
});