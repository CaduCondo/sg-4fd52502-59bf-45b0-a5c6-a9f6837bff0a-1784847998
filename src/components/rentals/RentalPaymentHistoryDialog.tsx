import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import type { Payment, Rental } from "@/types";
import { FileText, Receipt } from "lucide-react";

interface RentalPaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
}

export function RentalPaymentHistoryDialog({
  open,
  onOpenChange,
  rental,
}: RentalPaymentHistoryDialogProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && rental?.id) {
      loadPayments();
    }
  }, [open, rental?.id]);

  const loadPayments = async () => {
    if (!rental?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("rental_id", rental.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      
      const mappedPayments: Payment[] = (data || []).map((p) => ({
        id: p.id,
        rentalId: p.rental_id,
        propertyId: rental.propertyId,
        tenantId: rental.tenantId,
        dueDate: p.due_date,
        paymentDate: p.payment_date,
        expectedAmount: p.expected_amount,
        paidAmount: p.paid_amount,
        status: p.status as "pending" | "paid" | "partial",
        installment: p.installment,
        discountAmount: p.discount_amount,
        adminFee: p.admin_fee,
        paymentMethod: p.payment_method || "pix",
        breakdown: p.breakdown,
        attachments: (Array.isArray(p.attachments) ? p.attachments : []) as string[],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      
      setPayments(mappedPayments);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de pagamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingPayments = useMemo(() => {
    return payments.filter((p) => p.status === "pending");
  }, [payments]);

  const paidPayments = useMemo(() => {
    return payments.filter((p) => p.status === "paid" || p.status === "partial");
  }, [payments]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString + "T12:00:00").toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case "paid":
        return <Badge className="bg-green-500 text-white">Pago</Badge>;
      case "partial":
        return <Badge className="bg-blue-500 text-white">Parcial</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRowClassName = (payment: Payment) => {
    if (payment.status === "pending") {
      const dueDate = new Date(payment.dueDate + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        return "bg-red-50 hover:bg-red-100";
      } else if (dueDate.getTime() === today.getTime()) {
        return "bg-yellow-50 hover:bg-yellow-100";
      }
    }
    return "";
  };

  if (!rental) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Receipt className="h-6 w-6 text-blue-600" />
            Histórico de Pagamentos
          </DialogTitle>
          <p className="text-muted-foreground">
            {rental.property?.location} {rental.property?.complement ? `- ${rental.property.complement}` : ""} • {rental.tenant?.name}
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* Recebimentos Pendentes */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-600" />
              Recebimentos Pendentes ({pendingPayments.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                Nenhum recebimento pendente
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Nº</TableHead>
                      <TableHead className="text-center">Local</TableHead>
                      <TableHead className="text-center">Complemento</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Vencimento</TableHead>
                      <TableHead className="text-center">Pagamento</TableHead>
                      <TableHead className="text-right">Valor Esperado</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id} className={getRowClassName(payment)}>
                        <TableCell className="text-center font-medium">{payment.installment}</TableCell>
                        <TableCell className="text-center">{rental.property?.location || "-"}</TableCell>
                        <TableCell className="text-center">{rental.property?.complement || "-"}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-center">{formatDate(payment.dueDate)}</TableCell>
                        <TableCell className="text-center">{payment.paymentDate ? formatDate(payment.paymentDate) : "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(payment.expectedAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(payment.paidAmount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Recebimentos Pagos */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Recebimentos Pagos ({paidPayments.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : paidPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                Nenhum recebimento pago
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Nº</TableHead>
                      <TableHead className="text-center">Local</TableHead>
                      <TableHead className="text-center">Complemento</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Vencimento</TableHead>
                      <TableHead className="text-center">Pagamento</TableHead>
                      <TableHead className="text-right">Valor Esperado</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidPayments.map((payment) => (
                      <TableRow key={payment.id} className="bg-green-50 hover:bg-green-100">
                        <TableCell className="text-center font-medium">{payment.installment}</TableCell>
                        <TableCell className="text-center">{rental.property?.location || "-"}</TableCell>
                        <TableCell className="text-center">{rental.property?.complement || "-"}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-center">{formatDate(payment.dueDate)}</TableCell>
                        <TableCell className="text-center">{payment.paymentDate ? formatDate(payment.paymentDate) : "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(payment.expectedAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(payment.paidAmount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}