# Testes do Payment Service

Este diretório contém os testes unitários para o serviço de pagamentos (`paymentService.ts`).

## Executar os Testes

```bash
# Executar todos os testes
npm test

# Executar testes específicos
npm test paymentService

# Executar com cobertura
npm test -- --coverage

# Modo watch (re-executa ao salvar)
npm test -- --watch
```

## Estrutura dos Testes

### `paymentService.test.ts`

Cobre a função crítica `generateExpectedPayments` que calcula todos os recebimentos de uma locação.

**Cenários testados:**

1. **Vencimento Antecipado**
   - Dia início < dia vencimento (mesmo mês, proporcional)
   - Dia início > dia vencimento (mês seguinte, proporcional) - bug corrigido em 10/07/2026
   - Dia início = dia vencimento (mês seguinte, integral)

2. **Garagem**
   - Recebimentos proporcionais com garagem
   - Recebimentos integrais com garagem

3. **Cálculo de Dias**
   - Validação de contagem de dias proporcionais
   - Diferentes cenários de início e término

4. **Ajustes de Datas**
   - Meses sem o dia escolhido (31 em fevereiro)
   - Meses com 30 dias (31 em abril)

5. **Durações Variadas**
   - Contratos de 1 mês
   - Contratos de 12 meses
   - Contratos atravessando virada de ano

6. **Validações**
   - Estrutura completa dos recebimentos
   - Numeração sequencial de parcelas
   - Padding correto dos meses (01-12)

7. **Edge Cases**
   - Contratos muito curtos
   - Valores zerados
   - Início e fim no mesmo dia de vencimento

## Configuração

Se você ainda não tem Jest/Vitest configurado no projeto, adicione ao `package.json`:

```json
{
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "vitest": "^1.0.0"
  }
}
```

E crie o arquivo `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Cobertura Esperada

Os testes devem cobrir:
- ✅ Todos os cenários de vencimento (antes/depois/igual)
- ✅ Cálculos proporcionais corretos
- ✅ Ajustes de datas para meses especiais
- ✅ Contratos de diferentes durações
- ✅ Validação de estrutura dos dados
- ✅ Edge cases e valores extremos

## Manutenção

Ao modificar a lógica de geração de recebimentos em `paymentService.ts`:

1. ✅ Execute os testes existentes para garantir que nada quebrou
2. ✅ Adicione novos testes para cobrir novos cenários
3. ✅ Atualize este README se necessário

## Bugs Corrigidos

### 10/07/2026 - Vencimento Antecipado
**Problema:** Quando dia_inicio > dia_vencimento, o sistema criava o primeiro recebimento no mês errado.

**Exemplo:** 
- Início: 10/07/2026
- Vencimento: dia 5
- Bug: criava recebimento em julho (errado)
- Correção: cria recebimento em agosto (correto)

**Teste relacionado:** `Cenário 2: Dia início > dia vencimento (mês seguinte, proporcional) - BUG CORRIGIDO`