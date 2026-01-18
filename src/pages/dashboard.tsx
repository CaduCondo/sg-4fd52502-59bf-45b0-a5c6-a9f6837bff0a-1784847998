import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { propertyService } from "@/services/propertyService";
import { rentalService } from "@/services/rentalService";
import { paymentService } from "@/services/paymentService";
import { tenantService } from "@/services/tenantService";
import { userLocationPermissionService } from "@/services/userLocationPermissionService";
import { getCurrentUser } from "@/lib/auth";
import type { PropertyWithLocation, Rental, Payment, Tenant } from "@/types";

export default function Dashboard() {
  const [properties, setProperties] = useState<PropertyWithLocation[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Estatísticas calculadas
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    occupiedProperties: 0,
    totalProperties: 0,
    overdueAmount: 0,
    activeTenants: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentUser = getCurrentUser();

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Carregar dados base
      let allProperties = await propertyService.getAll();
      let allRentals = await rentalService.getAll();
      let allPayments = await paymentService.getAll();
      const allTenants = await tenantService.getAll();

      // Se não for admin, filtrar por permissões de localização
      if (currentUser.role !== "admin") {
        const userLocationIds = await userLocationPermissionService.getByUserId(currentUser.id);
        
        // Filtrar propriedades por location_id
        allProperties = allProperties.filter(p => 
          userLocationIds.includes(p.location_id || "")
        );

        // Filtrar locações por propriedades permitidas
        const allowedPropertyIds = allProperties.map(p => p.id);
        allRentals = allRentals.filter(r => 
          allowedPropertyIds.includes(r.property_id)
        );

        // Filtrar pagamentos por locações permitidas
        const allowedRentalIds = allRentals.map(r => r.id);
        allPayments = allPayments.filter(p => 
          allowedRentalIds.includes(p.rental_id)
        );
      }

      setProperties(allProperties);
      setRentals(allRentals);
      setPayments(allPayments);
      setTenants(allTenants);

      // Calcular estatísticas
      calculateStats(allProperties, allRentals, allPayments, allTenants);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    props: PropertyWithLocation[],
    rents: Rental[],
    pays: Payment[],
    tens: Tenant[]
  ) => {
    const activeRentals = rents.filter(r => r.status === "active");
    const occupiedCount = activeRentals.length;

    // Receita mensal (soma de todos os pagamentos do mês atual)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPayments = pays.filter(p => {
      const paymentDate = new Date(p.due_date);
      return (
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        (p.status === "paid" || p.status === "pending")
      );
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, p) => {
      const amount = p.status === "paid" ? p.paid_amount : p.expected_amount;
      return sum + (amount || 0);
    }, 0);

    // Inadimplência (pagamentos atrasados)
    const overduePayments = pays.filter(p => {
      if (p.status !== "pending") return false;
      const dueDate = new Date(p.due_date);
      return dueDate < now;
    });

    const overdueAmount = overduePayments.reduce((sum, p) => {
      return sum + (p.expected_amount || 0);
    }, 0);

    // Inquilinos ativos
    const activeTenantIds = new Set(activeRentals.map(r => r.tenant_id));
    const activeTenants = tens.filter(t => activeTenantIds.has(t.id));

    setStats({
      monthlyRevenue,
      occupiedProperties: occupiedCount,
      totalProperties: props.length,
      overdueAmount,
      activeTenants: activeTenants.length,
    });
  };

  const getRecentActivities = () => {
    return payments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(payment => {
        const rental = rentals.find(r => r.id === payment.rental_id);
        const tenant = rental ? tenants.find(t => t.id === rental.tenant_id) : null;
        const property = rental ? properties.find(p => p.id === rental.property_id) : null;

        return {
          id: payment.id,
          description: `Pagamento - ${tenant?.name || "Inquilino"} - ${property?.locationData?.name || "Imóvel"}`,
          date: payment.createdAt,
          amount: payment.status === "paid" ? payment.paid_amount : payment.expected_amount,
          status: payment.status,
        };
      });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const recentActivities = getRecentActivities();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Visão geral do sistema de locações</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScrollReveal delay={0.1}>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Receita Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  R$ {stats.monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Pagamentos do mês atual
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Imóveis Ocupados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.occupiedProperties} / {stats.totalProperties}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.totalProperties > 0
                    ? `${Math.round((stats.occupiedProperties / stats.totalProperties) * 100)}% de ocupação`
                    : "Sem imóveis cadastrados"}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Inadimplência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  R$ {stats.overdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Valores em atraso
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Inquilinos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.activeTenants}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Com contratos ativos
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* Recent Activities */}
        <ScrollReveal delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, i) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(activity.date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          R$ {(activity.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <Badge
                          variant={
                            activity.status === "paid"
                              ? "default"
                              : activity.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {activity.status === "paid"
                            ? "Pago"
                            : activity.status === "pending"
                            ? "Pendente"
                            : "Atrasado"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma atividade recente
                </p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </Layout>
  );
}