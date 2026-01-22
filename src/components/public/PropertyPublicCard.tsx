import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bed,
  Bath,
  Car,
  Maximize,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Building2,
  Heart,
} from "lucide-react";
import { Property } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { PublicProperty } from "@/hooks/usePublicProperties";
import { ShareButtons } from "./ShareButtons";
import { InterestFormDialog } from "./InterestFormDialog";

interface PropertyPublicCardProps {
  property: PublicProperty;
}

export function PropertyPublicCard({ property }: PropertyPublicCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = property.photos || [];
  const hasPhotos = photos.length > 0;
  const totalAmount =
    property.rentAmount +
    (property.condominiumAmount || 0) +
    (property.iptuAmount || 0);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const propertyTypes: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    commercial: "Comercial",
    land: "Terreno",
    farm: "Chácara",
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
          {hasPhotos ? (
            <Image
              src={photos[0]}
              alt={property.name || "Imóvel"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="h-16 w-16 text-slate-400" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="bg-blue-600 text-white shadow-lg">
              {propertyTypes[property.type] || property.type}
            </Badge>
            {property.locationName && (
              <Badge variant="secondary" className="shadow-lg">
                {property.locationName}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
            {property.name || "Imóvel sem nome"}
          </h3>

          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm line-clamp-1">
              {property.neighborhood}, {property.city} - {property.state}
            </span>
          </div>

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

          <div className="border-t pt-4 mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
              <span className="text-sm text-slate-500">/mês</span>
            </div>
            {(property.condominiumAmount > 0 || property.iptuAmount > 0) && (
              <p className="text-xs text-slate-500">
                Aluguel: {formatCurrency(property.rentAmount)}
                {property.condominiumAmount > 0 &&
                  ` + Cond: ${formatCurrency(property.condominiumAmount)}`}
                {property.iptuAmount > 0 &&
                  ` + IPTU: ${formatCurrency(property.iptuAmount)}`}
              </p>
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
        </CardContent>
      </Card>

      <InterestFormDialog
        open={showInterest}
        onOpenChange={setShowInterest}
        propertyName={property.name || "Imóvel"}
        propertyId={property.id}
      />

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {property.name || "Detalhes do Imóvel"}
            </DialogTitle>
          </DialogHeader>

          {hasPhotos && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-200">
              <Image
                src={photos[currentPhotoIndex]}
                alt={`Foto ${currentPhotoIndex + 1}`}
                fill
                className="object-cover"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg mb-2">Descrição</h4>
              <p className="text-slate-600">
                {property.description || "Sem descrição disponível"}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2">Características</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">Quartos</p>
                    <p className="font-semibold">{property.bedrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">Banheiros</p>
                    <p className="font-semibold">{property.bathrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">Vagas</p>
                    <p className="font-semibold">{property.parkingSpaces}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">Área</p>
                    <p className="font-semibold">{property.area}m²</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2">Endereço</h4>
              <p className="text-slate-600">
                {property.street}, {property.number}
                {property.complement && ` - ${property.complement}`}
                <br />
                {property.neighborhood}, {property.city} - {property.state}
                <br />
                CEP: {property.zipCode}
              </p>
            </div>

            <div className="border-t pt-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="font-semibold text-lg mb-4">Valores</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Aluguel:</span>
                    <span className="font-semibold">
                      {formatCurrency(property.rentAmount)}
                    </span>
                  </div>
                  {property.condominiumAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Condomínio:</span>
                      <span className="font-semibold">
                        {formatCurrency(property.condominiumAmount)}
                      </span>
                    </div>
                  )}
                  {property.iptuAmount > 0 && (
                    <div className="flex justify-between">
                      <span>IPTU:</span>
                      <span className="font-semibold">
                        {formatCurrency(property.iptuAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-lg">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(totalAmount)}/mês
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}