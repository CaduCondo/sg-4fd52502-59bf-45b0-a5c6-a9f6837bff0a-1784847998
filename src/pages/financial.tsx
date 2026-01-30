import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  DollarSign, 
  HeartHandshake, 
  Target, 
  FileText, 
  Save,
  QrCode,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Percent,
  Wallet
} from "lucide-react";
import { Payment, Property, Rental, Tenant, User } from "@/types";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAll as getAllPayments } from "@/services/paymentService";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllRentals, update as updateRental } from "@/services/rentalService";
import { getUserLocationPermissions } from "@/services/userLocationPermissionService";
import { userStorage } from "@/lib/storage";
import { locationExpenseService } from "@/services/locationExpenseService";
import { hasPermission } from "@/lib/permissions";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getConfig } from "@/services/configService";
import { supabase } from "@/integrations/supabase/client";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { DepositInstallmentsTable } from "@/components/financial/DepositInstallmentsTable";
import * as XLSX from "xlsx";

type SortField = "paymentNumber" | "local" | "complement" | "status" | "dueDate" | "paymentDate" | "expectedAmount" | "paidAmount";
type SortDirection = "asc" | "desc" | null;

export default function Financial() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);

  // Date State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [locationExpenses, setLocationExpenses] = useState<number>(0);

  // PIX Code editing state
  const [editingPixCode, setEditingPixCode] = useState<{ [key: string]: string }>({});
  const [savingPixCode, setSavingPixCode] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
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

      // Buscar despesas de locais para o período selecionado
      const { data: expensesData, error: expensesError } = await supabase
        .from("location_expenses")
        .select("amount, status")
        .eq("reference_month", parseInt(selectedMonth) + 1)
        .eq("reference_year", parseInt(selectedYear));
      
      if (expensesError) {
        console.error("Error fetching location expenses:", expensesError);
      }
      
      const totalExpenses = expensesData
        ? expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;
      
      console.log("💰 Contas a Pagar carregadas:", {
        month: parseInt(selectedMonth) + 1,
        year: parseInt(selectedYear),
        totalExpenses,
        count: expensesData?.length || 0
      });
      
      setLocationExpenses(totalExpenses);

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
          // Admin e outros veem tudo
          setAllowedLocationIds([]);
        }
      }

      // Filtrar properties por permissões de local (apenas para usuários financeiros)
      let filteredProperties = propertiesData;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredProperties = propertiesData.filter(p => 
          allowedLocations.includes(p.locationId)
        );
      }

      // Filtrar rentals que usam properties permitidas
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

      // Filtrar pagamentos pelo mês/ano selecionado E por rentals permitidos
      const allowedRentalIds = filteredRentals.map(r => r.id);
      const filteredPayments = paymentsData.filter((payment) => {
        const dueDate = new Date(payment.dueDate);
        const matchesDate = 
          dueDate.getMonth() === parseInt(selectedMonth) &&
          dueDate.getFullYear() === parseInt(selectedYear);
        
        const matchesPermission = 
          user?.role !== "financial" || 
          allowedLocations.length === 0 ||
          allowedRentalIds.includes(payment.rentalId);

        return matchesDate && matchesPermission;
      });
      
      setPayments(filteredPayments);

    } catch (error) {
      console.error("Error loading financial data:", error);
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
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  const years = ["2024", "2025", "2026", "2027"];

  // Filter logic
  const filteredPayments = payments.filter((payment) => {
    const dueDate = new Date(payment.dueDate);
    return (
      dueDate.getMonth() === parseInt(selectedMonth) &&
      dueDate.getFullYear() === parseInt(selectedYear)
    );
  });

  // KPI Calculations
  const totalExpected = filteredPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
  
  const totalReceived = filteredPayments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  // Calcular taxa adm considerando isenções
  const adminFee = filteredPayments
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
    managementFee: filteredPayments.reduce((sum, p) => {
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
    if (!sortField || !sortDirection) return filteredPayments;

    return [...filteredPayments].sort((a, b) => {
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
    const monthName = months[parseInt(selectedMonth)].label;

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Title */}
        <ScrollReveal>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium text-slate-500">
              {months[parseInt(selectedMonth)].label} de {selectedYear}
            </h1>
          </div>
        </ScrollReveal>

        {/* Filters Card */}
        <ScrollReveal delay={0.1}>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex gap-4">
              <div className="w-[200px]">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Receita Bruta</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.gross)}</div>
              <p className="text-xs text-green-600">
                Total recebido no período
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Taxa de Administração</CardTitle>
              <Percent className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {totals.adminFee > 0 ? `- ${formatCurrency(totals.adminFee)}` : formatCurrency(0)}
              </div>
              <p className="text-xs text-red-600">
                {config?.admin_fee_percentage || 0}% sobre a receita bruta
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Taxa de Gerenciamento</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {totals.managementFee > 0 ? `- ${formatCurrency(totals.managementFee)}` : formatCurrency(0)}
              </div>
              <p className="text-xs text-blue-600">
                {config?.management_fee_percentage || 0}% sobre a receita bruta
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Contas do Mês</CardTitle>
              <Wallet className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {locationExpenses > 0 ? `- ${formatCurrency(locationExpenses)}` : formatCurrency(0)}
              </div>
              <p className="text-xs text-orange-600">
                Água, luz e outras despesas dos locais
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Receita Líquida</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {formatCurrency(netRevenue)}
              </div>
              <p className="text-xs text-purple-600">
                Valor após subtração das taxas e contas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <ScrollReveal delay={0.6}>
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-white pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <CardTitle className="text-base font-medium text-slate-700">
                    Detalhamento de Locações - {months[parseInt(selectedMonth)].label} {selectedYear}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead 
                      className="w-[80px] text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("paymentNumber")}
                    >
                      <div className="flex items-center">
                        Parcela
                        <SortIcon field="paymentNumber" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[150px] text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("local")}
                    >
                      <div className="flex items-center">
                        Local
                        <SortIcon field="local" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("complement")}
                    >
                      <div className="flex items-center">
                        Complemento
                        <SortIcon field="complement" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inquilino</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ano</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mês</TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("dueDate")}
                    >
                      <div className="flex items-center">
                        Data Vencimento
                        <SortIcon field="dueDate" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("paymentDate")}
                    >
                      <div className="flex items-center">
                        Data Recebida
                        <SortIcon field="paymentDate" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("expectedAmount")}
                    >
                      <div className="flex items-center justify-end">
                        Valor Esperado
                        <SortIcon field="expectedAmount" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("paidAmount")}
                    >
                      <div className="flex items-center justify-end">
                        Valor Pago
                        <SortIcon field="paidAmount" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código PIX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center text-slate-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : sortedPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center text-slate-500">
                        Nenhum registro encontrado para este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedPayments.map((payment) => {
                        const details = getPaymentDetails(payment);
                        const monthName = months[parseInt(selectedMonth)].label;
                        const paymentNumber = calculatePaymentNumber(payment, details.rental);
                        
                        return (
                          <TableRow key={payment.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-medium text-slate-900">
                              {paymentNumber}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {details.local}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {details.complemento}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {details.tenantName}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {selectedYear}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {monthName}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(payment.status)}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {format(new Date(payment.dueDate), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {payment.paymentDate 
                                ? format(new Date(payment.paymentDate), "dd/MM/yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-900">
                              {formatCurrency(payment.expectedAmount)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(payment.paidAmount || 0)}
                            </TableCell>
                            <TableCell>
                              {editingPixCode[details.rental?.id || ""] !== undefined ? (
                                <div className="flex items-center gap-3">
                                  <Input
                                    value={editingPixCode[details.rental?.id || ""]}
                                    onChange={(e) => {
                                      if (details.rental?.id) {
                                        setEditingPixCode({
                                          ...editingPixCode,
                                          [details.rental.id]: e.target.value
                                        });
                                      }
                                    }}
                                    placeholder="Digite o código PIX"
                                    className="h-9 text-sm border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-w-[250px]"
                                    autoFocus
                                  />
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => details.rental?.id && handleSavePixCode(details.rental.id)}
                                    disabled={savingPixCode === details.rental?.id}
                                    className="h-9 w-9 p-0 hover:bg-green-100 transition-colors"
                                    title="Salvar código PIX"
                                  >
                                    <Check className="h-5 w-5 text-green-600" />
                                  </Button>
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => {
                                      if (details.rental?.id) {
                                        const newEditingState = { ...editingPixCode };
                                        delete newEditingState[details.rental.id];
                                        setEditingPixCode(newEditingState);
                                      }
                                    }}
                                    className="h-9 w-9 p-0 hover:bg-red-100 transition-colors"
                                    title="Cancelar edição"
                                  >
                                    <X className="h-5 w-5 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-600 max-w-xs truncate text-sm">
                                    {details.pixCode || "-"}
                                  </span>
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => {
                                      if (details.rental?.id) {
                                        setEditingPixCode({
                                          ...editingPixCode,
                                          [details.rental.id]: details.pixCode || ""
                                        });
                                      }
                                    }}
                                    className="h-9 w-9 p-0 hover:bg-slate-100 transition-colors"
                                    title="Editar código PIX"
                                  >
                                    <Edit2 className="h-5 w-5 text-slate-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Linha de Totais */}
                      <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <TableCell colSpan={9} className="text-right text-slate-900 uppercase tracking-wide">
                          Total:
                        </TableCell>
                        <TableCell className="text-right text-slate-900 text-lg">
                          {formatCurrency(sortedPayments.reduce((sum, p) => sum + p.expectedAmount, 0))}
                        </TableCell>
                        <TableCell className="text-right text-green-700 text-lg">
                          {formatCurrency(sortedPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>

        {(user?.role === "admin") && (
          <DepositInstallmentsTable 
            userRole={user?.role || ""}
            allowedLocationIds={allowedLocationIds}
          />
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
}