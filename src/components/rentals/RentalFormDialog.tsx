import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { create as createRental, update as updateRentalService } from "@/services/rentalService";
import { update as updateProperty } from "@/services/propertyService";
import { update as updateTenant } from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import {
  createPaymentsForRental,
  updateFuturePayments,
  updateFuturePaymentsOnPaymentDayChange,
} from "@/services/paymentService";
import type { Property, Tenant, Location, Rental } from "@/types";
import { RentalContract } from "@/components/RentalContract";
import { supabase } from "@/integrations/supabase/client";
import { parseCurrencyToNumber } from "@/lib/masks";

// Hooks & Components
import { useRentalFormState } from "./hooks/useRentalFormState";
import { BasicInfoSection } from "./form/BasicInfoSection";
import { RentSection } from "./form/RentSection";
import { DepositSection } from "./form/DepositSection";
import { CommissionSection } from "./form/CommissionSection";
import { UtilitiesSection } from "./form/UtilitiesSection";
import { AttachmentsSection } from "./form/AttachmentsSection";
import { useDepositCalculations } from "./hooks/useDepositCalculations";

interface RentalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProperties: Property[];
  availableTenants: Tenant[];
  properties?: Property[];
  tenants?: Tenant[];
  onSuccess: () => void;
  rental?: Rental | null;
  isViewMode?: boolean;
}

