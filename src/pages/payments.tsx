import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
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
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      await cancelPayment(paymentId);
      // refreshPayments é chamado dentro de deletePayment ou precisa ser chamado aqui?
      // O hook usePayments não expõe o refresh automático no handleCancelPayment,
      // mas podemos chamar refreshPayments manualmente se necessário.
      // O hook original atualiza o estado local ou refaz o fetch?
      // Analisando usePayments: handleCancelPayment chama loadPayments ao final.
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [canDelete, cancelPayment, toast]);

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
      // Filtro de status base
      const isStatusMatch = p.status === "pending" || p.status === "partial" || p.status === "overdue";
      if (!isStatusMatch) return false;

      // Filtro de busca por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

        const propertyAddress = property ? `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
        const tenantName = tenant ? tenant.name.toLowerCase() : "";

        return propertyAddress.includes(query) || tenantName.includes(query);
      }

      return true;
    });
  }, [payments, searchQuery, rentals, properties, tenants]);

  const paidPayments = useMemo(() => {
    return payments.filter((p) => {
      // Filtro de status base
      if (p.status !== "paid") return false;

      // Filtro de busca por texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

        const propertyAddress = property ? `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
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
              <LayoutGrid className="h-4 w-4" />
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

        {/* Header com filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
            <PeriodSelector
              selectedMonth={filters.month}
              selectedYear={filters.year}
              onMonthChange={handleMonthChange}
              onYearChange={handleYearChange}
            />
            
            <div className="relative w-full max-w-sm ml-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por inquilino, endereço..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
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