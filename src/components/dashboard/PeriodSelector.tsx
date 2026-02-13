import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { memo } from "react";

interface PeriodSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange?: (month: number, year: number) => void;
  // Props de compatibilidade para financial.tsx
  filterMonth?: number;
  filterYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
  onFilterMonthChange?: (month: number) => void;
  onFilterYearChange?: (year: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const PeriodSelector = memo(function PeriodSelector({ 
  selectedMonth, 
  selectedYear, 
  onPeriodChange,
  filterMonth,
  filterYear,
  onMonthChange,
  onYearChange,
  onFilterMonthChange,
  onFilterYearChange
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Usa filterMonth/Year se disponível (para financial.tsx), senão usa selectedMonth/Year (dashboard)
  const displayMonth = filterMonth || selectedMonth;
  const displayYear = filterYear || selectedYear;

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    
    // Dashboard handler
    if (onPeriodChange) {
      onPeriodChange(newMonth, displayYear);
    }
    
    // Financial handlers
    if (onMonthChange) onMonthChange(newMonth);
    if (onFilterMonthChange) onFilterMonthChange(newMonth);
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    
    // Dashboard handler
    if (onPeriodChange) {
      onPeriodChange(displayMonth, newYear);
    }
    
    // Financial handlers
    if (onYearChange) onYearChange(newYear);
    if (onFilterYearChange) onFilterYearChange(newYear);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={displayMonth.toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[130px] h-9 text-xs bg-white shadow-sm border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month, index) => (
            <SelectItem key={index + 1} value={(index + 1).toString()} className="text-xs">
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={displayYear.toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[90px] h-9 text-xs bg-white shadow-sm border-gray-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()} className="text-xs">
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});