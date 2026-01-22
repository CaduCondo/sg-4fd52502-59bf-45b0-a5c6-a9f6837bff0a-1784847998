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
        .select("*")
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

      setRental(rentalData as Rental);
      setProperty(propertyData as Property);
      setTenant(tenantData as Tenant);
      setPayments((paymentsData || []) as Payment[]);
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