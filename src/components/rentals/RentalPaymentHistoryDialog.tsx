import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Rental, Payment } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RentalPaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
}

type SortField = "installment" | "dueDate" | "paymentDate";
type SortDirection = "asc" | "desc" | null;

const printStyles = `
  @media print {
    @page {
      size: landscape;
      margin: 10mm;
    }
    
    /* Esconder elementos que não devem ser impressos */
    .no-print,
    button:not(.print-visible),
    [role="dialog"] > div:first-child,
    .fixed.inset-0 {
      display: none !important;
    }
    
    /* Resetar estilos do dialog para impressão */
    [role="dialog"] {
      position: static !important;
      transform: none !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: white !important;
    }
    
    /* Garantir que o conteúdo seja visível */
    .print-content {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      width: 100% !important;
    }
    
    /* Estilos de texto */
    h1, h2, h3, p, strong, span, td, th {
      color: black !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Estilos da tabela */
    table {
      display: table !important;
      width: 100% !important;
      border-collapse: collapse !important;
      margin-top: 15px !important;
      font-size: 11pt !important;
    }
    
    thead {
      display: table-header-group !important;
    }
    
    tbody {
      display: table-row-group !important;
    }
    
    tr {
      display: table-row !important;
      page-break-inside: avoid !important;
    }
    
    th, td {
      display: table-cell !important;
      padding: 8px !important;
      border: 1px solid #333 !important;
      text-align: left !important;
    }
    
    th {
      background-color: #e5e7eb !important;
      font-weight: bold !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Badge em impressão */
    .print-badge {
      display: inline !important;
      color: black !important;
      font-weight: normal !important;
    }
  }
`;

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

  // Função para calcular valor esperado total (breakdown + late_fee + interest - discount)
  const getExpectedAmount = (payment: Payment): number => {
    let baseTotal = 0;
    
    // Somar items do breakdown (aluguel, garagem, etc.)
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
      // Se não houver breakdown, usar expected_amount como base
      baseTotal = payment.expectedAmount;
    }
    
    // Adicionar late_fee e interest (que estão em campos separados)
    const lateFee = Number(payment.lateFee || 0);
    const interest = Number(payment.interest || 0);
    const discount = Number(payment.discount || 0);
    
    const total = baseTotal + lateFee + interest - discount;
    
    return total;
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

  if (!rental) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
          <div className="print-content">
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
                  className="flex items-center gap-2 no-print"
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
                      className="cursor-pointer hover:bg-gray-100 text-base text-center no-print"
                      onClick={() => handleSort("installment")}
                    >
                      <div className="flex items-center justify-center">
                        Parcela
                        <SortIcon field="installment" />
                      </div>
                    </TableHead>
                    <TableHead className="text-base text-center print:table-cell hidden print:block">
                      Parcela
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 text-base text-center no-print"
                      onClick={() => handleSort("dueDate")}
                    >
                      <div className="flex items-center justify-center">
                        Vencimento
                        <SortIcon field="dueDate" />
                      </div>
                    </TableHead>
                    <TableHead className="text-base text-center print:table-cell hidden print:block">
                      Vencimento
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 text-base text-center no-print"
                      onClick={() => handleSort("paymentDate")}
                    >
                      <div className="flex items-center justify-center">
                        Pagamento
                        <SortIcon field="paymentDate" />
                      </div>
                    </TableHead>
                    <TableHead className="text-base text-center print:table-cell hidden print:block">
                      Pagamento
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
                            className="no-print"
                          >
                            {payment.status === "paid"
                              ? "Pago"
                              : payment.status === "pending"
                              ? "Pendente"
                              : "Parcial"}
                          </Badge>
                          <span className="hidden print:inline print-badge">
                            {payment.status === "paid"
                              ? "Pago"
                              : payment.status === "pending"
                              ? "Pendente"
                              : "Parcial"}
                          </span>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}