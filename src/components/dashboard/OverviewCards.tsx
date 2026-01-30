import {
  Building2,
  Home,
  Construction,
  Users,
  FileCheck,
  AlertCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MetricCard } from "./MetricCard";

interface OverviewCardsProps {
  data: {
    totalProperties: number;
    rentedProperties: number;
    availableProperties: number;
    unavailableProperties: number;
    totalTenants: number;
    activeTenants: number;
    activeContracts: number;
    overduePayments: number;
    overdueAmount: number;
    dueTodayPayments: number;
    completedPayments: number;
    expectedAmount: number;
    grossRevenue: number;
  };
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
      </div>

      {/* Seção: Imóveis e Contratos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Imóveis Cadastrados"
          value={data.totalProperties}
          secondaryInfo={`${data.rentedProperties} Alugados`}
          icon={Building2}
          iconColor="text-blue-600"
          iconBgClass="bg-blue-50"
          borderColorClass="border-l-blue-500"
        />

        <MetricCard
          title="Imóveis Disponíveis"
          value={data.availableProperties}
          subtitle="Para locação"
          icon={Home}
          iconColor="text-green-600"
          iconBgClass="bg-green-50"
          borderColorClass="border-l-green-500"
        />

        <MetricCard
          title="Imóveis Indisponíveis"
          value={data.unavailableProperties}
          subtitle="Em obra/reforma"
          icon={Construction}
          iconColor="text-orange-600"
          iconBgClass="bg-orange-50"
          borderColorClass="border-l-orange-500"
        />

        <MetricCard
          title="Inquilinos"
          value={data.totalTenants}
          secondaryInfo={`${data.activeTenants} Ativos`}
          icon={Users}
          iconColor="text-purple-600"
          iconBgClass="bg-purple-50"
          borderColorClass="border-l-purple-500"
        />

        <MetricCard
          title="Contratos Vigentes"
          value={data.activeContracts}
          subtitle="Locações ativas"
          icon={FileCheck}
          iconColor="text-indigo-600"
          iconBgClass="bg-indigo-50"
          borderColorClass="border-l-indigo-500"
        />
      </div>

      {/* Seção: Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Aluguéis Atrasados"
          value={
            <div className="flex items-center gap-2 text-xl">
              <span>{data.overduePayments}</span>
              <span className="text-sm font-normal text-muted-foreground">•</span>
              <span className="text-lg font-medium text-muted-foreground">{formatCurrency(data.overdueAmount)}</span>
            </div>
          }
          subtitle={
            <span className="text-xs">
              {data.dueTodayPayments} vencem hoje
            </span>
          }
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBgClass="bg-red-50"
          borderColorClass="border-l-red-500"
        />

        <MetricCard
          title="Aluguéis Recebidos"
          value={data.completedPayments}
          subtitle="No período"
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgClass="bg-green-50"
          borderColorClass="border-l-green-500"
        />

        <MetricCard
          title="Receita Esperada"
          value={formatCurrency(data.expectedAmount)}
          subtitle="Total de recebimentos"
          icon={DollarSign}
          iconColor="text-blue-600"
          iconBgClass="bg-blue-50"
          borderColorClass="border-l-blue-500"
          layout="horizontal"
        />

        <MetricCard
          title="Receita Recebida"
          value={formatCurrency(data.grossRevenue)}
          subtitle="No período"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBgClass="bg-emerald-50"
          borderColorClass="border-l-emerald-500"
          layout="horizontal"
        />

        <MetricCard
          title="Receita Líquida"
          value={formatCurrency(data.grossRevenue * 0.9)}
          subtitle="Após despesas"
          icon={Wallet}
          iconColor="text-violet-600"
          iconBgClass="bg-violet-50"
          borderColorClass="border-l-violet-500"
          layout="horizontal"
        />
      </div>
    </div>
  );
}