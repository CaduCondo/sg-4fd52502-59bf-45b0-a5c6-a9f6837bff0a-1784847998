import { createClient } from '@supabase/supabase-js';
import TEST_CONFIG from '../config/test.config';

/**
 * Helper de Banco de Dados
 * 
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

      console.log(`✅ Usuário de teste criado: ${userData.email}`);
      return user;
    } catch (error) {
      console.error('❌ Erro ao criar usuário de teste:', error);
      throw error;
    }
  }

  /**
   * Deletar usuário de teste
   */
  static async deleteTestUser(email: string) {
    try {
      // Buscar usuário pelo email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users.find(u => u.email === email);

      if (!user) {
        console.log(`⚠️ Usuário não encontrado: ${email}`);
        return;
      }

      // Deletar da tabela system_users
      await supabaseAdmin
        .from('system_users')
        .delete()
        .eq('id', user.id);

      // Deletar do Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      console.log(`✅ Usuário de teste deletado: ${email}`);
    } catch (error) {
      console.error('❌ Erro ao deletar usuário de teste:', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário existe
   */
  static async userExists(email: string): Promise<boolean> {
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      return users?.users.some(u => u.email === email) || false;
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error);
      return false;
    }
  }

  /**
   * Obter permissões de menu do usuário
   */
  static async getUserMenuPermissions(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('role_menu_permissions')
        .select('menu_id, can_view')
        .eq('user_id', userId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao obter permissões:', error);
      return [];
    }
  }

  /**
   * Criar locação de teste
   */
  static async createTestRental(rentalData: any) {
    try {
      const { data, error } = await supabaseAdmin
        .from('rentals')
        .insert(rentalData)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Locação de teste criada: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Erro ao criar locação de teste:', error);
      throw error;
    }
  }

  /**
   * Deletar locação de teste
   */
  static async deleteTestRental(rentalId: string) {
    try {
      await supabaseAdmin
        .from('rentals')
        .delete()
        .eq('id', rentalId);

      console.log(`✅ Locação de teste deletada: ${rentalId}`);
    } catch (error) {
      console.error('❌ Erro ao deletar locação de teste:', error);
      throw error;
    }
  }

  /**
   * Limpar todos os dados de teste
   */
  static async cleanupTestData() {
    try {
      // Deletar usuários de teste
      for (const userKey of Object.keys(TEST_CONFIG.users)) {
        if (userKey !== 'invalid') {
          const user = TEST_CONFIG.users[userKey as keyof typeof TEST_CONFIG.users];
          if ('email' in user) {
            await this.deleteTestUser(user.email);
          }
        }
      }

      console.log('✅ Limpeza de dados de teste concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza de dados:', error);
    }
  }
}

export default DatabaseHelper;