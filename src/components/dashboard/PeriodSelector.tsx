import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";

interface PeriodSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (month: number, year: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function PeriodSelector({ 
  selectedMonth, 
  selectedYear, 
  onPeriodChange 
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  // Generate years from current year - 2 to current year + 2
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2">
          {/* Month Selector */}
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => onPeriodChange(parseInt(value), selectedYear)}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onPeriodChange(selectedMonth, parseInt(value))}
          >
            <SelectTrigger className="w-[100px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="outline"
          className="flex items-center gap-2 bg-white"
          onClick={() => window.print()}
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}