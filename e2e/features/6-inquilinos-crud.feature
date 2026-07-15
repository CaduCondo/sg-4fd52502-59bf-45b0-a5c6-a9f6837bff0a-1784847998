# language: pt
Funcionalidade: CRUD de Inquilinos
  Como um usuário autorizado
  Quero gerenciar inquilinos
  Para manter o cadastro atualizado

  Contexto:
    Dado que fiz login como "admin"
    E estou na página "/tenants"

  Cenário: Visualizar lista de inquilinos
    Então devo ver a lista de inquilinos
    E devo ver as colunas:
      | coluna    |
      | Nome      |
      | CPF/CNPJ  |
      | Telefone  |
      | E-mail    |

  Cenário: Filtrar inquilinos por busca
    Quando preencho o campo de busca com "João"
    Então devo ver apenas inquilinos que contenham "João" no nome

  Cenário: Filtrar inquilinos por tipo
    Quando seleciono o filtro "Pessoa Física"
    Então devo ver apenas inquilinos com CPF
    Quando seleciono o filtro "Pessoa Jurídica"
    Então devo ver apenas inquilinos com CNPJ

  Cenário: Abrir formulário de novo inquilino
    Quando clico no botão "Novo Inquilino"
    Então devo ver o formulário de cadastro de inquilino
    E devo ver o seletor de tipo "Pessoa Física / Pessoa Jurídica"

  Cenário: Validar máscara de CPF
    Quando clico no botão "Novo Inquilino"
    E seleciono "Pessoa Física"
    E preencho o CPF com "12345678900"
    Então o campo deve exibir "123.456.789-00"

  Cenário: Validar máscara de CNPJ
    Quando clico no botão "Novo Inquilino"
    E seleciono "Pessoa Jurídica"
    E preencho o CNPJ com "12345678000190"
    Então o campo deve exibir "12.345.678/0001-90"

  Cenário: Validar máscara de Telefone
    Quando clico no botão "Novo Inquilino"
    E preencho o telefone com "11987654321"
    Então o campo deve exibir "(11) 98765-4321"

  Cenário: Validar máscara de CEP
    Quando clico no botão "Novo Inquilino"
    E preencho o CEP com "01310100"
    Então o campo deve exibir "01310-100"

  Cenário: Buscar CEP automaticamente
    Quando clico no botão "Novo Inquilino"
    E preencho o CEP com "01310-100"
    E clico em "Buscar CEP"
    Então os campos de endereço devem ser preenchidos automaticamente

  Cenário: Criar inquilino Pessoa Física
    Quando clico no botão "Novo Inquilino"
    E seleciono "Pessoa Física"
    E preencho todos os campos obrigatórios:
      | campo     | valor                |
      | Nome      | João Silva           |
      | CPF       | 123.456.789-00       |
      | Telefone  | (11) 98765-4321      |
      | E-mail    | joao@email.com       |
    E clico em "Salvar"
    Então devo ver a mensagem de sucesso
    E o inquilino deve aparecer na lista

  Cenário: Criar inquilino Pessoa Jurídica
    Quando clico no botão "Novo Inquilino"
    E seleciono "Pessoa Jurídica"
    E preencho todos os campos obrigatórios:
      | campo         | valor                    |
      | Razão Social  | Empresa LTDA             |
      | CNPJ          | 12.345.678/0001-90       |
      | Telefone      | (11) 3333-4444           |
      | E-mail        | empresa@email.com        |
    E clico em "Salvar"
    Então devo ver a mensagem de sucesso
    E o inquilino deve aparecer na lista