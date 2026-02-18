import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3x3, List, Search } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { Payment } from "@/types";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const mountedRef = useRef(false);
  
  // Permissões baseadas na role do usuário
  const permissions = useMemo(() => ({
    isAdmin: user?.role === "admin",
    canCreate: user?.role === "admin" || user?.role === "financial",
    canDelete: user?.role === "admin",
  }), [user?.role]);

  // Estados consolidados
  const [uiState, setUiState] = useState({
    viewMode: "grid" as "grid" | "list",
    searchQuery: "",
    selectedPaymentId: null as string | null,
    paymentToCancel: null as string | null,
    showReceiptDialog: false,
    selectedPayment: null as Payment | null,
  });

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
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

  // Helpers memoizados
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

  const getPaymentInstallment = useCallback((payment: Payment) => {
    if (!payment.installment || !payment.totalInstallments) return "Única";
    return `${payment.installment}/${payment.totalInstallments}`;
  }, []);

  const getExpectedAmount = useCallback((payment: Payment) => {
    return payment.expectedAmount;
  }, []);

  const getMonthName = useCallback((month: number) => {
    return MONTH_NAMES[month - 1] || "";
  }, []);

  // Carregar pagamentos quando os filtros mudarem
  const loadPaymentsEffect = useCallback(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadPayments(filters.month.toString(), filters.year.toString());
      return;
    }
    loadPayments(filters.month.toString(), filters.year.toString());
  }, [filters.month, filters.year, loadPayments]);

  // Effect simplificado
  useEffect(() => {
    loadPaymentsEffect();
  }, [loadPaymentsEffect]);

  // Handlers otimizados
  const handleMonthChange = useCallback((value: string | number) => {
    setFilters(prev => ({ ...prev, month: Number(value) }));
  }, []);

  const handleYearChange = useCallback((value: string | number) => {
    setFilters(prev => ({ ...prev, year: Number(value) }));
  }, []);

  const handlePaymentClick = useCallback((payment: Payment) => {
    if (payment.status === "paid") {
      setUiState(prev => ({
        ...prev,
        selectedPayment: payment,
        showReceiptDialog: true,
      }));
    } else {
      setUiState(prev => ({
        ...prev,
        selectedPaymentId: payment.id,
        showReceiptDialog: true,
      }));
    }
  }, []);

  const confirmCancelPayment = useCallback(async () => {
    if (!uiState.paymentToCancel) return;

    try {
      await cancelPayment(uiState.paymentToCancel);
      
      setUiState(prev => ({ ...prev, paymentToCancel: null }));
      
      await loadPayments(filters.month.toString(), filters.year.toString());
      
      toast({
        title: "Recebimento cancelado",
        description: "O recebimento foi cancelado com sucesso.",
      });
    } catch (error) {
      setUiState(prev => ({ ...prev, paymentToCancel: null }));
    }
  }, [uiState.paymentToCancel, cancelPayment, loadPayments, filters.month, filters.year, toast]);

  const handleCancelPayment = useCallback((paymentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!permissions.canDelete) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar recebimentos",
        variant: "destructive",
      });
      return;
    }

    setUiState(prev => ({ ...prev, paymentToCancel: paymentId }));
  }, [permissions.canDelete, toast]);

  const handleViewReceipt = useCallback((payment: Payment) => {
    setUiState(prev => ({
      ...prev,
      selectedPayment: payment,
      showReceiptDialog: true,
    }));
  }, []);

  const handleManagePaymentSuccess = useCallback(async () => {
    const paymentId = uiState.selectedPaymentId;
    
    setUiState(prev => ({ ...prev, selectedPaymentId: null }));
    
    await loadPayments(filters.month.toString(), filters.year.toString());
    
    setTimeout(() => {
      const updatedPayment = payments.find(p => p.id === paymentId);
      
      if (updatedPayment) {
        setUiState(prev => ({
          ...prev,
          selectedPayment: updatedPayment,
          showReceiptDialog: true,
        }));
        
        toast({
          title: "Sucesso!",
          description: "Recebimento registrado com sucesso.",
        });
      } else {
        toast({
          title: "Sucesso!",
          description: "Recebimento registrado com sucesso.",
        });
      }
    }, 500);
  }, [uiState.selectedPaymentId, loadPayments, filters.month, filters.year, payments, toast]);

  // Pagamentos filtrados por busca e separados por status
  const { pendingPayments, paidPayments } = useMemo(() => {
    const filterBySearch = (p: Payment) => {
      if (!uiState.searchQuery) return true;
      
      const query = uiState.searchQuery.toLowerCase();
      const rental = rentals.find(r => r.id === p.rentalId);
      const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
      const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

      const propertyAddress = property ? 
        `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
      const tenantName = tenant ? tenant.name.toLowerCase() : "";

      return propertyAddress.includes(query) || tenantName.includes(query);
    };

    const pending = payments.filter((p) => {
      const isStatusMatch = p.status === "pending" || p.status === "partial" || p.status === "overdue";
      return isStatusMatch && filterBySearch(p);
    });

    const paid = payments.filter((p) => {
      return p.status === "paid" && filterBySearch(p);
    });

    return { pendingPayments: pending, paidPayments: paid };
  }, [payments, uiState.searchQuery, rentals, properties, tenants]);

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
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={uiState.viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUiState(prev => ({ ...prev, viewMode: "grid" }))}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4 mr-1.5" />
              Grade
            </Button>
            <Button
              variant={uiState.viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUiState(prev => ({ ...prev, viewMode: "list" }))}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </Button>
          </div>
        </div>

        {/* Filtros */}
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
                value={uiState.searchQuery}
                onChange={(e) => setUiState(prev => ({ ...prev, searchQuery: e.target.value }))}
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
                    uiState.viewMode === "grid"
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
                      viewMode={uiState.viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setUiState(prev => ({ ...prev, selectedPaymentId: id }))}
                      onClick={() => setUiState(prev => ({ ...prev, selectedPaymentId: payment.id }))}
                      getMonthName={getMonthName}
                      onCancelPayment={permissions.canDelete ? handleCancelPayment : undefined}
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
                    uiState.viewMode === "grid"
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
                      viewMode={uiState.viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setUiState(prev => ({ ...prev, selectedPaymentId: id }))}
                      onClick={() => setUiState(prev => ({ ...prev, selectedPaymentId: payment.id }))}
                      getMonthName={getMonthName}
                      onCancelPayment={permissions.canDelete ? handleCancelPayment : undefined}
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
      <AlertDialog open={!!uiState.paymentToCancel} onOpenChange={(open) => !open && setUiState(prev => ({ ...prev, paymentToCancel: null }))}>
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

      {uiState.showReceiptDialog && uiState.selectedPayment && (
        <PaymentReceipt
          payment={uiState.selectedPayment}
          rental={rentals.find(r => r.id === uiState.selectedPayment!.rentalId) as any}
          property={getPropertyForPayment(uiState.selectedPayment) as any}
          tenant={getTenantForPayment(uiState.selectedPayment) as any}
          onClose={() => {
            setUiState(prev => ({
              ...prev,
              showReceiptDialog: false,
              selectedPayment: null,
            }));
          }}
        />
      )}

      <Dialog open={!!uiState.selectedPaymentId} onOpenChange={(open) => !open && setUiState(prev => ({ ...prev, selectedPaymentId: null }))}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hidden">Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {uiState.selectedPaymentId && (
            <ManagePaymentForm
              paymentId={uiState.selectedPaymentId}
              onSuccess={handleManagePaymentSuccess}
              onCancel={() => setUiState(prev => ({ ...prev, selectedPaymentId: null }))}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}