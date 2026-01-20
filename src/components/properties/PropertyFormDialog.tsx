import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { applyMoneyMask, formatCurrency } from "@/lib/masks";
import type { Property, Location } from "@/types";
import type { PropertyFormData } from "@/hooks/useProperties";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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