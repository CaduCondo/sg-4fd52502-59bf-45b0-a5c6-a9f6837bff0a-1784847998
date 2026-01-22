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
import { supabase } from "@/lib/supabase";

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
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
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
    
    const startDate = new Date(rental.startDate);
    const dueDate = new Date(payment.dueDate);
    
    const monthsDiff = (dueDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (dueDate.getMonth() - startDate.getMonth()) + 1;
    
    const totalMonths = rental.durationMonths || 0;
    
    return `${monthsDiff}/${totalMonths}`;
  };

  const getPaymentById = async (id: string): Promise<Payment | null> => {
    try {
      // Tenta encontrar no estado local primeiro
      const localPayment = payments.find(p => p.id === id);
      if (localPayment) return localPayment;

      // Se não encontrar, busca do banco (útil para acesso direto via URL)
      // Usamos o serviço existente ou query direta se o serviço não tiver getById
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Mapear campos do banco para o tipo Payment
      return {
        id: data.id,
        rentalId: data.rental_id,
        dueDate: data.due_date,
        amount: data.amount,
        status: data.status,
        expectedAmount: data.amount, // Valor base
        paidAmount: data.paid_amount || 0,
        paymentDate: data.payment_date,
        paymentMethod: data.payment_method,
        notes: data.notes,
        discountAmount: data.discount_amount,
        penaltyAmount: data.penalty_amount,
        interestAmount: data.interest_amount,
        attachments: data.attachments,
        createdAt: data.created_at,
        updatedAt: data.updated_at
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