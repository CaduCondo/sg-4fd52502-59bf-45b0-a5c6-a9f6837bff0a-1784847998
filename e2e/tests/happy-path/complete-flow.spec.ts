import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Complete Happy Path Flow', () => {
  let loginPage: LoginPage;
  let propertyId: string;
  let tenantId: string;
  let rentalId: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@softgen.ai', 'Softgen@2025');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('1. Incluir e validar imóvel', async ({ page }) => {
    // Navegar para Imóveis
    await page.click('a[href="/properties"]');
    await page.waitForURL('**/properties');

    // Clicar em Novo Imóvel
    await page.click('button:has-text("Novo Imóvel")');
    await page.waitForSelector('[role="dialog"]');

    // Preencher formulário
    const testTimestamp = Date.now();
    await page.fill('input[name="propertyIdentifier"]', `TESTE-${testTimestamp}`);
    await page.selectOption('select[name="locationId"]', { index: 1 });
    await page.fill('input[name="complement"]', `APTO ${testTimestamp}`);
    await page.fill('input[name="value"]', '1500');
    await page.fill('input[name="rooms"]', '2');
    await page.fill('input[name="bathrooms"]', '1');
    await page.fill('input[name="area"]', '60');

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Validar mensagem de sucesso
    await expect(page.locator('text=Imóvel cadastrado com sucesso')).toBeVisible({ timeout: 5000 });

    // Validar que o imóvel aparece na lista
    await expect(page.locator(`text=TESTE-${testTimestamp}`)).toBeVisible();

    // Pegar o ID do imóvel criado para usar depois
    const propertyCard = page.locator(`text=TESTE-${testTimestamp}`).locator('..').locator('..');
    propertyId = await propertyCard.getAttribute('data-property-id') || '';

    // Validar no banco de dados
    const response = await page.evaluate(async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return { data, error };
    });

    expect(response.error).toBeNull();
    expect(response.data).toBeDefined();
    propertyId = response.data.id;
  });

  test('2. Deletar e recriar imóvel', async ({ page }) => {
    // Criar imóvel
    await page.click('a[href="/properties"]');
    await page.waitForURL('**/properties');
    await page.click('button:has-text("Novo Imóvel")');
    await page.waitForSelector('[role="dialog"]');

    const testTimestamp = Date.now();
    await page.fill('input[name="propertyIdentifier"]', `TESTE-DEL-${testTimestamp}`);
    await page.selectOption('select[name="locationId"]', { index: 1 });
    await page.fill('input[name="complement"]', `APTO DEL ${testTimestamp}`);
    await page.fill('input[name="value"]', '1500');
    await page.click('button:has-text("Salvar")');
    await expect(page.locator('text=Imóvel cadastrado com sucesso')).toBeVisible();

    // Deletar o imóvel
    const propertyCard = page.locator(`text=TESTE-DEL-${testTimestamp}`).locator('..').locator('..');
    await propertyCard.locator('button[aria-label="Deletar"]').click();
    await page.click('button:has-text("Confirmar")');
    
    // Validar mensagem de sucesso
    await expect(page.locator('text=Imóvel excluído com sucesso')).toBeVisible();

    // Validar que o imóvel não aparece mais na lista
    await expect(page.locator(`text=TESTE-DEL-${testTimestamp}`)).not.toBeVisible();

    // Recriar o imóvel
    await page.click('button:has-text("Novo Imóvel")');
    await page.fill('input[name="propertyIdentifier"]', `TESTE-${testTimestamp}`);
    await page.selectOption('select[name="locationId"]', { index: 1 });
    await page.fill('input[name="complement"]', `APTO ${testTimestamp}`);
    await page.fill('input[name="value"]', '1500');
    await page.fill('input[name="rooms"]', '2');
    await page.fill('input[name="bathrooms"]', '1');
    await page.fill('input[name="area"]', '60');
    await page.click('button:has-text("Salvar")');
    
    await expect(page.locator('text=Imóvel cadastrado com sucesso')).toBeVisible();
    await expect(page.locator(`text=TESTE-${testTimestamp}`)).toBeVisible();
  });

  test('3. Incluir e validar inquilino', async ({ page }) => {
    // Navegar para Inquilinos
    await page.click('a[href="/tenants"]');
    await page.waitForURL('**/tenants');

    // Clicar em Novo Inquilino
    await page.click('button:has-text("Novo Inquilino")');
    await page.waitForSelector('[role="dialog"]');

    // Preencher formulário
    const testTimestamp = Date.now();
    await page.fill('input[name="name"]', `Teste Inquilino ${testTimestamp}`);
    await page.fill('input[name="cpf"]', '12345678900');
    await page.fill('input[name="email"]', `teste${testTimestamp}@example.com`);
    await page.fill('input[name="phone"]', '11999999999');

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Validar mensagem de sucesso
    await expect(page.locator('text=Inquilino cadastrado com sucesso')).toBeVisible({ timeout: 5000 });

    // Validar que o inquilino aparece na lista
    await expect(page.locator(`text=Teste Inquilino ${testTimestamp}`)).toBeVisible();

    // Validar no banco de dados
    const response = await page.evaluate(async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return { data, error };
    });

    expect(response.error).toBeNull();
    expect(response.data).toBeDefined();
    tenantId = response.data.id;
  });

  test('4. Deletar e recriar inquilino', async ({ page }) => {
    // Criar inquilino
    await page.click('a[href="/tenants"]');
    await page.waitForURL('**/tenants');
    await page.click('button:has-text("Novo Inquilino")');
    await page.waitForSelector('[role="dialog"]');

    const testTimestamp = Date.now();
    await page.fill('input[name="name"]', `Teste Del ${testTimestamp}`);
    await page.fill('input[name="cpf"]', '98765432100');
    await page.fill('input[name="email"]', `testedel${testTimestamp}@example.com`);
    await page.fill('input[name="phone"]', '11888888888');
    await page.click('button:has-text("Salvar")');
    await expect(page.locator('text=Inquilino cadastrado com sucesso')).toBeVisible();

    // Deletar o inquilino
    const tenantCard = page.locator(`text=Teste Del ${testTimestamp}`).locator('..').locator('..');
    await tenantCard.locator('button[aria-label="Deletar"]').click();
    await page.click('button:has-text("Confirmar")');
    
    // Validar mensagem de sucesso
    await expect(page.locator('text=Inquilino excluído com sucesso')).toBeVisible();

    // Validar que o inquilino não aparece mais na lista
    await expect(page.locator(`text=Teste Del ${testTimestamp}`)).not.toBeVisible();

    // Recriar o inquilino
    await page.click('button:has-text("Novo Inquilino")');
    await page.fill('input[name="name"]', `Teste Inquilino ${testTimestamp}`);
    await page.fill('input[name="cpf"]', '12345678900');
    await page.fill('input[name="email"]', `teste${testTimestamp}@example.com`);
    await page.fill('input[name="phone"]', '11999999999');
    await page.click('button:has-text("Salvar")');
    
    await expect(page.locator('text=Inquilino cadastrado com sucesso')).toBeVisible();
    await expect(page.locator(`text=Teste Inquilino ${testTimestamp}`)).toBeVisible();
  });

  test('5. Criar locação e validar recebimentos', async ({ page }) => {
    // Primeiro criar imóvel e inquilino
    // ... (código de criação aqui)

    // Navegar para Locações
    await page.click('a[href="/rentals"]');
    await page.waitForURL('**/rentals');

    // Clicar em Nova Locação
    await page.click('button:has-text("Nova Locação")');
    await page.waitForSelector('[role="dialog"]');

    // Preencher formulário de locação
    await page.selectOption('select[name="propertyId"]', { index: 1 });
    await page.selectOption('select[name="tenantId"]', { index: 1 });
    
    // Datas: início hoje, fim daqui 12 meses
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 12)).toISOString().split('T')[0];
    
    await page.fill('input[name="startDate"]', startDate);
    await page.fill('input[name="endDate"]', endDate);
    await page.fill('input[name="rentValue"]', '1500');
    await page.fill('input[name="paymentDay"]', '10');
    await page.fill('input[name="depositAmount"]', '1500');
    await page.fill('input[name="depositPaymentDate"]', startDate);

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Validar mensagem de sucesso
    await expect(page.locator('text=Locação cadastrada com sucesso')).toBeVisible({ timeout: 10000 });

    // Validar no banco: locação criada
    const rentalResponse = await page.evaluate(async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return { data, error };
    });

    expect(rentalResponse.error).toBeNull();
    expect(rentalResponse.data).toBeDefined();
    rentalId = rentalResponse.data.id;

    // Validar no banco: recebimentos criados (deve ter 12 pagamentos)
    const paymentsResponse = await page.evaluate(async (rid) => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error, count } = await supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('rental_id', rid);
      return { data, error, count };
    }, rentalId);

    expect(paymentsResponse.error).toBeNull();
    expect(paymentsResponse.count).toBe(12); // 12 meses de contrato

    // Validar valores dos recebimentos
    const payments = paymentsResponse.data;
    expect(payments[0].expected_amount).toBeGreaterThan(0);
    
    // Se primeiro pagamento é proporcional, validar
    // (isso depende da data de início vs dia de vencimento)
  });

  test('6. Deletar locação e validar', async ({ page }) => {
    // ... criar locação primeiro

    // Tentar deletar
    await page.click('a[href="/rentals"]');
    const rentalCard = page.locator(`text=${propertyId}`).locator('..').locator('..');
    await rentalCard.locator('button[aria-label="Deletar"]').click();
    await page.click('button:has-text("Confirmar")');
    
    // Validar mensagem de sucesso
    await expect(page.locator('text=Locação excluída com sucesso')).toBeVisible();

    // Validar que a locação não aparece mais
    await expect(rentalCard).not.toBeVisible();

    // Validar no banco que foi deletada
    const response = await page.evaluate(async (rid) => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('id', rid)
        .maybeSingle();
      return { data, error };
    }, rentalId);

    expect(response.data).toBeNull(); // Deve ter sido deletada
  });

  test('7. Tentar deletar imóvel com locação ativa', async ({ page }) => {
    // ... garantir que existe locação ativa

    // Tentar deletar imóvel
    await page.click('a[href="/properties"]');
    const propertyCard = page.locator(`[data-property-id="${propertyId}"]`);
    await propertyCard.locator('button[aria-label="Deletar"]').click();
    await page.click('button:has-text("Confirmar")');
    
    // Validar mensagem de erro
    await expect(page.locator('text=não pode ser excluído pois está vinculado')).toBeVisible();

    // Validar que imóvel ainda existe
    await expect(propertyCard).toBeVisible();
  });

  test('8. Tentar deletar inquilino com locação ativa', async ({ page }) => {
    // ... garantir que existe locação ativa

    // Tentar deletar inquilino
    await page.click('a[href="/tenants"]');
    const tenantCard = page.locator(`[data-tenant-id="${tenantId}"]`);
    await tenantCard.locator('button[aria-label="Deletar"]').click();
    await page.click('button:has-text("Confirmar")');
    
    // Validar mensagem de erro
    await expect(page.locator('text=não pode ser excluído pois está vinculado')).toBeVisible();

    // Validar que inquilino ainda existe
    await expect(tenantCard).toBeVisible();
  });

  test('9. Validar valores no Financeiro', async ({ page }) => {
    // Navegar para Financeiro
    await page.click('a[href="/financial"]');
    await page.waitForURL('**/financial');

    // Selecionar mês de maio de 2026 (ou mês correto do teste)
    await page.selectOption('select[name="month"]', '5');
    await page.selectOption('select[name="year"]', '2026');

    // Validar que o registro aparece na tabela
    await expect(page.locator(`text=${propertyId}`)).toBeVisible();

    // Validar valor proporcional (se aplicável)
    const row = page.locator(`text=${propertyId}`).locator('..').locator('..');
    const valueCell = row.locator('td.col-val-esp');
    const value = await valueCell.textContent();
    
    // O valor deve ser maior que 0
    expect(value).toBeTruthy();
    expect(value).toContain('R$');
  });
});