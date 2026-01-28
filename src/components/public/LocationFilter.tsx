import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface LocationFilterProps {
  locations: Array<{ id: string; name: string; city: string; neighborhood: string }>;
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function LocationFilter({
  locations,
  selectedLocation,
  onLocationChange,
}: LocationFilterProps) {
  // Filter out locations with empty IDs to prevent Select error
  const validLocations = locations.filter(loc => loc.id && loc.id.trim() !== "");

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-slate-500" />
      <Select value={selectedLocation} onValueChange={onLocationChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Todos os locais" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os locais</SelectItem>
          {validLocations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.city} - {location.neighborhood}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}