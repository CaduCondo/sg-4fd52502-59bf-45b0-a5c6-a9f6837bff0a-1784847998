import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import type { DepositInstallment, Rental } from "@/types";
import { X, Calendar, DollarSign, FileText, Receipt, Paperclip } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DepositPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: DepositInstallment;
  rental: Rental;
  onSuccess: () => void;
}

export function DepositPaymentDialog({
  open,
  onOpenChange,
  installment,
  rental,
  onSuccess,
}: DepositPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // Form fields
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  // Carregar configurações
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from("configs").select("*").single();
      setConfig(data);
    };
    loadConfig();
  }, []);

  // Inicializar campos ao abrir
  useEffect(() => {
    if (open && installment) {
      if (installment.payment_date) {
        // Editando recebimento existente
        setPaymentDate(installment.payment_date);
        setPaymentMethod(installment.payment_method || "pix");
        setPaidAmount(formatCurrency(installment.paid_amount || installment.amount));
        setNotes(installment.notes || "");
        setAttachments(installment.attachments || []);
      } else {
        // Novo recebimento
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentMethod("pix");
        setPaidAmount(formatCurrency(installment.amount));
        setNotes("");
        setAttachments([]);
      }
    }
  }, [open, installment]);

  // Cálculos de multa e juros
  const calculations = useMemo(() => {
    if (!paymentDate || !installment.due_date || !config) {
      return {
        daysLate: 0,
        lateFee: 0,
        interest: 0,
        totalWithFees: installment.amount,
      };
    }

    const due = new Date(installment.due_date + "T00:00:00");
    const paid = new Date(paymentDate + "T00:00:00");
    const daysLate = Math.max(0, differenceInDays(paid, due));

    let lateFee = 0;
    let interest = 0;

    if (daysLate > 0) {
      lateFee = installment.amount * (config.late_fee_percentage || 2) / 100;
      interest = installment.amount * (config.interest_rate_percentage || 0.033) / 100 * daysLate;
    }

    const totalWithFees = installment.amount + lateFee + interest;

    return {
      daysLate,
      lateFee,
      interest,
      totalWithFees,
    };
  }, [paymentDate, installment.due_date, installment.amount, config]);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro no upload");

      const { url } = await response.json();
      setAttachments((prev) => [...prev, url]);

      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Não foi possível anexar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentDate) {
      toast({
        title: "Erro",
        description: "Informe a data de pagamento",
        variant: "destructive",
      });
      return;
    }

    const paidValue = parseCurrencyToNumber(paidAmount);
    if (paidValue <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let status: "pending" | "paid" | "partial" | "overdue" = "pending";
      if (paidValue >= installment.amount) {
        status = "paid";
      } else if (paidValue > 0) {
        status = "partial";
      }

      const updateData = {
        payment_date: paymentDate,
        payment_method: paymentMethod,
        paid_amount: paidValue,
        penalty_amount: calculations.lateFee,
        interest_amount: calculations.interest,
        status,
        notes: notes || null,
        attachments: attachments.length > 0 ? attachments : null,
      };

      const { error } = await supabase
        .from("deposit_installments")
        .update(updateData)
        .eq("id", installment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recebimento de caução registrado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar recebimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o recebimento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Deseja realmente excluir este recebimento? O status voltará para Pendente.")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("deposit_installments")
        .update({
          payment_date: null,
          payment_method: null,
          paid_amount: 0,
          penalty_amount: null,
          interest_amount: null,
          status: "pending",
          notes: null,
          attachments: null,
        })
        .eq("id", installment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Recebimento excluído com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao excluir recebimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o recebimento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isPaid = installment.status === "paid" && installment.payment_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="h-5 w-5" />
            Registrar Recebimento de Caução - Parcela {installment.installment_number}/{installment.total_installments}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Blocos lado a lado: Informações do Caução + Formação de Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Informações do Caução */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações do Caução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Parcela</span>
                  <span className="font-semibold">
                    {installment.installment_number}/{installment.total_installments}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Valor da Parcela</span>
                  <span className="font-bold text-green-600">{formatCurrency(installment.amount)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Data de Vencimento</span>
                  <span className="font-medium">
                    {installment.due_date
                      ? format(new Date(installment.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      installment.status === "paid"
                        ? "default"
                        : installment.status === "overdue"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {installment.status === "paid"
                      ? "Pago"
                      : installment.status === "overdue"
                      ? "Atrasado"
                      : "Pendente"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Formação de Valores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Formação de Valores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Valor do Caução</span>
                  <span className="font-semibold">{formatCurrency(installment.amount)}</span>
                </div>

                {calculations.daysLate > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2 bg-red-50 dark:bg-red-950/20 px-3 -mx-3 rounded">
                      <span className="text-sm text-red-700 dark:text-red-400">
                        Atraso: {calculations.daysLate} {calculations.daysLate === 1 ? "dia" : "dias"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Multa ({config?.late_fee_percentage || 2}%)</span>
                      <span className="font-semibold text-red-600">
                        + {formatCurrency(calculations.lateFee)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">
                        Juros ({config?.interest_rate_percentage || 0.033}% ao dia)
                      </span>
                      <span className="font-semibold text-red-600">
                        + {formatCurrency(calculations.interest)}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-950/20 px-3 -mx-3 rounded mt-2">
                  <span className="font-semibold">Total a Pagar</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatCurrency(calculations.totalWithFees)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dados do Recebimento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dados do Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paymentDate">Data do Recebimento *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paidAmount">Valor Pago *</Label>
                  <Input
                    id="paidAmount"
                    type="text"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(formatCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações adicionais sobre o recebimento..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("depositPaymentFile")?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar Comprovante
                </Button>
                <input
                  id="depositPaymentFile"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate flex-1">
                          Anexo {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(url, "_blank")}
                          >
                            Ver
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <div>
              {isPaid && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Excluir Recebimento
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : isPaid ? "Atualizar" : "Registrar Recebimento"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}