import { createClient } from '@supabase/supabase-js';
import TEST_CONFIG from '../config/test.config';

/**
 * Helper de Banco de Dados
 * 
 * Funções para manipular dados diretamente no banco (setup/teardown de testes)
 * IMPORTANTE: Rastreia todos os dados criados para cleanup seguro
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

// Rastreamento de dados criados durante os testes
interface TestDataTracker {
  users: string[]; // emails
  properties: string[]; // ids
  tenants: string[]; // ids
  rentals: string[]; // ids
  payments: string[]; // ids
}

const testDataTracker: TestDataTracker = {
  users: [],
  properties: [],
  tenants: [],
  rentals: [],
  payments: []
};

export class DatabaseHelper {
  /**
   * Registrar item criado para cleanup posterior
   */
  private static trackCreatedItem(type: keyof TestDataTracker, id: string) {
    if (!testDataTracker[type].includes(id)) {
      testDataTracker[type].push(id);
    }
  }

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

      // Rastrear para cleanup
      this.trackCreatedItem('users', userData.email);

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

      // Deletar da tabela system_users primeiro
      await supabaseAdmin
        .from('system_users')
        .delete()
        .eq('id', user.id);

      // Deletar do Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      console.log(`✅ Usuário de teste deletado: ${email}`);
    } catch (error) {
      console.error('❌ Erro ao deletar usuário de teste:', error);
      // NÃO propagar erro - continuar limpeza
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
   * Criar imóvel de teste
   */
  static async createTestProperty(propertyData: any) {
    try {
      const { data, error } = await supabaseAdmin
        .from('properties')
        .insert({
          ...propertyData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Rastrear para cleanup
      this.trackCreatedItem('properties', data.id);

      console.log(`✅ Imóvel de teste criado: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Erro ao criar imóvel de teste:', error);
      throw error;
    }
  }

  /**
   * Deletar imóvel de teste
   */
  static async deleteTestProperty(propertyId: string) {
    try {
      await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', propertyId);

      console.log(`✅ Imóvel de teste deletado: ${propertyId}`);
    } catch (error) {
      console.error('❌ Erro ao deletar imóvel de teste:', error);
    }
  }

  /**
   * Criar inquilino de teste
   */
  static async createTestTenant(tenantData: any) {
    try {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .insert({
          ...tenantData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Rastrear para cleanup
      this.trackCreatedItem('tenants', data.id);

      console.log(`✅ Inquilino de teste criado: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ Erro ao criar inquilino de teste:', error);
      throw error;
    }
  }

  /**
   * Deletar inquilino de teste
   */
  static async deleteTestTenant(tenantId: string) {
    try {
      await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      console.log(`✅ Inquilino de teste deletado: ${tenantId}`);
    } catch (error) {
      console.error('❌ Erro ao deletar inquilino de teste:', error);
    }
  }

  /**
   * Criar locação de teste
   */
  static async createTestRental(rentalData: any) {
    try {
      const { data, error } = await supabaseAdmin
        .from('rentals')
        .insert({
          ...rentalData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Rastrear para cleanup
      this.trackCreatedItem('rentals', data.id);

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
      // Deletar pagamentos relacionados primeiro
      await supabaseAdmin
        .from('payments')
        .delete()
        .eq('rental_id', rentalId);

      // Deletar locação
      await supabaseAdmin
        .from('rentals')
        .delete()
        .eq('id', rentalId);

      console.log(`✅ Locação de teste deletada: ${rentalId}`);
    } catch (error) {
      console.error('❌ Erro ao deletar locação de teste:', error);
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
   * Limpar TODOS os dados de teste rastreados
   * SEGURO: Só deleta o que foi criado durante os testes
   */
  static async cleanupAllTestData() {
    console.log('\n🧹 Iniciando limpeza de dados de teste...\n');

    try {
      // 1. Deletar locações (deve vir antes de imóveis/inquilinos devido a FKs)
      for (const rentalId of testDataTracker.rentals) {
        await this.deleteTestRental(rentalId);
      }

      // 2. Deletar inquilinos
      for (const tenantId of testDataTracker.tenants) {
        await this.deleteTestTenant(tenantId);
      }

      // 3. Deletar imóveis
      for (const propertyId of testDataTracker.properties) {
        await this.deleteTestProperty(propertyId);
      }

      // 4. Deletar usuários
      for (const userEmail of testDataTracker.users) {
        await this.deleteTestUser(userEmail);
      }

      // Limpar tracker
      testDataTracker.users = [];
      testDataTracker.properties = [];
      testDataTracker.tenants = [];
      testDataTracker.rentals = [];
      testDataTracker.payments = [];

      console.log('\n✅ Limpeza de dados de teste concluída com sucesso!\n');
    } catch (error) {
      console.error('\n❌ Erro na limpeza de dados de teste:', error, '\n');
    }
  }

  /**
   * Obter estatísticas de dados de teste criados
   */
  static getTestDataStats() {
    return {
      users: testDataTracker.users.length,
      properties: testDataTracker.properties.length,
      tenants: testDataTracker.tenants.length,
      rentals: testDataTracker.rentals.length,
      payments: testDataTracker.payments.length,
      total: Object.values(testDataTracker).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

export default DatabaseHelper;