import { Property } from "@/types";

/**
 * Formata uma data string (YYYY-MM-DD) para exibição sem problemas de timezone
 * Adiciona T00:00:00 para forçar interpretação como hora local
 */
export function formatDateLocal(dateString: string): Date {
  if (!dateString) return new Date();
  // Adiciona T00:00:00 para forçar interpretação como local, não UTC
  return new Date(dateString + "T00:00:00");
}

/**
 * Calcula a diferença de dias entre a data de início do contrato e a data de vencimento
 * Retorna o número de dias que devem ser cobrados no primeiro aluguel
 */
export function calculateDaysBetweenDates(startDate: string, paymentDay: number): number {
  if (!startDate || !paymentDay) return 0;

  const start = formatDateLocal(startDate);
  const startDay = start.getDate();
  
  // Se o dia de início for igual ao dia de pagamento, não há proporcionalidade
  if (startDay === paymentDay) return 30;

  // Calcular a data de vencimento (primeiro dia de pagamento)
  const paymentDate = new Date(start);
  
  // Se o dia de pagamento já passou no mês atual, vai para o próximo mês
  if (startDay > paymentDay) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  }
  
  paymentDate.setDate(paymentDay);

  // Calcular diferença em dias
  const diffTime = paymentDate.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calcula o valor proporcional do primeiro aluguel
 * Fórmula: (valor_mensal / 30) × número_de_dias
 */
export function calculateProportionalRent(
  monthlyRent: number,
  startDate: string,
  paymentDay: number
): number {
  const days = calculateDaysBetweenDates(startDate, paymentDay);
  
  // Se for 30 dias, retorna o valor integral
  if (days === 30) return monthlyRent;
  
  // Calcula o valor proporcional
  const dailyRate = monthlyRent / 30;
  const proportionalValue = dailyRate * days;
  
  return Math.round(proportionalValue * 100) / 100; // Arredonda para 2 casas decimais
}

/**
 * Verifica se a primeira parcela deve ser proporcional
 */
export function shouldUseProportionalRent(startDate: string, paymentDay: number): boolean {
  if (!startDate || !paymentDay) return false;
  
  const start = formatDateLocal(startDate);
  const startDay = start.getDate();
  
  return startDay !== paymentDay;
}

/**
 * Calcula o valor total da locação incluindo aluguel base e garagem
 */
export function calculateTotalRent(
  propertyValue: number,
  hasGarage: boolean,
  garageValue: string
): number {
  const cleanGarageValue = hasGarage
    ? parseFloat(garageValue.replace(/[^\d,]/g, "").replace(",", ".") || "0")
    : 0;
  return propertyValue + cleanGarageValue;
}

/**
 * Valida se todos os campos obrigatórios estão preenchidos
 */
export function validateRentalForm(data: {
  propertyId: string;
  tenantId: string;
  startDate: string;
  paymentDay: string;
}): { isValid: boolean; error?: string } {
  if (!data.propertyId || !data.tenantId || !data.startDate || !data.paymentDay) {
    return {
      isValid: false,
      error: "Por favor, preencha todos os campos obrigatórios.",
    };
  }
  return { isValid: true };
}

/**
 * Valida se o valor total da locação é válido
 */
export function validateRentalValue(totalValue: number): { isValid: boolean; error?: string } {
  if (!totalValue || totalValue <= 0) {
    return {
      isValid: false,
      error: "O valor total da locação deve ser maior que zero.",
    };
  }
  return { isValid: true };
}

/**
 * Prepara os dados da locação para envio ao backend
 * RETORNA EM CAMELCASE - A conversão para snake_case é feita no rentalService.ts
 */
export function prepareRentalData(
  propertyId: string,
  tenantId: string,
  startDate: string,
  endDate: string,
  paymentDay: string,
  propertyValue: number,
  hasGarage: boolean,
  garageValue: string,
  attachments: string[],
  securityDeposit: string,
  hasPartnerBroker: boolean
) {
  const totalValue = calculateTotalRent(propertyValue, hasGarage, garageValue);
  const cleanGarageValue = hasGarage
    ? parseFloat(garageValue.replace(/[^\d,]/g, "").replace(",", ".") || "0")
    : 0;
  const cleanSecurityDeposit = parseFloat(securityDeposit.replace(/[^\d,]/g, "").replace(",", ".") || "0");

  // RETORNA EM CAMELCASE
  return {
    propertyId: propertyId,
    tenantId: tenantId,
    startDate: startDate,
    endDate: endDate || null,
    paymentDay: parseInt(paymentDay),
    monthlyRent: propertyValue,
    value: totalValue,
    hasGarage: hasGarage,
    garageValue: hasGarage ? cleanGarageValue : null,
    securityDeposit: cleanSecurityDeposit,
    hasPartnerBroker: hasPartnerBroker,
    partnerBrokerValue: null,
    isActive: true,
    contractAttachments: attachments,
    attachments: attachments,
  };
}

/**
 * Formata o nome do local com complemento se houver
 */
export function formatPropertyDisplay(locationName: string, complement?: string): string {
  return complement ? `${locationName} - ${complement}` : locationName;
}