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
import { hasPermission } from "@/lib/permissions";
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

export default function Payments() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const mountedRef = useRef(false);
  
  // Permissões baseadas no sistema centralizado
  const permissions = useMemo(() => ({
    canDeletePayment: hasPermission(user?.role, "canDeletePayment"),
    canViewReceipt: true, // Todos podem ver recibos de pagamentos pagos
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

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce do search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(uiState.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [uiState.searchQuery]);

  // ✅ Filtros padrão para mês/ano ATUAL
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string | number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<string | number>(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { 
    payments, 
    rentals, 
    properties, 
    tenants, 
    loading, 
    handleCancelPayment: cancelPayment,
    loadPayments
  } = usePayments();
  
  // 🔍 LOG: Verificar quantos payments chegam do hook em CADA RENDER
  console.log(`🎨 [payments.tsx RENDER] Payments recebidos do hook:`, {
    paymentsLength: payments.length,
    rentalsLength: rentals.length,
    propertiesLength: properties.length,
    tenantsLength: tenants.length,
    loading,
    selectedMonth,
    selectedYear
  });
  
  // 🔍 LOG: Rastrear MUDANÇAS no estado payments
  useEffect(() => {
    console.log(`🔔 [payments.tsx] Estado 'payments' MUDOU:`, {
      length: payments.length,
      timestamp: new Date().toISOString()
    });
  }, [payments]);

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
    // Todos os pagamentos devem ter installment e totalInstallments definidos
    // Formato sempre: "X/Y" mesmo para parcelas proporcionais
    if (!payment.installment || !payment.totalInstallments) {
      console.warn("Payment sem installment ou totalInstallments:", payment);
      return "N/A";
    }
    
    return `${payment.installment}/${payment.totalInstallments}`;
  }, []);

  const getExpectedAmount = useCallback((payment: Payment) => {
    // 🔥 CORREÇÃO: Calcular valor total a partir do breakdown quando ele existir
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;
        
        // Se o breakdown for um array, somar todos os valores PRESERVANDO SINAIS NEGATIVOS
        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
          const breakdownTotal = breakdownData.reduce((sum: number, item: any) => {
            return sum + (item.value || item.amount || 0);
          }, 0);
          
          // Adicionar multa e juros ao total do breakdown (podem ser removidos se negativos)
          return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
        }
        
        // Se o breakdown for um objeto, processar as chaves
        if (typeof breakdownData === 'object' && !Array.isArray(breakdownData)) {
          let breakdownTotal = 0;
          Object.values(breakdownData).forEach((value: any) => {
            if (value && typeof value === 'object') {
              breakdownTotal += (value.value || value.amount || 0);
            }
          });
          
          if (breakdownTotal > 0 || breakdownTotal < 0) {
            return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
          }
        }
      } catch (error) {
        console.error("Erro ao processar breakdown:", error);
      }
    }
    
    // Fallback: usar expected_amount base + multa + juros
    return payment.expectedAmount + (payment.lateFee || 0) + (payment.interest || 0);
  }, []);

  const getMonthName = useCallback((month: number) => {
    return MONTH_NAMES[month - 1] || "";
  }, []);

  // Carregar pagamentos quando os filtros mudarem
  useEffect(() => {
    console.log(`🔄 [payments.tsx useEffect] Chamando loadPayments:`, {
      selectedMonth: selectedMonth.toString(),
      selectedYear: selectedYear.toString(),
      timestamp: new Date().toISOString()
    });
    
    loadPayments(selectedMonth.toString(), selectedYear.toString());
  }, [loadPayments, selectedMonth, selectedYear]);

  // Handlers otimizados
  const handleMonthChange = useCallback((value: string | number) => {
    setUiState(prev => ({ ...prev, paymentToCancel: null }));
    setSelectedMonth(value);
  }, []);

  const handleYearChange = useCallback((value: string | number) => {
    setUiState(prev => ({ ...prev, paymentToCancel: null }));
    setSelectedYear(value);
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
      
      await loadPayments("all", "all");
      
      toast({
        title: "Recebimento cancelado",
        description: "O recebimento foi cancelado com sucesso.",
      });
    } catch (error) {
      setUiState(prev => ({ ...prev, paymentToCancel: null }));
    }
  }, [uiState.paymentToCancel, cancelPayment, loadPayments, toast]);

  const handleCancelPayment = useCallback((paymentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!permissions.canDeletePayment) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar recebimentos",
        variant: "destructive",
      });
      return;
    }

    setUiState(prev => ({ ...prev, paymentToCancel: paymentId }));
  }, [permissions.canDeletePayment, toast]);

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
    
    await loadPayments("all", "all");
    
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
  }, [uiState.selectedPaymentId, loadPayments, payments, toast]);

  // Pagamentos filtrados por busca e separados por status
  const { pendingPayments, paidPayments } = useMemo(() => {
    console.log(`🔍 [payments.tsx] Separando recebimentos - Total disponível: ${payments.length}`);
    
    const filterBySearch = (p: Payment) => {
      if (!debouncedSearchQuery) return true;
      
      const query = debouncedSearchQuery.toLowerCase();
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
    
    console.log(`📊 [payments.tsx] Resultado da separação:`, {
      pending: pending.length,
      paid: paid.length,
      searchQuery: debouncedSearchQuery || "(vazio)"
    });

    return { pendingPayments: pending, paidPayments: paid };
  }, [payments, debouncedSearchQuery, rentals, properties, tenants]);

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
              selectedMonth={selectedMonth as number}
              selectedYear={selectedYear as number}
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
              <TabsTrigger value="pending" className="gap-2 text-xs sm:text-base py-2 px-2 sm:px-4">
                <span className="hidden sm:inline">Recebimentos Pendentes</span>
                <span className="sm:hidden">Pendentes</span>
                <Badge variant="destructive" className="text-xs">
                  {pendingPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2 text-xs sm:text-base py-2 px-2 sm:px-4">
                <span className="hidden sm:inline">Recebimentos Pagos</span>
                <span className="sm:hidden">Pagos</span>
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
                      onCancelPayment={permissions.canDeletePayment ? handleCancelPayment : undefined}
                      onViewReceipt={permissions.canViewReceipt ? (id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      } : undefined}
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
                      onCancelPayment={permissions.canDeletePayment ? handleCancelPayment : undefined}
                      onViewReceipt={permissions.canViewReceipt ? (id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      } : undefined}
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
              onClose={() => setUiState(prev => ({ ...prev, selectedPaymentId: null }))}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}