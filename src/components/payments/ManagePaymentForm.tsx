import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Camera, Loader2, Building2, User } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { getConfig } from "@/services/configService";
import type { Payment } from "@/types";

interface ManagePaymentFormProps {
  paymentId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ paymentId, onClose, onSuccess, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Payment and related data
  const [payment, setPayment] = useState<Payment | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);

  // Config data
  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "",
    amount_to_pay: "",
    notes: "",
  });

  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; type: string }>>([]);

  useEffect(() => {
    if (paymentId) {
      loadPaymentData(paymentId);
      loadConfig();
    }
  }, [paymentId]);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      if (config) {
        setLateFeePercentage(config.late_fee_percentage || 0);
        setInterestRatePercentage(config.interest_rate_percentage || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadPaymentData = async (id: string) => {
    try {
      setIsLoading(true);

      // Buscar pagamento com informações relacionadas
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            id,
            property_id,
            tenant_id,
            rental_value,
            garage_value,
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
              document_type
            )
          )
        `)
        .eq("id", id)
        .single();

      if (paymentError) throw paymentError;
      if (!paymentData) {
        toast({ title: "Pagamento não encontrado", variant: "destructive" });
        if (!embedded) router.push("/payments");
        return;
      }

      // Mapear dados do pagamento
      const mappedPayment: Payment = {
        id: paymentData.id,
        rentalId: paymentData.rental_id,
        dueDate: paymentData.due_date,
        status: paymentData.status as Payment["status"],
        expectedAmount: paymentData.expected_amount,
        paidAmount: paymentData.paid_amount || 0,
        paymentDate: paymentData.payment_date,
        paymentMethod: paymentData.payment_method,
        notes: paymentData.notes,
        penaltyAmount: paymentData.late_fee || 0,
        interestAmount: paymentData.interest || 0,
        discountAmount: paymentData.discount_amount || 0,
        attachments: paymentData.attachments as string[] || [],
        referenceMonth: Number(paymentData.reference_month) || new Date(paymentData.due_date).getMonth() + 1,
        referenceYear: Number(paymentData.reference_year) || new Date(paymentData.due_date).getFullYear(),
        createdAt: paymentData.created_at,
        updatedAt: paymentData.updated_at
      };

      setPayment(mappedPayment);

      // Extrair informações relacionadas
      if (paymentData.rentals) {
        const rental = Array.isArray(paymentData.rentals) ? paymentData.rentals[0] : paymentData.rentals;
        
        // Valores da locação
        setRentalValue(rental.rental_value || 0);
        setGarageValue(rental.garage_value || 0);
        
        if (rental.properties) {
          const property = Array.isArray(rental.properties) ? rental.properties[0] : rental.properties;
          
          if (property.locations) {
            const location = Array.isArray(property.locations) ? property.locations[0] : property.locations;
            
            setPropertyInfo({
              location: location.name || "",
              street: location.street || "",
              number: location.number || "",
              neighborhood: location.neighborhood || "",
              complement: property.complement || "",
              city: location.city || "",
              state: location.state || "",
              zip_code: location.zip_code || "",
            });
          }
        }
        
        if (rental.tenants) {
          const tenant = Array.isArray(rental.tenants) ? rental.tenants[0] : rental.tenants;
          
          setTenantInfo({
            name: tenant.name || "",
            phone: tenant.phone || "",
            email: tenant.email || "",
            document: tenant.document || "",
            document_type: tenant.document_type || "",
          });
        }
      }

      // Preencher formulário
      setFormData({
        payment_date: mappedPayment.paymentDate 
          ? mappedPayment.paymentDate.split("T")[0] 
          : new Date().toISOString().split("T")[0],
        payment_method: mappedPayment.paymentMethod || "",
        amount_to_pay: "",
        notes: mappedPayment.notes || "",
      });

      // Carregar anexos existentes
      if (mappedPayment.attachments && Array.isArray(mappedPayment.attachments)) {
        const attachmentsList = mappedPayment.attachments.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
          type: url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image",
        }));
        setAttachments(attachmentsList);
      }

    } catch (error) {
      console.error("Erro ao carregar pagamento:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao fazer upload");

      const result = await response.json();
      const newAttachments = result.files.map((file: any) => ({
        id: `new-${Date.now()}-${Math.random()}`,
        url: file.url,
        type: file.url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image",
      }));

      setAttachments((prev) => [...prev, ...newAttachments]);
      toast({ title: "Arquivos enviados com sucesso!" });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({ title: "Erro ao enviar arquivos", variant: "destructive" });
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateValues = () => {
    if (!payment) return { valorAluguel: 0, multa: 0, juros: 0, valorTotal: 0 };

    const valorAluguel = rentalValue + garageValue;
    
    // Calcular multa e juros se houver atraso
    let multa = 0;
    let juros = 0;

    const dueDate = new Date(payment.dueDate + "T12:00:00");
    const paymentDate = new Date(formData.payment_date + "T12:00:00");

    if (paymentDate > dueDate) {
      // Tem atraso
      multa = (valorAluguel * lateFeePercentage) / 100;
      
      // Calcular juros proporcionais aos dias de atraso
      const diffTime = Math.abs(paymentDate.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;
      
      juros = (valorAluguel * interestRatePercentage * diffMonths) / 100;
    }

    const valorTotal = valorAluguel + multa + juros;

    return {
      valorAluguel,
      multa,
      juros,
      valorTotal
    };
  };

  const handleSave = async () => {
    if (!paymentId || !payment) return;

    if (!formData.payment_date || !formData.payment_method) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const values = calculateValues();
    const amountToPay = parseCurrency(formData.amount_to_pay || formatCurrency(values.valorTotal.toString()));

    try {
      setIsSaving(true);

      const updateData = {
        status: "paid" as const,
        payment_date: formData.payment_date,
        paid_amount: amountToPay,
        payment_method: formData.payment_method,
        late_fee: values.multa,
        interest: values.juros,
        notes: formData.notes || null,
        attachments: attachments.map((att) => att.url),
      };

      const { error } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (error) throw error;

      toast({ title: "Pagamento registrado com sucesso!" });
      
      if (onSuccess) onSuccess();
      else if (onClose) onClose();
      else if (!embedded) router.push("/payments");
      
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error);
      toast({ title: "Erro ao salvar pagamento", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const values = calculateValues();

  // Atualizar campo "Valor a Pagar" automaticamente quando os valores mudarem
  useEffect(() => {
    if (values.valorTotal > 0 && !formData.amount_to_pay) {
      setFormData(prev => ({
        ...prev,
        amount_to_pay: formatCurrency(values.valorTotal.toString())
      }));
    }
  }, [values.valorTotal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground ml-4">Carregando dados do pagamento...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Pagamento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Informações em paralelo */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Informações do Imóvel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informações do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Local: </span>
              <span className="font-medium">{propertyInfo?.location || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Complemento: </span>
              <span className="font-medium">{propertyInfo?.complement || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Endereço: </span>
              <span className="font-medium">
                {propertyInfo?.street && propertyInfo?.number 
                  ? `${propertyInfo.street}, ${propertyInfo.number}`
                  : "N/A"}
                {propertyInfo?.neighborhood && ` - ${propertyInfo.neighborhood}`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cidade/Estado: </span>
              <span className="font-medium">
                {propertyInfo?.city && propertyInfo?.state 
                  ? `${propertyInfo.city} - ${propertyInfo.state}`
                  : "N/A"}
              </span>
            </div>
            {propertyInfo?.zip_code && (
              <div>
                <span className="text-muted-foreground">CEP: </span>
                <span className="font-medium">{propertyInfo.zip_code}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Locatário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do Locatário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              <span className="font-medium">{tenantInfo?.name || "N/A"}</span>
            </div>
            {tenantInfo?.document && (
              <div>
                <span className="text-muted-foreground">
                  {tenantInfo.document_type === "cnpj" ? "CNPJ" : "CPF"}: 
                </span>
                <span className="font-medium"> {tenantInfo.document}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Telefone: </span>
              <span className="font-medium">{tenantInfo?.phone || "N/A"}</span>
            </div>
            {tenantInfo?.email && (
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{tenantInfo.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações do Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Informações do Pagamento</span>
            <div className="text-sm font-normal text-muted-foreground">
              Parcela {payment.referenceMonth}/{payment.referenceYear} - Vencimento: {new Date(payment.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data do Pagamento *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de Pagamento *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_to_pay">Valor a Pagar *</Label>
              <Input
                id="amount_to_pay"
                value={formData.amount_to_pay}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, amount_to_pay: formatted });
                }}
                placeholder="R$ 0,00"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formação de Valores */}
      <Card>
        <CardHeader>
          <CardTitle>Formação de Valores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Valor Aluguel {garageValue > 0 && "+ Vaga"}</span>
              <span className="text-sm font-semibold">{formatCurrency(values.valorAluguel.toString())}</span>
            </div>
            
            {values.multa > 0 && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-red-600">
                  Multa ({lateFeePercentage}%)
                </span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(values.multa.toString())}
                </span>
              </div>
            )}
            
            {values.juros > 0 && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium text-red-600">
                  Juros ({interestRatePercentage}% ao mês)
                </span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(values.juros.toString())}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-3 border-t-2">
              <span className="text-base font-bold">Valor Total</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(values.valorTotal.toString())}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Adicione observações sobre o pagamento..."
          />
        </CardContent>
      </Card>

      {/* Anexos */}
      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("camera-input")?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Tirar Foto
            </Button>
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Anexar Arquivo
            </Button>
            <input
              id="file-input"
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <AttachmentViewer
            attachments={attachments.map(a => a.url)}
            onRemove={handleRemoveAttachment}
          />
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-1"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Confirmar Recebimento"
          )}
        </Button>
        {onClose ? (
          <Button variant="outline" onClick={onClose} disabled={isSaving} size="lg">
            Cancelar
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.back()} disabled={isSaving} size="lg">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}