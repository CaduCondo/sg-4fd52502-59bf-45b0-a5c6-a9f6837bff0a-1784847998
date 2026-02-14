import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { Payment } from "@/types";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Permissões baseadas na role do usuário
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "financial";
  const canDelete = isAdmin;

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "all" as "all" | "pending" | "paid" | "overdue" | "partial",
    propertyId: "all",
    tenantId: "all",
  });

  const { 
    payments, 
    rentals, 
    properties, 
    tenants, 
    loading, 
    handleCancelPayment: cancelPayment,
    loadPayments
  } = usePayments();

  // Carregar pagamentos quando os filtros mudarem
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    loadPayments(filters.month.toString(), filters.year.toString());
  }, [filters.month, filters.year, loadPayments]);

  // Carregar inicial
  useEffect(() => {
    loadPayments(filters.month.toString(), filters.year.toString());
  }, []); // Carrega apenas uma vez no mount

  const handleFilterChange = useCallback((newFilters: any) => {
    const formattedFilters = {
      ...newFilters,
      month: Number(newFilters.month) || new Date().getMonth() + 1,
      year: Number(newFilters.year) || new Date().getFullYear(),
    };
    setFilters(formattedFilters);
  }, []);

  const handleMonthChange = (value: string | number) => {
    setFilters(prev => ({ ...prev, month: Number(value) }));
  };

  const handleYearChange = (value: string | number) => {
    setFilters(prev => ({ ...prev, year: Number(value) }));
  };

  const handlePaymentClick = useCallback((payment: Payment) => {
    if (payment.status === "paid") {
      setSelectedPayment(payment);
      setShowReceiptDialog(true);
    } else {
      setSelectedPaymentId(payment.id);
      setShowReceiptDialog(true);
    }
  }, []);

  const confirmCancelPayment = useCallback(async () => {
    if (!paymentToCancel) return;

    try {
      await cancelPayment(paymentToCancel);
      // Recarregar pagamentos mantendo os filtros atuais
      await loadPayments(filters.month.toString(), filters.year.toString());
      setPaymentToCancel(null);
    } catch (error) {
      // Erro já tratado no hook
      setPaymentToCancel(null);
    }
  }, [paymentToCancel, cancelPayment, loadPayments, filters.month, filters.year]);

  const handleCancelPayment = useCallback(async (paymentId: string) => {
    if (!canDelete) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar recebimentos",
        variant: "destructive",
      });
      return;
    }

    // Fechar o dialog de recebimento antes de abrir o AlertDialog
    setSelectedPaymentId(null);
    setShowReceiptDialog(false);
    
    // Aguardar um pouco para o dialog fechar antes de abrir o AlertDialog
    setTimeout(() => {
      setPaymentToCancel(paymentId);
    }, 100);
  }, [canDelete, toast]);

  const handleViewReceipt = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setShowReceiptDialog(true);
  }, []);

  // Helpers para buscar dados relacionados
  const getPropertyForPayment = useCallback((payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return null;
    return properties.find(p => p.id === rental.propertyId) || null;
  }, [rentals, properties]);

  const getTenantForPayment = useCallback((payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return null;
    return tenants.find(t => t.id === rental.tenantId) || null;
  }, [rentals, tenants]);

  const getPaymentInstallment = (payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) return "Única";
    return `${payment.installment}/${payment.totalInstallments}`;
  };

  const getExpectedAmount = (payment: Payment) => {
    return payment.expectedAmount;
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Filtro de status
      if (filters.status !== "all" && p.status !== filters.status) return false;
      
      // Filtro de propriedade e inquilino
      if (filters.propertyId !== "all" || filters.tenantId !== "all") {
        const rental = rentals.find(r => r.id === p.rentalId);
        if (!rental) return false;
        
        if (filters.propertyId !== "all" && rental.propertyId !== filters.propertyId) return false;
        if (filters.tenantId !== "all" && rental.tenantId !== filters.tenantId) return false;
      }
      
      return true;
    });
  }, [payments, rentals, filters]);

  const pendingPayments = useMemo(() => {
    return payments.filter((p) => {
      // Filtro base de status
      const isStatusMatch = p.status === "pending" || p.status === "partial" || p.status === "overdue";
      if (!isStatusMatch) return false;

      // Filtro de busca por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

        // Busca em: endereço + número + complemento + nome inquilino
        const propertyAddress = property ? 
          `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
        const tenantName = tenant ? tenant.name.toLowerCase() : "";

        return propertyAddress.includes(query) || tenantName.includes(query);
      }

      return true;
    });
  }, [payments, searchQuery, rentals, properties, tenants]);

  const paidPayments = useMemo(() => {
    return payments.filter((p) => {
      // Filtro base de status
      if (p.status !== "paid") return false;

      // Filtro de busca por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

        const propertyAddress = property ? 
          `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
        const tenantName = tenant ? tenant.name.toLowerCase() : "";

        return propertyAddress.includes(query) || tenantName.includes(query);
      }

      return true;
    });
  }, [payments, searchQuery, rentals, properties, tenants]);

  const getMonthName = (month: number) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
            <p className="text-muted-foreground">
              Gerencie os recebimentos de aluguel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Visualização em grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="Visualização em lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Header com filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
            <PeriodSelector
              selectedMonth={filters.month}
              selectedYear={filters.year}
              onMonthChange={handleMonthChange}
              onYearChange={handleYearChange}
            />
            
            <div className="relative w-full max-w-sm ml-0 sm:ml-2">
              <Input
                type="search"
                placeholder="Buscar por inquilino, endereço..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando recebimentos...</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-auto p-1">
              <TabsTrigger value="pending" className="gap-2 text-base py-2">
                Recebimentos Pendentes
                <Badge variant="destructive" className="text-xs">
                  {pendingPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2 text-base py-2">
                Recebimentos Pagos
                <Badge variant="default" className="bg-green-500 text-xs">
                  {paidPayments.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Aba: Recebimentos Pendentes */}
            <TabsContent value="pending" className="space-y-6">
              {pendingPayments.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {pendingPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      property={getPropertyForPayment(payment)}
                      tenant={getTenantForPayment(payment)}
                      isPaid={payment.status === "paid"}
                      viewMode={viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setSelectedPaymentId(id)}
                      onClick={() => setSelectedPaymentId(payment.id)}
                      getMonthName={getMonthName}
                      onCancelPayment={canDelete ? handleCancelPayment : undefined}
                      onViewReceipt={(id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pendente encontrado</p>
                </div>
              )}
            </TabsContent>

            {/* Aba: Recebimentos Pagos */}
            <TabsContent value="paid" className="space-y-6">
              {paidPayments.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {paidPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      property={getPropertyForPayment(payment)}
                      tenant={getTenantForPayment(payment)}
                      isPaid={payment.status === "paid"}
                      viewMode={viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setSelectedPaymentId(id)}
                      onClick={() => setSelectedPaymentId(payment.id)}
                      getMonthName={getMonthName}
                      onCancelPayment={canDelete ? handleCancelPayment : undefined}
                      onViewReceipt={(id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pago encontrado</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={!!paymentToCancel} onOpenChange={(open) => !open && setPaymentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Tem certeza que deseja cancelar este recebimento? Esta ação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Alterar o status para "Pendente"</li>
                  <li>Remover a data e hora do pagamento</li>
                  <li>Zerar o valor pago</li>
                  <li>Remover o método de pagamento</li>
                  <li>Remover anexos</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelPayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showReceiptDialog && selectedPayment && (
        <PaymentReceipt
          payment={selectedPayment}
          rental={rentals.find(r => r.id === selectedPayment.rentalId) as any}
          property={getPropertyForPayment(selectedPayment) as any}
          tenant={getTenantForPayment(selectedPayment) as any}
          onClose={() => {
            setShowReceiptDialog(false);
            setSelectedPayment(null);
          }}
        />
      )}

      <Dialog open={!!selectedPaymentId} onOpenChange={(open) => !open && setSelectedPaymentId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hidden">Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {selectedPaymentId && (
            <ManagePaymentForm
              paymentId={selectedPaymentId}
              onSuccess={() => {
                const payment = payments.find(p => p.id === selectedPaymentId);
                setSelectedPaymentId(null);
                loadPayments(filters.month.toString(), filters.year.toString());
                
                // Se o pagamento foi confirmado (status = paid), abrir o recibo
                if (payment && payment.status === "paid") {
                  setTimeout(() => {
                    setSelectedPayment(payment);
                    setShowReceiptDialog(true);
                  }, 300);
                }
                
                toast({
                  title: "Sucesso!",
                  description: "Recebimento atualizado com sucesso.",
                });
              }}
              onClose={() => setSelectedPaymentId(null)}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}