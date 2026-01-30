import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Rental, Payment, Property, Tenant } from "@/types";

export function useRentalDetails(rentalId: string) {
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const loadRentalData = async () => {
    try {
      setIsLoading(true);

      // Buscar dados da locação
      const { data: rentalData, error: rentalError } = await supabase
        .from("rentals")
        .select(`
          *,
          tenants (
            id,
            name,
            email,
            phone,
            cpf,
            rg
          ),
          properties (
            id,
            property_identifier,
            complement,
            description,
            rooms,
            bathrooms,
            area,
            value,
            garage_value,
            has_garage,
            has_furniture,
            accepts_pets,
            images,
            locations!properties_location_id_fkey (
              id,
              name,
              city,
              state,
              neighborhood,
              street
            )
          )
        `)
        .eq("id", rentalId)
        .single();

      if (rentalError) throw rentalError;

      if (!rentalData) {
        toast({
          title: "Erro",
          description: "Locação não encontrada",
          variant: "destructive",
        });
        router.push("/rentals");
        return;
      }

      // Buscar propriedade
      const { data: propertyData } = await supabase
        .from("properties")
        .select("*")
        .eq("id", rentalData.property_id)
        .single();

      // Buscar inquilino
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", rentalData.tenant_id)
        .single();

      // Buscar pagamentos
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("rental_id", rentalId)
        .order("due_date", { ascending: true });

      // Dados brutos com type casting para any para facilitar o mapeamento
      // Isso resolve os erros de propriedades que o TS acha que não existem
      const r: any = rentalData;
      const p: any = propertyData;
      const t: any = tenantData;

      // Mapear Rental (Snake Case -> Camel Case)
      const mappedRental: Rental = {
        ...r,
        id: r.id,
        propertyId: r.property_id,
        tenantId: r.tenant_id,
        startDate: r.start_date,
        endDate: r.end_date,
        rentAmount: r.rent_amount || r.value || 0,
        condominiumFee: r.condominium_fee || 0,
        iptuFee: r.iptu_fee || 0,
        depositAmount: r.deposit_amount,
        paymentDay: r.payment_day,
        autoRenew: r.auto_renew,
        installments: r.installments,
        status: r.status as Rental["status"],
        attachments: (r.attachments as string[]) || [],
        contractAttachments: (r.contract_attachments as string[]) || [],
      };

      // Mapear Property
      const mappedProperty: Property = {
        ...p,
        id: p.id,
        locationId: p.location_id,
        address: p.street || p.address || "", // Fallback
        hasGarage: p.has_garage,
        monthlyRent: p.monthly_rent || p.value || 0,
        garageValue: p.garage_value || 0,
        hasFurniture: p.has_furniture,
        acceptsPets: p.accepts_pets,
        status: p.status as Property["status"],
        images: (p.images as string[]) || [],
      };

      // Mapear Tenant
      const mappedTenant: Tenant = {
        ...t,
        id: t.id,
        documentType: (t.document_type as "cpf" | "cnpj") || "cpf",
        document: t.document || t.cpf || t.cnpj || "",
        status: t.status as Tenant["status"],
        active: t.is_active !== undefined ? t.is_active : (t.status === 'active'),
      };

      // Mapear Payments
      const mappedPayments: Payment[] = (paymentsData || []).map((pay: any) => ({
        ...pay,
        id: pay.id,
        rentalId: pay.rental_id,
        dueDate: pay.due_date,
        expectedAmount: pay.expected_amount || pay.amount || 0,
        paidAmount: pay.paid_amount,
        referenceMonth: pay.reference_month,
        referenceYear: pay.reference_year,
        installmentNumber: pay.installment_number,
        status: pay.status as Payment["status"],
      }));

      setRental(mappedRental);
      setProperty(mappedProperty);
      setTenant(mappedTenant);
      setPayments(mappedPayments);
    } catch (error) {
      console.error("Erro ao carregar dados da locação:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da locação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateRental = async () => {
    try {
      const { error } = await supabase
        .from("rentals")
        .update({ status: "terminated", end_date: new Date().toISOString() })
        .eq("id", rentalId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Locação encerrada com sucesso",
      });

      loadRentalData();
    } catch (error) {
      console.error("Erro ao encerrar locação:", error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar locação",
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    const totalExpected = payments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalPending = payments.filter(p => p.status === "pending").length;
    const totalOverdue = payments.filter(p => {
      if (p.status !== "pending") return false;
      const dueDate = new Date(p.dueDate);
      return dueDate < new Date();
    }).length;

    return {
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue,
    };
  };

  useEffect(() => {
    if (rentalId) {
      loadRentalData();
    }
  }, [rentalId]);

  return {
    rental,
    property,
    tenant,
    payments,
    isLoading,
    loadRentalData,
    handleTerminateRental,
    calculateTotals,
  };
}