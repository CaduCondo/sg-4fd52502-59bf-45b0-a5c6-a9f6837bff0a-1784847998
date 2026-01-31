import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FinancialChartsProps {
  monthlyRevenueData: any[];
  monthlyExpensesData: any[];
}

export function FinancialCharts({ monthlyRevenueData, monthlyExpensesData }: FinancialChartsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receita Bruta vs Líquida - 6 Meses */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Bruta vs Líquida (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="bruta" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Receita Bruta"
              />
              <Line 
                type="monotone" 
                dataKey="liquida" 
                stroke="#6366f1" 
                strokeWidth={2}
                name="Receita Líquida"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Taxas e Contas - 6 Meses */}
      <Card>
        <CardHeader>
          <CardTitle>Taxas e Contas a Pagar (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyExpensesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="taxas" fill="#f59e0b" name="Taxas (Admin + Gerenc.)" />
              <Bar dataKey="contas" fill="#ef4444" name="Contas a Pagar" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}