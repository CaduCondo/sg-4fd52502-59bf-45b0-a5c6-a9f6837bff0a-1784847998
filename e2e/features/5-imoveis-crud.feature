# language: pt
Funcionalidade: CRUD de Imóveis
  Como um usuário autorizado
  Quero gerenciar imóveis
  Para manter o cadastro atualizado

  Contexto:
    Dado que fiz login como "admin"
    E estou na página "/properties"

  Cenário: Visualizar lista de imóveis
    Então devo ver a lista de imóveis
    E devo ver as colunas:
      | coluna       |
      | Código       |
      | Endereço     |
      | Localização  |
      | Área Útil    |
      | Valor Aluguel|
      | Status       |

  Cenário: Alternar visualização Grid/Lista
    Quando clico no botão de visualização em grid
    Então devo ver os imóveis em formato de cards
    Quando clico no botão de visualização em lista
    Então devo ver os imóveis em formato de tabela

  Cenário: Filtrar imóveis por busca
    Quando preencho o campo de busca com "Centro"
    Então devo ver apenas imóveis que contenham "Centro" no endereço ou localização

  Cenário: Filtrar imóveis por localização
    Quando seleciono a localização "São Paulo - Centro"
    Então devo ver apenas imóveis desta localização

  Cenário: Filtrar imóveis por status
    Quando seleciono o status "Disponível"
    Então devo ver apenas imóveis disponíveis
    Quando seleciono o status "Ocupado"
    Então devo ver apenas imóveis ocupados

  Cenário: Abrir formulário de novo imóvel
    Quando clico no botão "Novo Imóvel"
    Então devo ver o formulário de cadastro de imóvel
    E devo ver os campos obrigatórios:
      | campo              |
      | Código             |
      | Endereço           |
      | Localização        |
      | Área Útil (m²)     |
      | Valor do Aluguel   |

  Cenário: Validar campo obrigatório - Código
    Quando clico no botão "Novo Imóvel"
    E tento salvar sem preencher o código
    Então devo ver a mensagem "Campo obrigatório"

  Cenário: Validar campo obrigatório - Endereço
    Quando clico no botão "Novo Imóvel"
    E tento salvar sem preencher o endereço
    Então devo ver a mensagem "Campo obrigatório"

  Cenário: Criar imóvel com sucesso
    Quando clico no botão "Novo Imóvel"
    E preencho todos os campos obrigatórios:
      | campo            | valor                  |
      | Código           | IMO-001                |
      | Endereço         | Rua Teste, 123         |
      | Localização      | São Paulo - Centro     |
      | Área Útil        | 80                     |
      | Valor Aluguel    | 2500.00                |
    E clico em "Salvar"
    Então devo ver a mensagem de sucesso
    E o imóvel deve aparecer na lista

  Cenário: Editar imóvel existente
    Dado que existe um imóvel "IMO-001"
    Quando clico no botão de editar do imóvel "IMO-001"
    Então devo ver o formulário com os dados preenchidos
    Quando altero o valor do aluguel para "2800.00"
    E clico em "Salvar"
    Então devo ver a mensagem de sucesso
    E o valor deve estar atualizado na lista

  Cenário: Deletar imóvel - Cancelar
    Dado que existe um imóvel "IMO-001"
    Quando clico no botão de deletar do imóvel "IMO-001"
    Então devo ver o alerta de confirmação
    Quando clico em "Cancelar"
    Então o imóvel deve permanecer na lista

  Cenário: Deletar imóvel - Confirmar
    Dado que existe um imóvel "IMO-001"
    Quando clico no botão de deletar do imóvel "IMO-001"
    Então devo ver o alerta de confirmação
    Quando clico em "Confirmar"
    Então devo ver a mensagem de sucesso
    E o imóvel NÃO deve aparecer na lista