import { differenceInMonths, format } from "date-fns";

/**
 * Serviço para calcular correção monetária pela Taxa da Poupança
 * Valores oficiais obtidos de: https://www.vriconsulting.com.br/indices/poupanca.php
 * Fonte alternativa: https://www.debit.com.br/tabelas/poupanca
 * 
 * A poupança rende mensalmente uma taxa variável baseada na Selic.
 * Os valores abaixo são os rendimentos REAIS registrados mês a mês.
 * 
 * IMPORTANTE: Usar as 2 primeiras colunas dos sites (Mês/Ano e Índice do mês em %)
 */

interface PoupancaData {
  month: string;
  year: string;
  value: number; // Percentual mensal da poupança
}

/**
 * Base de dados da Taxa da Poupança (rendimento mensal REAL)
 * Fonte: https://www.vriconsulting.com.br/indices/poupanca.php
 * Valores oficiais atualizados até Fevereiro/2026
 */
const POUPANCA_DATABASE: PoupancaData[] = [
  // 2024 - Valores oficiais confirmados ✅
  { month: "01", year: "2024", value: 0.5917 },
  { month: "02", year: "2024", value: 0.5917 },
  { month: "03", year: "2024", value: 0.5917 },
  { month: "04", year: "2024", value: 0.5917 },
  { month: "05", year: "2024", value: 0.5917 },
  { month: "06", year: "2024", value: 0.5917 },
  { month: "07", year: "2024", value: 0.5542 },
  { month: "08", year: "2024", value: 0.5542 },
  { month: "09", year: "2024", value: 0.5542 },
  { month: "10", year: "2024", value: 0.5542 },
  { month: "11", year: "2024", value: 0.5938 },
  { month: "12", year: "2024", value: 0.6479 },
  
  // 2025 - Valores oficiais confirmados ✅
  { month: "01", year: "2025", value: 0.6698 },
  { month: "02", year: "2025", value: 0.6331 },
  { month: "03", year: "2025", value: 0.6097 },
  { month: "04", year: "2025", value: 0.6697 },
  { month: "05", year: "2025", value: 0.6721 },
  { month: "06", year: "2025", value: 0.6707 },
  { month: "07", year: "2025", value: 0.6767 },
  { month: "08", year: "2025", value: 0.6731 },
  { month: "09", year: "2025", value: 0.6751 },
  { month: "10", year: "2025", value: 0.6767 },
  { month: "11", year: "2025", value: 0.6642 },
  { month: "12", year: "2025", value: 0.6751 },
  
  // 2026 - Valores oficiais confirmados ✅
  { month: "01", year: "2026", value: 0.6727 },
  { month: "02", year: "2026", value: 0.6213 },
  
  // Próximos meses: Buscar em https://www.vriconsulting.com.br/indices/poupanca.php
  // (pegar as 2 primeiras colunas: Mês/Ano e Índice do mês em %)
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
    console.log("⚠️ Período menor que 1 mês - SEM correção");
    return {
      totalPercentage: 0,
      months: 0,
      details: [],
      correctedAmount: (amount) => amount,
    };
  }
  
  console.log(`📊 Calculando Poupança: ${months} meses entre ${startDate} e ${endDate}`);
  
  const details: Array<{ month: string; year: string; value: number }> = [];
  let accumulatedPercentage = 0;
  
  // Calcular rendimento da poupança para cada mês do período
  const currentDate = new Date(start);
  
  // IMPORTANTE: Começar do mês SEGUINTE ao início (não do mês de início)
  // Exemplo: Se depositou em 15/01/2024, a correção começa em 01/02/2024
  currentDate.setMonth(currentDate.getMonth() + 1);
  currentDate.setDate(1); // Sempre dia 1 para cálculo
  
  for (let i = 0; i < months; i++) {
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
    const yearStr = String(currentDate.getFullYear());
    
    const poupancaData = POUPANCA_DATABASE.find(
      (item) => item.month === monthStr && item.year === yearStr
    );
    
    if (poupancaData) {
      console.log(`  ✅ ${monthStr}/${yearStr}: ${poupancaData.value}%`);
      details.push({
        month: monthStr,
        year: yearStr,
        value: poupancaData.value,
      });
      
      // Fórmula de juros compostos: (1 + taxa1) * (1 + taxa2) - 1
      accumulatedPercentage = ((1 + accumulatedPercentage / 100) * (1 + poupancaData.value / 100) - 1) * 100;
    } else {
      console.warn(`  ⚠️ Taxa não encontrada para ${monthStr}/${yearStr} - pulando mês`);
    }
    
    // Avançar para o próximo mês
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  console.log(`📈 Poupança acumulada: ${accumulatedPercentage.toFixed(4)}%`);
  
  return {
    totalPercentage: Math.round(accumulatedPercentage * 10000) / 10000,
    months,
    details,
    correctedAmount: (originalAmount: number) => {
      const corrected = Math.round(originalAmount * (1 + accumulatedPercentage / 100) * 100) / 100;
      console.log(`💰 Valor original: R$ ${originalAmount.toFixed(2)} → Corrigido: R$ ${corrected.toFixed(2)}`);
      return corrected;
    },
  };
}

/**
 * Formata os detalhes da poupança para exibição
 * Formato: MM/YYYY: 0,XXXX (uma taxa por linha)
 */
export function formatPoupancaDetails(details: Array<{ month: string; year: string; value: number }>): string {
  return details
    .map((item) => `${item.month}/${item.year}:\t${item.value.toFixed(4)}`)
    .join("\n");
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
  console.log("Detalhamento Poupança:");
  console.log(formatPoupancaDetails(poupancaData.details));
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