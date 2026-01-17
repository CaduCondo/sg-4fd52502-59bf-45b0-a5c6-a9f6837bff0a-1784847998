import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Home, Users, DollarSign, AlertCircle, Calendar, TrendingUp, Building2, Download, CheckCircle } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { rentalService } from "@/services/rentalService";
import { paymentService } from "@/services/paymentService";
import { configService } from "@/services/configService";
import { systemUserService } from "@/services/systemUserService";
import { formatCurrency } from "@/lib/masks";
import type { Property, Tenant, Rental, Payment } from "@/types";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminFeePercentage, setAdminFeePercentage] = useState(6);
  const [userName, setUserName] = useState("Administrador");
  const [mounted, setMounted] = useState(false);
  
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

  useEffect(() => {
    loadData();
    loadConfig();
    loadUserName();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (properties.length > 0 || tenants.length > 0 || rentals.length > 0 || payments.length > 0) {
      loadData();
    }
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      const [propertiesData, tenantsData, rentalsData, paymentsData] = await Promise.all([
        propertyService.getAll(),
        tenantService.getAll(),
        rentalService.getAll(),
        paymentService.getAll(),
      ]);

      setProperties(propertiesData);
      setTenants(tenantsData);
      setRentals(rentalsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await configService.get();
      if (config) {
        setAdminFeePercentage(config.adminFeePercentage);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const loadUserName = async () => {
    try {
      const name = await systemUserService.getCurrentUserName();
      
      if (name && name !== "Administrador") {
        const firstName = name.split(" ")[0];
        setUserName(firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase());
      } else {
        setUserName("Administrador");
      }
    } catch (error) {
      console.error("Error loading user name:", error);
      setUserName("Administrador");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const activeRentals = rentals.filter((r) => r.isActive);

  const filteredPayments = payments.filter(
    (p) => p.referenceMonth === selectedMonth && p.referenceYear === selectedYear
  );

  const paidPayments = filteredPayments.filter((p) => p.status === "paid");
  const overduePayments = filteredPayments.filter((p) => p.status === "overdue");
  const pendingPayments = filteredPayments.filter(
    (p) => p.status === "pending" || p.status === "partial"
  );

  const monthlyRevenue = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  
  let adminFee = 0;
  for (const payment of paidPayments) {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
    
    if (property && property.location.toLowerCase() !== "outros") {
      const fee = (payment.paidAmount || 0) * (adminFeePercentage / 100);
      adminFee += fee;
    }
  }
  
  const netRevenue = monthlyRevenue - adminFee;
  
  const expectedValue = filteredPayments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

  const dueSoonPayments = filteredPayments.filter((p) => {
    if (p.status !== "pending" && p.status !== "partial" && p.status !== "overdue") return false;
    
    const rental = rentals.find((r) => r.id === p.rentalId);
    if (!rental) return false;

    const today = new Date();
    const dueDate = new Date(selectedYear, selectedMonth - 1, rental.paymentDay);
    
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  });

  const stats = {
    totalProperties: properties.length,
    availableProperties: properties.filter((p) => p.status === "available").length,
    occupiedProperties: properties.filter((p) => p.status === "occupied").length,
    unavailableProperties: properties.filter((p) => p.status === "unavailable").length,
    totalTenants: tenants.filter((t) => t.status === "active" || t.status === "rented").length,
    activeRentals: rentals.filter(r => r.isActive).length,
    pendingPayments: pendingPayments.length,
    overduePayments: overduePayments.length,
    paidPayments: paidPayments.length,
    monthlyRevenue: monthlyRevenue,
    adminFee: adminFee,
    netRevenue: netRevenue,
    expectedValue: expectedValue,
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <>
      <SEO
        title="Dashboard - Gerenciador de Locações"
        description="Painel de controle do sistema de gerenciamento de locações"
      />
      <Layout>
        <div className="space-y-6">
          <FloatingCard delay={0}>
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {mounted ? `${getGreeting()}, ${userName}! 👋` : `Olá, ${userName}! 👋`}
                    </h1>
                    <p className="text-emerald-50 capitalize">
                      {mounted ? getCurrentDate() : "Carregando..."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-100 mb-1">Receita do Mês</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-100 mb-1">Taxa Admin</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.adminFee)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-100 mb-1">Líquido</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.netRevenue)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FloatingCard>

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