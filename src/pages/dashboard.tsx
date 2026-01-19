import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, FileText, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [greeting, setGreeting] = useState("Olá");
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    activeRentals: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("bom dia");
    else if (hour < 18) setGreeting("boa tarde");
    else setGreeting("boa noite");
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Cast to any to avoid "Type instantiation is excessively deep" error
        const { data: propertiesData } = await (supabase as any)
          .from("properties")
          .select("id");

        const { data: tenantsData } = await (supabase as any)
          .from("tenants")
          .select("id");

        const { data: activeRentalsData } = await (supabase as any)
          .from("rentals")
          .select("id")
          .eq("status", "active");

        // Fetch payments data
        const { data: payments } = await (supabase as any)
          .from("payments")
          .select("expected_amount, paid_amount, status");

        const paymentsData = payments || [];
        
        // Calculate revenue - assuming values are stored as raw numbers now (not cents)
        const monthlyRevenue = paymentsData
          .filter((p: any) => p.status === "paid")
          .reduce((sum: number, p: any) => sum + (Number(p.paid_amount) || Number(p.expected_amount) || 0), 0);
          
        const pendingPayments = paymentsData.filter((p: any) => p.status === "pending").length;
        const overduePayments = paymentsData.filter((p: any) => p.status === "overdue").length;

        setStats({
          properties: propertiesData?.length || 0,
          tenants: tenantsData?.length || 0,
          activeRentals: activeRentalsData?.length || 0,
          monthlyRevenue,
          pendingPayments,
          overduePayments,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, []);

  const getUserName = () => {
    return user?.name || user?.email?.split("@")[0] || "Usuário";
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Card - Blue */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0 shadow-lg">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-6">
              <div className="rounded-full bg-white/20 p-4 hidden sm:block">
                <Building2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  Olá, {greeting} {getUserName()}!
                </h2>
                <p className="text-blue-100 text-lg opacity-90">
                  Bem-vindo ao seu painel de gerenciamento de recebimento das locações dos imóveis do grupo D'Uva Enterprise Corporation!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.properties}</div>
              <p className="text-xs text-muted-foreground">Imóveis cadastrados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquilinos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tenants}</div>
              <p className="text-xs text-muted-foreground">Inquilinos cadastrados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locações Ativas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRentals}</div>
              <p className="text-xs text-muted-foreground">Contratos ativos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(stats.monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Recebimentos confirmados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Atrasados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}