# Testes Simples e Funcionais

Esta pasta contém testes E2E simples e pragmáticos que REALMENTE funcionam.

## Filosofia

- ✅ Testes simples que validam apenas pela UI
- ✅ Um teste de cada vez, incrementando aos poucos
- ✅ Sem tentar acessar banco de dados diretamente
- ✅ Sem complexidade desnecessária
- ✅ Começar humilde, validar que passa, então adicionar mais

## Como rodar

```bash
# Todos os testes simples
npx playwright test e2e/tests/simple/

# Teste específico
npx playwright test e2e/tests/simple/01-login.spec.ts

# Com interface visual
npx playwright test e2e/tests/simple/ --ui

# Debug (passo a passo)
npx playwright test e2e/tests/simple/01-login.spec.ts --debug
```

## Ordem dos testes

1. **01-login.spec.ts** - Login básico (fundação)
2. **02-criar-imovel.spec.ts** - Criar imóvel e validar na UI
3. **03-criar-inquilino.spec.ts** - Criar inquilino e validar na UI

## Próximos passos (após esses 3 passarem)

4. Criar locação simples
5. Validar dados na página Financeiro
6. Deletar entidades (validar mensagens de erro quando vinculadas)

## Regras

- Cada teste é independente
- Cada teste faz login novamente (sem depender de estado)
- Validações apenas pelo que aparece na tela
- Timeouts generosos para evitar flakiness
- Console.log para debug quando necessário