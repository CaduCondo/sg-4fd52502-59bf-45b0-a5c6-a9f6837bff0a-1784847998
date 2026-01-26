import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyCurrencyMask } from "@/lib/masks";
import type { RentalFormSectionProps } from "../types/rentalForm.types";

export function RentSection({ formData, onFieldChange, errors }: RentalFormSectionProps) {
  const handleRentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCurrencyMask(e.target.value);
    onFieldChange("rentAmount", masked);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Informações do Aluguel</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rent Amount */}
        <div className="space-y-2">
          <Label htmlFor="rentAmount">
            Valor do Aluguel <span className="text-red-500">*</span>
          </Label>
          <Input
            id="rentAmount"
            placeholder="R$ 0,00"
            value={formData.rentAmount}
            onChange={handleRentAmountChange}
            className={errors?.rentAmount ? "border-red-500" : ""}
          />
          {errors?.rentAmount && <p className="text-sm text-red-500">{errors.rentAmount}</p>}
        </div>

        {/* Payment Day */}
        <div className="space-y-2">
          <Label htmlFor="paymentDay">
            Dia de Pagamento <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.paymentDay} onValueChange={(value) => onFieldChange("paymentDay", value)}>
            <SelectTrigger id="paymentDay" className={errors?.paymentDay ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.paymentDay && <p className="text-sm text-red-500">{errors.paymentDay}</p>}
        </div>
      </div>
    </div>
  );
}