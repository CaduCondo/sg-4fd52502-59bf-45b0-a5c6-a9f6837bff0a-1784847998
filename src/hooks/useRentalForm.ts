import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/masks";
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
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  const initializedRef = useRef(false);

  // Inicializar formulário quando o modal abrir
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      setIsEditing(!isViewMode);

      if (rental) {
        setSelectedPropertyId(rental.propertyId || "");
        setSelectedTenantId(rental.tenantId || "");
        setStartDate(rental.startDate || "");
        setEndDate(rental.endDate || "");
        setPaymentDay(rental.paymentDay?.toString() || "");
        setHasGarage(rental.hasGarage || false);
        setGarageValue(
          rental.garageValue ? formatCurrency(rental.garageValue) : ""
        );
        setSecurityDeposit(
          rental.securityDeposit ? formatCurrency(rental.securityDeposit) : ""
        );
        setAttachments(rental.contractAttachments || rental.attachments || []);
      } else {
        resetForm();
      }
    }

    if (!open) {
      initializedRef.current = false;
      resetForm();
    }
  }, [open, rental, isViewMode]);

  const resetForm = () => {
    setSelectedPropertyId("");
    setSelectedTenantId("");
    setStartDate("");
    setEndDate("");
    setPaymentDay("");
    setHasGarage(false);
    setGarageValue("");
    setSecurityDeposit("");
    setAttachments([]);
  };

  const handleFileUpload = async (file: File) => {
    const uuid = crypto.randomUUID();
    const extension = file.name.split(".").pop();
    const fileName = `rental_${uuid}.${extension}`;

    const reader = new FileReader();

    return new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64String = reader.result as string;

        fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            fileData: base64String,
          }),
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
      };

      reader.readAsDataURL(file);
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
    securityDeposit,
    setSecurityDeposit,
    attachments,
    setAttachments,

    // Funções
    resetForm,
    handleFileUpload,
    removeAttachment,
    getSelectedProperty,
    calculateTotal,
  };
}