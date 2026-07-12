import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/masks";

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
  payments: Payment[];
  location: string;
  complement: string;
  tenantName: string;
}

export function RentalPaymentHistoryDialog({
  open,
  onOpenChange,
  payments,
  location,
  complement,
  tenantName,
}: RentalPaymentHistoryDialogProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Payment;
    direction: "asc" | "desc";
  } | null>(null);

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
          /* Esconde TUDO exceto o conteúdo de impressão */
          body * {
            visibility: hidden !important;
          }
          
          /* Mostra apenas o conteúdo de impressão */
          .print-content,
          .print-content * {
            visibility: visible !important;
          }
          
          /* Posiciona o conteúdo de impressão no topo da página */
          .print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          
          /* Remove bordas do Dialog, backdrop e overlays */
          [role="dialog"],
          [data-radix-dialog-overlay],
          .fixed,
          .inset-0,
          .z-50 {
            display: none !important;
          }
          
          /* Configurações da página */
          @page {
            size: landscape;
            margin: 1cm;
          }
          
          /* Remove margens do body */
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto no-print">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl">Histórico de Pagamentos</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4 text-base">
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
                    className="ml-4"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

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
          </div>
        </DialogContent>
      </Dialog>

      {/* Conteúdo para impressão */}
      <div className="print-content" style={{ display: 'none' }}>
        <div style={{ padding: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            Histórico de Pagamentos
          </h1>

          <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <strong>Local:</strong> {location}
            </div>
            <div>
              <strong>Complemento:</strong> {complement}
            </div>
            <div>
              <strong>Nome Inquilino:</strong> {tenantName}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  Parcela
                </th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  Vencimento
                </th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  Pagamento
                </th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  Status
                </th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right', backgroundColor: '#f5f5f5' }}>
                  Valor Esperado
                </th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'right', backgroundColor: '#f5f5f5' }}>
                  Valor Pago
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {payment.installment_number}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {new Date(payment.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {payment.payment_date
                      ? new Date(payment.payment_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {payment.status === "pago" ? "Pago" : "Pendente"}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(payment.expected_amount)}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                    {payment.status === "pago" ? formatCurrency(payment.amount_paid) : "-"}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                <td colSpan={5} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                  Total Pago:
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                  {formatCurrency(totalPaid)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}