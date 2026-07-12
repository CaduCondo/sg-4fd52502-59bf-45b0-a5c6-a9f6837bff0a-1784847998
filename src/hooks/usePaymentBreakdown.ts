import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as adminFeeExemptionService from "@/services/adminFeeExemptionService";
import * as managementFeeExemptionService from "@/services/managementFeeExemptionService";

interface UsePaymentBreakdownParams {
  payment: any;
  rentalValue: number;
  garageValue: number;
}

interface PaymentBreakdownItem {
  description: string;
  value: number;
}

interface PaymentBreakdownResult {
  items: PaymentBreakdownItem[];
  adminFee: number;
  managementFee: number;
  total: number;
  isAdminFeeExempt: boolean;
  isManagementFeeExempt: boolean;
  isLoading: boolean;
}

export function usePaymentBreakdown({ payment, rentalValue, garageValue }: UsePaymentBreakdownParams) {
  const [adminFee, setAdminFee] = useState(0);
  const [managementFee, setManagementFee] = useState(0);
  const [isAdminFeeExempt, setIsAdminFeeExempt] = useState(false);
  const [isManagementFeeExempt, setIsManagementFeeExempt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateBreakdown = async () => {
      setIsLoading(true);
      try {
        // Buscar configurações
        const { data: config } = await supabase
          .from("configs")
          .select("admin_fee_percentage, management_fee_percentage")
          .maybeSingle();

        const adminFeePercent = config?.admin_fee_percentage || 5;
        const managementFeePercent = config?.management_fee_percentage || 3;

        // Verificar isenções
        const adminExempt = locationId 
          ? await adminFeeExemptionService.isLocationExempt(locationId)
          : false;
        
        const managementExempt = locationId
          ? await managementFeeExemptionService.isLocationExempt(locationId)
          : false;

        setIsAdminFeeExempt(adminExempt);
        setIsManagementFeeExempt(managementExempt);

        // Calcular valor base (aluguel + garagem se houver)
        const totalBaseValue = baseValue + (includeGarage && garageValue ? garageValue : 0);

        // Calcular taxas (aplicar isenção se necessário)
        const calculatedAdminFee = adminExempt ? 0 : (totalBaseValue * (adminFeePercent / 100));
        const calculatedManagementFee = managementExempt ? 0 : (totalBaseValue * (managementFeePercent / 100));

        setAdminFee(calculatedAdminFee);
        setManagementFee(calculatedManagementFee);
      } catch (error) {
        console.error("Erro ao calcular breakdown:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateBreakdown();
  }, [baseValue, locationId, includeGarage, garageValue]);

  // Montar items do breakdown
  const items: PaymentBreakdownItem[] = [
    { description: "Aluguel", value: baseValue }
  ];

  if (includeGarage && garageValue) {
    items.push({ description: "Garagem", value: garageValue });
  }

  const total = baseValue + (includeGarage && garageValue ? garageValue : 0);

  return {
    items,
    adminFee,
    managementFee,
    total,
    isAdminFeeExempt,
    isManagementFeeExempt,
    isLoading,
  };
}