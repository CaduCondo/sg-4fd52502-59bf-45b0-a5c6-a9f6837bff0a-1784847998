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
        console.log("⚠️ [FinancialCharts] Sem userId, abortando");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 [FinancialCharts] Iniciando carregamento de dados dos gráficos");
        console.log("📋 Parâmetros:", { selectedMonth, selectedYear, userId, userRole, isFinancialUser });

        // Buscar permissões se necessário
        let allowedLocations: string[] | null = null;
        if (isFinancialUser) {
          console.log("🔐 Usuário financial - buscando permissões de localização");
          const { data: permData, error: permError } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);
          
          if (permError) {
            console.error("❌ Erro ao buscar permissões:", permError);
          }
          
          allowedLocations = permData?.map(p => p.location_id) || [];
          console.log("📍 Localizações permitidas:", allowedLocations);
          
          if (allowedLocations.length === 0) {
            console.log("⚠️ Usuário financial sem permissões - retornando dados vazios");
            setChartData({
              monthlyRevenueData: [],
              monthlyExpensesData: [],
              occupancyPieData: [],
              contractsData: [],
              paymentsStatusData: [],
              occupancyTrendData: []
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
        console.log("📅 Meses para gráficos:", months);

        // Buscar dados agregados
        console.log("🔍 Buscando contagens de propriedades...");
        const propertiesResult = await (async () => {
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

          console.log("📊 Contagens de propriedades:", {
            available: available.count,
            occupied: occupied.count,
            unavailable: unavailable.count
          });

          return {
            available: available.count || 0,
            occupied: occupied.count || 0,
            unavailable: unavailable.count || 0
          };
        })();

        // Buscar contratos ativos e vencendo
        console.log("🔍 Buscando dados de contratos...");
        const contractsResult = await (async () => {
          const today = new Date();
          const next30Days = new Date();
          next30Days.setDate(today.getDate() + 30);

          let activeQuery = supabase
            .from("rentals")
            .select("id", { count: "exact", head: true })
            .eq("status", "active");

          let expiringQuery = supabase
            .from("rentals")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
            .gte("end_date", today.toISOString().split('T')[0])
            .lte("end_date", next30Days.toISOString().split('T')[0]);

          if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
            activeQuery = activeQuery.in("property_id", 
              (await supabase.from("properties").select("id").in("location_id", allowedLocations)).data?.map(p => p.id) || []
            );
            expiringQuery = expiringQuery.in("property_id",
              (await supabase.from("properties").select("id").in("location_id", allowedLocations)).data?.map(p => p.id) || []
            );
          }

          const [active, expiring] = await Promise.all([activeQuery, expiringQuery]);

          return {
            active: active.count || 0,
            expiring: expiring.count || 0
          };
        })();

        console.log("📊 Contratos:", contractsResult);

        // Buscar status dos pagamentos do mês atual
        console.log("🔍 Buscando status de pagamentos...");
        const paymentsStatusResult = await (async () => {
          const currentMonth = selectedMonth.toString().padStart(2, '0');
          const currentYear = selectedYear.toString();

          let paidQuery = supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("status", "paid")
            .eq("reference_month", currentMonth)
            .eq("reference_year", currentYear);

          let overdueQuery = supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "partial"])
            .eq("reference_month", currentMonth)
            .eq("reference_year", currentYear)
            .lt("due_date", new Date().toISOString().split('T')[0]);

          let pendingQuery = supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "partial"])
            .eq("reference_month", currentMonth)
            .eq("reference_year", currentYear)
            .gte("due_date", new Date().toISOString().split('T')[0]);

          if (isFinancialUser && allowedLocations && allowedLocations.length > 0) {
            // Aplicar filtro de localização através de rentals e properties
            const propertiesInLocation = (await supabase
              .from("properties")
              .select("id")
              .in("location_id", allowedLocations)).data?.map(p => p.id) || [];

            const rentalsInProperties = (await supabase
              .from("rentals")
              .select("id")
              .in("property_id", propertiesInLocation)).data?.map(r => r.id) || [];

            if (rentalsInProperties.length > 0) {
              paidQuery = paidQuery.in("rental_id", rentalsInProperties);
              overdueQuery = overdueQuery.in("rental_id", rentalsInProperties);
              pendingQuery = pendingQuery.in("rental_id", rentalsInProperties);
            }
          }

          const [paid, overdue, pending] = await Promise.all([
            paidQuery,
            overdueQuery,
            pendingQuery
          ]);

          return {
            paid: paid.count || 0,
            overdue: overdue.count || 0,
            pending: pending.count || 0
          };
        })();

        console.log("📊 Status de pagamentos:", paymentsStatusResult);

        console.log("🔍 Buscando pagamentos dos últimos 6 meses...");
        const paymentsResult = await (async () => {
          const monthsData = months.map(m => ({
            month: m.month.toString().padStart(2, '0'),
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
        })();

        console.log("📊 Pagamentos carregados para cada mês");

        // Buscar taxa de ocupação dos últimos 6 meses
        console.log("🔍 Buscando histórico de ocupação...");
        const occupancyTrendData = await (async () => {
          const data = [];
          
          for (const m of months) {
            const total = propertiesResult.available + propertiesResult.occupied + propertiesResult.unavailable;
            const occupied = propertiesResult.occupied;
            const rate = total > 0 ? (occupied / total) * 100 : 0;
            
            data.push({
              month: m.label,
              taxa: parseFloat(rate.toFixed(1))
            });
          }
          
          return data;
        })();

        console.log("📊 Histórico de ocupação:", occupancyTrendData);

        if (!isMounted) return;

        // Processar dados de ocupação
        const occupancyPieData = [
          { name: 'Ocupados', value: propertiesResult.occupied, color: COLORS.occupied },
          { name: 'Disponíveis', value: propertiesResult.available, color: COLORS.available },
          { name: 'Indisponíveis', value: propertiesResult.unavailable, color: COLORS.unavailable }
        ].filter(item => item.value > 0);

        console.log("🥧 Dados do gráfico de ocupação:", occupancyPieData);

        // Dados de contratos
        const contractsData = [
          { name: 'Ativos', value: contractsResult.active - contractsResult.expiring, color: COLORS.occupied },
          { name: 'Vencendo (30 dias)', value: contractsResult.expiring, color: COLORS.unavailable }
        ].filter(item => item.value > 0);

        console.log("📋 Dados de contratos:", contractsData);

        // Dados de status de pagamentos
        const paymentsStatusData = [
          { name: 'Pagos', value: paymentsStatusResult.paid, color: COLORS.occupied },
          { name: 'Pendentes', value: paymentsStatusResult.pending, color: COLORS.available },
          { name: 'Atrasados', value: paymentsStatusResult.overdue, color: COLORS.unavailable }
        ].filter(item => item.value > 0);

        console.log("💳 Dados de status de pagamentos:", paymentsStatusData);

        // Processar dados de receita
        const monthlyRevenueData = months.map((m, index) => {
          const monthPayments = paymentsResult[index]?.data || [];
          const bruta = monthPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
          const taxas = bruta * 0.08;
          const liquida = bruta - taxas;
          
          return { 
            month: m.label, 
            bruta, 
            liquida 
          };
        });

        console.log("📈 Dados de receita mensal:", monthlyRevenueData);

        const monthlyExpensesData = months.map((m, index) => {
          const monthPayments = paymentsResult[index]?.data || [];
          const bruta = monthPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
          const taxas = bruta * 0.08;
          
          return { 
            month: m.label, 
            taxas,
            contas: 0
          };
        });

        console.log("📊 Dados de despesas mensais:", monthlyExpensesData);

        setChartData({
          monthlyRevenueData,
          monthlyExpensesData,
          occupancyPieData,
          contractsData,
          paymentsStatusData,
          occupancyTrendData
        });

        console.log("✅ [FinancialCharts] Dados carregados com sucesso!");

      } catch (error) {
        console.error("❌ [FinancialCharts] Erro ao carregar dados:", error);
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
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Nenhum dado disponível para exibir gráficos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasRevenueData = chartData.monthlyRevenueData?.some((d: any) => d.bruta > 0 || d.liquida > 0);
  const hasExpensesData = chartData.monthlyExpensesData?.some((d: any) => d.taxas > 0 || d.contas > 0);
  const hasOccupancyData = chartData.occupancyPieData?.length > 0;
  const hasContractsData = chartData.contractsData?.length > 0;
  const hasPaymentsStatusData = chartData.paymentsStatusData?.length > 0;
  const hasOccupancyTrendData = chartData.occupancyTrendData?.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Receita Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita Mensal (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="bruta" stroke={COLORS.bruta} name="Bruta" strokeWidth={2} />
                <Line type="monotone" dataKey="liquida" stroke={COLORS.liquida} name="Líquida" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhum pagamento recebido nos últimos 6 meses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Despesas Mensais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas Mensais (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {hasExpensesData ? (
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
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhuma despesa registrada nos últimos 6 meses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Status de Ocupação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status de Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          {hasOccupancyData ? (
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
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhum imóvel cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Status de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status dos Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          {hasContractsData ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.contractsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.contractsData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhum contrato ativo</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Status dos Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status dos Pagamentos ({selectedMonth}/{selectedYear})</CardTitle>
        </CardHeader>
        <CardContent>
          {hasPaymentsStatusData ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.paymentsStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.paymentsStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhum pagamento no mês selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Evolução da Taxa de Ocupação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução da Taxa de Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          {hasOccupancyTrendData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.occupancyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="taxa" 
                  stroke={COLORS.occupied} 
                  name="Taxa de Ocupação (%)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Nenhum dado de ocupação disponível</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}