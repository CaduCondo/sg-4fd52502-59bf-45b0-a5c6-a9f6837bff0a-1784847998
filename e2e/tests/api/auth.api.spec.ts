import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../helpers/api.helper';
import TEST_CONFIG from '../../config/test.config';

/**
 * Testes de API - Autenticação
 */

test.describe('API Tests - Authentication', () => {
  test('deve fazer login com credenciais válidas via API', async () => {
    const { email, password } = TEST_CONFIG.users.admin;
    const result = await ApiHelper.testLogin(email, password);

    expect(result.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.session).toBeDefined();
  });

  test('deve falhar com credenciais inválidas via API', async () => {
    const { email, password } = TEST_CONFIG.users.invalid;
    const result = await ApiHelper.testLogin(email, password);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('deve verificar health check da API', async () => {
    const result = await ApiHelper.testHealthCheck();

    expect(result.healthy).toBe(true);
  });
});