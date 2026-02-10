import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, LayoutGrid, List, Eye, XCircle } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import type { Payment, Rental, Property, Tenant } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { useEffect } from "react";

export default function Payments() {
  const router = useRouter();
  const { toast } = useToast();
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
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null);

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  } | null>(null);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Recarregar pagamentos quando os filtros de mês/ano mudarem
  useEffect(() => {
    console.log("🔄 Filtros mudaram, recarregando pagamentos...", { selectedMonth, selectedYear });
    loadPayments(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleCardClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    console.log("🚪 Fechando dialog de gerenciamento");
    setIsDialogOpen(false);
    setSelectedPaymentId(null);
    loadPayments(selectedMonth, selectedYear);
  };

  const handlePaymentSuccess = (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => {
    console.log("🎯 handlePaymentSuccess CHAMADO! Dados recebidos:", data);
    
    setIsDialogOpen(false);
    setSelectedPaymentId(null);
    
    console.log("📋 Setando dados do recibo...");
    setReceiptData(data);
    setShowReceipt(true);
    
    console.log("✅ Estados setados! Recibo deve abrir agora!");
  };

  const handleCloseReceipt = () => {
    console.log("🚪 Fechando recibo");
    setShowReceipt(false);
    setReceiptData(null);
    loadPayments(selectedMonth, selectedYear);
  };

  const handleViewReceipt = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            *,
            properties!inner (
              *,
              locations!inner (*)
            ),
            tenants!inner (*)
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      const rental = paymentData.rentals;
      const property = rental.properties;
      const location = property.locations;
      const tenant = rental.tenants;

      const amount = paymentData.paid_amount || paymentData.expected_amount; // Definir amount
      const dueDate = paymentData.due_date; // Definir dueDate

      const paymentForReceipt: Payment = {
        id: paymentData.id,
        rentalId: paymentData.rental_id,
        dueDate: paymentData.due_date,
        expectedAmount: paymentData.expected_amount,
        paidAmount: paymentData.paid_amount,
        paymentDate: paymentData.payment_date,
        status: paymentData.status as "paid" | "pending" | "overdue" | "partial",
        paymentMethod: paymentData.payment_method,
        notes: paymentData.notes,
        referenceMonth: parseInt(paymentData.reference_month),
        referenceYear: parseInt(paymentData.reference_year),
        attachments: (paymentData.attachments as unknown as string[]) || [],
        lateFee: paymentData.late_fee || 0,
        interest: paymentData.interest || 0,
      };

      const rentalForReceipt: Rental = {
        id: rental.id,
        propertyId: rental.property_id,
        tenantId: rental.tenant_id,
        startDate: "",
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        paymentDay: parseInt(dueDate.split("-")[2] || "1"),
        value: amount,
        depositAmount: 0,
        status: "active",
        isActive: true,
        attachments: [],
        contractAttachments: [],
        autoRenew: false
      };

      const propertyForReceipt: Property = {
        id: property.id,
        locationId: property.location_id,
        location: location?.name || "",
        address: location?.street || "",
        number: location?.number || "",
        complement: property.complement || "",
        neighborhood: location?.neighborhood || "",
        city: location?.city || "",
        state: location?.state || "",
        zipCode: location?.zip_code || "",
        rooms: property.rooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        status: (property.status as "available" | "occupied" | "unavailable") || "available",
        value: property.value,
      };

      const tenantForReceipt: Tenant = {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email || "",
        phone: tenant.phone || "",
        documentType: (tenant.document_type as "cnpj" | "cpf") || "cpf",
        document: tenant.document || "",
        cpf: tenant.cpf || "",
        rg: tenant.rg || "",
        status: (tenant.status as "active" | "inactive" | "rented") || "active",
      };

      setReceiptData({
        payment: paymentForReceipt,
        rental: rentalForReceipt,
        property: propertyForReceipt,
        tenant: tenantForReceipt,
      });
      setShowReceipt(true);
    } catch (error) {
      console.error("Erro ao carregar dados do recibo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o recibo.",
        variant: "destructive",
      });
    }
  };

  const handleCancelPaymentClick = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setPaymentToCancel(payment);
    }
  };

  const handleConfirmCancelPayment = async () => {
    if (!paymentToCancel) return;
    
    try {
      await handleCancelPayment(paymentToCancel.id);
      setPaymentToCancel(null);
    } catch (error) {
      console.error("Error canceling payment:", error);
      setPaymentToCancel(null);
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all";

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Pago", variant: "default" as const, className: "bg-green-500" },
      pending: { label: "Pendente", variant: "secondary" as const, className: "" },
      overdue: { label: "Atrasado", variant: "destructive" as const, className: "" },
      partial: { label: "Parcial", variant: "outline" as const, className: "" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  };

  const getPaymentRowClassName = (payment: Payment) => {
    const baseClasses = "cursor-pointer hover:bg-muted/50 transition-colors";
    if (payment.status === "paid") {
      return `${baseClasses} bg-green-50 dark:bg-green-950/20`;
    }
    if (payment.status === "overdue") {
      return `${baseClasses} bg-red-50 dark:bg-red-950/20`;
    }
    if (payment.status === "partial") {
      return `${baseClasses} bg-yellow-50 dark:bg-yellow-950/20`;
    }
    return `${baseClasses} bg-white dark:bg-gray-950`;
  };

  // Filtro simples apenas por status (mês/ano já vem do banco)
  const filteredPayments = useMemo(() => {
    console.log("🔍 Aplicando filtro de status:", { statusFilter, totalPayments: payments.length });
    
    let filtered = [...payments];

    // Filtrar apenas por status (mês/ano já foram filtrados no banco)
    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }

    console.log("📊 RESULTADO DO FILTRO:", {
      totalFiltrados: filtered.length,
      pendentes: filtered.filter(p => p.status === "pending" || p.status === "partial" || p.status === "overdue").length,
      pagos: filtered.filter(p => p.status === "paid").length
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [payments, statusFilter]);

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
                      {payments.filter(
                        (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
                      ).length}
                    </Badge>
                  </div>
                </ScrollReveal>

                {payments.filter(
                  (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
                ).length === 0 ? (
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
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {payments
                      .filter(
                        (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
                      )
                      .map((payment, index) => (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 3)}>
                          <PaymentCard
                            payment={payment}
                            property={getPropertyInfo(payment.rentalId)}
                            tenant={getTenantInfo(payment.rentalId)}
                            isPaid={false}
                            viewMode={viewMode}
                            installment={getPaymentInstallment(payment)}
                            expectedAmount={payment.expectedAmount}
                            onCardClick={handleCardClick}
                            onViewReceipt={handleViewReceipt}
                            getMonthName={getMonthName}
                          />
                        </FloatingCard>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor Esperado</TableHead>
                          <TableHead>Valor Pago</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments
                          .filter(
                            (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
                          )
                          .map((payment) => {
                            const property = getPropertyInfo(payment.rentalId);
                            const tenant = getTenantInfo(payment.rentalId);
                            return (
                              <TableRow
                                key={payment.id}
                                className={getPaymentRowClassName(payment)}
                                onClick={() => handleCardClick(payment.id)}
                              >
                                <TableCell className="font-medium">
                                  {property ? `${property.location} - ${property.complement}` : "-"}
                                </TableCell>
                                <TableCell>{tenant?.name || "-"}</TableCell>
                                <TableCell>{formatDate(payment.dueDate)}</TableCell>
                                <TableCell>{formatCurrency(payment.expectedAmount)}</TableCell>
                                <TableCell>{payment.paidAmount ? formatCurrency(payment.paidAmount) : "-"}</TableCell>
                                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCardClick(payment.id);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <ScrollReveal delay={0.4}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Recebimentos Pagos</h2>
                    <Badge variant="default" className="bg-green-500 text-sm">
                      {payments.filter((p) => p.status === "paid").length}
                    </Badge>
                  </div>
                </ScrollReveal>

                {payments.filter((p) => p.status === "paid").length === 0 ? (
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
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {payments
                      .filter((p) => p.status === "paid")
                      .map((payment, index) => (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 5)}>
                          <PaymentCard
                            payment={payment}
                            property={getPropertyInfo(payment.rentalId)}
                            tenant={getTenantInfo(payment.rentalId)}
                            isPaid={true}
                            viewMode={viewMode}
                            installment={getPaymentInstallment(payment)}
                            expectedAmount={payment.expectedAmount}
                            onCardClick={handleCardClick}
                            onCancelPayment={handleCancelPaymentClick}
                            onViewReceipt={handleViewReceipt}
                            getMonthName={getMonthName}
                          />
                        </FloatingCard>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor Esperado</TableHead>
                          <TableHead>Valor Pago</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments
                          .filter((p) => p.status === "paid")
                          .map((payment) => {
                            const property = getPropertyInfo(payment.rentalId);
                            const tenant = getTenantInfo(payment.rentalId);
                            return (
                              <TableRow
                                key={payment.id}
                                className={getPaymentRowClassName(payment)}
                                onClick={() => handleCardClick(payment.id)}
                              >
                                <TableCell className="font-medium">
                                  {property ? `${property.location} - ${property.complement}` : "-"}
                                </TableCell>
                                <TableCell>{tenant?.name || "-"}</TableCell>
                                <TableCell>{formatDate(payment.dueDate)}</TableCell>
                                <TableCell>{formatCurrency(payment.expectedAmount)}</TableCell>
                                <TableCell>{formatCurrency(payment.paidAmount || 0)}</TableCell>
                                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleViewReceipt(payment.id, e)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleCancelPaymentClick(payment.id, e)}
                                    >
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
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
                  onSuccess={handlePaymentSuccess}
                  embedded={true}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showReceipt && receiptData && (
          <PaymentReceipt
            payment={receiptData.payment}
            rental={receiptData.rental}
            property={receiptData.property}
            tenant={receiptData.tenant}
            onClose={handleCloseReceipt}
          />
        )}

        <AlertDialog open={!!paymentToCancel} onOpenChange={(open) => !open && setPaymentToCancel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar este pagamento? O recebimento voltará ao estado pendente e esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button
                onClick={async (e) => {
                  (e.target as HTMLButtonElement).blur();
                  await handleConfirmCancelPayment();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, Cancelar Pagamento
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}