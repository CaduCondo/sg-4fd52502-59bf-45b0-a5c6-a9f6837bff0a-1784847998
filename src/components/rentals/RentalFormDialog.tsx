import { useState, useEffect, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Paperclip } from "lucide-react";
import { formatCurrency, parseCurrencyToNumber, formatCurrencyInput } from "@/lib/masks";
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

interface RentalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProperties: Property[];
  availableTenants: Tenant[];
  properties?: Property[];
  tenants?: Tenant[];
  locations?: Location[];
  onSuccess: () => void;
  rental?: Rental | null;
  isViewMode?: boolean;
  isLoadingData?: boolean;
}

export const RentalFormDialog = memo(function RentalFormDialog({
  open,
  onOpenChange,
  availableProperties,
  availableTenants,
  properties = [],
  tenants = [],
  locations: locationsFromProps = [],
  onSuccess,
  rental = null,
  isViewMode = false,
  isLoadingData = false,
}: RentalFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>(locationsFromProps);
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
    // setAttachments, 
    proportionalRentInfo,
    resetForm,
    handleFileUpload,
    removeAttachment,
    getSelectedProperty,
    calculateTotal,
  } = useRentalForm({
    open,
    rental,
    isViewMode,
    properties: rental ? properties : availableProperties,
    tenants: rental ? tenants : availableTenants,
    locations,
  });

  useEffect(() => {
    if (locationsFromProps.length > 0) {
      setLocations(locationsFromProps);
    }
  }, [locationsFromProps]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (open && locations.length === 0) {
        try {
          const data = await getAllLocations();
          setLocations(data);
        } catch (error) {
          console.error("Erro ao buscar locais:", error);
        }
      }
    };
    
    fetchLocations();
  }, [open, locations.length]);

  // Efeito para carregar dados quando um rental é passado (Edição ou Visualização)
  useEffect(() => {
    if (rental && open) {
      console.log("📝 Carregando dados da locação para o formulário:", rental);
      
      // Preencher estados com dados da locação
      setSelectedPropertyId(rental.propertyId);
      setSelectedTenantId(rental.tenantId);
      setStartDate(rental.startDate ? rental.startDate.split('T')[0] : '');
      setEndDate(rental.endDate ? rental.endDate.split('T')[0] : '');
      setPaymentDay(rental.paymentDay?.toString() || '');
      setHasGarage(rental.hasGarage || false);
      setGarageValue(rental.garageValue ? formatCurrency(rental.garageValue) : '');
      setHasPartnerBroker(rental.hasPartnerBroker || false);
      
      // Caução
      setDepositAmount(rental.depositAmount ? formatCurrency(rental.depositAmount) : '');
      setDepositPaymentDate(rental.depositPaymentDate ? rental.depositPaymentDate.split('T')[0] : '');
      setDepositPixCode(rental.depositPixCode || '');
      
      // Parcelamento Caução
      if (rental.depositInstallments && rental.depositInstallments > 1) {
        setIsDepositInstallment(true);
        setDepositInstallmentCount(rental.depositInstallments.toString());
        
        if (rental.depositInstallment2) {
          setDepositInstallment2(formatCurrency(rental.depositInstallment2));
          setDepositInstallment2PaymentDate(rental.depositInstallment2PaymentDate ? rental.depositInstallment2PaymentDate.split('T')[0] : '');
          setDepositInstallment2PixCode(rental.depositInstallment2PixCode || '');
        }
        
        if (rental.depositInstallment3) {
          setDepositInstallment3(formatCurrency(rental.depositInstallment3));
          setDepositInstallment3PaymentDate(rental.depositInstallment3PaymentDate ? rental.depositInstallment3PaymentDate.split('T')[0] : '');
          setDepositInstallment3PixCode(rental.depositInstallment3PixCode || '');
        }
      } else {
        setIsDepositInstallment(false);
      }
    }
  }, [rental, open, setSelectedPropertyId, setSelectedTenantId, setStartDate, setEndDate, setPaymentDay, setHasGarage, setGarageValue, setHasPartnerBroker, setDepositAmount, setDepositPaymentDate, setDepositPixCode, setIsDepositInstallment, setDepositInstallmentCount, setDepositInstallment2, setDepositInstallment2PaymentDate, setDepositInstallment2PixCode, setDepositInstallment3, setDepositInstallment3PaymentDate, setDepositInstallment3PixCode]);

  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPropertyId || !selectedTenantId || !startDate || !paymentDay) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const selectedProperty = propertiesToDisplay.find((p) => p.id === selectedPropertyId);
    const selectedTenant = tenantsToDisplay.find((t) => t.id === selectedTenantId);

    if (!selectedProperty || !selectedTenant) {
      toast({
        title: "Erro",
        description: "Imóvel ou inquilino não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const baseRent = selectedProperty.value || selectedProperty.monthlyRent || 0;
    const garageAmount = hasGarage && garageValue ? parseCurrencyToNumber(garageValue) : 0;
    let totalValue = baseRent + garageAmount;
    totalValue = parseFloat(totalValue.toFixed(2));

    if (!totalValue || totalValue <= 0 || isNaN(totalValue)) {
      toast({
        title: "Erro Crítico",
        description: `Valor do aluguel inválido: R$ ${totalValue}. Verifique o valor do imóvel.`,
        variant: "destructive",
      });
      return;
    }

    if (isDepositInstallment && depositInstallmentCount) {
      const count = parseInt(depositInstallmentCount);
      if (count === 2 && !depositInstallment2) {
        toast({ title: "Erro", description: "Preencha o valor da 2ª parcela.", variant: "destructive" });
        return;
      }
      if (count === 3 && (!depositInstallment2 || !depositInstallment3)) {
        toast({ title: "Erro", description: "Preencha os valores da 2ª e 3ª parcelas.", variant: "destructive" });
        return;
      }
    }

    try {
      setLoading(true);

      const propertyId = String(selectedPropertyId);
      const tenantId = String(selectedTenantId);
      
      const commonData = {
        propertyId: propertyId,
        tenantId: tenantId,
        startDate: startDate,
        endDate: endDate || null,
        paymentDay: parseInt(paymentDay),
        value: totalValue,
        monthlyRent: baseRent,
        depositAmount: parseCurrencyToNumber(depositAmount) || 0,
        status: "active" as const,
        isActive: true,
        attachments: attachments.length > 0 ? attachments : [],
        contractAttachments: [],
        hasGarage: hasGarage,
        garageValue: hasGarage && garageValue ? parseCurrencyToNumber(garageValue) : undefined,
        hasPartnerBroker: hasPartnerBroker,
      };

      const depositData: any = {
        depositInstallments: 1,
        depositInstallment1: parseCurrencyToNumber(depositAmount),
        depositPaymentDate: depositPaymentDate || null,
        depositPixCode: depositPixCode || null,
      };

      if (isDepositInstallment && depositInstallmentCount) {
        depositData.depositInstallments = parseInt(depositInstallmentCount);
        
        if (parseInt(depositInstallmentCount) >= 2) {
          depositData.depositInstallment2 = parseCurrencyToNumber(depositInstallment2);
          depositData.depositInstallment2PaymentDate = depositInstallment2PaymentDate || null;
          depositData.depositInstallment2PixCode = depositInstallment2PixCode || null;
        }

        if (parseInt(depositInstallmentCount) === 3) {
          depositData.depositInstallment3 = parseCurrencyToNumber(depositInstallment3);
          depositData.depositInstallment3PaymentDate = depositInstallment3PaymentDate || null;
          depositData.depositInstallment3PixCode = depositInstallment3PixCode || null;
        }
      }

      const fullUpdateData = { ...commonData, ...depositData };

      if (rental) {
        const updatedRental = await updateRentalService(rental.id, fullUpdateData);
        
        // Passar o objeto rental atualizado como terceiro argumento
        const rentalForUpdate = { ...rental, ...updatedRental };
        await updateFuturePayments(rental.id, totalValue, rentalForUpdate);

        if (rental.paymentDay !== parseInt(paymentDay)) {
          await updateFuturePaymentsOnPaymentDayChange(rental.id, parseInt(paymentDay));
        }

        const mergedRental: Rental = {
          ...rental,
          ...updatedRental,
          status: isViewMode ? "active" : (updatedRental.status || "active"),
          value: Number(updatedRental.value || 0),
          depositInstallments: Number(depositData.depositInstallments),
          depositInstallment1: Number(depositData.depositInstallment1),
          depositInstallment2: depositData.depositInstallment2 ? Number(depositData.depositInstallment2) : undefined,
          depositInstallment3: depositData.depositInstallment3 ? Number(depositData.depositInstallment3) : undefined,
          depositPaymentDate: depositData.depositPaymentDate,
          depositInstallment2PaymentDate: depositData.depositInstallment2PaymentDate,
          depositInstallment3PaymentDate: depositData.depositInstallment3PaymentDate,
          depositPixCode: depositData.depositPixCode,
          depositInstallment2PixCode: depositData.depositInstallment2PixCode,
          depositInstallment3PixCode: depositData.depositInstallment3PixCode,
        };

        await createPaymentsForRental({
          rental: mergedRental,
          startDate: new Date(mergedRental.startDate),
          endDate: mergedRental.endDate ? new Date(mergedRental.endDate) : new Date(new Date(mergedRental.startDate).setFullYear(new Date(mergedRental.startDate).getFullYear() + 1)),
          monthlyRent: Number(mergedRental.value),
          paymentDay: Number(mergedRental.paymentDay),
          hasGarage: mergedRental.hasGarage,
          garageValue: mergedRental.garageValue || 0,
        });
        
        setCreatedRentalData({
          rental: mergedRental,
          property: selectedProperty,
          tenant: selectedTenant,
          location: locations.find((loc) => loc.id === selectedProperty.locationId),
        });

        toast({
          title: "Sucesso!",
          description: "Locação atualizada com sucesso.",
        });

        setShowContract(true);
      } else {
        const createdRental = await createRental(fullUpdateData);
        
        await updateProperty(propertyId, { status: "occupied" });
        await updateTenant(tenantId, { status: "rented" });

        const mappedRental: Rental = {
          ...createdRental,
          monthlyRent: baseRent,
        };

        await createPaymentsForRental({
          rental: mappedRental,
          startDate: new Date(mappedRental.startDate),
          endDate: mappedRental.endDate ? new Date(mappedRental.endDate) : new Date(new Date(mappedRental.startDate).setFullYear(new Date(mappedRental.startDate).getFullYear() + 1)), // Default 1 year if null
          monthlyRent: Number(mappedRental.monthlyRent),
          paymentDay: Number(mappedRental.paymentDay),
          hasGarage: mappedRental.hasGarage,
          garageValue: mappedRental.garageValue || 0,
        });

        const selectedLocation = locations.find((loc) => loc.id === selectedProperty.locationId);

        setCreatedRentalData({
          rental: mappedRental,
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
    } catch (error: any) {
      console.error("❌ ERRO GERAL:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar locação. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    selectedPropertyId, selectedTenantId, startDate, paymentDay, properties, tenants, 
    hasGarage, garageValue, isDepositInstallment, depositInstallmentCount, 
    depositInstallment2, depositInstallment3, depositAmount, endDate, 
    hasPartnerBroker, attachments, depositPaymentDate, depositPixCode, 
    depositInstallment2PaymentDate, depositInstallment2PixCode, 
    depositInstallment3PaymentDate, depositInstallment3PixCode, 
    rental, isViewMode, locations, toast
  ]);

  const calculateTotalDeposit = useCallback(() => {
    let total = 0;
    if (depositAmount) total += parseCurrencyToNumber(depositAmount);
    if (isDepositInstallment && depositInstallmentCount) {
      if (parseInt(depositInstallmentCount) >= 2 && depositInstallment2) total += parseCurrencyToNumber(depositInstallment2);
      if (parseInt(depositInstallmentCount) === 3 && depositInstallment3) total += parseCurrencyToNumber(depositInstallment3);
    }
    return total;
  }, [depositAmount, isDepositInstallment, depositInstallmentCount, depositInstallment2, depositInstallment3]);

  const propertiesToDisplay = rental ? properties : availableProperties;
  const tenantsToDisplay = rental ? tenants : availableTenants;
  const selectedProperty = getSelectedProperty();
  const isFieldDisabled = isViewMode && !isEditing;

  if (!open) return null;

  if (isLoadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Carregando dados...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">{rental ? "Imóvel Selecionado" : "Imóveis Disponíveis"} *</Label>
              <Select
                value={selectedPropertyId}
                onValueChange={(value) => setSelectedPropertyId(value)}
                disabled={isFieldDisabled || !!rental}
              >
                <SelectTrigger id="property_id">
                  <SelectValue placeholder="Selecione um imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {propertiesToDisplay
                    .slice()
                    .sort((a, b) => {
                      const getLocName = (p: Property) => 
                        p.location || 
                        locations.find(l => l.id === p.locationId)?.name || 
                        p.locationDetails?.name || 
                        "Local não encontrado";
                        
                      const locationA = getLocName(a);
                      const locationB = getLocName(b);
                      
                      if (locationA < locationB) return -1;
                      if (locationA > locationB) return 1;
                      return 0;
                    })
                    .map((property) => {
                      const locationName = 
                        property.location || 
                        locations.find(l => l.id === property.locationId)?.name || 
                        property.locationDetails?.name || 
                        "Local não encontrado";
                        
                      return (
                        <SelectItem key={property.id} value={property.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {locationName}
                              {property.complement && ` - ${property.complement}`}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm font-semibold text-emerald-600">
                              {formatCurrency(property.value || 0)}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant">{rental ? "Inquilino Selecionado" : "Inquilinos Disponíveis"} *</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId} disabled={isFieldDisabled || !!rental}>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início Contrato *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={isFieldDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim Contrato</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isFieldDisabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDay">Dia Pagamento *</Label>
              <Select value={paymentDay} onValueChange={setPaymentDay} disabled={isFieldDisabled}>
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
                disabled={isFieldDisabled}
              />
              <Label htmlFor="hasGarage" className="cursor-pointer">
                Vaga Garagem ?
              </Label>
            </div>

            {hasGarage && (
              <Input
                value={garageValue}
                onChange={(e) => setGarageValue(formatCurrencyInput(e.target.value))}
                placeholder="R$ 0,00"
                className="w-32"
                disabled={isFieldDisabled}
              />
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <Checkbox
                id="hasPartnerBroker"
                checked={hasPartnerBroker}
                onCheckedChange={(checked) => setHasPartnerBroker(checked as boolean)}
                disabled={isFieldDisabled}
              />
              <Label htmlFor="hasPartnerBroker" className="cursor-pointer">
                Corretor Parceiro ?
              </Label>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Informações da Caução</h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="space-y-2 md:col-span-5">
                <Label htmlFor="depositAmount">
                  {isDepositInstallment ? "Valor Caução (1ª Parcela)" : "Valor Caução (À vista)"} *
                </Label>
                <Input
                  id="depositAmount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(formatCurrencyInput(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={isFieldDisabled}
                />
              </div>

              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="depositPaymentDate">Data Pagamento *</Label>
                <Input
                  id="depositPaymentDate"
                  type="date"
                  value={depositPaymentDate}
                  onChange={(e) => setDepositPaymentDate(e.target.value)}
                  disabled={isFieldDisabled}
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="depositPixCode">Código PIX</Label>
                <Input
                  id="depositPixCode"
                  value={depositPixCode}
                  onChange={(e) => setDepositPixCode(e.target.value)}
                  placeholder="Código PIX"
                  disabled={isFieldDisabled}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDepositInstallment"
                  checked={isDepositInstallment}
                  onCheckedChange={(checked) => {
                    setIsDepositInstallment(checked as boolean);
                    if (!checked) {
                      setDepositInstallmentCount("");
                      setDepositInstallment2("");
                      setDepositInstallment3("");
                      setDepositInstallment2PaymentDate("");
                      setDepositInstallment3PaymentDate("");
                    }
                  }}
                  disabled={isFieldDisabled}
                />
                <Label htmlFor="isDepositInstallment" className="cursor-pointer font-medium">
                  Caução Parcelado ?
                </Label>
              </div>

              {isDepositInstallment && (
                <div className="w-40">
                  <Select
                    value={depositInstallmentCount}
                    onValueChange={(value) => {
                      setDepositInstallmentCount(value);
                      if (value === "2") {
                        setDepositInstallment3("");
                        setDepositInstallment3PaymentDate("");
                      }
                    }}
                    disabled={isFieldDisabled}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 parcelas</SelectItem>
                      <SelectItem value="3">3 parcelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isDepositInstallment && depositInstallmentCount && (
              <div className="space-y-4 mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="space-y-2 md:col-span-5">
                    <Label htmlFor="depositInstallment2">Valor Caução (2ª Parcela)</Label>
                    <Input
                      id="depositInstallment2"
                      value={depositInstallment2}
                      onChange={(e) => setDepositInstallment2(formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                      disabled={isFieldDisabled}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-4">
                    <Label htmlFor="depositInstallment2PaymentDate">Data Pagamento</Label>
                    <Input
                      id="depositInstallment2PaymentDate"
                      type="date"
                      value={depositInstallment2PaymentDate}
                      onChange={(e) => setDepositInstallment2PaymentDate(e.target.value)}
                      disabled={isFieldDisabled}
                    />
                  </div>
                </div>

                {depositInstallmentCount === "3" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="space-y-2 md:col-span-5">
                      <Label htmlFor="depositInstallment3">Valor Caução (3ª Parcela)</Label>
                      <Input
                        id="depositInstallment3"
                        value={depositInstallment3}
                        onChange={(e) => setDepositInstallment3(formatCurrencyInput(e.target.value))}
                        placeholder="R$ 0,00"
                        disabled={isFieldDisabled}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-4">
                      <Label htmlFor="depositInstallment3PaymentDate">Data Pagamento</Label>
                      <Input
                        id="depositInstallment3PaymentDate"
                        type="date"
                        value={depositInstallment3PaymentDate}
                        onChange={(e) => setDepositInstallment3PaymentDate(e.target.value)}
                        disabled={isFieldDisabled}
                      />
                    </div>
                  </div>
                )}

                {isDepositInstallment && depositInstallmentCount && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-900 dark:text-blue-100">Valor Total Caução:</span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(calculateTotalDeposit())}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-2">
                      * Soma de todas as parcelas do caução
                    </p>
                  </div>
                )}
              </div>
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
                    {garageValue ? `+ ${formatCurrency(parseCurrencyToNumber(garageValue))}` : "+ R$ 0,00"}
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

          {proportionalRentInfo.isProportional && startDate && paymentDay && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    📅 Primeira Parcela Proporcional
                  </span>
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>
                    <strong>Data Início:</strong> {new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  <p>
                    <strong>Dia Vencimento:</strong> {paymentDay}
                  </p>
                  <p>
                    <strong>Dias a Cobrar:</strong> {proportionalRentInfo.days} dias
                  </p>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-900 dark:text-blue-100">Aluguel Proporcional:</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {formatCurrency(((selectedProperty?.value || 0) / 30 * proportionalRentInfo.days))}
                    </span>
                  </div>
                  
                  {hasGarage && garageValue && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-900 dark:text-blue-100">Vaga Proporcional:</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {formatCurrency((parseCurrencyToNumber(garageValue) / 30 * proportionalRentInfo.days))}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t-2 border-blue-300 dark:border-blue-700">
                    <span className="font-bold text-blue-900 dark:text-blue-100">Valor Total 1ª Parcela:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(proportionalRentInfo.firstRentValue)}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  * Cálculo: (Valor Mensal ÷ 30 dias) × {proportionalRentInfo.days} dias
                </p>
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
                  disabled={isFieldDisabled}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("rentalFileUpload")?.click()}
                  disabled={isFieldDisabled}
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
                  {loading ? (rental ? "Atualizando..." : "Criando...") : rental ? "Atualizar Locação" : "Criar Locação"}
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
});