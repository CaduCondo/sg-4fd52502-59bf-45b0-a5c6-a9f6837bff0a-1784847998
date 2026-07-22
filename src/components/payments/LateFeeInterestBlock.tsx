import { formatCurrency as formatCurrencyUtil } from "@/lib/masks";

interface LateFeeInterestBlockProps {
  daysLate: number;
  lateFee: number;
  interest: number;
  finalTotal: number;
  includeLateFee: boolean;
  includeInterest: boolean;
  onIncludeLateFeeChange: (checked: boolean) => void;
  onIncludeInterestChange: (checked: boolean) => void;
  lateFeePercentage: number;
  interestRatePercentage: number;
  showCheckboxes?: boolean;
  disabled?: boolean;
}

export function LateFeeInterestBlock({
  daysLate,
  lateFee,
  interest,
  finalTotal,
  includeLateFee,
  includeInterest,
  onIncludeLateFeeChange,
  onIncludeInterestChange,
  lateFeePercentage,
  interestRatePercentage,
  showCheckboxes = true,
  disabled = false,
}: LateFeeInterestBlockProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="space-y-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
        Atraso no Pagamento: {daysLate} {daysLate === 1 ? "dia" : "dias"}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showCheckboxes && (
              <input
                type="checkbox"
                id="includeLateFee"
                checked={includeLateFee}
                onChange={(e) => onIncludeLateFeeChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
            )}
            <label 
              htmlFor="includeLateFee" 
              className={`text-sm ${showCheckboxes ? 'cursor-pointer' : ''} ${!includeLateFee ? 'line-through text-muted-foreground' : ''}`}
            >
              Multa ({lateFeePercentage}%)
            </label>
          </div>
          <span className={`font-semibold ${includeLateFee ? 'text-red-600' : 'text-muted-foreground line-through'}`}>
            {includeLateFee ? "+ " : ""}
            {formatCurrency(lateFee)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showCheckboxes && (
              <input
                type="checkbox"
                id="includeInterest"
                checked={includeInterest}
                onChange={(e) => onIncludeInterestChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
            )}
            <label 
              htmlFor="includeInterest" 
              className={`text-sm ${showCheckboxes ? 'cursor-pointer' : ''} ${!includeInterest ? 'line-through text-muted-foreground' : ''}`}
            >
              Juros ({interestRatePercentage.toFixed(3)}% ao dia)
            </label>
          </div>
          <span className={`font-semibold ${includeInterest ? 'text-red-600' : 'text-muted-foreground line-through'}`}>
            {includeInterest ? "+ " : ""}
            {formatCurrency(interest)}
          </span>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-red-300 dark:border-red-700 font-bold text-base">
          <span>VALOR TOTAL</span>
          <span className="text-red-600">
            {formatCurrency(finalTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}