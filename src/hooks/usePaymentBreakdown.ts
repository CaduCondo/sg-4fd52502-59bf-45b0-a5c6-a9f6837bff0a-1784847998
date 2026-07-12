import { useMemo } from "react";

interface UsePaymentBreakdownParams {
  payment: any;
  rentalValue: number;
  garageValue: number;
}

interface BreakdownItem {
  description: string;
  amount: number;
  value?: number;
}

export function usePaymentBreakdown({ payment, rentalValue, garageValue }: UsePaymentBreakdownParams) {
  return useMemo(() => {
    if (!payment) {
      return {
        items: [],
        total: 0,
      };
    }

    let items: BreakdownItem[] = [];

    // Tentar extrair do breakdown existente
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;
        
        if (Array.isArray(breakdownData)) {
          items = breakdownData.map((item: any) => ({
            description: item.description || '',
            amount: item.amount || item.value || 0,
          }));
        }
      } catch (error) {
        console.error("Erro ao fazer parse do breakdown:", error);
      }
    }

    // Se não houver breakdown válido, criar um básico
    if (items.length === 0) {
      items = [
        {
          description: "Aluguel",
          amount: rentalValue,
        }
      ];

      if (garageValue > 0) {
        items.push({
          description: "Garagem",
          amount: garageValue,
        });
      }
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      items,
      total: Math.round(total * 100) / 100,
    };
  }, [payment, rentalValue, garageValue]);
}