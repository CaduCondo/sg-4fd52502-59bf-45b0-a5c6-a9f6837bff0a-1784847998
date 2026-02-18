import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/masks";
import { 
  Calendar, 
  Camera, 
  Paperclip, 
  Trash2,
  Eye,
  Download,
  FileText
} from "lucide-react";
import { Lightbox } from "@/components/Lightbox";

interface ManagePaymentFormProps {
  paymentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  embedded?: boolean;
}

interface FormData {
  payment_date: string;
  amount_to_pay: string;
  payment_method: string;
  notes: string;
}

interface PaymentBreakdownItem {
  description: string;
  amount: number;
  type?: "debit" | "credit" | "discount" | "other_discount";
}

export function ManagePaymentForm({ paymentId, onSuccess, onCancel, onClose }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [payment, setPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    payment_date: new Date().toISOString().split("T")[0],
    amount_to_pay: "",
    payment_method: "pix",
    notes: ""
  });

  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  const [originalBreakdown, setOriginalBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [isTerminationPayment, setIsTerminationPayment] = useState(false);
  const [repairExpensesInput, setRepairExpensesInput] = useState("0,00");
  const [otherDiscountsInput, setOtherDiscountsInput] = useState("0,00");
  const [subtotalFees, setSubtotalFees] = useState(0);
  const [discountInput, setDiscountInput] = useState("0,00");
  const [totalAmountInput, setTotalAmountInput] = useState("0,00");

  const [lateFeePercentage, setLateFeePercentage] = useState(2);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0.033);

  const [config, setConfig] = useState({
    isFineExempt: false,
    isInterestExempt: false,
    isAdminFeeExempt: false
  });

  const isPaid = payment?.status === "paid";

  const formatCurrencyHelper = useCallback((value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const loadPaymentData = useCallback(async () => {
    if (!paymentId) return;

    try {
      setLoading(true);
      
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals (
            id,
            rent_amount,
            parking_amount,
            due_date,
            properties (
              id,
              name,
              address
            ),
            tenants (
              id,
              name,
              email,
              phone
            )
          ),
          rental_terminations (
            id,
            termination_date,
            payment_breakdown,
            final_balance
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;
      if (!paymentData) throw new Error("Pagamento não encontrado");

      setPayment(paymentData);

      if (paymentData.rental_terminations) {
        setIsTerminationPayment(true);
        const breakdown = paymentData.rental_terminations.payment_breakdown || [];
        setOriginalBreakdown(breakdown);
        setPaymentBreakdown(breakdown);

        const subtotal = breakdown.reduce((sum: number, item: any) => sum + item.amount, 0);
        setSubtotalFees(Math.abs(subtotal));

        const discount = breakdown.find((item: any) => item.type === "discount");
        const otherDiscounts = breakdown
          .filter((item: any) => item.type === "other_discount")
          .reduce((sum: number, item: any) => sum + item.amount, 0);

        setDiscountInput(formatCurrency(Math.abs(discount?.amount || 0).toString()));
        setOtherDiscountsInput(formatCurrency(Math.abs(otherDiscounts).toString()));
      }

      if (!paymentData.total_amount || paymentData.total_amount === 0) {
        let calculatedTotal = 0;

        if (paymentData.rental_terminations) {
          const breakdown = paymentData.rental_terminations.payment_breakdown || [];
          calculatedTotal = breakdown.reduce((sum: number, item: any) => sum + item.amount, 0);
        } else if (paymentData.rentals) {
          const rental = paymentData.rentals;
          calculatedTotal = 
            (rental.rent_amount || 0) + 
            (rental.parking_amount || 0) + 
            (paymentData.fine || 0) + 
            (paymentData.interest || 0);
        } else if (paymentData.amount_due) {
          calculatedTotal = paymentData.amount_due;
        }

        if (calculatedTotal > 0) {
          setTotalAmountInput(formatCurrency(calculatedTotal.toString()));
        }
      } else {
        setTotalAmountInput(formatCurrency(paymentData.total_amount.toString()));
      }

      if (paymentData.rental_id) {
        const { data: configData } = await (supabase as any)
          .from("admin_fee_exemptions")
          .select("*")
          .eq("rental_id", paymentData.rental_id)
          .maybeSingle();

        if (configData) {
          setConfig({
            isFineExempt: configData.is_fine_exempt || false,
            isInterestExempt: configData.is_interest_exempt || false,
            isAdminFeeExempt: configData.is_admin_fee_exempt || false,
          });
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading payment:", error);
      toast({
        title: "Erro ao carregar pagamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [paymentId, toast]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const calculateValues = useMemo(() => {
    if (!payment?.rentals) {
      return {
        valorBase: 0,
        multa: 0,
        juros: 0,
        valorAPagar: 0,
        valorJaPago: 0,
        valorRestante: 0
      };
    }

    const rental = payment.rentals;
    const valorBase = (rental.rent_amount || 0) + (rental.parking_amount || 0);
    
    let multa = 0;
    let juros = 0;

    if (payment.due_date) {
      const dueDate = new Date(payment.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diasAtraso = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diasAtraso > 0) {
          multa = valorBase * (lateFeePercentage / 100);
          juros = valorBase * (interestRatePercentage / 100) * diasAtraso;
        }
      }
    }

    const valorAPagar = valorBase + multa + juros;
    const valorJaPago = payment.paid_amount || 0;
    const valorRestante = Math.max(0, valorAPagar - valorJaPago);

    return {
      valorBase,
      multa,
      juros,
      valorAPagar,
      valorJaPago,
      valorRestante
    };
  }, [payment, lateFeePercentage, interestRatePercentage]);

  const calculatedTotal = useMemo(() => {
    if (!isTerminationPayment || originalBreakdown.length === 0) return 0;

    const repairExpenses = parseCurrency(repairExpensesInput);
    const otherDiscounts = parseCurrency(otherDiscountsInput);

    const updatedBreakdown = originalBreakdown.map(item => {
      if (item.description === "Despesas de Reparos") {
        return { ...item, amount: -Math.abs(repairExpenses) };
      }
      if (item.description === "Outros Descontos") {
        return { ...item, amount: -Math.abs(otherDiscounts) };
      }
      return item;
    });

    return updatedBreakdown.reduce((sum, item) => sum + item.amount, 0);
  }, [isTerminationPayment, originalBreakdown, repairExpensesInput, otherDiscountsInput]);

  useEffect(() => {
    if (!payment || loading) return;

    if (payment.status !== "paid" && !formData.amount_to_pay) {
      if (isTerminationPayment && calculatedTotal !== 0) {
        setFormData(prev => ({ 
          ...prev, 
          amount_to_pay: formatCurrencyHelper(Math.abs(calculatedTotal).toFixed(2))
        }));
      } else if (calculateValues.valorAPagar > 0) {
        const amountToFill = calculateValues.valorJaPago > 0 
          ? calculateValues.valorRestante 
          : calculateValues.valorAPagar;
        
        setFormData(prev => ({ 
          ...prev, 
          amount_to_pay: formatCurrencyHelper(amountToFill.toFixed(2))
        }));
      }
    }
  }, [payment, loading, isTerminationPayment, calculatedTotal, calculateValues, formData.amount_to_pay, formatCurrencyHelper]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    } else {
      router.push("/payments");
    }
    
    toast({
      title: "Cancelado",
      description: "Alterações descartadas.",
    });
  }, [onCancel, router, toast, onClose]);

  const handleRepairExpensesChange = useCallback((value: string) => {
    setRepairExpensesInput(formatCurrency(value));
  }, []);

  const handleOtherDiscountsChange = useCallback((value: string) => {
    setOtherDiscountsInput(formatCurrency(value));
  }, []);

  const handleTakePhoto = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleFileUpload(file);
      }
    };
    input.click();
  }, []);

  const handleAttachFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf,.pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleFileUpload(file);
      }
    };
    input.click();
  }, []);

  const handleFileUpload = async (file: File) => {
    console.log("[ManagePaymentForm] Starting file upload...", {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    });

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 15MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    const uploadToast = toast({
      title: "Enviando arquivo...",
      description: `${(file.size / (1024 * 1024)).toFixed(2)}MB - Isso pode levar alguns segundos em redes móveis.`,
      duration: 60000
    });

    try {
      let fileToUpload = file;

      if (file.type.startsWith("image/") && file.size > 1024 * 1024) {
        console.log("[ManagePaymentForm] Compressing large image...");
        
        const compressedFile = await new Promise<File>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;
              const maxDimension = 1920;

              if (width > height && width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else if (height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, width, height);

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(new File([blob], file.name, { type: "image/jpeg" }));
                  } else {
                    reject(new Error("Falha ao comprimir imagem"));
                  }
                },
                "image/jpeg",
                0.8
              );
            };
            img.onerror = () => reject(new Error("Falha ao carregar imagem"));
            img.src = e.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
          reader.readAsDataURL(file);
        });

        fileToUpload = compressedFile;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload falhou: ${response.status}`);
      }

      const data = await response.json();
      console.log("[ManagePaymentForm] Upload successful:", data);

      setAttachments(prev => [...prev, data.url]);

      uploadToast.dismiss();
      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!",
      });
    } catch (error: any) {
      console.error("[ManagePaymentForm] Upload error:", error);
      uploadToast.dismiss();
      
      let errorMessage = "Erro ao enviar arquivo.";
      if (error.message.includes("payload")) {
        errorMessage = "Arquivo muito grande. Tente uma imagem menor ou comprimida.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Tempo esgotado. Verifique sua conexão e tente novamente.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = useCallback(async (url: string) => {
    try {
      setAttachments(prev => prev.filter(a => a !== url));
      
      toast({
        title: "Anexo removido",
        description: "O anexo foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error removing attachment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o anexo.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountToPay = parseCurrency(formData.amount_to_pay);
    if (amountToPay <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor a pagar deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const currentPaidAmount = payment?.paid_amount || 0;
      const newPaidAmount = currentPaidAmount + amountToPay;
      
      let totalAmount = calculateValues.valorAPagar;
      if (isTerminationPayment) {
        totalAmount = Math.abs(calculatedTotal);
      }

      const newStatus = newPaidAmount >= totalAmount ? "paid" : "partial";

      const updateData: any = {
        paid_amount: newPaidAmount,
        status: newStatus,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes,
        attachments: attachments,
        updated_at: new Date().toISOString()
      };

      if (isTerminationPayment && payment?.rental_terminations?.id) {
        const repairExpenses = parseCurrency(repairExpensesInput);
        const otherDiscounts = parseCurrency(otherDiscountsInput);

        const updatedBreakdown = originalBreakdown.map(item => {
          if (item.description === "Despesas de Reparos") {
            return { ...item, amount: -Math.abs(repairExpenses) };
          }
          if (item.description === "Outros Descontos") {
            return { ...item, amount: -Math.abs(otherDiscounts) };
          }
          return item;
        });

        const finalBalance = updatedBreakdown.reduce((sum, item) => sum + item.amount, 0);

        const { error: terminationError } = await supabase
          .from("rental_terminations")
          .update({
            payment_breakdown: updatedBreakdown,
            final_balance: finalBalance,
            updated_at: new Date().toISOString()
          })
          .eq("id", payment.rental_terminations.id);

        if (terminationError) throw terminationError;
      }

      const { error } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso!",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/payments");
      }
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Pagamento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isPaid ? "Detalhes do Pagamento" : "Registrar Recebimento"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {payment.rentals?.properties?.name} - {payment.rentals?.tenants?.name}
          </p>
        </div>
        {isPaid && !isEditMode && (
          <Button onClick={() => setIsEditMode(true)} variant="outline">
            Editar Pagamento
          </Button>
        )}
      </div>

      {isTerminationPayment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Pagamento de Rescisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4">
                <h3 className="font-semibold text-blue-900">Composição do Saldo</h3>
                {originalBreakdown.map((item, index) => {
                  const isEditable = item.description === "Despesas de Reparos" || 
                                   item.description === "Outros Descontos";
                  const value = item.amount;
                  const isDebit = value < 0;

                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.description}</span>
                        {item.type && (
                          <span className={`ml-2 text-xs px-2 py-1 rounded ${
                            item.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {item.type === "credit" ? "Crédito" : "Débito"}
                          </span>
                        )}
                      </div>
                      {isEditable ? (
                        <Input
                          type="text"
                          value={item.description === "Despesas de Reparos" ? repairExpensesInput : otherDiscountsInput}
                          onChange={(e) => 
                            item.description === "Despesas de Reparos" 
                              ? handleRepairExpensesChange(e.target.value)
                              : handleOtherDiscountsChange(e.target.value)
                          }
                          disabled={isPaid && !isEditMode}
                          className="w-40 text-right"
                          placeholder="0,00"
                        />
                      ) : (
                        <span className={`text-lg font-semibold ${isDebit ? "text-red-600" : "text-green-600"}`}>
                          {isDebit ? "- " : "+ "}R$ {formatCurrencyHelper(Math.abs(value))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-blue-900">Saldo Final:</span>
                  <span className={`text-2xl font-bold ${
                    calculatedTotal >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {calculatedTotal >= 0 ? "+ " : "- "}R$ {formatCurrencyHelper(Math.abs(calculatedTotal))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isTerminationPayment && (
        <Card>
          <CardHeader>
            <CardTitle>Formação de Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Aluguel:</span>
              <span className="font-medium">R$ {formatCurrencyHelper(payment.rentals?.rent_amount || 0)}</span>
            </div>
            {(payment.rentals?.parking_amount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Vaga:</span>
                <span className="font-medium">R$ {formatCurrencyHelper(payment.rentals?.parking_amount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Multa ({lateFeePercentage}%):</span>
              <span className="font-medium text-red-600">+ R$ {formatCurrencyHelper(calculateValues.multa)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Juros ({interestRatePercentage}% ao dia):</span>
              <span className="font-medium text-red-600">+ R$ {formatCurrencyHelper(calculateValues.juros)}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between">
                <span className="font-semibold">VALOR TOTAL:</span>
                <span className="font-semibold text-lg">R$ {formatCurrencyHelper(calculateValues.valorAPagar)}</span>
              </div>
            </div>
            {calculateValues.valorJaPago > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">Valor já pago:</span>
                  <span className="font-medium">- R$ {formatCurrencyHelper(calculateValues.valorJaPago)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Valor restante:</span>
                  <span className="font-semibold text-lg text-orange-600">
                    R$ {formatCurrencyHelper(calculateValues.valorRestante)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Data do Pagamento</Label>
                <div className="relative">
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    disabled={isPaid && !isEditMode}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_to_pay">Valor a Pagar</Label>
                <Input
                  id="amount_to_pay"
                  type="text"
                  value={formData.amount_to_pay}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount_to_pay: formatCurrency(e.target.value) }))}
                  disabled={isPaid && !isEditMode}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pagamento</Label>
              <select
                id="payment_method"
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                disabled={isPaid && !isEditMode}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="pix">PIX</option>
                <option value="bank_transfer">Transferência Bancária</option>
                <option value="cash">Dinheiro</option>
                <option value="check">Cheque</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="credit_card">Cartão de Crédito</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={isPaid && !isEditMode}
                placeholder="Observações adicionais sobre o pagamento"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anexos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(isEditMode || !isPaid) && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTakePhoto}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAttachFile}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anexar Arquivo
                </Button>
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Enviando arquivo...</span>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attachments.map((url, index) => {
                  const isPdf = url.toLowerCase().endsWith(".pdf");
                  return (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                        {isPdf ? (
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        ) : (
                          <img 
                            src={url} 
                            alt={`Anexo ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedAttachment(url)}
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setSelectedAttachment(url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => window.open(url, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(isEditMode || !isPaid) && (
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleRemoveAttachment(url)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          {(!isPaid || isEditMode) && (
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : isPaid ? "Salvar Alterações" : "Registrar Recebimento"}
            </Button>
          )}
        </div>
      </form>

      {selectedAttachment && (
        <Lightbox
          files={[{ 
            name: `Anexo`, 
            url: selectedAttachment, 
            type: selectedAttachment.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg" 
          }]}
          initialIndex={0}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
}