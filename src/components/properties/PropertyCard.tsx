import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Trash2, Camera, MapPin } from "lucide-react";
import type { Property } from "@/types";
import { memo } from "react";

interface PropertyCardProps {
  property: Property;
  onCardClick: (property: Property) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
  locationName?: string;
}

export const PropertyCard = memo(function PropertyCard({ property, onCardClick, onDeleteClick, locationName }: PropertyCardProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      available: "default",
      occupied: "secondary",
      unavailable: "destructive",
    };
    const labels: Record<string, string> = {
      available: "Disponível",
      occupied: "Ocupado",
      unavailable: "Indisponível",
    };
    return <Badge variant={variants[status]} className="text-xs font-medium px-2 py-0.5">{labels[status]}</Badge>;
  };

  const hasImages = property.images && property.images.length > 0;

  return (
    <Card 
      className="card-hover-effect touch-target-card border shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onCardClick(property)}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {locationName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>
            )}
            <h3 className="text-xl font-bold text-primary leading-tight line-clamp-1">
              {property.location}
            </h3>
            {(property.complement || property.propertyIdentifier) && (
              <p className="text-base text-muted-foreground line-clamp-1">
                {property.complement || property.propertyIdentifier}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasImages && (
              <div 
                className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/50" 
                title={`${property.images?.length || 0} fotos`}
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            {getStatusBadge(property.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {property.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {property.description}
          </p>
        )}

        {(property.rooms || property.bathrooms) && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {property.rooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{property.rooms} {property.rooms === 1 ? 'Quarto' : 'Quartos'}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{property.bathrooms} {property.bathrooms === 1 ? 'Banheiro' : 'Banheiros'}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 mt-2 border-t gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-primary">
              {property.value?.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => onDeleteClick(e, property.id)}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});