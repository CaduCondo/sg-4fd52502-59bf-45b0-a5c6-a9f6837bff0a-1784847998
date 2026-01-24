import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Paperclip } from "lucide-react";
import { applyRealMask, formatCurrency, parseCurrencyToNumber } from "@/lib/masks";
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
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { RentalContract } from "@/components/RentalContract";
import { useRentalForm } from "@/hooks/useRentalForm";
import { validateRentalForm, validateRentalValue, prepareRentalData } from "@/lib/rentalCalculations";
import { supabase } from "@/integrations/supabase/client";

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
  const [createdRentalData, setCreatedRentalData] = useState<{
    rental: Rental;
    property: Property;
    tenant: Tenant;
    location?: Location;
  } | null>(null);

  const [isDepositInstallment, setIsDepositInstallment] = useState(false);
  const [depositInstallmentCount, setDepositInstallmentCount] = useState<string>("");
  const [depositInstallment1, setDepositInstallment1] = useState("");
  const [depositInstallment2, setDepositInstallment2] = useState("");
  const [depositInstallment3, setDepositInstallment3] = useState("");

  const {
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
    securityDeposit,
    setSecurityDeposit,
    attachments,
    resetForm,
    handleFileUpload,
    removeAttachment,
    getSelectedProperty,
    calculateTotal,
  } = useRentalForm({
    open,
    rental,
    isViewMode,
    properties,
    tenants,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (open && rental) {
      setIsDepositInstallment(rental.depositInstallments ? rental.depositInstallments > 1 : false);
      setDepositInstallmentCount(rental.depositInstallments ? rental.depositInstallments.toString() : "");
      setDepositInstallment1(rental.depositInstallment1 ? formatCurrency(rental.depositInstallment1) : "");
      setDepositInstallment2(rental.depositInstallment2 ? formatCurrency(rental.depositInstallment2) : "");
      setDepositInstallment3(rental.depositInstallment3 ? formatCurrency(rental.depositInstallment3) : "");
    } else if (!open) {
      setIsDepositInstallment(false);
      setDepositInstallmentCount("");
      setDepositInstallment1("");
      setDepositInstallment2("");
      setDepositInstallment3("");
    }
  }, [open, rental]);

  const loadLocations = async () => {
    try {
      const locationsData = await getAllLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFileUpload(files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Log para debug
    console.log("=== DEBUG RENTAL FORM ===");
    console.log("selectedPropertyId:", selectedPropertyId);
    console.log("selectedTenantId:", selectedTenantId);
    console.log("startDate:", startDate);
    console.log("paymentDay:", paymentDay);

    const validation = validateRentalForm({
      propertyId: selectedPropertyId,
      tenantId: selectedTenantId,
      startDate,
      paymentDay,
    });

    if (!validation.isValid) {
      toast({
        title: "Erro",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
    const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

    if (!selectedProperty || !selectedTenant) {
      toast({
        title: "Erro",
        description: "Imóvel ou inquilino não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const totalValue = calculateTotal();
    const valueValidation = validateRentalValue(totalValue);

    if (!valueValidation.isValid) {
      toast({
        title: "Erro",
        description: valueValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (isDepositInstallment) {
      if (!depositInstallmentCount) {
        toast({
          title: "Erro",
          description: "Selecione a quantidade de parcelas do caução.",
          variant: "destructive",
        });
        return;
      }

      const count = parseInt(depositInstallmentCount);
      if (count === 2) {
        if (!depositInstallment1 || !depositInstallment2) {
          toast({
            title: "Erro",
            description: "Preencha os valores das 2 parcelas do caução.",
            variant: "destructive",
          });
          return;
        }
      } else if (count === 3) {
        if (!depositInstallment1 || !depositInstallment2 || !depositInstallment3) {
          toast({
            title: "Erro",
            description: "Preencha os valores das 3 parcelas do caução.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      setLoading(true);

      const rentalData: any = prepareRentalData(
        selectedPropertyId,
        selectedTenantId,
        startDate,
        endDate,
        paymentDay,
        selectedProperty.value || 0,
        hasGarage,
        garageValue,
        attachments,
        securityDeposit,
        hasPartnerBroker
      );

      // Log dos dados preparados
      console.log("rentalData (camelCase):", rentalData);

      if (isDepositInstallment && depositInstallmentCount) {
        rentalData.depositInstallments = parseInt(depositInstallmentCount);
        rentalData.depositInstallment1 = parseCurrencyToNumber(depositInstallment1);
        if (parseInt(depositInstallmentCount) >= 2) {
          rentalData.depositInstallment2 = parseCurrencyToNumber(depositInstallment2);
        }
        if (parseInt(depositInstallmentCount) === 3) {
          rentalData.depositInstallment3 = parseCurrencyToNumber(depositInstallment3);
        }
      } else {
        rentalData.depositInstallments = 1;
        rentalData.depositInstallment1 = parseCurrencyToNumber(securityDeposit);
      }

      console.log("rentalData final:", rentalData);

      if (rental) {
        const updatedRental = await updateRentalService(rental.id, rentalData);
        await updateFuturePayments(rental.id, totalValue);

        if (rental.paymentDay !== parseInt(paymentDay)) {
          await updateFuturePaymentsOnPaymentDayChange(rental.id, parseInt(paymentDay));
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
        const createdRental = await createRental(rentalData);
        console.log("createdRental:", createdRental);

        await updateProperty(selectedPropertyId, { status: "occupied" });

        const tenant = availableTenants.find((t) => t.id === selectedTenantId);
        if (tenant) {
          await updateTenant(selectedTenantId, {
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
      const amount = rentalData[`depositInstallment${i}`] || 0;
      installments.push({
        rental_id: rentalId,
        installment_number: i,
        total_installments: count,
        installment_total: count,
        amount: amount,
        pix_code: null,
      });
    }

    console.log("=== DEBUG CREATE DEPOSIT INSTALLMENTS ===");
    console.log("rentalId:", rentalId);
    console.log("installments:", installments);
    console.log("count:", count);

    const { data, error } = await supabase.from("deposit_installments").insert(installments).select();

    if (error) {
      console.error("Error creating deposit installments:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("Deposit installments created successfully:", data);
  };

  const updateDepositInstallments = async (rentalId: string, rentalData: any) => {
    console.log("=== DEBUG UPDATE DEPOSIT INSTALLMENTS ===");
    console.log("rentalId:", rentalId);
    console.log("rentalData:", rentalData);

    const { error: deleteError } = await supabase.from("deposit_installments").delete().eq("rental_id", rentalId);
    
    if (deleteError) {
      console.error("Error deleting old deposit installments:", deleteError);
    }

    await createDepositInstallments(rentalId, rentalData);
  };

  const getLocationName = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.name || "Local não encontrado";
  };

  const propertiesToDisplay = rental ? properties : availableProperties;
  const tenantsToDisplay = rental ? tenants : availableTenants;
  const selectedProperty = getSelectedProperty();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rental && isViewMode && !isEditing
              ? "Visualização da Locação"
              : rental && isEditing
              ? "Edição da Locação"
              : "Nova Locação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">{rental ? "Imóvel Selecionado" : "Imóveis Disponíveis"} *</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId} disabled={!isEditing || !!rental}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {propertiesToDisplay
                    .slice()
                    .sort((a, b) => {
                      const locationA = getLocationName(a.locationId);
                      const locationB = getLocationName(b.locationId);
                      if (locationA < locationB) return -1;
                      if (locationA > locationB) return 1;
                      return 0;
                    })
                    .map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getLocationName(property.locationId)}
                            {property.complement && ` - ${property.complement}`}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(property.value || 0)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant">{rental ? "Inquilino Selecionado" : "Inquilinos Disponíveis"} *</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId} disabled={!isEditing || !!rental}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Selecione o inquilino" />
                </SelectTrigger>
                <SelectContent>
                  {tenantsToDisplay
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                    .map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início Contrato *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim Contrato</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">Dia Pagamento *</Label>
              <Select value={paymentDay} onValueChange={setPaymentDay} disabled={!isEditing}>
                <SelectTrigger id="paymentDay">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGarage"
                checked={hasGarage}
                onCheckedChange={(checked) => {
                  setHasGarage(checked as boolean);
                  if (!checked) {
                    setGarageValue("");
                  }
                }}
                disabled={!isEditing}
              />
              <Label htmlFor="hasGarage" className="cursor-pointer">
                Vaga Garagem ?
              </Label>
            </div>

            {hasGarage && (
              <Input
                value={garageValue}
                onChange={(e) => setGarageValue(applyRealMask(e.target.value))}
                placeholder="R$ 0,00"
                className="w-32"
                disabled={!isEditing}
              />
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <Checkbox
                id="hasPartnerBroker"
                checked={hasPartnerBroker}
                onCheckedChange={(checked) => setHasPartnerBroker(checked as boolean)}
                disabled={!isEditing}
              />
              <Label htmlFor="hasPartnerBroker" className="cursor-pointer">
                Corretor Parceiro ?
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Valor Caução</Label>
              <Input
                id="securityDeposit"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(applyRealMask(e.target.value))}
                placeholder="R$ 0,00"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDepositInstallment"
                  checked={isDepositInstallment}
                  onCheckedChange={(checked) => {
                    setIsDepositInstallment(checked as boolean);
                    if (!checked) {
                      setDepositInstallmentCount("");
                      setDepositInstallment1("");
                      setDepositInstallment2("");
                      setDepositInstallment3("");
                    }
                  }}
                  disabled={!isEditing}
                />
                <Label htmlFor="isDepositInstallment" className="cursor-pointer">
                  Caução Parcelado ?
                </Label>
              </div>
              {isDepositInstallment && (
                <Select
                  value={depositInstallmentCount}
                  onValueChange={(value) => {
                    setDepositInstallmentCount(value);
                    if (value === "2") {
                      setDepositInstallment3("");
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a quantidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {isDepositInstallment && depositInstallmentCount && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="depositInstallment1">1ª Parcela</Label>
                <Input
                  id="depositInstallment1"
                  value={depositInstallment1}
                  onChange={(e) => setDepositInstallment1(applyRealMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositInstallment2">2ª Parcela</Label>
                <Input
                  id="depositInstallment2"
                  value={depositInstallment2}
                  onChange={(e) => setDepositInstallment2(applyRealMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={!isEditing}
                />
              </div>

              {depositInstallmentCount === "3" && (
                <div className="space-y-2">
                  <Label htmlFor="depositInstallment3">3ª Parcela</Label>
                  <Input
                    id="depositInstallment3"
                    value={depositInstallment3}
                    onChange={(e) => setDepositInstallment3(applyRealMask(e.target.value))}
                    placeholder="R$ 0,00"
                    disabled={!isEditing}
                  />
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-900 dark:text-emerald-100">Valor do Aluguel:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(selectedProperty?.value || 0)}
                </span>
              </div>
              {hasGarage && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-900 dark:text-emerald-100">Vaga Garagem:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {garageValue ? `+ ${garageValue}` : "+ R$ 0,00"}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-900 dark:text-emerald-100">Valor Total:</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Anexos</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("rentalCameraCapture")?.click()}
                  disabled={!isEditing}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("rentalFileUpload")?.click()}
                  disabled={!isEditing}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar Arquivo
                </Button>
                <input
                  id="rentalCameraCapture"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFileInputChange}
                />
                <input
                  id="rentalFileUpload"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={onFileInputChange}
                />
              </div>
            </div>

            {attachments.length > 0 && (
              <AttachmentViewer attachments={attachments} onRemove={removeAttachment} />
            )}
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