/**
 * Dados de teste para criação de entidades
 * Centraliza todos os dados mock usados nos testes
 */

export const testProperty = {
  type: 'Residencial',
  location: 'Rua das Flores, 123',
  complement: 'Apto 45, Bloco B',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  value: '2500,00',
};

export const testTenant = {
  name: 'João da Silva',
  cpf: '123.456.789-00',
  email: 'joao.teste@email.com',
  phone: '(11) 98765-4321',
  birthDate: '01/01/1990',
};

export const testRental = {
  startDate: '01/07/2026',
  endDate: '01/07/2027',
  rentValue: '2500,00',
  dueDay: '10',
  adminFee: '10',
  deposit: '2500,00',
  depositInstallments: '5',
};

/**
 * Cenários de pagamento para testes
 */
export const paymentScenarios = {
  onTime: {
    description: 'Pagamento dentro do prazo (sem multa/juros)',
    installment: 1,
    dueDate: '10/07/2026',
    paymentDate: '10/07/2026',
    expectedAmount: 2500.00,
    paidAmount: 2500.00,
    fine: 0,
    interest: 0,
  },
  
  fiveDaysLate: {
    description: 'Pagamento 5 dias atrasado (multa 2% + juros 0,033%/dia)',
    installment: 2,
    dueDate: '10/08/2026',
    paymentDate: '15/08/2026',
    expectedAmount: 2500.00,
    daysLate: 5,
    finePercent: 2,
    dailyInterestPercent: 0.033,
    expectedFine: 50.00, // 2% de 2500
    expectedInterest: 4.13, // 0.033% * 5 dias * 2500
    expectedTotal: 2554.13,
  },
  
  thirtyDaysLate: {
    description: 'Pagamento 30 dias atrasado (multa 2% + juros 0,033%/dia)',
    installment: 3,
    dueDate: '10/09/2026',
    paymentDate: '10/10/2026',
    expectedAmount: 2500.00,
    daysLate: 30,
    finePercent: 2,
    dailyInterestPercent: 0.033,
    expectedFine: 50.00, // 2% de 2500
    expectedInterest: 24.75, // 0.033% * 30 dias * 2500
    expectedTotal: 2574.75,
  },
};

/**
 * Dados esperados para validação da tela Financeiro
 */
export const expectedFinancialData = {
  july2026: {
    totalReceived: 'R$ 2.500,00',
    rent: 'R$ 2.500,00',
    deposit: 'R$ 0,00',
    adminFee: 'R$ 0,00',
  },
  
  august2026: {
    totalReceived: 'R$ 2.554,13',
    rent: 'R$ 2.500,00',
    fine: 'R$ 50,00',
    interest: 'R$ 4,13',
  },
};

/**
 * Mensagens de sucesso/erro esperadas
 */
export const expectedMessages = {
  propertyCreated: 'Propriedade criada com sucesso',
  tenantCreated: 'Inquilino criado com sucesso',
  rentalCreated: 'Locação criada com sucesso',
  paymentSaved: 'Pagamento registrado com sucesso',
  propertyDeleted: 'Propriedade deletada com sucesso',
  tenantDeleted: 'Inquilino deletado com sucesso',
  rentalTerminated: 'Locação encerrada com sucesso',
  
  // Erros esperados
  cannotDeletePropertyWithRental: 'Não é possível deletar um imóvel vinculado a uma locação ativa',
  cannotDeleteTenantWithRental: 'Não é possível deletar um inquilino vinculado a uma locação ativa',
};