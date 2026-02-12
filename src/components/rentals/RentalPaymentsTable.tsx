import { Payment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { useRouter } from "next/router";

interface RentalPaymentsTableProps {
  payments: Payment[];
  onManagePayment?: (paymentId: string) => void;
}

export function RentalPaymentsTable({ payments, onManagePayment }: RentalPaymentsTableProps) {
  const router = useRouter();

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
    router.push(`/payments/${paymentId}`);
  };

  const handleManagePayment = (paymentId: string) => {
    if (onManagePayment) {
      onManagePayment(paymentId);
    } else {
      router.push(`/payments/manage/${paymentId}`);
    }
  };

  return (
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
                  <TableCell>{payment.installmentNumber}</TableCell>
                  <TableCell>{formatDate(payment.dueDate)}</TableCell>
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
  );
}