import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { 
  getAll as getAllPayments, 
  remove as deletePayment, 
  update as updatePayment 
} from "@/services/paymentService";
import { getAll as getAllRentals } from "@/services/rentalService";
import { propertyService, tenantService } from "@/services";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMonths } from "date-fns";

export function usePayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [paymentsData, rentalsData, propertiesData, tenantsData] = await Promise.all([
        getAllPayments(),
        getAllRentals(),
        propertyService.getAll(),
        tenantService.getAll()
      ]);
      
      setPayments(paymentsData);
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading data:", error);
      // Não mostrar toast - pode ser simplesmente que não há dados ainda
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const updatedPayment: Payment = {
        ...payment,
        status: "pending",
        paidAmount: 0,
        paymentDate: null,
        paymentMethod: null,
        paymentLocation: null,
        paymentCode: null,
        notes: null,
      };

      await updatePayment(payment.id, updatedPayment);
      
      toast({
        title: "Sucesso",
        description: "Pagamento cancelado com sucesso!",
      });

      await loadPayments();
    } catch (error) {
      console.error("Error canceling payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment(id);
      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso."
      });
      await loadPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pagamento.",
        variant: "destructive",
      });
    }
  };

  const getPropertyInfo = (rentalId: string) => {
    const rental = rentals.find((r) => r.id === rentalId);
    if (!rental) return null;
    return properties.find((p) => p.id === rental.propertyId);
  };

  const getTenantInfo = (rentalId: string) => {
    const rental = rentals.find((r) => r.id === rentalId);
    if (!rental) return null;
    return tenants.find((t) => t.id === rental.tenantId);
  };

  const getExpectedAmount = (payment: Payment): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate >= today) {
      return payment.expectedAmount;
    }
    
    const totalWithFees = payment.expectedAmount + (payment.lateFee || 0) + (payment.interest || 0);
    return totalWithFees;
  };

  const getPaymentInstallment = (payment: Payment): string => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return "";
    
    // Buscar todos os pagamentos desta locação
    const rentalPayments = payments
      .filter(p => p.rentalId === payment.rentalId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    const totalPayments = rentalPayments.length;
    
    // Encontrar a posição do pagamento atual
    const currentPosition = rentalPayments.findIndex(p => p.id === payment.id) + 1;
    
    return `${currentPosition}/${totalPayments}`;
  };

  const getPaymentById = async (id: string): Promise<Payment | null> => {
    try {
      // Tenta encontrar no estado local primeiro
      const localPayment = payments.find(p => p.id === id);
      if (localPayment) return localPayment;

      // Se não encontrar, busca do banco (útil para acesso direto via URL)
      // Usamos o serviço existente ou query direta se o serviço não tiver getById
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          id,
          rental_id,
          due_date,
          expected_amount,
          status,
          paid_amount,
          payment_date,
          payment_method,
          notes,
          late_fee,
          interest,
          attachments,
          reference_month,
          reference_year,
          created_at,
          updated_at,
          rental: rental_id (
            property: property_id (
              location,
              complement
            )
          )
        `)
        .order("due_date", { ascending: true })
        .eq("id", id)
        .single();
      
      if (paymentsError) throw paymentsError;
      
      // Mapear campos do banco para o tipo Payment
      // Extrair mês e ano da data de vencimento se não vier do banco
      const dueDateObj = new Date(paymentsData.due_date);
      
      return {
        id: paymentsData.id,
        rentalId: paymentsData.rental_id,
        dueDate: paymentsData.due_date,
        amount: paymentsData.expected_amount, // Mapeado de expected_amount
        status: paymentsData.status,
        expectedAmount: paymentsData.expected_amount,
        paidAmount: paymentsData.paid_amount || 0,
        paymentDate: paymentsData.payment_date,
        paymentMethod: paymentsData.payment_method,
        notes: paymentsData.notes,
        discountAmount: 0, // Campo não existente no banco
        penaltyAmount: paymentsData.late_fee, // Mapeado de late_fee
        interestAmount: paymentsData.interest, // Mapeado de interest
        attachments: paymentsData.attachments as string[], // Cast explícito para string[]
        referenceMonth: paymentsData.reference_month || (dueDateObj.getMonth() + 1),
        referenceYear: paymentsData.reference_year || dueDateObj.getFullYear(),
        createdAt: paymentsData.created_at,
        updatedAt: paymentsData.updated_at
      } as Payment;
    } catch (error) {
      console.error("Erro ao buscar pagamento:", error);
      return null;
    }
  };

  return {
    payments,
    rentals,
    properties,
    tenants,
    loading,
    loadPayments,
    handleCancelPayment,
    handleDeletePayment,
    getPropertyInfo,
    getTenantInfo,
    getExpectedAmount,
    getPaymentInstallment,
    getPaymentById,
  };
}