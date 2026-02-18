import { memo } from "react";
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

export const TenantFilters = memo(function TenantFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  totalCount,
}: TenantFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3 items-end">
        <div className="flex-1 lg:max-w-lg space-y-1">
          <div className="text-sm text-muted-foreground font-medium">
            {totalCount} {totalCount === 1 ? "inquilino encontrado" : "inquilinos encontrados"}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar inquilinos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status:
            </label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Ordenação:
            </label>
            <Select value={sortBy} onValueChange={(value: "alphabetical" | "recent") => onSortChange(value)}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm">
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
    </div>
  );
});