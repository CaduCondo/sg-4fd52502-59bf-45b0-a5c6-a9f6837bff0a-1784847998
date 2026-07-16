import { createClient } from '@supabase/supabase-js';
import TEST_CONFIG from '../config/test.config';

/**
 * Helper de Banco de Dados
 * Funções para manipular dados diretamente no banco (setup/teardown de testes)
 */

// Cliente Supabase com Service Role Key (admin)
const supabaseAdmin = createClient(
  TEST_CONFIG.supabase.url,
  TEST_CONFIG.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Rastreamento de dados criados
const testDataTracker = {
  users: [] as string[],
  properties: [] as string[],
  tenants: [] as string[],
  rentals: [] as string[]
};

export class DatabaseHelper {
  /**
   * Criar usuário de teste
   */
  static async createTestUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    try {
      // Verificar se usuário já existe
      const exists = await this.userExists(userData.email);
      if (exists) {
        console.log(`⚠️ Usuário já existe: ${userData.email}`);
        return null;
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Criar registro na tabela system_users
      const { data: user, error: userError } = await supabaseAdmin
        .from('system_users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          username: userData.email.split('@')[0],
          role: userData.role,
          active: true
        })
        .select()
        .single();

      if (userError) throw userError;

      testDataTracker.users.push(userData.email);
      console.log(`✅ Usuário criado: ${userData.email}`);
      return user;
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return null;
    }
  }

  /**
   * Verificar se usuário existe
   */
  static async userExists(email: string): Promise<boolean> {
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers();
      return data?.users.some(u => u.email === email) || false;
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error);
      return false;
    }
  }

  /**
   * Deletar usuário de teste
   */
  static async deleteTestUser(email: string) {
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers();
      const user = data?.users.find(u => u.email === email);

      if (!user) {
        console.log(`⚠️ Usuário não encontrado: ${email}`);
        return;
      }

      await supabaseAdmin.from('system_users').delete().eq('id', user.id);
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      console.log(`✅ Usuário deletado: ${email}`);
    } catch (error) {
      console.error('❌ Erro ao deletar usuário:', error);
    }
  }

  /**
   * Limpar todos os dados de teste
   */
  static async cleanupAllTestData() {
    console.log('\n🧹 Limpando dados de teste...\n');

    for (const email of testDataTracker.users) {
      await this.deleteTestUser(email);
    }

    testDataTracker.users = [];
    testDataTracker.properties = [];
    testDataTracker.tenants = [];
    testDataTracker.rentals = [];

    console.log('✅ Limpeza concluída!\n');
  }
}

export default DatabaseHelper;