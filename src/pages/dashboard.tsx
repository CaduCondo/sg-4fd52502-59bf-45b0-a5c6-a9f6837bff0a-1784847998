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
    if (hour < 12) setGreeting("Olá, bom dia");
    else if (hour < 18) setGreeting("Olá, boa tarde");
    else setGreeting("Olá, boa noite");
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { count: propertiesCount } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true });

        const { count: tenantsCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true });

        const { count: activeRentalsCount } = await supabase
          .from("rentals")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const { data: payments } = await supabase
          .from("payments")
          .select("expected_amount, paid_amount, status");

        const properties = propertiesCount || 0;
        const tenants = tenantsCount || 0;
        const activeRentals = activeRentalsCount || 0;

        const paymentsData = payments || [];
        const monthlyRevenue = paymentsData
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (p.paid_amount || p.expected_amount || 0), 0);
        const pendingPayments = paymentsData.filter((p) => p.status === "pending").length;
        const overduePayments = paymentsData.filter((p) => p.status === "overdue").length;

        setStats({
          properties,
          tenants,
          activeRentals,
          monthlyRevenue,
          pendingPayments,
          overduePayments,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
        toast({
          title: "Erro ao carregar estatísticas",
          description: "Não foi possível carregar os dados do dashboard.",
          variant: "destructive",
        });
      }
    };

    loadStats();
  }, [toast]);

  const getUserName = () => {
    if (user?.name) {
      const firstName = user.name.split(" ")[0];
      return firstName;
    }
    return user?.email?.split("@")[0] || "Usuário";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu sistema de locações</p>
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/20 p-3">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {greeting} {getUserName()}!
                </h2>
                <p className="text-blue-100">
                  Bem-vindo ao seu painel de gerenciamento de recebimento das locações dos imóveis do grupo D&apos;Uva Enterprise Corporation!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.properties}</div>
              <p className="text-xs text-muted-foreground">Imóveis cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquilinos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tenants}</div>
              <p className="text-xs text-muted-foreground">Inquilinos cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locações Ativas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRentals}</div>
              <p className="text-xs text-muted-foreground">Contratos ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(stats.monthlyRevenue / 100)}
              </div>
              <p className="text-xs text-muted-foreground">Recebimentos confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
            </CardContent>
          </Card>

          <Card>
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