import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { memo } from "react";

interface PeriodSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange?: (month: number, year: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const PeriodSelector = memo(function PeriodSelector({ 
  selectedMonth, 
  selectedYear, 
  onPeriodChange 
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    if (onPeriodChange) {
      onPeriodChange(newMonth, selectedYear);
    }
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    if (onPeriodChange) {
      onPeriodChange(selectedMonth, newYear);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedMonth.toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[130px] h-9 text-xs bg-white">
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
        value={selectedYear.toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[90px] h-9 text-xs bg-white">
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