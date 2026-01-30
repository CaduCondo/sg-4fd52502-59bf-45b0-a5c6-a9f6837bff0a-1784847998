import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/types";
import { TrendingUp, TrendingDown, DollarSign, Home } from "lucide-react";

interface DashboardChartsProps {
  data: DashboardData;
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  // Calcular percentuais para gráficos
  const occupancyRateStr = String(data.occupancyRate || "0");
  const occupancyPercentage = parseFloat(occupancyRateStr.replace('%', ''));
  
  const revenuePercentage = data.expectedRevenue > 0 
    ? Math.round((data.receivedRevenue / data.expectedRevenue) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Gráfico de Receita */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
            Realização de Receita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Recebido vs Esperado</span>
            <span className="text-2xl font-bold text-green-600">{revenuePercentage}%</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Recebido: {data.receivedRevenue.toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                })}
              </span>
              <span>
                Esperado: {data.expectedRevenue.toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                })}
              </span>
            </div>
          </div>

          {revenuePercentage >= 100 ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Meta atingida! Parabéns!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Faltam {(100 - revenuePercentage).toFixed(0)}% para atingir a meta
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Ocupação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5 text-blue-600" />
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Imóveis Alugados</span>
            <span className="text-2xl font-bold text-blue-600">{occupancyPercentage.toFixed(0)}%</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Alugados: {data.rentedProperties}</span>
              <span>Total: {data.totalProperties}</span>
            </div>
          </div>

          {/* Breakdown por Status */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Disponíveis</span>
              </div>
              <span className="text-sm font-medium">{data.availableProperties}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-sm">Em Manutenção</span>
              </div>
              <span className="text-sm font-medium">{data.maintenanceProperties || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}