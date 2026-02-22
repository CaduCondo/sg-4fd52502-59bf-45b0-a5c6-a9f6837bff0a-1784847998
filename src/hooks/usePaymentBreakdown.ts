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
      let breakdownData = typeof payment.breakdown === 'string' 
        ? JSON.parse(payment.breakdown) 
        : (payment.breakdown || {});
      
      // Se for um objeto (novo formato), converter para array
      if (!Array.isArray(breakdownData) && typeof breakdownData === 'object') {
        const itemsArray: any[] = [];
        
        Object.entries(breakdownData).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            let description = key;
            
            // Se for proporcional, calcular e adicionar os dias
            if (value.label === "PROPORCIONAL") {
              const dueDate = payment.due_date ? new Date(payment.due_date) : null;
              const startDate = payment.rentals?.start_date ? new Date(payment.rentals.start_date) : null;
              const endDate = payment.rentals?.end_date ? new Date(payment.rentals.end_date) : null;
              
              let proportionalDays = 0;
              
              // Parcela 1: calcular dias desde início até vencimento
              if (dueDate && startDate) {
                const diffTime = dueDate.getTime() - startDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia inicial
                
                if (diffDays > 0 && diffDays < 31) {
                  proportionalDays = diffDays;
                }
              }
              
              // Última parcela: calcular dias desde vencimento anterior até fim do contrato
              if (proportionalDays === 0 && dueDate && endDate) {
                const diffTime = endDate.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                if (diffDays > 0 && diffDays < 31) {
                  proportionalDays = diffDays;
                }
              }
              
              if (proportionalDays > 0) {
                description = `${key} (proporcional ${proportionalDays} dias)`;
              } else {
                description = `${key} (proporcional)`;
              }
            } else if (value.label) {
              description = `${key} (${value.label})`;
            }
            
            itemsArray.push({
              description: description,
              amount: value.value || value.amount || 0,
              value: value.value || value.amount || 0,
              type: value.type || "addition"
            });
          }
        });
        
        breakdownData = itemsArray;
      }
      
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