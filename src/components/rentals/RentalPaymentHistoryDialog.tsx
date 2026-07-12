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
  status: "pago" | "pendente";
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
  }, [open, rental?.id]);

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

  const sortedPayments = useMemo(() => {
    const sorted = [...payments];
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || bValue === null) return 0;
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [payments, sortConfig]);

  const handleSort = (key: keyof Payment) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = (status: string) => {
    return status === "pago"
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  const totalPaid = sortedPayments.reduce((sum, payment) => {
    return payment.status === "pago" ? sum + payment.amount_paid : sum;
  }, 0);

  useEffect(() => {
    if (!open) {
      setSortConfig(null);
    }
  }, [open]);

  return (
    <>
      <style>{`
        @media print {
          /* Esconde o overlay do Dialog */
          [data-radix-dialog-overlay] {
            display: none !important;
          }
          
          /* Remove estilos de Dialog do conteúdo */
          [role="dialog"] {
            position: static !important;
            max-width: 100% !important;
            max-height: 100% !important;
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Esconde elementos desnecessários */
          .no-print,
          button[aria-label="Close"] {
            display: none !important;
          }
          
          /* Configurações da página */
          @page {
            size: landscape;
            margin: 1cm;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Histórico de Pagamentos</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="space-y-2 text-base">
                <div>
                  <span className="font-semibold">Local:</span> {location}
                </div>
                <div>
                  <span className="font-semibold">Complemento:</span> {complement}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Nome Inquilino:</span> {tenantName}
                  </div>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="no-print"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
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
                    <TableHead className="text-base text-right">
                      Valor Esperado
                    </TableHead>
                    <TableHead className="text-base text-right">Valor Pago</TableHead>
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
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                            payment.status
                          )}`}
                        >
                          {payment.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-base text-right">
                        {formatCurrency(payment.expected_amount)}
                      </TableCell>
                      <TableCell className="text-base text-right">
                        {payment.status === "pago"
                          ? formatCurrency(payment.amount_paid)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={5} className="text-base text-right">
                      Total Pago:
                    </TableCell>
                    <TableCell className="text-base text-right">
                      {formatCurrency(totalPaid)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}