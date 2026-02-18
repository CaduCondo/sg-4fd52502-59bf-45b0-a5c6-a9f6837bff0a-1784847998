import { useState } from "react";
import { Payment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { PaymentReceipt } from "@/components/PaymentReceipt";

interface RentalPaymentsTableProps {
  payments: Payment[];
  onManagePayment?: (paymentId: string) => void;
}

export function RentalPaymentsTable({ payments, onManagePayment }: RentalPaymentsTableProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"manage" | "view" | null>(null);
  const [receiptData, setReceiptData] = useState<{
    payment: Payment;
    rental: any;
    property: any;
    tenant: any;
  } | null>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
    };

    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      overdue: "Atrasado",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleViewPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setViewMode("view");
  };

  const handleManagePayment = (paymentId: string) => {
    if (onManagePayment) {
      onManagePayment(paymentId);
    } else {
      setSelectedPaymentId(paymentId);
      setViewMode("manage");
    }
  };

  const handleManageSuccess = () => {
    // Refresh logic handled by parent or just close dialog
    setViewMode(null);
    setSelectedPaymentId(null);
  };

  const handleCloseDialog = () => {
    setViewMode(null);
    setSelectedPaymentId(null);
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor Esperado</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.installment && payment.totalInstallments
                        ? `${payment.installment}/${payment.totalInstallments}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.expectedAmount)}</TableCell>
                    <TableCell>
                      {payment.paidAmount ? formatCurrency(payment.paidAmount) : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPayment(payment.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payment.status === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleManagePayment(payment.id)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewMode === "manage" && selectedPaymentId && (
        <Dialog open={true} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Pagamento</DialogTitle>
            </DialogHeader>
            <ManagePaymentForm
              paymentId={selectedPaymentId}
              onSuccess={handleManageSuccess}
              onClose={handleCloseDialog}
              embedded={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {viewMode === "view" && selectedPaymentId && (
        <Dialog open={true} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Pagamento</DialogTitle>
            </DialogHeader>
            <ManagePaymentForm
              paymentId={selectedPaymentId}
              onSuccess={handleManageSuccess}
              onClose={handleCloseDialog}
              embedded={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {receiptData && (
        <PaymentReceipt
          payment={receiptData.payment}
          rental={receiptData.rental}
          property={receiptData.property}
          tenant={receiptData.tenant}
          onClose={handleCloseReceipt}
        />
      )}
    </>
  );
}