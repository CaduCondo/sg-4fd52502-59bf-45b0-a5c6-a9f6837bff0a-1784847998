import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Grid3x3, List, ChevronDown, Filter } from "lucide-react";
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
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
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
  viewMode,
  setViewMode,
  totalCount,
}: PropertyFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Counter - Always visible */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground font-medium">
          {totalCount} {totalCount === 1 ? "imóvel encontrado" : "imóveis encontrados"}
        </div>
      </div>

      {/* Search Bar - Full width on mobile */}
      <div className="w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por local, complemento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 sm:h-9 text-sm mobile-input"
          />
        </div>
      </div>

      {/* Filters Row - Responsive layout */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Location Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto sm:min-w-[180px] justify-between h-10 sm:h-9 text-sm">
              <span className="truncate flex items-center gap-2">
                <Filter className="h-4 w-4 flex-shrink-0" />
                {selectedLocations.length === 0
                  ? "Todos os Locais"
                  : selectedLocations.length === 1
                  ? locations.find((l) => l.id === selectedLocations[0])?.name
                  : `${selectedLocations.length} locais`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] sm:w-[320px] p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto p-3 smooth-scroll">
              {[...locations]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center space-x-3 rounded-md px-3 py-2.5 hover:bg-accent transition-colors touch-target"
                  >
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                      className="flex-shrink-0"
                    />
                    <label 
                      htmlFor={`location-${location.id}`}
                      className="flex-1 text-sm cursor-pointer leading-relaxed"
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
                  className="w-full h-9"
                  onClick={() => setSelectedLocations([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9 text-sm">
            <SelectValue placeholder="Todos Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="occupied">Ocupado</SelectItem>
            <SelectItem value="unavailable">Indisponível</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
          <SelectTrigger className="w-full sm:flex-1 sm:max-w-[200px] h-10 sm:h-9 text-sm">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alfabético (A-Z)</SelectItem>
            <SelectItem value="price-asc">Valor: Menor → Maior</SelectItem>
            <SelectItem value="price-desc">Valor: Maior → Menor</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle - Hidden on mobile, shown on desktop */}
        <div className="hidden sm:flex gap-1 border rounded-lg p-1 flex-shrink-0">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-7 w-9 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-7 w-9 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}