import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Printer, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Rental, Payment } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2pdf from "html2pdf.js";

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
  const contentRef = useRef<HTMLDivElement>(null);

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
    if (!contentRef.current) return;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `historico-pagamentos-${rental?.property?.location}-${rental?.property?.complement}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    html2pdf().set(opt).from(contentRef.current).save();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
  };

  const getPeriod = (dueDate: string) => {
    return format(new Date(dueDate + "T12:00:00"), "MMM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "destructive" as const },
      paid: { label: "Pago", variant: "default" as const },
      partial: { label: "Parcial", variant: "secondary" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRowClassName = (payment: Payment) => {
    if (payment.status === "paid") {
      return "bg-green-50 hover:bg-green-100";
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate + "T12:00:00");
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return "bg-red-50 hover:bg-red-100";
    }
    if (dueDate.getTime() === today.getTime()) {
      return "bg-yellow-50 hover:bg-yellow-100";
    }
    
    return "";
  };

  if (!rental) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Histórico de Pagamentos
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div ref={contentRef} className="space-y-4">
          {/* Informações do Imóvel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border">
            <div>
              <span className="text-sm font-semibold text-slate-600">Local:</span>
              <p className="text-base font-medium text-slate-900">{rental.property?.location || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-600">Complemento:</span>
              <p className="text-base font-medium text-slate-900">{rental.property?.complement || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-600">Inquilino:</span>
              <p className="text-base font-medium text-slate-900">{rental.tenant?.name || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-600">Celular:</span>
              <p className="text-base font-medium text-slate-900">{rental.tenant?.phone || "-"}</p>
            </div>
          </div>

          {/* Tabela de Pagamentos */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center cursor-pointer" onClick={() => handleSort("installment")}>
                      <div className="flex items-center justify-center">
                        Parcela
                        <SortIcon field="installment" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Período</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => handleSort("dueDate")}>
                      <div className="flex items-center justify-center">
                        Data Vencimento
                        <SortIcon field="dueDate" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => handleSort("paymentDate")}>
                      <div className="flex items-center justify-center">
                        Data Pagamento
                        <SortIcon field="paymentDate" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Valor Esperado</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayments.map((payment) => (
                    <TableRow key={payment.id} className={getRowClassName(payment)}>
                      <TableCell className="text-center font-medium">{payment.installment}</TableCell>
                      <TableCell className="text-center">{getPeriod(payment.dueDate)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-center">{formatDate(payment.dueDate)}</TableCell>
                      <TableCell className="text-center">
                        {payment.paymentDate ? formatDate(payment.paymentDate) : "-"}
                      </TableCell>
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
      </DialogContent>
    </Dialog>
  );
}