import { useMemo } from "react";

interface UsePaymentBreakdownParams {
  payment: any;
  rentalValue: number;
  garageValue: number;
}

export function usePaymentBreakdown({ payment, rentalValue, garageValue }: UsePaymentBreakdownParams) {
  return useMemo(() => {
    console.log("🔍 [usePaymentBreakdown] Input values:", { 
      rentalValue, 
      garageValue,
      paymentBreakdown: payment?.breakdown,
      expectedAmount: payment?.expected_amount 
    });

    if (!payment || !payment.breakdown) {
      const hasGarage = garageValue > 0;
      const total = rentalValue + garageValue;
      
      const isProportional = payment?.installment === null || 
                            payment?.installment === 1 || 
                            payment?.installment === payment?.total_installments;
      
      let rentalDescription = "Aluguel";
      
      if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
        const startDate = new Date(payment.rentals.start_date);
        const dueDate = new Date(payment.due_date);
        const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
        
        let proportionalDays = 0;
        
        if (payment.installment === null || payment.installment === 1) {
          const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          const diffTime = endOfMonth.getTime() - startDate.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else if (endDate && payment.installment === payment.total_installments) {
          const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          const diffTime = endDate.getTime() - startOfMonth.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        if (proportionalDays > 0 && proportionalDays < 31) {
          rentalDescription = `Aluguel (${proportionalDays} dias)`;
        }
      }
      
      const result = {
        items: [
          { description: rentalDescription, amount: rentalValue },
          ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
      
      console.log("✅ [usePaymentBreakdown] NO BREAKDOWN - Returning:", result);
      return result;
    }

    try {
      let breakdownData = typeof payment.breakdown === 'string' 
        ? JSON.parse(payment.breakdown) 
        : (payment.breakdown || {});
      
      if (!Array.isArray(breakdownData) && typeof breakdownData === 'object') {
        const itemsArray: any[] = [];
        
        Object.entries(breakdownData).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            let description = key;
            
            if (value.label === "PROPORCIONAL") {
              const dueDate = payment.due_date ? new Date(payment.due_date) : null;
              const startDate = payment.rentals?.start_date ? new Date(payment.rentals.start_date) : null;
              const endDate = payment.rentals?.end_date ? new Date(payment.rentals.end_date) : null;
              
              let proportionalDays = 0;
              
              if (dueDate && startDate) {
                const diffTime = dueDate.getTime() - startDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                if (diffDays > 0 && diffDays < 31) {
                  proportionalDays = diffDays;
                }
              }
              
              if (proportionalDays === 0 && dueDate && endDate) {
                const diffTime = endDate.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                if (diffDays > 0 && diffDays < 31) {
                  proportionalDays = diffDays;
                }
              }
              
              if (proportionalDays > 0) {
                description = `${key} (${proportionalDays} dias)`;
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
      
      const isProportional = payment?.installment === null || 
                            payment?.installment === 1 || 
                            payment?.installment === payment?.total_installments;
      
      let rentalDescription = "Aluguel";
      
      if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
        const startDate = new Date(payment.rentals.start_date);
        const dueDate = new Date(payment.due_date);
        const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
        
        let proportionalDays = 0;
        
        if (payment.installment === null || payment.installment === 1) {
          const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          const diffTime = endOfMonth.getTime() - startDate.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else if (endDate && payment.installment === payment.total_installments) {
          const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          const diffTime = endDate.getTime() - startOfMonth.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        if (proportionalDays > 0 && proportionalDays < 31) {
          rentalDescription = `Aluguel (${proportionalDays} dias)`;
        }
      }

      if (Array.isArray(breakdownData) && breakdownData.length > 0) {
        // 🚀 CORREÇÃO CRUCIAL: Se o JSON no banco estiver com valor cheio, 
        // nós forçamos a usar o valor proporcional correto (rentalValue)
        breakdownData = breakdownData.map(item => {
          const desc = (item.description || '').toLowerCase();
          
          if (desc.includes('aluguel') && !desc.includes('desconto')) {
            return {
              ...item,
              description: rentalDescription,
              amount: rentalValue,
              value: rentalValue
            };
          }
          
          if (desc.includes('vaga') || desc.includes('garagem')) {
            return {
              ...item,
              amount: garageValue,
              value: garageValue
            };
          }
          
          return item;
        });
      }
      
      if (!Array.isArray(breakdownData) || breakdownData.length === 0) {
        const hasGarage = garageValue > 0;
        const total = rentalValue + garageValue;
        
        const isProportional = payment?.installment === null || 
                              payment?.installment === 1 || 
                              payment?.installment === payment?.total_installments;
        
        let rentalDescription = "Aluguel";
        
        if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
          const startDate = new Date(payment.rentals.start_date);
          const dueDate = new Date(payment.due_date);
          const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
          
          let proportionalDays = 0;
          
          if (payment.installment === null || payment.installment === 1) {
            const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            const diffTime = endOfMonth.getTime() - startDate.getTime();
            proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          } else if (endDate && payment.installment === payment.total_installments) {
            const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            const diffTime = endDate.getTime() - startOfMonth.getTime();
            proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }
          
          if (proportionalDays > 0 && proportionalDays < 31) {
            rentalDescription = `Aluguel (${proportionalDays} dias)`;
          }
        }
        
        const result = {
          items: [
            { description: rentalDescription, amount: rentalValue },
            ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
          ],
          total: total,
          hasMultipleItems: hasGarage
        };
        
        console.log("✅ [usePaymentBreakdown] EMPTY BREAKDOWN ARRAY - Returning:", result);
        return result;
      }

      const hasMultipleItems = breakdownData.length > 1;
      const total = breakdownData.reduce((sum: number, item: any) => {
        return sum + (item.value || item.amount || 0);
      }, 0);

      const result = {
        items: breakdownData,
        total: total,
        hasMultipleItems: hasMultipleItems
      };
      
      console.log("✅ [usePaymentBreakdown] WITH BREAKDOWN - Returning:", result);
      return result;
    } catch (error) {
      console.error("❌ [usePaymentBreakdown] Error processing breakdown:", error);
      const hasGarage = garageValue > 0;
      const total = rentalValue + garageValue;
      
      const isProportional = payment?.installment === null || 
                            payment?.installment === 1 || 
                            payment?.installment === payment?.total_installments;
      
      let rentalDescription = "Aluguel";
      
      if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
        const startDate = new Date(payment.rentals.start_date);
        const dueDate = new Date(payment.due_date);
        const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
        
        let proportionalDays = 0;
        
        if (payment.installment === null || payment.installment === 1) {
          const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          const diffTime = endOfMonth.getTime() - startDate.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else if (endDate && payment.installment === payment.total_installments) {
          const startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          const diffTime = endDate.getTime() - startOfMonth.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        if (proportionalDays > 0 && proportionalDays < 31) {
          rentalDescription = `Aluguel (${proportionalDays} dias)`;
        }
      }
      
      return {
        items: [
          { description: rentalDescription, amount: rentalValue },
          ...(hasGarage ? [{ description: "Valor Vaga", amount: garageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
    }
  }, [payment, rentalValue, garageValue]);
}