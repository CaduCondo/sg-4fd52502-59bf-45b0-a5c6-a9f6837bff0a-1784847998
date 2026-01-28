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
  DialogDescription,
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
  Armchair,
  Maximize,
  MessageCircle,
} from "lucide-react";
import { InterestFormDialog } from "./InterestFormDialog";
import { ShareButtons } from "./ShareButtons";
import { Property } from "@/types";

interface PropertyPublicCardProps {
  property: Property;
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

  const displayTitle = property.neighborhood || property.propertyIdentifier || "Imóvel";

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
              {property.city} - {property.state}
            </p>
            {property.complement && (
              <p className="text-sm text-slate-500 mt-1">
                {property.complement}
              </p>
            )}

            {/* Características principais */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 py-2">
              {property.rooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span className="font-medium">{property.rooms} {property.rooms === 1 ? "quarto" : "quartos"}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span className="font-medium">{property.bathrooms} {property.bathrooms === 1 ? "banheiro" : "banheiros"}</span>
                </div>
              )}
              {property.area > 0 && (
                <div className="flex items-center gap-1">
                  <Maximize2 className="h-4 w-4" />
                  <span className="font-medium">{property.area}m²</span>
                </div>
              )}
              {property.hasGarage && (
                <div className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  <span className="font-medium">Garagem</span>
                </div>
              )}
            </div>

            {/* Valor do aluguel */}
            <div className="pt-2 border-t">
              <p className="text-2xl font-bold text-blue-600">
                R$ {totalMonthly.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="text-sm font-normal text-slate-500">/mês</span>
              </p>
              {property.hasGarage && property.garageValue > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Aluguel: R$ {property.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + 
                  Garagem: R$ {property.garageValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">
              {displayTitle}
            </DialogTitle>
            <DialogDescription className="text-base">
              {property.city} - {property.state}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Galeria de Imagens */}
            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
              {images.length > 0 ? (
                <>
                  <Image
                    src={images[currentImageIndex]}
                    alt={`${displayTitle} - Foto ${currentImageIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Home className="h-16 w-16 text-slate-300" />
                </div>
              )}
            </div>

            {/* Descrição */}
            {property.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">📝 Descrição</h3>
                <p className="text-slate-600 leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Informações Principais */}
            <div>
              <h3 className="font-semibold text-lg mb-3">🏠 Informações do Imóvel</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.rooms > 0 && (
                  <Card className="p-4 text-center">
                    <Bed className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-slate-600">Quartos</p>
                    <p className="text-xl font-bold">{property.rooms}</p>
                  </Card>
                )}
                {property.bathrooms > 0 && (
                  <Card className="p-4 text-center">
                    <Bath className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-slate-600">Banheiros</p>
                    <p className="text-xl font-bold">{property.bathrooms}</p>
                  </Card>
                )}
                {property.area > 0 && (
                  <Card className="p-4 text-center">
                    <Maximize className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-slate-600">Área</p>
                    <p className="text-xl font-bold">{property.area}m²</p>
                  </Card>
                )}
                {property.hasGarage && (
                  <Card className="p-4 text-center">
                    <Car className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-slate-600">Garagem</p>
                    <p className="text-xl font-bold">Sim</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Detalhes Adicionais */}
            <div>
              <h3 className="font-semibold text-lg mb-3">✨ Detalhes Adicionais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Armchair className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium">Móveis Planejados</p>
                    <Badge variant={property.hasFurniture ? "default" : "secondary"} className="mt-1">
                      {property.hasFurniture ? "✅ Sim" : "❌ Não"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <PawPrint className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium">Aceita Pets</p>
                    <Badge variant={property.acceptsPets ? "default" : "secondary"} className="mt-1">
                      {property.acceptsPets ? "✅ Sim" : "❌ Não"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Car className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium">Vaga de Garagem</p>
                    <Badge variant={property.hasGarage ? "default" : "secondary"} className="mt-1">
                      {property.hasGarage ? "✅ Sim" : "❌ Não"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Valores */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4">💰 Valores</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Aluguel:</span>
                  <span className="text-xl font-semibold">
                    {property.value.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                {property.hasGarage && property.garageValue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Garagem:</span>
                    <span className="text-xl font-semibold">
                      {property.garageValue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Mensal:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(property.value + (property.hasGarage ? property.garageValue : 0)).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowInterestForm(true)}
                className="flex-1 bg-green-500 hover:bg-green-600"
                size="lg"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Tenho Interesse!
              </Button>
              <ShareButtons propertyName={displayTitle} propertyUrl={`/locations/${property.id}`} />
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