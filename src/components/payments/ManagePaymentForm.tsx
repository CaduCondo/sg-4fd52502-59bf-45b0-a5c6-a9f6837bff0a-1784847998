import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { Upload, Trash2, AlertCircle, Eye } from "lucide-react";
import { Lightbox } from "@/components/Lightbox";
import type { Json } from "@/integrations/supabase/database.types";

interface PaymentBreakdownItem {
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface ManagePaymentFormProps {
  paymentId: string;
  onSuccess?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ paymentId, onSuccess, onClose, onCancel, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [subtotalFees, setSubtotalFees] = useState({ lateFee: 0, interest: 0, discount: 0 });

  const [formData, setFormData] = useState({
    paidAmount: "",
    paymentDate: "",
    paymentTime: "",
    paymentMethod: "",
    paymentLocation: "",
    paymentCode: "",
    notes: "",
    lateFee: "0",
    interest: "0",
    discount: "0",
  });

  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadPaymentData = useCallback(async () => {
    if (!paymentId) return;

    try {
      setLoading(true);

      // Query com campos corretos do schema
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals(
            id,
            rent_value,
            garage_value,
            rent_due_day,
            properties(
              id,
              property_identifier,
              location_id,
              locations(
                id,
                name,
                street,
                number,
                neighborhood,
                city,
                state
              )
            ),
            tenants(
              id,
              name,
              email,
              phone
            )
          ),
          rental_terminations(
            id,
            termination_date,
            payment_breakdown,
            final_balance
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      const data = paymentData as any;

      setPayment(data);

      // Processar attachments
      const attachmentsList = Array.isArray(data.attachments) ? data.attachments : [];
      setAttachments(attachmentsList);

      // Processar rental_terminations (é um array, pegar o primeiro)
      const termination = Array.isArray(data.rental_terminations) && data.rental_terminations.length > 0
        ? data.rental_terminations[0]
        : null;

      if (termination?.payment_breakdown) {
        const breakdown = Array.isArray(termination.payment_breakdown)
          ? termination.payment_breakdown
          : [];
        setPaymentBreakdown(breakdown as PaymentBreakdownItem[]);
      }

      // Preencher formulário
      setFormData({
        paidAmount: data.paid_amount ? formatCurrency(data.paid_amount) : "",
        paymentDate: data.payment_date || "",
        paymentTime: data.payment_time || "",
        paymentMethod: data.payment_method || "",
        paymentLocation: data.payment_location || "",
        paymentCode: data.payment_code || "",
        notes: data.notes || "",
        lateFee: data.late_fee ? formatCurrency(data.late_fee) : "0",
        interest: data.interest ? formatCurrency(data.interest) : "0",
        discount: data.discount_amount ? formatCurrency(data.discount_amount) : "0",
      });

      setSubtotalFees({
        lateFee: data.late_fee || 0,
        interest: data.interest || 0,
        discount: data.discount_amount || 0,
      });

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading payment:", error);
      toast({
        title: "Erro ao carregar pagamento",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [paymentId, toast]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const numericValue = parseCurrency(value);
    setFormData(prev => ({ ...prev, [field]: formatCurrency(numericValue) }));

    if (field === "lateFee" || field === "interest" || field === "discount") {
      setSubtotalFees(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const newAttachments = [...attachments, data.url];
      setAttachments(newAttachments);

      const { error } = await supabase
        .from("payments")
        .update({ attachments: newAttachments as unknown as Json })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Anexo adicionado",
        description: "Arquivo enviado com sucesso",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (url: string) => {
    const newAttachments = attachments.filter(a => a !== url);
    setAttachments(newAttachments);

    try {
      const { error } = await supabase
        .from("payments")
        .update({ attachments: newAttachments as unknown as Json })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Anexo removido",
        description: "Arquivo removido com sucesso",
      });
    } catch (error: any) {
      console.error("Error removing attachment:", error);
      toast({
        title: "Erro ao remover anexo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBreakdownChange = (index: number, field: keyof PaymentBreakdownItem, value: string | number) => {
    setPaymentBreakdown(prev => {
      const newBreakdown = [...prev];
      if (field === "amount") {
        newBreakdown[index] = { ...newBreakdown[index], [field]: typeof value === "string" ? parseCurrency(value) : value };
      } else {
        newBreakdown[index] = { ...newBreakdown[index], [field]: value };
      }
      return newBreakdown;
    });
  };

  const handleAddBreakdownItem = () => {
    setPaymentBreakdown(prev => [...prev, { description: "", amount: 0, type: "debit" }]);
  };

  const handleRemoveBreakdownItem = (index: number) => {
    setPaymentBreakdown(prev => prev.filter((_, i) => i !== index));
  };

  const calculatedBalance = useMemo(() => {
    return paymentBreakdown.reduce((acc, item) => {
      return item.type === "credit" ? acc + item.amount : acc - item.amount;
    }, 0);
  }, [paymentBreakdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const paidAmount = parseCurrency(formData.paidAmount);
      const lateFee = parseCurrency(formData.lateFee);
      const interest = parseCurrency(formData.interest);
      const discount = parseCurrency(formData.discount);

      const updateData: any = {
        paid_amount: paidAmount,
        payment_date: formData.paymentDate || null,
        payment_time: formData.paymentTime || null,
        payment_method: formData.paymentMethod || null,
        payment_location: formData.paymentLocation || null,
        payment_code: formData.paymentCode || null,
        notes: formData.notes || null,
        late_fee: lateFee,
        interest: interest,
        discount_amount: discount,
        status: paidAmount >= payment.expected_amount ? "paid" : paidAmount > 0 ? "partial" : "pending",
        is_paid: paidAmount >= payment.expected_amount,
        updated_at: new Date().toISOString(),
      };

      const { error: paymentError } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      // Atualizar rental_terminations se houver breakdown
      const termination = Array.isArray(payment.rental_terminations) && payment.rental_terminations.length > 0
        ? payment.rental_terminations[0]
        : null;

      if (termination && paymentBreakdown.length > 0) {
        const { error: terminationError } = await supabase
          .from("rental_terminations")
          .update({
            payment_breakdown: paymentBreakdown as unknown as Json,
            final_balance: calculatedBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", termination.id);

        if (terminationError) throw terminationError;
      }

      toast({
        title: "Pagamento atualizado",
        description: "Informações salvas com sucesso",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/payments");
      }
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast({
        title: "Erro ao atualizar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    } else {
      router.push("/payments");
    }
  };

  // Helper para identificar tipo de arquivo
  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image/' + extension;
    return 'image/jpeg';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Pagamento não encontrado</AlertDescription>
      </Alert>
    );
  }

  const termination = Array.isArray(payment.rental_terminations) && payment.rental_terminations.length > 0
    ? payment.rental_terminations[0]
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Recebimento</CardTitle>
          <CardDescription>
            {payment.rentals?.properties?.locations?.name ? 
              `${payment.rentals.properties.locations.name} - ${payment.rentals.properties.property_identifier}` : 
              payment.rentals?.properties?.property_identifier
            } - {payment.rentals?.tenants?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paidAmount">Valor Recebido</Label>
                <Input
                  id="paidAmount"
                  value={formData.paidAmount}
                  onChange={(e) => handleCurrencyChange("paidAmount", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label htmlFor="paymentDate">Data de Recebimento</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="paymentTime">Horário de Recebimento</Label>
                <Input
                  id="paymentTime"
                  type="time"
                  value={formData.paymentTime}
                  onChange={(e) => handleInputChange("paymentTime", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
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

              <div>
                <Label htmlFor="paymentLocation">Local de Recebimento</Label>
                <Input
                  id="paymentLocation"
                  value={formData.paymentLocation}
                  onChange={(e) => handleInputChange("paymentLocation", e.target.value)}
                  placeholder="Ex: Caixa Eletrônico, Agência"
                />
              </div>

              <div>
                <Label htmlFor="paymentCode">Código de Pagamento</Label>
                <Input
                  id="paymentCode"
                  value={formData.paymentCode}
                  onChange={(e) => handleInputChange("paymentCode", e.target.value)}
                  placeholder="Código PIX, Boleto, etc."
                />
              </div>

              <div>
                <Label htmlFor="lateFee">Multa</Label>
                <Input
                  id="lateFee"
                  value={formData.lateFee}
                  onChange={(e) => handleCurrencyChange("lateFee", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label htmlFor="interest">Juros</Label>
                <Input
                  id="interest"
                  value={formData.interest}
                  onChange={(e) => handleCurrencyChange("interest", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label htmlFor="discount">Desconto</Label>
                <Input
                  id="discount"
                  value={formData.discount}
                  onChange={(e) => handleCurrencyChange("discount", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>

            <div>
              <Label>Anexos</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((url, index) => (
                  <div key={index} className="relative group">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAttachment(url)}
                      className="pr-8"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Anexo {index + 1}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => handleRemoveAttachment(url)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Adicionar"}
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {termination && (
              <Card>
                <CardHeader>
                  <CardTitle>Pagamento de Rescisão</CardTitle>
                  <CardDescription>
                    Detalhamento dos valores da rescisão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentBreakdown.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5">
                        <Label>Descrição</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleBreakdownChange(index, "description", e.target.value)}
                          placeholder="Ex: Aluguel proporcional"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Valor</Label>
                        <Input
                          value={formatCurrency(item.amount)}
                          onChange={(e) => handleBreakdownChange(index, "amount", e.target.value)}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Tipo</Label>
                        <Select
                          value={item.type}
                          onValueChange={(value) => handleBreakdownChange(index, "type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Crédito</SelectItem>
                            <SelectItem value="debit">Débito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBreakdownItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddBreakdownItem}
                    className="w-full"
                  >
                    Adicionar Item
                  </Button>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Saldo Final:</span>
                      <span className={calculatedBalance >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(Math.abs(calculatedBalance))}
                        {calculatedBalance >= 0 ? " (Inquilino deve)" : " (Proprietário deve)"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {selectedAttachment && (
        <Lightbox
          files={[{ 
            name: "Anexo", 
            url: selectedAttachment, 
            type: getFileType(selectedAttachment)
          }]}
          initialIndex={0}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
}