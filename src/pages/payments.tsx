import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { useToast } from "@/hooks/use-toast";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { Payment } from "@/types";
import { Plus, Grid3x3, List } from "lucide-react";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Permissões baseadas na role do usuário
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "financial";
  const canDelete = isAdmin;

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

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
    handleCancelPayment: deletePayment, 
    loadPayments: refreshPayments,
    getPaymentInstallment,
    getExpectedAmount
  } = usePayments();

  // Carregar pagamentos quando os filtros mudarem
  useEffect(() => {
    refreshPayments(
      filters.month.toString(), 
      filters.year.toString()
    );
  }, [filters.month, filters.year]);

  const handleFilterChange = useCallback((newFilters: any) => {
    // Converter valores string para números onde necessário
    const formattedFilters = {
      ...newFilters,
      month: Number(newFilters.month) || new Date().getMonth() + 1,
      year: Number(newFilters.year) || new Date().getFullYear(),
    };
    setFilters(formattedFilters);
  }, []);

  const handlePaymentClick = useCallback((payment: Payment) => {
    if (payment.status === "paid") {
      setSelectedPayment(payment);
      setShowReceipt(true);
    } else {
      router.push(`/payments/manage/${payment.id}`);
    }
  }, [router]);

  const handleCancelPayment = useCallback(async (paymentId: string) => {
    if (!canDelete) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar recebimentos",
        variant: "destructive",
      });
      return;
    }

    try {
      await deletePayment(paymentId);
      // refreshPayments é chamado dentro de deletePayment ou precisa ser chamado aqui?
      // O hook usePayments não expõe o refresh automático no handleCancelPayment,
      // mas podemos chamar refreshPayments manualmente se necessário.
      // O hook original atualiza o estado local ou refaz o fetch?
      // Analisando usePayments: handleCancelPayment chama loadPayments ao final.
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [canDelete, deletePayment, toast]);

  const handleViewReceipt = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
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

  const pendingPayments = useMemo(
    () => filteredPayments.filter((p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"),
    [filteredPayments]
  );

  const paidPayments = useMemo(
    () => filteredPayments.filter((p) => p.status === "paid"),
    [filteredPayments]
  );

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
            <p className="text-muted-foreground">
              {getMonthName(filters.month)} de {filters.year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            {canCreate && (
              <Button onClick={() => router.push("/payments/manage/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Recebimento
              </Button>
            )}
          </div>
        </div>

        <PaymentFilters
          selectedMonth={filters.month.toString()}
          selectedYear={filters.year.toString()}
          statusFilter={filters.status}
          onMonthChange={(val) => setFilters(prev => ({ ...prev, month: val === "all" ? 0 : Number(val) }))}
          onYearChange={(val) => setFilters(prev => ({ ...prev, year: val === "all" ? 0 : Number(val) }))}
          onStatusChange={(val) => setFilters(prev => ({ ...prev, status: val as any }))}
        />

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando recebimentos...</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="gap-2">
                Recebimentos Pendentes
                <Badge variant="destructive" className="text-xs">
                  {pendingPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2">
                Recebimentos Pagos
                <Badge variant="default" className="bg-green-500 text-xs">
                  {paidPayments.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Aba: Recebimentos Pendentes */}
            <TabsContent value="pending" className="space-y-6">
              {viewMode === "grid" ? (
                pendingPayments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPayments.map((payment) => {
                      const rental = rentals.find((r) => r.id === payment.rentalId);
                      const property = rental ? properties.find((p) => p.id === rental.propertyId) : undefined;
                      const tenant = rental ? tenants.find((t) => t.id === rental.tenantId) : undefined;

                      return (
                        <PaymentCard
                          key={payment.id}
                          payment={payment}
                          property={property || null}
                          tenant={tenant || null}
                          isPaid={false}
                          viewMode={viewMode}
                          installment={getPaymentInstallment(payment)}
                          expectedAmount={getExpectedAmount(payment)}
                          onCardClick={() => handlePaymentClick(payment)}
                          onCancelPayment={
                            (user?.role === "admin" || user?.role === "financeiro") && payment.status !== "paid"
                              ? (paymentId, e) => {
                                  e.stopPropagation();
                                  handleCancelPayment(paymentId);
                                }
                              : undefined
                          }
                          onViewReceipt={
                            payment.status === "paid"
                              ? (paymentId, e) => {
                                  e.stopPropagation();
                                  handleViewReceipt(payment);
                                }
                              : undefined
                          }
                          getMonthName={getMonthName}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhum recebimento pendente encontrado</p>
                  </div>
                )
              ) : pendingPayments.length > 0 ? (
                <div className="space-y-4">
                  {pendingPayments.map((payment) => {
                    const rental = rentals.find((r) => r.id === payment.rentalId);
                    const property = rental ? properties.find((p) => p.id === rental.propertyId) : undefined;
                    const tenant = rental ? tenants.find((t) => t.id === rental.tenantId) : undefined;

                    return (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={property || null}
                        tenant={tenant || null}
                        isPaid={false}
                        viewMode={viewMode}
                        installment={getPaymentInstallment(payment)}
                        expectedAmount={getExpectedAmount(payment)}
                        onCardClick={() => handlePaymentClick(payment)}
                        onCancelPayment={
                          (user?.role === "admin" || user?.role === "financeiro") && payment.status !== "paid"
                            ? (paymentId, e) => {
                                e.stopPropagation();
                                handleCancelPayment(paymentId);
                              }
                            : undefined
                        }
                        onViewReceipt={
                          payment.status === "paid"
                            ? (paymentId, e) => {
                                e.stopPropagation();
                                handleViewReceipt(payment);
                              }
                            : undefined
                        }
                        getMonthName={getMonthName}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pendente encontrado</p>
                </div>
              )}
            </TabsContent>

            {/* Aba: Recebimentos Pagos */}
            <TabsContent value="paid" className="space-y-6">
              {viewMode === "grid" ? (
                paidPayments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paidPayments.map((payment) => {
                      const rental = rentals.find((r) => r.id === payment.rentalId);
                      const property = rental ? properties.find((p) => p.id === rental.propertyId) : undefined;
                      const tenant = rental ? tenants.find((t) => t.id === rental.tenantId) : undefined;

                      return (
                        <PaymentCard
                          key={payment.id}
                          payment={payment}
                          property={property || null}
                          tenant={tenant || null}
                          isPaid={true}
                          viewMode={viewMode}
                          installment={getPaymentInstallment(payment)}
                          expectedAmount={getExpectedAmount(payment)}
                          onCardClick={() => handlePaymentClick(payment)}
                          onCancelPayment={
                            user?.role === "admin" || user?.role === "financeiro"
                              ? (paymentId, e) => {
                                  e.stopPropagation();
                                  handleCancelPayment(paymentId);
                                }
                              : undefined
                          }
                          onViewReceipt={(paymentId, e) => {
                            e.stopPropagation();
                            handleViewReceipt(payment);
                          }}
                          getMonthName={getMonthName}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhum recebimento pago encontrado</p>
                  </div>
                )
              ) : paidPayments.length > 0 ? (
                <div className="space-y-4">
                  {paidPayments.map((payment) => {
                    const rental = rentals.find((r) => r.id === payment.rentalId);
                    const property = rental ? properties.find((p) => p.id === rental.propertyId) : undefined;
                    const tenant = rental ? tenants.find((t) => t.id === rental.tenantId) : undefined;

                    return (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={property || null}
                        tenant={tenant || null}
                        isPaid={true}
                        viewMode={viewMode}
                        installment={getPaymentInstallment(payment)}
                        expectedAmount={getExpectedAmount(payment)}
                        onCardClick={() => handlePaymentClick(payment)}
                        onCancelPayment={
                          user?.role === "admin" || user?.role === "financeiro"
                            ? (paymentId, e) => {
                                e.stopPropagation();
                                handleCancelPayment(paymentId);
                              }
                            : undefined
                        }
                        onViewReceipt={(paymentId, e) => {
                          e.stopPropagation();
                          handleViewReceipt(payment);
                        }}
                        getMonthName={getMonthName}
                      />
                    );
                  })}
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

      {showReceipt && selectedPayment && (
        <PaymentReceipt
          payment={selectedPayment}
          rental={rentals.find(r => r.id === selectedPayment.rentalId) as any}
          property={getPropertyForPayment(selectedPayment) as any}
          tenant={getTenantForPayment(selectedPayment) as any}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </Layout>
  );
}