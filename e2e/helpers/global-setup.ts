import { chromium } from '@playwright/test';
import DatabaseHelper from './database.helper';
import TEST_CONFIG from '../config/test.config';

/**
 * Global Setup
 * Executado UMA VEZ antes de TODOS os testes
 * 
 * Aqui criamos usuários de teste automaticamente
 */
async function globalSetup() {
  console.log('\n🚀 Iniciando setup global dos testes...\n');

  try {
    // Criar usuário Admin de teste
    console.log('📝 Criando usuário Admin de teste...');
    await DatabaseHelper.createTestUser({
      email: TEST_CONFIG.users.admin.email,
      password: TEST_CONFIG.users.admin.password,
      name: 'Admin Teste',
      role: 'admin'
    });

    // Criar usuário Financeiro de teste
    console.log('📝 Criando usuário Financeiro de teste...');
    await DatabaseHelper.createTestUser({
      email: TEST_CONFIG.users.financial.email,
      password: TEST_CONFIG.users.financial.password,
      name: 'Financeiro Teste',
      role: 'financeiro'
    });

    // Criar usuário Gestão de teste
    console.log('📝 Criando usuário Gestão de teste...');
    await DatabaseHelper.createTestUser({
      email: TEST_CONFIG.users.management.email,
      password: TEST_CONFIG.users.management.password,
      name: 'Gestão Teste',
      role: 'gestao'
    });

    console.log('\n✅ Setup global concluído com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro no setup global:', error);
    // Não falhar os testes se usuários já existem
  }
}

export default globalSetup;