import { useMemo } from "react";
import type { Payment, Property } from "@/types";

interface UseChartDataParams {
  payments: Payment[];
  properties: Property[];
  selectedMonth: number;
  selectedYear: number;
  locationExpenses: number;
  exemptLocationIds: string[];
  rentalMap: Map<string, any>;
  propertyMap: Map<string, any>;
}

export function useChartData({
  payments,
  properties,
  selectedMonth,
  selectedYear,
  locationExpenses,
  exemptLocationIds,
  rentalMap,
  propertyMap
}: UseChartDataParams) {
  return useMemo(() => {
    // Gerar últimos 6 meses
    const months: Array<{ month: number; year: number; label: string }> = [];
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      });
    }

    const exemptSet = new Set(exemptLocationIds);
    
    const isCurrentMonth = (month: number, year: number) => 
      month === selectedMonth && year === selectedYear;

    const getMonthPayments = (month: number, year: number) => 
      payments.filter(p => {
        if (p.status !== 'paid' || !p.paymentDate) return false;
        const pDate = new Date(p.paymentDate);
        return pDate.getMonth() + 1 === month && pDate.getFullYear() === year;
      });

    const calculateFees = (monthPayments: Payment[]) => 
      monthPayments.reduce((sum, p) => {
        const rental = rentalMap.get(p.rentalId);
        if (!rental) return sum;
        
        const property = propertyMap.get(rental.propertyId);
        const isExempt = property?.locationId && exemptSet.has(property.locationId);
        const adminFee = isExempt ? 0 : (p.paidAmount || 0) * 0.05;
        const managementFee = (p.paidAmount || 0) * 0.03;
        return sum + adminFee + managementFee;
      }, 0);

    // Dados de receita mensal
    const monthlyRevenueData = months.map(({ month, year, label }) => {
      const monthPayments = getMonthPayments(month, year);
      const bruta = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const monthTaxas = calculateFees(monthPayments);
      const monthExpenses = isCurrentMonth(month, year) ? locationExpenses : 0;
      const liquida = bruta - monthTaxas - monthExpenses;
      
      return { month: label, bruta, liquida };
    });

    // Dados de despesas mensais
    const monthlyExpensesData = months.map(({ month, year, label }) => {
      const monthPayments = getMonthPayments(month, year);
      const taxas = calculateFees(monthPayments);
      const contas = isCurrentMonth(month, year) ? locationExpenses : 0;
      
      return { month: label, taxas, contas };
    });

    // Dados de ocupação
    const occupiedProps = properties.filter(p => p.status === 'occupied').length;
    const availableProps = properties.filter(p => p.status === 'available').length;
    const unavailableProps = properties.filter(p => p.status === 'unavailable').length;

    const occupancyPieData = [
      { name: 'Ocupados', value: occupiedProps, color: '#10b981' },
      { name: 'Disponíveis', value: availableProps, color: '#3b82f6' },
      { name: 'Indisponíveis', value: unavailableProps, color: '#ef4444' }
    ].filter(item => item.value > 0);

    return {
      monthlyRevenueData,
      monthlyExpensesData,
      occupancyPieData
    };
  }, [
    payments,
    properties,
    selectedMonth,
    selectedYear,
    locationExpenses,
    exemptLocationIds,
    rentalMap,
    propertyMap
  ]);
}