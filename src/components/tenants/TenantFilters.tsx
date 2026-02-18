import { memo, useMemo } from "react";
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
  const countText = useMemo(() => 
    `${totalCount} ${totalCount === 1 ? "inquilino encontrado" : "inquilinos encontrados"}`,
    [totalCount]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground font-medium">
          {countText}
        </div>
        
        <div className="hidden lg:flex gap-3">
          <div className="w-[140px] text-sm font-medium text-foreground">Status:</div>
          <div className="w-[140px] text-sm font-medium text-foreground">Ordenação:</div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="hidden lg:flex gap-3 ml-auto">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: "alphabetical" | "recent") => onSortChange(value)}>
            <SelectTrigger className="w-[140px] h-10">
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
});