import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage, configStorage } from "@/lib/storage";
import { DashboardStats, Property, Tenant, Rental, Payment } from "@/types";
import { Building2, Users, DollarSign, CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate } from "@/lib/masks";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { AnimatedCounter } from "@/components/animations/FloatingCard";

export default function Dashboard() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    rentedProperties: 0,
    availableProperties: 0,
    totalTenants: 0,
    paidThisMonth: 0,
    unpaidThisMonth: 0,
    totalRevenue: 0,
    adminFee: 0,
    dueThisMonth: 0
  });
  const [upcomingPayments, setUpcomingPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);
  const [revenueChartData, setRevenueChartData] = useState<Array<{
    month: string;
    receita: number;
    taxa: number;
  }>>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<Array<{
    name: string;
    value: number;
    color: string;
  }>>([]);
  const [occupancyData, setOccupancyData] = useState<Array<{
    name: string;
    value: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0");
    const currentYear = now.getFullYear().toString();
    
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, [router]);

  useEffect(() => {
    if (!selectedMonth || !selectedYear) return;

    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    const rentals = rentalStorage.getAll();
    const payments = paymentStorage.getAll();
    const config = configStorage.get();

    const currentMonthPayments = payments.filter(
      p => p.month === selectedMonth && p.year === parseInt(selectedYear)
    );

    const paidCount = currentMonthPayments.filter(p => p.status === "paid").length;
    const unpaidCount = currentMonthPayments.filter(p => p.status === "unpaid" || p.status === "partial").length;
    const totalRevenue = currentMonthPayments
      .filter(p => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.partialAmount || p.amount), 0);
    const adminFee = totalRevenue * (config.adminFeePercentage / 100);
    const dueThisMonth = currentMonthPayments
      .filter(p => p.status === "unpaid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.amount - (p.partialAmount || 0)), 0);

    const rentedCount = properties.filter(p => p.status === "occupied").length;

    setStats({
      totalProperties: properties.length,
      rentedProperties: rentedCount,
      availableProperties: properties.length - rentedCount,
      totalTenants: tenants.length,
      paidThisMonth: paidCount,
      unpaidThisMonth: unpaidCount,
      totalRevenue,
      adminFee,
      dueThisMonth
    });

    const upcoming = currentMonthPayments
      .filter(p => p.status === "unpaid" || p.status === "partial")
      .map(payment => {
        const rental = rentals.find(r => r.id === payment.rentalId);
        const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
        
        if (rental && property && tenant) {
          return { payment, rental, property, tenant };
        }
        return null;
      })
      .filter(Boolean) as Array<{
        payment: Payment;
        rental: Rental;
        property: Property;
        tenant: Tenant;
      }>;

    setUpcomingPayments(upcoming);

    // Gerar dados para gráfico de receita mensal (últimos 6 meses)
    const revenueData: Array<{ month: string; receita: number; taxa: number }> = [];
    const currentDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1);
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      
      const monthPayments = payments.filter(
        p => p.month === month && p.year === year && (p.status === "paid" || p.status === "partial")
      );
      
      const revenue = monthPayments.reduce((sum, p) => sum + (p.partialAmount || p.amount), 0);
      const fee = revenue * (config.adminFeePercentage / 100);
      
      revenueData.push({
        month: `${getMonthName(month).substring(0, 3)}/${year}`,
        receita: revenue,
        taxa: fee
      });
    }
    
    setRevenueChartData(revenueData);

    // Dados para gráfico de pizza - Status de Pagamentos
    setPaymentStatusData([
      { name: "Pagos", value: paidCount, color: "#3b82f6" },
      { name: "Pendentes", value: unpaidCount, color: "#ef4444" }
    ]);

    // Dados para gráfico de pizza - Ocupação
    setOccupancyData([
      { name: "Ocupados", value: rentedCount, color: "#eab308" },
      { name: "Disponíveis", value: properties.length - rentedCount, color: "#3b82f6" }
    ]);
  }, [selectedMonth, selectedYear]);

  const getMonthName = (month: string) => {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return months[parseInt(month) - 1];
  };

  const generateMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, "0");
      return { value: month, label: getMonthName(month) };
    });
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - 2 + i;
      return { value: year.toString(), label: year.toString() };
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} registros</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <SEO 
        title="Dashboard - ImóvelControl"
        description="Painel de controle do sistema de gerenciamento de locações"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Olá, {currentUser?.name || "Usuário"}
              </h1>
              <p className="text-gray-500">Bem-vindo ao painel de controle</p>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {generateYearOptions().map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <StaggerContainer staggerDelay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
              <StaggerItem>
                <FloatingCard delay={0}>
                  <Link href="/properties">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">TOTAL DE IMÓVEIS</CardTitle>
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.totalProperties} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.1}>
                  <Link href="/properties?filter=occupied">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-emerald-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">IMÓVEIS OCUPADOS</CardTitle>
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.rentedProperties} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.2}>
                  <Link href="/properties?filter=available">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">IMÓVEIS VAGOS</CardTitle>
                          <Building2 className="h-4 w-4 text-amber-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.availableProperties} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.3}>
                  <Link href="/tenants">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">TOTAL</CardTitle>
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.totalTenants} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>
            </div>
          </StaggerContainer>

          <StaggerContainer staggerDelay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
              <StaggerItem>
                <FloatingCard delay={0}>
                  <Link href="/payments?filter=paid">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">PAGAMENTOS</CardTitle>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.paidThisMonth} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.1}>
                  <Link href="/payments?filter=unpaid">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-red-500 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-medium text-gray-600">PAGAMENTOS PENDENTES</CardTitle>
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-gray-900">
                          <AnimatedCounter value={stats.unpaidThisMonth} duration={1} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.2}>
                  <Card className="border-l-4 border-l-blue-500 bg-blue-50 h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-gray-600">RECEBIDO NO MÊS</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-gray-900">
                        <AnimatedCounter value={stats.totalRevenue} prefix="R$ " duration={1.5} />
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.3}>
                  <Card className="border-l-4 border-l-indigo-500 bg-indigo-50 h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-gray-600">TAXA ADMINISTRAÇÃO</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-gray-900">
                        <AnimatedCounter value={stats.adminFee} prefix="R$ " duration={1.5} />
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>
            </div>
          </StaggerContainer>

          {/* Seção de Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Receita Mensal */}
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Evolução de Receita
                  </CardTitle>
                  <CardDescription>Últimos 6 meses - Receita vs Taxa de Administração</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} name="Receita" />
                      <Line type="monotone" dataKey="taxa" stroke="#6366f1" strokeWidth={2} name="Taxa Admin" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Gráfico de Receita por Mês em Barras */}
            <FloatingCard delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Receita Mensal
                  </CardTitle>
                  <CardDescription>Comparativo dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="receita" fill="#10b981" name="Receita" />
                      <Bar dataKey="taxa" fill="#6366f1" name="Taxa Admin" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Gráfico de Pizza - Status de Pagamentos */}
            <FloatingCard delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Status de Pagamentos
                  </CardTitle>
                  <CardDescription>Distribuição de pagamentos no mês</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Gráfico de Pizza - Ocupação */}
            <FloatingCard delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    Ocupação de Imóveis
                  </CardTitle>
                  <CardDescription>Distribuição atual dos imóveis</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>

          {upcomingPayments.length > 0 && (
            <FloatingCard delay={0.5}>
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <CardTitle>Prestes a Vencer</CardTitle>
                      <CardDescription>Pagamentos pendentes de {getMonthName(selectedMonth)}/{selectedYear}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingPayments.map(({ payment, property, tenant }) => (
                      <Link 
                        key={payment.id}
                        href={`/payments/${payment.id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-semibold text-gray-900 truncate">{property.local}</p>
                            <p className="text-sm text-gray-600">Inquilino: {tenant.name} • Venc: {formatDate(payment.dueDate)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-amber-700 whitespace-nowrap">{formatCurrency(payment.amount - (payment.partialAmount || 0))}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total a Receber:</span>
                        <span className="text-xl font-bold text-amber-700">{formatCurrency(stats.dueThisMonth)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          )}
        </div>
      </Layout>
    </>
  );
}