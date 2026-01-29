import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Home, DollarSign, Calendar, Building2, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface AnalyticsChartsProps {
  data: {
    occupancyRate: number;
    rentedProperties: number;
    totalProperties: number;
    expectedAmount: number;
    receivedAmount: number;
    paidPayments: number;
    pendingPayments: number;
    dueTodayPayments: number;
    grossRevenue: number;
    adminFee: number;
    netRevenue: number;
    availableProperties: number;
  };
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const receiptPercentage = data.expectedAmount > 0
    ? Math.round((data.receivedAmount / data.expectedAmount) * 100)
    : 0;

  const adminFeePercentage = data.grossRevenue > 0
    ? Math.round((data.adminFee / data.grossRevenue) * 100)
    : 5;

  const netRevenuePercentage = data.grossRevenue > 0
    ? Math.round((data.netRevenue / data.grossRevenue) * 100)
    : 95;

  const totalPayments = data.paidPayments + data.pendingPayments + data.dueTodayPayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Análises e Gráficos</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de Ocupação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-green-600" />
              Taxa de Ocupação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Imóveis Alugados</span>
              <span className="font-semibold">
                {data.rentedProperties} de {data.totalProperties}
              </span>
            </div>
            <Progress value={data.occupancyRate} className="h-3" />
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900">{data.occupancyRate.toFixed(1)}%</p>
              <p className="text-sm text-slate-500">de ocupação</p>
            </div>
          </CardContent>
        </Card>

        {/* Receita vs Esperado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              Receita vs Esperado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Valor Esperado</span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(data.expectedAmount)}
                </span>
              </div>
              <Progress value={100} className="h-2 bg-blue-200" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Valor Recebido</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(data.receivedAmount)}
                </span>
              </div>
              <Progress value={receiptPercentage} className="h-2" />
            </div>

            <div className="text-center pt-2 border-t">
              <p className="text-4xl font-bold text-slate-900">{receiptPercentage}%</p>
              <p className="text-sm text-slate-500">recebido do esperado</p>
            </div>
          </CardContent>
        </Card>

        {/* Status dos Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              Status dos Recebimentos - {new Date().toLocaleDateString("pt-BR", { month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-slate-700">Pagos</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{data.paidPayments}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-slate-700">Pendentes</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{data.pendingPayments}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-slate-700">Vencendo Hoje</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{data.dueTodayPayments}</span>
            </div>

            <div className="text-center pt-2 border-t">
              <p className="text-4xl font-bold text-slate-900">{totalPayments}</p>
              <p className="text-sm text-slate-500">total de recebimentos</p>
            </div>
          </CardContent>
        </Card>

        {/* Composição Financeira */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Composição Financeira - {new Date().toLocaleDateString("pt-BR", { month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Receita Bruta</span>
                <span className="text-lg font-semibold text-slate-900">
                  {formatCurrency(data.grossRevenue)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: "100%" }}>
                  <span className="flex items-center justify-center text-xs text-white font-semibold">
                    100%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Taxa de Administração ({adminFeePercentage}%)</span>
                <span className="text-lg font-semibold text-purple-600">
                  {formatCurrency(data.adminFee)}
                </span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full flex items-center justify-center"
                  style={{ width: `${adminFeePercentage}%` }}
                >
                  <span className="text-xs text-white font-semibold">{adminFeePercentage}%</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Receita Líquida</span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(data.netRevenue)}
                </span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full flex items-center justify-center"
                  style={{ width: `${netRevenuePercentage}%` }}
                >
                  <span className="text-xs text-white font-semibold">{netRevenuePercentage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Imóveis por Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
            Distribuição de Imóveis por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg text-center">
              <Home className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <p className="text-4xl font-bold text-green-700 mb-1">{data.rentedProperties}</p>
              <p className="text-sm text-slate-600">Imóveis Alugados</p>
              <div className="w-full bg-green-300 rounded-full h-2 mt-3">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg text-center">
              <Home className="h-12 w-12 mx-auto mb-3 text-orange-600" />
              <p className="text-4xl font-bold text-orange-700 mb-1">{data.availableProperties}</p>
              <p className="text-sm text-slate-600">Imóveis Disponíveis</p>
              <div className="w-full bg-orange-300 rounded-full h-2 mt-3">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-blue-600" />
              <p className="text-4xl font-bold text-blue-700 mb-1">{data.totalProperties}</p>
              <p className="text-sm text-slate-600">Total de Imóveis</p>
              <div className="w-full bg-blue-300 rounded-full h-2 mt-3">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}