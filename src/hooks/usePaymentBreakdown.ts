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
      expectedAmount: payment?.expected_amount,
      installment: payment?.installment,
      totalInstallments: payment?.total_installments
    });

    if (!payment || !payment.breakdown) {
      const hasGarage = garageValue > 0;
      
      // Verificar se é proporcional baseado na parcela (1ª ou última)
      const isProportional = payment?.installment === 1 || 
                            payment?.installment === payment?.total_installments;
      
      let finalRentalValue = rentalValue;
      let finalGarageValue = garageValue;
      
      if (isProportional && payment?.expected_amount) {
        const totalExpected = payment.expected_amount;
        
        if (hasGarage) {
          // Manter proporção original entre aluguel e garagem
          const totalOriginal = rentalValue + garageValue;
          const proportionRental = rentalValue / totalOriginal;
          const proportionGarage = garageValue / totalOriginal;
          
          finalRentalValue = totalExpected * proportionRental;
          finalGarageValue = totalExpected * proportionGarage;
        } else {
          finalRentalValue = totalExpected;
          finalGarageValue = 0;
        }
      }
      
      const total = finalRentalValue + finalGarageValue;
      
      // Calcular dias proporcionais para exibição
      let rentalDescription = "Aluguel";
      
      if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
        const startDate = new Date(payment.rentals.start_date);
        const dueDate = new Date(payment.due_date);
        const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
        
        let proportionalDays = 0;
        
        if (payment.installment === 1) {
          // Primeira parcela: contar do início até o vencimento
          const diffTime = dueDate.getTime() - startDate.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (endDate && payment.installment === payment.total_installments) {
          // Última parcela: contar dias do mês final
          proportionalDays = endDate.getDate();
        }
        
        if (proportionalDays > 0 && proportionalDays < 31) {
          rentalDescription = `Aluguel - Parcela ${payment.installment} (${proportionalDays} dias)`;
        } else {
          rentalDescription = `Aluguel - Parcela ${payment.installment}`;
        }
      } else if (payment?.installment) {
        rentalDescription = `Aluguel - Parcela ${payment.installment}`;
      }
      
      const result = {
        items: [
          { description: rentalDescription, amount: finalRentalValue },
          ...(hasGarage ? [{ description: "Garagem", amount: finalGarageValue }] : [])
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
      
      // Converter objeto em array se necessário
      if (!Array.isArray(breakdownData) && typeof breakdownData === 'object') {
        const itemsArray: any[] = [];
        
        Object.entries(breakdownData).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            let description = key;
            
            // Processar label PROPORCIONAL
            if (value.label === "PROPORCIONAL") {
              const dueDate = payment.due_date ? new Date(payment.due_date) : null;
              const startDate = payment.rentals?.start_date ? new Date(payment.rentals.start_date) : null;
              const endDate = payment.rentals?.end_date ? new Date(payment.rentals.end_date) : null;
              
              let proportionalDays = 0;
              
              if (payment.installment === 1 && dueDate && startDate) {
                const diffTime = dueDate.getTime() - startDate.getTime();
                proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              } else if (endDate && payment.installment === payment.total_installments) {
                proportionalDays = endDate.getDate();
              }
              
              if (proportionalDays > 0) {
                description = `${key} - Parcela ${payment.installment} (${proportionalDays} dias)`;
              } else {
                description = `${key} - Parcela ${payment.installment} (proporcional)`;
              }
            } else if (value.label) {
              description = `${key} - Parcela ${payment.installment} (${value.label})`;
            } else if (payment?.installment) {
              description = `${key} - Parcela ${payment.installment}`;
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
      
      // Processar array de breakdown
      if (Array.isArray(breakdownData) && breakdownData.length > 0) {
        breakdownData = breakdownData.map(item => {
          let description = item.description || item.label || "";
          
          // Adicionar informação de parcela se não estiver presente
          if (payment?.installment && !description.includes("Parcela")) {
            const isProportional = payment.installment === 1 || 
                                  payment.installment === payment.total_installments;
            
            if (isProportional) {
              // Extrair dias se estiver no formato "(X dias)"
              const daysMatch = description.match(/\((\d+)\s*dias?\)/i);
              if (daysMatch) {
                const days = daysMatch[1];
                const baseDesc = description.replace(/\s*\(\d+\s*dias?\)/i, '').trim();
                description = `${baseDesc} - Parcela ${payment.installment} (${days} dias)`;
              } else {
                description = `${description} - Parcela ${payment.installment}`;
              }
            } else {
              description = `${description} - Parcela ${payment.installment}`;
            }
          }
          
          return {
            label: item.label || description,
            description: description,
            amount: item.extraValue || item.value || item.amount || 0,
            value: item.extraValue || item.value || item.amount || 0,
            extraValue: item.extraValue,
            type: item.type || "addition"
          };
        });
      }
      
      // Fallback caso breakdown esteja vazio
      if (!Array.isArray(breakdownData) || breakdownData.length === 0) {
        const hasGarage = garageValue > 0;
        
        const isProportional = payment?.installment === 1 || 
                              payment?.installment === payment?.total_installments;
        
        let finalRentalValue = rentalValue;
        let finalGarageValue = garageValue;
        
        if (isProportional && payment?.expected_amount) {
          const totalExpected = payment.expected_amount;
          
          if (hasGarage) {
            const totalOriginal = rentalValue + garageValue;
            const proportionRental = rentalValue / totalOriginal;
            const proportionGarage = garageValue / totalOriginal;
            
            finalRentalValue = totalExpected * proportionRental;
            finalGarageValue = totalExpected * proportionGarage;
          } else {
            finalRentalValue = totalExpected;
            finalGarageValue = 0;
          }
        }
        
        const total = finalRentalValue + finalGarageValue;
        
        let rentalDescription = "Aluguel";
        
        if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
          const startDate = new Date(payment.rentals.start_date);
          const dueDate = new Date(payment.due_date);
          const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
          
          let proportionalDays = 0;
          
          if (payment.installment === 1) {
            const diffTime = dueDate.getTime() - startDate.getTime();
            proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          } else if (endDate && payment.installment === payment.total_installments) {
            proportionalDays = endDate.getDate();
          }
          
          if (proportionalDays > 0 && proportionalDays < 31) {
            rentalDescription = `Aluguel - Parcela ${payment.installment} (${proportionalDays} dias)`;
          } else {
            rentalDescription = `Aluguel - Parcela ${payment.installment}`;
          }
        } else if (payment?.installment) {
          rentalDescription = `Aluguel - Parcela ${payment.installment}`;
        }
        
        const result = {
          items: [
            { description: rentalDescription, amount: finalRentalValue },
            ...(hasGarage ? [{ description: "Garagem", amount: finalGarageValue }] : [])
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
      
      const isProportional = payment?.installment === 1 || 
                            payment?.installment === payment?.total_installments;
      
      let finalRentalValue = rentalValue;
      let finalGarageValue = garageValue;
      
      if (isProportional && payment?.expected_amount) {
        const totalExpected = payment.expected_amount;
        
        if (hasGarage) {
          const totalOriginal = rentalValue + garageValue;
          const proportionRental = rentalValue / totalOriginal;
          const proportionGarage = garageValue / totalOriginal;
          
          finalRentalValue = totalExpected * proportionRental;
          finalGarageValue = totalExpected * proportionGarage;
        } else {
          finalRentalValue = totalExpected;
          finalGarageValue = 0;
        }
      }
      
      const total = finalRentalValue + finalGarageValue;
      
      let rentalDescription = "Aluguel";
      
      if (isProportional && payment?.rentals?.start_date && payment?.due_date) {
        const startDate = new Date(payment.rentals.start_date);
        const dueDate = new Date(payment.due_date);
        const endDate = payment.rentals.end_date ? new Date(payment.rentals.end_date) : null;
        
        let proportionalDays = 0;
        
        if (payment.installment === 1) {
          const diffTime = dueDate.getTime() - startDate.getTime();
          proportionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (endDate && payment.installment === payment.total_installments) {
          proportionalDays = endDate.getDate();
        }
        
        if (proportionalDays > 0 && proportionalDays < 31) {
          rentalDescription = `Aluguel - Parcela ${payment.installment} (${proportionalDays} dias)`;
        } else {
          rentalDescription = `Aluguel - Parcela ${payment.installment}`;
        }
      } else if (payment?.installment) {
        rentalDescription = `Aluguel - Parcela ${payment.installment}`;
      }
      
      return {
        items: [
          { description: rentalDescription, amount: finalRentalValue },
          ...(hasGarage ? [{ description: "Garagem", amount: finalGarageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
    }
  }, [payment, rentalValue, garageValue]);
}