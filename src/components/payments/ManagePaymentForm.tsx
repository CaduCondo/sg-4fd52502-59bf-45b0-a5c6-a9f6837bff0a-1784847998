import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Lightbox } from "@/components/Lightbox";
import type { Json } from "@/integrations/supabase/database.types";

interface PaymentBreakdownItem {
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface RentalTermination {
  id: string;
  termination_date: string;
  payment_breakdown: PaymentBreakdownItem[];
  final_balance: number;
}

interface Payment {
  id: string;
  rental_id: string;
  paid_amount: number | null;
  payment_date: string | null;
  payment_time: string | null;
  payment_method: string | null;
  payment_location: string | null;
  payment_code: string | null;
  notes: string | null;
  late_fee: number | null;
  interest: number | null;
  discount_amount: number | null;
  expected_amount: number | null;
  attachments: Json | null;
  rentals?: {
    id: string;
    rent_value: number;
    garage_value: number;
    rent_due_day: number;
    properties?: {
      id: string;
      property_identifier: string;
      location_id: string;
      locations?: {
        id: string;
        name: string;
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        state: string;
      };
    };
    tenants?: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

interface ManagePaymentFormProps {
  paymentId: string;
  onSuccess?: (data?: any) => void;
  onClose?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ 
  paymentId, 
  onSuccess, 
  onClose, 
  onCancel, 
  embedded = false 
}: ManagePaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [termination, setTermination] = useState<RentalTermination | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [waiveFees, setWaiveFees] = useState(false);

  const loadPaymentData = useCallback(async () => {
    if (!paymentId) return;

    try {
      setLoading(true);

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
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      const data = paymentData as any;
      setPayment(data);

      // Usando 'as any' para contornar a falta de tipagem da tabela nova rental_terminations
      const { data: terminationData, error: terminationError } = await supabase
        .from("rental_terminations" as any)
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (terminationError && terminationError.code !== "PGRST116") {
        throw terminationError;
      }

      if (terminationData) {
        setTermination({
          ...terminationData,
          payment_breakdown: (terminationData.payment_breakdown as any) || [],
        });
      }
    } catch (error: any) {
      console.error("Error loading payment:", error);
      toast({
        title: "Erro ao carregar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!payment) return;
    setPayment({
      ...payment,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!payment) return;
    setPayment({
      ...payment,
      [name]: value,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Falha no upload");

      const data = await response.json();
      
      const currentAttachments = payment?.attachments as string[] || [];
      const newAttachments = [...currentAttachments, data.url];
      
      setPayment({
        ...payment!,
        attachments: newAttachments as any,
      });

      toast({
        title: "Anexo adicionado",
        description: "O arquivo foi enviado com sucesso.",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    if (!payment) return;
    const currentAttachments = payment.attachments as string[] || [];
    const newAttachments = currentAttachments.filter((_, i) => i !== index);
    setPayment({
      ...payment,
      attachments: newAttachments.length > 0 ? newAttachments as any : null,
    });
  };

  const handleBreakdownChange = (index: number, field: keyof PaymentBreakdownItem, value: string | number) => {
    if (!termination) return;
    
    const newBreakdown = [...termination.payment_breakdown];
    newBreakdown[index] = {
      ...newBreakdown[index],
      [field]: field === "amount" ? parseFloat(value.toString()) || 0 : value,
    };
    
    const newFinalBalance = newBreakdown.reduce((sum, item) => {
      return sum + (item.type === "credit" ? item.amount : -item.amount);
    }, 0);

    setTermination({
      ...termination,
      payment_breakdown: newBreakdown,
      final_balance: newFinalBalance,
    });
  };

  const handleAddBreakdownItem = () => {
    if (!termination) return;
    
    const newBreakdown = [
      ...termination.payment_breakdown,
      { description: "", amount: 0, type: "debit" as const },
    ];
    
    setTermination({
      ...termination,
      payment_breakdown: newBreakdown,
    });
  };

  const handleRemoveBreakdownItem = (index: number) => {
    if (!termination) return;
    
    const newBreakdown = termination.payment_breakdown.filter((_, i) => i !== index);
    const newFinalBalance = newBreakdown.reduce((sum, item) => {
      return sum + (item.type === "credit" ? item.amount : -item.amount);
    }, 0);
    
    setTermination({
      ...termination,
      payment_breakdown: newBreakdown,
      final_balance: newFinalBalance,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    try {
      setLoading(true);

      const updateData: any = {
        paid_amount: payment.paid_amount || 0,
        payment_date: payment.payment_date,
        payment_time: payment.payment_time,
        payment_method: payment.payment_method,
        payment_location: payment.payment_location,
        payment_code: payment.payment_code,
        notes: payment.notes,
        late_fee: waiveFees ? 0 : (payment.late_fee || 0),
        interest: waiveFees ? 0 : (payment.interest || 0),
        discount_amount: payment.discount_amount || 0,
        attachments: payment.attachments,
      };

      const { error: paymentError } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      if (termination) {
        const { error: terminationError } = await supabase
          .from("rental_terminations" as any)
          .update({
            payment_breakdown: termination.payment_breakdown as any,
            final_balance: termination.final_balance,
          })
          .eq("id", termination.id);

        if (terminationError) throw terminationError;
      }

      toast({
        title: "Pagamento atualizado",
        description: "O pagamento foi atualizado com sucesso.",
      });

      if (embedded && onSuccess) {
        onSuccess(updateData);
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

  const totalValue = useMemo(() => {
    if (!payment) return 0;
    
    const paid = parseFloat(payment.paid_amount?.toString() || "0");
    const lateFee = waiveFees ? 0 : parseFloat(payment.late_fee?.toString() || "0");
    const interest = waiveFees ? 0 : parseFloat(payment.interest?.toString() || "0");
    const discount = parseFloat(payment.discount_amount?.toString() || "0");
    
    return paid + lateFee + interest - discount;
  }, [payment, waiveFees]);

  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return `image/${extension}`;
    }
    return 'image/jpeg';
  };

  if (loading && !payment) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Pagamento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Pagamento</CardTitle>
          <CardDescription>
            {payment.rentals?.properties?.locations?.name ? 
              `${payment.rentals.properties.locations.name} - ${payment.rentals.properties.property_identifier}` : 
              payment.rentals?.properties?.property_identifier
            } - {payment.rentals?.tenants?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paid_amount">Valor Pago (R$)</Label>
                <Input
                  id="paid_amount"
                  name="paid_amount"
                  type="number"
                  step="0.01"
                  value={payment.paid_amount || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Data de Pagamento</Label>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={payment.payment_date || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="payment_time">Horário</Label>
                <Input
                  id="payment_time"
                  name="payment_time"
                  type="time"
                  value={payment.payment_time || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <Select
                  value={payment.payment_method || ""}
                  onValueChange={(value) => handleSelectChange("payment_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_location">Local de Pagamento</Label>
                <Input
                  id="payment_location"
                  name="payment_location"
                  value={payment.payment_location || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="payment_code">Código de Pagamento</Label>
                <Input
                  id="payment_code"
                  name="payment_code"
                  value={payment.payment_code || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="waive_fees"
                    checked={waiveFees}
                    onCheckedChange={(checked) => setWaiveFees(checked as boolean)}
                  />
                  <Label htmlFor="waive_fees" className="cursor-pointer">
                    Retirar multa/juros
                  </Label>
                </div>
              </div>

              <div className={waiveFees ? "opacity-50" : ""}>
                <Label htmlFor="late_fee" className={waiveFees ? "line-through text-muted-foreground" : "text-destructive"}>
                  Multa (R$)
                </Label>
                <Input
                  id="late_fee"
                  name="late_fee"
                  type="number"
                  step="0.01"
                  value={payment.late_fee || ""}
                  onChange={handleChange}
                  disabled={waiveFees}
                  className={waiveFees ? "line-through text-muted-foreground" : ""}
                />
              </div>

              <div className={waiveFees ? "opacity-50" : ""}>
                <Label htmlFor="interest" className={waiveFees ? "line-through text-muted-foreground" : "text-destructive"}>
                  Juros (R$)
                </Label>
                <Input
                  id="interest"
                  name="interest"
                  type="number"
                  step="0.01"
                  value={payment.interest || ""}
                  onChange={handleChange}
                  disabled={waiveFees}
                  className={waiveFees ? "line-through text-muted-foreground" : ""}
                />
              </div>

              <div>
                <Label htmlFor="discount_amount">Desconto (R$)</Label>
                <Input
                  id="discount_amount"
                  name="discount_amount"
                  type="number"
                  step="0.01"
                  value={payment.discount_amount || ""}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label>Valor Total</Label>
                <Input
                  value={totalValue.toFixed(2)}
                  disabled
                  className="font-bold"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                value={payment.notes || ""}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div>
              <Label>Anexos</Label>
              <div className="mt-2 space-y-2">
                {payment.attachments && (payment.attachments as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(payment.attachments as string[]).map((url, index) => (
                      <div key={index} className="relative group">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAttachment(url)}
                          className="pr-8"
                        >
                          {url.toLowerCase().endsWith('.pdf') ? (
                            <FileText className="w-4 h-4 mr-2" />
                          ) : (
                            <ImageIcon className="w-4 h-4 mr-2" />
                          )}
                          Anexo {index + 1}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={loading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Anexo
                  </Button>
                </div>
              </div>
            </div>

            {termination && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pagamento de Rescisão</CardTitle>
                  <CardDescription>
                    Data: {new Date(termination.termination_date).toLocaleDateString("pt-BR")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {termination.payment_breakdown.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            placeholder="Descrição"
                            value={item.description}
                            onChange={(e) => handleBreakdownChange(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Valor"
                            value={item.amount}
                            onChange={(e) => handleBreakdownChange(index, "amount", e.target.value)}
                          />
                        </div>
                        <Select
                          value={item.type}
                          onValueChange={(value) => handleBreakdownChange(index, "type", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Crédito</SelectItem>
                            <SelectItem value="debit">Débito</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBreakdownItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBreakdownItem}
                  >
                    Adicionar Item
                  </Button>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center font-bold">
                      <span>Saldo Final:</span>
                      <span className={termination.final_balance >= 0 ? "text-green-600" : "text-red-600"}>
                        R$ {termination.final_balance.toFixed(2)}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) onCancel();
                  else if (onClose) onClose();
                  else if (!embedded) router.push("/payments");
                }}
              >
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