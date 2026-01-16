import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Home, User, AlertCircle, CheckCircle } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { paymentService, rentalService, propertyService, tenantService } from "@/services";
import { formatCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import ManagePaymentContent from "@/pages/payments/manage/[id]";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Update overdue payments first
      await paymentService.updateOverdueStatus();
      
      const [paymentsData, rentalsData, propertiesData, tenantsData] = await Promise.all([
        paymentService.getAll(),
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
      ]);

      setPayments(paymentsData);
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPaymentId(null);
    loadData();
  };

  const getPropertyInfo = (rentalId: string) => {
    const rental = rentals.find((r) => r.id === rentalId);
    if (!rental) return null;
    return properties.find((p) => p.id === rental.propertyId);
  };

  const getTenantInfo = (rentalId: string) => {
    const rental = rentals.find((r) => r.id === rentalId);
    if (!rental) return null;
    return tenants.find((t) => t.id === rental.tenantId);
  };

  const getRentalInfo = (rentalId: string) => {
    return rentals.find((r) => r.id === rentalId);
  };

  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Atrasado</Badge>;
      default:
        return <Badge className="bg-gray-500">Pendente</Badge>;
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  // Filter payments: show all payments within contract period by default
  const getFilteredPayments = () => {
    const filtered = payments.filter(payment => {
      const rental = getRentalInfo(payment.rentalId);
      if (!rental) return false;
      
      // Apply month/year filters if selected
      if (selectedMonth || selectedYear) {
        if (selectedMonth && payment.referenceMonth !== parseInt(selectedMonth)) return false;
        if (selectedYear && payment.referenceYear !== parseInt(selectedYear)) return false;
        return true;
      }

      // If no filters, show all payments within contract period (month-based comparison)
      // This ensures we show the full contract schedule including current month
      const paymentMonthIndex = payment.referenceYear * 12 + (payment.referenceMonth - 1);
      
      const startDate = new Date(rental.startDate);
      const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
      
      let endMonthIndex = Infinity;
      if (rental.endDate) {
        const endDate = new Date(rental.endDate);
        endMonthIndex = endDate.getFullYear() * 12 + endDate.getMonth();
      }
      
      return paymentMonthIndex >= startMonthIndex && paymentMonthIndex <= endMonthIndex;
    });
    
    // Sort by due date (oldest first)
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

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const clearFilters = () => {
    setSelectedMonth("");
    setSelectedYear("");
  };

  const hasActiveFilters = selectedMonth || selectedYear;

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
                      ? `${selectedMonth ? getMonthName(parseInt(selectedMonth)) : "Todos os meses"} de ${selectedYear || "todos os anos"}`
                      : "Todos os recebimentos dos contratos ativos"
                    }
                  </p>
                </div>
              </div>
              
              {/* Month/Year Filter Dropdowns */}
              <div className="flex gap-4 items-center flex-wrap">
                <div className="w-full sm:w-48">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os meses</SelectItem>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os anos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os anos</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando recebimentos...</p>
            </div>
          ) : (
            <>
              {/* Unpaid Payments Section */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unpaidPayments.map((payment, index) => {
                      const property = getPropertyInfo(payment.rentalId);
                      const tenant = getTenantInfo(payment.rentalId);

                      return (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 3)}>
                          <Card
                            className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-red-500"
                            onClick={() => handleCardClick(payment.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between mb-2">
                                {getStatusBadge(payment.status)}
                                <span className="text-xs text-muted-foreground">
                                  {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                </span>
                              </div>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="flex flex-col gap-1 flex-1">
                                  <span className="flex items-center gap-2">
                                    <Home className="h-5 w-5 text-red-600" />
                                    {property?.location || "N/A"}
                                  </span>
                                  {property?.complement && (
                                    <span className="text-sm font-normal text-muted-foreground ml-7">
                                      {property.complement}
                                    </span>
                                  )}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                  <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {tenant?.document || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">
                                  Vencimento: {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                                </p>
                              </div>

                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Valor Esperado</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {formatCurrency(payment.expectedAmount)}
                                </p>
                              </div>

                              {payment.paidAmount > 0 && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">Valor Pago</p>
                                  <p className="text-lg font-semibold text-yellow-600">
                                    {formatCurrency(payment.paidAmount)}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </FloatingCard>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paid Payments Section */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paidPayments.map((payment, index) => {
                      const property = getPropertyInfo(payment.rentalId);
                      const tenant = getTenantInfo(payment.rentalId);

                      return (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 5)}>
                          <Card
                            className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500"
                            onClick={() => handleCardClick(payment.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between mb-2">
                                {getStatusBadge(payment.status)}
                                <span className="text-xs text-muted-foreground">
                                  {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                </span>
                              </div>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="flex flex-col gap-1 flex-1">
                                  <span className="flex items-center gap-2">
                                    <Home className="h-5 w-5 text-green-600" />
                                    {property?.location || "N/A"}
                                  </span>
                                  {property?.complement && (
                                    <span className="text-sm font-normal text-muted-foreground ml-7">
                                      {property.complement}
                                    </span>
                                  )}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                  <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {tenant?.document || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">
                                  Pago em: {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("pt-BR") : "N/A"}
                                </p>
                              </div>

                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Valor Pago</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {formatCurrency(payment.paidAmount)}
                                </p>
                              </div>

                              {payment.paymentMethod && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm capitalize">{payment.paymentMethod}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </FloatingCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Payment Management Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            {selectedPaymentId && (
              <ManagePaymentContent
                paymentId={selectedPaymentId}
                onClose={handleCloseDialog}
                embedded={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}