export function RentalFormDialog({
  open,
  onOpenChange,
  availableProperties,
  availableTenants,
  properties = [],
  tenants = [],
  onSuccess,
  rental = null,
  isViewMode = false,
}: RentalFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showContract, setShowContract] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  
  const [createdRentalData, setCreatedRentalData] = useState<{
    rental: Rental;
    property: Property;
    tenant: Tenant;
    location?: Location;
  } | null>(null);

  const { formData, errors, handleFieldChange, resetForm, validateForm } = useRentalFormState(rental || undefined);
  
  // Calculate total for display
  const { totalDeposit } = useDepositCalculations({
    securityDeposit: formData.securityDeposit || "",
    isDepositInstallment: formData.isDepositInstallment || false,
    depositInstallmentCount: formData.depositInstallmentCount || "",
    depositInstallment2: formData.depositInstallment2 || "",
    depositInstallment3: formData.depositInstallment3 || "",
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (open) {
      if (rental) {
        setIsEditing(false); // Start in view mode if rental exists
        setAttachments(rental.attachments || []);
      } else {
        setIsEditing(true); // Start in edit mode if new rental
        setAttachments([]);
      }
    } else {
      resetForm();
    }
  }, [open, rental, resetForm]);

  const loadLocations = async () => {
    try {
      const locationsData = await getAllLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `rental_${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(fileName);
      setAttachments((prev) => [...prev, publicUrlData.publicUrl]);
      
      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do arquivo.",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erro",
        description: "Verifique os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const propertiesToUse = rental ? properties : availableProperties;
    const tenantsToUse = rental ? tenants : availableTenants;
    
    const selectedProperty = propertiesToUse.find((p) => p.id === formData.propertyId);
    const selectedTenant = tenantsToUse.find((t) => t.id === formData.tenantId);

    if (!selectedProperty || !selectedTenant) {
      toast({
        title: "Erro",
        description: "Imóvel ou inquilino não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const rentalData: any = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        paymentDay: parseInt(formData.paymentDay || "1"),
        rentAmount: parseCurrencyToNumber(formData.rentAmount || "0"),
        attachments: attachments,
        
        // Deposit
        securityDeposit: parseCurrencyToNumber(formData.securityDeposit || "0"),
        depositInstallments: formData.isDepositInstallment && formData.depositInstallmentCount ? parseInt(formData.depositInstallmentCount) : 1,
        
        // 1st Installment (Main fields)
        depositInstallment1: parseCurrencyToNumber(formData.securityDeposit || "0"),
        depositPaymentDate: formData.depositPaymentDate || null,
        depositPixCode: formData.depositPixCode || null,
        
        // Commissions & Utilities
        agencyCommissionPercentage: parseCurrencyToNumber(formData.agencyCommissionPercentage || "0"),
        realEstateAgentCommissionPercentage: parseCurrencyToNumber(formData.realEstateAgentCommissionPercentage || "0"),
        water: parseCurrencyToNumber(formData.water || "0"),
        electricity: parseCurrencyToNumber(formData.electricity || "0"),
        gas: parseCurrencyToNumber(formData.gas || "0"),
        waterResponsibility: formData.waterResponsibility,
        electricityResponsibility: formData.electricityResponsibility,
        gasResponsibility: formData.gasResponsibility,
      };

      // Handle additional installments
      if (formData.isDepositInstallment && formData.depositInstallmentCount) {
        const count = parseInt(formData.depositInstallmentCount);
        
        if (count >= 2) {
          rentalData.depositInstallment2 = parseCurrencyToNumber(formData.depositInstallment2 || "0");
          rentalData.depositInstallment2PaymentDate = formData.depositInstallment2PaymentDate || null;
          rentalData.depositInstallment2PixCode = null; // Add field if needed in UI
        }
        
        if (count === 3) {
          rentalData.depositInstallment3 = parseCurrencyToNumber(formData.depositInstallment3 || "0");
          rentalData.depositInstallment3PaymentDate = formData.depositInstallment3PaymentDate || null;
          rentalData.depositInstallment3PixCode = null; // Add field if needed in UI
        }
      }

      if (rental) {
        // Update existing rental
        const updatedRental = await updateRentalService(rental.id, rentalData);
        await updateFuturePayments(rental.id, rentalData.rentAmount);

        if (rental.paymentDay !== rentalData.paymentDay) {
          await updateFuturePaymentsOnPaymentDayChange(rental.id, rentalData.paymentDay);
        }

        await updateDepositInstallments(rental.id, rentalData);

        const selectedLocation = locations.find((loc) => loc.id === selectedProperty.locationId);

        setCreatedRentalData({
          rental: { ...rental, ...updatedRental },
          property: selectedProperty,
          tenant: selectedTenant,
          location: selectedLocation,
        });

        toast({
          title: "Sucesso!",
          description: "Locação atualizada com sucesso.",
        });

        setShowContract(true);
      } else {
        // Create new rental
        const createdRental = await createRental(rentalData);

        await updateProperty(selectedProperty.id, { status: "occupied" });

        const tenant = availableTenants.find((t) => t.id === selectedTenant.id);
        if (tenant) {
          await updateTenant(selectedTenant.id, {
            ...tenant,
            status: "rented",
          });
        }

        await createPaymentsForRental(createdRental);
        await createDepositInstallments(createdRental.id, rentalData);

        const selectedLocation = locations.find((loc) => loc.id === selectedProperty.locationId);

        setCreatedRentalData({
          rental: createdRental,
          property: selectedProperty,
          tenant: selectedTenant,
          location: selectedLocation,
        });

        toast({
          title: "Sucesso!",
          description: "Locação criada com sucesso.",
        });

        setShowContract(true);
      }
    } catch (error) {
      console.error("Error saving rental:", error);
      toast({
        title: "Erro",
        description: rental
          ? "Não foi possível atualizar a locação."
          : "Não foi possível criar a locação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDepositInstallments = async (rentalId: string, rentalData: any) => {
    const count = rentalData.depositInstallments || 1;
    const installments = [];

    for (let i = 1; i <= count; i++) {
      let amount = 0;
      let paymentDate = null;
      let pixCode = null;

      if (i === 1) {
        amount = rentalData.depositInstallment1;
        paymentDate = rentalData.depositPaymentDate;
        pixCode = rentalData.depositPixCode;
      } else if (i === 2) {
        amount = rentalData.depositInstallment2 || 0;
        paymentDate = rentalData.depositInstallment2PaymentDate || null;
      } else if (i === 3) {
        amount = rentalData.depositInstallment3 || 0;
        paymentDate = rentalData.depositInstallment3PaymentDate || null;
      }
      
      installments.push({
        rental_id: rentalId,
        installment_number: i,
        total_installments: count,
        installment_total: count,
        amount: amount,
        payment_date: paymentDate,
        pix_code: pixCode,
      });
    }

    const { error } = await supabase.from("deposit_installments").insert(installments);

    if (error) {
      console.error("Error creating deposit installments:", error);
      throw error;
    }
  };

  const updateDepositInstallments = async (rentalId: string, rentalData: any) => {
    const { error: deleteError } = await supabase.from("deposit_installments").delete().eq("rental_id", rentalId);
    
    if (deleteError) {
      console.error("Error deleting old deposit installments:", deleteError);
    }

    await createDepositInstallments(rentalId, rentalData);
  };

  const propertiesToDisplay = rental ? properties : availableProperties;
  const tenantsToDisplay = rental ? tenants : availableTenants;
  
  // Determine if form is interactive
  const isFormDisabled = !isEditing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rental && isViewMode && !isEditing
              ? "Visualização da Locação"
              : rental && isEditing
              ? "Edição da Locação"
              : "Nova Locação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`space-y-6 ${isFormDisabled ? "pointer-events-none opacity-90" : ""}`}>
            <BasicInfoSection 
              formData={formData} 
              onFieldChange={handleFieldChange} 
              properties={propertiesToDisplay} 
              tenants={tenantsToDisplay}
              errors={errors}
            />
            
            <RentSection 
              formData={formData} 
              onFieldChange={handleFieldChange}
              errors={errors}
            />
            
            <DepositSection 
              formData={formData} 
              onFieldChange={handleFieldChange}
              errors={errors}
            />
            
            <CommissionSection 
              formData={formData} 
              onFieldChange={handleFieldChange}
            />
            
            <UtilitiesSection 
              formData={formData} 
              onFieldChange={handleFieldChange}
            />
            
            <div className={isFormDisabled ? "pointer-events-none" : ""}>
              <AttachmentsSection 
                attachments={attachments}
                onUpload={handleAttachmentUpload}
                onRemove={removeAttachment}
                isEditing={isEditing}
              />
            </div>
          </div>

          <DialogFooter>
            {isViewMode && !isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  disabled={loading}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (rental && isViewMode) {
                      setIsEditing(false);
                      // Reset form to original values
                      resetForm();
                    } else {
                      resetForm();
                      onOpenChange(false);
                    }
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? rental
                      ? "Atualizando..."
                      : "Criando..."
                    : rental
                    ? "Atualizar Locação"
                    : "Criar Locação"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>

      {showContract && createdRentalData && (
        <RentalContract
          rental={createdRentalData.rental}
          property={createdRentalData.property}
          tenant={createdRentalData.tenant}
          location={createdRentalData.location}
          onClose={() => {
            setShowContract(false);
            setCreatedRentalData(null);
            resetForm();
            onOpenChange(false);
            onSuccess();
          }}
        />
      )}
    </Dialog>
  );
}