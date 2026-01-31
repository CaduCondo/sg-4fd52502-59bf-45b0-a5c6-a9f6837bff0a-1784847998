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
  Clock,
  Receipt,
} from "lucide-react";
import { MetricCard } from "./MetricCard";

interface OverviewCardsProps {
  data: {
    totalProperties: number;
    availableProperties: number;
    rentedProperties: number;
    unavailableProperties: number;
    occupancyRate: number;
    totalTenants: number;
    activeContracts: number;
    overduePayments: number;
    overdueAmount: number;
    dueTodayPayments: number;
    completedPayments: number;
    expectedAmount: number;
    grossRevenue: number;
    totalFeesAndExpenses: number;
    netRevenue: number;
  };
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Primeira Linha - Imóveis */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 px-1">
          📊 Visão Geral dos Imóveis
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard
            title="Imóveis Cadastrados"
            value={data.totalProperties}
            subtitle="Total cadastrado"
            icon={Building2}
            iconColor="text-blue-600"
            iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            borderColorClass="border-l-blue-500"
          />

          <MetricCard
            title="Imóveis Disponíveis"
            value={data.availableProperties}
            subtitle="Para locação"
            icon={Home}
            iconColor="text-green-600"
            iconBgClass="bg-green-50 dark:bg-green-900/20"
            borderColorClass="border-l-green-500"
          />

          <MetricCard
            title="Imóveis Alugados"
            value={data.rentedProperties}
            subtitle="Atualmente ocupados"
            icon={FileCheck}
            iconColor="text-indigo-600"
            iconBgClass="bg-indigo-50 dark:bg-indigo-900/20"
            borderColorClass="border-l-indigo-500"
          />

          <MetricCard
            title="Imóveis Indisponíveis"
            value={data.unavailableProperties}
            subtitle="Em obra/reforma"
            icon={Construction}
            iconColor="text-orange-600"
            iconBgClass="bg-orange-50 dark:bg-orange-900/20"
            borderColorClass="border-l-orange-500"
          />

          <MetricCard
            title="Taxa de Ocupação"
            value={formatPercentage(data.occupancyRate)}
            subtitle="Ocupados vs Disponíveis"
            icon={TrendingUp}
            iconColor="text-purple-600"
            iconBgClass="bg-purple-50 dark:bg-purple-900/20"
            borderColorClass="border-l-purple-500"
          />
        </div>
      </div>

      {/* Segunda Linha - Contratos e Pagamentos */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 px-1">
          📅 Contratos e Pagamentos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard
            title="Aluguéis Atrasados"
            value={data.overduePayments}
            subtitle="Pagamentos em atraso"
            icon={AlertCircle}
            iconColor="text-red-600"
            iconBgClass="bg-red-50 dark:bg-red-900/20"
            borderColorClass="border-l-red-500"
          />

          <MetricCard
            title="Aluguéis Vencem Hoje"
            value={data.dueTodayPayments}
            subtitle="Vencimento hoje"
            icon={Clock}
            iconColor="text-amber-600"
            iconBgClass="bg-amber-50 dark:bg-amber-900/20"
            borderColorClass="border-l-amber-500"
          />

          <MetricCard
            title="Aluguéis Recebidos"
            value={data.completedPayments}
            subtitle="Pagamentos concluídos"
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgClass="bg-green-50 dark:bg-green-900/20"
            borderColorClass="border-l-green-500"
          />

          <MetricCard
            title="Contratos Vigentes"
            value={data.activeContracts}
            subtitle="Locações ativas"
            icon={FileCheck}
            iconColor="text-indigo-600"
            iconBgClass="bg-indigo-50 dark:bg-indigo-900/20"
            borderColorClass="border-l-indigo-500"
          />

          <MetricCard
            title="Total Inquilinos"
            value={data.totalTenants}
            subtitle="Inquilinos cadastrados"
            icon={Users}
            iconColor="text-cyan-600"
            iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
            borderColorClass="border-l-cyan-500"
          />
        </div>
      </div>

      {/* Terceira Linha - Financeiro */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 px-1">
          💰 Resumo Financeiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard
            title="Total em Atraso"
            value={formatCurrency(data.overdueAmount)}
            subtitle="Valor acumulado"
            icon={AlertCircle}
            iconColor="text-red-600"
            iconBgClass="bg-red-50 dark:bg-red-900/20"
            borderColorClass="border-l-red-500"
            layout="horizontal"
          />

          <MetricCard
            title="Receita Esperada"
            value={formatCurrency(data.expectedAmount)}
            subtitle="Total de recebimentos"
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            borderColorClass="border-l-blue-500"
            layout="horizontal"
          />

          <MetricCard
            title="Receita Bruta Recebida"
            value={formatCurrency(data.grossRevenue)}
            subtitle="Pagamentos realizados"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
            borderColorClass="border-l-emerald-500"
            layout="horizontal"
          />

          <MetricCard
            title="Total Taxas e Contas"
            value={formatCurrency(data.totalFeesAndExpenses)}
            subtitle="Taxas + Contas a Pagar"
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBgClass="bg-orange-50 dark:bg-orange-900/20"
            borderColorClass="border-l-orange-500"
            layout="horizontal"
          />

          <MetricCard
            title="Receita Líquida"
            value={formatCurrency(data.netRevenue)}
            subtitle="Após taxas e despesas"
            icon={Wallet}
            iconColor={data.netRevenue >= 0 ? "text-violet-600" : "text-red-600"}
            iconBgClass={data.netRevenue >= 0 ? "bg-violet-50 dark:bg-violet-900/20" : "bg-red-50 dark:bg-red-900/20"}
            borderColorClass={data.netRevenue >= 0 ? "border-l-violet-500" : "border-l-red-500"}
            layout="horizontal"
          />
        </div>
      </div>
    </div>
  );
}