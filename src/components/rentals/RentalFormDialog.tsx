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
  const [monthlyRent, setMonthlyRent] = useState("");
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
    setMonthlyRent("");
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

    if (!selectedPropertyId || !selectedTenantId || !startDate || !paymentDay || !monthlyRent) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const monthlyRentValue = parseFloat(monthlyRent.replace(/\./g, "").replace(",", "."));
      const garageValueNum = hasGarage ? parseFloat(garageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
      const totalValue = monthlyRentValue + garageValueNum;

      const selectedProperty = availableProperties.find((p) => p.id === selectedPropertyId);

      const newRental = {
        propertyId: selectedPropertyId,
        tenantId: selectedTenantId,
        startDate,
        endDate: endDate || null,
        paymentDay: parseInt(paymentDay),
        monthlyRent: monthlyRentValue,
        value: totalValue,
        hasGarage,
        garageValue: hasGarage ? garageValueNum : undefined,
        isActive: true,
        attachments,
        locationId: selectedProperty?.locationId || "",
      };

      const createdRental = await createRental(newRental);

      await updateProperty(selectedPropertyId, { status: "rented" });
      await updateTenant(selectedTenantId, { status: "rented" });

      await createPaymentsForRental(createdRental);

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
    const rent = parseFloat(monthlyRent.replace(/\./g, "").replace(",", ".") || "0");
    const garage = hasGarage ? parseFloat(garageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
    return rent + garage;
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
              <Label htmlFor="property">Imóvel *</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {getLocationName(property.locationId)}
                      {property.complement && ` - ${property.complement}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProperty && (
                <p className="text-sm text-muted-foreground">
                  Valor: {formatCurrency(selectedProperty.value)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant">Inquilino *</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Selecione o inquilino" />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants.map((tenant) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Valor Aluguel *</Label>
              <Input
                id="monthlyRent"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(applyRealMask(e.target.value))}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="hasGarage"
                  checked={hasGarage}
                  onCheckedChange={(checked) => setHasGarage(checked as boolean)}
                />
                <Label htmlFor="hasGarage">Vaga Garagem</Label>
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
          </div>

          {(monthlyRent || garageValue) && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Valor Total:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(calculatedTotal())}
                </span>
              </div>
            </div>
          )}

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