import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Paperclip } from "lucide-react";
import { applyRealMask, formatCurrency } from "@/lib/masks";
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

    try {
      setLoading(true);

      const rentalData = prepareRentalData(
        selectedPropertyId,
        selectedTenantId,
        startDate,
        endDate,
        paymentDay,
        selectedProperty.value || 0,
        hasGarage,
        garageValue,
        attachments
      );

      if (rental) {
        const updatedRental = await updateRentalService(rental.id, rentalData);
        await updateFuturePayments(rental.id, totalValue);

        if (rental.paymentDay !== parseInt(paymentDay)) {
          await updateFuturePaymentsOnPaymentDayChange(rental.id, parseInt(paymentDay));
        }

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
        await updateProperty(selectedPropertyId, { status: "occupied" });

        const tenant = availableTenants.find((t) => t.id === selectedTenantId);
        if (tenant) {
          await updateTenant(selectedTenantId, {
            ...tenant,
            status: "rented",
          });
        }

        await createPaymentsForRental(createdRental);

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
              <Label htmlFor="startDate">Data Início *</Label>
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
              <Label htmlFor="endDate">Data Término</Label>
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

          <div className="space-y-2">
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
                id="garageValue"
                value={garageValue}
                onChange={(e) => setGarageValue(applyRealMask(e.target.value))}
                placeholder="R$ 0,00"
                disabled={!isEditing}
              />
            )}
          </div>

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