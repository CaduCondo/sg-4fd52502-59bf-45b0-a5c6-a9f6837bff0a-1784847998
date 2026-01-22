import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Upload } from "lucide-react";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { formatCurrencyInput } from "@/lib/masks";
import type { PropertyFormData } from "@/hooks/useProperties";
import type { Location } from "@/types";

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProperty: any | null;
  isEditMode: boolean;
  formData: PropertyFormData;
  setFormData: (data: PropertyFormData) => void;
  locations: Location[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onEnableEdit: () => void;
  onReset: () => void;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  editingProperty,
  isEditMode,
  formData,
  setFormData,
  locations,
  onSubmit,
}: PropertyFormDialogProps) {
  const handleNumberChange = (field: "rooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/\D/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData({ ...formData, [field]: limitedValue });
  };

  const handleMoneyChange = (field: "monthly_rent", value: string) => {
    const maskedValue = formatCurrencyInput(value);
    setFormData({ ...formData, [field]: maskedValue });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        console.error("Erro ao fazer upload da imagem:", error);
      }
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...uploadedUrls],
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditMode ? "Editar Imóvel" : "Novo Imóvel"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Linha 1: Local e Código */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="location_id" className="text-xs">Local *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_id: value })
                }
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
              <Label htmlFor="property_identifier" className="text-xs">Código do Imóvel *</Label>
              <Input
                id="property_identifier"
                value={formData.property_identifier}
                onChange={(e) =>
                  setFormData({ ...formData, property_identifier: e.target.value })
                }
                required
                placeholder="Ex: AP-001"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Linha 2: Complemento */}
          <div className="space-y-1">
            <Label htmlFor="complement" className="text-xs">Complemento</Label>
            <Input
              id="complement"
              value={formData.complement}
              onChange={(e) =>
                setFormData({ ...formData, complement: e.target.value })
              }
              placeholder="Ex: Apto 102, Bloco A"
              className="h-8 text-sm"
            />
          </div>

          {/* Linha 3: Quartos, Banheiros, Área, Valor */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rooms" className="text-xs">Quartos</Label>
              <Input
                id="rooms"
                type="text"
                inputMode="numeric"
                value={formData.rooms}
                onChange={(e) => handleNumberChange("rooms", e.target.value)}
                placeholder="0"
                maxLength={2}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bathrooms" className="text-xs">Banheiros</Label>
              <Input
                id="bathrooms"
                type="text"
                inputMode="numeric"
                value={formData.bathrooms}
                onChange={(e) => handleNumberChange("bathrooms", e.target.value)}
                placeholder="0"
                maxLength={2}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="area" className="text-xs">Área (m²)</Label>
              <Input
                id="area"
                type="text"
                inputMode="decimal"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="monthly_rent" className="text-xs">Valor *</Label>
              <Input
                id="monthly_rent"
                value={formData.monthly_rent}
                onChange={(e) => handleMoneyChange("monthly_rent", e.target.value)}
                required
                placeholder="0,00"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Linha 4: Status */}
          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "available" | "occupied" | "unavailable") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="status" className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="occupied">Ocupado</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha 5: Checkboxes */}
          <div className="space-y-1">
            <Label className="text-xs">Características</Label>
            <div className="flex gap-4 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasFurniture"
                  checked={formData.hasFurniture}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasFurniture: checked as boolean })
                  }
                />
                <Label htmlFor="hasFurniture" className="text-xs font-normal cursor-pointer">
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
                />
                <Label htmlFor="acceptsPets" className="text-xs font-normal cursor-pointer">
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
                />
                <Label htmlFor="hasGarage" className="text-xs font-normal cursor-pointer">
                  Vaga Garagem
                </Label>
              </div>
            </div>
          </div>

          {/* Linha 6: Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descreva as características do imóvel..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Linha 7: Imagens */}
          <div className="space-y-1">
            <Label className="text-xs">Fotos do Imóvel</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("image-upload")?.click()}
              className="h-8"
            >
              <Upload className="h-3 w-3 mr-2" />
              Selecionar Fotos
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            {formData.images.length > 0 && (
              <div className="mt-2">
                <AttachmentViewer
                  attachments={formData.images}
                  onRemove={handleRemoveImage}
                />
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              {isEditMode ? "Atualizar" : "Criar Imóvel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}