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
    console.log("🚀 [useRentalForm] Inicializando dados do rental:", rentalData);
    
    setSelectedPropertyId(rentalData.propertyId || "");
    setSelectedTenantId(rentalData.tenantId || "");
    
    console.log("🏠 [useRentalForm] PropertyId:", rentalData.propertyId);
    console.log("👤 [useRentalForm] TenantId:", rentalData.tenantId);
    
    // Datas
    setStartDate(rentalData.startDate ? rentalData.startDate.split('T')[0] : "");
    setEndDate(rentalData.endDate ? rentalData.endDate.split('T')[0] : "");
    setPaymentDay(rentalData.paymentDay?.toString() || "");
    
    // Garagem e Corretor
    setHasGarage(rentalData.hasGarage || false);
    setGarageValue(rentalData.garageValue ? formatCurrency(rentalData.garageValue) : "");
    setHasPartnerBroker(rentalData.hasPartnerBroker || false);
    
    // CAUÇÃO - Lógica robusta para recuperar valores
    const depositValue1 = rentalData.depositInstallment1 || rentalData.depositAmount || 0;
    console.log("💰 [useRentalForm] Valor Caução (1ª parcela):", depositValue1);
    console.log("💰 [useRentalForm] depositInstallments:", rentalData.depositInstallments);
    
    setDepositAmount(depositValue1 > 0 ? formatCurrency(depositValue1) : "");
    
    // Parcelamento - CORRIGIDO para lidar com array de objetos
    const installmentsData = rentalData.depositInstallments;
    let totalInstallments = 1;
    
    // Se for um array, pega o length
    if (Array.isArray(installmentsData)) {
      totalInstallments = installmentsData.length;
      console.log("📊 [useRentalForm] Total de parcelas (array):", totalInstallments);
    } 
    // Se for um número, usa direto
    else if (typeof installmentsData === 'number') {
      totalInstallments = installmentsData;
      console.log("📊 [useRentalForm] Total de parcelas (número):", totalInstallments);
    }
    // Se não existir, tenta pegar do total_installments da primeira parcela
    else if (installmentsData && installmentsData.length > 0 && installmentsData[0].total_installments) {
      totalInstallments = installmentsData[0].total_installments;
      console.log("📊 [useRentalForm] Total de parcelas (total_installments):", totalInstallments);
    }
    
    console.log("📊 [useRentalForm] Total FINAL de parcelas:", totalInstallments);
    
    if (totalInstallments > 1) {
      console.log("✅ [useRentalForm] Marcando checkbox de parcelamento");
      setIsDepositInstallment(true);
      console.log("✅ [useRentalForm] Setando depositInstallmentCount:", totalInstallments.toString());
      setDepositInstallmentCount(totalInstallments.toString());
      
      // 2ª PARCELA - Extrair do array ou do objeto
      let depositValue2 = 0;
      if (Array.isArray(installmentsData) && installmentsData.length >= 2) {
        depositValue2 = installmentsData[1]?.amount || 0;
        console.log("💰 [useRentalForm] Valor 2ª parcela (do array):", depositValue2);
        
        if (depositValue2 !== undefined && depositValue2 !== null) {
          setDepositInstallment2(formatCurrency(depositValue2));
          setDepositInstallment2PaymentDate(formatDate(installmentsData[1]?.payment_date));
          setDepositInstallment2PixCode(installmentsData[1]?.pix_code || "");
          console.log("✅ [useRentalForm] 2ª parcela configurada");
        }
      } else {
        depositValue2 = rentalData.depositInstallment2 ?? 0;
        console.log("💰 [useRentalForm] Valor 2ª parcela (do objeto):", depositValue2);
        
        if (depositValue2 !== undefined && depositValue2 !== null) {
          setDepositInstallment2(formatCurrency(depositValue2));
          setDepositInstallment2PaymentDate(formatDate(rentalData.depositInstallment2PaymentDate));
          setDepositInstallment2PixCode(rentalData.depositInstallment2PixCode || "");
          console.log("✅ [useRentalForm] 2ª parcela configurada");
        }
      }
      
      // 3ª PARCELA - Extrair do array ou do objeto
      if (totalInstallments === 3) {
        let depositValue3 = 0;
        if (Array.isArray(installmentsData) && installmentsData.length >= 3) {
          depositValue3 = installmentsData[2]?.amount || 0;
          console.log("💰 [useRentalForm] Valor 3ª parcela (do array):", depositValue3);
          
          if (depositValue3 !== undefined && depositValue3 !== null) {
            setDepositInstallment3(formatCurrency(depositValue3));
            setDepositInstallment3PaymentDate(formatDate(installmentsData[2]?.payment_date));
            setDepositInstallment3PixCode(installmentsData[2]?.pix_code || "");
            console.log("✅ [useRentalForm] 3ª parcela configurada");
          }
        } else {
          depositValue3 = rentalData.depositInstallment3 ?? 0;
          console.log("💰 [useRentalForm] Valor 3ª parcela (do objeto):", depositValue3);
          
          if (depositValue3 !== undefined && depositValue3 !== null) {
            setDepositInstallment3(formatCurrency(depositValue3));
            setDepositInstallment3PaymentDate(formatDate(rentalData.depositInstallment3PaymentDate));
            setDepositInstallment3PixCode(rentalData.depositInstallment3PixCode || "");
            console.log("✅ [useRentalForm] 3ª parcela configurada");
          }
        }
      }
    } else {
      console.log("ℹ️ [useRentalForm] Caução à vista (1 parcela)");
      setIsDepositInstallment(false);
      setDepositInstallmentCount("");
    }
    
    // Datas e PIX do Caução (1ª parcela)
    setDepositPaymentDate(formatDate(rentalData.depositPaymentDate || rentalData.depositInstallment1PaymentDate));
    setDepositPixCode(rentalData.depositPixCode || rentalData.depositInstallment1PixCode || "");
    
    // Anexos
    setAttachments(rentalData.contractAttachments || rentalData.attachments || []);
    
    console.log("✅ [useRentalForm] Inicialização completa!");
  }, [formatDate]);

  // Inicializar formulário quando o modal abrir
  useEffect(() => {
    console.log("🔄 [useRentalForm] useEffect disparado - open:", open, "rental:", rental?.id);
    
    if (open) {
      initializedRef.current = false;
      setIsEditing(!isViewMode);

      if (rental) {
        console.log("🔄 [useRentalForm] Rental detectado, inicializando...");
        console.log("📊 [useRentalForm] Properties disponíveis:", properties.length);
        console.log("📊 [useRentalForm] Tenants disponíveis:", tenants.length);
        
        initializedRef.current = true;
        prevRentalIdRef.current = rental.id;
        initializeFromRental(rental);
      } else {
        console.log("🆕 [useRentalForm] Novo rental, resetando formulário");
        initializedRef.current = true;
        resetForm();
      }
    } else {
      console.log("❌ [useRentalForm] Modal fechado, limpando dados");
      initializedRef.current = false;
      prevRentalIdRef.current = null;
      resetForm();
      setIsEditing(false);
    }
  }, [open, rental, isViewMode, initializeFromRental, resetForm]);

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