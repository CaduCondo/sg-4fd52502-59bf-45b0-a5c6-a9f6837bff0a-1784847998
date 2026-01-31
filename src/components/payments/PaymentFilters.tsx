import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentFiltersProps {
  selectedMonth: string;
  selectedYear: string;
  statusFilter: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function PaymentFilters({
  selectedMonth,
  selectedYear,
  statusFilter,
  onMonthChange,
  onYearChange,
  onStatusChange,
}: PaymentFiltersProps) {
  const months = [
    { value: "all", label: "Todos os meses" },
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto">
      <Select value={selectedMonth} onValueChange={onMonthChange}>
        <SelectTrigger className="w-full sm:w-[180px] h-11 sm:h-10 touch-target">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem 
              key={month.value} 
              value={month.value}
              className="touch-target"
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger className="w-full sm:w-[140px] h-11 sm:h-10 touch-target">
          <SelectValue placeholder="Todos os anos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="touch-target">Todos os anos</SelectItem>
          {years.map((year) => (
            <SelectItem 
              key={year} 
              value={year}
              className="touch-target"
            >
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}