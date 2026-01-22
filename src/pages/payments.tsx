import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Home, User, AlertCircle, CheckCircle, X, LayoutGrid, List } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { 
  getAll as getAllPayments, 
  remove as deletePayment, 
  update as updatePayment 
} from "@/services/paymentService";
import { getAll as getAllRentals } from "@/services/rentalService";
import { propertyService, tenantService } from "@/services";
import { formatCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import ManagePaymentContent from "@/pages/payments/manage/[id]";
import { useAuth } from "@/contexts/AuthContext";

export default function Payments() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { user } = useAuth();

  // Filter state - Initialize with current month/year
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    "2026"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [paymentsData, rentalsData, propertiesData, tenantsData] = await Promise.all([
        getAllPayments(),
        getAllRentals(),
        propertyService.getAll(),
        tenantService.getAll()
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
    loadPayments();
  };

  const handleCancelPayment = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja cancelar este pagamento? O recebimento voltará ao estado pendente.")) {
      return;
    }

    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const updatedPayment: Payment = {
        ...payment,
        status: "pending",
        paidAmount: 0,
        paymentDate: null,
        paymentMethod: null,
        paymentLocation: null,
        paymentCode: null,
        notes: null,
      };

      await updatePayment(payment.id, updatedPayment);
      
      toast({
        title: "Sucesso",
        description: "Pagamento cancelado com sucesso!",
      });

      loadPayments();
    } catch (error) {
      console.error("Error canceling payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pagamento?")) return;

    try {
      await deletePayment(id);
      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso."
      });
      loadPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pagamento.",
        variant: "destructive",
      });
    }
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

  const getDueDateColor = (dueDate: string): { border: string; icon: string; amount: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate + "T00:00:00");
    due.setHours(0, 0, 0, 0);
    
    if (due < today) {
      return { 
        border: "border-l-red-500", 
        icon: "text-red-600", 
        amount: "text-red-600" 
      };
    } else if (due.getTime() === today.getTime()) {
      return { 
        border: "border-l-yellow-500", 
        icon: "text-yellow-600", 
        amount: "text-yellow-600" 
      };
    } else {
      return { 
        border: "border-l-blue-500", 
        icon: "text-blue-600", 
        amount: "text-blue-600" 
      };
    }
  };

  const getFilteredPayments = () => {
    let filtered = [...payments];

    // Filtrar por mês e ano baseado na DATA DE VENCIMENTO (dueDate)
    if (selectedMonth !== "all" && selectedYear !== "all") {
      filtered = filtered.filter((payment) => {
        if (!payment.dueDate) return false;
        
        // CORREÇÃO: Usar dueDate para o filtro, ignorando referenceMonth/Year se necessário para visualização temporal
        // A lógica do usuário pede que o filtro respeite o vencimento
        const dueDateObj = new Date(payment.dueDate + "T00:00:00"); // Garantir fuso
        const dueMonth = dueDateObj.getMonth() + 1;
        const dueYear = dueDateObj.getFullYear();
        
        return (
          dueMonth === parseInt(selectedMonth) &&
          dueYear === parseInt(selectedYear)
        );
      });
    } else if (selectedMonth !== "all") {
       // Filtro só por mês...
       filtered = filtered.filter((payment) => {
          if (!payment.dueDate) return false;
          const dueMonth = new Date(payment.dueDate + "T00:00:00").getMonth() + 1;
          return dueMonth === parseInt(selectedMonth);
       });
    } else if (selectedYear !== "all") {
       // Filtro só por ano...
       filtered = filtered.filter((payment) => {
          if (!payment.dueDate) return false;
          const dueYear = new Date(payment.dueDate + "T00:00:00").getFullYear();
          return dueYear === parseInt(selectedYear);
       });
    }

    // Filtrar por status
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

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all";

  const getExpectedAmount = (payment: Payment): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    // Só cobrar juros e multa se estiver atrasado (vencimento já passou)
    if (dueDate >= today) {
      return payment.expectedAmount;
    }
    
    const totalWithFees = payment.expectedAmount + (payment.lateFee || 0) + (payment.interest || 0);
    return totalWithFees;
  };

  const getPaymentInstallment = (payment: Payment): string => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return "";
    
    // Calcular número de meses entre início do contrato e vencimento do pagamento
    const startDate = new Date(rental.startDate);
    const dueDate = new Date(payment.dueDate);
    
    const monthsDiff = (dueDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (dueDate.getMonth() - startDate.getMonth()) + 1;
    
    // Total de meses do contrato
    const totalMonths = rental.durationMonths || 0;
    
    return `${monthsDiff}/${totalMonths}`;
  };

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
              
              <div className="flex gap-2 items-center">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Todos os anos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    {unpaidPayments.map((payment, index) => {
                      const property = getPropertyInfo(payment.rentalId);
                      const tenant = getTenantInfo(payment.rentalId);
                      const colors = getDueDateColor(payment.dueDate);

                      if (viewMode === "grid") {
                        return (
                          <FloatingCard key={payment.id} delay={0.1 * (index + 3)}>
                            <Card
                              className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${colors.border}`}
                              onClick={() => handleCardClick(payment.id)}
                            >
                              <CardHeader className="pb-2 p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <span className={`font-medium text-sm ${colors.icon}`}>
                                        {property?.location || "Imóvel não encontrado"}
                                      </span>
                                      {property?.complement && (
                                        <p className="text-xs text-muted-foreground">
                                          {property.complement}
                                        </p>
                                      )}
                                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                                        {getPaymentInstallment(payment)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-muted-foreground">
                                      {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                    </span>
                                    {getStatusBadge(payment.status)}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2 p-3 pt-0">
                                <div className="flex items-start gap-1.5">
                                  <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium">{tenant?.name || "N/A"}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {tenant?.document || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs">
                                    Vencimento: {new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>

                                <div className="pt-2 border-t">
                                  <p className="text-[10px] text-muted-foreground mb-1">Valor Esperado</p>
                                  <p className={`text-lg font-bold ${colors.amount}`}>
                                    {formatCurrency(getExpectedAmount(payment))}
                                  </p>
                                </div>

                                {payment.paidAmount > 0 && (
                                  <div className="pt-1 border-t">
                                    <p className="text-[10px] text-muted-foreground mb-1">Valor Pago</p>
                                    <p className="text-base font-semibold text-yellow-600">
                                      {formatCurrency(payment.paidAmount)}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </FloatingCard>
                        );
                      } else {
                        return (
                          <FloatingCard key={payment.id} delay={0.05 * (index + 3)}>
                            <Card
                              className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${colors.border}`}
                              onClick={() => handleCardClick(payment.id)}
                            >
                              <CardContent className="py-2 px-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Home className={`h-5 w-5 ${colors.icon} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-muted-foreground">
                                          {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                        </span>
                                        {getStatusBadge(payment.status)}
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {getPaymentInstallment(payment)}
                                        </span>
                                      </div>
                                      <h3 className={`text-sm font-semibold truncate ${colors.icon}`}>
                                        {property?.location || "N/A"}
                                      </h3>
                                      {property?.complement && (
                                        <p className="text-xs text-muted-foreground truncate">{property.complement}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Inquilino</p>
                                      <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Vencimento</p>
                                      <p className="text-sm">
                                        {new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                    
                                    <div className="text-right min-w-[100px]">
                                      <p className="text-xs text-muted-foreground">Valor Esperado</p>
                                      <p className={`text-base font-bold ${colors.amount}`}>
                                        {formatCurrency(getExpectedAmount(payment))}
                                      </p>
                                      {payment.paidAmount > 0 && (
                                        <p className="text-xs text-yellow-600 font-semibold">
                                          Pago: {formatCurrency(payment.paidAmount)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </FloatingCard>
                        );
                      }
                    })}
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
                    {paidPayments.map((payment, index) => {
                      const property = getPropertyInfo(payment.rentalId);
                      const tenant = getTenantInfo(payment.rentalId);

                      if (viewMode === "grid") {
                        return (
                          <FloatingCard key={payment.id} delay={0.1 * (index + 5)}>
                            <Card
                              className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500"
                              onClick={() => handleCardClick(payment.id)}
                            >
                              <CardHeader className="pb-2 p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <span className="font-medium text-sm">
                                        {property?.location || "Imóvel não encontrado"}
                                      </span>
                                      {property?.complement && (
                                        <p className="text-xs text-muted-foreground">
                                          {property.complement}
                                        </p>
                                      )}
                                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                                        {getPaymentInstallment(payment)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-muted-foreground">
                                      {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                    </span>
                                    {getStatusBadge(payment.status)}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2 p-3 pt-0">
                                <div className="flex items-start gap-1.5">
                                  <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium">{tenant?.name || "N/A"}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {tenant?.document || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-xs">
                                    Pago em: {payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A"}
                                  </p>
                                </div>

                                <div className="pt-2 border-t">
                                  <p className="text-[10px] text-muted-foreground mb-1">Valor Pago</p>
                                  <p className="text-xl font-bold text-green-600">
                                    {formatCurrency(payment.paidAmount)}
                                  </p>
                                </div>

                                {payment.paymentMethod && (
                                  <div className="flex items-center gap-1.5">
                                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-xs capitalize">{payment.paymentMethod}</p>
                                  </div>
                                )}

                                <div className="pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                                    onClick={(e) => handleCancelPayment(payment.id, e)}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancelar Pagamento
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </FloatingCard>
                        );
                      } else {
                        return (
                          <FloatingCard key={payment.id} delay={0.05 * (index + 5)}>
                            <Card
                              className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500"
                              onClick={() => handleCardClick(payment.id)}
                            >
                              <CardContent className="py-2 px-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Home className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-muted-foreground">
                                          {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                                        </span>
                                        {getStatusBadge(payment.status)}
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {getPaymentInstallment(payment)}
                                        </span>
                                      </div>
                                      <h3 className="text-sm font-semibold truncate">
                                        {property?.location || "N/A"}
                                      </h3>
                                      {property?.complement && (
                                        <p className="text-xs text-muted-foreground truncate">{property.complement}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Inquilino</p>
                                      <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Pago em</p>
                                      <p className="text-sm">
                                        {payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A"}
                                      </p>
                                      {payment.paymentMethod && (
                                        <p className="text-xs text-muted-foreground capitalize">{payment.paymentMethod}</p>
                                      )}
                                    </div>
                                    
                                    <div className="text-right min-w-[100px]">
                                      <p className="text-xs text-muted-foreground">Valor Pago</p>
                                      <p className="text-base font-bold text-green-600">
                                        {formatCurrency(payment.paidAmount)}
                                      </p>
                                    </div>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                                      onClick={(e) => handleCancelPayment(payment.id, e)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </FloatingCard>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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