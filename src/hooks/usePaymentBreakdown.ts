import { useMemo } from "react";

interface UsePaymentBreakdownParams {
  payment: any;
  rentalValue: number;
  garageValue: number;
}

export function usePaymentBreakdown({ payment, rentalValue, garageValue }: UsePaymentBreakdownParams) {
  return useMemo(() => {
    if (!payment || !payment.breakdown) {
      const hasGarage = garageValue > 0;
      const total = rentalValue + garageValue;
      
      return {
        items: [
          { description: "Valor Aluguel", amount: rentalValue },
          ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
    }

    try {
      const breakdownData = typeof payment.breakdown === 'string' 
        ? JSON.parse(payment.breakdown) 
        : (payment.breakdown || []);
      
      if (!Array.isArray(breakdownData) || breakdownData.length === 0) {
        const hasGarage = garageValue > 0;
        const total = rentalValue + garageValue;
        
        return {
          items: [
            { description: "Valor Aluguel", amount: rentalValue },
            ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
          ],
          total: total,
          hasMultipleItems: hasGarage
        };
      }

      const hasMultipleItems = breakdownData.length > 1;
      const total = breakdownData.reduce((sum: number, item: any) => {
        return sum + (item.value || item.amount || 0);
      }, 0);

      return {
        items: breakdownData,
        total: total,
        hasMultipleItems: hasMultipleItems
      };
    } catch (error) {
      console.error("Erro ao processar breakdown:", error);
      const hasGarage = garageValue > 0;
      const total = rentalValue + garageValue;
      
      return {
        items: [
          { description: "Valor Aluguel", amount: rentalValue },
          ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
    }
  }, [payment, rentalValue, garageValue]);
}