import { useMemo } from "react";

interface PaymentFormData {
  payment_date: string;
  amount_to_pay: string;
}

interface CalculateValuesParams {
  payment: any;
  formData: PaymentFormData;
  rentalValue: number;
  garageValue: number;
  isTerminationPayment: boolean;
  originalBreakdown: any[];
  removeFees: boolean;
  lateFeePercentage: number;
  interestRatePercentage: number;
}

export function usePaymentCalculations({
  payment,
  formData,
  rentalValue,
  garageValue,
  isTerminationPayment,
  originalBreakdown,
  removeFees,
  lateFeePercentage,
  interestRatePercentage,
}: CalculateValuesParams) {
  return useMemo(() => {
    let rentalBaseValue = rentalValue;
    let garageBaseValue = garageValue;
    
    if (payment?.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : (payment.breakdown || []);
          
        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
           const totalBreakdown = breakdownData.reduce((sum: number, item: any) => {
             return sum + (item.value || item.amount || 0);
           }, 0);
           if (totalBreakdown > 0) {
             rentalBaseValue = totalBreakdown;
             garageBaseValue = 0;
           }
        }
      } catch (e) {
        console.error("Erro parse breakdown calculateValues", e);
      }
    }

    const valorAluguel = Math.round((rentalBaseValue + garageBaseValue) * 100) / 100;
    
    let isProportional = false;
    let proportionalDays = 0;
    
    if (payment?.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : (payment.breakdown || []);
        
        if (Array.isArray(breakdownData)) {
          const proportionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional")
          );
          
          if (proportionalItem) {
            isProportional = true;
            const match = proportionalItem.description.match(/\((\d+)\s+dias?\)/);
            if (match) {
              proportionalDays = parseInt(match[1]);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar proporcional:", error);
      }
    }
    
    let multa = 0;
    let juros = 0;
    let diasAtraso = 0;

    if (payment && formData.payment_date) {
      const dueDateStr = payment.due_date;
      const paymentDateStr = formData.payment_date;
      
      const dueDate = new Date(dueDateStr + "T12:00:00");
      const paymentDate = new Date(paymentDateStr + "T12:00:00");

      if (paymentDate > dueDate) {
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let baseCalculo = 0;
        
        if (isTerminationPayment && originalBreakdown.length > 0) {
          baseCalculo = originalBreakdown
            .filter(item => 
              !item.description?.includes("Multa por Atraso") &&
              !item.description?.includes("Juros por Atraso") &&
              !item.description?.includes("Despesas")
            )
            .reduce((sum, item) => sum + item.amount, 0);
          
          baseCalculo = Math.abs(baseCalculo);
        } else {
          baseCalculo = Math.max(0, valorAluguel);
        }

        if (baseCalculo > 0) {
          multa = Math.round((baseCalculo * lateFeePercentage / 100) * 100) / 100;
          const jurosDiario = interestRatePercentage;
          juros = Math.round((baseCalculo * jurosDiario / 100 * diasAtraso) * 100) / 100;
        }
      }
    }

    const valorTotalSemIsencao = Math.round((valorAluguel + multa + juros) * 100) / 100;
    const valorAPagar = removeFees ? valorAluguel : valorTotalSemIsencao;
    
    const valorJaPago = payment?.paid_amount || 0;
    const valorRestante = Math.max(0, Math.round((valorAPagar - valorJaPago) * 100) / 100);

    return {
      valorAluguel: Math.round(valorAluguel * 100) / 100,
      multa: Math.round(multa * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      valorTotal: Math.round(valorTotalSemIsencao * 100) / 100,
      valorAPagar: Math.round(valorAPagar * 100) / 100,
      valorJaPago: Math.round(valorJaPago * 100) / 100,
      valorRestante: Math.round(valorRestante * 100) / 100,
      diasAtraso,
      jurosDiario: interestRatePercentage,
      isProportional,
      proportionalDays,
    };
  }, [
    payment,
    formData.payment_date,
    rentalValue,
    garageValue,
    isTerminationPayment,
    originalBreakdown,
    removeFees,
    lateFeePercentage,
    interestRatePercentage,
  ]);
}