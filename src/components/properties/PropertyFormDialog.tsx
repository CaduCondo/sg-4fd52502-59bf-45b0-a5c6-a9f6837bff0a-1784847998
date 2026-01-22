import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Camera, Paperclip } from "lucide-react";
import { applyMoneyMask } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import type { Property, Location } from "@/types";
import type { PropertyFormData } from "@/hooks/useProperties";
import { useRef } from "react";

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProperty: Property | null;
  isEditMode: boolean;
  formData: PropertyFormData;
  setFormData: (data: PropertyFormData) => void;
  locations: Location[];
  onSubmit: (e: React.FormEvent) => void;
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
  onEnableEdit,
  onReset,
}: PropertyFormDialogProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const masked = applyMoneyMask(value);
    setFormData({ ...formData, monthly_rent: masked });
  };

  const handleNumberChange = (field: "bedrooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/\D/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData({ ...formData, [field]: limitedValue });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64Data = reader.result as string;
              const fileName = `image_${crypto.randomUUID()}.${file.name.split(".").pop()}`;

              const response = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName, fileData: base64Data }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao fazer upload");
              }

              const result = await response.json();
              resolve(result.filePath);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        images: [...formData.images, ...uploadedUrls],
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Erro ao fazer upload das imagens. Por favor, tente novamente.");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProperty ? (isEditMode ? "Editar Imóvel" : "Detalhes do Imóvel") : "Novo Imóvel"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_id">Local *</Label>
              <Select
                key={open ? "open" : "closed"}
                value={formData.location_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, location_id: value });
                }}
                disabled={editingProperty && !isEditMode}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um local" />
                </SelectTrigger>
                <SelectContent>
                  {[...locations]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                type="text"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                placeholder="Ex: Apto 201, Bloco B, Casa 3..."
                disabled={editingProperty && !isEditMode}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Quartos</Label>
                <Input
                  id="bedrooms"
                  type="text"
                  inputMode="numeric"
                  value={formData.bedrooms}
                  onChange={(e) => handleNumberChange("bedrooms", e.target.value)}
                  placeholder="0"
                  disabled={editingProperty && !isEditMode}
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="text"
                  inputMode="numeric"
                  value={formData.bathrooms}
                  onChange={(e) => handleNumberChange("bathrooms", e.target.value)}
                  placeholder="0"
                  disabled={editingProperty && !isEditMode}
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_rent">Aluguel Mensal (R$) *</Label>
              <Input
                id="monthly_rent"
                type="text"
                inputMode="decimal"
                value={formData.monthly_rent}
                onChange={handleMoneyChange}
                placeholder="0,00"
                required
                disabled={editingProperty && !isEditMode}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="has_furniture">Móveis Planejados</Label>
                <Select
                  value={formData.hasFurniture ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, hasFurniture: value === "yes" })}
                  disabled={editingProperty && !isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accepts_pets">Aceita Pets</Label>
                <Select
                  value={formData.acceptsPets ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, acceptsPets: value === "yes" })}
                  disabled={editingProperty && !isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={editingProperty && !isEditMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="occupied">Ocupado</SelectItem>
                  <SelectItem value="unavailable">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Informações adicionais..."
                disabled={editingProperty && !isEditMode}
              />
            </div>

            <div className="space-y-2">
              <Label>Fotos do Imóvel</Label>
              {formData.images.length > 0 && (
                <AttachmentViewer
                  attachments={formData.images}
                  onRemove={!editingProperty || isEditMode ? handleRemoveImage : undefined}
                />
              )}
              {(!editingProperty || isEditMode) && (
                <div className="flex gap-2">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Tirar Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Anexar Arquivo
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {editingProperty && !isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenChange(false);
                    onReset();
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEnableEdit();
                  }}
                >
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditMode) {
                      onReset();
                    } else {
                      onOpenChange(false);
                      onReset();
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProperty ? "Salvar" : "Cadastrar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}