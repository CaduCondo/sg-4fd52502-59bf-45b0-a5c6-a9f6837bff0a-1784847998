import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface FinancialChartsProps {
  monthlyRevenueData: any[];
  monthlyExpensesData: any[];
  occupancyData: any[];
}

export function FinancialCharts({ monthlyRevenueData, monthlyExpensesData, occupancyData }: FinancialChartsProps) {
  // Combinar dados para o gráfico financeiro
  const data = monthlyRevenueData.map((rev, index) => {
    const exp = monthlyExpensesData[index];
    return {
      month: rev.month,
      ReceitaBruta: rev.bruta,
      Despesas: exp ? (exp.taxas + exp.contas) : 0,
      ReceitaLiquida: rev.liquida
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['#4f46e5', '#22c55e', '#f97316', '#ef4444'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Gráfico Histórico Financeiro */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Histórico Financeiro (6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="ReceitaBruta" name="Receita Bruta" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Despesas" name="Despesas Totais" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                <Line 
                  type="monotone" 
                  dataKey="ReceitaLiquida" 
                  name="Receita Líquida" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Ocupação */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Status de Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}