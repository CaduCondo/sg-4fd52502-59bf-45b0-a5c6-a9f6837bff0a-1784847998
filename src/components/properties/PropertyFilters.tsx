import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronDown, Filter } from "lucide-react";
import type { Location } from "@/types";
import { memo, useMemo } from "react";

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

const LocationFilterButton = memo(function LocationFilterButton({
  selectedLocations,
  locations,
}: {
  selectedLocations: string[];
  locations: Location[];
}) {
  const buttonText = useMemo(() => {
    if (selectedLocations.length === 0) return "Locais";
    if (selectedLocations.length === 1) {
      return locations.find((l) => l.id === selectedLocations[0])?.name;
    }
    return `${selectedLocations.length} locais`;
  }, [selectedLocations, locations]);

  return (
    <span className="truncate flex items-center gap-2">
      <Filter className="h-4 w-4 flex-shrink-0" />
      {buttonText}
    </span>
  );
});

const LocationList = memo(function LocationList({
  locations,
  selectedLocations,
  handleLocationToggle,
}: {
  locations: Location[];
  selectedLocations: string[];
  handleLocationToggle: (locationId: string) => void;
}) {
  const sortedLocations = useMemo(() => 
    [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );

  return (
    <div className="max-h-[300px] overflow-y-auto p-3 smooth-scroll">
      {sortedLocations.map((location) => (
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
  );
});

export const PropertyFilters = memo(function PropertyFilters({
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
  const countText = useMemo(() => 
    `${totalCount} ${totalCount === 1 ? "imóvel encontrado" : "imóveis encontrados"}`,
    [totalCount]
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground font-medium">
          {countText}
        </div>
        
        <div className="hidden lg:flex gap-3">
          <div className="w-[160px] text-sm font-medium text-foreground">Locais:</div>
          <div className="w-[140px] text-sm font-medium text-foreground">Status:</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div className="flex-1 lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="property-filters-search"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
        </div>

        {/* Filtros Mobile - Grid de 2 colunas */}
        <div className="grid grid-cols-2 gap-2 lg:hidden w-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="property-filters-location-mobile" variant="outline" className="justify-between h-10 text-xs px-2">
                <LocationFilterButton 
                  selectedLocations={selectedLocations}
                  locations={locations}
                />
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <LocationList
                locations={locations}
                selectedLocations={selectedLocations}
                handleLocationToggle={handleLocationToggle}
              />
              {selectedLocations.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    id="property-filters-clear-mobile"
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="property-filters-status-mobile" className="h-10 text-xs px-2">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="occupied">Ocupado</SelectItem>
              <SelectItem value="unavailable">Indisponível</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtros Desktop */}
        <div className="hidden lg:flex gap-3 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="property-filters-location-desktop" variant="outline" className="w-[160px] justify-between h-10">
                <LocationFilterButton 
                  selectedLocations={selectedLocations}
                  locations={locations}
                />
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <LocationList
                locations={locations}
                selectedLocations={selectedLocations}
                handleLocationToggle={handleLocationToggle}
              />
              {selectedLocations.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    id="property-filters-clear-desktop"
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="property-filters-status-desktop" className="w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="occupied">Ocupado</SelectItem>
              <SelectItem value="unavailable">Indisponível</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});