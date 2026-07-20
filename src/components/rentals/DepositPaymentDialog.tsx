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
import { X, Calendar, DollarSign, FileText, Receipt } from "lucide-react";
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
      } else {
        // Novo recebimento
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentMethod("pix");
        setPaidAmount(formatCurrency(installment.amount));
        setNotes("");
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
      // Multa: percentual sobre o valor
      lateFee = installment.amount * (config.late_fee_percentage || 2) / 100;
      
      // Juros: percentual por dia * dias de atraso
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
      // Determinar status
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="h-5 w-5" />
            Registrar Recebimento de Caução
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Parcela</Label>
                <p className="font-medium">
                  {installment.installment_number}ª parcela caução ({installment.installment_number}/{installment.total_installments})
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor da Parcela</Label>
                <p className="font-bold text-green-600">{formatCurrency(installment.amount)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Vencimento</Label>
                <p className="font-medium">
                  {installment.due_date
                    ? format(new Date(installment.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div>
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
              </div>
            </CardContent>
          </Card>

          {/* Formação de Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Formação de Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">{installment.installment_number}ª parcela caução</span>
                <span className="font-semibold">{formatCurrency(installment.amount)}</span>
              </div>

              {calculations.daysLate > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 border-b bg-red-50 px-3 -mx-3">
                    <span className="text-sm text-red-700">
                      Atraso no pagamento ({calculations.daysLate} {calculations.daysLate === 1 ? "dia" : "dias"})
                    </span>
                    <span className="font-semibold text-red-700">-</span>
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

              <div className="flex justify-between items-center py-3 bg-blue-50 px-3 -mx-3 rounded">
                <span className="font-semibold">Total a Pagar</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatCurrency(calculations.totalWithFees)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Recebimento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dados do Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

          {/* Botões */}
          <div className="flex justify-between gap-3">
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