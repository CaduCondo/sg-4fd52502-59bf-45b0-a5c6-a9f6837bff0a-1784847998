import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter } from "lucide-react";

interface PeriodSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  // Props opcionais para quando houver botão de filtrar separado
  filterMonth?: number;
  filterYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
  onFilterMonthChange?: (month: number) => void;
  onFilterYearChange?: (year: number) => void;
  // Prop legada para compatibilidade com outras páginas (mudança imediata)
  onPeriodChange?: (month: number, year: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function PeriodSelector({ 
  selectedMonth, 
  selectedYear, 
  onMonthChange,
  onYearChange,
  onFilterMonthChange,
  onFilterYearChange,
  onPeriodChange 
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    
    // Novo padrão: atualiza apenas o estado da seleção
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
    
    // Padrão legado: atualiza tudo imediatamente
    if (onPeriodChange) {
      onPeriodChange(newMonth, selectedYear);
    }
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    
    // Novo padrão: atualiza apenas o estado da seleção
    if (onYearChange) {
      onYearChange(newYear);
    }
    
    // Padrão legado: atualiza tudo imediatamente
    if (onPeriodChange) {
      onPeriodChange(selectedMonth, newYear);
    }
  };

  const handleApplyFilter = () => {
    if (onFilterMonthChange) onFilterMonthChange(selectedMonth);
    if (onFilterYearChange) onFilterYearChange(selectedYear);
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

      {/* Renderiza botão de filtrar apenas se as funções de filtro forem fornecidas */}
      {onFilterMonthChange && onFilterYearChange && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleApplyFilter}
          className="h-9 gap-2"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtrar
        </Button>
      )}
    </div>
  );
}