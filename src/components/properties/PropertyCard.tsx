import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, DollarSign, Camera, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
  onCardClick: (property: Property) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
}

export function PropertyCard({ property, onCardClick, onDeleteClick }: PropertyCardProps) {
  const getStatusColor = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      available: "default",
      occupied: "secondary",
      unavailable: "destructive",
    };
    return variants[status] || "default";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: "Disponível",
      occupied: "Ocupado",
      unavailable: "Indisponível",
    };
    return labels[status];
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onCardClick(property)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span>{property.location || "Local não definido"}</span>
            </div>
            {property.complement && (
              <p className="text-xs text-muted-foreground ml-6">
                {property.complement}
              </p>
            )}
          </div>
          <Badge variant={getStatusColor(property.status)}>
            {getStatusLabel(property.status)}
          </Badge>
        </div>

        {property.images && property.images.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Camera className="h-3 w-3" />
            <span>{property.images.length} {property.images.length === 1 ? 'foto' : 'fotos'}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-3">
          {(property.rooms || property.bedrooms || property.bathrooms) && (
            <div className="flex gap-3 text-sm text-muted-foreground">
              {(property.rooms || property.bedrooms) && (
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{property.rooms || property.bedrooms} Quartos</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms} Banheiros</span>
                </div>
              )}
            </div>
          )}

          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 mt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Aluguel</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(property.value || property.monthly_rent || 0)}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => onDeleteClick(e, property.id)}
              className="flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}