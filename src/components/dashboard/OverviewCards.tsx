import { useRouter } from "next/router";
import { MetricCard } from "./MetricCard";
import { Building2, Home, Users, AlertCircle, Calendar, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/masks";

interface Stats {
  totalProperties: number;
  availableProperties: number;
  unavailableProperties: number;
  occupiedProperties: number;
  totalTenants: number;
  activeRentals: number;
  overduePayments: number;
  paidPayments: number;
  expectedValue: number;
  monthlyRevenue: number;
  netRevenue: number;
}

interface OverviewCardsProps {
  stats: Stats;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  const router = useRouter();

  const cardsRow1 = [
    {
      title: "Total de Imóveis",
      value: stats.totalProperties,
      subtitle: `Cadastrados e ${stats.occupiedProperties} Ocupados`,
      icon: Building2,
      borderColor: "border-l-blue-500",
      iconColor: "text-blue-500",
      onClick: () => router.push("/properties"),
      delay: 0.1
    },
    {
      title: "Imóveis Disponíveis",
      value: stats.availableProperties,
      subtitle: "Prontos para locação",
      icon: Home,
      borderColor: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      onClick: () => router.push("/properties?filter=available"),
      delay: 0.2
    },
    {
      title: "Imóveis Indisponíveis",
      value: stats.unavailableProperties,
      subtitle: "Construindo/Reformando",
      icon: Home,
      borderColor: "border-l-amber-500",
      iconColor: "text-amber-500",
      onClick: () => router.push("/properties?filter=unavailable"),
      delay: 0.3
    },
    {
      title: "Total de Inquilinos",
      value: stats.totalTenants,
      subtitle: "Ativos e locadores",
      icon: Users,
      borderColor: "border-l-indigo-500",
      iconColor: "text-indigo-500",
      onClick: () => router.push("/tenants"),
      delay: 0.4
    },
    {
      title: "Contratos Ativos",
      value: stats.activeRentals,
      subtitle: "Locações vigentes",
      icon: CheckCircle,
      borderColor: "border-l-violet-500",
      iconColor: "text-violet-500",
      onClick: () => router.push("/rentals"),
      delay: 0.5
    }
  ];

  const cardsRow2 = [
    {
      title: "Recebimentos Atrasados",
      value: stats.overduePayments,
      subtitle: "Pagamentos em atraso",
      icon: AlertCircle,
      borderColor: "border-l-red-500",
      iconColor: "text-red-500",
      onClick: () => router.push("/payments?filter=overdue"),
      delay: 0.6
    },
    {
      title: "Recebimentos Realizados",
      value: stats.paidPayments,
      subtitle: "Pagos no mês",
      icon: Calendar,
      borderColor: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      onClick: () => router.push("/payments"),
      delay: 0.7
    },
    {
      title: "Valor Esperado",
      value: formatCurrency(stats.expectedValue),
      subtitle: "Total previsto",
      icon: DollarSign,
      borderColor: "border-l-cyan-500",
      iconColor: "text-cyan-500",
      onClick: () => router.push("/financial"),
      delay: 0.75
    },
    {
      title: "Receita Bruta",
      value: formatCurrency(stats.monthlyRevenue),
      subtitle: "Total recebido",
      icon: DollarSign,
      borderColor: "border-l-green-500",
      iconColor: "text-green-500",
      onClick: () => router.push("/financial"),
      delay: 0.8
    },
    {
      title: "Receita Líquida",
      value: formatCurrency(stats.netRevenue),
      subtitle: "Após taxas",
      icon: TrendingUp,
      borderColor: "border-l-purple-500",
      iconColor: "text-purple-500",
      onClick: () => router.push("/financial"),
      delay: 0.9
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {[...cardsRow1, ...cardsRow2].map((card, index) => (
        <MetricCard key={index} {...card} />
      ))}
    </div>
  );
}