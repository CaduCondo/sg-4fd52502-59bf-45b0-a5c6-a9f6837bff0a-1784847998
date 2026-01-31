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
  Line
} from "recharts";

interface FinancialChartsProps {
  monthlyRevenueData: any[];
  monthlyExpensesData: any[];
}

export function FinancialCharts({ monthlyRevenueData, monthlyExpensesData }: FinancialChartsProps) {
  // Combinar dados para o gráfico
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

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Histórico Financeiro (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                
                {/* Barras para Receita e Despesa */}
                <Bar dataKey="ReceitaBruta" name="Receita Bruta" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Despesas" name="Taxas e Contas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                
                {/* Linha para Receita Líquida */}
                <Line 
                  type="monotone" 
                  dataKey="ReceitaLiquida" 
                  name="Receita Líquida" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}