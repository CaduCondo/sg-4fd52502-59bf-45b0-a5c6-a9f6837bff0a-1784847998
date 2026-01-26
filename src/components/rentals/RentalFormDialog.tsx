import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import type { Rental, Property, Tenant } from "@/types";
import { applyCurrencyMask, parseCurrencyToNumber, applyPercentageMask, parsePercentageToNumber } from "@/lib/masks";
import { RentalContract } from "@/components/RentalContract";

interface RentalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental?: Rental;
  properties?: Property[];
  tenants?: Tenant[];
  onSuccess: () => void;
}

export function RentalFormDialog({
  open,
  onOpenChange,
  rental,
  properties = [],
  tenants = [],
  onSuccess,
}: RentalFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [contractData, setContractData] = useState<{ rental: Rental; property: Property; tenant: Tenant } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields - Using (rental as any) for snake_case properties to avoid TS errors
  const [propertyId, setPropertyId] = useState((rental?.propertyId || (rental as any)?.property_id) || "");
  const [tenantId, setTenantId] = useState((rental?.tenantId || (rental as any)?.tenant_id) || "");
  const [startDate, setStartDate] = useState((rental?.startDate || (rental as any)?.start_date) || "");
  const [endDate, setEndDate] = useState((rental?.endDate || (rental as any)?.end_date) || "");
  const [monthlyRent, setMonthlyRent] = useState((rental?.monthlyRent || (rental as any)?.monthly_rent) ? applyCurrencyMask(((rental?.monthlyRent || (rental as any)?.monthly_rent) as number).toString()) : "");
  const [paymentDay, setPaymentDay] = useState((rental?.paymentDay || (rental as any)?.payment_day)?.toString() || "");
  const [securityDeposit, setSecurityDeposit] = useState((rental?.securityDeposit || (rental as any)?.security_deposit) ? applyCurrencyMask(((rental?.securityDeposit || (rental as any)?.security_deposit) as number).toString()) : "");
  const [commissionValue, setCommissionValue] = useState((rental as any)?.commission_value ? applyCurrencyMask(((rental as any).commission_value as number).toString()) : "");
  const [hasPartnerBroker, setHasPartnerBroker] = useState((rental?.hasPartnerBroker || (rental as any)?.has_partner_broker) || false);
  const [partnerBrokerValue, setPartnerBrokerValue] = useState((rental?.partnerBrokerValue || (rental as any)?.partner_broker_value) ? applyPercentageMask(((rental?.partnerBrokerValue || (rental as any)?.partner_broker_value) as number).toString()) : "");
  const [waterValue, setWaterValue] = useState((rental as any)?.water_value ? applyCurrencyMask(((rental as any).water_value as number).toString()) : "");
  const [electricityValue, setElectricityValue] = useState((rental as any)?.electricity_value ? applyCurrencyMask(((rental as any).electricity_value as number).toString()) : "");
  const [gasValue, setGasValue] = useState((rental as any)?.gas_value ? applyCurrencyMask(((rental as any).gas_value as number).toString()) : "");
  const [waterResponsibility, setWaterResponsibility] = useState<"landlord" | "tenant">((rental?.waterResponsibility || (rental as any)?.water_responsibility) || "tenant");
  const [electricityResponsibility, setElectricityResponsibility] = useState<"landlord" | "tenant">((rental?.electricityResponsibility || (rental as any)?.electricity_responsibility) || "tenant");
  const [gasResponsibility, setGasResponsibility] = useState<"landlord" | "tenant">((rental?.gasResponsibility || (rental as any)?.gas_responsibility) || "tenant");
  
  // Deposit installment fields
  const [isDepositInstallment, setIsDepositInstallment] = useState((rental as any)?.is_deposit_installment || false);
  const [depositInstallmentCount, setDepositInstallmentCount] = useState<number>((rental as any)?.deposit_installment_count || 2);
  const [depositPaymentDate, setDepositPaymentDate] = useState((rental?.depositPaymentDate || (rental as any)?.deposit_payment_date) || "");
  const [depositPixCode, setDepositPixCode] = useState((rental?.depositPixCode || (rental as any)?.deposit_pix_code) || "");
  const [depositInstallment2, setDepositInstallment2] = useState((rental?.depositInstallment2 || (rental as any)?.deposit_installment_2) ? applyCurrencyMask(((rental?.depositInstallment2 || (rental as any)?.deposit_installment_2) as number).toString()) : "");
  const [depositPaymentDate2, setDepositPaymentDate2] = useState((rental as any)?.deposit_payment_date_2 || "");
  const [depositPixCode2, setDepositPixCode2] = useState((rental as any)?.deposit_pix_code_2 || "");
  const [depositInstallment3, setDepositInstallment3] = useState((rental?.depositInstallment3 || (rental as any)?.deposit_installment_3) ? applyCurrencyMask(((rental?.depositInstallment3 || (rental as any)?.deposit_installment_3) as number).toString()) : "");
  const [depositPaymentDate3, setDepositPaymentDate3] = useState((rental as any)?.deposit_payment_date_3 || "");
  const [depositPixCode3, setDepositPixCode3] = useState((rental as any)?.deposit_pix_code_3 || "");

  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string }>>(
    Array.isArray(rental?.attachments) 
      ? rental.attachments 
      : []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rental) {
      setPropertyId((rental?.propertyId || (rental as any)?.property_id) || "");
      setTenantId((rental?.tenantId || (rental as any)?.tenant_id) || "");
      setStartDate((rental?.startDate || (rental as any)?.start_date) || "");
      setEndDate((rental?.endDate || (rental as any)?.end_date) || "");
      setMonthlyRent((rental?.monthlyRent || (rental as any)?.monthly_rent) ? applyCurrencyMask(((rental?.monthlyRent || (rental as any)?.monthly_rent) as number).toString()) : "");
      setPaymentDay((rental?.paymentDay || (rental as any)?.payment_day)?.toString() || "");
      setSecurityDeposit((rental?.securityDeposit || (rental as any)?.security_deposit) ? applyCurrencyMask(((rental?.securityDeposit || (rental as any)?.security_deposit) as number).toString()) : "");
      setCommissionValue((rental as any)?.commission_value ? applyCurrencyMask(((rental as any).commission_value as number).toString()) : "");
      setHasPartnerBroker((rental?.hasPartnerBroker || (rental as any)?.has_partner_broker) || false);
      setPartnerBrokerValue((rental?.partnerBrokerValue || (rental as any)?.partner_broker_value) ? applyPercentageMask(((rental?.partnerBrokerValue || (rental as any)?.partner_broker_value) as number).toString()) : "");
      setWaterValue((rental as any)?.water_value ? applyCurrencyMask(((rental as any).water_value as number).toString()) : "");
      setElectricityValue((rental as any)?.electricity_value ? applyCurrencyMask(((rental as any).electricity_value as number).toString()) : "");
      setGasValue((rental as any)?.gas_value ? applyCurrencyMask(((rental as any).gas_value as number).toString()) : "");
      setWaterResponsibility((rental?.waterResponsibility || (rental as any)?.water_responsibility) || "tenant");
      setElectricityResponsibility((rental?.electricityResponsibility || (rental as any)?.electricity_responsibility) || "tenant");
      setGasResponsibility((rental?.gasResponsibility || (rental as any)?.gas_responsibility) || "tenant");
      setIsDepositInstallment((rental as any)?.is_deposit_installment || false);
      setDepositInstallmentCount((rental as any)?.deposit_installment_count || 2);
      setDepositPaymentDate((rental?.depositPaymentDate || (rental as any)?.deposit_payment_date) || "");
      setDepositPixCode((rental?.depositPixCode || (rental as any)?.deposit_pix_code) || "");
      setDepositInstallment2((rental?.depositInstallment2 || (rental as any)?.deposit_installment_2) ? applyCurrencyMask(((rental?.depositInstallment2 || (rental as any)?.deposit_installment_2) as number).toString()) : "");
      setDepositPaymentDate2((rental as any)?.deposit_payment_date_2 || "");
      setDepositPixCode2((rental as any)?.deposit_pix_code_2 || "");
      setDepositInstallment3((rental?.depositInstallment3 || (rental as any)?.deposit_installment_3) ? applyCurrencyMask(((rental?.depositInstallment3 || (rental as any)?.deposit_installment_3) as number).toString()) : "");
      setDepositPaymentDate3((rental as any)?.deposit_payment_date_3 || "");
      setDepositPixCode3((rental as any)?.deposit_pix_code_3 || "");
      setAttachments(Array.isArray(rental?.attachments) ? rental.attachments : []);
    }
  }, [rental]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!propertyId) newErrors.propertyId = "Selecione um imóvel";
    if (!tenantId) newErrors.tenantId = "Selecione um inquilino";
    if (!startDate) newErrors.startDate = "Data de início é obrigatória";
    if (!endDate) newErrors.endDate = "Data de término é obrigatória";
    if (!monthlyRent) newErrors.monthlyRent = "Valor do aluguel é obrigatório";
    if (!paymentDay) newErrors.paymentDay = "Dia de pagamento é obrigatório";
    if (!securityDeposit) newErrors.securityDeposit = "Valor da caução é obrigatório";

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endDate = "Data de término deve ser posterior à data de início";
    }

    if (isDepositInstallment) {
      if (!depositPaymentDate) newErrors.depositPaymentDate = "Data de pagamento da 1ª parcela é obrigatória";
      if (!depositInstallment2) newErrors.depositInstallment2 = "Valor da 2ª parcela é obrigatório";
      if (!depositPaymentDate2) newErrors.depositPaymentDate2 = "Data de pagamento da 2ª parcela é obrigatória";
      
      if (depositInstallmentCount === 3) {
        if (!depositInstallment3) newErrors.depositInstallment3 = "Valor da 3ª parcela é obrigatório";
        if (!depositPaymentDate3) newErrors.depositPaymentDate3 = "Data de pagamento da 3ª parcela é obrigatória";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const newAttachments: Array<{ url: string; name: string; type: string }> = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao fazer upload do arquivo");

        const data = await response.json();
        newAttachments.push({
          url: data.url,
          name: file.name,
          type: file.type,
        });
      }

      setAttachments([...attachments, ...newAttachments]);
      toast({
        title: "Sucesso",
        description: "Arquivos enviados com sucesso",
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const calculateTotalDeposit = () => {
    if (!isDepositInstallment) return null;
    
    let total = parseCurrencyToNumber(securityDeposit);
    if (depositInstallment2) total += parseCurrencyToNumber(depositInstallment2);
    if (depositInstallmentCount === 3 && depositInstallment3) total += parseCurrencyToNumber(depositInstallment3);
    
    return total;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const rentalData = {
        property_id: propertyId,
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: parseCurrencyToNumber(monthlyRent),
        payment_day: parseInt(paymentDay),
        security_deposit: parseCurrencyToNumber(securityDeposit),
        commission_value: commissionValue ? parseCurrencyToNumber(commissionValue) : null,
        has_partner_broker: hasPartnerBroker,
        partner_broker_value: hasPartnerBroker && partnerBrokerValue ? parsePercentageToNumber(partnerBrokerValue) : null,
        water_value: waterValue ? parseCurrencyToNumber(waterValue) : null,
        electricity_value: electricityValue ? parseCurrencyToNumber(electricityValue) : null,
        gas_value: gasValue ? parseCurrencyToNumber(gasValue) : null,
        water_responsibility: waterResponsibility,
        electricity_responsibility: electricityResponsibility,
        gas_responsibility: gasResponsibility,
        is_deposit_installment: isDepositInstallment,
        deposit_installment_count: isDepositInstallment ? depositInstallmentCount : null,
        deposit_payment_date: isDepositInstallment ? depositPaymentDate : null,
        deposit_pix_code: isDepositInstallment ? depositPixCode : null,
        deposit_installment_2: isDepositInstallment ? parseCurrencyToNumber(depositInstallment2) : null,
        deposit_payment_date_2: isDepositInstallment ? depositPaymentDate2 : null,
        deposit_pix_code_2: isDepositInstallment ? depositPixCode2 : null,
        deposit_installment_3: isDepositInstallment && depositInstallmentCount === 3 ? parseCurrencyToNumber(depositInstallment3) : null,
        deposit_payment_date_3: isDepositInstallment && depositInstallmentCount === 3 ? depositPaymentDate3 : null,
        deposit_pix_code_3: isDepositInstallment && depositInstallmentCount === 3 ? depositPixCode3 : null,
        attachments,
        status: "active",
      };

      if (rental?.id) {
        const { error } = await supabase
          .from("rentals")
          .update(rentalData)
          .eq("id", rental.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Locação atualizada com sucesso",
        });
      } else {
        const { data: newRental, error } = await supabase
          .from("rentals")
          .insert([rentalData])
          .select()
          .single();

        if (error) throw error;

        // Prepare contract data
        const property = properties.find((p) => p.id === propertyId);
        const tenant = tenants.find((t) => t.id === tenantId);

        if (property && tenant) {
          // Explicitly creating a full object that matches what RentalContract needs
          // Note: we're passing property and tenant separately to the component,
          // but saving them in state for the render condition
          const rentalWithRelations = {
            ...newRental,
            property,
            tenant,
          } as Rental;

          setContractData({
            rental: rentalWithRelations,
            property,
            tenant
          });
          setShowContract(true);
          return;
        }

        toast({
          title: "Sucesso",
          description: "Locação criada com sucesso",
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving rental:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar locação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!rental?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Locação" : "Nova Locação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property">Imóvel *</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger className={errors.propertyId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione o imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.propertyId && <p className="text-sm text-red-500">{errors.propertyId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant">Inquilino *</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger className={errors.tenantId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione o inquilino" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tenantId && <p className="text-sm text-red-500">{errors.tenantId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={errors.startDate ? "border-red-500" : ""}
                />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={errors.endDate ? "border-red-500" : ""}
                />
                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Rent Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações de Aluguel</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Valor do Aluguel *</Label>
                <Input
                  id="monthlyRent"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(applyCurrencyMask(e.target.value))}
                  placeholder="R$ 0,00"
                  className={errors.monthlyRent ? "border-red-500" : ""}
                />
                {errors.monthlyRent && <p className="text-sm text-red-500">{errors.monthlyRent}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDay">Dia de Pagamento *</Label>
                <Input
                  id="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  placeholder="Ex: 10"
                  className={errors.paymentDay ? "border-red-500" : ""}
                />
                {errors.paymentDay && <p className="text-sm text-red-500">{errors.paymentDay}</p>}
              </div>
            </div>
          </div>

          {/* Deposit Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações de Caução</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Valor Caução (1ª Parcela) *</Label>
                <Input
                  id="securityDeposit"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(applyCurrencyMask(e.target.value))}
                  placeholder="R$ 0,00"
                  className={errors.securityDeposit ? "border-red-500" : ""}
                />
                {errors.securityDeposit && <p className="text-sm text-red-500">{errors.securityDeposit}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositPaymentDate">Data Pagamento</Label>
                <Input
                  id="depositPaymentDate"
                  type="date"
                  value={depositPaymentDate}
                  onChange={(e) => setDepositPaymentDate(e.target.value)}
                  className={errors.depositPaymentDate ? "border-red-500" : ""}
                />
                {errors.depositPaymentDate && <p className="text-sm text-red-500">{errors.depositPaymentDate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositPixCode">Código PIX</Label>
                <Input
                  id="depositPixCode"
                  value={depositPixCode}
                  onChange={(e) => setDepositPixCode(e.target.value)}
                  placeholder="Código PIX"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDepositInstallment"
                checked={isDepositInstallment}
                onCheckedChange={(checked) => setIsDepositInstallment(checked as boolean)}
              />
              <Label htmlFor="isDepositInstallment">Caução Parcelado</Label>
              {isDepositInstallment && (
                <Select
                  value={depositInstallmentCount.toString()}
                  onValueChange={(value) => setDepositInstallmentCount(parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 parcelas</SelectItem>
                    <SelectItem value="3">3 parcelas</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {isDepositInstallment && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositInstallment2">Valor Caução (2ª Parcela) *</Label>
                    <Input
                      id="depositInstallment2"
                      value={depositInstallment2}
                      onChange={(e) => setDepositInstallment2(applyCurrencyMask(e.target.value))}
                      placeholder="R$ 0,00"
                      className={errors.depositInstallment2 ? "border-red-500" : ""}
                    />
                    {errors.depositInstallment2 && <p className="text-sm text-red-500">{errors.depositInstallment2}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depositPaymentDate2">Data Pagamento *</Label>
                    <Input
                      id="depositPaymentDate2"
                      type="date"
                      value={depositPaymentDate2}
                      onChange={(e) => setDepositPaymentDate2(e.target.value)}
                      className={errors.depositPaymentDate2 ? "border-red-500" : ""}
                    />
                    {errors.depositPaymentDate2 && <p className="text-sm text-red-500">{errors.depositPaymentDate2}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depositPixCode2">Código PIX</Label>
                    <Input
                      id="depositPixCode2"
                      value={depositPixCode2}
                      onChange={(e) => setDepositPixCode2(e.target.value)}
                      placeholder="Código PIX"
                    />
                  </div>
                </div>

                {depositInstallmentCount === 3 && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depositInstallment3">Valor Caução (3ª Parcela) *</Label>
                      <Input
                        id="depositInstallment3"
                        value={depositInstallment3}
                        onChange={(e) => setDepositInstallment3(applyCurrencyMask(e.target.value))}
                        placeholder="R$ 0,00"
                        className={errors.depositInstallment3 ? "border-red-500" : ""}
                      />
                      {errors.depositInstallment3 && <p className="text-sm text-red-500">{errors.depositInstallment3}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depositPaymentDate3">Data Pagamento *</Label>
                      <Input
                        id="depositPaymentDate3"
                        type="date"
                        value={depositPaymentDate3}
                        onChange={(e) => setDepositPaymentDate3(e.target.value)}
                        className={errors.depositPaymentDate3 ? "border-red-500" : ""}
                      />
                      {errors.depositPaymentDate3 && <p className="text-sm text-red-500">{errors.depositPaymentDate3}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depositPixCode3">Código PIX</Label>
                      <Input
                        id="depositPixCode3"
                        value={depositPixCode3}
                        onChange={(e) => setDepositPixCode3(e.target.value)}
                        placeholder="Código PIX"
                      />
                    </div>
                  </div>
                )}

                {/* Total Deposit Display */}
                <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Valor Total Caução:</span>
                    <span className="font-bold text-xl text-primary">
                      {calculateTotalDeposit()?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    * Soma de todas as parcelas do caução
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Commission */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Comissão</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionValue">Valor Comissão Imobiliária</Label>
                <Input
                  id="commissionValue"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(applyCurrencyMask(e.target.value))}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="hasPartnerBroker"
                    checked={hasPartnerBroker}
                    onCheckedChange={(checked) => setHasPartnerBroker(checked as boolean)}
                  />
                  <Label htmlFor="hasPartnerBroker">Corretor Parceiro</Label>
                </div>
                {hasPartnerBroker && (
                  <Input
                    id="partnerBrokerValue"
                    value={partnerBrokerValue}
                    onChange={(e) => setPartnerBrokerValue(applyPercentageMask(e.target.value))}
                    placeholder="0,00%"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Utilities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contas</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waterValue">Valor Água</Label>
                  <Input
                    id="waterValue"
                    value={waterValue}
                    onChange={(e) => setWaterValue(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Água</Label>
                  <Select value={waterResponsibility} onValueChange={(value: "landlord" | "tenant") => setWaterResponsibility(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Proprietário</SelectItem>
                      <SelectItem value="tenant">Inquilino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="electricityValue">Valor Luz</Label>
                  <Input
                    id="electricityValue"
                    value={electricityValue}
                    onChange={(e) => setElectricityValue(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Luz</Label>
                  <Select value={electricityResponsibility} onValueChange={(value: "landlord" | "tenant") => setElectricityResponsibility(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Proprietário</SelectItem>
                      <SelectItem value="tenant">Inquilino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gasValue">Valor Gás</Label>
                  <Input
                    id="gasValue"
                    value={gasValue}
                    onChange={(e) => setGasValue(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Gás</Label>
                  <Select value={gasResponsibility} onValueChange={(value: "landlord" | "tenant") => setGasResponsibility(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Proprietário</SelectItem>
                      <SelectItem value="tenant">Inquilino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Anexos</h3>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Adicionar Arquivos
              </Button>
              {attachments.length > 0 && (
                <AttachmentViewer attachments={attachments} onRemove={removeAttachment} />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {showContract && contractData && (
        <RentalContract
          rental={contractData.rental}
          property={contractData.property}
          tenant={contractData.tenant}
          onClose={() => {
            setShowContract(false);
            onOpenChange(false);
            onSuccess();
          }}
        />
      )}
    </Dialog>
  );
}