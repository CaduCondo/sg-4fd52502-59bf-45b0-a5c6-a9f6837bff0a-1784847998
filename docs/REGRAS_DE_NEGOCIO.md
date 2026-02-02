# 📋 Documentação de Regras de Negócio - Sistema de Gestão de Locações

## 📑 Índice

1. [Dashboard](#dashboard)
2. [Imóveis](#imóveis)
3. [Inquilinos](#inquilinos)
4. [Locações](#locações)
5. [Pagamentos](#pagamentos)
6. [Financeiro](#financeiro)
7. [Configurações](#configurações)
8. [Sistema de Permissões](#sistema-de-permissões)

---

## 🏠 Dashboard

### Objetivo
Página inicial que apresenta visão geral consolidada do negócio com métricas em tempo real.

### Regras de Negócio

#### 1. Seletor de Período
- **Padrão**: Mês/ano atual
- **Funcionalidade**: Filtrar dados exibidos no dashboard
- **Componentes afetados**: Todos os cards e gráficos

#### 2. Cards de Visão Geral dos Imóveis

**2.1 Total de Imóveis**
- Conta todos os imóveis cadastrados no sistema
- Não considera status (ativo/inativo)

**2.2 Imóveis Disponíveis**
- Imóveis sem locação ativa
- Cálculo: Total de imóveis - Imóveis com locação ativa

**2.3 Imóveis Alugados**
- Imóveis com pelo menos uma locação ativa
- Status da locação: `is_active = true`

**2.4 Taxa de Ocupação**
- Fórmula: `(Imóveis Alugados / Total de Imóveis) × 100`
- Exibição: Percentual com 1 casa decimal
- Indicador visual: Progress bar

#### 3. Cards de Contratos e Pagamentos

**3.1 Contratos Ativos**
- Locações com status `is_active = true`
- Conta apenas locações vigentes

**3.2 Contratos a Vencer (30 dias)**
- Locações ativas com `end_date` entre hoje e hoje + 30 dias
- Alerta para renovações necessárias

**3.3 Total de Inquilinos**
- Conta todos os inquilinos cadastrados
- Não considera status

**3.4 Taxa de Inadimplência**
- Fórmula: `(Pagamentos Atrasados / Total de Pagamentos do Período) × 100`
- Considera apenas pagamentos do período selecionado
- Status considerado: `overdue`

#### 4. Cards de Resumo Financeiro

**4.1 Total em Atraso**
- Soma de `expected_amount` de todos os pagamentos com status `overdue`
- Período: Todo o histórico (não filtrado por mês/ano)

**4.2 Receita Esperada**
- Soma de `expected_amount` de todos os pagamentos do período selecionado
- Inclui todos os status: pending, paid, overdue, partial

**4.3 Receita Bruta**
- Soma de `paid_amount` de pagamentos com status `paid` ou `partial`
- Período filtrado por mês/ano selecionado

**4.4 Taxas e Contas**
- Soma de:
  - Taxa de Administração: `(Receita Bruta × percentual_taxa_admin) / 100`
  - Taxa de Gerenciamento: `(Receita Bruta × percentual_taxa_gerenciamento) / 100`
  - Despesas de Locais: Soma de `amount` da tabela `location_expenses`
- **Exceção**: Imóveis com isenção de taxa não entram no cálculo

**4.5 Receita Líquida**
- Fórmula: `Receita Bruta - Taxas e Contas`
- Valor final após todas as deduções

#### 5. Gráficos Analíticos

**5.1 Gráfico de Ocupação Mensal**
- Eixo X: Meses do ano selecionado
- Eixo Y: Percentual de ocupação (0-100%)
- Cálculo mensal: `(Locações ativas no mês / Total de imóveis) × 100`

**5.2 Gráfico de Receita Mensal**
- Eixo X: Meses do ano selecionado
- Eixo Y: Valor em R$
- Série 1 (Azul): Receita esperada
- Série 2 (Verde): Receita recebida
- Dados: Agrupados por `reference_month` e `reference_year`

---

## 🏢 Imóveis

### Objetivo
Gerenciar cadastro completo de imóveis disponíveis para locação.

### Regras de Negócio

#### 1. Cadastro de Imóveis

**1.1 Campos Obrigatórios**
- Local (location_id) - FK para tabela `locations`
- Complemento (complement) - Ex: Casa 1, Apto 201
- Tipo (type): `house`, `apartment`, `commercial`, `land`, `room`
- Área em m² (area)
- Quartos (bedrooms)
- Banheiros (bathrooms)
- Valor de Aluguel (rentalPrice)

**1.2 Campos Opcionais**
- Tem Garagem (hasGarage)
- Valor da Garagem (garageValue) - Obrigatório se `hasGarage = true`
- Descrição (description)
- Imagens (images) - Array de URLs
- Disponibilidade (availability): `available`, `rented`, `maintenance`
- Data de Cadastro (createdAt) - Preenchido automaticamente

**1.3 Validações**
- `rentalPrice` deve ser > 0
- Se `hasGarage = true`, então `garageValue` é obrigatório e > 0
- `area` deve ser > 0
- `bedrooms` e `bathrooms` devem ser >= 0
- Pelo menos 1 imagem é recomendada (não obrigatória)

#### 2. Upload de Imagens

**2.1 Formatos Aceitos**
- JPG, JPEG, PNG, WEBP
- Tamanho máximo: 5MB por imagem
- Máximo de 10 imagens por imóvel

**2.2 Armazenamento**
- Pasta: `/uploads/`
- Nome do arquivo: `image_[uuid].[extensão]`
- Salvo em `public/uploads/` no servidor

**2.3 Visualização**
- Lightbox para visualizar imagens em tela cheia
- Navegação entre imagens (anterior/próximo)
- Download de imagens individual

#### 3. Filtros de Busca

**3.1 Filtros Disponíveis**
- Busca textual (location + complement)
- Local (dropdown com todos os locais)
- Tipo de imóvel (dropdown)
- Status de disponibilidade (dropdown)
- Faixa de preço (min/max)
- Número de quartos (min/max)

**3.2 Aplicação de Filtros**
- Filtros são cumulativos (AND lógico)
- Busca textual usa LIKE case-insensitive
- Filtros monetários incluem valor da garagem quando aplicável

#### 4. Alteração de Disponibilidade

**4.1 Status Permitidos**
- `available`: Disponível para locação
- `rented`: Alugado (atualizado automaticamente ao criar locação)
- `maintenance`: Em manutenção

**4.2 Mudança Automática**
- Ao criar locação ativa → `availability = 'rented'`
- Ao encerrar locação → `availability = 'available'`

**4.3 Mudança Manual**
- Admin pode alterar status manualmente
- Não altera locações existentes

#### 5. Exclusão de Imóveis

**5.1 Validação**
- ❌ Não permitir se houver locação ativa
- ✅ Permitir se todas as locações estiverem encerradas

**5.2 Cascata**
- Ao excluir imóvel:
  - Deletar locações antigas (se permitido)
  - Deletar imagens associadas do servidor

---

## 👥 Inquilinos

### Objetivo
Gerenciar cadastro de inquilinos (pessoas físicas ou jurídicas) que podem alugar imóveis.

### Regras de Negócio

#### 1. Cadastro de Inquilinos

**1.1 Campos Obrigatórios**
- Nome (name)
- Email (email)
- Telefone (phone)
- Tipo de Documento (documentType): `cpf` ou `cnpj`
- Número do Documento (documentNumber) - Formatado com máscara

**1.2 Campos Opcionais**
- Observações (notes)
- Status (status) - Padrão: `active`

**1.3 Validações**
- Email deve ser válido (formato)
- Telefone: Formato brasileiro (XX) XXXXX-XXXX
- CPF: 11 dígitos com validação de dígitos verificadores
- CNPJ: 14 dígitos com validação de dígitos verificadores
- Email e documento devem ser únicos no sistema

#### 2. Status do Inquilino

**2.1 Status Disponíveis**
- `active`: Ativo (sem locação)
- `renter`: Locatário (com locação ativa)
- `inactive`: Inativo

**2.2 Mudança Automática**
- Ao criar locação ativa → `status = 'renter'`
- Ao encerrar locação → `status = 'active'`

**2.3 Preservação de Status**
- Ao editar inquilino, o status original é preservado
- Status só muda por ações de locação ou manualmente pelo admin

#### 3. Filtros de Busca

**3.1 Filtros Disponíveis**
- Busca textual (nome + email + telefone + documento)
- Status (dropdown): Todos, Ativo, Locatário, Inativo

**3.2 Aplicação**
- Case-insensitive
- Busca parcial (LIKE)

#### 4. Exclusão de Inquilinos

**4.1 Validação**
- ❌ Não permitir se houver locação ativa
- ✅ Permitir se todas as locações estiverem encerradas

**4.2 Cascata**
- Ao excluir inquilino:
  - Deletar locações antigas (se permitido)
  - Deletar pagamentos associados

---

## 🔑 Locações

### Objetivo
Gerenciar contratos de locação entre imóveis e inquilinos.

### Regras de Negócio

#### 1. Criação de Locação

**1.1 Campos Obrigatórios**
- Imóvel (propertyId) - FK para `properties`
- Inquilino (tenantId) - FK para `tenants`
- Data de Início (startDate)
- Data de Término (endDate)
- Valor de Aluguel (monthlyRent)
- Dia de Vencimento (dueDay) - 1 a 31
- Forma de Pagamento (paymentMethod): `pix`, `bank_transfer`, `credit_card`, `debit_card`, `cash`

**1.2 Campos Opcionais**
- Tem Garagem (hasGarage)
- Valor da Garagem (garageValue) - Obrigatório se `hasGarage = true`
- Código PIX (pixCode)
- Valor do Caução (securityDeposit)
- Número de Parcelas do Caução (depositInstallments) - Padrão: 1
- Corretor Parceiro (hasPartnerBroker)
- Valor Comissão Corretor Parceiro (partnerBrokerCommission)
- Valor Comissão Corretor Interno (internalBrokerCommission)
- Contrato PDF (contract)
- Observações (notes)

**1.3 Validações**
- `startDate` < `endDate`
- `startDate` não pode ser no passado (ao criar nova locação)
- `monthlyRent` > 0
- Se `hasGarage = true`, então `garageValue` > 0
- `dueDay` entre 1 e 31
- Imóvel não pode ter locação ativa simultânea
- Inquilino não pode ter locação ativa simultânea
- `securityDeposit` >= 0
- `depositInstallments` >= 1 e <= 12

#### 2. Geração Automática de Pagamentos

**2.1 Trigger de Criação**
- Ao criar ou ativar locação, gerar parcelas automaticamente
- Uma parcela por mês entre `startDate` e `endDate`

**2.2 Cálculo de Parcelas**
```
totalMeses = diferença em meses entre startDate e endDate + 1
valorEsperado = monthlyRent + (hasGarage ? garageValue : 0)

Para cada mês do contrato:
  criar payment com:
    - rental_id
    - reference_month = mês atual
    - reference_year = ano atual
    - due_date = dia do vencimento (dueDay) do mês
    - expected_amount = valorEsperado
    - status = 'pending'
    - payment_method = método escolhido na locação
```

**2.3 Atualização de Pagamentos**
- Ao editar locação:
  - **Se datas mudarem**: Recalcular parcelas (deletar antigas + criar novas)
  - **Se valores mudarem**: Atualizar `expected_amount` nas parcelas pendentes
  - **Se método de pagamento mudar**: Atualizar `payment_method` em todas as parcelas

#### 3. Caução e Parcelamento

**3.1 Valor do Caução**
- Valor opcional definido na criação da locação
- Pode ser parcelado em até 12x

**3.2 Geração de Parcelas do Caução**
```
Se securityDeposit > 0 e depositInstallments > 0:
  valorParcela = securityDeposit / depositInstallments
  
  Para cada parcela (1 até depositInstallments):
    criar deposit_installment com:
      - rental_id
      - installment_number = parcela atual
      - total_installments = depositInstallments
      - installment_total = securityDeposit
      - amount = valorParcela
      - payment_date = startDate + (parcela - 1) meses
      - partner_commission = partnerBrokerCommission (se hasPartnerBroker)
      - internal_commission = internalBrokerCommission
```

**3.3 Comissões**
- Comissões são cadastradas uma única vez no primeiro registro de caução
- Valores aplicam-se ao valor total do caução, não por parcela

#### 4. Status da Locação

**4.1 Status Disponíveis**
- `is_active = true`: Locação ativa
- `is_active = false`: Locação encerrada

**4.2 Mudança de Status**
- Padrão ao criar: `is_active = true`
- Encerrar manualmente: Admin altera para `false`
- **Efeitos ao encerrar**:
  - Imóvel volta para `availability = 'available'`
  - Inquilino volta para `status = 'active'`
  - Pagamentos pendentes permanecem (não são deletados)

#### 5. Upload de Contrato

**5.1 Formato Aceito**
- Apenas PDF
- Tamanho máximo: 10MB

**5.2 Armazenamento**
- Pasta: `/uploads/`
- Nome: `rental_[uuid].pdf`

**5.3 Download**
- Link direto para download
- Disponível na página de detalhes da locação

#### 6. Edição de Locação

**6.1 Campos Editáveis**
- Todos os campos exceto `propertyId` e `tenantId`
- Imóvel e inquilino não podem ser alterados (restrição de integridade)

**6.2 Recálculo de Pagamentos**
- Se `startDate` ou `endDate` mudarem:
  - Deletar pagamentos futuros (status `pending`)
  - Recriar pagamentos com novas datas
- Se `monthlyRent` ou `garageValue` mudarem:
  - Atualizar `expected_amount` em pagamentos pendentes

#### 7. Exclusão de Locação

**7.1 Validação**
- ✅ Sempre permitido
- **Cascata**: Deletar pagamentos associados

**7.2 Efeitos**
- Imóvel: `availability = 'available'`
- Inquilino: `status = 'active'`

---

## 💰 Pagamentos

### Objetivo
Gerenciar recebimento de parcelas de aluguel das locações ativas.

### Regras de Negócio

#### 1. Estrutura de Pagamentos

**1.1 Campos do Pagamento**
- ID único (id)
- Locação (rentalId) - FK
- Mês de Referência (referenceMonth) - 1 a 12
- Ano de Referência (referenceYear)
- Data de Vencimento (dueDate)
- Valor Esperado (expectedAmount)
- Valor Pago (paidAmount) - Pode ser diferente do esperado
- Data de Pagamento (paymentDate)
- Status (status): `pending`, `paid`, `overdue`, `partial`
- Método de Pagamento (paymentMethod)
- Código PIX (paymentCode)
- Comprovante (receipt) - Upload de imagem/PDF

**1.2 Geração Automática**
- Criados automaticamente ao criar/editar locação
- Uma parcela por mês do contrato

#### 2. Status do Pagamento

**2.1 Lógica de Status**
```
SE paidAmount >= expectedAmount:
  status = 'paid'
SENÃO SE paidAmount > 0:
  status = 'partial'
SENÃO SE data atual > dueDate:
  status = 'overdue'
SENÃO:
  status = 'pending'
```

**2.2 Atualização Automática**
- Status recalculado sempre que `paidAmount` ou `dueDate` mudarem
- Job diário pode atualizar status de `pending` para `overdue`

#### 3. Gerenciamento de Pagamentos

**3.1 Marcar como Pago**
- Definir `paidAmount` = `expectedAmount`
- Definir `paymentDate` = data atual
- Atualizar `status` = `paid`

**3.2 Registrar Pagamento Parcial**
- Definir `paidAmount` com valor < `expectedAmount`
- Definir `paymentDate` = data do pagamento
- Atualizar `status` = `partial`

**3.3 Alterar Valor Pago**
- Permitir edição de `paidAmount`
- Recalcular status automaticamente

**3.4 Upload de Comprovante**
- Formatos: JPG, PNG, PDF
- Tamanho máximo: 5MB
- Armazenamento: `/uploads/payment_[uuid].[ext]`

#### 4. Filtros de Pagamentos

**4.1 Filtros Disponíveis**
- Mês/Ano de Referência (padrão: mês atual)
- Status (todos, pago, pendente, atrasado, parcial)
- Locação específica
- Imóvel
- Inquilino

**4.2 Ordenação**
- Data de vencimento (crescente/decrescente)
- Valor esperado
- Status

#### 5. Impressão de Recibo

**5.1 Dados do Recibo**
- Dados do imóvel (local + complemento)
- Dados do inquilino (nome, CPF/CNPJ)
- Período de referência
- Valor pago
- Data de pagamento
- Método de pagamento
- Observações (se houver)

**5.2 Geração**
- Componente React com dados formatados
- Função `window.print()` para impressão

#### 6. Edição de Código PIX

**6.1 Funcionalidade**
- Editar código PIX diretamente na linha da tabela
- Botão de edição (lápis) → Campo de input → Salvar/Cancelar

**6.2 Validação**
- Permitir qualquer string alfanumérica
- Salvar na tabela `payments` → campo `payment_code`

---

## 📊 Financeiro

### Objetivo
Apresentar relatórios financeiros consolidados com foco em receitas, despesas e análise de cauções.

### Regras de Negócio

#### 1. Abas do Financeiro

**1.1 Aba "Detalhamento de Locações"**
- Padrão ao abrir a página
- Exibe KPIs e tabela de pagamentos

**1.2 Aba "Detalhamento de Cauções"**
- Disponível apenas para Admin
- Exibe KPIs e tabela de parcelas de caução

#### 2. KPIs de Locações

**2.1 Receita Bruta**
- Soma de `paid_amount` dos pagamentos com status `paid` ou `partial`
- Filtrado por mês/ano selecionado

**2.2 Taxa de Administração**
- Fórmula: `Receita Bruta × (percentual_taxa_admin / 100)`
- Percentual configurável em `config` (padrão: 5%)
- **Exceção**: Imóveis com isenção de taxa (`user_fee_exemptions`)

**2.3 Taxa de Gerenciamento**
- Fórmula: `Receita Bruta × (percentual_taxa_gerenciamento / 100)`
- Percentual configurável em `config` (padrão: 3%)
- **Exceção**: Imóveis com isenção de taxa

**2.4 Contas do Mês**
- Soma de `amount` da tabela `location_expenses`
- Filtrado por `reference_month` e `reference_year`
- Tipos de despesas: água, luz, internet, manutenção, etc.

**2.5 Receita Líquida**
- Fórmula: `Receita Bruta - Taxa Admin - Taxa Gerenciamento - Contas do Mês`
- Valor final disponível

#### 3. Tabela de Detalhamento de Locações

**3.1 Colunas**
- Parcela (ex: 1/12)
- Local
- Complemento
- Inquilino
- Ano
- Mês
- Status (badge colorido)
- Data de Vencimento
- Data Recebida
- Valor Esperado
- Valor Pago (destaque verde)
- Código PIX (editável)

**3.2 Linha de Totais**
- Última linha da tabela
- Soma de `expected_amount` (Totais)
- Soma de `paid_amount` (Totais)
- Fundo cinza com negrito

**3.3 Ordenação**
- Clique no cabeçalho da coluna para ordenar
- Ícones: ↕️ (neutro), ↑ (crescente), ↓ (decrescente)
- Suporta ordenação por múltiplas colunas

**3.4 Exportação para Excel**
- Botão "Exportar Excel"
- Formato: `Financeiro_[Mês]_[Ano].xlsx`
- Inclui todas as colunas visíveis
- Valores formatados em moeda brasileira

**3.5 Impressão**
- Botão "Imprimir"
- CSS `@media print` remove cabeçalho/rodapé
- Tabela formatada para papel A4

#### 4. KPIs de Cauções

**4.1 Valor Bruto Esperado**
- Soma de `amount` de todas as parcelas de caução
- Filtrado por status de locação (ativo/inativo/todos)

**4.2 Valor Bruto Recebido**
- Soma de `amount` das parcelas com `pix_code` preenchido
- Considera código PIX como comprovante de pagamento

**4.3 Comissão**
- Soma de `partner_commission` + `internal_commission`
- Valores únicos por locação (não por parcela)

**4.4 Receita Líquida**
- Fórmula: `Valor Bruto Recebido - Comissão`

#### 5. Tabela de Detalhamento de Cauções

**5.1 Estrutura de Agrupamento**
- Linhas agrupadas por `rental_id`
- Primeira linha: Dados da locação (rowspan)
- Linhas subsequentes: Parcelas individuais

**5.2 Colunas**
- **Agrupadas (rowspan):**
  - Local
  - Complemento
  - Inquilino
  - Valor Aluguel
  - Valor Total Caução
  - Corretor Parceiro (Sim/Não)
  - Valor Pg Corretagem Parceiro (editável)
  - Valor Pg Corretagem Interno (editável)
- **Individuais (por parcela):**
  - Parcela (ex: 1/3)
  - Data Pagamento
  - Valor Parcela
  - Código PIX (editável)

**5.3 Coloração de Linhas**
- Verde claro (`bg-green-50`): Parcela com PIX preenchido (paga)
- Vermelho claro (`bg-red-50`): Parcela sem PIX (pendente)

**5.4 Edição de Comissões**
- Clique no ícone de lápis → Campo de input com máscara de moeda
- Salvar → Atualiza `partner_commission` ou `internal_commission`
- Validação: Valor >= 0

**5.5 Edição de Código PIX**
- Funcionalidade idêntica à tabela de locações
- Atualiza campo `pix_code` da tabela `deposit_installments`

**5.6 Filtro de Status de Locação**
- Dropdown: Ativos, Inativos, Todos
- Filtra por `is_active` da locação associada

**5.7 Linha de Totais**
- Totais de:
  - Valor Total Caução (soma dos valores únicos por locação)
  - Comissão Parceiro (soma dos valores únicos)
  - Comissão Interno (soma dos valores únicos)
  - Valor Parcela (soma de todas as parcelas)
- Fundo cinza escuro com negrito

#### 6. Permissões por Perfil

**6.1 Usuário Financeiro**
- Visualiza apenas dados de locais permitidos (`user_location_permissions`)
- KPIs calculados apenas com dados permitidos
- Tabelas filtradas por `location_id`

**6.2 Usuário Admin/Broker**
- Visualiza todos os dados sem restrição
- Acesso completo aos 2 relatórios (Locações + Cauções)

---

## ⚙️ Configurações

### Objetivo
Centralizar configurações globais do sistema, gerenciar usuários e permissões.

### Regras de Negócio

#### 1. Abas de Configurações

**1.1 Configurações Gerais**
- Taxa de administração (%)
- Taxa de gerenciamento (%)
- Configurações de notificações (futuro)

**1.2 Usuários**
- Listar todos os usuários do sistema
- Criar/editar/excluir usuários
- Atribuir perfis (roles)

**1.3 Permissões**
- Gerenciar permissões de usuários por local
- Isenções de taxa por local
- Controle de acesso granular

#### 2. Configurações Gerais

**2.1 Taxa de Administração**
- Valor padrão: 5%
- Aplicada sobre receita bruta de locações
- Editável apenas por Admin

**2.2 Taxa de Gerenciamento**
- Valor padrão: 3%
- Aplicada sobre receita bruta de locações
- Editável apenas por Admin

**2.3 Persistência**
- Salvo na tabela `config` (chave-valor)
- Chaves: `admin_fee_percentage`, `management_fee_percentage`

#### 3. Gerenciamento de Usuários

**3.1 Perfis (Roles)**
- `admin`: Acesso total ao sistema
- `broker`: Acesso a gestão de locações e financeiro
- `financial`: Acesso apenas a dados financeiros de locais permitidos
- `user`: Acesso básico (futuro)

**3.2 Cadastro de Usuário**
- Email (único)
- Nome completo
- Senha (mínimo 6 caracteres)
- Perfil (role)
- Status (ativo/inativo)

**3.3 Validações**
- Email deve ser único
- Senha mínima de 6 caracteres
- Perfil deve ser válido

**3.4 Autenticação**
- Sistema usa Supabase Auth
- Login via email + senha
- Sessão persistida em localStorage

**3.5 Exclusão de Usuário**
- Admin pode excluir qualquer usuário
- Não pode excluir a si mesmo
- **Cascata**: Remover permissões associadas

#### 4. Permissões por Local

**4.1 Tabela `user_location_permissions`**
- Associa usuário a locais específicos
- Apenas usuários `financial` precisam de permissões explícitas
- Admin/Broker tem acesso a todos os locais

**4.2 Atribuição de Permissões**
- Admin seleciona usuário
- Marca checkboxes de locais permitidos
- Salva múltiplas permissões de uma vez

**4.3 Validação**
- Permissões só aplicam-se a usuários `financial`
- Remover todas as permissões = sem acesso a nenhum dado

**4.4 Efeito no Sistema**
- Usuário vê apenas:
  - Imóveis dos locais permitidos
  - Locações dos imóveis permitidos
  - Pagamentos das locações permitidas
  - KPIs calculados apenas com dados permitidos

#### 5. Isenções de Taxa

**5.1 Tabela `user_fee_exemptions`**
- Associa usuário a locais isentos de taxa
- Ao calcular taxas administrativas, ignora receitas desses locais

**5.2 Atribuição de Isenções**
- Admin seleciona usuário
- Marca checkboxes de locais isentos
- Salva múltiplas isenções de uma vez

**5.3 Efeito nos Cálculos**
```
Para cada pagamento:
  SE location_id do imóvel está em user_fee_exemptions:
    NÃO somar para taxa de administração
    NÃO somar para taxa de gerenciamento
  SENÃO:
    Somar normalmente
```

#### 6. Despesas de Locais

**6.1 Tabela `location_expenses`**
- Registra despesas mensais por local
- Tipos: água, luz, internet, manutenção, condomínio, IPTU, limpeza, segurança, outros

**6.2 Cadastro de Despesa**
- Local (location_id)
- Tipo (type)
- Valor (amount)
- Mês de Referência (reference_month)
- Ano de Referência (reference_year)
- Descrição (description) - opcional
- Status (status): `pending`, `paid`

**6.3 Validações**
- Valor > 0
- Mês entre 1 e 12
- Tipo deve ser válido
- Não permitir duplicatas (mesmo local + tipo + mês/ano)

**6.4 Efeito no Financeiro**
- Despesas entram no cálculo de "Contas do Mês"
- Reduzem a receita líquida

---

## 🔐 Sistema de Permissões

### Objetivo
Controlar acesso granular aos dados do sistema baseado em perfis e permissões.

### Regras de Negócio

#### 1. Perfis de Usuário (Roles)

**1.1 Admin**
- **Acesso Total**: Todas as páginas e funcionalidades
- **Dados**: Visualiza e edita tudo
- **Configurações**: Pode alterar taxas, criar usuários, atribuir permissões
- **Financeiro**: Acesso completo aos 2 relatórios

**1.2 Broker**
- **Acesso**: Dashboard, Imóveis, Inquilinos, Locações, Pagamentos, Financeiro
- **Dados**: Visualiza e edita tudo
- **Configurações**: Apenas visualização (não pode alterar taxas)
- **Financeiro**: Acesso completo aos 2 relatórios

**1.3 Financial**
- **Acesso**: Dashboard, Financeiro (apenas Locações)
- **Dados**: Visualiza apenas locais permitidos em `user_location_permissions`
- **KPIs**: Calculados apenas com dados dos locais permitidos
- **Configurações**: Sem acesso
- **Restrição**: Não vê aba "Cauções"

**1.4 User (Futuro)**
- Acesso básico para inquilinos consultarem seus pagamentos

#### 2. Matriz de Permissões por Página

| Página | Admin | Broker | Financial | User |
|--------|-------|--------|-----------|------|
| Dashboard | ✅ Tudo | ✅ Tudo | ✅ Filtrado | ❌ |
| Imóveis | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Inquilinos | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Locações | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Pagamentos | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Financeiro - Locações | ✅ Tudo | ✅ Tudo | ✅ Filtrado | ❌ |
| Financeiro - Cauções | ✅ Tudo | ✅ Tudo | ❌ | ❌ |
| Configurações | ✅ CRUD | 👁️ View | ❌ | ❌ |

#### 3. Filtros por Perfil

**3.1 Admin/Broker**
```sql
-- Sem filtros, vê tudo
SELECT * FROM properties;
SELECT * FROM rentals;
SELECT * FROM payments;
```

**3.2 Financial**
```sql
-- Apenas locais permitidos
SELECT * FROM properties 
WHERE location_id IN (
  SELECT location_id FROM user_location_permissions 
  WHERE user_id = current_user_id
);

-- Apenas locações de imóveis permitidos
SELECT * FROM rentals 
WHERE property_id IN (
  SELECT id FROM properties 
  WHERE location_id IN (...)
);

-- Apenas pagamentos de locações permitidas
SELECT * FROM payments 
WHERE rental_id IN (
  SELECT id FROM rentals 
  WHERE property_id IN (...)
);
```

#### 4. Menu Lateral Dinâmico

**4.1 Itens do Menu**
```typescript
const menuItems = [
  { label: "Dashboard", icon: Home, roles: ["admin", "broker", "financial"] },
  { label: "Imóveis", icon: Building, roles: ["admin", "broker"] },
  { label: "Inquilinos", icon: Users, roles: ["admin", "broker"] },
  { label: "Locações", icon: Key, roles: ["admin", "broker"] },
  { label: "Pagamentos", icon: CreditCard, roles: ["admin", "broker"] },
  { label: "Financeiro", icon: DollarSign, roles: ["admin", "broker", "financial"] },
  { label: "Configurações", icon: Settings, roles: ["admin", "broker"] },
];
```

**4.2 Renderização**
- Exibir apenas itens onde `user.role` está em `roles`
- Itens não permitidos não aparecem no menu

#### 5. Proteção de Rotas

**5.1 Verificação no Layout**
```typescript
const hasAccess = (route: string, userRole: string) => {
  const routePermissions = {
    "/dashboard": ["admin", "broker", "financial"],
    "/properties": ["admin", "broker"],
    "/tenants": ["admin", "broker"],
    "/rentals": ["admin", "broker"],
    "/payments": ["admin", "broker"],
    "/financial": ["admin", "broker", "financial"],
    "/settings": ["admin", "broker"],
  };
  
  return routePermissions[route]?.includes(userRole) || false;
};
```

**5.2 Redirecionamento**
- Se usuário tentar acessar rota não permitida → Redirecionar para `/dashboard`
- Se não autenticado → Redirecionar para `/login`

#### 6. Atribuição de Permissões

**6.1 Fluxo de Criação**
1. Admin cria usuário com role `financial`
2. Admin vai em Configurações → Permissões
3. Admin seleciona o usuário
4. Admin marca checkboxes dos locais permitidos
5. Sistema salva múltiplos registros em `user_location_permissions`

**6.2 Fluxo de Edição**
1. Admin vai em Configurações → Permissões
2. Admin seleciona usuário existente
3. Sistema carrega permissões atuais (checkboxes marcados)
4. Admin marca/desmarca locais
5. Sistema atualiza registros (delete + insert)

**6.3 Fluxo de Remoção**
1. Admin desmarca todos os checkboxes
2. Sistema deleta todos os registros de `user_location_permissions` do usuário
3. Usuário perde acesso a todos os dados

---

## 📝 Glossário de Termos

- **Locação**: Contrato de aluguel entre imóvel e inquilino
- **Parcela**: Pagamento mensal de aluguel
- **Caução**: Depósito de segurança pago pelo inquilino
- **Taxa de Administração**: Percentual sobre receita bruta para administração
- **Taxa de Gerenciamento**: Percentual sobre receita bruta para gerenciamento
- **Receita Bruta**: Total recebido antes de descontar taxas
- **Receita Líquida**: Total após descontar taxas e despesas
- **Inadimplência**: Pagamentos em atraso
- **Ocupação**: Percentual de imóveis alugados vs. total de imóveis
- **PIX Code**: Código de pagamento PIX usado como comprovante
- **Rowspan**: Técnica de agrupamento de linhas em tabelas HTML

---

## 🔄 Fluxos Completos

### Fluxo 1: Criar Nova Locação
1. Admin/Broker acessa "Locações"
2. Clica em "+ Nova Locação"
3. Seleciona imóvel disponível
4. Seleciona inquilino ativo
5. Define datas de início e término
6. Define valores (aluguel, garagem, caução)
7. Define dia de vencimento e método de pagamento
8. Opcionalmente: Adiciona comissões de corretores
9. Opcionalmente: Faz upload do contrato PDF
10. Clica em "Salvar"
11. Sistema:
    - Cria registro em `rentals`
    - Gera parcelas em `payments` (uma por mês)
    - Se caução > 0, gera parcelas em `deposit_installments`
    - Atualiza imóvel para `availability = 'rented'`
    - Atualiza inquilino para `status = 'renter'`

### Fluxo 2: Registrar Pagamento
1. Admin/Broker acessa "Pagamentos"
2. Filtra por mês/ano ou locação
3. Localiza pagamento pendente
4. Clica no botão "Gerenciar Pagamento"
5. Define valor pago (pode ser parcial)
6. Define data de pagamento
7. Opcionalmente: Faz upload de comprovante
8. Clica em "Salvar"
9. Sistema:
    - Atualiza `paid_amount` e `payment_date`
    - Recalcula `status` (paid, partial, pending)
    - Salva comprovante em `/uploads/`

### Fluxo 3: Gerar Relatório Financeiro Mensal
1. Admin/Broker/Financial acessa "Financeiro"
2. Seleciona mês e ano desejados
3. Clica no botão "Filtrar"
4. Sistema:
    - Carrega pagamentos do período
    - Calcula KPIs (Receita Bruta, Taxas, Contas, Líquida)
    - Exibe tabela detalhada com todas as parcelas
    - Mostra linha de totais no final
5. Usuário pode:
    - Ordenar colunas
    - Editar códigos PIX inline
    - Exportar para Excel
    - Imprimir relatório

### Fluxo 4: Atribuir Permissões de Local
1. Admin cria usuário com role `financial`
2. Admin acessa "Configurações" → "Permissões"
3. Seleciona o novo usuário no dropdown
4. Sistema carrega lista de todos os locais
5. Admin marca checkboxes dos locais permitidos
6. Clica em "Salvar Permissões"
7. Sistema:
    - Deleta permissões antigas do usuário
    - Insere novos registros em `user_location_permissions`
8. Usuário financial agora só vê dados dos locais marcados

---

**Versão**: 1.0  
**Data**: 2026-02-02  
**Sistema**: Gerenciador de Locações de Imóveis