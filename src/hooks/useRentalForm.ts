import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/masks";
import { calculateProportionalRent, calculateDaysBetweenDates, shouldUseProportionalRent } from "@/lib/rentalCalculations";
import type { Rental, Property, Tenant, Location } from "@/types";

interface UseRentalFormProps {
  open: boolean;
  rental: Rental | null;
  isViewMode: boolean;
  properties: Property[];
  tenants: Tenant[];
  locations: Location[];
}

interface ProportionalRentInfo {
  isProportional: boolean;
  days: number;
  firstRentValue: number;
}

export function useRentalForm({
  open,
  rental,
  isViewMode,
  properties,
  tenants,
  locations,
}: UseRentalFormProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!isViewMode);
  
  // Estados principais
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [hasGarage, setHasGarage] = useState(false);
  const [garageValue, setGarageValue] = useState("");
  const [hasPartnerBroker, setHasPartnerBroker] = useState(false);
  
  // Estados de caução
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositInstallment, setIsDepositInstallment] = useState(false);
  const [depositInstallmentCount, setDepositInstallmentCount] = useState("");
  const [depositPaymentDate, setDepositPaymentDate] = useState("");
  const [depositPixCode, setDepositPixCode] = useState("");
  
  // Estados de parcelas 2 e 3
  const [depositInstallment2, setDepositInstallment2] = useState("");
  const [depositInstallment3, setDepositInstallment3] = useState("");
  const [depositInstallment2PaymentDate, setDepositInstallment2PaymentDate] = useState("");
  const [depositInstallment3PaymentDate, setDepositInstallment3PaymentDate] = useState("");
  const [depositInstallment2PixCode, setDepositInstallment2PixCode] = useState("");
  const [depositInstallment3PixCode, setDepositInstallment3PixCode] = useState("");
  
  // Outros estados
  const [attachments, setAttachments] = useState<string[]>([]);
  const [proportionalRentInfo, setProportionalRentInfo] = useState<ProportionalRentInfo>({
    isProportional: false,
    days: 30,
    firstRentValue: 0,
  });

  const initializedRef = useRef(false);
  const prevRentalIdRef = useRef<string | null>(null);

  // Helper para formatar data
  const formatDate = useCallback((dateString?: string | Date) => {
    if (!dateString) return "";
    try {
      const date = typeof dateString === 'string' 
        ? new Date(dateString)
        : dateString;
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  }, []);

  // Calcular valor proporcional
  useEffect(() => {
    if (!startDate || !paymentDay || !selectedPropertyId) return;

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    if (!selectedProperty) return;

    const propertyValue = selectedProperty.value || 0;
    const garage = hasGarage
      ? parseFloat(garageValue.replace(/[^\d,]/g, "").replace(",", ".") || "0")
      : 0;
    const totalMonthlyRent = propertyValue + garage;
    
    const isProportional = shouldUseProportionalRent(startDate, parseInt(paymentDay));
    const days = calculateDaysBetweenDates(startDate, parseInt(paymentDay));
    const firstRentValue = isProportional 
      ? calculateProportionalRent(totalMonthlyRent, startDate, parseInt(paymentDay))
      : totalMonthlyRent;
    
    setProportionalRentInfo({
      isProportional,
      days,
      firstRentValue,
    });
  }, [startDate, paymentDay, selectedPropertyId, properties, hasGarage, garageValue]);

  // Função para resetar formulário
  const resetForm = useCallback(() => {
    console.log("🔄 [useRentalForm] Resetando formulário");
    setSelectedPropertyId("");
    setSelectedTenantId("");
    setStartDate("");
    setEndDate("");
    setPaymentDay("");
    setHasGarage(false);
    setGarageValue("");
    setHasPartnerBroker(false);
    setDepositAmount("");
    setIsDepositInstallment(false);
    setDepositInstallmentCount("");
    setDepositPaymentDate("");
    setDepositPixCode("");
    setDepositInstallment2("");
    setDepositInstallment3("");
    setDepositInstallment2PaymentDate("");
    setDepositInstallment3PaymentDate("");
    setDepositInstallment2PixCode("");
    setDepositInstallment3PixCode("");
    setAttachments([]);
    setProportionalRentInfo({
      isProportional: false,
      days: 30,
      firstRentValue: 0,
    });
  }, []);

  // Função para inicializar campos com dados do rental
  const initializeFromRental = useCallback((rentalData: Rental) => {
    setSelectedPropertyId(rentalData.propertyId || "");
    setSelectedTenantId(rentalData.tenantId || "");
    setStartDate(rentalData.startDate || "");
    setEndDate(rentalData.endDate || "");
    setPaymentDay(rentalData.paymentDay?.toString() || "");
    setHasGarage(rentalData.hasGarage || false);
    setGarageValue(rentalData.garageValue?.toString() || "");
    setHasPartnerBroker(rentalData.hasPartnerBroker || false);
    setDepositAmount(
      rentalData.depositAmount ? formatCurrency(rentalData.depositAmount) : ""
    );
    
    const hasInstallments = rentalData.depositInstallments ? rentalData.depositInstallments > 1 : false;
    setIsDepositInstallment(hasInstallments);
    setDepositInstallmentCount(rentalData.depositInstallments ? rentalData.depositInstallments.toString() : "");
    
    setDepositPaymentDate(formatDate(rentalData.depositPaymentDate));
    setDepositPixCode(rentalData.depositPixCode || "");
    
    setDepositInstallment2(rentalData.depositInstallment2 ? formatCurrency(rentalData.depositInstallment2) : "");
    setDepositInstallment3(rentalData.depositInstallment3 ? formatCurrency(rentalData.depositInstallment3) : "");
    
    setDepositInstallment2PaymentDate(formatDate(rentalData.depositInstallment2PaymentDate));
    setDepositInstallment3PaymentDate(formatDate(rentalData.depositInstallment3PaymentDate));
    
    setDepositInstallment2PixCode(rentalData.depositInstallment2PixCode || "");
    setDepositInstallment3PixCode(rentalData.depositInstallment3PixCode || "");
    
    setAttachments(rentalData.contractAttachments || rentalData.attachments || []);
  }, [formatDate]);

  // Inicializar formulário quando o modal abrir
  useEffect(() => {
    if (open) {
      initializedRef.current = false;
      setIsEditing(!isViewMode);

      if (rental) {
        const hasRequiredData = properties.length > 0 && tenants.length > 0;
        if (!hasRequiredData) return;

        initializedRef.current = true;
        prevRentalIdRef.current = rental.id;
        initializeFromRental(rental);
      } else {
        initializedRef.current = true;
        resetForm();
      }
    } else {
      initializedRef.current = false;
      prevRentalIdRef.current = null;
      resetForm();
      setIsEditing(false);
    }
  }, [open, rental?.id, isViewMode, initializeFromRental, resetForm, properties.length, tenants.length]);

  // Handler de upload de arquivo
  const handleFileUpload = useCallback(async (file: File) => {
    const uuid = crypto.randomUUID();
    const extension = file.name.split(".").pop();
    const fileName = `rental_${uuid}.${extension}`;

    const formData = new FormData();
    formData.append("file", file, fileName);

    return new Promise<string>((resolve, reject) => {
      fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then(() => {
          const url = `/uploads/${fileName}`;
          setAttachments((prev) => [...prev, url]);
          toast({
            title: "Arquivo anexado",
            description: `${file.name} foi anexado com sucesso.`,
          });
          resolve(url);
        })
        .catch(() => {
          toast({
            title: "Erro ao anexar arquivo",
            description: "Não foi possível salvar o arquivo.",
            variant: "destructive",
          });
          reject();
        });
    });
  }, [toast]);

  // Remover anexo
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Anexo removido",
      description: "Anexo removido com sucesso.",
    });
  }, [toast]);

  // Obter propriedade selecionada
  const getSelectedProperty = useCallback((): Property | undefined => {
    return properties.find((p) => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  // Calcular total
  const calculateTotal = useCallback((): number => {
    const property = getSelectedProperty();
    const propertyValue = property?.value || 0;
    const garage = hasGarage
      ? parseFloat(garageValue.replace(/[^\d,]/g, "").replace(",", ".") || "0")
      : 0;
    return propertyValue + garage;
  }, [getSelectedProperty, hasGarage, garageValue]);

  return {
    // Estado
    isEditing,
    setIsEditing,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedTenantId,
    setSelectedTenantId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    paymentDay,
    setPaymentDay,
    hasGarage,
    setHasGarage,
    garageValue,
    setGarageValue,
    hasPartnerBroker,
    setHasPartnerBroker,
    depositAmount,
    setDepositAmount,
    
    isDepositInstallment,
    setIsDepositInstallment,
    depositInstallmentCount,
    setDepositInstallmentCount,
    
    depositPaymentDate,
    setDepositPaymentDate,
    depositPixCode,
    setDepositPixCode,
    
    depositInstallment2,
    setDepositInstallment2,
    depositInstallment3,
    setDepositInstallment3,
    
    depositInstallment2PaymentDate,
    setDepositInstallment2PaymentDate,
    depositInstallment3PaymentDate,
    setDepositInstallment3PaymentDate,
    
    depositInstallment2PixCode,
    setDepositInstallment2PixCode,
    depositInstallment3PixCode,
    setDepositInstallment3PixCode,
    
    attachments,
    setAttachments,
    proportionalRentInfo,

    // Funções
    resetForm,
    handleFileUpload,
    removeAttachment,
    getSelectedProperty,
    calculateTotal,
  };
}