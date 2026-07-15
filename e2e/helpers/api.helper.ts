import { createClient } from '@supabase/supabase-js';
import TEST_CONFIG from '../config/test.config';

/**
 * Helper de API
 * 
 * Funções para testar endpoints da API Supabase
 */

const supabase = createClient(
  TEST_CONFIG.supabase.url,
  TEST_CONFIG.supabase.anonKey
);

export class ApiHelper {
  /**
   * Testar autenticação via API
   */
  static async testLogin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return {
        success: !error,
        data,
        error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error
      };
    }
  }

  /**
   * Testar busca de imóveis
   */
  static async testGetProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(10);

      return {
        success: !error,
        data,
        error,
        count: data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error,
        count: 0
      };
    }
  }

  /**
   * Testar busca de inquilinos
   */
  static async testGetTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .limit(10);

      return {
        success: !error,
        data,
        error,
        count: data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error,
        count: 0
      };
    }
  }

  /**
   * Testar busca de locações
   */
  static async testGetRentals() {
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .limit(10);

      return {
        success: !error,
        data,
        error,
        count: data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error,
        count: 0
      };
    }
  }

  /**
   * Testar busca de pagamentos
   */
  static async testGetPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .limit(10);

      return {
        success: !error,
        data,
        error,
        count: data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error,
        count: 0
      };
    }
  }

  /**
   * Testar health check da API
   */
  static async testHealthCheck() {
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('count')
        .limit(1)
        .single();

      return {
        success: !error,
        healthy: !error
      };
    } catch (error) {
      return {
        success: false,
        healthy: false
      };
    }
  }
}

export default ApiHelper;