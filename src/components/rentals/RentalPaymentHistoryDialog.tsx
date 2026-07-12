import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import type { Rental } from "@/types";

interface Payment {
  id: string;
  due_date: string;
  payment_date: string | null;
  amount_paid: number;
  expected_amount: number;
  status: string;
  installment_number: number;
}

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Payment;
    direction: "asc" | "desc";
  } | null>(null);

  const location = rental?.property?.location || "-";
  const complement = rental?.property?.complement || "-";
  const tenantName = rental?.tenant?.name || "-";

  useEffect(() => {
    if (open && rental) {
      loadPayments();
    }
  }, [open, rental]);

  const loadPayments = async () => {
    if (!rental) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("rental_id", rental.id)
        .order("installment", { ascending: true });

      if (error) throw error;

      const mappedPayments: Payment[] = (data || []).map((p) => ({
        id: p.id,
        due_date: p.due_date,
        payment_date: p.payment_date,
        amount_paid: p.paid_amount || 0,
        expected_amount: p.expected_amount || 0,
        status: p.status === "paid" || p.status === "partial" ? "pago" : "pendente",
        installment_number: p.installment || 0,
      }));

      setPayments(mappedPayments);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Payment) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedPayments = useMemo(() => {
    const sortablePayments = [...payments];
    if (sortConfig !== null) {
      sortablePayments.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortablePayments;
  }, [payments, sortConfig]);

  const totalPaid = useMemo(
    () =>
      sortedPayments
        .filter((p) => p.status === "pago")
        .reduce((sum, p) => sum + p.amount_paid, 0),
    [sortedPayments]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* CSS DE IMPRESSÃO - ESTRATÉGIA EXATA DO FINANCIAL.TSX */}
      <style>{`
        @media print {
          /* ESCONDE TUDO PRIMEIRO */
          body * {
            visibility: hidden;
          }
          
          /* MOSTRA APENAS O DIALOG E TODO SEU CONTEÚDO */
          [role="dialog"],
          [role="dialog"] * {
            visibility: visible;
          }
          
          /* POSICIONA O DIALOG NO TOPO */
          [role="dialog"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* ESCONDE BOTÃO IMPRIMIR */
          .print\\:hidden {
            visibility: hidden !important;
          }
          
          /* CONFIGURAÇÃO DE PÁGINA PAISAGEM */
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Histórico de Pagamentos</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações do Imóvel e Inquilino */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="grid gap-3">
                <div className="text-base">
                  <span className="font-semibold">Local:</span> {location}
                </div>
                <div className="text-base">
                  <span className="font-semibold">Complemento:</span> {complement}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-base">
                    <span className="font-semibold">Nome Inquilino:</span> {tenantName}
                  </div>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando pagamentos...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer text-base text-center"
                        onClick={() => handleSort("installment_number")}
                      >
                        Parcela
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-base text-center"
                        onClick={() => handleSort("due_date")}
                      >
                        Vencimento
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-base text-center"
                        onClick={() => handleSort("payment_date")}
                      >
                        Pagamento
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-base text-center"
                        onClick={() => handleSort("status")}
                      >
                        Status
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-base text-right"
                        onClick={() => handleSort("expected_amount")}
                      >
                        Valor Esperado
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-base text-right"
                        onClick={() => handleSort("amount_paid")}
                      >
                        Valor Pago
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-base text-center">
                          {payment.installment_number}
                        </TableCell>
                        <TableCell className="text-base text-center">
                          {new Date(payment.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-base text-center">
                          {payment.payment_date
                            ? new Date(payment.payment_date + "T00:00:00").toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-base text-center">
                          {payment.status === "pago" ? "Pago" : "Pendente"}
                        </TableCell>
                        <TableCell className="text-base text-right">
                          {formatCurrency(payment.expected_amount)}
                        </TableCell>
                        <TableCell className="text-base text-right text-green-600 font-semibold">
                          {payment.status === "pago" ? formatCurrency(payment.amount_paid) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={5} className="text-base text-right">
                        Total Pago:
                      </TableCell>
                      <TableCell className="text-base text-right text-green-600">
                        {formatCurrency(totalPaid)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}