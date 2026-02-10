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
  Home,
  PawPrint,
  Armchair,
  Maximize,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";
import { InterestFormDialog } from "./InterestFormDialog";
import { ShareButtons } from "./ShareButtons";
import { Lightbox } from "@/components/Lightbox";
import { Property } from "@/types";
import type React from "react";

interface PropertyPublicCardProps {
  property: Property;
}

export function PropertyPublicCard({ property }: PropertyPublicCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = property.images || [];
  const totalMonthly = property.value + (property.hasGarage ? property.garageValue : 0);

  const handleImageClick = () => {
    setShowDetails(true);
  };

  const handleThumbnailClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const handleCloseLightbox = () => {
    setShowLightbox(false);
  };

  const lightboxFiles = images.map((url, index) => ({
    name: `Foto ${index + 1}`,
    url: url,
    type: "image/jpeg",
  }));

  const displayTitle = property.location || property.propertyIdentifier || "Localização não informada";

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
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900">{displayTitle}</h3>
                
                {property.complement && property.complement.trim() !== "" && (
                  <p className="text-sm text-slate-600 mt-1">
                    {property.complement}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 py-3 mt-3 border-t">
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

            <div className="pt-3 border-t">
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

      {showDetails && !showLightbox && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {displayTitle}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {property.complement && property.complement.trim() !== "" && (
                  <span className="block text-slate-600 italic">
                    {property.complement}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {property.description && (
                <div>
                  <h3 className="font-semibold text-base mb-1.5">📝 Descrição</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-base mb-2">🏠 Informações do Imóvel</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {property.rooms > 0 && (
                    <Card className="p-2.5 text-center">
                      <Bed className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
                      <p className="text-xs text-slate-600">Quartos</p>
                      <p className="text-base font-bold">{property.rooms}</p>
                    </Card>
                  )}
                  {property.bathrooms > 0 && (
                    <Card className="p-2.5 text-center">
                      <Bath className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
                      <p className="text-xs text-slate-600">Banheiros</p>
                      <p className="text-base font-bold">{property.bathrooms}</p>
                    </Card>
                  )}
                  {property.area > 0 && (
                    <Card className="p-2.5 text-center">
                      <Maximize className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
                      <p className="text-xs text-slate-600">Área</p>
                      <p className="text-base font-bold">{property.area}m²</p>
                    </Card>
                  )}
                  {property.hasGarage && (
                    <Card className="p-2.5 text-center">
                      <Car className="h-5 w-5 mx-auto mb-1.5 text-blue-600" />
                      <p className="text-xs text-slate-600">Garagem</p>
                      <p className="text-base font-bold">Sim</p>
                    </Card>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">✨ Detalhes Adicionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                    <Armchair className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs font-medium">Móveis Planejados</p>
                      <Badge variant={property.hasFurniture ? "default" : "secondary"} className="mt-0.5 text-xs">
                        {property.hasFurniture ? "✅ Sim" : "❌ Não"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                    <PawPrint className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs font-medium">Aceita Pets</p>
                      <Badge variant={property.acceptsPets ? "default" : "secondary"} className="mt-0.5 text-xs">
                        {property.acceptsPets ? "✅ Sim" : "❌ Não"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                    <Car className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs font-medium">Vaga de Garagem</p>
                      <Badge variant={property.hasGarage ? "default" : "secondary"} className="mt-0.5 text-xs">
                        {property.hasGarage ? "✅ Sim" : "❌ Não"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <h3 className="font-semibold text-base mb-2">💰 Valores</h3>
                <div className="space-y-1.5">
                  {property.hasGarage && property.garageValue > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-700">Aluguel:</span>
                        <span className="text-base font-semibold">
                          {property.value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-700">Garagem:</span>
                        <span className="text-base font-semibold">
                          {property.garageValue.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="border-t pt-1.5 mt-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold">Total Mensal:</span>
                          <span className="text-xl font-bold text-blue-600">
                            {(property.value + property.garageValue).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold">Valor Mensal:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {property.value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
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

              {images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Galeria de Fotos ({images.length})
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Clique em uma foto para visualizar em tela cheia
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {images.map((imageUrl, index) => (
                      <button
                        key={index}
                        onClick={(e) => handleThumbnailClick(index, e)}
                        className="relative aspect-square overflow-hidden rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-all hover:scale-105 group"
                      >
                        <Image
                          src={imageUrl}
                          alt={`${displayTitle} - Foto ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <InterestFormDialog
        open={showInterestForm}
        onOpenChange={setShowInterestForm}
        propertyName={displayTitle}
        propertyId={property.id}
      />

      {showLightbox && (
        <Lightbox
          files={lightboxFiles}
          initialIndex={lightboxIndex}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  );
}