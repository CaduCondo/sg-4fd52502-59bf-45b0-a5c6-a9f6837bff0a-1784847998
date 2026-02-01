import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { FinancialMetricCard } from "@/components/dashboard/FinancialMetricCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
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
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  DollarSign,
  Building,
  Settings,
  Target
} from "lucide-react";
import { DepositInstallmentsTable } from "@/components/financial/DepositInstallmentsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

// Importações diretas dos serviços para evitar erros de exportação
import { getAll as getAllPayments } from "@/services/paymentService";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllRentals } from "@/services/rentalService";
import { getConfig } from "@/services/configService";
import { Payment, Property, Rental, Tenant } from "@/types";

type SortField = "paymentNumber" | "local" | "complement" | "status" | "dueDate" | "paymentDate" | "expectedAmount" | "paidAmount";
type SortDirection = "asc" | "desc" | null;

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "broker";
  
  // Data fetching state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Date State - Tipagem corrigida para number para compatibilidade com PeriodSelector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [locationExpenses, setLocationExpenses] = useState<number>(0);

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
  }, [user, filterMonth, filterYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log("🔄 Financeiro: Carregando dados...", { 
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

        // Buscar permissões de local (para usuários financeiros)
        if (user.role === "financial") {
          const { data: permissions } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", user.id);
          
          allowedLocations = permissions?.map(p => p.location_id) || [];
          setAllowedLocationIds(allowedLocations);
        } else {
          setAllowedLocationIds([]);
        }
      }

      // Buscar despesas de locais para o período selecionado
      let expensesQuery = supabase
        .from("location_expenses")
        .select("amount, status, location_id")
        .eq("reference_month", filterMonth)
        .eq("reference_year", filterYear);
      
      if (user?.role === "financial" && allowedLocations.length > 0) {
        expensesQuery = expensesQuery.in("location_id", allowedLocations);
      }
      
      const { data: expensesData, error: expensesError } = await expensesQuery;
      
      if (expensesError) {
        console.error("❌ Error fetching location expenses:", expensesError);
      }
      
      const totalExpenses = expensesData
        ? expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;
      
      setLocationExpenses(totalExpenses);

      // Filtrar properties e rentals por permissões
      let filteredProperties = propertiesData;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredProperties = propertiesData.filter(p => 
          allowedLocations.includes(p.locationId)
        );
      }

      const allowedPropertyIds = filteredProperties.map(p => p.id);
      let filteredRentals = rentalsData;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredRentals = rentalsData.filter(r => 
          allowedPropertyIds.includes(r.propertyId)
        );
      }

      setProperties(filteredProperties);
      setRentals(filteredRentals);
      setTenants(tenantsData);

      // Filtrar pagamentos
      const allowedRentalIds = filteredRentals.map(r => r.id);
      const filteredPaymentsData = paymentsData.filter((payment) => {
        const matchesDate = 
          payment.referenceMonth === filterMonth &&
          payment.referenceYear === filterYear;
        
        const matchesPermission = 
          user?.role !== "financial" || 
          allowedLocations.length === 0 ||
          allowedRentalIds.includes(payment.rentalId);

        return matchesDate && matchesPermission;
      });
      
      setPayments(filteredPaymentsData);

    } catch (error) {
      console.error("❌ Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const sortedPayments = getSortedPayments();
    const monthName = format(new Date(filterYear, filterMonth - 1), "MMMM", { locale: ptBR });

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

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    ws["!cols"] = [
      { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, 
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${selectedYear}`);
    XLSX.writeFile(wb, `Financeiro_${monthName}_${selectedYear}.xlsx`);

    toast({
      title: "Sucesso!",
      description: "Planilha exportada com sucesso.",
    });
  };

  // KPI Calculations
  const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalReceived = payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  
  const adminFee = payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => {
      const rental = rentals.find(r => r.id === p.rentalId);
      const property = properties.find(prop => prop.id === rental?.propertyId);
      
      if (property && exemptLocationIds.includes(property.locationId)) return sum;
      
      const feeRate = config ? (config.admin_fee_percentage || 0) / 100 : 0.05;
      return sum + ((p.paidAmount || 0) * feeRate);
    }, 0);
    
  const managementFee = payments.reduce((sum, p) => {
       const rental = rentals.find(r => r.id === p.rentalId);
       const property = properties.find(prop => prop.id === rental?.propertyId);
       if (property && exemptLocationIds.includes(property.locationId)) return sum;
       
       const mgmtRate = config ? (config.management_fee_percentage || 0) / 100 : 0;
       return sum + ((p.paidAmount || 0) * mgmtRate);
  }, 0);

  const netRevenue = totalReceived - adminFee - managementFee - locationExpenses;
  
  const totalPaid = payments
    .filter(p => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  const filteredPayments = getSortedPayments();

  if (!mounted) return null;

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
                  value={totalReceived}
                  icon={DollarSign}
                  iconColor="text-green-600"
                  iconBgClass="bg-green-100"
                  borderColorClass="border-l-green-600"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.3}>
                <FinancialMetricCard
                  title="Taxa de Administração"
                  value={adminFee}
                  icon={Building}
                  iconColor="text-blue-600"
                  iconBgClass="bg-blue-100"
                  borderColorClass="border-l-blue-600"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.4}>
                <FinancialMetricCard
                  title="Taxa de Gerenciamento"
                  value={managementFee}
                  icon={Settings}
                  iconColor="text-purple-600"
                  iconBgClass="bg-purple-100"
                  borderColorClass="border-l-purple-600"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.5}>
                <FinancialMetricCard
                  title="Receita Líquida"
                  value={netRevenue}
                  icon={Target}
                  iconColor="text-indigo-600"
                  iconBgClass="bg-indigo-100"
                  borderColorClass="border-l-indigo-600"
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
                            <TableHead className="cursor-pointer" onClick={() => handleSort("paymentNumber")}>
                              Parcela <SortIcon field="paymentNumber" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("local")}>
                              Local <SortIcon field="local" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("complement")}>
                              Inquilino <SortIcon field="complement" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("dueDate")}>
                              Vencimento <SortIcon field="dueDate" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("expectedAmount")}>
                              Valor <SortIcon field="expectedAmount" />
                            </TableHead>
                            <TableHead>Taxa Admin</TableHead>
                            <TableHead>Taxa Gerenc.</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                              Status <SortIcon field="status" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("paymentDate")}>
                              Pago em <SortIcon field="paymentDate" />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => {
                            const details = getPaymentDetails(payment);
                            const feeRate = config ? (config.admin_fee_percentage || 0) / 100 : 0.05;
                            const mgmtRate = config ? (config.management_fee_percentage || 0) / 100 : 0;
                            const property = properties.find(p => p.id === details.rental?.propertyId);
                            const isExempt = property && exemptLocationIds.includes(property.locationId);
                            
                            const paymentAdminFee = isExempt ? 0 : (payment.paidAmount || 0) * feeRate;
                            const paymentMgmtFee = isExempt ? 0 : (payment.paidAmount || 0) * mgmtRate;

                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {calculatePaymentNumber(payment, details.rental)}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-[200px]">
                                    <div className="font-medium truncate">
                                      {details.local}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                      {details.complemento}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {details.tenantName}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(payment.dueDate), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(payment.expectedAmount)}
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(paymentAdminFee)}
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(paymentMgmtFee)}
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
                                  {payment.paymentDate
                                    ? format(new Date(payment.paymentDate), "dd/MM/yyyy")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
              <DepositInstallmentsTable 
                userRole={user?.role || "user"}
                allowedLocationIds={allowedLocationIds}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}