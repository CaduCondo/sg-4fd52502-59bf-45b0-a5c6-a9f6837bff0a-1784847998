import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentCard from "@/components/payments/PaymentCard";
import PaymentFilters from "@/components/payments/PaymentFilters";
import PaymentReceipt from "@/components/PaymentReceipt";
import { useToast } from "@/hooks/use-toast";
import { usePayments } from "@/hooks/usePayments";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { usePermissions } from "@/hooks/usePermissions";
import { Payment } from "@/types";
import { Plus, Grid3x3, List } from "lucide-react";
import { getActiveLocationId } from "@/lib/storage";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canUpdate, canDelete } = usePermissions("payments");

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

  const locationId = getActiveLocationId();
  const { payments, loading, error, deletePayment, refreshPayments } = usePayments(
    filters.month,
    filters.year,
    filters.status === "all" ? undefined : filters.status,
    filters.propertyId === "all" ? undefined : filters.propertyId,
    filters.tenantId === "all" ? undefined : filters.tenantId
  );

  const { properties } = useProperties();
  const { tenants } = useTenants();

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar recebimentos",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
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
      toast({
        title: "Recebimento cancelado",
        description: "O recebimento foi cancelado com sucesso",
      });
      refreshPayments();
    } catch (error) {
      toast({
        title: "Erro ao cancelar recebimento",
        description: "Ocorreu um erro ao cancelar o recebimento",
        variant: "destructive",
      });
    }
  }, [canDelete, deletePayment, refreshPayments, toast]);

  const handleViewReceipt = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  }, []);

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"),
    [payments]
  );

  const paidPayments = useMemo(
    () => payments.filter((p) => p.status === "paid"),
    [payments]
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
            <p className="text-muted-foreground">
              {new Date(filters.year, filters.month - 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
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
          filters={filters}
          onFilterChange={handleFilterChange}
          properties={properties}
          tenants={tenants}
        />

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando recebimentos...</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pending" className="gap-2">
                Pendentes
                <Badge variant="destructive" className="text-xs">
                  {pendingPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2">
                Pagos
                <Badge variant="default" className="bg-green-500 text-xs">
                  {paidPayments.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              {pendingPayments.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPayments.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={properties.find((p) => p.id === payment.property_id)}
                        tenant={tenants.find((t) => t.id === payment.tenant_id)}
                        onClick={() => handlePaymentClick(payment)}
                        onCancel={() => handleCancelPayment(payment.id)}
                        onViewReceipt={() => handleViewReceipt(payment)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPayments.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={properties.find((p) => p.id === payment.property_id)}
                        tenant={tenants.find((t) => t.id === payment.tenant_id)}
                        onClick={() => handlePaymentClick(payment)}
                        onCancel={() => handleCancelPayment(payment.id)}
                        onViewReceipt={() => handleViewReceipt(payment)}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pendente encontrado</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
              {paidPayments.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paidPayments.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={properties.find((p) => p.id === payment.property_id)}
                        tenant={tenants.find((t) => t.id === payment.tenant_id)}
                        onClick={() => handlePaymentClick(payment)}
                        onCancel={() => handleCancelPayment(payment.id)}
                        onViewReceipt={() => handleViewReceipt(payment)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paidPayments.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        property={properties.find((p) => p.id === payment.property_id)}
                        tenant={tenants.find((t) => t.id === payment.tenant_id)}
                        onClick={() => handlePaymentClick(payment)}
                        onCancel={() => handleCancelPayment(payment.id)}
                        onViewReceipt={() => handleViewReceipt(payment)}
                      />
                    ))}
                  </div>
                )
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
          property={properties.find((p) => p.id === selectedPayment.property_id)}
          tenant={tenants.find((t) => t.id === selectedPayment.tenant_id)}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </Layout>
  );
}