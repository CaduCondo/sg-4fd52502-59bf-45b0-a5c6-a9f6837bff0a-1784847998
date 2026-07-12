# language: pt
Funcionalidade: Fluxo Completo de Locação
  Como um administrador do sistema
  Eu quero criar uma locação completa
  Para gerenciar imóveis, inquilinos e recebimentos

  Contexto:
    Dado que estou autenticado no sistema
    E estou na página inicial

  Cenário: Criar imóvel, inquilino e locação com validação completa
    # PARTE 1: CRIAR IMÓVEL
    Quando eu acesso a tela "Propriedades"
    E clico no botão "Nova Propriedade"
    E preencho o formulário do imóvel com:
      | Campo          | Valor                    |
      | Tipo           | Residencial              |
      | Local          | Rua das Flores, 123      |
      | Complemento    | Apto 45, Bloco B         |
      | Bairro         | Centro                   |
      | Cidade         | São Paulo                |
      | Estado         | SP                       |
      | CEP            | 01234-567                |
      | Valor          | 2500,00                  |
    E clico em "Salvar"
    Então devo ver a mensagem "Propriedade criada com sucesso"
    E o imóvel "Rua das Flores, 123" deve aparecer na lista

    # PARTE 2: CRIAR INQUILINO
    Quando eu acesso a tela "Inquilinos"
    E clico no botão "Novo Inquilino"
    E preencho o formulário do inquilino com:
      | Campo          | Valor                    |
      | Nome           | João da Silva            |
      | CPF            | 123.456.789-00           |
      | Email          | joao@email.com           |
      | Telefone       | (11) 98765-4321          |
      | Data Nasc.     | 01/01/1990               |
    E clico em "Salvar"
    Então devo ver a mensagem "Inquilino criado com sucesso"
    E o inquilino "João da Silva" deve aparecer na lista

    # PARTE 3: TESTAR DELEÇÃO ANTES DA LOCAÇÃO (deve funcionar)
    Quando eu tento deletar o imóvel "Rua das Flores, 123"
    E confirmo a deleção
    Então o imóvel deve ser deletado com sucesso
    
    # Recriar o imóvel para continuar o teste
    Quando eu clico no botão "Nova Propriedade"
    E preencho o formulário do imóvel novamente
    E clico em "Salvar"
    
    # PARTE 4: CRIAR LOCAÇÃO
    Quando eu acesso a tela "Locações"
    E clico no botão "Nova Locação"
    E preencho o formulário da locação com:
      | Campo                  | Valor                |
      | Propriedade            | Rua das Flores, 123  |
      | Inquilino              | João da Silva        |
      | Data Início            | 01/07/2026           |
      | Data Fim               | 01/07/2027           |
      | Valor Aluguel          | 2500,00              |
      | Dia Vencimento         | 10                   |
      | Taxa Administração     | 10                   |
      | Valor Caução           | 2500,00              |
      | Parcelas Caução        | 5                    |
    E clico em "Salvar"
    Então devo ver a mensagem "Locação criada com sucesso"
    E a locação deve aparecer na lista

    # PARTE 5: VALIDAR PAGAMENTOS CRIADOS AUTOMATICAMENTE
    Quando eu abro a locação criada
    E visualizo o histórico de pagamentos
    Então devo ver 12 parcelas de aluguel criadas
    E cada parcela deve ter valor de R$ 2.500,00
    E a primeira parcela deve vencer em "10/07/2026"
    E a última parcela deve vencer em "10/06/2027"
    E devo ver 5 parcelas de caução criadas
    E cada parcela de caução deve ter valor de R$ 500,00

    # PARTE 6: TESTAR DELEÇÃO COM LOCAÇÃO ATIVA (deve falhar)
    Quando eu acesso a tela "Propriedades"
    E tento deletar o imóvel "Rua das Flores, 123"
    Então devo ver erro indicando que o imóvel está vinculado a uma locação
    
    Quando eu acesso a tela "Inquilinos"
    E tento deletar o inquilino "João da Silva"
    Então devo ver erro indicando que o inquilino está vinculado a uma locação

  Cenário: Realizar pagamentos e validar multas e juros
    Dado que existe uma locação ativa criada no cenário anterior
    
    # PAGAMENTO 1: Dentro do prazo (sem multa/juros)
    Quando eu acesso a tela "Pagamentos"
    E filtro pela locação "Rua das Flores, 123"
    E seleciono a parcela 1 com vencimento "10/07/2026"
    E clico em "Gerenciar Pagamento"
    E preencho o pagamento com:
      | Campo              | Valor      |
      | Data Pagamento     | 10/07/2026 |
      | Valor Pago         | 2500,00    |
    E clico em "Salvar"
    Então o pagamento deve ser registrado sem multa nem juros
    E o valor total deve ser R$ 2.500,00

    # PAGAMENTO 2: 5 dias de atraso (com multa e juros)
    Quando seleciono a parcela 2 com vencimento "10/08/2026"
    E clico em "Gerenciar Pagamento"
    E preencho o pagamento com:
      | Campo              | Valor      |
      | Data Pagamento     | 15/08/2026 |
      | Valor Pago         | 2537,50    |
    E clico em "Salvar"
    Então devo ver multa de 2% aplicada
    E devo ver juros de 0,033% ao dia aplicados
    E o valor total com multa e juros deve estar correto

    # PAGAMENTO 3: 30 dias de atraso (multa e juros maiores)
    Quando seleciono a parcela 3 com vencimento "10/09/2026"
    E clico em "Gerenciar Pagamento"
    E preencho o pagamento com:
      | Campo              | Valor      |
      | Data Pagamento     | 10/10/2026 |
      | Valor Pago         | 2574,75    |
    E clico em "Salvar"
    Então devo ver multa de 2% aplicada
    E devo ver juros de 0,033% ao dia por 30 dias aplicados
    E o valor total deve ser aproximadamente R$ 2.574,75

  Cenário: Validar tela Financeiro com dados da locação
    Dado que existem pagamentos realizados conforme cenário anterior
    
    Quando eu acesso a tela "Financeiro"
    E seleciono o período "Julho/2026"
    Então devo ver no card de receitas:
      | Campo                    | Valor Esperado |
      | Total Recebido           | R$ 2.500,00    |
      | Aluguel                  | R$ 2.500,00    |
      | Caução                   | R$ 0,00        |
      | Taxa Administração       | R$ 0,00        |

    Quando seleciono o período "Agosto/2026"
    Então devo ver no card de receitas:
      | Campo                    | Valor Esperado |
      | Total Recebido           | R$ 2.537,50    |
      | Aluguel                  | R$ 2.500,00    |
      | Multa                    | R$ 50,00       |
      | Juros                    | R$ 12,50       |

    Quando visualizo o gráfico de receitas
    Então devo ver a evolução mensal correta
    E os valores devem corresponder aos pagamentos realizados

  Cenário: Deletar tudo após testes (limpeza)
    Dado que todos os testes anteriores foram executados
    
    # DELETAR PAGAMENTOS
    Quando eu acesso a tela "Pagamentos"
    E filtro pela locação "Rua das Flores, 123"
    E deleto todos os pagamentos realizados
    Então não deve haver mais pagamentos para esta locação

    # DELETAR LOCAÇÃO
    Quando eu acesso a tela "Locações"
    E encontro a locação "Rua das Flores, 123 - João da Silva"
    E clico em "Encerrar Locação"
    E confirmo o encerramento
    Então a locação deve ser encerrada com sucesso

    # DELETAR IMÓVEL (agora deve funcionar)
    Quando eu acesso a tela "Propriedades"
    E tento deletar o imóvel "Rua das Flores, 123"
    E confirmo a deleção
    Então o imóvel deve ser deletado com sucesso
    E não deve mais aparecer na lista

    # DELETAR INQUILINO (agora deve funcionar)
    Quando eu acesso a tela "Inquilinos"
    E tento deletar o inquilino "João da Silva"
    E confirmo a deleção
    Então o inquilino deve ser deletado com sucesso
    E não deve mais aparecer na lista