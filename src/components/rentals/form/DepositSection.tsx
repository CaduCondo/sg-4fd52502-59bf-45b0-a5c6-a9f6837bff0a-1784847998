import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyRealMask, formatCurrency } from "@/lib/masks";
import { useDepositCalculations } from "../hooks/useDepositCalculations";
import type { RentalFormSectionProps } from "../types/rentalForm.types";

export function DepositSection({ formData, onFieldChange, errors }: RentalFormSectionProps) {
  const { totalDeposit } = useDepositCalculations({
    securityDeposit: formData.securityDeposit || "",
    isDepositInstallment: formData.isDepositInstallment || false,
    depositInstallmentCount: formData.depositInstallmentCount || "",
    depositInstallment2: formData.depositInstallment2 || "",
    depositInstallment3: formData.depositInstallment3 || "",
  });

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Informações da Caução</h3>
      
      {/* LINHA 1: Valor Caução | Data Pagamento | Código PIX */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="space-y-2 md:col-span-5">
          <Label htmlFor="securityDeposit">
            {formData.isDepositInstallment ? "Valor Caução (1ª Parcela)" : "Valor Caução (À vista)"} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="securityDeposit"
            value={formData.securityDeposit}
            onChange={(e) => onFieldChange("securityDeposit", applyRealMask(e.target.value))}
            placeholder="R$ 0,00"
            className={errors?.securityDeposit ? "border-red-500" : ""}
          />
          {errors?.securityDeposit && <p className="text-sm text-red-500">{errors.securityDeposit}</p>}
        </div>

        <div className="space-y-2 md:col-span-4">
          <Label htmlFor="depositPaymentDate">Data Pagamento <span className="text-red-500">*</span></Label>
          <Input
            id="depositPaymentDate"
            type="date"
            value={formData.depositPaymentDate}
            onChange={(e) => onFieldChange("depositPaymentDate", e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="depositPixCode">Código PIX</Label>
          <Input
            id="depositPixCode"
            value={formData.depositPixCode}
            onChange={(e) => onFieldChange("depositPixCode", e.target.value)}
            placeholder="Código PIX"
          />
        </div>
      </div>

      {/* LINHA 2: Checkbox Parcelado + Combo Quantidade (ao lado) */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDepositInstallment"
            checked={formData.isDepositInstallment}
            onCheckedChange={(checked) => {
              onFieldChange("isDepositInstallment", checked as boolean);
              if (!checked) {
                onFieldChange("depositInstallmentCount", "");
                onFieldChange("depositInstallment2", "");
                onFieldChange("depositInstallment3", "");
                onFieldChange("depositInstallment2PaymentDate", "");
                onFieldChange("depositInstallment3PaymentDate", "");
              }
            }}
          />
          <Label htmlFor="isDepositInstallment" className="cursor-pointer font-medium">
            Caução Parcelado ?
          </Label>
        </div>

        {formData.isDepositInstallment && (
          <div className="w-40">
            <Select
              value={formData.depositInstallmentCount}
              onValueChange={(value) => {
                onFieldChange("depositInstallmentCount", value);
                if (value === "2") {
                  onFieldChange("depositInstallment3", "");
                  onFieldChange("depositInstallment3PaymentDate", "");
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 parcelas</SelectItem>
                <SelectItem value="3">3 parcelas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* LINHAS SEGUINTES: 2ª e 3ª Parcelas */}
      {formData.isDepositInstallment && formData.depositInstallmentCount && (
        <div className="space-y-4 mt-4 pt-4 border-t">
          {/* 2ª PARCELA */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="space-y-2 md:col-span-5">
              <Label htmlFor="depositInstallment2">Valor Caução (2ª Parcela)</Label>
              <Input
                id="depositInstallment2"
                value={formData.depositInstallment2}
                onChange={(e) => onFieldChange("depositInstallment2", applyRealMask(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="depositInstallment2PaymentDate">Data Pagamento</Label>
              <Input
                id="depositInstallment2PaymentDate"
                type="date"
                value={formData.depositInstallment2PaymentDate}
                onChange={(e) => onFieldChange("depositInstallment2PaymentDate", e.target.value)}
              />
            </div>
          </div>

          {/* 3ª PARCELA */}
          {formData.depositInstallmentCount === "3" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="space-y-2 md:col-span-5">
                <Label htmlFor="depositInstallment3">Valor Caução (3ª Parcela)</Label>
                <Input
                  id="depositInstallment3"
                  value={formData.depositInstallment3}
                  onChange={(e) => onFieldChange("depositInstallment3", applyRealMask(e.target.value))}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="depositInstallment3PaymentDate">Data Pagamento</Label>
                <Input
                  id="depositInstallment3PaymentDate"
                  type="date"
                  value={formData.depositInstallment3PaymentDate}
                  onChange={(e) => onFieldChange("depositInstallment3PaymentDate", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* VALOR TOTAL DA CAUÇÃO */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-900 dark:text-blue-100">
                Valor Total Caução:
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalDeposit)}
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-2">
              * Soma de todas as parcelas do caução
            </p>
          </div>
        </div>
      )}
    </div>
  );
}