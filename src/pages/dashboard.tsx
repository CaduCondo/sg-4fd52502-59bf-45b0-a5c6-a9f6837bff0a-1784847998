import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Home, Users, DollarSign, AlertCircle, Calendar, TrendingUp, Building2, Download, CheckCircle } from "lucide-react";

// Services Imports - Using Aliases for compatibility
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllRentals } from "@/services/rentalService";
import { getAll as getAllPayments } from "@/services/paymentService";
import { getConfig } from "@/services/configService";
import { getAll as getAllLocations } from "@/services/locationService";
import { getSystemUsers } from "@/services/systemUserService";
import { getAll as getUserLocationPermissions } from "@/services/userLocationPermissionService";
import { useAuth } from "@/contexts/AuthContext";

// Permissions & Utils
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/masks";
import type { Property, Tenant, Rental, Payment } from "@/types";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [adminFeePercentage, setAdminFeePercentage] = useState(6);
  const [userName, setUserName] = useState("Usuário");
  const [currentDate, setCurrentDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [dueSoonPayments, setDueSoonPayments] = useState<Payment[]>([]);
  const [greeting, setGreeting] = useState("Olá");
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    unavailableProperties: 0,
    activeRentals: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    adminFee: 0,
    netRevenue: 0,
    expectedValue: 0,
    paidPayments: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const exportDashboardData = () => {
    const monthName = monthNames[selectedMonth - 1];
    
    const exportData = {
      periodo: `${monthName} de ${selectedYear}`,
      resumo: {
        totalImoveis: stats.totalProperties,
        imoveisAlugados: stats.occupiedProperties,
        imoveisDisponiveis: stats.availableProperties,
        totalInquilinos: stats.totalTenants,
        recebimentosPendentes: stats.pendingPayments,
        recebimentosRealizados: stats.paidPayments,
      },
      financeiro: {
        receitaMensal: formatCurrency(stats.monthlyRevenue),
        taxaAdministracao: formatCurrency(stats.adminFee),
        receitaLiquida: formatCurrency(stats.netRevenue),
      },
      imoveis: properties.map(p => ({
        local: p.location,
        endereco: p.address,
        bairro: p.neighborhood,
        cidade: p.city,
        valorAluguel: formatCurrency(p.monthlyRent),
        tipo: p.type,
        status: p.status === "occupied" ? "Ocupado" : "Disponível",
      })),
      inquilinos: tenants.filter(t => t.status === "active" || t.status === "rented").map(t => ({
        nome: t.name,
        cpf: t.cpf,
        email: t.email,
        telefone: t.phone,
        status: t.status === "rented" ? "Locador" : "Ativo",
      })),
      pagamentos: filteredPayments.map(p => {
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = properties.find(pr => pr.id === rental?.propertyId);
        const tenant = tenants.find(t => t.id === rental?.tenantId);
        
        return {
          imovel: property?.location || "N/A",
          inquilino: tenant?.name || "N/A",
          valorEsperado: formatCurrency(p.expectedAmount),
          valorPago: formatCurrency(p.paidAmount),
          dataVencimento: p.dueDate,
          dataPagamento: p.paymentDate || "N/A",
          status: p.status === "paid" ? "Pago" : p.status === "partial" ? "Parcial" : p.status === "overdue" ? "Atrasado" : "Pendente",
        };
      }),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${monthName.toLowerCase()}-${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    exportAsCSV(exportData);
  };

  const exportAsCSV = (data: any) => {
    const monthName = monthNames[selectedMonth - 1];
    
    let csvContent = `Dashboard - ${monthName} de ${selectedYear}\n\n`;
    
    csvContent += "RESUMO GERAL\n";
    csvContent += "Métrica,Valor\n";
    csvContent += `Total de Imóveis,${data.resumo.totalImoveis}\n`;
    csvContent += `Imóveis Alugados,${data.resumo.imoveisAlugados}\n`;
    csvContent += `Imóveis Disponíveis,${data.resumo.imoveisDisponiveis}\n`;
    csvContent += `Total de Inquilinos,${data.resumo.totalInquilinos}\n`;
    csvContent += `Recebimentos Pendentes,${data.resumo.recebimentosPendentes}\n`;
    csvContent += `Recebimentos Realizados,${data.resumo.recebimentosRealizados}\n\n`;
    
    csvContent += "FINANCEIRO\n";
    csvContent += "Métrica,Valor\n";
    csvContent += `Receita Mensal,${data.financeiro.receitaMensal}\n`;
    csvContent += `Taxa de Administração,${data.financeiro.taxaAdministracao}\n`;
    csvContent += `Receita Líquida,${data.financeiro.receitaLiquida}\n\n`;
    
    csvContent += "IMÓVEIS\n";
    csvContent += "Local,Endereço,Bairro,Cidade,Valor Aluguel,Tipo,Status\n";
    data.imoveis.forEach((imovel: any) => {
      csvContent += `"${imovel.local}","${imovel.endereco}","${imovel.bairro}","${imovel.cidade}",${imovel.valorAluguel},"${imovel.tipo}","${imovel.status}"\n`;
    });
    csvContent += "\n";
    
    csvContent += "INQUILINOS\n";
    csvContent += "Nome,CPF,Email,Telefone,Status\n";
    data.inquilinos.forEach((inquilino: any) => {
      csvContent += `"${inquilino.nome}","${inquilino.cpf}","${inquilino.email}","${inquilino.telefone}","${inquilino.status}"\n`;
    });
    csvContent += "\n";
    
    csvContent += "PAGAMENTOS\n";
    csvContent += "Imóvel,Inquilino,Valor Esperado,Valor Pago,Data Vencimento,Data Pagamento,Status\n";
    data.pagamentos.forEach((pagamento: any) => {
      csvContent += `"${pagamento.imovel}","${pagamento.inquilino}",${pagamento.valorEsperado},${pagamento.valorPago},"${pagamento.dataVencimento}","${pagamento.dataPagamento}","${pagamento.status}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${monthName.toLowerCase()}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getGreeting = () => {
    if (!mounted) return "Olá";
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getUserName = () => {
    return user?.name || user?.email?.split("@")[0] || "Usuário";
  };

  useEffect(() => {
    // Basic permission check
    const checkAccess = () => {
      const userStr = localStorage.getItem("rental_auth_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (!hasPermission(user.role, "canViewDashboard")) {
           toast({
             title: "Acesso Negado",
             description: "Você não tem permissão para visualizar o dashboard.",
             variant: "destructive"
           });
           // Optional: redirect or show blocking state
        }
      }
    };
    checkAccess();
  }, []);

  useEffect(() => {
    setMounted(true);
    
    // Set current date
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(
      now.toLocaleDateString("pt-BR", options).replace(/^\w/, (c) => c.toUpperCase())
    );

    // Set greeting based on time
    const hour = now.getHours();
    if (hour < 12) {
      setGreeting("Bom dia");
    } else if (hour < 18) {
      setGreeting("Boa tarde");
    } else {
      setGreeting("Boa noite");
    }

    loadDashboardData();
    loadUserName();
  }, []);

  useEffect(() => {
    if (properties.length > 0 || tenants.length > 0 || rentals.length > 0 || payments.length > 0) {
      loadDashboardData();
    }
  }, [selectedMonth, selectedYear]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [
        propertiesData, 
        tenantsData, 
        rentalsData, 
        paymentsData,
        configData
      ] = await Promise.all([
        getAllProperties(),
        getAllTenants(),
        getAllRentals(),
        getAllPayments(),
        getConfig()
      ]);

      setProperties(propertiesData);
      setTenants(tenantsData);
      setRentals(rentalsData);
      setPayments(paymentsData);

      calculateStats(propertiesData, rentalsData, paymentsData, tenantsData);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      if (config) {
        setAdminFeePercentage(config.admin_fee_percentage);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const loadUserName = async () => {
    try {
      // Primeiro tenta pegar do localStorage
      const userStr = localStorage.getItem("rental_auth_user") || localStorage.getItem("currentUser");
      
      if (!userStr) {
        console.log("⚠️ Nenhum usuário encontrado no localStorage");
        setUserName("Usuário");
        return;
      }

      const localUser = JSON.parse(userStr);
      console.log("🔍 Usuário do localStorage:", localUser);
      
      // Se já temos o nome no localStorage, usar ele
      if (localUser.name) {
        const firstName = localUser.name.split(" ")[0];
        setUserName(firstName);
        console.log("✅ Nome carregado do localStorage:", firstName);
        return;
      }

      // Se não tem nome no localStorage, buscar do banco
      if (localUser.id) {
        const { data, error } = await supabase
          .from("system_users")
          .select("name")
          .eq("id", localUser.id)
          .single();

        if (error) {
          console.error("❌ Erro ao buscar nome do usuário:", error);
          setUserName(localUser.username || localUser.email?.split("@")[0] || "Usuário");
          return;
        }

        if (data && data.name) {
          const firstName = data.name.split(" ")[0];
          setUserName(firstName);
          console.log("✅ Nome carregado do banco:", firstName);
        }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar nome do usuário:", error);
      setUserName("Usuário");
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateStats = (
    props: Property[],
    rents: Rental[],
    pays: Payment[],
    tens: Tenant[]
  ) => {
    // Filter active rentals in period
    const activeRentalsInPeriod = rents.filter((rental) => {
      if (!rental.isActive) return false;
      
      const startDate = new Date(rental.startDate);
      const endDate = rental.endDate ? new Date(rental.endDate) : null;
      
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const monthEnd = new Date(selectedYear, selectedMonth, 0);

      const startsBeforeMonthEnd = startDate <= monthEnd;
      const endsAfterMonthStart = !endDate || endDate >= monthStart;

      return startsBeforeMonthEnd && endsAfterMonthStart;
    });

    // Filter payments for selected period
    const periodPayments = pays.filter(
      (p) => p.referenceMonth === selectedMonth && p.referenceYear === selectedYear
    );

    const paid = periodPayments.filter((p) => p.status === "paid");
    const overdue = periodPayments.filter((p) => p.status === "overdue");
    const pending = periodPayments.filter(
      (p) => p.status === "pending" || p.status === "partial"
    );

    const revenue = paid.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    // Calculate admin fee
    let fee = 0;
    for (const payment of paid) {
      const rental = rents.find(r => r.id === payment.rentalId);
      const property = rental ? props.find(p => p.id === rental.propertyId) : undefined;
      
      if (property && property.location.toLowerCase() !== "outros") {
        const paymentFee = (payment.paidAmount || 0) * (adminFeePercentage / 100);
        fee += paymentFee;
      }
    }
    
    const net = revenue - fee;
    const expected = periodPayments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    // Calculate due soon (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueSoon = pays.filter(p => {
      if (p.status === "paid") return false;
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });

    // Count only active and rented tenants
    const activeTenants = tens.filter(t => t.status === "active" || t.status === "rented");

    setFilteredPayments(periodPayments);
    setDueSoonPayments(dueSoon);

    setStats({
      totalProperties: props.length,
      availableProperties: props.filter((p) => p.status === "available").length,
      occupiedProperties: props.filter((p) => p.status === "occupied").length,
      unavailableProperties: props.filter((p) => p.status === "unavailable").length,
      activeRentals: activeRentalsInPeriod.length,
      totalTenants: activeTenants.length,
      monthlyRevenue: revenue,
      adminFee: fee,
      netRevenue: net,
      expectedValue: expected,
      paidPayments: paid.length,
      pendingPayments: pending.length,
      overduePayments: overdue.length,
    });
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          {/* Welcome Card - Blue */}
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-full">
                  <Home className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {getGreeting()}, {getUserName()}!
                  </h2>
                  <p className="text-blue-100 mt-1">
                    Bem-vindo ao seu painel de gerenciamento de recebimento das locações dos imóveis do grupo D&apos;Uva Enterprise Corporation!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Home className="h-8 w-8" />
              {getGreeting()}
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão geral do seu sistema de locações
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-2xl font-bold">Visão Geral</h2>
            <div className="flex gap-3">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={exportDashboardData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Row 1 */}
            <FloatingCard delay={0.1}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 h-full"
                onClick={() => router.push("/properties")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastrados e {stats.occupiedProperties} Ocupados
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.2}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500 h-full"
                onClick={() => router.push("/properties?filter=available")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Imóveis Disponíveis</CardTitle>
                  <Home className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.availableProperties}</div>
                  <p className="text-xs text-muted-foreground mt-1">Prontos para locação</p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.3}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-amber-500 h-full"
                onClick={() => router.push("/properties?filter=unavailable")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Imóveis Indisponíveis</CardTitle>
                  <Home className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.unavailableProperties}</div>
                  <p className="text-xs text-muted-foreground mt-1">Construindo/Reformando</p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.4}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-indigo-500 h-full"
                onClick={() => router.push("/tenants")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Total de Inquilinos</CardTitle>
                  <Users className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.totalTenants}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ativos e locadores</p>
                </CardContent>
              </Card>
            </FloatingCard>

             <FloatingCard delay={0.5}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-violet-500 h-full"
                onClick={() => router.push("/rentals")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.activeRentals}</div>
                  <p className="text-xs text-muted-foreground mt-1">Locações vigentes</p>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Row 2 */}
            <FloatingCard delay={0.6}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500 h-full"
                onClick={() => router.push("/payments?filter=overdue")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Recebimentos Atrasados</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.overduePayments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pagamentos em atraso
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.7}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500 h-full"
                onClick={() => router.push("/payments")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Recebimentos Realizados</CardTitle>
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stats.paidPayments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pagos no mês
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.75}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-cyan-500 h-full"
                onClick={() => router.push("/financial")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Valor Esperado</CardTitle>
                  <DollarSign className="h-4 w-4 text-cyan-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{formatCurrency(stats.expectedValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total previsto
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.8}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500 h-full"
                onClick={() => router.push("/financial")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total recebido
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.9}>
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500 h-full"
                onClick={() => router.push("/financial")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{formatCurrency(stats.netRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Após taxas
                  </p>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>

          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold">📊 Análises e Gráficos</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FloatingCard delay={0.9}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-emerald-500" />
                      Taxa de Ocupação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Imóveis Alugados</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {stats.occupiedProperties} de {stats.totalProperties}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
                          style={{
                            width: `${((stats.occupiedProperties / stats.totalProperties) * 100) || 0}%`,
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-emerald-600">
                          {((stats.occupiedProperties / stats.totalProperties) * 100 || 0).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">de ocupação</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FloatingCard>

              <FloatingCard delay={1.0}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Receita vs Esperado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Valor Esperado</span>
                          <span className="text-sm font-bold text-cyan-600">
                            {formatCurrency(stats.expectedValue)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className="bg-cyan-500 h-3 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Valor Recebido</span>
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(stats.monthlyRevenue)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${((stats.monthlyRevenue / stats.expectedValue) * 100) || 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-center pt-2 border-t">
                        <p className="text-2xl font-bold text-green-600">
                          {((stats.monthlyRevenue / stats.expectedValue) * 100 || 0).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">recebido do esperado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FloatingCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FloatingCard delay={1.1}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Status dos Recebimentos - {monthNames[selectedMonth - 1]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Pagos</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {stats.paidPayments}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium">Pendentes</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-600">
                          {stats.pendingPayments}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium">Vencendo Hoje</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {dueSoonPayments.length}
                        </span>
                      </div>

                      <div className="pt-3 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900">
                            {filteredPayments.length}
                          </p>
                          <p className="text-sm text-muted-foreground">total de recebimentos</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FloatingCard>

              <FloatingCard delay={1.2}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      Composição Financeira - {monthNames[selectedMonth - 1]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Receita Bruta</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(stats.monthlyRevenue)}
                          </span>
                        </div>
                        <div className="w-full bg-emerald-100 rounded-full h-8 flex items-center justify-center">
                          <span className="text-xs font-medium text-emerald-700">100%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Taxa de Administração ({adminFeePercentage}%)</span>
                          <span className="text-sm font-bold text-purple-600">
                            {formatCurrency(stats.adminFee)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-6">
                          <div
                            className="bg-purple-500 h-6 rounded-full flex items-center justify-center"
                            style={{
                              width: `${adminFeePercentage}%`,
                            }}
                          >
                            <span className="text-xs font-medium text-white">{adminFeePercentage}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Receita Líquida</span>
                          <span className="text-sm font-bold text-blue-600">
                            {formatCurrency(stats.netRevenue)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-6">
                          <div
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-center"
                            style={{
                              width: `${100 - adminFeePercentage}%`,
                            }}
                          >
                            <span className="text-xs font-medium text-white">
                              {100 - adminFeePercentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FloatingCard>
            </div>

            <FloatingCard delay={1.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    Distribuição de Imóveis por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <Home className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-emerald-600">
                        {stats.occupiedProperties}
                      </p>
                      <p className="text-sm text-muted-foreground">Imóveis Alugados</p>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${((stats.occupiedProperties / stats.totalProperties) * 100) || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <Home className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-amber-600">
                        {stats.availableProperties}
                      </p>
                      <p className="text-sm text-muted-foreground">Imóveis Disponíveis</p>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{
                            width: `${((stats.availableProperties / stats.totalProperties) * 100) || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-blue-600">{stats.totalProperties}</p>
                      <p className="text-sm text-muted-foreground">Total de Imóveis</p>
                      <div className="mt-2 w-full bg-blue-500 rounded-full h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>
        </div>
      </Layout>
    </>
  );
}