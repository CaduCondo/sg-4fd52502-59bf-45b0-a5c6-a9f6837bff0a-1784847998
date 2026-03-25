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
      let garageDescription = "Garagem";
      
      if (payment?.installment && payment?.total_installments) {
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
            rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments} (${proportionalDays} ${proportionalDays === 1 ? 'dia' : 'dias'})`;
            if (hasGarage) {
              garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          } else {
            rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
            if (hasGarage) {
              garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          }
        } else {
          rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
          if (hasGarage) {
            garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
          }
        }
      }
      
      const result = {
        items: [
          { description: rentalDescription, amount: finalRentalValue },
          ...(hasGarage ? [{ description: garageDescription, amount: finalGarageValue }] : [])
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
            
            if (payment?.installment && payment?.total_installments) {
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
                  description = `${key} - Parcela ${payment.installment}/${payment.total_installments} (${proportionalDays} ${proportionalDays === 1 ? 'dia' : 'dias'})`;
                } else {
                  description = `${key} - Parcela ${payment.installment}/${payment.total_installments}`;
                }
              } else if (value.label) {
                description = `${key} - Parcela ${payment.installment}/${payment.total_installments} (${value.label})`;
              } else {
                description = `${key} - Parcela ${payment.installment}/${payment.total_installments}`;
              }
            }
            
            // 🔥 CORREÇÃO: Garantir que o valor seja sempre numérico e tenha o sinal correto
            let itemAmount = value.value || value.amount || 0;
            const itemType = value.type || "addition";
            
            // Se for dedução, garantir que o valor seja negativo
            if (itemType === "deduction" && itemAmount > 0) {
              itemAmount = -itemAmount;
            }
            // Se for adição, garantir que o valor seja positivo
            if (itemType === "addition" && itemAmount < 0) {
              itemAmount = Math.abs(itemAmount);
            }
            
            itemsArray.push({
              description: description,
              amount: itemAmount,
              value: itemAmount,
              type: itemType
            });
          }
        });
        
        breakdownData = itemsArray;
      }
      
      if (Array.isArray(breakdownData) && breakdownData.length > 0) {
        breakdownData = breakdownData.map(item => {
          let description = item.description || item.label || "";
          
          if (payment?.installment && payment?.total_installments && !description.includes("Parcela")) {
            const isProportional = payment.installment === 1 || 
                                  payment.installment === payment.total_installments;
            
            if (isProportional) {
              const daysMatch = description.match(/\((\d+)\s*dias?\)/i);
              if (daysMatch) {
                const days = daysMatch[1];
                const baseDesc = description.replace(/\s*\(\d+\s*dias?\)/i, '').trim();
                description = `${baseDesc} - Parcela ${payment.installment}/${payment.total_installments} (${days} ${days === '1' ? 'dia' : 'dias'})`;
              } else {
                description = `${description} - Parcela ${payment.installment}/${payment.total_installments}`;
              }
            } else {
              description = `${description} - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          }
          
          // 🔥 CORREÇÃO: Garantir que o valor tenha o sinal correto baseado no tipo
          let itemAmount = item.extraValue || item.value || item.amount || 0;
          const itemType = item.type || "addition";
          
          // Se for dedução, garantir que o valor seja negativo
          if (itemType === "deduction" && itemAmount > 0) {
            itemAmount = -itemAmount;
          }
          // Se for adição, garantir que o valor seja positivo
          if (itemType === "addition" && itemAmount < 0) {
            itemAmount = Math.abs(itemAmount);
          }
          
          return {
            label: item.label || description,
            description: description,
            amount: itemAmount,
            value: itemAmount,
            extraValue: item.extraValue,
            type: itemType
          };
        });
      }
      
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
        let garageDescription = "Garagem";
        
        if (payment?.installment && payment?.total_installments) {
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
              rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments} (${proportionalDays} ${proportionalDays === 1 ? 'dia' : 'dias'})`;
              if (hasGarage) {
                garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
              }
            } else {
              rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
              if (hasGarage) {
                garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
              }
            }
          } else {
            rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
            if (hasGarage) {
              garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          }
        }
        
        const result = {
          items: [
            { description: rentalDescription, amount: finalRentalValue },
            ...(hasGarage ? [{ description: garageDescription, amount: finalGarageValue }] : [])
          ],
          total: total,
          hasMultipleItems: hasGarage
        };
        
        console.log("✅ [usePaymentBreakdown] EMPTY BREAKDOWN ARRAY - Returning:", result);
        return result;
      }

      const hasMultipleItems = breakdownData.length > 1;
      
      // 🔥 CORREÇÃO CRÍTICA: Calcular o total somando valores com seus sinais corretos
      const total = breakdownData.reduce((sum: number, item: any) => {
        const itemValue = item.value || item.amount || 0;
        return sum + itemValue;
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
      let garageDescription = "Garagem";
      
      if (payment?.installment && payment?.total_installments) {
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
            rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments} (${proportionalDays} ${proportionalDays === 1 ? 'dia' : 'dias'})`;
            if (hasGarage) {
              garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          } else {
            rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
            if (hasGarage) {
              garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
            }
          }
        } else {
          rentalDescription = `Aluguel - Parcela ${payment.installment}/${payment.total_installments}`;
          if (hasGarage) {
            garageDescription = `Garagem - Parcela ${payment.installment}/${payment.total_installments}`;
          }
        }
      }
      
      return {
        items: [
          { description: rentalDescription, amount: finalRentalValue },
          ...(hasGarage ? [{ description: garageDescription, amount: finalGarageValue }] : [])
        ],
        total: total,
        hasMultipleItems: hasGarage
      };
    }
  }, [payment, rentalValue, garageValue]);
}