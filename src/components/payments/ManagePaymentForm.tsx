import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { Camera, Paperclip, Home, User, DollarSign, CreditCard, FileText, Edit, X } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";

interface ManagePaymentFormProps {
  paymentId: string;
  onSuccess?: (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ paymentId, onSuccess, onClose, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [removeFees, setRemoveFees] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [formData, setFormData] = useState({
    payment_date: "",
    payment_method: "pix",
    amount_to_pay: "",
    notes: "",
    pix_code_type: "CP",
  });

  const [payment, setPayment] = useState<any>(null);
  const [rental, setRental] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);
  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0);

  useEffect(() => {
    if (payment && rentalValue > 0 && isEditMode) {
      const values = calculateValues();
      setFormData(prev => ({
        ...prev,
        amount_to_pay: formatCurrency(values.valorAPagar.toFixed(2))
      }));
    }
  }, [formData.payment_date, rentalValue, garageValue, lateFeePercentage, interestRatePercentage, removeFees, isEditMode]);

  useEffect(() => {
    loadPaymentData();
    loadConfig();
  }, [paymentId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLateFeePercentage(data.late_fee_percentage || 0);
        setInterestRatePercentage(data.interest_rate_percentage || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadPaymentData = async () => {
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            *,
            properties!inner (
              *,
              locations!inner (*)
            ),
            tenants!inner (*)
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      setPayment(paymentData);
      setRental(paymentData.rentals);
      setProperty(paymentData.rentals.properties);
      setLocation(paymentData.rentals.properties.locations);
      setTenant(paymentData.rentals.tenants);

      setRentalValue(paymentData.rentals.monthly_rent || 0);
      setGarageValue(paymentData.rentals.garage_value || 0);

      // Verificar se o pagamento já está pago
      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid); // Se não está pago, começa em modo de edição

      if (paymentData.attachments && Array.isArray(paymentData.attachments)) {
        const attachmentStrings = paymentData.attachments
          .filter((att): att is string => typeof att === "string");
        setAttachments(attachmentStrings);
      }

      const values = calculateValues();
      setFormData({
        payment_date: paymentData.payment_date || new Date().toISOString().split("T")[0],
        payment_method: paymentData.payment_method || "pix",
        amount_to_pay: formatCurrency(values.valorAPagar.toFixed(2)),
        notes: paymentData.notes || "",
        pix_code_type: (paymentData as any).pix_code_type || "CP",
      });
    } catch (error) {
      console.error("Erro ao carregar dados do pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    // Usar o expected_amount do pagamento (que contém valor proporcional se for 1ª parcela)
    // Se não existir, calcular o valor integral
    const valorIntegral = Math.round((rentalValue + garageValue) * 100) / 100;
    const valorAluguel = payment?.expected_amount 
      ? Math.round(payment.expected_amount * 100) / 100 
      : valorIntegral;
    
    // Detectar se é proporcional comparando com o valor integral
    const isProportional = payment?.expected_amount && Math.abs(valorAluguel - valorIntegral) > 0.01;
    
    let multa = 0;
    let juros = 0;
    let diasAtraso = 0;

    if (payment && formData.payment_date) {
      const dueDate = new Date(payment.due_date + "T12:00:00");
      const paymentDate = new Date(formData.payment_date + "T12:00:00");

      if (paymentDate > dueDate) {
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        multa = Math.round((valorAluguel * lateFeePercentage / 100) * 100) / 100;

        const jurosDiario = interestRatePercentage;
        juros = Math.round((valorAluguel * jurosDiario / 100 * diasAtraso) * 100) / 100;
      }
    }

    const valorTotalSemIsencao = Math.round((valorAluguel + multa + juros) * 100) / 100;
    const valorAPagar = removeFees ? valorAluguel : valorTotalSemIsencao;
    
    // Considerar valor já pago (se houver)
    const valorJaPago = payment?.paid_amount || 0;
    const valorRestante = Math.max(0, Math.round((valorAPagar - valorJaPago) * 100) / 100);

    return {
      valorAluguel: Math.round(valorAluguel * 100) / 100,
      multa: Math.round(multa * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      valorTotal: Math.round(valorTotalSemIsencao * 100) / 100,
      valorAPagar: Math.round(valorAPagar * 100) / 100,
      valorJaPago: Math.round(valorJaPago * 100) / 100,
      valorRestante: Math.round(valorRestante * 100) / 100,
      diasAtraso,
      jurosDiario: interestRatePercentage,
      isProportional,
    };
  };

  const formatCurrency = (value: string | number): string => {
    const numericValue = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    const number = parseFloat(numericValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  };

  const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const generatePixCode = (paymentDate: string, pixType: string): string => {
    if (!paymentDate || !pixType) return "";
    
    const date = new Date(paymentDate);
    const day = String(date.getDate()).padStart(2, "0");
    
    // Gerar 4 dígitos sequenciais (pode ser baseado em timestamp ou ID)
    const timestamp = Date.now();
    const sequence = String(timestamp).slice(-4);
    
    return `${day}${sequence}${pixType}`;
  };

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload");
      }

      const data = await response.json();
      setAttachments([...attachments, data.url]);

      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do arquivo",
        variant: "destructive",
      });
    }
  };

  const handleTakePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const handleAttachFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleEnableEdit = () => {
    setIsEditMode(true);
    toast({
      title: "Modo de Edição",
      description: "Campos desbloqueados para edição.",
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    loadPaymentData(); // Recarregar dados originais
    toast({
      title: "Edição Cancelada",
      description: "Alterações descartadas.",
    });
  };

  const handleSubmit = async () => {
    console.log("🚀 handleSubmit CHAMADO!");

    if (!formData.payment_date || !formData.payment_method || !formData.amount_to_pay) {
      console.log("❌ Validação falhou - campos obrigatórios faltando");
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("💾 Salvando pagamento no banco...");
      console.log("📋 Dados do formulário:", formData);
      setIsSubmitting(true);

      const calculatedValues = calculateValues();
      const paidAmount = parseCurrency(formData.amount_to_pay);
      const expectedTotal = calculatedValues.valorAPagar;
      
      // Se houver valor já pago, somar ao novo pagamento
      const totalPaid = (payment?.paid_amount || 0) + paidAmount;
      
      // Determinar status baseado no valor total pago
      let paymentStatus: "paid" | "partial" = "paid";
      if (totalPaid < expectedTotal) {
        paymentStatus = "partial";
      }

      const paymentData = {
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        paid_amount: totalPaid, // Salvar o total acumulado
        notes: formData.notes,
        status: paymentStatus,
        attachments: attachments.length > 0 ? attachments : null,
        late_fee: removeFees ? 0 : calculatedValues.multa,
        interest: removeFees ? 0 : calculatedValues.juros,
        updated_at: new Date().toISOString(),
        pix_code_type: formData.pix_code_type,
      };

      console.log("📤 Dados a serem salvos:", paymentData);

      const { error: updateError } = await supabase
        .from("payments")
        .update(paymentData)
        .eq("id", paymentId);

      if (updateError) {
        console.error("❌ Erro ao salvar:", updateError);
        throw updateError;
      }

      console.log("✅ Pagamento salvo com sucesso no banco!");

      // Gerar e salvar código PIX no rental se forma de pagamento for PIX
      if (formData.payment_method === "pix" && formData.pix_code_type) {
        const pixCode = generatePixCode(formData.payment_date, formData.pix_code_type);
        
        const { error: rentalError } = await supabase
          .from("rentals")
          .update({ pix_code: pixCode })
          .eq("id", payment.rental_id);
        
        if (rentalError) {
          console.error("❌ Erro ao salvar código PIX:", rentalError);
        } else {
          console.log("✅ Código PIX salvo:", pixCode);
        }
      }

      toast({
        title: "Sucesso",
        description: paymentStatus === "partial" 
          ? `Pagamento parcial registrado! Valor pago: ${formatCurrency(paidAmount.toFixed(2))}. Restante: ${formatCurrency((expectedTotal - totalPaid).toFixed(2))}`
          : isPaid ? "Pagamento atualizado com sucesso!" : "Pagamento registrado com sucesso!",
      });

      if (paymentStatus === "paid" && !isPaid && onSuccess) {
        console.log("📞 Chamando callback onSuccess com dados completos...");

        const paymentForReceipt: Payment = {
          id: payment.id,
          rentalId: payment.rental_id,
          dueDate: payment.due_date,
          expectedAmount: payment.expected_amount,
          paidAmount: totalPaid,
          paymentDate: formData.payment_date,
          status: "paid",
          paymentMethod: formData.payment_method,
          notes: formData.notes,
          referenceMonth: parseInt(payment.reference_month),
          referenceYear: parseInt(payment.reference_year),
          attachments: attachments,
          lateFee: removeFees ? 0 : calculatedValues.multa,
          interest: removeFees ? 0 : calculatedValues.juros,
        };

        const rentalForReceipt: Rental = {
          id: rental.id,
          propertyId: rental.property_id,
          tenantId: rental.tenant_id,
          startDate: rental.start_date,
          endDate: rental.end_date,
          rentAmount: rental.monthly_rent,
          monthlyRent: rental.monthly_rent,
          garageValue: rental.garage_value,
          value: rental.value,
          paymentDay: rental.payment_day,
          status: rental.is_active ? "active" : "terminated",
          autoRenew: false,
        };

        const propertyForReceipt: Property = {
          id: property.id,
          locationId: property.location_id,
          location: location?.name || "",
          address: location?.street || "",
          number: location?.number || "",
          complement: property.complement || "",
          neighborhood: location?.neighborhood || "",
          city: location?.city || "",
          state: location?.state || "",
          zipCode: location?.zip_code || "",
          rooms: property.rooms || 0,
          bathrooms: property.bathrooms || 0,
          area: property.area || 0,
          status: property.status || "available",
          value: property.value,
        };

        const tenantForReceipt: Tenant = {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email || "",
          phone: tenant.phone || "",
          documentType: tenant.document_type || "cpf",
          document: tenant.document || "",
          cpf: tenant.cpf || "",
          rg: tenant.rg || "",
          status: tenant.status || "active",
          active: true,
        };

        console.log("📦 Dados sendo enviados para callback:", { paymentForReceipt, rentalForReceipt, propertyForReceipt, tenantForReceipt });

        if (onSuccess) {
          console.log("✅ onSuccess existe! Chamando agora...");
          onSuccess({
            payment: paymentForReceipt,
            rental: rentalForReceipt,
            property: propertyForReceipt,
            tenant: tenantForReceipt,
          });
          console.log("✅ onSuccess foi chamado!");
        } else {
          console.log("❌ onSuccess NÃO existe!");
        }
      } else if (paymentStatus === "partial") {
        // Pagamento parcial: apenas fecha o dialog e recarrega
        if (onClose) {
          onClose();
        } else {
          router.push("/payments");
        }
      } else if (isPaid) {
        // Se estava editando um pagamento já pago, apenas fecha
        if (onClose) {
          onClose();
        } else {
          router.push("/payments");
        }
      }

    } catch (error) {
      console.error("💥 Erro ao confirmar recebimento:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao registrar pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("🏁 handleSubmit finalizado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const values = calculateValues();
  const isReadOnly = isPaid && !isEditMode;

  return (
    <div className="space-y-6 pb-8">
      {!embedded && (
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            {isPaid && isEditMode ? "Edição do Recebimento" : isPaid ? "Detalhes do Recebimento" : "Registro de Recebimento"}
          </h1>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" />
              Informações do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Local:</span>
                <p className="text-foreground flex-1">{location?.name}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Compl:</span>
                <p className="text-foreground flex-1">{property?.complement}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Endereço:</span>
                <p className="text-foreground flex-1">
                  {location?.street}, {location?.number}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Cidade/UF:</span>
                <p className="text-foreground flex-1">
                  {location?.city} - {location?.state}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">CEP:</span>
                <p className="text-foreground flex-1">{location?.zip_code}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Informações do Locatário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Nome:</span>
                <p className="text-foreground flex-1">{tenant?.name}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">CPF:</span>
                <p className="text-foreground flex-1">{tenant?.cpf}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">RG:</span>
                <p className="text-foreground flex-1">{tenant?.rg}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Telefone:</span>
                <p className="text-foreground flex-1">{tenant?.phone}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Email:</span>
                <p className="text-foreground flex-1">{tenant?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Informações da Locação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Data Início:</span>
              <p className="text-foreground">
                {rental?.start_date ? new Date(rental.start_date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Data Término:</span>
              <p className="text-foreground">
                {rental?.end_date ? new Date(rental.end_date + "T12:00:00").toLocaleDateString("pt-BR") : "Indeterminado"}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Data Vencimento:</span>
              <p className="text-foreground">
                {payment?.due_date ? new Date(payment.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Valor Aluguel:</span>
              <p className="text-foreground">{formatCurrency(rentalValue.toFixed(2))}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Valor Vaga:</span>
              <p className="text-foreground">{formatCurrency(garageValue.toFixed(2))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Formação de Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>
                  Valor Aluguel {garageValue > 0 && "+ Vaga"}
                  {values.isProportional && (
                    <span className="text-blue-600 font-medium ml-2">(Proporcional)</span>
                  )}
                </span>
                <span className="font-medium">{formatCurrency(values.valorAluguel.toFixed(2))}</span>
              </div>

              {values.multa > 0 && (
                <div className="flex justify-between text-sm">
                  <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                    Multa ({lateFeePercentage}%)
                  </span>
                  <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                    + {formatCurrency(values.multa.toFixed(2))}
                  </span>
                </div>
              )}

              {values.juros > 0 && (
                <div className="flex justify-between text-sm">
                  <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                    Juros ({interestRatePercentage.toFixed(3)}% ao dia) + {values.diasAtraso} dias
                  </span>
                  <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                    + {formatCurrency(values.juros.toFixed(2))}
                  </span>
                </div>
              )}

              {(values.multa > 0 || values.juros > 0) && isEditMode && (
                <div className="flex items-center space-x-2 py-2 border-t">
                  <Checkbox
                    id="remove-fees"
                    checked={removeFees}
                    onCheckedChange={(checked) => setRemoveFees(checked as boolean)}
                    disabled={isReadOnly}
                  />
                  <label
                    htmlFor="remove-fees"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Retirar multa/juros
                  </label>
                </div>
              )}

              {values.valorJaPago > 0 && (
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-sm text-green-600">Valor já Pago</span>
                  <span className="text-sm text-green-600 font-medium">
                    - {formatCurrency(values.valorJaPago.toFixed(2))}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t-2 border-primary">
                <span className="font-bold text-base">
                  {values.valorJaPago > 0 ? "Valor Restante" : "Valor Total"}
                </span>
                <span className="font-bold text-base text-primary">
                  {formatCurrency(values.valorJaPago > 0 ? values.valorRestante.toFixed(2) : values.valorAPagar.toFixed(2))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_date">
                    Data do Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">
                    Forma de Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.payment_method !== "dinheiro" && formData.payment_method !== "boleto" && (
                  <div>
                    <Label htmlFor="pix_code_type">
                      Código Pix <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.pix_code_type}
                      onValueChange={(value) => setFormData({ ...formData, pix_code_type: value })}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CP">CP</SelectItem>
                        <SelectItem value="CD">CD</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="amount_to_pay">
                    Valor a Pagar <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount_to_pay"
                    type="text"
                    placeholder="R$ 0,00"
                    value={formData.amount_to_pay}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      setFormData({ ...formData, amount_to_pay: formatted });
                    }}
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observações sobre o pagamento..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditMode && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleTakePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAttachFile}>
                <Paperclip className="h-4 w-4 mr-2" />
                Anexar Arquivo
              </Button>
            </div>
          )}

          {attachments.length > 0 && (
            <AttachmentViewer 
              attachments={attachments} 
              onRemove={isEditMode ? handleRemoveAttachment : undefined} 
            />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end pt-4">
        {isPaid && !isEditMode ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose ? onClose() : router.push("/payments")}
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
            <Button 
              type="button" 
              onClick={handleEnableEdit}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={isPaid ? handleCancelEdit : (onClose ? onClose : () => router.push("/payments"))}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              size="lg"
            >
              {isSubmitting ? "Salvando..." : isPaid ? "Salvar Alterações" : "Confirmar Recebimento"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}