/**
 * Configuração de testes E2E
 * 
 * Centralize todas as credenciais e configurações aqui
 */

export const TEST_CONFIG = {
  // Base URL
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  
  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Para testes de API/DB
  },
  
  // Usuários de teste
  users: {
    admin: {
      email: 'admin@teste.com',
      password: 'Admin@123',
      role: 'admin',
      permissions: ['all']
    },
    financial: {
      email: 'financeiro@teste.com',
      password: 'Financeiro@123',
      role: 'financial',
      permissions: ['dashboard', 'financial']
    },
    management: {
      email: 'gestao@teste.com',
      password: 'Gestao@123',
      role: 'management',
      permissions: ['dashboard', 'properties', 'tenants', 'rentals', 'payments']
    },
    invalid: {
      email: 'invalido@teste.com',
      password: 'SenhaErrada123'
    }
  },
  
  // Timeouts
  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
    navigation: 30000
  }
};

export default TEST_CONFIG;