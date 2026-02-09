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
      
      // Query otimizada: busca tudo em uma única query com joins
      const { data: paymentsWithRelations, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            id,
            property_id,
            tenant_id,
            status,
            start_date,
            end_date,
            properties!inner (
              id,
              location_id,
              complement,
              locations!inner (
                name
              )
            ),
            tenants!inner (
              id,
              name,
              phone
            )
          )
        `)
        .order("due_date", { ascending: true });

      if (paymentsError) throw paymentsError;

      console.log("🔍 DEBUG: Dados retornados do Supabase:");
      console.log("📊 Total de pagamentos:", paymentsWithRelations?.length || 0);
      
      // Mostrar os primeiros 3 pagamentos como exemplo
      if (paymentsWithRelations && paymentsWithRelations.length > 0) {
        console.log("📋 Exemplo de pagamentos (primeiros 3):");
        paymentsWithRelations.slice(0, 3).forEach((p: any, index: number) => {
          console.log(`Pagamento ${index + 1}:`, {
            id: p.id,
            due_date: p.due_date,
            reference_month: p.reference_month,
            reference_year: p.reference_year,
            status: p.status,
            expected_amount: p.expected_amount
          });
        });
      }

      // Mapear dados para os estados
      const mappedPayments: Payment[] = [];
      const rentalsMap = new Map<string, Rental>();
      const propertiesMap = new Map<string, Property>();
      const tenantsMap = new Map<string, Tenant>();

      paymentsWithRelations?.forEach((p: any) => {
        // Mapear payment
        mappedPayments.push({
          id: p.id,
          rentalId: p.rental_id,
          dueDate: p.due_date,
          expectedAmount: p.expected_amount,
          paidAmount: p.paid_amount || 0,
          paymentDate: p.payment_date,
          status: p.status,
          paymentMethod: p.payment_method,
          notes: p.notes,
          lateFee: p.late_fee || 0,
          interest: p.interest || 0,
          attachments: (p.attachments as string[]) || [],
          referenceMonth: parseInt(p.reference_month),
          referenceYear: parseInt(p.reference_year),
        });

        // Mapear rental (se ainda não existir)
        if (!rentalsMap.has(p.rentals.id)) {
          rentalsMap.set(p.rentals.id, {
            id: p.rentals.id,
            propertyId: p.rentals.property_id,
            tenantId: p.rentals.tenant_id,
            startDate: p.rentals.start_date || "",
            endDate: p.rentals.end_date || "",
            paymentDay: 1,
            value: 0,
            depositAmount: 0,
            status: p.rentals.status,
            isActive: p.rentals.status === "active",
            attachments: [],
            contractAttachments: [],
            autoRenew: false,
          });
        }

        // Mapear property (se ainda não existir)
        if (!propertiesMap.has(p.rentals.properties.id)) {
          propertiesMap.set(p.rentals.properties.id, {
            id: p.rentals.properties.id,
            locationId: p.rentals.properties.location_id,
            location: p.rentals.properties.locations?.name || "",
            complement: p.rentals.properties.complement || "",
            address: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            zipCode: "",
            rooms: 0,
            bathrooms: 0,
            area: 0,
            status: "occupied",
            value: 0,
          });
        }

        // Mapear tenant (se ainda não existir)
        if (!tenantsMap.has(p.rentals.tenants.id)) {
          tenantsMap.set(p.rentals.tenants.id, {
            id: p.rentals.tenants.id,
            name: p.rentals.tenants.name,
            email: "",
            phone: p.rentals.tenants.phone || "",
            documentType: "cpf",
            document: "",
            cpf: "",
            rg: "",
            status: "active",
          });
        }
      });
      
      setPayments(mappedPayments);
      setRentals(Array.from(rentalsMap.values()));
      setProperties(Array.from(propertiesMap.values()));
      setTenants(Array.from(tenantsMap.values()));
    } catch (error) {
      console.error("Error loading data:", error);
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
    
    // Calcular total de meses baseado no período do contrato
    const startDate = new Date(rental.startDate);
    const endDate = rental.endDate ? new Date(rental.endDate) : new Date();
    
    // Validação crítica: garantir que as datas são válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("❌ Datas inválidas para calcular parcelas:", { startDate: rental.startDate, endDate: rental.endDate });
      return `${rentalPayments.findIndex(p => p.id === payment.id) + 1}/?`;
    }
    
    const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
                      + (endDate.getMonth() - startDate.getMonth()) 
                      + 1;
    
    // Validação: totalMonths deve ser >= 1
    const validTotalMonths = Math.max(1, totalMonths);
    
    // Encontrar a posição do pagamento atual
    const currentPosition = rentalPayments.findIndex(p => p.id === payment.id) + 1;
    
    return `${currentPosition}/${validTotalMonths}`;
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