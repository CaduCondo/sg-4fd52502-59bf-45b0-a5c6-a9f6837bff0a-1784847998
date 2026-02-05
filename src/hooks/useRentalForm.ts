import { useState, useEffect, useRef } from "react";
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
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [hasGarage, setHasGarage] = useState(false);
  const [garageValue, setGarageValue] = useState("");
  const [hasPartnerBroker, setHasPartnerBroker] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  
  // Estados para caução parcelado
  const [isDepositInstallment, setIsDepositInstallment] = useState(false);
  const [depositInstallmentCount, setDepositInstallmentCount] = useState("");
  
  const [depositPaymentDate, setDepositPaymentDate] = useState("");
  const [depositPixCode, setDepositPixCode] = useState("");
  
  const [depositInstallment2, setDepositInstallment2] = useState("");
  const [depositInstallment3, setDepositInstallment3] = useState("");
  
  const [depositInstallment2PaymentDate, setDepositInstallment2PaymentDate] = useState("");
  const [depositInstallment3PaymentDate, setDepositInstallment3PaymentDate] = useState("");
  
  const [depositInstallment2PixCode, setDepositInstallment2PixCode] = useState("");
  const [depositInstallment3PixCode, setDepositInstallment3PixCode] = useState("");
  
  // Estado para valor proporcional
  const [proportionalRentInfo, setProportionalRentInfo] = useState<{
    isProportional: boolean;
    days: number;
    firstRentValue: number;
  }>({
    isProportional: false,
    days: 30,
    firstRentValue: 0,
  });

  const initializedRef = useRef(false);
  const prevRentalIdRef = useRef<string | null>(null);

  // Calcular valor proporcional quando startDate, paymentDay ou property mudarem
  useEffect(() => {
    if (startDate && paymentDay && selectedPropertyId) {
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (selectedProperty) {
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
      }
    }
  }, [startDate, paymentDay, selectedPropertyId, properties, hasGarage, garageValue]);

  // Função para inicializar campos com dados do rental
  const initializeFromRental = (rentalData: Rental) => {
    console.log("🔧 Inicializando formulário com rental:", rentalData);
    console.log("📦 Properties disponíveis:", properties.length);
    console.log("👥 Tenants disponíveis:", tenants.length);
    
    setSelectedPropertyId(rentalData.propertyId || "");
    setSelectedTenantId(rentalData.tenantId || "");
    setStartDate(rentalData.startDate || "");
    setEndDate(rentalData.endDate || "");
    setPaymentDay(rentalData.paymentDay?.toString() || "");
    setHasGarage(rentalData.hasGarage || false);
    setGarageValue(
      rentalData.garageValue ? formatCurrency(rentalData.garageValue) : ""
    );
    setHasPartnerBroker(rentalData.hasPartnerBroker || false);
    setDepositAmount(
      rentalData.depositAmount ? formatCurrency(rentalData.depositAmount) : ""
    );
    
    const hasInstallments = rentalData.depositInstallments ? rentalData.depositInstallments > 1 : false;
    setIsDepositInstallment(hasInstallments);
    setDepositInstallmentCount(rentalData.depositInstallments ? rentalData.depositInstallments.toString() : "");
    
    console.log("📅 depositPaymentDate do rental:", rentalData.depositPaymentDate);
    console.log("🔑 depositPixCode do rental:", rentalData.depositPixCode);
    
    setDepositPaymentDate(
      rentalData.depositPaymentDate 
        ? (typeof rentalData.depositPaymentDate === 'string' 
            ? rentalData.depositPaymentDate.split('T')[0] 
            : new Date(rentalData.depositPaymentDate).toISOString().split('T')[0])
        : ""
    );
    setDepositPixCode(rentalData.depositPixCode || "");
    
    setDepositInstallment2(rentalData.depositInstallment2 ? formatCurrency(rentalData.depositInstallment2) : "");
    setDepositInstallment3(rentalData.depositInstallment3 ? formatCurrency(rentalData.depositInstallment3) : "");
    
    setDepositInstallment2PaymentDate(
      rentalData.depositInstallment2PaymentDate 
        ? (typeof rentalData.depositInstallment2PaymentDate === 'string'
            ? rentalData.depositInstallment2PaymentDate.split('T')[0]
            : new Date(rentalData.depositInstallment2PaymentDate).toISOString().split('T')[0])
        : ""
    );
    setDepositInstallment3PaymentDate(
      rentalData.depositInstallment3PaymentDate 
        ? (typeof rentalData.depositInstallment3PaymentDate === 'string'
            ? rentalData.depositInstallment3PaymentDate.split('T')[0]
            : new Date(rentalData.depositInstallment3PaymentDate).toISOString().split('T')[0])
        : ""
    );
    
    setDepositInstallment2PixCode(rentalData.depositInstallment2PixCode || "");
    setDepositInstallment3PixCode(rentalData.depositInstallment3PixCode || "");
    
    setAttachments(rentalData.contractAttachments || rentalData.attachments || []);
    
    console.log("✅ Campos inicializados - PropertyId:", rentalData.propertyId, "TenantId:", rentalData.tenantId);
  };

  // Inicializar formulário quando o modal abrir
  useEffect(() => {
    if (open) {
      // Resetar flag de inicialização quando modal abre
      initializedRef.current = false;
      
      // Define se inicia em modo de edição ou visualização
      setIsEditing(!isViewMode);

      if (rental) {
        // Verificar se temos os dados necessários
        const hasRequiredData = properties.length > 0 && tenants.length > 0;
        
        if (!hasRequiredData) {
          console.warn("⚠️ Dados incompletos - aguardando carregamento...");
          return;
        }

        // Marcar como inicializado e preencher campos
        initializedRef.current = true;
        prevRentalIdRef.current = rental.id;
        initializeFromRental(rental);
      } else {
        // Novo rental - apenas resetar
        initializedRef.current = true;
        resetForm();
      }
    } else {
      // Modal fechou - resetar tudo
      initializedRef.current = false;
      prevRentalIdRef.current = null;
      resetForm();
      setIsEditing(false);
    }
  }, [open, rental?.id, isViewMode]);

  // Effect para reinicializar quando dados completos chegarem
  useEffect(() => {
    if (open && rental && !initializedRef.current) {
      const hasRequiredData = properties.length > 0 && tenants.length > 0;
      
      if (hasRequiredData) {
        console.log("✨ Dados completos chegaram - inicializando campos");
        initializedRef.current = true;
        prevRentalIdRef.current = rental.id;
        initializeFromRental(rental);
      }
    }
  }, [open, rental, properties.length, tenants.length]);

  // Effect para garantir que propertyId e tenantId estejam sempre corretos
  useEffect(() => {
    if (open && rental && initializedRef.current) {
      // Se os campos estão vazios mas deveriam estar preenchidos, preencher
      if (!selectedPropertyId && rental.propertyId) {
        console.log("🔄 Corrigindo propertyId vazio");
        setSelectedPropertyId(rental.propertyId);
      }
      if (!selectedTenantId && rental.tenantId) {
        console.log("🔄 Corrigindo tenantId vazio");
        setSelectedTenantId(rental.tenantId);
      }
    }
  }, [open, rental?.id, selectedPropertyId, selectedTenantId, properties.length, tenants.length]);

  // Effect adicional para forçar atualização quando rental mudar
  useEffect(() => {
    if (rental && open) {
      console.log("🔄 Rental mudou, atualizando campos:", rental);
      setSelectedPropertyId(rental.propertyId || "");
      setSelectedTenantId(rental.tenantId || "");
    }
  }, [rental?.id, open]);

  const resetForm = () => {
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
  };

  const handleFileUpload = async (file: File) => {
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
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Anexo removido",
      description: "Anexo removido com sucesso.",
    });
  };

  const getSelectedProperty = (): Property | undefined => {
    return properties.find((p) => p.id === selectedPropertyId);
  };

  const calculateTotal = (): number => {
    const property = getSelectedProperty();
    const propertyValue = property?.value || 0;
    const garage = hasGarage
      ? parseFloat(garageValue.replace(/[^\d,]/g, "").replace(",", ".") || "0")
      : 0;
    return propertyValue + garage;
  };

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