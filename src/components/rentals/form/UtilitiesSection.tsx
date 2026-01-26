import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyCurrencyMask } from "@/lib/masks";
import type { RentalFormSectionProps } from "../types/rentalForm.types";

export function UtilitiesSection({ formData, onFieldChange }: RentalFormSectionProps) {
  const responsibilities = [
    { value: "landlord", label: "Proprietário" },
    { value: "tenant", label: "Inquilino" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Contas de Consumo</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Água */}
        <div className="space-y-2 border p-3 rounded bg-muted/10">
          <Label className="font-semibold text-blue-600">Água</Label>
          <div className="space-y-2">
            <Label htmlFor="water" className="text-xs">Valor Estimado</Label>
            <Input
              id="water"
              value={formData.water}
              onChange={(e) => onFieldChange("water", applyCurrencyMask(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Responsabilidade</Label>
            <Select 
              value={formData.waterResponsibility} 
              onValueChange={(value) => onFieldChange("waterResponsibility", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {responsibilities.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Luz */}
        <div className="space-y-2 border p-3 rounded bg-muted/10">
          <Label className="font-semibold text-yellow-600">Luz</Label>
          <div className="space-y-2">
            <Label htmlFor="electricity" className="text-xs">Valor Estimado</Label>
            <Input
              id="electricity"
              value={formData.electricity}
              onChange={(e) => onFieldChange("electricity", applyCurrencyMask(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Responsabilidade</Label>
            <Select 
              value={formData.electricityResponsibility} 
              onValueChange={(value) => onFieldChange("electricityResponsibility", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {responsibilities.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gás */}
        <div className="space-y-2 border p-3 rounded bg-muted/10">
          <Label className="font-semibold text-red-600">Gás</Label>
          <div className="space-y-2">
            <Label htmlFor="gas" className="text-xs">Valor Estimado</Label>
            <Input
              id="gas"
              value={formData.gas}
              onChange={(e) => onFieldChange("gas", applyCurrencyMask(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Responsabilidade</Label>
            <Select 
              value={formData.gasResponsibility} 
              onValueChange={(value) => onFieldChange("gasResponsibility", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {responsibilities.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}