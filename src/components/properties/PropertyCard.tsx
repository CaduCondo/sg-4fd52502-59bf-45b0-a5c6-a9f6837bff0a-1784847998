import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Trash2, Camera, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
  onCardClick: (property: Property) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
}

export function PropertyCard({ property, onCardClick, onDeleteClick }: PropertyCardProps) {
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
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const hasImages = property.images && property.images.length > 0;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onCardClick(property)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-primary">
              {property.location}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {property.propertyIdentifier || property.complement || "Sem identificador"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(property.status)}
            {hasImages && (
              <div className="flex items-center justify-center pr-1" title={`${property.images?.length || 0} fotos`}>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="space-y-1.5">
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
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">
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