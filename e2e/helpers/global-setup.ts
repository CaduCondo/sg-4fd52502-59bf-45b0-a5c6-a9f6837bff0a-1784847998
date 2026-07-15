/**
 * Global Setup - Executado UMA VEZ antes de TODOS os testes
 */
import DatabaseHelper from './database.helper';

async function globalSetup() {
  console.log('\n🚀 ===== INICIANDO SUITE DE TESTES E2E =====\n');
  console.log('📋 Preparando ambiente de testes...\n');

  // Você pode adicionar setup global aqui se necessário
  // Ex: criar dados seed, configurar serviços externos, etc.

  console.log('✅ Setup global concluído!\n');
}

export default globalSetup;