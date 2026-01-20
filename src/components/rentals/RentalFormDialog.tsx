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
import type { Property, Tenant, Location } from "@/types";

interface RentalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProperties: Property[];
  availableTenants: Tenant[];
  onSuccess: () => void;
}

export function RentalFormDialog({
  open,
  onOpenChange,
  availableProperties,
  availableTenants,
  onSuccess,
}: RentalFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

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

      const newRental = {
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

      const createdRental = await createRental(newRental);

      await updateProperty(selectedPropertyId, { status: "occupied" });
      await updateTenant(selectedTenantId, { status: "rented" });

      console.log("Creating payments for rental:", createdRental);
      await createPaymentsForRental(createdRental);
      console.log("Payments created for rental:", createdRental);

      toast({
        title: "Sucesso!",
        description: "Locação criada com sucesso.",
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a locação.",
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

  const selectedProperty = availableProperties.find((p) => p.id === selectedPropertyId);
  
  const calculatedTotal = () => {
    const propertyValue = selectedProperty?.value || 0;
    const garage = hasGarage ? parseFloat(garageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
    return propertyValue + garage;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Locação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Imóveis Disponíveis *</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties
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
              <Label htmlFor="tenant">Inquilinos Disponíveis *</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Selecione o inquilino" />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants
                    .slice()
                    .sort((a, b) => {
                      if (a.name < b.name) return -1;
                      if (a.name > b.name) return 1;
                      return 0;
                    })
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">Dia Pagamento *</Label>
              <Select value={paymentDay} onValueChange={setPaymentDay}>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Locação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}