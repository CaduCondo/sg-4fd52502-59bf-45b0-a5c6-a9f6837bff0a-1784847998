import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Rental, Payment } from "@/types";
import { format } from "date-fns";

interface RentalPaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
}

type SortField = "installment" | "dueDate" | "paymentDate";
type SortDirection = "asc" | "desc" | null;

export function RentalPaymentHistoryDialog({
  open,
  onOpenChange,
  rental,
}: RentalPaymentHistoryDialogProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const getExpectedAmount = (payment: Payment): number => {
    let baseTotal = 0;
    
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;

        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
          baseTotal = breakdownData.reduce((sum: number, item: any) => {
            const value = Number(item.value || item.amount || 0);
            return sum + value;
          }, 0);
        }
      } catch (error) {
        console.error("Erro ao processar breakdown:", error);
        baseTotal = payment.expectedAmount;
      }
    } else {
      baseTotal = payment.expectedAmount;
    }
    
    const lateFee = Number(payment.lateFee || 0);
    const interest = Number(payment.interest || 0);
    const discount = Number(payment.discount || 0);
    
    return baseTotal + lateFee + interest - discount;
  };

  useEffect(() => {
    if (open && rental) {
      loadPayments();
    }
  }, [open, rental]);

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
        discount: p.discount_amount,
        lateFee: p.late_fee,
        interest: p.interest,
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };

  const sortedPayments = useMemo(() => {
    if (!sortField || !sortDirection) return payments;

    return [...payments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "installment":
          aValue = a.installment;
          bValue = b.installment;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case "paymentDate":
          aValue = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          bValue = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [payments, sortField, sortDirection]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusText = (status: string) => {
    if (status === "paid") return "Pago";
    if (status === "pending") return "Pendente";
    return "Parcial";
  };

  if (!rental) return null;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 15mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #print-content,
          #print-content * {
            visibility: visible;
          }
          
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        @media screen {
          #print-content {
            position: absolute;
            left: -9999px;
            top: 0;
          }
        }
      `}</style>
      
      <div id="print-content">
        <h2 style={{ fontSize: '20pt', marginBottom: '12pt', fontWeight: 'bold' }}>
          Histórico de Pagamentos
        </h2>
        
        <div style={{ marginBottom: '16pt', fontSize: '11pt' }}>
          <p style={{ margin: '4pt 0' }}>
            <strong>Local:</strong> {rental?.property?.location}
          </p>
          <p style={{ margin: '4pt 0' }}>
            <strong>Complemento:</strong> {rental?.property?.complement}
          </p>
          <p style={{ margin: '4pt 0' }}>
            <strong>Nome Inquilino:</strong> {rental?.tenant?.name}
          </p>
        </div>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '10pt'
        }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Parcela
              </th>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Vencimento
              </th>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Pagamento
              </th>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Status
              </th>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'right'
              }}>
                Valor Esperado
              </th>
              <th style={{
                border: '1px solid #000',
                padding: '8pt',
                backgroundColor: '#e5e7eb',
                fontWeight: 'bold',
                textAlign: 'right'
              }}>
                Valor Pago
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((payment) => (
              <tr key={payment.id}>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'center'
                }}>
                  {payment.installment}
                </td>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'center'
                }}>
                  {format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                </td>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'center'
                }}>
                  {payment.paymentDate ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy") : "-"}
                </td>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'center'
                }}>
                  {getStatusText(payment.status)}
                </td>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'right',
                  fontWeight: 600
                }}>
                  {formatCurrency(getExpectedAmount(payment))}
                </td>
                <td style={{
                  border: '1px solid #000',
                  padding: '6pt 8pt',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#16a34a'
                }}>
                  {formatCurrency(payment.paidAmount || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Histórico de Pagamentos</DialogTitle>
          </DialogHeader>

          <div className="mb-4 space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
              <div className="text-base space-y-1">
                <p><strong>Local:</strong> {rental?.property?.location}</p>
                <p><strong>Complemento:</strong> {rental?.property?.complement}</p>
                <p><strong>Nome Inquilino:</strong> {rental?.tenant?.name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 text-base text-center"
                    onClick={() => handleSort("installment")}
                  >
                    <div className="flex items-center justify-center">
                      Parcela
                      <SortIcon field="installment" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 text-base text-center"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center justify-center">
                      Vencimento
                      <SortIcon field="dueDate" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 text-base text-center"
                    onClick={() => handleSort("paymentDate")}
                  >
                    <div className="flex items-center justify-center">
                      Pagamento
                      <SortIcon field="paymentDate" />
                    </div>
                  </TableHead>
                  <TableHead className="text-base text-center">Status</TableHead>
                  <TableHead className="text-right text-base">Valor Esperado</TableHead>
                  <TableHead className="text-right text-base">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="text-base text-center">{payment.installment}</TableCell>
                      <TableCell className="text-base text-center">
                        {format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-base text-center">
                        {payment.paymentDate
                          ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-base text-center">
                        <Badge
                          variant={
                            payment.status === "paid"
                              ? "default"
                              : payment.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {getStatusText(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-base">
                        {formatCurrency(getExpectedAmount(payment))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 text-base">
                        {formatCurrency(payment.paidAmount || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}