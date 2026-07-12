import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para limpeza de dados de teste
 * ATENÇÃO: Use apenas em ambiente de TESTE
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Necessita service role key
);

/**
 * Deleta todos os dados de teste criados
 * ATENÇÃO: USE APENAS EM AMBIENTE DE TESTE
 */
export async function cleanupTestData() {
  console.log('🧹 Iniciando limpeza de dados de teste...');
  
  try {
    // Deletar pagamentos de teste
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .like('rental_id', '%test%');
    
    if (paymentsError) console.error('Erro ao deletar pagamentos:', paymentsError);
    
    // Deletar locações de teste
    const { error: rentalsError } = await supabase
      .from('rentals')
      .delete()
      .like('property_id', '%test%');
    
    if (rentalsError) console.error('Erro ao deletar locações:', rentalsError);
    
    // Deletar imóveis de teste
    const { error: propertiesError } = await supabase
      .from('properties')
      .delete()
      .like('location', '%Rua das Flores%');
    
    if (propertiesError) console.error('Erro ao deletar propriedades:', propertiesError);
    
    // Deletar inquilinos de teste
    const { error: tenantsError } = await supabase
      .from('tenants')
      .delete()
      .like('name', '%João da Silva%');
    
    if (tenantsError) console.error('Erro ao deletar inquilinos:', tenantsError);
    
    console.log('✓ Limpeza de dados concluída');
  } catch (error) {
    console.error('❌ Erro durante limpeza de dados:', error);
  }
}

/**
 * Verifica se ambiente é de teste
 * Previne execução acidental em produção
 */
export function isTestEnvironment(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return url.includes('test') || url.includes('staging') || process.env.NODE_ENV === 'test';
}

/**
 * Executa limpeza com verificação de segurança
 */
export async function safeCleanup() {
  if (!isTestEnvironment()) {
    throw new Error('❌ ATENÇÃO: Tentativa de executar limpeza fora do ambiente de teste!');
  }
  
  await cleanupTestData();
}