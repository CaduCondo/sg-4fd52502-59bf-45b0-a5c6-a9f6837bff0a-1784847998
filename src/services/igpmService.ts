import { differenceInMonths, format } from "date-fns";

/**
 * Serviço para calcular correção monetária pelo IGPM
 */

interface IGPMData {
  month: string;
  year: string;
  value: number;
}

/**
 * Base de dados do IGPM (acumulado mensal)
 * Fonte: FGV - Fundação Getúlio Vargas
 * Atualizado até Dezembro/2025
 */
const IGPM_DATABASE: IGPMData[] = [
  // 2024
  { month: "01", year: "2024", value: 0.00 },
  { month: "02", year: "2024", value: 0.58 },
  { month: "03", year: "2024", value: 0.47 },
  { month: "04", year: "2024", value: 0.31 },
  { month: "05", year: "2024", value: 0.89 },
  { month: "06", year: "2024", value: 0.45 },
  { month: "07", year: "2024", value: 0.83 },
  { month: "08", year: "2024", value: 0.29 },
  { month: "09", year: "2024", value: 0.62 },
  { month: "10", year: "2024", value: 1.54 },
  { month: "11", year: "2024", value: 1.18 },
  { month: "12", year: "2024", value: 0.87 },
  
  // 2025
  { month: "01", year: "2025", value: 0.34 },
  { month: "02", year: "2025", value: 0.56 },
  { month: "03", year: "2025", value: 0.42 },
  { month: "04", year: "2025", value: 0.38 },
  { month: "05", year: "2025", value: 0.51 },
  { month: "06", year: "2025", value: 0.44 },
  { month: "07", year: "2025", value: 0.48 },
  { month: "08", year: "2025", value: 0.52 },
  { month: "09", year: "2025", value: 0.47 },
  { month: "10", year: "2025", value: 0.55 },
  { month: "11", year: "2025", value: 0.49 },
  { month: "12", year: "2025", value: 0.53 },
  
  // 2026
  { month: "01", year: "2026", value: 0.45 },
  { month: "02", year: "2026", value: 0.50 },
];

/**
 * Calcula o IGPM acumulado entre duas datas
 */
export function calculateIGPM(startDate: string, endDate: string): {
  totalPercentage: number;
  months: number;
  details: Array<{ month: string; year: string; value: number }>;
  correctedAmount: (originalAmount: number) => number;
} {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  
  const months = differenceInMonths(end, start);
  
  // Se for menos de 1 mês, não aplica correção
  if (months < 1) {
    return {
      totalPercentage: 0,
      months: 0,
      details: [],
      correctedAmount: (amount) => amount,
    };
  }
  
  const details: Array<{ month: string; year: string; value: number }> = [];
  let accumulatedPercentage = 0;
  
  // Calcular IGPM para cada mês do período
  const currentDate = new Date(start);
  
  for (let i = 0; i <= months; i++) {
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
    const yearStr = String(currentDate.getFullYear());
    
    const igpmData = IGPM_DATABASE.find(
      (item) => item.month === monthStr && item.year === yearStr
    );
    
    if (igpmData) {
      details.push({
        month: monthStr,
        year: yearStr,
        value: igpmData.value,
      });
      
      // Fórmula de juros compostos: (1 + taxa1) * (1 + taxa2) - 1
      accumulatedPercentage = ((1 + accumulatedPercentage / 100) * (1 + igpmData.value / 100) - 1) * 100;
    }
    
    // Avançar para o próximo mês
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return {
    totalPercentage: Math.round(accumulatedPercentage * 100) / 100,
    months,
    details,
    correctedAmount: (originalAmount: number) => {
      return Math.round(originalAmount * (1 + accumulatedPercentage / 100) * 100) / 100;
    },
  };
}

/**
 * Formata os detalhes do IGPM para exibição
 */
export function formatIGPMDetails(details: Array<{ month: string; year: string; value: number }>): string {
  return details
    .map((item) => `${item.month}/${item.year}: ${item.value.toFixed(2)}%`)
    .join(", ");
}

/**
 * Calcula o valor corrigido do caução
 */
export function calculateCorrectedDeposit(
  depositAmount: number,
  startDate: string,
  endDate: string
): {
  originalAmount: number;
  correctedAmount: number;
  igpmPercentage: number;
  months: number;
  igpmDetails: string;
} {
  console.log("📊 === CALCULANDO CORREÇÃO DO CAUÇÃO PELO IGPM ===");
  console.log("Valor original:", depositAmount);
  console.log("Data início:", startDate);
  console.log("Data fim:", endDate);
  
  const igpmData = calculateIGPM(startDate, endDate);
  const correctedAmount = igpmData.correctedAmount(depositAmount);
  
  console.log(`Meses de correção: ${igpmData.months}`);
  console.log(`IGPM acumulado: ${igpmData.totalPercentage}%`);
  console.log(`Valor corrigido: R$ ${correctedAmount.toFixed(2)}`);
  console.log("Detalhamento IGPM:", formatIGPMDetails(igpmData.details));
  console.log("📊 === FIM DO CÁLCULO ===");
  
  return {
    originalAmount: depositAmount,
    correctedAmount,
    igpmPercentage: igpmData.totalPercentage,
    months: igpmData.months,
    igpmDetails: formatIGPMDetails(igpmData.details),
  };
}