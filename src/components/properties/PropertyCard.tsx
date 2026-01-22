import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Trash2, Camera } from "lucide-react";
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
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-blue-600">
              {property.location}
            </CardTitle>
            {property.complement && (
              <p className="text-sm text-slate-600 mt-1">
                {property.complement}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(property.status)}
            {hasImages && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Camera className="h-4 w-4" />
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