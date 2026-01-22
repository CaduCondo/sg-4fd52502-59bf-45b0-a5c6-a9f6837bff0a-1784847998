import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface LocationFilterProps {
  locations: Array<{ id: string; name: string }>;
  selectedLocation: string;
  onSelectLocation: (locationId: string) => void;
}

export function LocationFilter({
  locations,
  selectedLocation,
  onSelectLocation,
}: LocationFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-slate-700">
        <MapPin className="h-5 w-5" />
        <span className="font-medium">Localização:</span>
      </div>
      
      <Badge
        variant={selectedLocation === "all" ? "default" : "outline"}
        className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
        onClick={() => onSelectLocation("all")}
      >
        Todos
      </Badge>

      {locations.map((location) => (
        <Badge
          key={location.id}
          variant={selectedLocation === location.id ? "default" : "outline"}
          className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
          onClick={() => onSelectLocation(location.id)}
        >
          {location.name}
        </Badge>
      ))}
    </div>
  );
}