import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { FinancialMetricCard } from "@/components/dashboard/FinancialMetricCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download } from "lucide-react";
import { DepositInstallmentsTable } from "@/components/financial/DepositInstallmentsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

type SortField = "paymentNumber" | "local" | "complement" | "status" | "dueDate" | "paymentDate" | "expectedAmount" | "paidAmount";
type SortDirection = "asc" | "desc" | null;

export default function Financial() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "broker";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Date State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [locationExpenses, setLocationExpenses] = useState<number>(0);

  // PIX Code editing state
  const [editingPixCode, setEditingPixCode] = useState<{ [key: string]: string }>({});
  const [savingPixCode, setSavingPixCode] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Converter selectedMonth para número (1-12)
      const filterMonth = parseInt(selectedMonth);
      const filterYear = parseInt(selectedYear);
      
      console.log("🔄 Financeiro: Carregando dados...", { 
        selectedMonth, 
        selectedYear,
        filterMonth,
        filterYear,
        userRole: user?.role 
      });
      
      const [
        paymentsData, 
        propertiesData, 
        tenantsData,
        rentalsData,
        configData
      ] = await Promise.all([
        getAllPayments(),
        getAllProperties(),
        getAllTenants(),
        getAllRentals(),
        getConfig()
      ]);

      setConfig(configData);

      // Buscar permissões de locais do usuário logado
      let allowedLocations: string[] = [];
      if (user) {
        // Buscar isenções de taxa
        const { data: exemptions } = await supabase
          .from("user_fee_exemptions")
          .select("location_id")
          .eq("user_id", user.id);
        
        const exemptIds = exemptions?.map(e => e.location_id) || [];
        setExemptLocationIds(exemptIds);
        console.log("🎁 Locais com isenção de taxa:", exemptIds);

        // Buscar permissões de local (para usuários financeiros)
        if (user.role === "financial") {
          const { data: permissions } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", user.id);
          
          allowedLocations = permissions?.map(p => p.location_id) || [];
          setAllowedLocationIds(allowedLocations);
          console.log("🔐 Locais permitidos para usuário Financial:", allowedLocations);
        } else {
          // Admin e outros veem tudo
          setAllowedLocationIds([]);
          console.log("👑 Usuário Admin/Broker: acesso a todos os locais");
        }
      }

      // Buscar despesas de locais para o período selecionado
      let expensesQuery = supabase
        .from("location_expenses")
        .select("amount, status, location_id")
        .eq("reference_month", filterMonth)
        .eq("reference_year", filterYear);
      
      // ✅ Filtrar despesas por locais permitidos se for usuário financeiro
      if (user?.role === "financial" && allowedLocations.length > 0) {
        expensesQuery = expensesQuery.in("location_id", allowedLocations);
        console.log("💸 Filtrando despesas por locais permitidos");
      }
      
      const { data: expensesData, error: expensesError } = await expensesQuery;
      
      if (expensesError) {
        console.error("❌ Error fetching location expenses:", expensesError);
      }
      
      const totalExpenses = expensesData
        ? expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;
      
      console.log("💰 Contas a Pagar carregadas:", {
        month: filterMonth,
        year: filterYear,
        userRole: user?.role,
        allowedLocations: allowedLocations.length > 0 ? allowedLocations : "Todos",
        totalExpenses,
        count: expensesData?.length || 0
      });
      
      setLocationExpenses(totalExpenses);

      // Filtrar properties por permissões de local (apenas para usuários financeiros)
      let filteredProperties = propertiesData;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredProperties = propertiesData.filter(p => 
          allowedLocations.includes(p.locationId)
        );
        console.log(`🏢 Properties filtrados: ${filteredProperties.length} de ${propertiesData.length}`);
      }

      // Filtrar rentals que usam properties permitidas
      const allowedPropertyIds = filteredProperties.map(p => p.id);
      let filteredRentals = rentalsData;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredRentals = rentalsData.filter(r => 
          allowedPropertyIds.includes(r.propertyId)
        );
        console.log(`🏠 Rentals filtrados: ${filteredRentals.length} de ${rentalsData.length}`);
      }

      setProperties(filteredProperties);
      setRentals(filteredRentals);
      setTenants(tenantsData);

      // Filtrar pagamentos pelo mês/ano selecionado E por rentals permitidos
      const allowedRentalIds = filteredRentals.map(r => r.id);
      const filteredPayments = paymentsData.filter((payment) => {
        // ✅ Filtro de data: Usa reference_month e reference_year (1-12)
        const matchesDate = 
          payment.referenceMonth === filterMonth &&
          payment.referenceYear === filterYear;
        
        const matchesPermission = 
          user?.role !== "financial" || 
          allowedLocations.length === 0 ||
          allowedRentalIds.includes(payment.rentalId);

        return matchesDate && matchesPermission;
      });
      
      console.log(`💵 Payments filtrados: ${filteredPayments.length} de ${paymentsData.length}`);
      console.log("📋 IDs dos rentals permitidos:", allowedRentalIds);
      console.log("📋 Payments filtrados detalhados:", filteredPayments.map(p => ({
        id: p.id,
        referenceMonth: p.referenceMonth,
        referenceYear: p.referenceYear,
        rentalId: p.rentalId,
        expectedAmount: p.expectedAmount,
        status: p.status
      })));
      console.log("✅ Financeiro: Dados carregados com sucesso");
      
      setPayments(filteredPayments);

    } catch (error) {
      console.error("❌ Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleSavePixCode = async (rentalId: string) => {
    const newPixCode = editingPixCode[rentalId];
    if (newPixCode === undefined) return;

    setSavingPixCode(rentalId);
    try {
      const { error } = await supabase
        .from("rentals")
        .update({ pix_code: newPixCode })
        .eq("id", rentalId);

      if (error) throw error;

      // Update local state
      setRentals(rentals.map(r => r.id === rentalId ? { ...r, pixCode: newPixCode } : r));
      
      // Clear editing state
      const newEditingState = { ...editingPixCode };
      delete newEditingState[rentalId];
      setEditingPixCode(newEditingState);

      toast({
        title: "Sucesso!",
        description: "Código PIX atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Error saving PIX code:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar código PIX",
        variant: "destructive",
      });
    } finally {
      setSavingPixCode(null);
    }
  };

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

  const years = ["2024", "2025", "2026", "2027"];

  // KPI Calculations - usar 'payments' que já está filtrado corretamente
  const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
  
  const totalReceived = payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  console.log("💰 KPI Debug:", {
    paymentsCount: payments.length,
    totalExpected,
    totalReceived,
    payments: payments.map(p => ({
      id: p.id,
      status: p.status,
      expectedAmount: p.expectedAmount,
      paidAmount: p.paidAmount
    }))
  });

  // Calcular taxa adm considerando isenções
  const adminFee = payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => {
      const rental = rentals.find(r => r.id === p.rentalId);
      const property = properties.find(prop => prop.id === rental?.propertyId);
      
      if (property && exemptLocationIds.includes(property.locationId)) {
        return sum;
      }
      
      const feeRate = config ? (config.admin_fee_percentage || 0) / 100 : 0.05;
      return sum + ((p.paidAmount || 0) * feeRate);
    }, 0);
  
  // Totals object for the cards
  const totals = {
    gross: totalReceived,
    expected: totalExpected,
    adminFee: adminFee,
    managementFee: payments.reduce((sum, p) => {
       const rental = rentals.find(r => r.id === p.rentalId);
       const property = properties.find(prop => prop.id === rental?.propertyId);
       if (property && exemptLocationIds.includes(property.locationId)) return sum;
       
       const mgmtRate = config ? (config.management_fee_percentage || 0) / 100 : 0;
       return sum + ((p.paidAmount || 0) * mgmtRate);
    }, 0),
    net: 0 // Will be calculated below
  };
  
  totals.net = totals.gross - totals.adminFee - totals.managementFee;
  const netRevenue = totalReceived - adminFee - totals.managementFee - locationExpenses;

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Pago</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">Pendente</Badge>,
      overdue: <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Atrasado</Badge>,
      partial: <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Parcial</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentDetails = (payment: Payment) => {
    const rental = rentals.find((r) => r.id === payment.rentalId);
    const property = properties.find((p) => p.id === rental?.propertyId);
    const tenant = tenants.find((t) => t.id === rental?.tenantId);

    return {
      local: property?.location || "N/A",
      complemento: property?.complement || "N/A",
      tenantName: tenant?.name || "N/A",
      rental: rental,
      pixCode: rental?.pixCode || "",
    };
  };

  const calculatePaymentNumber = (payment: Payment, rental: Rental | undefined) => {
    if (!rental) return "N/A";
    
    const contractStartDate = new Date(rental.startDate + "T00:00:00");
    const contractEndDate = new Date(rental.endDate + "T00:00:00");
    const totalMonths = differenceInMonths(contractEndDate, contractStartDate) + 1;
    
    const referenceDate = new Date(payment.referenceYear || 0, (payment.referenceMonth || 1) - 1, 1);
    const currentPaymentNumber = differenceInMonths(referenceDate, contractStartDate) + 1;
    
    return `${currentPaymentNumber}/${totalMonths}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted payments
  const getSortedPayments = () => {
    if (!sortField || !sortDirection) return payments;

    return [...payments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "paymentNumber":
          const rentalA = rentals.find(r => r.id === a.rentalId);
          const rentalB = rentals.find(r => r.id === b.rentalId);
          aValue = calculatePaymentNumber(a, rentalA);
          bValue = calculatePaymentNumber(b, rentalB);
          break;
        case "local":
          aValue = getPaymentDetails(a).local;
          bValue = getPaymentDetails(b).local;
          break;
        case "complement":
          aValue = getPaymentDetails(a).complemento;
          bValue = getPaymentDetails(b).complemento;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case "paymentDate":
          aValue = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          bValue = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          break;
        case "expectedAmount":
          aValue = a.expectedAmount;
          bValue = b.expectedAmount;
          break;
        case "paidAmount":
          aValue = a.paidAmount || 0;
          bValue = b.paidAmount || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel function
  const handleExportExcel = () => {
    const sortedPayments = getSortedPayments();
    const monthName = months[parseInt(selectedMonth) - 1].label;

    // Prepare data for Excel
    const excelData = sortedPayments.map(payment => {
      const details = getPaymentDetails(payment);
      const paymentNumber = calculatePaymentNumber(payment, details.rental);
      
      return {
        "Nº": paymentNumber,
        "Local": details.local,
        "Complemento": details.complemento,
        "Inquilino": details.tenantName,
        "Ano": selectedYear,
        "Mês": monthName,
        "Status": payment.status === "paid" ? "Pago" : 
                 payment.status === "pending" ? "Pendente" :
                 payment.status === "overdue" ? "Atrasado" : "Parcial",
        "Data Vencimento": format(new Date(payment.dueDate), "dd/MM/yyyy"),
        "Data Recebida": payment.paymentDate ? format(new Date(payment.paymentDate), "dd/MM/yyyy") : "-",
        "Valor Esperado": payment.expectedAmount,
        "Valor Pago": payment.paidAmount || 0,
        "Código PIX": details.pixCode || "-",
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 8 },  // Nº
      { wch: 20 }, // Local
      { wch: 15 }, // Complemento
      { wch: 15 }, // Inquilino
      { wch: 8 },  // Ano
      { wch: 12 }, // Mês
      { wch: 12 }, // Status
      { wch: 15 }, // Data Vencimento
      { wch: 15 }, // Data Recebida
      { wch: 15 }, // Valor Esperado
      { wch: 15 }, // Valor Pago
      { wch: 20 }, // Código PIX
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${selectedYear}`);

    // Generate file name
    const fileName = `Financeiro_${monthName}_${selectedYear}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Sucesso!",
      description: "Planilha exportada com sucesso.",
    });
  };

  const sortedPayments = getSortedPayments();

  if (!mounted) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-500">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <ScrollReveal>
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe suas receitas, despesas e fluxo de caixa
            </p>
          </div>
        </ScrollReveal>

        <Tabs defaultValue="rentals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="rentals">Detalhamento de Locações</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="deposits">Detalhamento de Cauções</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="rentals" className="space-y-8 mt-8">
            <ScrollReveal delay={0.1}>
              <PeriodSelector
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                filterMonth={filterMonth}
                filterYear={filterYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onFilterMonthChange={setFilterMonth}
                onFilterYearChange={setFilterYear}
              />
            </ScrollReveal>

            {/* Cards de Métricas - Locações */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ScrollReveal delay={0.2}>
                <FinancialMetricCard
                  title="Receita Bruta"
                  value={kpiData.totalRevenue}
                  icon="💰"
                  trend={kpiData.revenueTrend}
                />
              </ScrollReveal>
              <ScrollReveal delay={0.3}>
                <FinancialMetricCard
                  title="Taxa de Administração"
                  value={kpiData.adminFees}
                  icon="🏢"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.4}>
                <FinancialMetricCard
                  title="Taxa de Gerenciamento"
                  value={kpiData.managementFees}
                  icon="⚙️"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.5}>
                <FinancialMetricCard
                  title="Receita Líquida"
                  value={kpiData.netRevenue}
                  icon="🎯"
                  trend={kpiData.revenueTrend}
                />
              </ScrollReveal>
            </div>

            {/* Tabela de Locações */}
            <ScrollReveal delay={0.6}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Detalhamento de Locações
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(
                          new Date(filterYear, filterMonth - 1),
                          "MMMM 'de' yyyy",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Imprimir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado para o período selecionado
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Local</TableHead>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Taxa Admin</TableHead>
                            <TableHead>Taxa Gerenc.</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pago em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {payment.installment_number}/{payment.total_installments}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px]">
                                  <div className="font-medium truncate">
                                    {payment.rentals?.properties?.type || "N/A"}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {payment.rentals?.properties?.complement || ""}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {payment.rentals?.tenants?.full_name || "N/A"}
                              </TableCell>
                              <TableCell>
                                {format(new Date(payment.due_date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(payment.amount)}
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(payment.admin_fee || 0)}
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(payment.management_fee || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    payment.status === "paid"
                                      ? "default"
                                      : payment.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {payment.status === "paid"
                                    ? "Pago"
                                    : payment.status === "pending"
                                    ? "Pendente"
                                    : "Atrasado"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.paid_at
                                  ? format(new Date(payment.paid_at), "dd/MM/yyyy")
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-8">
                        <div>
                          <span className="text-muted-foreground">Total Esperado: </span>
                          <span className="font-semibold">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalExpected)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Pago: </span>
                          <span className="font-semibold text-green-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalPaid)}
                          </span>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {filteredPayments.length} pagamento(s) no período
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="deposits" className="space-y-8 mt-8">
              <DepositInstallmentsTable />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}