# 🔧 Script de Correção de Valores de Pagamentos

## 📋 O que este script faz?

Corrige valores de pagamentos que foram calculados incorretamente devido ao uso de `expected_amount` em vez dos valores reais do contrato (`rent_value` e `garage_value`).

## 🎯 Problema Identificado

- **Valor esperado:** R$ 1.400,00 (valor do aluguel no contrato)
- **Valor incorreto:** R$ 1.450,00 (calculado proporcionalmente a partir do expected_amount)

## 🚀 Como executar

### 1. Instalar dependências

```bash
npm install --prefix . --package-lock-only @supabase/supabase-js dotenv
```

OU se preferir usar o package.json criado:

```bash
cp package-fix-rental.json package.json
npm install
```

### 2. Verificar variáveis de ambiente

Certifique-se de que o arquivo `.env.local` contém:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 3. Executar o script

```bash
node fix-rental-payments-values.js
```

## 📊 O que o script faz:

1. ✅ Busca o contrato com aluguel de R$ 1.400,00
2. ✅ Lista todos os pagamentos deste contrato
3. ✅ Para cada pagamento:
   - Verifica se o valor do aluguel está incorreto no breakdown
   - Reconstrói o breakdown com os valores corretos do contrato
   - Mantém multas e juros existentes
   - Recalcula o `expected_amount` correto
   - Atualiza no banco de dados
4. ✅ Exibe relatório final com estatísticas

## 📋 Exemplo de saída:

```
🔧 Iniciando correção de valores de pagamentos...

📋 Buscando contrato...
✅ Contrato encontrado: Thaynara da Silva Gomes
   Aluguel: R$ 1400.00
   Garagem: R$ 0.00
   ID: abc123...

💰 Buscando pagamentos do contrato...
✅ 12 pagamentos encontrados

🔧 Corrigindo Parcela 10/12:
   Valor atual no breakdown: R$ 1450.00
   Valor correto: R$ 1400.00
   Novo expected_amount: R$ 1623.28
   ✅ Corrigido com sucesso!

============================================================
📊 RELATÓRIO FINAL
============================================================
Total de pagamentos: 12
✅ Corrigidos: 10
⏭️  Pulados (já corretos): 2
❌ Erros: 0
============================================================

✨ Correção concluída com sucesso!
🔄 Recarregue a página para ver os valores atualizados.
```

## ⚠️ IMPORTANTE

- O script **NÃO modifica** pagamentos que já estão com valores corretos
- Mantém **multas e juros** existentes
- Atualiza o campo `updated_at` com o timestamp da correção
- É **seguro executar múltiplas vezes** (apenas corrige o que precisa)

## 🔍 Verificação após execução

1. Acesse a página de Recebimentos
2. Abra qualquer parcela do contrato da Thaynara
3. Verifique a seção "Formação de Valores"
4. Confirme que mostra: **"Valor mensal do aluguel - Parcela X/12: R$ 1.400,00"**

## 🆘 Suporte

Se encontrar algum erro, verifique:

1. ✅ Credenciais do Supabase no `.env.local`
2. ✅ Conexão com internet
3. ✅ Permissões de escrita no banco de dados
4. ✅ Node.js versão 18+ instalado