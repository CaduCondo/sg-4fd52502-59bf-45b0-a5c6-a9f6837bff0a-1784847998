import {
  Building2,
  Home,
  Construction,
  Users,
  AlertCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileCheck,
} from "lucide-react";
import { MetricCard } from "./MetricCard";
import { DashboardData } from "@/types";

interface OverviewCardsProps {
  data: DashboardData;
}

export function OverviewCards({ data }: OverviewCardsProps) {
  return (
    <div className="space-y-8">
      {/* Seção: Imóveis e Contratos */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Imóveis e Contratos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total de Imóveis"
            value={data.totalProperties}
            icon={Building2}
            iconColor="text-blue-600"
            iconBgClass="bg-blue-50"
            borderColorClass="border-l-blue-500"
          />
          
          <MetricCard
            title="Imóveis Disponíveis"
            value={data.availableProperties}
            icon={Home}
            iconColor="text-green-600"
            iconBgClass="bg-green-50"
            borderColorClass="border-l-green-500"
          />
          
          <MetricCard
            title="Imóveis Alugados"
            value={data.rentedProperties}
            icon={FileCheck}
            iconColor="text-purple-600"
            iconBgClass="bg-purple-50"
            borderColorClass="border-l-purple-500"
          />
          
          <MetricCard
            title="Em Manutenção"
            value={data.maintenanceProperties || 0}
            icon={Construction}
            iconColor="text-orange-600"
            iconBgClass="bg-orange-50"
            borderColorClass="border-l-orange-500"
          />
          
          <MetricCard
            title="Total de Inquilinos"
            value={data.totalTenants}
            icon={Users}
            iconColor="text-indigo-600"
            iconBgClass="bg-indigo-50"
            borderColorClass="border-l-indigo-500"
          />
        </div>
      </div>

      {/* Seção: Financeiro */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Financeiro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Receita Esperada"
            value={data.expectedRevenue}
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBgClass="bg-blue-50"
            borderColorClass="border-l-blue-500"
            isCurrency
          />
          
          <MetricCard
            title="Receita Recebida"
            value={data.receivedRevenue}
            subtitle="No período"
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgClass="bg-green-50"
            borderColorClass="border-l-green-500"
            isCurrency
          />
          
          <MetricCard
            title="Receita Líquida"
            value={data.netRevenue || 0}
            subtitle="Após despesas"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBgClass="bg-emerald-50"
            borderColorClass="border-l-emerald-500"
            isCurrency
          />
          
          <MetricCard
            title="Aluguéis Atrasados"
            value={
              <div className="flex items-baseline gap-2">
                <span>{data.overduePayments}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {data.overdueAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            }
            subtitle={`${data.dueTodayCount || 0} Vencem Hoje`}
            icon={AlertCircle}
            iconColor="text-red-600"
            iconBgClass="bg-red-50"
            borderColorClass="border-l-red-500"
          />
          
          <MetricCard
            title="Taxa de Ocupação"
            value={data.occupancyRate}
            icon={TrendingDown}
            iconColor="text-violet-600"
            iconBgClass="bg-violet-50"
            borderColorClass="border-l-violet-500"
          />
        </div>
      </div>
    </div>
  );
}