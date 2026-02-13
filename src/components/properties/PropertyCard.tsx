import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Trash2, Camera, DollarSign, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
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
    return <Badge variant={variants[status]} className="text-xs sm:text-sm">{labels[status]}</Badge>;
  };

  const hasImages = property.images && property.images.length > 0;

  return (
    <Card 
      className="card-hover-effect touch-target-card"
      onClick={() => onCardClick(property)}
    >
      <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {locationName && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1.5">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>
            )}
            <CardTitle className="text-base sm:text-lg font-bold text-primary line-clamp-1">
              {property.location}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
              {property.complement || property.propertyIdentifier || "Sem complemento"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {getStatusBadge(property.status)}
            {hasImages && (
              <div className="flex items-center justify-center" title={`${property.images?.length || 0} fotos`}>
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-4 sm:p-6">
        <div className="space-y-2">
          {property.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          )}

          {(property.rooms || property.bathrooms) && (
            <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              {property.rooms && (
                <div className="flex items-center gap-1.5">
                  <Bed className="h-4 w-4 flex-shrink-0" />
                  <span>{property.rooms} Quartos</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4 flex-shrink-0" />
                  <span>{property.bathrooms} Banheiros</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 mt-2 border-t gap-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0 flex-1">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base truncate">
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
              className="h-9 w-9 sm:h-10 sm:w-10 p-0 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});