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
import { memo, useMemo } from "react";

interface OverviewCardsProps {
  data: {
    totalProperties: number;
    availableProperties: number;
    unavailableProperties: number;
    totalTenants: number;
    occupancyRate: number;
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
    pendingPayments: number;
  };
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (month: number, year: number) => void;
  userRole?: string;
}

const CardWrapper = memo(function CardWrapper({ 
  hasLinks, 
  href, 
  children 
}: { 
  hasLinks: boolean;
  href?: string; 
  children: React.ReactNode;
}) {
  if (hasLinks && href) {
    return (
      <Link href={href} className="block">
        {children}
      </Link>
    );
  }
  return <>{children}</>;
});

export const OverviewCards = memo(function OverviewCards({ 
  data, 
  selectedMonth, 
  selectedYear, 
  onPeriodChange, 
  userRole
}: OverviewCardsProps) {
  const formatCurrency = useMemo(() => (value: number) => {
    return (value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, []);

  const hasLinks = useMemo(() => 
    userRole === "admin" || userRole === "broker",
    [userRole]
  );

  const safeData = useMemo(() => ({
    totalProperties: data?.totalProperties || 0,
    availableProperties: data?.availableProperties || 0,
    unavailableProperties: data?.unavailableProperties || 0,
    totalTenants: data?.totalTenants || 0,
    occupancyRate: data?.occupancyRate || 0,
    activeContracts: data?.activeContracts || 0,
    expiringContracts: data?.expiringContracts || 0,
    overduePayments: data?.overduePayments || 0,
    overdueAmount: data?.overdueAmount || 0,
    dueTodayPayments: data?.dueTodayPayments || 0,
    completedPayments: data?.completedPayments || 0,
    expectedAmount: data?.expectedAmount || 0,
    totalRevenue: data?.totalRevenue || 0,
    grossRevenue: data?.grossRevenue || 0,
    totalFeesAndExpenses: data?.totalFeesAndExpenses || 0,
    netRevenue: data?.netRevenue || 0,
    pendingPayments: data?.pendingPayments || 0,
  }), [data]);

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Visão Geral dos Imóveis</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <CardWrapper hasLinks={hasLinks}>
            <MetricCard
              title="Imóveis Cadastrados"
              value={safeData.totalProperties}
              subtitle="Total cadastrado"
              icon={Building2}
              iconColor="text-blue-600"
              iconBgClass="bg-blue-50"
              borderColorClass="border-l-blue-500"
              clickable={false}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks}>
            <MetricCard
              title="Imóveis Disponíveis"
              value={safeData.availableProperties}
              subtitle="Para locação"
              icon={Home}
              iconColor="text-green-600"
              iconBgClass="bg-green-50"
              borderColorClass="border-l-green-500"
              clickable={false}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks}>
            <MetricCard
              title="Imóveis Indisponíveis"
              value={safeData.unavailableProperties}
              subtitle="Em obra/reforma"
              icon={Construction}
              iconColor="text-orange-600"
              iconBgClass="bg-orange-50"
              borderColorClass="border-l-orange-500"
              clickable={false}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks}>
            <MetricCard
              title="Total Inquilinos"
              value={safeData.totalTenants}
              subtitle="Cadastrados no sistema"
              icon={Users}
              iconColor="text-cyan-600"
              iconBgClass="bg-cyan-50"
              borderColorClass="border-l-cyan-500"
              clickable={false}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks}>
            <MetricCard
              title="Taxa de Ocupação"
              value={`${safeData.occupancyRate.toFixed(1)}%`}
              subtitle="Ocupados vs Disponíveis"
              icon={TrendingUp}
              iconColor="text-teal-600"
              iconBgClass="bg-teal-50"
              borderColorClass="border-l-teal-500"
              clickable={false}
            />
          </CardWrapper>
        </div>
      </div>

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
          <CardWrapper hasLinks={hasLinks} href="/payments?status=overdue">
            <MetricCard
              title="Aluguéis Atrasados"
              value={safeData.overduePayments}
              subtitle="Pagamentos em atraso"
              icon={AlertCircle}
              iconColor="text-red-600"
              iconBgClass="bg-red-50 dark:bg-red-900/20"
              borderColorClass="border-l-red-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/payments?status=due_today">
            <MetricCard
              title="Aluguéis Vencem Hoje"
              value={safeData.dueTodayPayments}
              subtitle="Vencimento hoje"
              icon={Clock}
              iconColor="text-amber-600"
              iconBgClass="bg-amber-50 dark:bg-amber-900/20"
              borderColorClass="border-l-amber-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/payments?status=paid">
            <MetricCard
              title="Aluguéis Recebidos"
              value={safeData.completedPayments}
              subtitle="Pagamentos concluídos"
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgClass="bg-green-50 dark:bg-green-900/20"
              borderColorClass="border-l-green-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/rentals">
            <MetricCard
              title="Contratos Vigentes"
              value={safeData.activeContracts}
              subtitle="Locações ativas"
              icon={FileCheck}
              iconColor="text-indigo-600"
              iconBgClass="bg-indigo-50 dark:bg-indigo-900/20"
              borderColorClass="border-l-indigo-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/payments?status=pending">
            <MetricCard
              title="Locações a Vencer"
              value={safeData.pendingPayments}
              subtitle="Vencem até o final do mês"
              icon={AlertCircle}
              iconColor="text-purple-600"
              iconBgClass="bg-purple-50 dark:bg-purple-900/20"
              borderColorClass="border-l-purple-500"
              clickable={hasLinks}
            />
          </CardWrapper>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 px-1">
          💰 Resumo Financeiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <CardWrapper hasLinks={hasLinks} href="/payments?status=overdue">
            <FinancialMetricCard
              title="Total em Atraso"
              value={formatCurrency(safeData.overdueAmount)}
              subtitle="Valor acumulado"
              icon={AlertCircle}
              iconColor="text-red-600"
              iconBgClass="bg-red-50 dark:bg-red-900/20"
              borderColorClass="border-l-red-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/financial">
            <FinancialMetricCard
              title="Receita Esperada"
              value={formatCurrency(safeData.expectedAmount)}
              subtitle="Total de recebimentos"
              icon={DollarSign}
              iconColor="text-blue-600"
              iconBgClass="bg-blue-50 dark:bg-blue-900/20"
              borderColorClass="border-l-blue-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/financial">
            <FinancialMetricCard
              title="Receita Bruta Recebida"
              value={formatCurrency(safeData.grossRevenue)}
              subtitle="Pagamentos realizados"
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
              borderColorClass="border-l-emerald-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/financial">
            <FinancialMetricCard
              title="Total Taxas e Contas"
              value={formatCurrency(safeData.totalFeesAndExpenses)}
              subtitle="Taxas + Contas a Pagar"
              icon={AlertCircle}
              iconColor="text-orange-600"
              iconBgClass="bg-orange-50 dark:bg-orange-900/20"
              borderColorClass="border-l-orange-500"
              clickable={hasLinks}
            />
          </CardWrapper>

          <CardWrapper hasLinks={hasLinks} href="/financial">
            <FinancialMetricCard
              title="Receita Líquida"
              value={formatCurrency(safeData.netRevenue)}
              subtitle="Após taxas e despesas"
              icon={Wallet}
              iconColor={safeData.netRevenue >= 0 ? "text-violet-600" : "text-red-600"}
              iconBgClass={safeData.netRevenue >= 0 ? "bg-violet-50 dark:bg-violet-900/20" : "bg-red-50 dark:bg-red-900/20"}
              borderColorClass={safeData.netRevenue >= 0 ? "border-l-violet-500" : "border-l-red-500"}
              clickable={hasLinks}
            />
          </CardWrapper>
        </div>
      </div>
    </div>
  );
});