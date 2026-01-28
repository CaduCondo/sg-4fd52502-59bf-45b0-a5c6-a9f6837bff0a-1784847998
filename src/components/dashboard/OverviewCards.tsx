import { useRouter } from "next/router";
import { MetricCard } from "./MetricCard";
import { Building2, Home, Users, AlertCircle, Calendar, DollarSign, CheckCircle } from "lucide-react";
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
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Ocupação",
      value: `${metrics.occupancyRate}%`,
      subtitle: `${metrics.occupiedProperties} de ${metrics.totalProperties} imóveis`,
      icon: Building2,
      borderColor: "border-l-blue-500",
      iconColor: "text-blue-500",
      onClick: () => router.push("/properties"),
      delay: 0.1
    },
    {
      title: "Receita (Período)",
      value: formatCurrency(metrics.paidAmount),
      subtitle: `${metrics.paidPayments} pagamentos recebidos`,
      icon: DollarSign,
      borderColor: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      onClick: () => router.push("/financial"),
      delay: 0.2
    },
    {
      title: "Em Atraso",
      value: formatCurrency(metrics.overdueAmount),
      subtitle: `${metrics.overduePayments} pagamentos pendentes`,
      icon: AlertCircle,
      borderColor: "border-l-red-500",
      iconColor: "text-red-500",
      onClick: () => router.push("/payments?filter=overdue"),
      delay: 0.3
    },
    {
      title: "Inquilinos Ativos",
      value: metrics.activeTenants,
      subtitle: "Total de contratos vigentes",
      icon: Users,
      borderColor: "border-l-indigo-500",
      iconColor: "text-indigo-500",
      onClick: () => router.push("/tenants"),
      delay: 0.4
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