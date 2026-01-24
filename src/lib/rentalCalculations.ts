import { Property } from "@/types";

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