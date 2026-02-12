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
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "./MetricCard";
import { FinancialMetricCard } from "./FinancialMetricCard";
import { PeriodSelector } from "./PeriodSelector";

interface OverviewCardsProps {
  data: {
    totalProperties: number;
    availableProperties: number;
    unavailableProperties: number;
    totalTenants: number;
    activeContracts: number;
    expiringContracts: number;
    overduePayments: number;
    overdueAmount: number;
    dueTodayPayments: number;
    completedPayments: number;
    expectedAmount: number;
    totalRevenue: number;
    grossRevenue: number;
    totalFeesAndExpenses: number;
    netRevenue: number;
  };
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (month: number, year: number) => void;
  exemptLocationIds: string[];
  userRole?: string;
}

export function OverviewCards({ 
  data, 
  selectedMonth, 
  selectedYear, 
  onPeriodChange, 
  exemptLocationIds,
  userRole
}: OverviewCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const hasLinks = userRole === "admin" || userRole === "broker";

  const CardWrapper = ({ href, children }: { href?: string; children: React.ReactNode }) => {
    if (hasLinks && href) {
      return (
        <Link href={href} className="block">
          {children}
        </Link>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className="space-y-5">
      {/* Primeira Linha - Imóveis (sem período) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Imóveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Imóveis Cadastrados"
            value={data.totalProperties}
            icon={Building2}
            subtitle="Total de imóveis cadastrados"
            iconColor="text-blue-600"
            iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            borderColorClass="border-l-blue-500"
            clickable={false}
          />

          <MetricCard
            title="Imóveis Disponíveis"
            value={data.availableProperties}
            icon={Home}
            subtitle="Disponíveis para locação"
            iconColor="text-green-600"
            iconBgClass="bg-green-50 dark:bg-green-900/20"
            borderColorClass="border-l-green-500"
            clickable={false}
          />

          <MetricCard
            title="Imóveis Indisponíveis"
            value={data.unavailableProperties}
            icon={Construction}
            subtitle="Em obras ou reformas"
            iconColor="text-orange-600"
            iconBgClass="bg-orange-50 dark:bg-orange-900/20"
            borderColorClass="border-l-orange-500"
            clickable={false}
          />

          <MetricCard
            title="Total Inquilinos"
            value={data.totalTenants}
            icon={Users}
            subtitle="Inquilinos cadastrados"
            iconColor="text-cyan-600"
            iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
            borderColorClass="border-l-cyan-500"
            clickable={false}
          />

          <MetricCard
            title="Locações a Vencer"
            value={data.expiringContracts}
            icon={AlertCircle}
            subtitle="Contratos vencem em até 2 meses"
            iconColor="text-purple-600"
            iconBgClass="bg-purple-50 dark:bg-purple-900/20"
            borderColorClass="border-l-purple-500"
            clickable={false}
          />
        </div>
      </div>

      {/* Segunda Linha - Contratos e Pagamentos (com filtro de período) */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-foreground px-1">
            📅 Contratos e Pagamentos
          </h2>
          <PeriodSelector 
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onPeriodChange={onPeriodChange}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <CardWrapper href="/payments?status=overdue">
            <MetricCard
              title="Aluguéis Atrasados"
              value={data.overduePayments}
              subtitle="Pagamentos em atraso"
              icon={AlertCircle}
              iconColor="text-red-600"
              iconBgClass="bg-red-50 dark:bg-red-900/20"
              borderColorClass="border-l-red-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/payments?status=due_today">
            <MetricCard
              title="Aluguéis Vencem Hoje"
              value={data.dueTodayPayments}
              subtitle="Vencimento hoje"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgClass="bg-amber-50 dark:bg-amber-900/20"
              borderColorClass="border-l-amber-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/payments?status=paid">
            <MetricCard
              title="Aluguéis Recebidos"
              value={data.completedPayments}
              subtitle="Pagamentos concluídos"
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgClass="bg-green-50 dark:bg-green-900/20"
              borderColorClass="border-l-green-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/rentals">
            <MetricCard
              title="Contratos Vigentes"
              value={data.activeContracts}
              subtitle="Locações ativas"
              icon={FileCheck}
              iconColor="text-indigo-600"
              iconBgClass="bg-indigo-50 dark:bg-indigo-900/20"
              borderColorClass="border-l-indigo-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/tenants">
            <MetricCard
              title="Total Inquilinos"
              value={data.totalTenants}
              subtitle="Inquilinos cadastrados"
              icon={Users}
              iconColor="text-cyan-600"
              iconBgClass="bg-cyan-50 dark:bg-cyan-900/20"
              borderColorClass="border-l-cyan-500"
              clickable={hasLinks}
            />
          </CardWrapper>
        </div>
      </div>

      {/* Terceira Linha - Financeiro */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 px-1">
          💰 Resumo Financeiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <CardWrapper href="/payments?status=overdue">
            <FinancialMetricCard
              title="Total em Atraso"
              value={formatCurrency(data.overdueAmount)}
              subtitle="Valor acumulado"
              icon={AlertCircle}
              iconColor="text-red-600"
              iconBgClass="bg-red-50 dark:bg-red-900/20"
              borderColorClass="border-l-red-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/financial">
            <FinancialMetricCard
              title="Receita Esperada"
              value={formatCurrency(data.expectedAmount)}
              subtitle="Total de recebimentos"
              icon={DollarSign}
              iconColor="text-blue-600"
              iconBgClass="bg-blue-50 dark:bg-blue-900/20"
              borderColorClass="border-l-blue-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/financial">
            <FinancialMetricCard
              title="Receita Bruta Recebida"
              value={formatCurrency(data.grossRevenue)}
              subtitle="Pagamentos realizados"
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
              borderColorClass="border-l-emerald-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/financial">
            <FinancialMetricCard
              title="Total Taxas e Contas"
              value={formatCurrency(data.totalFeesAndExpenses)}
              subtitle="Taxas + Contas a Pagar"
              icon={AlertCircle}
              iconColor="text-orange-600"
              iconBgClass="bg-orange-50 dark:bg-orange-900/20"
              borderColorClass="border-l-orange-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper href="/financial">
            <FinancialMetricCard
              title="Receita Líquida"
              value={formatCurrency(data.netRevenue)}
              subtitle="Após taxas e despesas"
              icon={Wallet}
              iconColor={data.netRevenue >= 0 ? "text-violet-600" : "text-red-600"}
              iconBgClass={data.netRevenue >= 0 ? "bg-violet-50 dark:bg-violet-900/20" : "bg-red-50 dark:bg-red-900/20"}
              borderColorClass={data.netRevenue >= 0 ? "border-l-violet-500" : "border-l-red-500"}
              clickable={hasLinks}
            />
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}