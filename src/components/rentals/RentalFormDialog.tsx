import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Paperclip, X } from "lucide-react";
import { applyRealMask, formatCurrency } from "@/lib/masks";
import { create as createRental } from "@/services/rentalService";
import { update as updateProperty } from "@/services/propertyService";
import { update as updateTenant } from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import { createPaymentsForRental } from "@/services/paymentService";
import type { Property, Tenant, Location, Rental } from "@/types";
import { update as updateRentalService } from "@/services/rentalService";
import { updateFuturePayments } from "@/services/paymentService";

interface RentalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProperties: Property[];
  availableTenants: Tenant[];
  properties?: Property[]; // Nova prop opcional
  tenants?: Tenant[];      // Nova prop opcional
  onSuccess: () => void;
  rental?: Rental | null;
  isViewMode?: boolean;
}

export function RentalFormDialog({
  open,
  onOpenChange,
  availableProperties,
  availableTenants,
  properties = [], // Default para array vazio
  tenants = [],    // Default para array vazio
  onSuccess,
  rental = null,
  isViewMode = false,
}: RentalFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isEditing, setIsEditing] = useState(!isViewMode);

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [hasGarage, setHasGarage] = useState(false);
  const [garageValue, setGarageValue] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    setIsEditing(!isViewMode);
    
    if (rental) {
      setSelectedPropertyId(rental.propertyId || "");
      setSelectedTenantId(rental.tenantId || "");
      setStartDate(rental.startDate || "");
      setEndDate(rental.endDate || "");
      setPaymentDay(rental.paymentDay?.toString() || "");
      setHasGarage(rental.hasGarage || false);
      setGarageValue(rental.garageValue ? formatCurrency(rental.garageValue) : "");
      setAttachments(rental.contractAttachments || rental.attachments || []);
    } else {
      resetForm();
    }
  }, [rental, open, isViewMode]);

  const loadLocations = async () => {
    try {
      const locationsData = await getAllLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const resetForm = () => {
    setSelectedPropertyId("");
    setSelectedTenantId("");
    setStartDate("");
    setEndDate("");
    setPaymentDay("");
    setHasGarage(false);
    setGarageValue("");
    setAttachments([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAttachments([...attachments, base64String]);
      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi anexado com sucesso.`,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAttachments([...attachments, base64String]);
      toast({
        title: "Foto capturada",
        description: "Foto anexada com sucesso.",
      });
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast({
      title: "Anexo removido",
      description: "Anexo removido com sucesso.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPropertyId || !selectedTenantId || !startDate || !paymentDay) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const selectedProperty = availableProperties.find((p) => p.id === selectedPropertyId);
      if (!selectedProperty) {
        throw new Error("Imóvel não encontrado");
      }

      const propertyValue = selectedProperty.value || 0;
      const garageValueNum = hasGarage ? parseFloat(garageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
      const totalValue = propertyValue + garageValueNum;

      const rentalData = {
        property_id: selectedPropertyId,
        tenant_id: selectedTenantId,
        start_date: startDate,
        end_date: endDate || null,
        payment_day: parseInt(paymentDay),
        monthly_rent: propertyValue,
        value: totalValue,
        has_garage: hasGarage,
        garage_value: hasGarage ? garageValueNum : null,
        is_active: true,
        contract_attachments: attachments,
        attachments: attachments,
      };

      if (rental) {
        // Atualizar locação existente
        await updateRentalService(rental.id, rentalData);
        
        // Atualizar recebimentos futuros
        await updateFuturePayments(rental.id, totalValue);

        toast({
          title: "Sucesso!",
          description: "Locação atualizada com sucesso.",
        });
      } else {
        // Criar nova locação
        const createdRental = await createRental(rentalData);
        await updateProperty(selectedPropertyId, { status: "occupied" });
        
        const tenant = availableTenants.find(t => t.id === selectedTenantId);
        if (tenant) {
          await updateTenant(selectedTenantId, { 
            ...tenant,
            status: "rented" 
          });
        }

        await createPaymentsForRental(createdRental);

        toast({
          title: "Sucesso!",
          description: "Locação criada com sucesso.",
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
      window.location.reload();
    } catch (error) {
      console.error("Error saving rental:", error);
      toast({
        title: "Erro",
        description: rental ? "Não foi possível atualizar a locação." : "Não foi possível criar a locação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (locationId: string) => {
    const locationsList = locations; // Usar locations do estado local
    const location = locationsList.find((loc) => loc.id === locationId);
    return location?.name || "Local não encontrado";
  };

  // Determinar qual lista de propriedades usar:
  // Se estiver editando/visualizando, usa a lista completa (para mostrar o imóvel ocupado atual).
  // Se for nova locação, usa apenas as disponíveis.
  const propertiesToDisplay = rental ? properties : availableProperties;
  
  // O mesmo para inquilinos
  const tenantsToDisplay = rental ? tenants : availableTenants;

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  
  const calculatedTotal = () => {
    const propertyValue = selectedProperty?.value || 0;
    const garage = hasGarage ? parseFloat(garageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
    return propertyValue + garage;
  };

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
                <span className="text-emerald-900 dark:text-emerald-100">
                  Valor do Aluguel:
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(selectedProperty?.value || 0)}
                </span>
              </div>
              {hasGarage && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-900 dark:text-emerald-100">
                    Vaga Garagem:
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {garageValue ? `+ ${garageValue}` : "+ R$ 0,00"}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-900 dark:text-emerald-100">
                  Valor Total:
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(calculatedTotal())}
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
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("rentalFileUpload")?.click()}
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
                  onChange={handleCameraCapture}
                />
                <input
                  id="rentalFileUpload"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="text-sm truncate flex-1">Arquivo {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                  onClick={() => setIsEditing(true)}
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
                  {loading ? (rental ? "Atualizando..." : "Criando...") : (rental ? "Atualizar Locação" : "Criar Locação")}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}