import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  User,
  DollarSign,
  CreditCard,
  FileText,
  Paperclip,
  Camera,
  X
} from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentReceipt } from "@/components/PaymentReceipt";

interface ManagePaymentFormProps {
  paymentId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

interface Payment {
  id: string;
  rentalId: string;
  dueDate: string;
  expectedAmount: number;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  attachments: string[];
  installmentNumber: number;
}

interface PropertyInfo {
  locationName: string;
  complement: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  rooms: number;
  bathrooms: number;
  area: number;
  hasGarage: boolean;
  hasFurniture: boolean;
  acceptsPets: boolean;
}

interface TenantInfo {
  name: string;
  phone: string;
  email: string;
  document: string;
  documentType: string;
  cpf: string;
  rg: string;
}

interface RentalInfo {
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  garageValue: number;
  totalValue: number;
}

export function ManagePaymentForm({ paymentId, onClose, onSuccess, embedded }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [rentalInfo, setRentalInfo] = useState<RentalInfo | null>(null);

  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);

  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0);

  const [removeFees, setRemoveFees] = useState(false);
  
  // Estado para exibir o recibo após confirmação
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "pix",
    amount_to_pay: "",
    notes: "",
  });

  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

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

      if (error) {
        console.error("Erro ao carregar configurações:", error);
        return;
      }

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
      setLoading(true);

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
          *,
          rentals!inner (
            id,
            property_id,
            tenant_id,
            start_date,
            end_date,
            monthly_rent,
            garage_value,
            value,
            properties!inner (
              id,
              location_id,
              complement,
              property_identifier,
              rooms,
              bathrooms,
              area,
              has_garage,
              has_furniture,
              accepts_pets,
              locations!inner (
                id,
                name,
                street,
                number,
                neighborhood,
                city,
                state,
                zip_code
              )
            ),
            tenants!inner (
              id,
              name,
              phone,
              email,
              document,
              document_type,
              cpf,
              rg
            )
          )
        `
        )
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      const rental = paymentData.rentals;
      const property = rental.properties;
      const location = property.locations;
      const tenant = rental.tenants;

      const mappedPayment: Payment = {
        id: paymentData.id,
        rentalId: paymentData.rental_id,
        dueDate: paymentData.due_date,
        expectedAmount: paymentData.expected_amount,
        status: paymentData.status,
        paymentDate: paymentData.payment_date,
        paymentMethod: paymentData.payment_method,
        notes: paymentData.notes,
        attachments: (paymentData.attachments as string[]) || [],
        installmentNumber: 0,
      };

      setPayment(mappedPayment);
      setAttachments(mappedPayment.attachments);

      if (mappedPayment.paymentDate) {
        setFormData((prev) => ({
          ...prev,
          payment_date: mappedPayment.paymentDate || "",
          payment_method: mappedPayment.paymentMethod || "pix",
          notes: mappedPayment.notes || "",
        }));
      }

      setPropertyInfo({
        locationName: location.name,
        complement: property.complement || "",
        street: location.street || "",
        number: location.number || "",
        neighborhood: location.neighborhood || "",
        city: location.city,
        state: location.state,
        zipCode: location.zip_code || "",
        rooms: property.rooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        hasGarage: property.has_garage || false,
        hasFurniture: property.has_furniture || false,
        acceptsPets: property.accepts_pets || false,
      });

      setTenantInfo({
        name: tenant.name,
        phone: tenant.phone || "",
        email: tenant.email || "",
        document: tenant.document || "",
        documentType: tenant.document_type || "",
        cpf: tenant.cpf || "",
        rg: tenant.rg || "",
      });

      const rentalValue = Number(rental.monthly_rent || 0);
      const garageVal = Number(rental.garage_value || 0);

      setRentalValue(rentalValue);
      setGarageValue(garageVal);

      setRentalInfo({
        startDate: rental.start_date,
        endDate: rental.end_date,
        monthlyRent: rentalValue,
        garageValue: garageVal,
        totalValue: Number(rental.value || 0),
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    // Default zero values
    const result = {
      valorAluguel: 0,
      multa: 0,
      juros: 0,
      valorTotal: 0,
      diasAtraso: 0,
      jurosDiario: 0,
    };

    if (!payment) return result;

    const valorAluguel = rentalValue + garageValue;
    let multa = 0;
    let juros = 0;
    let diasAtraso = 0;

    if (formData.payment_date) {
      const dueDate = new Date(payment.dueDate + "T12:00:00");
      const paymentDate = new Date(formData.payment_date + "T12:00:00");

      if (paymentDate > dueDate) {
        // Calcular dias de atraso
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Multa (percentual fixo sobre valor do aluguel)
        multa = (valorAluguel * lateFeePercentage) / 100;

        // Juros por dia
        const jurosDiario = interestRatePercentage / 30;
        juros = (valorAluguel * (jurosDiario / 100) * diasAtraso);
      }
    }

    // Se checkbox marcado, remove multa/juros
    // O valor total deve refletir o valor que será pago/cobrado
    const valorTotal = removeFees ? valorAluguel : valorAluguel + multa + juros;

    return {
      valorAluguel,
      multa,
      juros,
      valorTotal,
      diasAtraso,
      jurosDiario: interestRatePercentage / 30,
    };
  };

  // Safe to call anytime as it checks for payment existence inside
  const values = calculateValues();

  // Effect to update amount_to_pay when calculation params change
  useEffect(() => {
    if (!loading && payment) {
      const currentValues = calculateValues();
      setFormData((prev) => ({
        ...prev,
        amount_to_pay: formatCurrency(currentValues.valorTotal.toFixed(2)),
      }));
    }
  }, [
    formData.payment_date,
    rentalValue,
    garageValue,
    lateFeePercentage,
    interestRatePercentage,
    removeFees,
    loading,
    payment
  ]);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fazer upload");
      }

      const data = await response.json();
      const fileUrl = data.url;

      setAttachments((prev) => [...prev, fileUrl]);

      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTakePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleAttachFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.payment_date || !formData.payment_method || !formData.amount_to_pay) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Preparar dados do pagamento
      // Nota: paid_amount é a coluna correta para armazenar o valor efetivamente pago
      const paymentData = {
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        paid_amount: parseCurrency(formData.amount_to_pay), 
        notes: formData.notes,
        status: "paid",
        attachments: attachments.length > 0 ? attachments : null,
        updated_at: new Date().toISOString(),
      };

      // Atualizar pagamento no banco
      const { error: updateError } = await supabase
        .from("payments")
        .update(paymentData)
        .eq("id", paymentId);

      if (updateError) {
        console.error("Erro ao atualizar pagamento:", updateError);
        toast({
          title: "Erro",
          description: "Erro ao registrar pagamento. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso!",
      });

      // ✅ Preparar dados do recibo
      const calculatedValues = calculateValues();
      setReceiptData({
        payment: {
          id: payment.id,
          dueDate: payment.dueDate,
          expectedAmount: payment.expectedAmount,
          paidAmount: parseCurrency(formData.amount_to_pay),
          paymentDate: formData.payment_date,
          paymentMethod: formData.payment_method,
          notes: formData.notes,
          attachments: attachments,
          status: "paid",
          referenceMonth: new Date(payment.dueDate).getMonth() + 1,
          referenceYear: new Date(payment.dueDate).getFullYear(),
          lateFee: removeFees ? 0 : calculatedValues.multa,
          interest: removeFees ? 0 : calculatedValues.juros,
        },
        rental: {
          startDate: rentalInfo.startDate,
          endDate: rentalInfo.endDate || "",
          monthlyRent: rentalValue,
          garageValue: garageValue,
          value: rentalInfo.totalValue,
        },
        property: {
          id: "",
          location: propertyInfo.locationName,
          address: propertyInfo.street,
          number: propertyInfo.number,
          complement: propertyInfo.complement,
          neighborhood: propertyInfo.neighborhood,
          city: propertyInfo.city,
          state: propertyInfo.state,
          zipCode: propertyInfo.zipCode,
          rooms: propertyInfo.rooms,
          bathrooms: propertyInfo.bathrooms,
          area: propertyInfo.area,
        },
        tenant: {
          id: "",
          name: tenantInfo.name,
          phone: tenantInfo.phone,
          email: tenantInfo.email,
          cpf: tenantInfo.cpf,
          rg: tenantInfo.rg,
          document: tenantInfo.document,
          documentType: tenantInfo.documentType,
        },
      });

      // ✅ Exibir recibo
      setShowReceipt(true);

      // Chamar callback de sucesso se existir (apenas para atualizar listas pai)
      if (onSuccess) {
        onSuccess();
      }
      // Nota: NÃO chamamos onClose() aqui porque queremos mostrar o recibo.
      // O recibo tem seu próprio botão de fechar que chamará onClose().

    } catch (error) {
      console.error("Erro ao confirmar recebimento:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao registrar pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!payment || !propertyInfo || !tenantInfo || !rentalInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Dados não encontrados.</p>
      </div>
    );
  }

  // ✅ Se recibo deve ser exibido, renderizar PaymentReceipt
  if (showReceipt && receiptData) {
    return (
      <PaymentReceipt
        payment={receiptData.payment}
        rental={receiptData.rental}
        property={receiptData.property}
        tenant={receiptData.tenant}
        onClose={() => {
          setShowReceipt(false);
          if (onClose) {
            onClose();
          } else if (!embedded) {
            router.push("/payments");
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Registro de Recebimento
        </h1>
      </div>

      {/* Informações do Imóvel e Locatário - Layout Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações do Imóvel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Informações do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Local:</span>
                <p className="text-foreground flex-1">{propertyInfo.locationName || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Compl:</span>
                <p className="text-foreground flex-1">{propertyInfo.complement || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Endereço:</span>
                <p className="text-foreground flex-1">{propertyInfo.street}, {propertyInfo.number}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Cidade/UF:</span>
                <p className="text-foreground flex-1">{propertyInfo.city} - {propertyInfo.state}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">CEP:</span>
                <p className="text-foreground flex-1">{propertyInfo.zipCode || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Locatário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Locatário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Nome:</span>
                <p className="text-foreground flex-1">{tenantInfo.name || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">CPF:</span>
                <p className="text-foreground flex-1">{tenantInfo.cpf || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">RG:</span>
                <p className="text-foreground flex-1">{tenantInfo.rg || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Telefone:</span>
                <p className="text-foreground flex-1">{tenantInfo.phone || "Não informado"}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Email:</span>
                <p className="text-foreground flex-1 truncate">{tenantInfo.email || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações da Locação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Data Início:</span>
              <p className="text-foreground">
                {rentalInfo.startDate
                  ? new Date(rentalInfo.startDate + "T12:00:00").toLocaleDateString("pt-BR")
                  : "Não informado"}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Data Término:</span>
              <p className="text-foreground">
                {rentalInfo.endDate
                  ? new Date(rentalInfo.endDate + "T12:00:00").toLocaleDateString("pt-BR")
                  : "Indeterminado"}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Valor Aluguel:</span>
              <p className="text-foreground font-semibold">
                {formatCurrency(rentalInfo.monthlyRent.toString())}
              </p>
            </div>
            {rentalInfo.garageValue > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Valor Vaga:</span>
                <p className="text-foreground font-semibold">
                  {formatCurrency(rentalInfo.garageValue.toString())}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Formação de Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">
                  Valor Aluguel {garageValue > 0 && "+ Vaga"}
                </span>
                <span className="text-sm font-semibold">
                  {formatCurrency(values.valorAluguel.toString())}
                </span>
              </div>

              {values.multa > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className={`text-sm font-medium ${removeFees ? "line-through text-muted-foreground" : "text-red-600"}`}>
                    Multa ({lateFeePercentage}%)
                  </span>
                  <span className={`text-sm font-semibold ${removeFees ? "line-through text-muted-foreground" : "text-red-600"}`}>
                    + {formatCurrency(values.multa.toString())}
                  </span>
                </div>
              )}

              {/* Juros (se houver) */}
              {values.juros > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span
                    className={
                      removeFees
                        ? "line-through text-muted-foreground text-sm font-medium"
                        : "text-sm font-medium text-red-600"
                    }
                  >
                    Juros ({interestRatePercentage}%)
                  </span>
                  <span
                    className={
                      removeFees
                        ? "line-through text-muted-foreground text-sm font-semibold"
                        : "text-sm font-semibold text-red-600"
                    }
                  >
                    + {formatCurrency(values.juros.toFixed(2))}
                  </span>
                </div>
              )}

              {(values.multa > 0 || values.juros > 0) && (
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="remove-fees"
                    checked={removeFees}
                    onCheckedChange={(checked) => setRemoveFees(checked as boolean)}
                  />
                  <label
                    htmlFor="remove-fees"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Retirar multa/juros
                  </label>
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-t-2 border-primary">
                <span className="text-base font-bold">Valor Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(values.valorTotal.toString())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="payment_date">
                  Data do Pagamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_method">
                  Forma de Pagamento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger id="payment_method">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações sobre o pagamento (opcional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Anexos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTakePhoto}
                disabled={uploadingFile}
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAttachFile}
                disabled={uploadingFile}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Anexar Arquivo
              </Button>
            </div>

            {attachments.length > 0 && (
              <AttachmentViewer
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              router.push("/payments");
            }
          }}
          size="lg"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleSubmit} 
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Salvando..." : "Confirmar Recebimento"}
        </Button>
      </div>
    </div>
  );
}