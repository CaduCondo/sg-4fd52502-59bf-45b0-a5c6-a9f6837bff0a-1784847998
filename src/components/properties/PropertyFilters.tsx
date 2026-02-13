import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronDown, Filter } from "lucide-react";
import type { Location } from "@/types";

interface PropertyFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  locations: Location[];
  selectedLocations: string[];
  handleLocationToggle: (locationId: string) => void;
  setSelectedLocations: (locations: string[]) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortOrder: "alphabetical" | "price-asc" | "price-desc";
  setSortOrder: (order: "alphabetical" | "price-asc" | "price-desc") => void;
  totalCount: number;
}

export function PropertyFilters({
  searchTerm,
  setSearchTerm,
  locations,
  selectedLocations,
  handleLocationToggle,
  setSelectedLocations,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  totalCount,
}: PropertyFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Counter à esquerda + Labels alinhados com combos */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground font-medium">
          {totalCount} {totalCount === 1 ? "imóvel encontrado" : "imóveis encontrados"}
        </div>
        
        {/* Labels em colunas alinhadas aos combos */}
        <div className="hidden lg:flex gap-3">
          <div className="w-[160px] text-sm font-medium text-foreground">Locais:</div>
          <div className="w-[140px] text-sm font-medium text-foreground">Status:</div>
          <div className="w-[140px] text-sm font-medium text-foreground">Ordenação:</div>
        </div>
      </div>

      {/* Linha 2: Search + Combos alinhados aos labels */}
      <div className="flex gap-3">
        {/* Search Bar */}
        <div className="flex-1 lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Combos com mesmas larguras dos labels */}
        <div className="hidden lg:flex gap-3">
          {/* Location Filter - 160px */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-between h-10">
                <span className="truncate flex items-center gap-2">
                  <Filter className="h-4 w-4 flex-shrink-0" />
                  {selectedLocations.length === 0
                    ? "Locais"
                    : selectedLocations.length === 1
                    ? locations.find((l) => l.id === selectedLocations[0])?.name
                    : `${selectedLocations.length} locais`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-3 smooth-scroll">
                {[...locations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        id={`location-${location.id}`}
                        checked={selectedLocations.includes(location.id)}
                        onCheckedChange={() => handleLocationToggle(location.id)}
                        className="flex-shrink-0"
                      />
                      <label 
                        htmlFor={`location-${location.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        {location.name}
                      </label>
                    </div>
                  ))}
              </div>
              {selectedLocations.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => setSelectedLocations([])}
                  >
                    Limpar
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Status Filter - 140px */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="occupied">Ocupado</SelectItem>
              <SelectItem value="unavailable">Indisponível</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order - 140px */}
          <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="price-asc">Menor Valor</SelectItem>
              <SelectItem value="price-desc">Maior Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}