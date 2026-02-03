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
}

export function useRentalForm({
  open,
  rental,
  isViewMode,
  properties,
  tenants,
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

  // Inicializar formulário quando o modal abrir
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      
      // Define se inicia em modo de edição ou visualização
      setIsEditing(!isViewMode);

      if (rental) {
        console.log("🔧 Inicializando formulário com rental:", rental);
        setSelectedPropertyId(rental.propertyId || "");
        setSelectedTenantId(rental.tenantId || "");
        setStartDate(rental.startDate || "");
        setEndDate(rental.endDate || "");
        setPaymentDay(rental.paymentDay?.toString() || "");
        setHasGarage(rental.hasGarage || false);
        setGarageValue(
          rental.garageValue ? formatCurrency(rental.garageValue) : ""
        );
        setHasPartnerBroker(rental.hasPartnerBroker || false);
        setDepositAmount(
          rental.depositAmount ? formatCurrency(rental.depositAmount) : ""
        );
        
        // Configurar parcelamento do caução
        const hasInstallments = rental.depositInstallments ? rental.depositInstallments > 1 : false;
        setIsDepositInstallment(hasInstallments);
        setDepositInstallmentCount(rental.depositInstallments ? rental.depositInstallments.toString() : "");
        
        setDepositPaymentDate(
          rental.depositPaymentDate 
            ? new Date(rental.depositPaymentDate + 'T00:00:00').toISOString().split('T')[0]
            : ""
        );
        setDepositPixCode(rental.depositPixCode || "");
        
        // Parcelas 2 e 3
        setDepositInstallment2(rental.depositInstallment2 ? formatCurrency(rental.depositInstallment2) : "");
        setDepositInstallment3(rental.depositInstallment3 ? formatCurrency(rental.depositInstallment3) : "");
        
        setDepositInstallment2PaymentDate(
          rental.depositInstallment2PaymentDate 
            ? new Date(rental.depositInstallment2PaymentDate + 'T00:00:00').toISOString().split('T')[0] 
            : ""
        );
        setDepositInstallment3PaymentDate(
          rental.depositInstallment3PaymentDate 
            ? new Date(rental.depositInstallment3PaymentDate + 'T00:00:00').toISOString().split('T')[0] 
            : ""
        );
        
        setDepositInstallment2PixCode(rental.depositInstallment2PixCode || "");
        setDepositInstallment3PixCode(rental.depositInstallment3PixCode || "");
        
        setAttachments(rental.contractAttachments || rental.attachments || []);
      } else {
        resetForm();
      }
    }

    if (!open) {
      initializedRef.current = false;
      resetForm();
      setIsEditing(false); // Resetar para modo visualização ao fechar
    }
  }, [open, rental, isViewMode]);

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