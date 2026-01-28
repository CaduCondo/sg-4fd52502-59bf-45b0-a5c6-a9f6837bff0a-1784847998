import { useRouter } from "next/router";
import { MetricCard } from "./MetricCard";
import { 
  Building2, 
  Home, 
  Users, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  TrendingUp,
  Key,
  UserCheck,
  Percent,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { DashboardMetrics } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewCardsProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export function OverviewCards({ metrics, loading }: OverviewCardsProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total de Imóveis",
      value: metrics.totalProperties,
      subtitle: "Imóveis cadastrados",
      icon: Building2,
      borderColor: "border-l-slate-500",
      iconColor: "text-slate-500",
      onClick: () => router.push("/properties"),
      delay: 0.05
    },
    {
      title: "Imóveis Disponíveis",
      value: metrics.availableProperties,
      subtitle: "Prontos para locação",
      icon: Home,
      borderColor: "border-l-green-500",
      iconColor: "text-green-500",
      onClick: () => router.push("/properties?filter=available"),
      delay: 0.1
    },
    {
      title: "Imóveis Ocupados",
      value: metrics.occupiedProperties,
      subtitle: "Com contratos ativos",
      icon: Key,
      borderColor: "border-l-blue-500",
      iconColor: "text-blue-500",
      onClick: () => router.push("/properties?filter=rented"),
      delay: 0.15
    },
    {
      title: "Taxa de Ocupação",
      value: `${metrics.occupancyRate}%`,
      subtitle: `${metrics.occupiedProperties} de ${metrics.totalProperties} ocupados`,
      icon: Percent,
      borderColor: "border-l-purple-500",
      iconColor: "text-purple-500",
      onClick: () => router.push("/properties"),
      delay: 0.2
    },
    {
      title: "Total de Inquilinos",
      value: metrics.totalTenants,
      subtitle: "Inquilinos cadastrados",
      icon: Users,
      borderColor: "border-l-indigo-500",
      iconColor: "text-indigo-500",
      onClick: () => router.push("/tenants"),
      delay: 0.25
    },
    {
      title: "Inquilinos Ativos",
      value: metrics.activeTenants,
      subtitle: "Com contratos vigentes",
      icon: UserCheck,
      borderColor: "border-l-cyan-500",
      iconColor: "text-cyan-500",
      onClick: () => router.push("/tenants?filter=active"),
      delay: 0.3
    },
    {
      title: "Locações Ativas",
      value: metrics.activeRentals,
      subtitle: "Contratos vigentes",
      icon: Calendar,
      borderColor: "border-l-orange-500",
      iconColor: "text-orange-500",
      onClick: () => router.push("/rentals"),
      delay: 0.35
    },
    {
      title: "Receita Mensal Total",
      value: formatCurrency(metrics.monthlyRevenue),
      subtitle: "Soma de todos os aluguéis ativos",
      icon: TrendingUp,
      borderColor: "border-l-emerald-600",
      iconColor: "text-emerald-600",
      onClick: () => router.push("/financial"),
      delay: 0.4
    },
    {
      title: "Recebido (Período)",
      value: formatCurrency(metrics.paidAmount),
      subtitle: `${metrics.paidPayments} pagamentos confirmados`,
      icon: CheckCircle,
      borderColor: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      onClick: () => router.push("/payments?filter=paid"),
      delay: 0.45
    },
    {
      title: "Pendente (Período)",
      value: formatCurrency(metrics.overdueAmount),
      subtitle: `${metrics.overduePayments} pagamentos em atraso`,
      icon: Clock,
      borderColor: "border-l-amber-500",
      iconColor: "text-amber-500",
      onClick: () => router.push("/payments?filter=pending"),
      delay: 0.5
    },
    {
      title: "Em Atraso",
      value: formatCurrency(metrics.overdueAmount),
      subtitle: `${metrics.overduePayments} pagamentos vencidos`,
      icon: AlertCircle,
      borderColor: "border-l-red-500",
      iconColor: "text-red-500",
      onClick: () => router.push("/payments?filter=overdue"),
      delay: 0.55
    },
    {
      title: "Total Pago",
      value: formatCurrency(metrics.paidAmount),
      subtitle: "Receita confirmada no período",
      icon: DollarSign,
      borderColor: "border-l-green-600",
      iconColor: "text-green-600",
      onClick: () => router.push("/financial"),
      delay: 0.6
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <MetricCard key={index} {...card} />
      ))}
    </div>
  );
}