import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface TenantFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: "alphabetical" | "recent";
  onSortChange: (value: "alphabetical" | "recent") => void;
  totalCount: number;
}

export function TenantFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  totalCount,
}: TenantFiltersProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-xs sm:text-sm text-muted-foreground font-medium">
        {totalCount} {totalCount === 1 ? "inquilino encontrado" : "inquilinos encontrados"}
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar inquilinos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 sm:h-9 text-sm mobile-input"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: "alphabetical" | "recent") => onSortChange(value)}>
            <SelectTrigger className="w-full sm:flex-1 sm:max-w-[160px] h-10 sm:h-9 text-sm">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="recent">Recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}