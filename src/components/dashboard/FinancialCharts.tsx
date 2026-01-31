import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { formatCurrency } from "@/lib/masks";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

interface FinancialChartsProps {
  monthlyRevenueData: Array<{
    month: string;
    bruta: number;
    liquida: number;
  }>;
  monthlyExpensesData: Array<{
    month: string;
    taxas: number;
    contas: number;
  }>;
  occupancyData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

export function FinancialCharts({ 
  monthlyRevenueData, 
  monthlyExpensesData,
  occupancyData 
}: FinancialChartsProps) {
  
  // Combine revenue and expenses data for comprehensive view
  const combinedFinancialData = monthlyRevenueData.map((item, index) => ({
    month: item.month,
    bruta: item.bruta,
    liquida: item.liquida,
    despesas: (monthlyExpensesData[index]?.taxas || 0) + (monthlyExpensesData[index]?.contas || 0),
  }));

  // Payment status data for pie chart
  const getTotalsByType = () => {
    const expensesTotal = monthlyExpensesData.reduce((sum, item) => sum + item.taxas + item.contas, 0);
    return [
      { name: "Taxas", value: monthlyExpensesData.reduce((sum, item) => sum + item.taxas, 0) },
      { name: "Contas a Pagar", value: monthlyExpensesData.reduce((sum, item) => sum + item.contas, 0) },
    ];
  };

  const expenseBreakdown = getTotalsByType();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receita Bruta vs Líquida (6 meses) */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Evolução Financeira - Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedFinancialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="bruta" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  name="Receita Bruta"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="liquida" 
                  stroke={COLORS.success} 
                  strokeWidth={2}
                  name="Receita Líquida"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke={COLORS.danger} 
                  strokeWidth={2}
                  name="Total Despesas"
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Ocupação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-purple-600" />
            Distribuição de Imóveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Despesas Detalhadas (Taxas vs Contas) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            Composição das Despesas (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpensesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="taxas" fill={COLORS.purple} name="Taxas Administrativas" />
                <Bar dataKey="contas" fill={COLORS.warning} name="Contas a Pagar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparativo Bruta x Líquida (Barras) */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Receita Bruta vs Líquida - Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="bruta" fill={COLORS.primary} name="Receita Bruta" radius={[8, 8, 0, 0]} />
                <Bar dataKey="liquida" fill={COLORS.success} name="Receita Líquida" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}