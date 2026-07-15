/**
 * Configuração de testes E2E
 * 
 * Centraliza todas as credenciais e configurações aqui.
 * As variáveis de ambiente são carregadas do .env.local
 */

const TEST_CONFIG = {
  // URLs do Supabase (do .env.local)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },

  // URL base da aplicação
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',

  // Usuários de teste (ALTERE estas credenciais conforme seu ambiente)
  users: {
    admin: {
      email: 'admin@teste.com',
      password: 'Admin@123',
      name: 'Admin Teste',
      role: 'admin'
    },
    financial: {
      email: 'financeiro@teste.com',
      password: 'Financeiro@123',
      name: 'Financeiro Teste',
      role: 'financial'
    },
    management: {
      email: 'gestao@teste.com',
      password: 'Gestao@123',
      name: 'Gestão Teste',
      role: 'management'
    }
  },

  // Timeouts (em milissegundos)
  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
    navigation: 30000
  }
};

export default TEST_CONFIG;