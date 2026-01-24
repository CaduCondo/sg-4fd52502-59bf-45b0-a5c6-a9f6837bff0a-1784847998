import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Grid3x3, List, ChevronDown } from "lucide-react";
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
}: PropertyFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por local, complemento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between">
                <span className="truncate">
                  {selectedLocations.length === 0
                    ? "Todos os Locais"
                    : selectedLocations.length === 1
                    ? locations.find((l) => l.id === selectedLocations[0])?.name
                    : `${selectedLocations.length} locais`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {[...locations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        id={`location-${location.id}`}
                        checked={selectedLocations.includes(location.id)}
                        onCheckedChange={() => handleLocationToggle(location.id)}
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
                    className="w-full"
                    onClick={() => setSelectedLocations([])}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="occupied">Ocupado</SelectItem>
              <SelectItem value="unavailable">Indisponível</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alfabético (A-Z)</SelectItem>
              <SelectItem value="price-asc">Valor: Menor → Maior</SelectItem>
              <SelectItem value="price-desc">Valor: Maior → Menor</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}