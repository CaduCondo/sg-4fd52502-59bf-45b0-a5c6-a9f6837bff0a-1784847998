# 📋 Regras de Negócio - Sistema de Locações

Este documento detalha **TODAS** as regras de negócio implementadas no sistema.

---

## 📋 Índice

- [Propriedades](#propriedades)
- [Inquilinos](#inquilinos)
- [Locações](#locações)
- [Caução](#caução)
- [Recebimentos](#recebimentos)
- [Multas e Juros](#multas-e-juros)
- [Taxa Administrativa](#taxa-administrativa)
- [Comissão de Corretor](#comissão-de-corretor)
- [Vaga de Garagem](#vaga-de-garagem)
- [Rescisão de Contratos](#rescisão-de-contratos)
- [Permissões e Segurança](#permissões-e-segurança)

---

## 🏠 Propriedades

### Estados de Propriedade

Uma propriedade pode ter os seguintes status:

| Status | Descrição | Cor |
|--------|-----------|-----|
| `available` | Disponível para locação | 🟢 Verde |
| `occupied` | Ocupada (locação ativa) | 🔵 Azul |
| `maintenance` | Em manutenção | 🟡 Amarelo |
| `unavailable` | Indisponível | 🔴 Vermelho |

### Regras de Status

1. **Ao criar locação:** Status muda automaticamente para `occupied`
2. **Ao rescindir contrato:** Status volta para `available`
3. **Não é possível** criar locação em propriedade que não está `available`
4. **Transição manual:** Admin/Gerente pode alterar status para `maintenance` ou `unavailable`

### Validações de Propriedade

- ✅ **Endereço completo obrigatório**
- ✅ **Valor de aluguel > R$ 0,00**
- ✅ **Localização obrigatória**
- ✅ **Tipo de imóvel** (casa, apartamento, comercial, galpão, terreno)
- ✅ **Pelo menos 1 foto** (recomendado)

### Múltiplas Fotos

- **Mínimo:** 1 foto (recomendado)
- **Máximo:** 20 fotos por propriedade
- **Formatos aceitos:** JPG, PNG, WEBP
- **Tamanho máximo por foto:** 5 MB
- **Ordem:** Primeira foto é a foto de capa

### Upload de Documentos

- **Tipos aceitos:** PDF, JPG, PNG
- **Exemplos:** IPTU, matrícula, planta, laudo técnico
- **Tamanho máximo:** 10 MB por arquivo
- **Armazenamento:** Supabase Storage bucket `documents`

---

## 👥 Inquilinos

### Dados Obrigatórios

- ✅ **Nome completo**
- ✅ **CPF** (único no sistema)
- ✅ **Telefone**
- ✅ **Email**

### Dados Opcionais

- RG
- Data de nascimento
- Endereço completo
- Dados de emergência (contato)
- Documentos anexados

### Validações

1. **CPF único:** Sistema não permite cadastrar dois inquilinos com mesmo CPF
2. **Formato de CPF:** XXX.XXX.XXX-XX (máscara automática)
3. **Telefone:** (XX) XXXXX-XXXX (máscara automática)
4. **Email válido:** Validação de formato

### Histórico de Locações

- Sistema mantém histórico completo de locações por inquilino
- Inquilino pode ter **múltiplas locações** (em propriedades diferentes)
- Não é possível deletar inquilino com locações ativas

---

## 📝 Locações

### Criação de Locação

#### Dados Obrigatórios

- ✅ **Propriedade** (deve estar `available`)
- ✅ **Inquilino**
- ✅ **Data de início**
- ✅ **Data de término**
- ✅ **Dia de pagamento** (1 a 28)
- ✅ **Valor do aluguel** (pode ser diferente do valor cadastrado na propriedade)

#### Dados Opcionais

- Valor da vaga de garagem
- Valor do caução
- Número de parcelas do caução (1, 2 ou 3)
- Comissão de corretor
- Código PIX para cada parcela do caução

### Geração Automática de Recebimentos

**Ao criar uma locação, o sistema gera automaticamente:**

1. **Recebimentos mensais** do aluguel (do mês de início até o mês de término)
2. **Parcela(s) do caução** (no primeiro, segundo e terceiro mês, se parcelado)
3. **Comissão do corretor** (no primeiro mês, se informada)

#### Exemplo:

**Locação criada:**
- Início: 01/01/2026
- Término: 31/12/2026
- Dia de pagamento: 05
- Aluguel: R$ 1.000,00
- Vaga: R$ 200,00
- Caução: R$ 1.200,00 (3x de R$ 400,00)
- Comissão: R$ 1.200,00

**Recebimentos gerados:**

| Vencimento | Tipo | Aluguel | Vaga | Tx Admin | Caução | Comissão | Total |
|------------|------|---------|------|----------|--------|----------|-------|
| 05/01/2026 | Mensal | R$ 1.000 | R$ 200 | R$ 100 | R$ 400 | R$ 1.200 | R$ 2.900 |
| 05/02/2026 | Mensal | R$ 1.000 | R$ 200 | R$ 100 | R$ 400 | - | R$ 1.700 |
| 05/03/2026 | Mensal | R$ 1.000 | R$ 200 | R$ 100 | R$ 400 | - | R$ 1.700 |
| 05/04/2026 | Mensal | R$ 1.000 | R$ 200 | R$ 100 | - | - | R$ 1.300 |
| ... | ... | ... | ... | ... | - | - | ... |
| 05/12/2026 | Mensal | R$ 1.000 | R$ 200 | R$ 100 | - | - | R$ 1.300 |

**Total de recebimentos gerados:** 12 (12 meses)

### Regras de Geração

1. **Data de vencimento:** Sempre no dia escolhido (ex: dia 05)
2. **Mês de referência:** Corresponde ao mês do vencimento
3. **Parcelas numeradas:** 1/12, 2/12, 3/12, ..., 12/12
4. **Status inicial:** Todos criados como `pending`

### Dia de Pagamento

- **Mínimo:** 1
- **Máximo:** 28
- **Motivo do limite:** Evitar problemas em meses com menos dias (fevereiro)
- **Recomendado:** Dias 5, 10, 15, 20

---

## 💰 Caução

### Tipos de Pagamento

| Tipo | Descrição |
|------|-----------|
| **À vista** | Caução pago integralmente no primeiro mês |
| **Parcelado em 2x** | Caução dividido em 2 parcelas (1º e 2º mês) |
| **Parcelado em 3x** | Caução dividido em 3 parcelas (1º, 2º e 3º mês) |

### Cálculo das Parcelas

**Regra:** Divisão igualitária com ajuste de centavos na última parcela

**Exemplo 1 - Caução R$ 1.000,00 em 3x:**
- 1ª parcela: R$ 333,33
- 2ª parcela: R$ 333,33
- 3ª parcela: R$ 333,34 (ajuste de R$ 0,01)

**Exemplo 2 - Caução R$ 1.234,56 em 2x:**
- 1ª parcela: R$ 617,28
- 2ª parcela: R$ 617,28

### Correção por IGPM

**Na rescisão do contrato:**

1. Sistema busca o **IGPM acumulado** do período da locação
2. Aplica correção sobre o valor original do caução
3. **Devolução:** Valor corrigido é abatido no recebimento do último mês

**Fórmula:**
```
Caução Corrigido = Caução Original × (1 + IGPM_Acumulado/100)
```

**Exemplo:**
- Caução original: R$ 1.200,00
- IGPM acumulado no período: 8,5%
- **Caução corrigido:** R$ 1.200,00 × 1,085 = R$ 1.302,00

### Código PIX

- Campo opcional para cada parcela do caução
- Facilita o pagamento pelo inquilino
- Pode ser um PIX Copia e Cola ou QR Code (base64)

### Isenção de Taxa no Caução

**Regra:** Taxa administrativa **NÃO é aplicada** sobre o valor do caução

**Motivo:** Caução é uma garantia, não é receita da administradora

---

## 💵 Recebimentos

### Status de Recebimento

| Status | Descrição | Cor |
|--------|-----------|-----|
| `pending` | Aguardando pagamento | 🟡 Amarelo |
| `paid` | Pago | 🟢 Verde |
| `overdue` | Atrasado | 🔴 Vermelho |
| `cancelled` | Cancelado | ⚪ Cinza |

### Mudança Automática de Status

**Sistema verifica diariamente:**

1. **Se vencimento < hoje E status = pending:**
   - Muda para `overdue`
   - Calcula multa e juros automaticamente

### Composição do Recebimento

Um recebimento pode ter os seguintes componentes:

| Componente | Descrição | Taxa Admin? |
|------------|-----------|-------------|
| **Aluguel** | Valor mensal do aluguel | ✅ Sim |
| **Vaga** | Valor da vaga de garagem | ❌ Não |
| **Caução** | Parcela do caução | ❌ Não |
| **Comissão** | Comissão do corretor | ❌ Não |
| **Multa** | Multa por atraso (2%) | ❌ Não |
| **Juros** | Juros por atraso (1% a.m.) | ❌ Não |
| **Taxa Admin** | Taxa administrativa (10%) | N/A |

### Cálculo do Valor Total

```
Valor Total = Aluguel + Vaga + Caução + Comissão + Multa + Juros + Taxa Admin
```

**Onde:**
```
Taxa Admin = Aluguel × (Percentual da Localização / 100)
```

### Marcação como Pago

**Ao marcar um recebimento como pago:**

1. **Dados obrigatórios:**
   - Data de pagamento
   - Método de pagamento (PIX, transferência, dinheiro, etc.)

2. **Dados opcionais:**
   - Comprovante (upload de imagem/PDF)
   - Observações

3. **Ação automática:**
   - Status muda para `paid`
   - Se pago com atraso, multa e juros são mantidos no valor

### Recibo de Pagamento

**Após marcar como pago:**

- Botão "Gerar Recibo" disponível
- PDF gerado com todas as informações:
  - Dados do imóvel
  - Dados do inquilino
  - Breakdown dos valores
  - Data de pagamento
  - Método de pagamento
  - QR Code (opcional)

---

## 🚨 Multas e Juros

### Regras de Aplicação

**Multa e juros são aplicados APENAS em pagamentos atrasados:**

1. **Multa:** 2% sobre o valor total (aplicada a partir do 1º dia de atraso)
2. **Juros:** 1% ao mês proporcional aos dias de atraso

### Cálculo Automático

**Sistema calcula automaticamente quando:**

1. Recebimento está com `status = overdue`
2. Usuário marca recebimento atrasado como pago
3. Sistema roda verificação diária de vencimentos

### Fórmulas

#### Multa
```
Multa = Valor do Aluguel × 0,02
```

**Observação:** Multa é aplicada apenas sobre o aluguel, não sobre vaga/caução

#### Juros
```
Juros = Valor do Aluguel × 0,01 × (Dias de Atraso / 30)
```

**Observação:** 
- 1% ao mês = 0,033% ao dia
- Cálculo proporcional aos dias corridos

### Exemplo Completo

**Dados:**
- Vencimento: 05/01/2026
- Data de pagamento: 15/01/2026 (10 dias de atraso)
- Aluguel: R$ 1.000,00
- Vaga: R$ 200,00
- Taxa Admin: R$ 100,00

**Cálculos:**
```
Multa = R$ 1.000,00 × 0,02 = R$ 20,00

Juros = R$ 1.000,00 × 0,01 × (10/30) = R$ 3,33

Valor Total = R$ 1.000 + R$ 200 + R$ 100 + R$ 20 + R$ 3,33 = R$ 1.323,33
```

### Isenção de Multa e Juros

**Caso especial:** Admin/Gerente pode marcar pagamento como pago **SEM aplicar multa e juros**

**Como fazer:**
1. Ao marcar como pago, desmarcar checkbox "Aplicar multa e juros"
2. Sistema registra pagamento sem adicionar valores extras

**Uso comum:**
- Acordo com inquilino
- Pagamento antecipado do próximo mês
- Ajustes e compensações

---

## 💼 Taxa Administrativa

### Definição

**Taxa administrativa** é um percentual cobrado sobre o valor do aluguel para cobrir custos de gestão.

### Configuração

- **Localização:** Cada localização tem seu percentual configurável
- **Padrão:** 10% (pode ser alterado por localização)
- **Mínimo:** 0%
- **Máximo:** 30%

### Aplicação

**Taxa é aplicada sobre:**
- ✅ Valor do aluguel (sempre)

**Taxa NÃO é aplicada sobre:**
- ❌ Vaga de garagem
- ❌ Caução
- ❌ Comissão de corretor
- ❌ Multa
- ❌ Juros

### Fórmula

```
Taxa Administrativa = Aluguel × (Percentual / 100)
```

**Exemplo:**
- Aluguel: R$ 1.000,00
- Percentual: 10%
- **Taxa:** R$ 1.000,00 × 0,10 = R$ 100,00

### Isenção de Taxa

**Sistema permite isenção de taxa para inquilinos específicos:**

1. **Configuração:** Admin/Gerente acessa Configurações → Isenções de Taxa
2. **Adicionar isenção:** Seleciona inquilino e define isenção
3. **Efeito:** Todos os recebimentos deste inquilino são criados SEM taxa administrativa

**Casos de uso:**
- Inquilino VIP
- Parceiros
- Locações promocionais
- Familiares/amigos

---

## 🤝 Comissão de Corretor

### Definição

**Comissão de corretor** é um valor único pago no primeiro mês para o corretor parceiro que intermediou a locação.

### Características

- **Valor:** Livre (ex: R$ 1.200,00, R$ 1.500,00)
- **Pagamento:** Apenas no 1º mês
- **Opcional:** Nem toda locação tem corretor parceiro
- **Taxa Admin:** NÃO aplica sobre a comissão

### Quando Incluir

**Incluir comissão quando:**
- Locação foi intermediada por corretor externo
- Existe acordo prévio de pagamento de comissão

**Não incluir quando:**
- Locação foi feita diretamente pela administradora
- Não houve intermediário

### Registro no Recebimento

**No primeiro mês da locação:**
```
Valor Total = Aluguel + Vaga + Taxa Admin + Caução (1ª parcela) + Comissão

Exemplo:
= R$ 1.000 + R$ 200 + R$ 100 + R$ 400 + R$ 1.200 = R$ 2.900
```

---

## 🚗 Vaga de Garagem

### Definição

**Vaga de garagem** é um valor adicional ao aluguel para locação de vaga de estacionamento.

### Características

- **Valor:** Livre (ex: R$ 100,00, R$ 200,00, R$ 300,00)
- **Opcional:** Nem todo imóvel tem vaga
- **Taxa Admin:** NÃO aplica sobre vaga
- **Inclusão:** Valor é somado ao total mensal

### Regras

1. Vaga é **opcional** na criação da locação
2. Se informada, valor da vaga é incluído em **todos os meses**
3. **Não sofre taxa administrativa** (motivo: vaga é item separado do imóvel)
4. Pode ser **alterada durante a locação** (editar locação)

### Exemplo com Vaga

**Locação:**
- Aluguel: R$ 1.000,00
- Vaga: R$ 200,00
- Taxa Admin: 10%

**Cálculo do recebimento mensal:**
```
Aluguel: R$ 1.000,00
Taxa Admin: R$ 100,00 (10% sobre aluguel)
Vaga: R$ 200,00 (sem taxa)
Total: R$ 1.300,00
```

---

## 🔚 Rescisão de Contratos

### Processo de Rescisão

**Ao rescindir um contrato, o sistema executa:**

1. **Determinar mês da rescisão**
2. **Calcular aluguel proporcional** (dias úteis do mês)
3. **Buscar/criar recebimento do mês da rescisão**
4. **Calcular caução corrigido pelo IGPM**
5. **Atualizar recebimento do mês:**
   - Aluguel proporcional
   - Vaga proporcional (se houver)
   - Taxa administrativa proporcional
   - **Abater caução corrigido** (valor negativo)
   - Incluir multa/juros se atrasado
6. **Deletar todos os recebimentos futuros**
7. **Recalcular números de parcelas** (ex: de 1/12 para 1/10, 2/10, ..., 10/10)
8. **Atualizar data de término do contrato**
9. **Mudar status da propriedade** para `available`

### Aluguel Proporcional

**Fórmula:**
```
Aluguel Proporcional = (Aluguel Mensal / Dias do Mês) × Dias Ocupados
```

**Exemplo:**
- Rescisão: 10/04/2026 (abril tem 30 dias)
- Aluguel mensal: R$ 1.000,00
- Dias ocupados: 10 dias

```
Aluguel Proporcional = (R$ 1.000,00 / 30) × 10 = R$ 333,33
```

### Caução Corrigido

**Sistema aplica correção IGPM sobre o caução:**

1. Busca IGPM acumulado do período da locação (API externa)
2. Aplica correção sobre o valor total do caução pago
3. Abate do recebimento do mês da rescisão

**Exemplo:**
- Caução pago: R$ 1.200,00 (3x de R$ 400,00)
- IGPM acumulado: 8,5%
- **Caução corrigido:** R$ 1.302,00
- **Abatimento:** -R$ 1.302,00 no recebimento final

### Breakdown do Último Recebimento

**Exemplo completo de rescisão em 10/04/2026:**

| Item | Valor |
|------|-------|
| Aluguel Proporcional (10 dias) | R$ 333,33 |
| Vaga Proporcional (10 dias) | R$ 66,67 |
| Taxa Administrativa (proporcional) | R$ 33,33 |
| **Subtotal** | **R$ 433,33** |
| Caução Corrigido (devolução) | **-R$ 1.302,00** |
| **TOTAL A RECEBER DO INQUILINO** | **-R$ 868,67** |

**Interpretação:** Administradora deve **devolver R$ 868,67** ao inquilino.

### Recálculo de Parcelas

**CRÍTICO:** Após deletar recebimentos futuros, sistema recalcula os números:

**Antes da rescisão:**
- 1/12, 2/12, 3/12, ..., 12/12

**Depois da rescisão em 10/04/2026 (10 meses pagos):**
- 1/10, 2/10, 3/10, ..., 10/10

**Implementação:**
1. Deletar recebimentos futuros (mês > mês da rescisão)
2. Buscar recebimentos restantes
3. Atualizar `installment` e `total_installments` em lote
4. Verificação final rigorosa (impede erros)

### Regras de Segurança

1. **Apenas Admin e Gerente** podem rescindir contratos
2. **Não é possível desfazer** uma rescisão (operação irreversível)
3. **Confirmação obrigatória** antes de executar
4. **Logs detalhados** de toda a operação

---

## 🔐 Permissões e Segurança

### Perfis de Usuário

| Perfil | Descrição |
|--------|-----------|
| **Admin** | Acesso total, gerencia usuários e configurações |
| **Manager** | Gestão completa exceto gerenciamento de usuários |
| **Operator** | CRUD de propriedades, inquilinos e locações |
| **Viewer** | Apenas visualização, sem edições |

### Matriz de Permissões Detalhada

#### Propriedades

| Ação | Admin | Manager | Operator | Viewer |
|------|-------|---------|----------|--------|
| Visualizar | ✅ | ✅ | ✅ | ✅ |
| Criar | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ✅ | ❌ |
| Deletar | ✅ | ✅ | ❌ | ❌ |
| Upload fotos | ✅ | ✅ | ✅ | ❌ |
| Alterar status | ✅ | ✅ | ✅ | ❌ |

#### Inquilinos

| Ação | Admin | Manager | Operator | Viewer |
|------|-------|---------|----------|--------|
| Visualizar | ✅ | ✅ | ✅ | ✅ |
| Criar | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ✅ | ❌ |
| Deletar | ✅ | ✅ | ❌ | ❌ |

#### Locações

| Ação | Admin | Manager | Operator | Viewer |
|------|-------|---------|----------|--------|
| Visualizar | ✅ | ✅ | ✅ | ✅ |
| Criar | ✅ | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ | ✅ | ❌ |
| Rescindir | ✅ | ✅ | ✅ | ❌ |

#### Recebimentos

| Ação | Admin | Manager | Operator | Viewer |
|------|-------|---------|----------|--------|
| Visualizar | ✅ | ✅ | ✅ | ✅ |
| Marcar como pago | ✅ | ✅ | ✅ | ❌ |
| Editar valor | ✅ | ✅ | ❌ | ❌ |
| Deletar | ✅ | ✅ | ❌ | ❌ |
| Gerar recibo | ✅ | ✅ | ✅ | ✅ |

#### Configurações

| Ação | Admin | Manager | Operator | Viewer |
|------|-------|---------|----------|--------|
| Ver configurações | ✅ | ✅ | ❌ | ❌ |
| Editar localizações | ✅ | ✅ | ❌ | ❌ |
| Editar taxa admin | ✅ | ✅ | ❌ | ❌ |
| Isenções de taxa | ✅ | ✅ | ❌ | ❌ |
| Despesas de localização | ✅ | ✅ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ |

### Permissões por Localização

**Sistema multi-tenant:**

- Cada usuário tem permissões para **localizações específicas**
- Usuário **só vê dados** das localizações permitidas
- Admin pode ver **todas as localizações**

**Exemplo:**
- **João (Manager):** Acesso apenas a "São Paulo"
  - Vê propriedades, inquilinos e locações de São Paulo
  - Não vê dados de outras cidades
- **Maria (Admin):** Acesso total
  - Vê todas as localizações

### Row Level Security (RLS)

**Banco de dados protegido por RLS:**

1. Todas as tabelas têm RLS habilitado
2. Políticas baseadas em:
   - Autenticação (JWT)
   - Perfil do usuário
   - Permissões de localização
3. Impossível acessar dados sem permissão (segurança em nível de banco)

---

## 📊 Dashboard e Métricas

### Métricas Principais

1. **Recebimentos do Mês**
   - Total esperado
   - Total pago
   - Percentual recebido
   - Pendente

2. **Inadimplência**
   - Total em atraso
   - Quantidade de contratos inadimplentes
   - Ticket médio de atraso

3. **Ocupação**
   - Total de propriedades
   - Propriedades ocupadas
   - Taxa de ocupação (%)
   - Propriedades disponíveis

4. **Contratos**
   - Contratos ativos
   - Contratos vencendo em 30/60/90 dias
   - Alertas de renovação

### Gráficos

1. **Recebimentos por Mês** (últimos 12 meses)
2. **Inadimplência Mensal** (últimos 6 meses)
3. **Ocupação por Localização**
4. **Distribuição de Propriedades por Tipo**

### Período de Análise

Usuário pode filtrar dados por:
- Mês atual
- Últimos 3 meses
- Últimos 6 meses
- Últimos 12 meses
- Ano atual
- Personalizado (data início e fim)

---

## 🔄 Workflows Completos

### Workflow 1: Nova Locação

```
1. USUÁRIO cria locação
   ├─ Seleciona propriedade (disponível)
   ├─ Seleciona inquilino
   ├─ Define datas, dia de pagamento, valores
   └─ Salva
   ↓
2. SISTEMA valida dados
   ↓
3. SISTEMA cria registro de locação
   ↓
4. SISTEMA gera recebimentos mensais
   ├─ Aluguel + Taxa Admin (todos os meses)
   ├─ Vaga (se informada)
   ├─ Caução parcelado (1º, 2º, 3º mês)
   └─ Comissão corretor (1º mês)
   ↓
5. SISTEMA atualiza status da propriedade → "occupied"
   ↓
6. SISTEMA exibe sucesso + contrato gerado
```

### Workflow 2: Marcar Pagamento

```
1. USUÁRIO clica em "Marcar como Pago"
   ↓
2. SISTEMA abre dialog de confirmação
   ↓
3. USUÁRIO preenche:
   ├─ Data de pagamento
   ├─ Método de pagamento
   └─ Comprovante (opcional)
   ↓
4. SISTEMA calcula multa/juros (se atrasado)
   ↓
5. USUÁRIO confirma
   ↓
6. SISTEMA atualiza recebimento
   ├─ Status → "paid"
   ├─ payment_date → data informada
   ├─ payment_method → método selecionado
   └─ attachment → comprovante (se enviado)
   ↓
7. SISTEMA exibe sucesso + opção de gerar recibo
```

### Workflow 3: Rescisão de Contrato

```
1. USUÁRIO clica em "Rescindir Contrato"
   ↓
2. SISTEMA abre dialog de rescisão
   ↓
3. USUÁRIO informa data de rescisão
   ↓
4. SISTEMA calcula preview:
   ├─ Aluguel proporcional
   ├─ Caução corrigido
   └─ Valor final (pode ser negativo)
   ↓
5. USUÁRIO confirma rescisão
   ↓
6. SISTEMA executa rescisão:
   ├─ Atualiza recebimento do mês
   ├─ Deleta recebimentos futuros
   ├─ Recalcula números de parcelas
   ├─ Atualiza data fim da locação
   └─ Muda status da propriedade → "available"
   ↓
7. SISTEMA exibe sucesso + resumo da rescisão
```

---

## 📝 Regras de Validação

### Propriedades

- ✅ Endereço não pode estar vazio
- ✅ Valor do aluguel deve ser > R$ 0,00
- ✅ Localização deve ser selecionada
- ✅ Fotos: máximo 20, tamanho máximo 5MB cada

### Inquilinos

- ✅ Nome completo obrigatório (mínimo 3 caracteres)
- ✅ CPF válido e único
- ✅ Telefone válido (formato brasileiro)
- ✅ Email válido

### Locações

- ✅ Propriedade deve estar disponível
- ✅ Data de término > Data de início
- ✅ Dia de pagamento entre 1 e 28
- ✅ Valor do aluguel > R$ 0,00
- ✅ Se caução parcelado, número de parcelas entre 1 e 3
- ✅ Soma das parcelas do caução = Valor total do caução

### Recebimentos

- ✅ Data de pagamento não pode ser futura
- ✅ Método de pagamento deve ser selecionado ao marcar como pago
- ✅ Comprovante (se enviado): máximo 10MB

---

## 🚀 Automações

### Verificação Diária de Vencimentos

**Sistema roda automaticamente às 00:00:**

1. Busca todos os recebimentos com:
   - `status = pending`
   - `due_date < hoje`

2. Para cada recebimento encontrado:
   - Muda status para `overdue`
   - Calcula e aplica multa (2%)
   - Calcula e aplica juros proporcional

3. Envia notificação aos gestores (se configurado)

### Alertas de Renovação

**Sistema verifica contratos vencendo:**

- **30 dias antes:** Alerta amarelo
- **15 dias antes:** Alerta laranja
- **7 dias antes:** Alerta vermelho

**Exibido no dashboard e na lista de locações**

---

## 🎯 Casos de Uso Especiais

### Caso 1: Mudança de Dia de Pagamento

**Problema:** Inquilino pede para mudar o dia de pagamento

**Solução:**
1. Admin/Gerente edita a locação
2. Altera o campo "Dia de Pagamento"
3. Sistema **recalcula** todos os recebimentos pendentes
4. Datas de vencimento são ajustadas automaticamente

**Exemplo:**
- Dia atual: 05
- Novo dia: 10
- Recebimentos de 05/05 → 10/05, 05/06 → 10/06, etc.

### Caso 2: Inquilino Paga Antecipado

**Problema:** Inquilino pagou 2 meses antecipados

**Solução:**
1. Marcar recebimento atual como pago (data = hoje)
2. Marcar próximo recebimento como pago (data = hoje)
3. Sistema mantém os recebimentos organizados

### Caso 3: Propriedade em Reforma Durante Locação

**Problema:** Imóvel precisa de reforma urgente, inquilino fica 15 dias sem usar

**Solução:**
1. Admin/Gerente calcula desconto proporcional
2. Edita recebimento do mês manualmente
3. Reduz o valor do aluguel proporcionalmente
4. Adiciona observação explicando o desconto

### Caso 4: Caução Utilizado para Reparos

**Problema:** Inquilino danificou algo, caução será usado para reparo

**Solução:**
1. Na rescisão, Admin/Gerente edita o valor do caução
2. Reduz o valor proporcional ao custo do reparo
3. Sistema abate apenas o valor restante
4. Observação registra o motivo

---

## 📱 Responsividade e Acessibilidade

### Design Responsivo

- ✅ **Desktop:** Layout completo com sidebar
- ✅ **Tablet:** Layout adaptado, sidebar colapsável
- ✅ **Mobile:** Layout mobile-first, menu hambúrguer

### Acessibilidade

- ✅ **Contraste:** Cores seguem WCAG AA
- ✅ **Navegação por teclado:** Todos os elementos são acessíveis
- ✅ **Labels:** Todos os inputs têm labels descritivos
- ✅ **Feedback:** Mensagens de erro e sucesso claras

---

## 🔄 Integração com APIs Externas

### IGPM (Índice Geral de Preços do Mercado)

**API:** https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados

**Uso:** Correção do caução na rescisão

**Exemplo:**
```typescript
const igpm = await fetchIGPMData(startDate, endDate);
const accumulatedIGPM = calculateAccumulatedIGPM(igpm);
const correctedDeposit = deposit * (1 + accumulatedIGPM / 100);
```

---

**Próximas documentações:**
- [Arquitetura do Sistema](ARCHITECTURE.md)
- [Documentação de API](API_DOCUMENTATION.md)
- [Esquema do Banco de Dados](DATABASE_SCHEMA.md)
- [Guia de Deploy](DEPLOYMENT.md)