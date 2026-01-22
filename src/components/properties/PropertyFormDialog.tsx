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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isReadOnly ? "Visualizar Imóvel" : isEditMode ? "Editar Imóvel" : "Novo Imóvel"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isReadOnly
              ? "Visualize as informações do imóvel"
              : isEditMode
              ? "Atualize as informações do imóvel"
              : "Preencha as informações do novo imóvel"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Linha 1: Local e Complemento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="location_id" className="text-xs">
                Local *
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_id: value })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger id="location_id" className="h-8 text-sm">
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

            <div className="space-y-1">
              <Label htmlFor="complement" className="text-xs">
                Complemento
              </Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) =>
                  setFormData({ ...formData, complement: e.target.value })
                }
                placeholder="Ex: Apto 102, Bloco A"
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Linha 2: Quartos, Banheiros, Área e Valor Aluguel */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rooms" className="text-xs">
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
                placeholder="Ex: 3"
                required
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bathrooms" className="text-xs">
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
                placeholder="Ex: 2"
                required
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="area" className="text-xs">
                Área (m²) *
              </Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                placeholder="Ex: 80"
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="monthly_rent" className="text-xs">
                Valor Aluguel:
              </Label>
              <Input
                id="monthly_rent"
                value={formData.monthly_rent}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value);
                  setFormData({ ...formData, monthly_rent: formatted });
                }}
                placeholder="R$ 0,00"
                className="h-8 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">
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
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="occupied">Ocupado</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasFurniture"
                checked={formData.hasFurniture}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasFurniture: checked as boolean })
                }
                disabled={isReadOnly}
              />
              <Label htmlFor="hasFurniture" className="text-xs cursor-pointer">
                Móveis Planejados
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptsPets"
                checked={formData.acceptsPets}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsPets: checked as boolean })
                }
                disabled={isReadOnly}
              />
              <Label htmlFor="acceptsPets" className="text-xs cursor-pointer">
                Aceita Pets
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGarage"
                checked={formData.hasGarage}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasGarage: checked as boolean })
                }
                disabled={isReadOnly}
              />
              <Label htmlFor="hasGarage" className="text-xs cursor-pointer">
                Vaga Garagem
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm resize-none"
              placeholder="Descreva o imóvel..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          {!isReadOnly && (
            <div className="space-y-2">
              <Label className="text-xs">Fotos do Imóvel</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="h-8 text-xs flex-1"
                >
                  <ImageIcon className="h-3 w-3 mr-2" />
                  Selecionar Fotos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("camera-capture")?.click()}
                  className="h-8 text-xs flex-1"
                >
                  <Camera className="h-3 w-3 mr-2" />
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

          {isReadOnly && formData.images.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Fotos do Imóvel</Label>
              <div className="grid grid-cols-4 gap-2">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {showEditButton && (
              <Button type="button" onClick={handleEditClick} variant="default" size="sm">
                <Pencil className="h-3 w-3 mr-2" />
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
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} size="sm">
                  {isSubmitting ? "Salvando..." : isEditMode ? "Atualizar" : "Criar"}
                </Button>
              </>
            )}
            {isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
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