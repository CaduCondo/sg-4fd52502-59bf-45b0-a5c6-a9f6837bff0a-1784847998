import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePayments } from "@/hooks/usePayments";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Camera } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";

interface ManagePaymentFormProps {
  paymentId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ paymentId, onClose, onSuccess, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { getPaymentInstallment, getPropertyInfo, getTenantInfo } = usePayments();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Payment data
  const [installment, setInstallment] = useState<any>(null);
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
      loadInstallmentData(paymentId);
    }
  }, [paymentId]);

  const loadInstallmentData = async (id: string) => {
    try {
      setIsLoading(true);
      // Aqui usamos o hook, mas precisamos garantir que ele retorne os dados corretamente
      const data = await getPaymentInstallment(id);
      
      if (!data) {
        toast({ title: "Pagamento não encontrado", variant: "destructive" });
        if (!embedded) router.push("/payments");
        return;
      }

      setInstallment(data);

      // Carregar informações relacionadas (imóvel e inquilino) via rental_id
      if (data.rentalId) {
        // Precisamos buscar o rental para ter property_id e tenant_id
        const { data: rental } = await supabase
          .from("rentals")
          .select("property_id, tenant_id")
          .eq("id", data.rentalId)
          .single();
          
        if (rental) {
          const property = await getPropertyInfo(rental.property_id);
          const tenant = await getTenantInfo(rental.tenant_id);
          setPropertyInfo(property);
          setTenantInfo(tenant);
        }
      }

      // Set form data
      setFormData({
        payment_date: data.paymentDate ? data.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0],
        amount_paid: formatCurrency((data.paidAmount || data.expectedAmount || 0).toString()),
        payment_method: data.paymentMethod || "",
        discount: formatCurrency((data.discountAmount || 0).toString()),
        late_fee: formatCurrency((data.penaltyAmount || 0).toString()), // penalty_amount mapeado para late_fee visualmente
        interest: formatCurrency((data.interestAmount || 0).toString()),
        notes: data.notes || "",
      });

      // Load existing attachments
      if (data.attachments && Array.isArray(data.attachments)) {
        const attachmentsList = data.attachments.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
          type: url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image",
        }));
        setAttachments(attachmentsList);
      }
    } catch (error) {
      console.error("Erro ao carregar parcela:", error);
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

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const calculateTotals = () => {
    const amountPaid = parseCurrency(formData.amount_paid);
    const discount = parseCurrency(formData.discount);
    const lateFee = parseCurrency(formData.late_fee);
    const interest = parseCurrency(formData.interest);

    // O valor pago já deve incluir tudo, mas para exibição podemos mostrar a composição
    // Se o usuário digita o valor pago, esse é o valor final.
    // Se quisermos calcular sugestão: expected + late + interest - discount
    
    return {
      amountPaid,
      discount,
      lateFee,
      interest,
      total: amountPaid // O valor que o usuário digitou é o que conta
    };
  };

  const handleSave = async () => {
    if (!paymentId) return;

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
        discount_amount: totals.discount, // Usando nomes corretos da tabela payments
        penalty_amount: totals.lateFee,   // Usando nomes corretos da tabela payments
        interest_amount: totals.interest, // Usando nomes corretos da tabela payments
        notes: formData.notes || null,
        attachments: attachments.map((att) => att.url),
      };

      const { error } = await supabase
        .from("payments") // Nome correto da tabela
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
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!installment) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Pagamento não encontrado</p>
      </div>
    );
  }

  // Wrapper visual dependendo se é embedded ou página inteira
  const Wrapper = embedded ? "div" : Card;
  const WrapperContent = embedded ? "div" : CardContent;
  const WrapperHeader = embedded ? "div" : CardHeader;

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {/* Property and Tenant Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Endereço: </span>
              <span className="font-medium">{propertyInfo?.address || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cidade: </span>
              <span className="font-medium">{propertyInfo?.city || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informações do Locatário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              <span className="font-medium">{tenantInfo?.name || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Telefone: </span>
              <span className="font-medium">{tenantInfo?.phone || "N/A"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <Card>
        {!embedded && (
          <CardHeader>
            <CardTitle>Registrar Pagamento</CardTitle>
          </CardHeader>
        )}
        <CardContent className={embedded ? "pt-6 space-y-4" : "space-y-4"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data do Pagamento *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de Pagamento *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
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
            />
          </div>

          {/* Totals Summary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor Pago:</span>
                  <span className="font-medium">{formatCurrency(totals.amountPaid.toString())}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span className="font-medium">- {formatCurrency(totals.discount.toString())}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Multa:</span>
                  <span className="font-medium">+ {formatCurrency(totals.lateFee.toString())}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Juros:</span>
                  <span className="font-medium">+ {formatCurrency(totals.interest.toString())}</span>
                </div>
                {/* 
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total.toString())}</span>
                </div>
                */}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
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
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? "Salvando..." : "Confirmar Recebimento"}
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