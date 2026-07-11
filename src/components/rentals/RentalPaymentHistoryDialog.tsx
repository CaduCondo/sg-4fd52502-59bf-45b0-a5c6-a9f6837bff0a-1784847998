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
      
      console.log("=== DADOS DO BANCO (payments) ===");
      console.log("Total de payments:", data?.length);
      if (data && data.length > 0) {
        const firstPayment = data[0];
        console.log("Primeiro payment (exemplo):");
        console.log("  expected_amount:", firstPayment.expected_amount);
        console.log("  paid_amount:", firstPayment.paid_amount);
        console.log("  late_fee:", firstPayment.late_fee);
        console.log("  interest:", firstPayment.interest);
        console.log("  discount_amount:", firstPayment.discount_amount);
        console.log("  breakdown:", firstPayment.breakdown);
        console.log("  breakdown type:", typeof firstPayment.breakdown);
      }
      
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

  const handlePrint = async () => {
    if (!contentRef.current) return;

    try {
      // Import dinâmico apenas no client-side
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `historico-pagamentos-${rental?.property?.location}-${rental?.property?.complement}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "landscape",
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(contentRef.current).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    }
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Pagamentos - {rental?.property?.location} {rental?.property?.complement}</DialogTitle>
        </DialogHeader>

        <div ref={contentRef} style={{ backgroundColor: 'white', padding: '10px' }}>
          <div className="mb-2">
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
              Histórico de Pagamentos - {rental?.property?.location} {rental?.property?.complement}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table style={{ fontSize: '7px' }}>
              <TableHeader style={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableHead style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Parcela</TableHead>
                  <TableHead style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Vencimento</TableHead>
                  <TableHead style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Pagamento</TableHead>
                  <TableHead style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Status</TableHead>
                  <TableHead className="text-right" style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Valor Esperado</TableHead>
                  <TableHead className="text-right" style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell style={{ padding: '3px', fontSize: '7px' }}>{payment.installment}</TableCell>
                    <TableCell style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>
                      {format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>
                      {payment.paymentDate
                        ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell style={{ padding: '3px', fontSize: '7px' }}>
                      <Badge
                        variant={
                          payment.status === "paid"
                            ? "default"
                            : payment.status === "pending"
                            ? "secondary"
                            : payment.status === "partial"
                            ? "outline"
                            : "destructive"
                        }
                        style={{ fontSize: '6px', padding: '1px 3px' }}
                      >
                        {payment.status === "paid"
                          ? "Pago"
                          : payment.status === "pending"
                          ? "Pendente"
                          : payment.status === "partial"
                          ? "Parcial"
                          : "Atrasado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold" style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>{formatCurrency(getExpectedAmount(payment))}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600" style={{ padding: '3px', fontSize: '7px', whiteSpace: 'nowrap' }}>
                      {formatCurrency(payment.paidAmount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}