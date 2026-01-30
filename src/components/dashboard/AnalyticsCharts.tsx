import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

interface AnalyticsChartsProps {
  revenueData?: { month: string; value: number }[];
  occupancyData?: { month: string; rate: number }[];
}

export function AnalyticsCharts({ revenueData = [], occupancyData = [] }: AnalyticsChartsProps) {
  const handleBarClick = (data: any) => {
    console.log("Chart clicked:", data);
    // Add interactive behavior here (modal, drill-down, etc.)
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Receita Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {revenueData.length > 0 ? (
              revenueData.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleBarClick(item)}
                  title={`${item.month}: R$ ${item.value.toLocaleString()}`}
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.month}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-primary/20 rounded overflow-hidden relative">
                      <div 
                        className="h-full bg-primary transition-all duration-300 hover:bg-primary/80"
                        style={{ width: `${Math.min((item.value / Math.max(...revenueData.map(d => d.value))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold min-w-[80px] text-right">
                    R$ {item.value.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {occupancyData.length > 0 ? (
              occupancyData.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleBarClick(item)}
                  title={`${item.month}: ${item.rate}% ocupação`}
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.month}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-emerald-100 dark:bg-emerald-950 rounded overflow-hidden relative">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-300 hover:bg-emerald-500"
                        style={{ width: `${Math.min(item.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold min-w-[60px] text-right text-emerald-600">
                    {item.rate}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}