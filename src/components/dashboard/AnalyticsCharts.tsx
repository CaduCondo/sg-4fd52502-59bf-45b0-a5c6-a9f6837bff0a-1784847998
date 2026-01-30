import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/types";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertTriangle,
  DollarSign,
  Home,
  Users,
  Clock
} from "lucide-react";

interface AnalyticsChartsProps {
  data: DashboardData;
  period: number;
}

export function AnalyticsCharts({ data, period }: AnalyticsChartsProps) {
  // Calcular porcentagem de ocupação
  const occupancyPercentage = data.totalProperties > 0 
    ? ((data.rentedProperties / data.totalProperties) * 100).toFixed(1)
    : "0";

  // Calcular taxa de inadimplência
  const defaultRate = data.receivedRevenue > 0
    ? ((data.overdueAmount / data.expectedRevenue) * 100).toFixed(1)
    : "0";

  // Calcular receita média por imóvel
  const averageRevenuePerProperty = data.rentedProperties > 0
    ? (data.receivedRevenue / data.rentedProperties).toFixed(2)
    : "0";

  return (
    <div className="space-y-6">
      {/* Título da seção */}
      <div>
        <h2 className="text-2xl font-bold">Análises e Indicadores</h2>
        <p className="text-muted-foreground">
          Período: {period === 30 ? "Últimos 30 dias" : period === 90 ? "Últimos 90 dias" : "Últimos 365 dias"}
        </p>
      </div>

      {/* Grid de indicadores detalhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Taxa de Ocupação Detalhada */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-green-600" />
              Taxa de Ocupação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-green-600">{occupancyPercentage}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all" 
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.rentedProperties} de {data.totalProperties} imóveis ocupados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Inadimplência */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Taxa de Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-red-600">{defaultRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all" 
                  style={{ width: `${defaultRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                R$ {data.overdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em atraso
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Receita Média por Imóvel */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Receita Média/Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-blue-600">
                R$ {averageRevenuePerProperty}
              </p>
              <p className="text-xs text-muted-foreground">
                Por imóvel alugado no período
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vencimentos Próximos */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Vencimentos Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-orange-600">
                {data.dueTodayCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Pagamentos vencem hoje
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de informações adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Resumo Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Esperada</span>
              <span className="font-semibold">
                R$ {data.expectedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Recebida</span>
              <span className="font-semibold text-green-600">
                R$ {data.receivedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Líquida</span>
              <span className="font-semibold text-blue-600">
                R$ {data.netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taxa de Recebimento</span>
                <span className="text-lg font-bold text-green-600">
                  {data.expectedRevenue > 0 
                    ? ((data.receivedRevenue / data.expectedRevenue) * 100).toFixed(1)
                    : "0"
                  }%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status dos Imóveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4" />
              Status dos Imóveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Disponíveis</span>
              </div>
              <span className="font-semibold">{data.availableProperties}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">Alugados</span>
              </div>
              <span className="font-semibold">{data.rentedProperties}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">Manutenção</span>
              </div>
              <span className="font-semibold">{data.maintenanceProperties}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total de Imóveis</span>
                <span className="text-lg font-bold">{data.totalProperties}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas e Ações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.overduePayments > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    {data.overduePayments} pagamento{data.overduePayments > 1 ? "s" : ""} atrasado{data.overduePayments > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Total: R$ {data.overdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {(data.dueTodayCount || 0) > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">
                    {data.dueTodayCount} vencimento{(data.dueTodayCount || 0) > 1 ? "s" : ""} hoje
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Acompanhe os pagamentos que vencem hoje
                  </p>
                </div>
              </div>
            )}

            {data.maintenanceProperties > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    {data.maintenanceProperties} imóve{data.maintenanceProperties > 1 ? "is" : "l"} em manutenção
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Verifique o status das manutenções
                  </p>
                </div>
              </div>
            )}

            {data.overduePayments === 0 && (data.dueTodayCount || 0) === 0 && data.maintenanceProperties === 0 && (
              <div className="flex items-center justify-center p-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">
                    Tudo em ordem!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Não há alertas no momento
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}