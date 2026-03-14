import { memo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentFormFieldsProps {
  formData: {
    payment_date: string;
    payment_method: string;
    payment_time: string;
    amount_to_pay: string;
    notes: string;
  };
  paymentHour: string;
  paymentMinute: string;
  paymentSecond: string;
  installmentInfo: string;
  isReadOnly: boolean;
  onFormDataChange: (data: any) => void;
  onPaymentHourChange: (value: string) => void;
  onPaymentMinuteChange: (value: string) => void;
  onPaymentSecondChange: (value: string) => void;
  formatCurrency: (value: string) => string;
}

export const PaymentFormFields = memo(function PaymentFormFields({
  formData,
  paymentHour,
  paymentMinute,
  paymentSecond,
  installmentInfo,
  isReadOnly,
  onFormDataChange,
  onPaymentHourChange,
  onPaymentMinuteChange,
  onPaymentSecondChange,
  formatCurrency,
}: PaymentFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="payment_date">
            Data do Pagamento <span className="text-red-500">*</span>
          </Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => onFormDataChange({ ...formData, payment_date: e.target.value })}
            required
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label htmlFor="payment_method">
            Forma de Pagamento <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => onFormDataChange({ ...formData, payment_method: value })}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formData.payment_method === "pix" && (
          <div>
            <Label htmlFor="payment_time">Horário do Recebimento</Label>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center">
              <Input
                id="payment_hour"
                type="text"
                inputMode="numeric"
                placeholder="HH"
                maxLength={2}
                value={paymentHour}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
                    onPaymentHourChange(value);
                  }
                }}
                disabled={isReadOnly}
              />
              <span className="text-2xl font-bold">:</span>
              <Input
                id="payment_minute"
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={paymentMinute}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                    onPaymentMinuteChange(value);
                  }
                }}
                disabled={isReadOnly}
              />
              <span className="text-2xl font-bold">:</span>
              <Input
                id="payment_second"
                type="text"
                inputMode="numeric"
                placeholder="SS"
                maxLength={2}
                value={paymentSecond}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                    onPaymentSecondChange(value);
                  }
                }}
                disabled={isReadOnly}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="amount_to_pay">
            Valor a Pagar <span className="text-red-500">*</span>
          </Label>
          <Input
            id="amount_to_pay"
            type="text"
            placeholder="R$ 0,00"
            value={formData.amount_to_pay}
            onChange={(e) => {
              const formatted = formatCurrency(e.target.value);
              onFormDataChange({ ...formData, amount_to_pay: formatted });
            }}
            required
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="installment_info">Parcela</Label>
          <Input
            id="installment_info"
            type="text"
            value={installmentInfo}
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Observações sobre o pagamento..."
          value={formData.notes}
          onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
          rows={2}
          disabled={isReadOnly}
          className="resize-none"
        />
      </div>
    </div>
  );
});