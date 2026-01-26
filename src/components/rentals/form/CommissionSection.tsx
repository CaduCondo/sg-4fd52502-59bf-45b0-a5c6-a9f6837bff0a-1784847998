import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { applyRealMask } from "@/lib/masks";
import type { RentalFormSectionProps } from "../types/rentalForm.types";

export function CommissionSection({ formData, onFieldChange }: RentalFormSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Comissões</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="agencyCommissionPercentage">Comissão da Imobiliária (%)</Label>
          <Input
            id="agencyCommissionPercentage"
            value={formData.agencyCommissionPercentage}
            onChange={(e) => onFieldChange("agencyCommissionPercentage", applyRealMask(e.target.value))}
            placeholder="0,00%"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="realEstateAgentCommissionPercentage">Comissão do Corretor (%)</Label>
          <Input
            id="realEstateAgentCommissionPercentage"
            value={formData.realEstateAgentCommissionPercentage}
            onChange={(e) => onFieldChange("realEstateAgentCommissionPercentage", applyRealMask(e.target.value))}
            placeholder="0,00%"
          />
        </div>
      </div>
    </div>
  );
}