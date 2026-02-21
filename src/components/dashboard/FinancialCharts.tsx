import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialChartsProps {
  selectedMonth: number;
  selectedYear: number;
  userId?: string;
  userRole?: string;
}

const COLORS = {
  occupied: '#10b981',
  available: '#3b82f6',
  unavailable: '#ef4444',
  bruta: '#10b981',
  liquida: '#3b82f6',
  taxas: '#ef4444',
  contas: '#f59e0b'
};

export function FinancialCharts({ selectedMonth, selectedYear, userId, userRole }: FinancialChartsProps) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  const isFinancialUser = useMemo(() => userRole === "financial", [userRole]);

  useEffect(() => {
    let isMounted = true;

    const loadChartData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar permissões se necessário
        let allowedLocations: string[] | null = null;
        if (isFinancialUser) {
          const { data: permData } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);
          
          allowedLocations = permData?.map(p => p.location_id) || [];
          
          if (allowedLocations.length === 0) {
            setChartData({
              monthlyRevenueData: [],
              monthlyExpensesData: [],
              occupancyPieData: []
            });
            setLoading(false);
            return;
          }
        }

        // Gerar últimos 6 meses
        const months = [];
        const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate);
          date.setMonth(date.getMonth() - i);
          months.push({
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
          });
        }

        // Buscar dados agregados
        const [propertiesResult, paymentsResult] = await Promise.all([
          // Contagens de propriedades por status
          (async () => {
            const buildQuery = (status: string) => {
              let query = supabase
                .from("properties")
                .select("id", { count: "exact", head: true })
                .eq("status", status);

              if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
                query = query.in("location_id", allowedLocations);
              }

              return query;
            };

            const [available, occupied, unavailable] = await Promise.all([
              buildQuery("available"),
              buildQuery("occupied"),
              buildQuery("unavailable")
            ]);

            return {
              available: available.count || 0,
              occupied: occupied.count || 0,
              unavailable: unavailable.count || 0
            };
          })(),

          // Pagamentos dos últimos 6 meses
          (async () => {
            const monthsData = months.map(m => ({
              month: m.month.toString(),
              year: m.year.toString()
            }));

            const promises = monthsData.map(async ({ month, year }) => {
              let query = supabase
                .from("payments")
                .select("paid_amount, status, rental:rentals!inner(properties!inner(location_id))")
                .eq("status", "paid")
                .eq("reference_month", month)
                .eq("reference_year", year);

              if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
                query = query.in("rental.properties.location_id", allowedLocations);
              }

              return query;
            });

            return Promise.all(promises);
          })()
        ]);

        if (!isMounted) return;

        // Processar dados de ocupação
        const occupancyPieData = [
          { name: 'Ocupados', value: propertiesResult.occupied, color: COLORS.occupied },
          { name: 'Disponíveis', value: propertiesResult.available, color: COLORS.available },
          { name: 'Indisponíveis', value: propertiesResult.unavailable, color: COLORS.unavailable }
        ].filter(item => item.value > 0);

        // Processar dados de receita
        const monthlyRevenueData = months.map((m, index) => {
          const monthPayments = paymentsResult[index]?.data || [];
          const bruta = monthPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
          const taxas = bruta * 0.08; // Estimativa de 8% de taxas
          const liquida = bruta - taxas;
          
          return { 
            month: m.label, 
            bruta, 
            liquida 
          };
        });

        const monthlyExpensesData = months.map((m, index) => {
          const monthPayments = paymentsResult[index]?.data || [];
          const bruta = monthPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
          const taxas = bruta * 0.08;
          
          return { 
            month: m.label, 
            taxas,
            contas: 0 // Simplificado - contas apenas do mês atual
          };
        });

        setChartData({
          monthlyRevenueData,
          monthlyExpensesData,
          occupancyPieData
        });

      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChartData();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear, userId, userRole, isFinancialUser]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita Mensal (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="bruta" stroke={COLORS.bruta} name="Bruta" />
              <Line type="monotone" dataKey="liquida" stroke={COLORS.liquida} name="Líquida" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas Mensais (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.monthlyExpensesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="taxas" fill={COLORS.taxas} name="Taxas" />
              <Bar dataKey="contas" fill={COLORS.contas} name="Contas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status de Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.occupancyPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.occupancyPieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Bruta Total</span>
              <span className="font-semibold text-emerald-600">
                R$ {chartData.monthlyRevenueData.reduce((sum: number, d: any) => sum + d.bruta, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Líquida Total</span>
              <span className="font-semibold text-blue-600">
                R$ {chartData.monthlyRevenueData.reduce((sum: number, d: any) => sum + d.liquida, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total em Taxas</span>
              <span className="font-semibold text-red-600">
                R$ {chartData.monthlyExpensesData.reduce((sum: number, d: any) => sum + d.taxas, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}