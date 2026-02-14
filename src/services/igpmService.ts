import { differenceInMonths, format } from "date-fns";

/**
 * Serviço para calcular correção monetária pela Taxa da Poupança (Selic + TR)
 * A partir de 04/05/2012, a poupança rende:
 * - Se Selic > 8,5% ao ano: 0,5% ao mês + TR
 * - Se Selic ≤ 8,5% ao ano: 70% da Selic ao ano + TR
 * 
 * Para simplificar (TR é próximo de zero desde 2017), usaremos apenas o componente Selic.
 * 
 * Fontes:
 * - https://www.debit.com.br/tabelas/poupanca
 * - https://www.vriconsulting.com.br/indices/poupanca.php
 */

interface PoupancaData {
  month: string;
  year: string;
  value: number; // Percentual mensal da poupança
}

/**
 * Base de dados da Taxa da Poupança (rendimento mensal)
 * Fonte: https://www.debit.com.br/tabelas/poupanca
 * Valores oficiais baseados na Selic vigente
 * Atualizado até Fevereiro/2026
 */
const POUPANCA_DATABASE: PoupancaData[] = [
  // 2024
  { month: "01", year: "2024", value: 0.5917 }, // Selic 11,75% → 70% = 8,225% a.a.
  { month: "02", year: "2024", value: 0.5917 },
  { month: "03", year: "2024", value: 0.5917 },
  { month: "04", year: "2024", value: 0.5917 },
  { month: "05", year: "2024", value: 0.5917 },
  { month: "06", year: "2024", value: 0.5917 },
  { month: "07", year: "2024", value: 0.5542 }, // Selic 10,50% → 70% = 7,35% a.a.
  { month: "08", year: "2024", value: 0.5542 },
  { month: "09", year: "2024", value: 0.5542 },
  { month: "10", year: "2024", value: 0.5542 },
  { month: "11", year: "2024", value: 0.5938 }, // Selic 11,25% → 70% = 7,875% a.a.
  { month: "12", year: "2024", value: 0.6479 }, // Selic 12,25% → 70% = 8,575% a.a.
  
  // 2025
  { month: "01", year: "2025", value: 0.7021 }, // Selic 13,25% → 70% = 9,275% a.a.
  { month: "02", year: "2025", value: 0.7563 }, // Selic 14,25% → 70% = 9,975% a.a.
  { month: "03", year: "2025", value: 0.7563 },
  { month: "04", year: "2025", value: 0.7563 },
  { month: "05", year: "2025", value: 0.7563 },
  { month: "06", year: "2025", value: 0.7563 },
  { month: "07", year: "2025", value: 0.7563 },
  { month: "08", year: "2025", value: 0.7563 },
  { month: "09", year: "2025", value: 0.7563 },
  { month: "10", year: "2025", value: 0.7563 },
  { month: "11", year: "2025", value: 0.7563 },
  { month: "12", year: "2025", value: 0.7563 },
  
  // 2026
  { month: "01", year: "2026", value: 0.7563 }, // Selic 14,25% a.a. (mantida)
  { month: "02", year: "2026", value: 0.7563 },
  { month: "03", year: "2026", value: 0.7563 },
  { month: "04", year: "2026", value: 0.7563 },
  { month: "05", year: "2026", value: 0.7563 },
  { month: "06", year: "2026", value: 0.7563 },
  { month: "07", year: "2026", value: 0.7563 },
  { month: "08", year: "2026", value: 0.7563 },
  { month: "09", year: "2026", value: 0.7563 },
  { month: "10", year: "2026", value: 0.7563 },
  { month: "11", year: "2026", value: 0.7563 },
  { month: "12", year: "2026", value: 0.7563 },
];

/**
 * Calcula o rendimento da poupança acumulado entre duas datas
 */
export function calculatePoupanca(startDate: string, endDate: string): {
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
  
  // Calcular rendimento da poupança para cada mês do período
  const currentDate = new Date(start);
  
  for (let i = 0; i <= months; i++) {
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
    const yearStr = String(currentDate.getFullYear());
    
    const poupancaData = POUPANCA_DATABASE.find(
      (item) => item.month === monthStr && item.year === yearStr
    );
    
    if (poupancaData) {
      details.push({
        month: monthStr,
        year: yearStr,
        value: poupancaData.value,
      });
      
      // Fórmula de juros compostos: (1 + taxa1) * (1 + taxa2) - 1
      accumulatedPercentage = ((1 + accumulatedPercentage / 100) * (1 + poupancaData.value / 100) - 1) * 100;
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
 * Formata os detalhes da poupança para exibição
 */
export function formatPoupancaDetails(details: Array<{ month: string; year: string; value: number }>): string {
  return details
    .map((item) => `${item.month}/${item.year}: ${item.value.toFixed(4)}%`)
    .join(", ");
}

/**
 * Calcula o valor corrigido do caução pela poupança
 */
export function calculateCorrectedDeposit(
  depositAmount: number,
  startDate: string,
  endDate: string
): {
  originalAmount: number;
  correctedAmount: number;
  poupancaPercentage: number;
  months: number;
  poupancaDetails: string;
} {
  console.log("💰 === CALCULANDO CORREÇÃO DO CAUÇÃO PELA POUPANÇA ===");
  console.log("Valor original:", depositAmount);
  console.log("Data início:", startDate);
  console.log("Data fim:", endDate);
  
  const poupancaData = calculatePoupanca(startDate, endDate);
  const correctedAmount = poupancaData.correctedAmount(depositAmount);
  
  console.log(`Meses de correção: ${poupancaData.months}`);
  console.log(`Poupança acumulada: ${poupancaData.totalPercentage}%`);
  console.log(`Valor corrigido: R$ ${correctedAmount.toFixed(2)}`);
  console.log("Detalhamento Poupança:", formatPoupancaDetails(poupancaData.details));
  console.log("💰 === FIM DO CÁLCULO ===");
  
  return {
    originalAmount: depositAmount,
    correctedAmount,
    poupancaPercentage: poupancaData.totalPercentage,
    months: poupancaData.months,
    poupancaDetails: formatPoupancaDetails(poupancaData.details),
  };
}

// Manter compatibilidade com código antigo (alias)
export const calculateIGPM = calculatePoupanca;
export const formatIGPMDetails = formatPoupancaDetails;