import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Pencil, ImageIcon, Camera } from "lucide-react";
import { PropertyFormData } from "@/hooks/useProperties";
import { formatCurrencyInput } from "@/lib/masks";

interface Location {
  id: string;
  name: string;
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: PropertyFormData;
  setFormData: (data: PropertyFormData) => void;
  isEditMode: boolean;
  locations: Location[];
  handleNumberChange: (field: "rooms" | "bathrooms", value: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  isSubmitting: boolean;
  viewOnly?: boolean;
  onEdit?: () => void;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  formData,
  setFormData,
  isEditMode,
  locations,
  handleNumberChange,
  handleImageUpload,
  removeImage,
  isSubmitting,
  viewOnly = false,
  onEdit,
}: PropertyFormDialogProps) {
  const [isInternalEditMode, setIsInternalEditMode] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsInternalEditMode(false);
    }
  }, [open]);

  const isReadOnly = viewOnly && !isInternalEditMode;
  const showEditButton = viewOnly && !isInternalEditMode && isEditMode;

  const handleEditClick = () => {
    setIsInternalEditMode(true);
    if (onEdit) {
      onEdit();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
    setIsInternalEditMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {isReadOnly ? "Visualizar Imóvel" : isEditMode ? "Editar Imóvel" : "Novo Imóvel"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isReadOnly
              ? "Visualize as informações do imóvel"
              : isEditMode
              ? "Atualize as informações do imóvel"
              : "Preencha as informações do novo imóvel"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Linha 1: Local e Complemento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_id" className="text-sm font-medium">
                Local *
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_id: value })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger id="location_id" className="h-11 sm:h-10 text-sm mobile-input">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement" className="text-sm font-medium">
                Complemento
              </Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) =>
                  setFormData({ ...formData, complement: e.target.value })
                }
                placeholder="Ex: Apto 102, Bloco A"
                className="h-11 sm:h-10 text-sm mobile-input"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Linha 2: Quartos, Banheiros, Área e Valor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="rooms" className="text-sm font-medium">
                Quartos *
              </Label>
              <Input
                id="rooms"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.rooms}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, rooms: value });
                }}
                placeholder="3"
                required
                className="h-11 sm:h-10 text-sm mobile-input"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-sm font-medium">
                Banheiros *
              </Label>
              <Input
                id="bathrooms"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.bathrooms}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, bathrooms: value });
                }}
                placeholder="2"
                required
                className="h-11 sm:h-10 text-sm mobile-input"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm font-medium">
                Área (m²) *
              </Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                placeholder="80"
                className="h-11 sm:h-10 text-sm mobile-input"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_rent" className="text-sm font-medium">
                Valor
              </Label>
              <Input
                id="monthly_rent"
                value={formData.monthly_rent}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value);
                  setFormData({ ...formData, monthly_rent: formatted });
                }}
                placeholder="R$ 0,00"
                className="h-11 sm:h-10 text-sm mobile-input"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as "available" | "occupied" | "unavailable",
                })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-11 sm:h-10 text-sm mobile-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="occupied">Ocupado</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes - Mobile optimized */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="hasFurniture"
                checked={formData.hasFurniture}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasFurniture: checked as boolean })
                }
                disabled={isReadOnly}
                className="h-5 w-5"
              />
              <Label htmlFor="hasFurniture" className="text-sm cursor-pointer font-normal">
                Móveis Planejados
              </Label>
            </div>

            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="acceptsPets"
                checked={formData.acceptsPets}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsPets: checked as boolean })
                }
                disabled={isReadOnly}
                className="h-5 w-5"
              />
              <Label htmlFor="acceptsPets" className="text-sm cursor-pointer font-normal">
                Aceita Pets
              </Label>
            </div>

            <div className="flex items-center space-x-3 touch-target">
              <Checkbox
                id="hasGarage"
                checked={formData.hasGarage}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasGarage: checked as boolean })
                }
                disabled={isReadOnly}
                className="h-5 w-5"
              />
              <Label htmlFor="hasGarage" className="text-sm cursor-pointer font-normal">
                Vaga Garagem
              </Label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm resize-none min-h-[80px] mobile-input"
              placeholder="Descreva o imóvel..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {/* Image Upload - Edit mode only */}
          {!isReadOnly && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fotos do Imóvel</Label>
              
              {/* Existing Images Gallery with Remove Button */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative aspect-video group">
                      <img
                        src={image}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="h-11 sm:h-10 text-sm touch-target"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Selecionar Fotos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("camera-capture")?.click()}
                  className="h-11 sm:h-10 text-sm touch-target"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto
                </Button>
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                id="camera-capture"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Image Gallery - View mode */}
          {isReadOnly && formData.images.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fotos do Imóvel</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative aspect-video">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons - Mobile optimized */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t">
            {showEditButton && (
              <Button 
                type="button" 
                onClick={handleEditClick} 
                variant="default" 
                className="h-11 sm:h-10 touch-target"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar Imóvel
              </Button>
            )}
            {!isReadOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="h-11 sm:h-10 touch-target"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="h-11 sm:h-10 touch-target"
                >
                  {isSubmitting ? "Salvando..." : isEditMode ? "Atualizar" : "Criar"}
                </Button>
              </>
            )}
            {isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 sm:h-10 touch-target"
              >
                Fechar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}