import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, Users, Home, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { paymentService, rentalService, propertyService, tenantService } from "@/services";
import { formatCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { userLocationPermissionService } from "@/services";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    pendingRevenue: 0,
    overdueRevenue: 0,
    occupancyRate: 0,
  });
  
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1. Carregar todos os dados básicos
      const [properties, tenants, rentals, payments] = await Promise.all([
        propertyService.getAll(),
        tenantService.getAll(),
        rentalService.getAll(),
        paymentService.getAll()
      ]);

      // 2. Filtrar dados com base no perfil do usuário
      let filteredProperties = properties;
      let filteredRentals = rentals;
      let filteredPayments = payments;

      // Se não for admin, filtrar por permissões de localização
      if (currentUser.role !== "admin") {
        const userLocationIds = await userLocationPermissionService.getByUserId(currentUser.id);
        
        // Filtrar propriedades pelas localizações permitidas
        filteredProperties = properties.filter(p => 
          userLocationIds.includes(p.location_id || "")
        );

        // Filtrar locações pelas propriedades permitidas
        const allowedPropertyIds = new Set(filteredProperties.map(p => p.id));
        filteredRentals = rentals.filter(r => allowedPropertyIds.has(r.propertyId));

        // Filtrar pagamentos pelas locações permitidas
        const allowedRentalIds = new Set(filteredRentals.map(r => r.id));
        filteredPayments = payments.filter(p => allowedRentalIds.has(p.rentalId));
      }

      // 3. Calcular estatísticas com dados filtrados
      const totalProperties = filteredProperties.length;
      const occupiedProperties = filteredProperties.filter(p => p.status === "occupied").length;
      const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.status === "active" || t.status === "rented").length;

      // Cálculos Financeiros (Mês Atual)
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const currentMonthPayments = filteredPayments.filter(p => 
        p.referenceMonth === currentMonth && p.referenceYear === currentYear
      );

      const monthlyRevenue = currentMonthPayments
        .filter(p => p.status === "paid")
        .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

      const pendingRevenue = currentMonthPayments
        .filter(p => p.status === "pending")
        .reduce((acc, curr) => acc + (curr.expectedAmount || 0), 0);
        
      const overdueRevenue = filteredPayments
        .filter(p => p.status === "overdue")
        .reduce((acc, curr) => acc + (curr.expectedAmount || 0), 0);

      setStats({
        totalProperties,
        occupiedProperties,
        totalTenants,
        activeTenants,
        monthlyRevenue,
        pendingRevenue,
        overdueRevenue,
        occupancyRate,
      });

      // Atividades Recentes (últimos pagamentos)
      const recent = filteredPayments
        .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          type: 'payment',
          description: `Pagamento de ${p.rental?.tenant?.name || 'Inquilino'}`,
          amount: p.paidAmount || p.expectedAmount,
          date: p.paymentDate || p.createdAt,
          status: p.status
        }));

      setRecentActivities(recent);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <SEO title="Dashboard - Gerenciador" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
          <div className="bg-muted p-6 rounded-full">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground max-w-md">
            Você precisa estar autenticado para acessar o Dashboard.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Dashboard - Gerenciador" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {currentUser.role === "admin" 
              ? "Visão geral completa do negócio" 
              : "Visão geral das suas localizações"}
          </p>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ScrollReveal delay={0.1}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  + {formatCurrency(stats.pendingRevenue)} pendente
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Imóveis Ocupados</CardTitle>
                <Home className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.occupiedProperties} / {stats.totalProperties}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.occupancyRate.toFixed(1)}% de ocupação
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total em atraso acumulado
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inquilinos Ativos</CardTitle>
                <Users className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTenants}</div>
                <p className="text-xs text-muted-foreground">
                  Total de contratos vigentes
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* Atividades Recentes */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Pagamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
                ) : (
                  recentActivities.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${activity.status === 'paid' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          <CreditCard className={`h-4 w-4 ${activity.status === 'paid' ? 'text-emerald-600' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(activity.amount)}</p>
                        <Badge variant={activity.status === 'paid' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0 h-5">
                          {activity.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/rentals">
                <Button variant="outline" className="w-full justify-start">
                  <Home className="mr-2 h-4 w-4" /> Nova Locação
                </Button>
              </Link>
              <Link href="/tenants">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" /> Novo Inquilino
                </Button>
              </Link>
              <Link href="/financial">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" /> Relatório Financeiro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function DollarSign(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}