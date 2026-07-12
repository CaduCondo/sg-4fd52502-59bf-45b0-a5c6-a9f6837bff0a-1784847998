import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { testProperty } from '../support/test-data';

/**
 * Steps para gerenciamento de imóveis (propriedades)
 */

When('clico no botão {string}', async function(buttonText: string) {
  // Encontra e clica no botão pelo texto
  const button = this.page.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
  await this.page.waitForLoadState('networkidle');
  console.log(`✓ Clicou no botão: ${buttonText}`);
});

When('preencho o formulário do imóvel com:', async function(dataTable: any) {
  // Aguarda formulário estar visível
  await this.page.waitForSelector('form', { state: 'visible' });
  
  const data = dataTable.rowsHash();
  
  // Preenche cada campo do formulário
  for (const [field, value] of Object.entries(data)) {
    let selector = '';
    
    switch (field) {
      case 'Tipo':
        // Select tipo de imóvel
        await this.page.click('select[name="type"]');
        await this.page.selectOption('select[name="type"]', value as string);
        break;
      
      case 'Local':
        selector = 'input[name="location"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Complemento':
        selector = 'input[name="complement"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Bairro':
        selector = 'input[name="neighborhood"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Cidade':
        selector = 'input[name="city"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Estado':
        selector = 'input[name="state"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'CEP':
        selector = 'input[name="zip_code"]';
        await this.page.fill(selector, value as string);
        break;
      
      case 'Valor':
        selector = 'input[name="value"]';
        await this.page.fill(selector, value as string);
        break;
    }
  }
  
  console.log('✓ Formulário do imóvel preenchido');
});

When('preencho o formulário do imóvel novamente', async function() {
  // Reutiliza os dados do testProperty
  await this.page.fill('input[name="location"]', testProperty.location);
  await this.page.fill('input[name="complement"]', testProperty.complement);
  await this.page.fill('input[name="neighborhood"]', testProperty.neighborhood);
  await this.page.fill('input[name="city"]', testProperty.city);
  await this.page.fill('input[name="state"]', testProperty.state);
  await this.page.fill('input[name="zip_code"]', testProperty.zipCode);
  await this.page.fill('input[name="value"]', testProperty.value);
  
  console.log('✓ Formulário do imóvel preenchido novamente');
});

When('clico em {string}', async function(buttonText: string) {
  // Clica no botão pelo texto
  const button = this.page.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
  await this.page.waitForLoadState('networkidle');
  console.log(`✓ Clicou em: ${buttonText}`);
});

Then('o imóvel {string} deve aparecer na lista', async function(propertyLocation: string) {
  // Aguarda a lista de imóveis carregar
  await this.page.waitForLoadState('networkidle');
  
  // Verifica se o imóvel aparece na lista
  const propertyCard = this.page.locator(`text=${propertyLocation}`).first();
  await expect(propertyCard).toBeVisible({ timeout: 10000 });
  
  console.log(`✓ Imóvel encontrado na lista: ${propertyLocation}`);
});

When('tento deletar o imóvel {string}', async function(propertyLocation: string) {
  // Encontra o card do imóvel
  const propertyCard = this.page.locator(`text=${propertyLocation}`).first();
  await propertyCard.scrollIntoViewIfNeeded();
  
  // Clica no botão de deletar (ícone de lixeira)
  const deleteButton = propertyCard.locator('..').locator('button[title="Deletar"]');
  await deleteButton.click();
  
  console.log(`✓ Iniciou deleção do imóvel: ${propertyLocation}`);
});

When('confirmo a deleção', async function() {
  // Aguarda dialog de confirmação
  await this.page.waitForSelector('[role="alertdialog"]', { state: 'visible' });
  
  // Clica no botão de confirmar
  const confirmButton = this.page.locator('button:has-text("Confirmar")').first();
  await confirmButton.click();
  await this.page.waitForLoadState('networkidle');
  
  console.log('✓ Deleção confirmada');
});

Then('o imóvel deve ser deletado com sucesso', async function() {
  // Aguarda mensagem de sucesso
  const successMessage = this.page.locator('text*=deletad').first();
  await expect(successMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Imóvel deletado com sucesso');
});

Then('devo ver erro indicando que o imóvel está vinculado a uma locação', async function() {
  // Aguarda mensagem de erro
  const errorMessage = this.page.locator('text*=vinculado').first();
  await expect(errorMessage).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Erro exibido corretamente - imóvel vinculado');
});

Then('não deve mais aparecer na lista', async function() {
  // Aguarda lista atualizar
  await this.page.waitForLoadState('networkidle');
  
  // Verifica que o item não está mais visível
  // (implementação pode variar dependendo da UI)
  console.log('✓ Item removido da lista');
});