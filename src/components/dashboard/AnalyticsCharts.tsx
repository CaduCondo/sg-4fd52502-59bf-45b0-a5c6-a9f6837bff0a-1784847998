import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, DollarSign, Calendar, TrendingUp, Building2, CheckCircle, AlertCircle } from "lucide-react";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { formatCurrency } from "@/lib/masks";
import type { Payment } from "@/types";

interface Stats {
  totalProperties: number;
  occupiedProperties: number;
  availableProperties: number;
  expectedValue: number;
  monthlyRevenue: number;
  adminFee: number;
  netRevenue: number;
  paidPayments: number;
  pendingPayments: number;
}

interface AnalyticsChartsProps {
  stats: Stats;
  adminFeePercentage: number;
  selectedMonth: number;
  filteredPayments: Payment[];
  dueSoonPayments: Payment[];
  monthNames: string[];
}

export function AnalyticsCharts({
  stats,
  adminFeePercentage,
  selectedMonth,
  filteredPayments,
  dueSoonPayments,
  monthNames
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-2xl font-bold">📊 Análises e Gráficos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FloatingCard delay={0.9}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-emerald-500" />
                Taxa de Ocupação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Imóveis Alugados</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {stats.occupiedProperties} de {stats.totalProperties}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-4">
                  <div
                    className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${((stats.occupiedProperties / stats.totalProperties) * 100) || 0}%`,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {((stats.occupiedProperties / stats.totalProperties) * 100 || 0).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">de ocupação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FloatingCard>

        <FloatingCard delay={1.0}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Receita vs Esperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Valor Esperado</span>
                    <span className="text-sm font-bold text-cyan-600">
                      {formatCurrency(stats.expectedValue)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div className="bg-cyan-500 h-3 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Valor Recebido</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(stats.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${((stats.monthlyRevenue / stats.expectedValue) * 100) || 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-center pt-2 border-t">
                  <p className="text-2xl font-bold text-green-600">
                    {((stats.monthlyRevenue / stats.expectedValue) * 100 || 0).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">recebido do esperado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FloatingCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FloatingCard delay={1.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Status dos Recebimentos - {monthNames[selectedMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Pagos</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {stats.paidPayments}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Pendentes</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {stats.pendingPayments}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Vencendo Hoje</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {dueSoonPayments.length}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {filteredPayments.length}
                    </p>
                    <p className="text-sm text-muted-foreground">total de recebimentos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FloatingCard>

        <FloatingCard delay={1.2}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Composição Financeira - {monthNames[selectedMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Receita Bruta</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(stats.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-8 flex items-center justify-center">
                    <span className="text-xs font-medium text-emerald-700">100%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Administração ({adminFeePercentage}%)</span>
                    <span className="text-sm font-bold text-purple-600">
                      {formatCurrency(stats.adminFee)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-6">
                    <div
                      className="bg-purple-500 h-6 rounded-full flex items-center justify-center"
                      style={{ width: `${adminFeePercentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">{adminFeePercentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Receita Líquida</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(stats.netRevenue)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-6">
                    <div
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-center"
                      style={{ width: `${100 - adminFeePercentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">
                        {100 - adminFeePercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FloatingCard>
      </div>

      <FloatingCard delay={1.3}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Distribuição de Imóveis por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <Home className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-emerald-600">
                  {stats.occupiedProperties}
                </p>
                <p className="text-sm text-muted-foreground">Imóveis Alugados</p>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${((stats.occupiedProperties / stats.totalProperties) * 100) || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Home className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-amber-600">
                  {stats.availableProperties}
                </p>
                <p className="text-sm text-muted-foreground">Imóveis Disponíveis</p>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${((stats.availableProperties / stats.totalProperties) * 100) || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-600">{stats.totalProperties}</p>
                <p className="text-sm text-muted-foreground">Total de Imóveis</p>
                <div className="mt-2 w-full bg-blue-500 rounded-full h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </FloatingCard>
    </div>
  );
}