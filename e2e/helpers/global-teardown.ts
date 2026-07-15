/**
 * Global Teardown - Executado UMA VEZ após TODOS os testes
 */
import DatabaseHelper from './database.helper';

async function globalTeardown() {
  console.log('\n🧹 ===== FINALIZANDO SUITE DE TESTES E2E =====\n');
  
  // Mostrar estatísticas
  const stats = DatabaseHelper.getTestDataStats();
  console.log('📊 Dados de teste criados durante a execução:');
  console.log(`   - Usuários: ${stats.users}`);
  console.log(`   - Imóveis: ${stats.properties}`);
  console.log(`   - Inquilinos: ${stats.tenants}`);
  console.log(`   - Locações: ${stats.rentals}`);
  console.log(`   - Total: ${stats.total}\n`);

  // Limpar TODOS os dados de teste
  await DatabaseHelper.cleanupAllTestData();

  console.log('✅ Teardown global concluído!\n');
  console.log('🎉 ===== SUITE DE TESTES FINALIZADA =====\n');
}

export default globalTeardown;