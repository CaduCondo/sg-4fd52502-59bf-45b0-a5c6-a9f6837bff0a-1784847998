import { Card, CardContent } from "@/components/ui/card";
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
  TrendingDown,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  colorClass: string;
  iconBgClass: string;
}

function MetricCard({ title, value, subtitle, icon, colorClass, iconBgClass }: MetricCardProps) {
  return (
    <Card className={`border-l-4 ${colorClass} hover:shadow-lg transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-slate-600">{title}</h3>
              <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
                {icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OverviewCardsProps {
  data: {
    totalProperties: number;
    availableProperties: number;
    unavailableProperties: number;
    totalTenants: number;
    activeContracts: number;
    overduePayments: number;
    completedPayments: number;
    expectedAmount: number;
    grossRevenue: number;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total de Imóveis */}
        <MetricCard
          title="Total de Imóveis"
          value={data.totalProperties}
          subtitle="Cadastrados e Ocupados"
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
          colorClass="border-l-blue-500"
          iconBgClass="bg-blue-50"
        />

        {/* Imóveis Disponíveis */}
        <MetricCard
          title="Imóveis Disponíveis"
          value={data.availableProperties}
          subtitle="Prontos para locação"
          icon={<Home className="h-4 w-4 text-green-600" />}
          colorClass="border-l-green-500"
          iconBgClass="bg-green-50"
        />

        {/* Imóveis Indisponíveis */}
        <MetricCard
          title="Imóveis Indisponíveis"
          value={data.unavailableProperties}
          subtitle="Construindo/Reformando"
          icon={<Construction className="h-4 w-4 text-orange-600" />}
          colorClass="border-l-orange-500"
          iconBgClass="bg-orange-50"
        />

        {/* Total de Inquilinos */}
        <MetricCard
          title="Total de Inquilinos"
          value={data.totalTenants}
          subtitle="Ativos e locadores"
          icon={<Users className="h-4 w-4 text-purple-600" />}
          colorClass="border-l-purple-500"
          iconBgClass="bg-purple-50"
        />

        {/* Contratos Ativos */}
        <MetricCard
          title="Contratos Ativos"
          value={data.activeContracts}
          subtitle="Locações vigentes"
          icon={<FileCheck className="h-4 w-4 text-indigo-600" />}
          colorClass="border-l-indigo-500"
          iconBgClass="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Recebimentos Atrasados */}
        <MetricCard
          title="Recebimentos Atrasados"
          value={data.overduePayments}
          subtitle="Pagamentos em atraso"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          colorClass="border-l-red-500"
          iconBgClass="bg-red-50"
        />

        {/* Recebimentos Realizados */}
        <MetricCard
          title="Recebimentos Realizados"
          value={data.completedPayments}
          subtitle="Pagos no mês"
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          colorClass="border-l-green-500"
          iconBgClass="bg-green-50"
        />

        {/* Valor Esperado */}
        <MetricCard
          title="Valor Esperado"
          value={formatCurrency(data.expectedAmount)}
          subtitle="Total previsto"
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          colorClass="border-l-blue-500"
          iconBgClass="bg-blue-50"
        />

        {/* Receita Bruta */}
        <MetricCard
          title="Receita Bruta"
          value={formatCurrency(data.grossRevenue)}
          subtitle="Total recebido"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          colorClass="border-l-green-500"
          iconBgClass="bg-green-50"
        />

        {/* Receita Líquida */}
        <MetricCard
          title="Receita Líquida"
          value={formatCurrency(data.netRevenue)}
          subtitle="Após taxas"
          icon={<TrendingDown className="h-4 w-4 text-purple-600" />}
          colorClass="border-l-purple-500"
          iconBgClass="bg-purple-50"
        />
      </div>
    </div>
  );
}