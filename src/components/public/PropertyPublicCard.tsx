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
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Home,
  Check,
  X,
  PawPrint,
  Sofa,
} from "lucide-react";
import { InterestFormDialog } from "./InterestFormDialog";
import { ShareButtons } from "./ShareButtons";
import { PublicProperty } from "@/hooks/usePublicProperties";

interface PropertyPublicCardProps {
  property: PublicProperty;
}

export function PropertyPublicCard({ property }: PropertyPublicCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = property.images || [];
  const hasImages = images.length > 0;
  const mainImage = hasImages ? images[0] : "/placeholder-property.jpg";

  const totalMonthly = property.value + (property.hasGarage ? property.garageValue : 0);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageClick = () => {
    setShowDetails(true);
  };

  const displayTitle = property.locationNeighborhood || property.propertyIdentifier || "Imóvel";

  return (
    <>
      <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-xl">
        <div className="relative aspect-video overflow-hidden" onClick={handleImageClick}>
          {property.images && property.images.length > 0 ? (
            <Image
              src={property.images[0]}
              alt={displayTitle}
              fill
              className="object-cover transition-transform group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100">
              <Home className="h-16 w-16 text-slate-300" />
            </div>
          )}
        </div>

        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{displayTitle}</h3>
            <p className="flex items-center gap-1 text-sm text-slate-600">
              <MapPin className="h-4 w-4" />
              {property.locationCity} - {property.locationState}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {displayTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Galeria de Fotos */}
            {hasImages && (
              <div className="relative h-96 bg-slate-100 rounded-lg overflow-hidden">
                <Image
                  src={images[currentImageIndex]}
                  alt={`Foto ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                      aria-label="Próxima foto"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Identificação e Localização */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Código do Imóvel</p>
                  <p className="font-semibold">{property.propertyIdentifier || "Não informado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Localização</p>
                  <p className="font-semibold">
                    {property.locationNeighborhood && `${property.locationNeighborhood}, `}
                    {property.locationCity} - {property.locationState}
                  </p>
                </div>
              </div>
            </div>

            {/* Descrição Completa */}
            {property.description && (
              <div>
                <h4 className="font-semibold text-lg mb-2">Descrição</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </div>
            )}

            {/* Características Principais */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Características</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.rooms > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Bed className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-600">Quartos</p>
                      <p className="font-semibold">{property.rooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Bath className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-600">Banheiros</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.area > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Maximize2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-600">Área</p>
                      <p className="font-semibold">{property.area}m²</p>
                    </div>
                  </div>
                )}
                {property.hasGarage && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-600">Garagem</p>
                      <p className="font-semibold">Sim</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes Adicionais */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Detalhes Adicionais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Móveis Planejados */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className={`p-2 rounded-full ${property.hasFurniture ? "bg-green-100" : "bg-red-100"}`}>
                    <Sofa className={`h-5 w-5 ${property.hasFurniture ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Móveis Planejados</p>
                    <div className="flex items-center gap-2">
                      {property.hasFurniture ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <p className="font-semibold text-green-600">Sim</p>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <p className="font-semibold text-red-600">Não</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aceita Pets */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className={`p-2 rounded-full ${property.acceptsPets ? "bg-green-100" : "bg-red-100"}`}>
                    <PawPrint className={`h-5 w-5 ${property.acceptsPets ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Aceita Pets</p>
                    <div className="flex items-center gap-2">
                      {property.acceptsPets ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <p className="font-semibold text-green-600">Sim</p>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <p className="font-semibold text-red-600">Não</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Valores Detalhados */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg space-y-3">
              <h4 className="font-semibold text-lg">Valores</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-700">Aluguel</span>
                  <span className="font-semibold">
                    R$ {property.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {property.hasGarage && property.garageValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-700">Garagem</span>
                    <span className="font-semibold">
                      R$ {property.garageValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-blue-900">Total Mensal</span>
                    <span className="font-bold text-blue-900">
                      R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                size="lg"
                onClick={() => {
                  setShowDetails(false);
                  setShowInterestForm(true);
                }}
              >
                Tenho Interesse
              </Button>
              <ShareButtons
                propertyName={displayTitle}
                propertyUrl={`/locations/${property.locationId}`}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Interesse */}
      <InterestFormDialog
        open={showInterestForm}
        onOpenChange={setShowInterestForm}
        propertyName={displayTitle}
        propertyId={property.id}
      />
    </>
  );
}