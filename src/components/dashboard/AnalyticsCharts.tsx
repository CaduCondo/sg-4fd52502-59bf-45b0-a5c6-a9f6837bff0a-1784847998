import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/types";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Home,
  Wallet,
  PieChart
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

  // Calcular taxa de inadimplência (baseada em valor)
  const defaultRate = data.expectedRevenue > 0
    ? ((data.overdueAmount / data.expectedRevenue) * 100).toFixed(1)
    : "0";

  // Calcular realização de receita
  const revenueRealization = data.expectedRevenue > 0
    ? ((data.receivedRevenue / data.expectedRevenue) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise Geral</h2>
          <p className="text-muted-foreground">
            Visão detalhada dos indicadores de performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Ocupação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Ocupação
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyPercentage}%</div>
            <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{data.rentedProperties} Alugados</span>
              <span>{data.totalProperties} Total</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {data.availableProperties} imóveis disponíveis para locação
            </div>
          </CardContent>
        </Card>

        {/* Card de Realização Financeira */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Realização de Receita
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueRealization}%</div>
            <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${revenueRealization}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Recebido: {data.receivedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Esperado: {data.expectedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Inadimplência */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inadimplência (Valor)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{defaultRate}%</div>
            <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-500" 
                style={{ width: `${defaultRate}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Atrasado: {data.overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {data.overduePayments} pagamentos em atraso neste período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro Detalhado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Entradas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-900">Receita Bruta</p>
                <p className="text-xs text-green-700">Total recebido de aluguéis</p>
              </div>
              <p className="text-lg font-bold text-green-700">
                {data.grossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900">Receita Líquida</p>
                <p className="text-xs text-blue-700">Após taxas administrativas</p>
              </div>
              <p className="text-lg font-bold text-blue-700">
                {data.netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Composição da Carteira
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Alugados</span>
                <span className="font-medium">{data.rentedProperties} ({occupancyPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${occupancyPercentage}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disponíveis</span>
                <span className="font-medium">
                  {data.availableProperties} ({data.totalProperties > 0 ? ((data.availableProperties / data.totalProperties) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${data.totalProperties > 0 ? (data.availableProperties / data.totalProperties) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Manutenção</span>
                <span className="font-medium">
                  {data.maintenanceProperties} ({data.totalProperties > 0 ? ((data.maintenanceProperties / data.totalProperties) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500" 
                  style={{ width: `${data.totalProperties > 0 ? (data.maintenanceProperties / data.totalProperties) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}