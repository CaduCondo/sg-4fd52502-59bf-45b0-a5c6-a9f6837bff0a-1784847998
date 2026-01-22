import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bed,
  Bath,
  Car,
  Maximize,
  MapPin,
  Building2,
  Heart,
} from "lucide-react";
import { PublicProperty } from "@/hooks/usePublicProperties";
import { formatCurrency } from "@/lib/masks";
import { ShareButtons } from "./ShareButtons";
import { InterestFormDialog } from "./InterestFormDialog";

interface PropertyListCardProps {
  property: PublicProperty;
}

export function PropertyListCard({ property }: PropertyListCardProps) {
  const [showInterest, setShowInterest] = useState(false);
  
  const photos = property.photos || [];
  const hasPhotos = photos.length > 0;
  const totalAmount =
    property.rentAmount +
    (property.condominiumAmount || 0) +
    (property.iptuAmount || 0);

  const propertyTypes: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    commercial: "Comercial",
    land: "Terreno",
    farm: "Chácara",
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Imagem */}
            <div className="relative w-full sm:w-64 h-48 flex-shrink-0 bg-slate-200">
              {hasPhotos ? (
                <Image
                  src={photos[0]}
                  alt={property.name || "Imóvel"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Building2 className="h-12 w-12 text-slate-400" />
                </div>
              )}
              
              <div className="absolute top-3 left-3">
                <Badge className="bg-blue-600 text-white shadow-lg">
                  {propertyTypes[property.type] || property.type}
                </Badge>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-1">
                    {property.name || "Imóvel sem nome"}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-slate-600 mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {property.neighborhood}, {property.city} - {property.state}
                    </span>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {formatCurrency(totalAmount)}
                  </div>
                  <span className="text-sm text-slate-500">/mês</span>
                </div>
              </div>

              {property.description && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {property.description}
                </p>
              )}

              <div className="flex items-center gap-4 mb-4 text-slate-700">
                {property.bedrooms > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Bed className="h-4 w-4" />
                    <span className="text-sm font-medium">{property.bedrooms}</span>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Bath className="h-4 w-4" />
                    <span className="text-sm font-medium">{property.bathrooms}</span>
                  </div>
                )}
                {property.parkingSpaces > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Car className="h-4 w-4" />
                    <span className="text-sm font-medium">{property.parkingSpaces}</span>
                  </div>
                )}
                {property.area > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Maximize className="h-4 w-4" />
                    <span className="text-sm font-medium">{property.area}m²</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowInterest(true)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Tenho Interesse
                </Button>
                <ShareButtons
                  propertyName={property.name || "Imóvel"}
                  propertyUrl={`/?property=${property.id}`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <InterestFormDialog
        open={showInterest}
        onOpenChange={setShowInterest}
        propertyName={property.name || "Imóvel"}
        propertyId={property.id}
      />
    </>
  );
}