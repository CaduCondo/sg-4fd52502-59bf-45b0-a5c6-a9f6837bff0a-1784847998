import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Period } from "@/hooks/useDashboardData";

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodSelector({ 
  period, 
  onPeriodChange 
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <h2 className="text-2xl font-bold">Visão Geral</h2>
      <div className="flex gap-3">
        <Select
          value={period}
          onValueChange={(value) => onPeriodChange(value as Period)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última Semana</SelectItem>
            <SelectItem value="month">Último Mês</SelectItem>
            <SelectItem value="year">Último Ano</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => window.print()}
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}