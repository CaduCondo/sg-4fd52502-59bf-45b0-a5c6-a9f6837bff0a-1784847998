import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, LayoutGrid, List } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";

export default function Payments() {
  const router = useRouter();
  const {
    payments,
    rentals,
    properties,
    tenants,
    loading,
    loadPayments,
    handleCancelPayment,
    getPropertyInfo,
    getTenantInfo,
    getExpectedAmount,
    getPaymentInstallment,
  } = usePayments();

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleCardClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPaymentId(null);
    loadPayments();
  };

  const handleCancelPaymentClick = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja cancelar este pagamento? O recebimento voltará ao estado pendente.")) {
      return;
    }

    await handleCancelPayment(paymentId);
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  const getFilteredPayments = () => {
    let filtered = [...payments];

    if (selectedMonth !== "all" && selectedYear !== "all") {
      filtered = filtered.filter((payment) => {
        if (!payment.dueDate) return false;
        
        const dueDateObj = new Date(payment.dueDate + "T00:00:00");
        const dueMonth = dueDateObj.getMonth() + 1;
        const dueYear = dueDateObj.getFullYear();
        
        return (
          dueMonth === parseInt(selectedMonth) &&
          dueYear === parseInt(selectedYear)
        );
      });
    } else if (selectedMonth !== "all") {
       filtered = filtered.filter((payment) => {
          if (!payment.dueDate) return false;
          const dueMonth = new Date(payment.dueDate + "T00:00:00").getMonth() + 1;
          return dueMonth === parseInt(selectedMonth);
       });
    } else if (selectedYear !== "all") {
       filtered = filtered.filter((payment) => {
          if (!payment.dueDate) return false;
          const dueYear = new Date(payment.dueDate + "T00:00:00").getFullYear();
          return dueYear === parseInt(selectedYear);
       });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const filteredPayments = getFilteredPayments();

  const unpaidPayments = filteredPayments.filter(
    (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
  );

  const paidPayments = filteredPayments.filter((p) => p.status === "paid");

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all";

  return (
    <>
      <Head>
        <title>Recebimentos - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
          <ScrollReveal>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
                  <p className="text-muted-foreground mt-2">
                    {hasActiveFilters 
                      ? `${selectedMonth !== "all" ? getMonthName(parseInt(selectedMonth)) : "Todos os meses"} de ${selectedYear !== "all" ? selectedYear : "todos os anos"}`
                      : "Todos os recebimentos dos contratos ativos"
                    }
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Grade
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Lista
                  </Button>
                </div>
              </div>
              
              <PaymentFilters
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                statusFilter={statusFilter}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onStatusChange={setStatusFilter}
              />
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando recebimentos...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <ScrollReveal delay={0.2}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Recebimentos Pendentes</h2>
                    <Badge variant="destructive" className="text-sm">
                      {unpaidPayments.length}
                    </Badge>
                  </div>
                </ScrollReveal>

                {unpaidPayments.length === 0 ? (
                  <ScrollReveal delay={0.3}>
                    <Card>
                      <CardContent className="py-12 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum recebimento pendente</h3>
                        <p className="text-muted-foreground">
                          Todos os recebimentos foram pagos!
                        </p>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ) : (
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
                    {unpaidPayments.map((payment, index) => (
                      <FloatingCard key={payment.id} delay={0.1 * (index + 3)}>
                        <PaymentCard
                          payment={payment}
                          property={getPropertyInfo(payment.rentalId)}
                          tenant={getTenantInfo(payment.rentalId)}
                          isPaid={false}
                          viewMode={viewMode}
                          installment={getPaymentInstallment(payment)}
                          expectedAmount={getExpectedAmount(payment)}
                          onCardClick={handleCardClick}
                          getMonthName={getMonthName}
                        />
                      </FloatingCard>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <ScrollReveal delay={0.4}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Recebimentos Pagos</h2>
                    <Badge variant="default" className="bg-green-500 text-sm">
                      {paidPayments.length}
                    </Badge>
                  </div>
                </ScrollReveal>

                {paidPayments.length === 0 ? (
                  <ScrollReveal delay={0.5}>
                    <Card>
                      <CardContent className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum recebimento pago</h3>
                        <p className="text-muted-foreground">
                          Ainda não há recebimentos pagos no período selecionado.
                        </p>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ) : (
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
                    {paidPayments.map((payment, index) => (
                      <FloatingCard key={payment.id} delay={0.1 * (index + 5)}>
                        <PaymentCard
                          payment={payment}
                          property={getPropertyInfo(payment.rentalId)}
                          tenant={getTenantInfo(payment.rentalId)}
                          isPaid={true}
                          viewMode={viewMode}
                          installment={getPaymentInstallment(payment)}
                          expectedAmount={getExpectedAmount(payment)}
                          onCardClick={handleCardClick}
                          onCancelPayment={handleCancelPaymentClick}
                          getMonthName={getMonthName}
                        />
                      </FloatingCard>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            {selectedPaymentId && (
              <div className="p-6">
                <ManagePaymentForm
                  paymentId={selectedPaymentId}
                  onClose={handleCloseDialog}
                  onSuccess={handleCloseDialog}
                  embedded={true}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}