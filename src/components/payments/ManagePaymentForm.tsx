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
import { Upload, Camera, Loader2 } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";
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

  // Form data
  const [formData, setFormData] = useState({
    payment_date: "",
    amount_paid: "",
    payment_method: "",
    discount: "",
    late_fee: "",
    interest: "",
    notes: "",
  });

  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; type: string }>>([]);

  useEffect(() => {
    if (paymentId) {
      loadPaymentData(paymentId);
    }
  }, [paymentId]);

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
            properties!inner (
              id,
              location,
              complement,
              city,
              state
            ),
            tenants!inner (
              id,
              name,
              phone,
              email,
              document
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
        amount: paymentData.expected_amount,
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
        // @ts-ignore - Supabase join types are complex
        const rental = Array.isArray(paymentData.rentals) ? paymentData.rentals[0] : paymentData.rentals;
        
        if (rental.properties) {
          const property = Array.isArray(rental.properties) ? rental.properties[0] : rental.properties;
          setPropertyInfo({
            id: property.id,
            address: property.location,
            complement: property.complement,
            city: property.city,
            state: property.state
          });
        }

        if (rental.tenants) {
          const tenant = Array.isArray(rental.tenants) ? rental.tenants[0] : rental.tenants;
          setTenantInfo({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            email: tenant.email,
            document: tenant.document
          });
        }
      }

      // Preencher formulário
      setFormData({
        payment_date: mappedPayment.paymentDate 
          ? mappedPayment.paymentDate.split("T")[0] 
          : new Date().toISOString().split("T")[0],
        amount_paid: formatCurrency((mappedPayment.paidAmount || mappedPayment.expectedAmount || 0).toString()),
        payment_method: mappedPayment.paymentMethod || "",
        discount: formatCurrency((mappedPayment.discountAmount || 0).toString()),
        late_fee: formatCurrency((mappedPayment.penaltyAmount || 0).toString()),
        interest: formatCurrency((mappedPayment.interestAmount || 0).toString()),
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

  const calculateTotals = () => {
    const amountPaid = parseCurrency(formData.amount_paid);
    const discount = parseCurrency(formData.discount);
    const lateFee = parseCurrency(formData.late_fee);
    const interest = parseCurrency(formData.interest);

    return {
      amountPaid,
      discount,
      lateFee,
      interest,
      expectedAmount: payment?.expectedAmount || 0,
      total: amountPaid
    };
  };

  const handleSave = async () => {
    if (!paymentId || !payment) return;

    if (!formData.payment_date || !formData.payment_method) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const totals = calculateTotals();

    try {
      setIsSaving(true);

      const updateData = {
        status: "paid",
        payment_date: formData.payment_date,
        paid_amount: totals.amountPaid,
        payment_method: formData.payment_method,
        discount_amount: totals.discount,
        late_fee: totals.lateFee,
        interest: totals.interest,
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

  const totals = calculateTotals();

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
    <div className={embedded ? "space-y-6" : "space-y-6"}>
      {/* Header com informações do pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registrar Recebimento</span>
            <div className="text-sm font-normal text-muted-foreground">
              Parcela {payment.referenceMonth}/{payment.referenceYear}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Vencimento</Label>
              <p className="text-sm font-medium">
                {new Date(payment.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Valor Esperado</Label>
              <p className="text-sm font-medium">
                {formatCurrency(payment.expectedAmount.toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Imóvel e Inquilino */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Endereço: </span>
              <span className="font-medium">{propertyInfo?.address || "N/A"}</span>
            </div>
            {propertyInfo?.complement && (
              <div>
                <span className="text-muted-foreground">Complemento: </span>
                <span className="font-medium">{propertyInfo.complement}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Cidade: </span>
              <span className="font-medium">
                {propertyInfo?.city || "N/A"}
                {propertyInfo?.state && ` - ${propertyInfo.state}`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações do Locatário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              <span className="font-medium">{tenantInfo?.name || "N/A"}</span>
            </div>
            {tenantInfo?.document && (
              <div>
                <span className="text-muted-foreground">CPF/CNPJ: </span>
                <span className="font-medium">{tenantInfo.document}</span>
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

      {/* Formulário de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Valor Pago *</Label>
              <Input
                id="amount_paid"
                value={formData.amount_paid}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, amount_paid: formatted });
                }}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Desconto</Label>
              <Input
                id="discount"
                value={formData.discount}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, discount: formatted });
                }}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_fee">Multa</Label>
              <Input
                id="late_fee"
                value={formData.late_fee}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, late_fee: formatted });
                }}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">Juros</Label>
              <Input
                id="interest"
                value={formData.interest}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, interest: formatted });
                }}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Adicione observações sobre o pagamento..."
            />
          </div>

          {/* Resumo dos Valores */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Esperado:</span>
                  <span className="font-medium">{formatCurrency(totals.expectedAmount.toString())}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto:</span>
                    <span className="font-medium">- {formatCurrency(totals.discount.toString())}</span>
                  </div>
                )}
                {totals.lateFee > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Multa:</span>
                    <span className="font-medium">+ {formatCurrency(totals.lateFee.toString())}</span>
                  </div>
                )}
                {totals.interest > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Juros:</span>
                    <span className="font-medium">+ {formatCurrency(totals.interest.toString())}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Valor Pago:</span>
                  <span className="text-primary">{formatCurrency(totals.amountPaid.toString())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          <div className="space-y-4">
            <Label>Anexos (Comprovantes, Fotos)</Label>
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
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 pt-4">
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
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}