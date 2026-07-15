# language: pt
Funcionalidade: Cálculos e Regras de Pagamentos
  Como um usuário autorizado
  Quero que os cálculos de pagamentos sejam precisos
  Para garantir a corretitude financeira

  Contexto:
    Dado que fiz login como "admin"
    E estou na página "/payments"

  Cenário: Calcular pagamento com taxa de administração 10%
    Dado que existe uma locação com aluguel de "2500.00"
    E a taxa de administração é "10%"
    Quando visualizo o detalhamento do pagamento
    Então devo ver:
      | campo                  | valor    |
      | Aluguel                | 2500.00  |
      | Taxa Administração     | 250.00   |
      | Valor Líquido (Repasse)| 2250.00  |

  Cenário: Calcular pagamento com garagem
    Dado que existe uma locação com:
      | campo          | valor   |
      | Aluguel        | 2500.00 |
      | Garagem        | 300.00  |
    E a taxa de administração é "10%"
    Quando visualizo o detalhamento do pagamento
    Então devo ver:
      | campo                  | valor    |
      | Aluguel                | 2500.00  |
      | Garagem                | 300.00   |
      | Total Bruto            | 2800.00  |
      | Taxa Administração     | 280.00   |
      | Valor Líquido          | 2520.00  |

  Cenário: Calcular pagamento com corretor parceiro 5%
    Dado que existe uma locação com:
      | campo           | valor   |
      | Aluguel         | 2500.00 |
      | Corretor (5%)   | sim     |
    E a taxa de administração é "10%"
    Quando visualizo o detalhamento do pagamento
    Então devo ver:
      | campo                  | valor    |
      | Aluguel                | 2500.00  |
      | Taxa Administração     | 250.00   |
      | Taxa Corretor (5%)     | 125.00   |
      | Valor Líquido          | 2125.00  |

  Cenário: Registrar pagamento como pago
    Dado que existe um pagamento pendente
    Quando marco o pagamento como "Pago"
    E preencho a data de pagamento
    E anexo o comprovante
    E clico em "Salvar"
    Então o status deve mudar para "Pago"
    E devo poder gerar o recibo

  Cenário: Gerar recibo de pagamento
    Dado que existe um pagamento "Pago"
    Quando clico em "Gerar Recibo"
    Então devo ver o PDF do recibo
    E o recibo deve conter:
      | informação          |
      | Nome do inquilino   |
      | Endereço do imóvel  |
      | Valor pago          |
      | Data de pagamento   |
      | Detalhamento        |

  Cenário: Cancelar pagamento - Confirmar
    Dado que existe um pagamento "Pendente"
    Quando clico em "Cancelar Pagamento"
    E confirmo o cancelamento
    Então o status deve mudar para "Cancelado"
    E não deve ser possível gerar recibo

  Cenário: Filtrar pagamentos por mês
    Quando seleciono o mês "Janeiro"
    Então devo ver apenas pagamentos de Janeiro

  Cenário: Filtrar pagamentos por ano
    Quando seleciono o ano "2026"
    Então devo ver apenas pagamentos de 2026

  Cenário: Filtrar pagamentos por status
    Quando seleciono o status "Pendente"
    Então devo ver apenas pagamentos pendentes
    Quando seleciono o status "Pago"
    Então devo ver apenas pagamentos pagos