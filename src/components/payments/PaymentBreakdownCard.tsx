import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign } from "lucide-react";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BreakdownItemProps {
  item: any;
  isDeduction?: boolean;
  igpmCorrection?: any;
  formatCurrency: (val: number) => string;
}

export const BreakdownItem = memo(({ item, isDeduction, igpmCorrection, formatCurrency }: BreakdownItemProps) => {
  const isDepositDeduction = item.description?.includes("Devolução de Caução");
  
  const displayAmount = isDepositDeduction && igpmCorrection && igpmCorrection.correctedAmount > 0
    ? igpmCorrection.correctedAmount 
    : Math.abs(item.amount);

  return (
    <div>
      <div className="flex justify-between items-start text-sm">
        <div className="flex-1">
          <span className={isDepositDeduction ? "block" : ""}>
            {isDepositDeduction ? "Devolução de Caução" : item.description}
          </span>
          {isDepositDeduction && igpmCorrection && (
            <span className="block text-xs text-muted-foreground mt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted hover:text-primary transition-colors">
                      (corrigido pela Taxa da Poupança)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[450px] p-0 bg-white dark:bg-gray-900 border-2 shadow-xl z-50">
                    <div className="space-y-3 p-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1.5">
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          💰 Resumo da Correção
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Valor Original:</span>
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              {formatCurrency(igpmCorrection.originalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Corrigido:</span>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(igpmCorrection.correctedAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-muted-foreground text-xs">Correção Total:</span>
                          <p className="font-bold text-base text-blue-900 dark:text-blue-100">
                            {(igpmCorrection.poupancaPercentage ?? igpmCorrection.igpmPercentage ?? 0).toFixed(2)}% ({igpmCorrection.months} {igpmCorrection.months === 1 ? 'mês' : 'meses'})
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-2">
                          📅 Taxas Mensais Aplicadas
                        </p>
                        <div className="text-[11px] font-mono leading-relaxed max-h-[250px] overflow-y-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {igpmCorrection.poupancaDetails || igpmCorrection.igpmDetails || "Detalhes de correção não disponíveis."}
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          )}
        </div>
        <span className={`${isDeduction ? "text-red-600" : ""} font-medium whitespace-nowrap ml-4`}>
          {isDeduction ? "- " : ""}
          {formatCurrency(displayAmount)}
        </span>
      </div>
    </div>
  );
});

BreakdownItem.displayName = "BreakdownItem";

interface PaymentBreakdownCardProps {
  isTerminationPayment: boolean;
  originalBreakdown: any[];
  igpmCorrection: any;
  repairExpenses: number;
  repairExpensesInput: string;
  removeFees: boolean;
  lateFeePercentage: number;
  interestRatePercentage: number;
  calculatedTotal: number;
  displayBreakdown: any;
  values: any;
  isEditMode: boolean;
  isReadOnly: boolean;
  formatCurrency: (val: number) => string;
  onRepairExpensesChange: (value: string) => void;
  onRemoveFeesChange: (checked: boolean) => void;
  discountAmount?: number;
  discountAmountInput?: string;
  onDiscountAmountChange?: (value: string) => void;
}

export function PaymentBreakdownCard({
  isTerminationPayment,
  originalBreakdown,
  igpmCorrection,
  repairExpenses,
  repairExpensesInput,
  removeFees,
  lateFeePercentage,
  interestRatePercentage,
  calculatedTotal,
  displayBreakdown,
  values,
  isEditMode,
  isReadOnly,
  formatCurrency,
  onRepairExpensesChange,
  onRemoveFeesChange,
  discountAmount = 0,
  discountAmountInput = "",
  onDiscountAmountChange = () => {},
  paymentStatus,
  paidAmount = 0,
}: PaymentBreakdownCardProps) {
  console.log("🔍 PaymentBreakdownCard Debug:", {
    paymentStatus,
    paidAmount,
    calculatedTotal,
    displayBreakdown,
    isTerminationPayment
  });

  return (
    <Card className={isTerminationPayment ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Formação de Valores {isTerminationPayment && "- Rescisão"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isTerminationPayment ? (
            <>
              {originalBreakdown
                .filter(item => 
                  !item.description?.includes("Despesas") && 
                  !item.description?.includes("Multa por Atraso") &&
                  !item.description?.includes("Juros por Atraso")
                )
                .map((item, index) => (
                  <BreakdownItem 
                    key={index} 
                    item={item} 
                    isDeduction={item.type === "deduction"}
                    igpmCorrection={igpmCorrection}
                    formatCurrency={formatCurrency}
                  />
                ))}

              <div className="border-t border-dashed my-2"></div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 items-center text-sm">
                  <span>Despesas Adicionais *</span>
                  
                  {isEditMode ? (
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={repairExpensesInput}
                      onChange={(e) => onRepairExpensesChange(e.target.value)}
                      className="text-right"
                      disabled={isReadOnly}
                    />
                  ) : (
                    <span className="font-medium text-right">
                      {formatCurrency(repairExpenses)}
                    </span>
                  )}
                </div>
              </div>

              {values.diasAtraso > 0 && (
                <>
                  <div className="border-t border-dashed my-2"></div>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
                      🚨 ATRASO NO PAGAMENTO ({values.diasAtraso} {values.diasAtraso === 1 ? 'dia' : 'dias'})
                    </p>
                    
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Multa por Atraso ({lateFeePercentage}%)
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrency(values.multa)}
                      </span>
                    </div>

                    {values.juros > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                          Juros ({interestRatePercentage.toFixed(3)}% ao dia)
                        </span>
                        <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                          + {formatCurrency(values.juros)}
                        </span>
                      </div>
                    )}

                    {isEditMode && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <Checkbox
                          id="remove-fees-termination"
                          checked={removeFees}
                          onCheckedChange={(checked) => onRemoveFeesChange(checked as boolean)}
                          disabled={isReadOnly}
                        />
                        <label
                          htmlFor="remove-fees-termination"
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Retirar multa/juros por atraso
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="border-t border-dashed my-2"></div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 items-center text-sm">
                  <span>Valor de Desconto</span>
                  
                  {isEditMode ? (
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={discountAmountInput}
                      onChange={(e) => onDiscountAmountChange(e.target.value)}
                      className="text-right"
                      disabled={isReadOnly}
                    />
                  ) : (
                    <span className="font-medium text-right text-red-600">
                      {discountAmount > 0 ? "- " : ""}
                      {formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t-2 border-primary mt-2">
                <span className="font-bold text-base">VALOR TOTAL</span>
                <span className={`font-bold text-base ${calculatedTotal < 0 ? "text-red-600" : "text-primary"}`}>
                  {calculatedTotal < 0 ? "- " : ""}
                  {formatCurrency(Math.abs(calculatedTotal))}
                </span>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                * Despesas Adicionais de Reforma/Limpeza/Pinturas ou reparos necessários após a saída do inquilino
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                {displayBreakdown.items.map((item: any, index: number) => {
                  const itemValue = item.value || item.amount || 0;
                  const isProportional = item.description?.toLowerCase().includes("proporcional");
                  
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {item.description?.replace(/\s*\(proporcional\)/i, '')}
                        {isProportional && (
                          <span className="text-blue-600 ml-2">(proporcional)</span>
                        )}
                      </span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(itemValue)}
                      </span>
                    </div>
                  );
                })}
                
              </div>

              {values.diasAtraso > 0 && (
                <>
                  <div className="border-t border-dashed my-2"></div>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
                      🚨 ATRASO NO PAGAMENTO ({values.diasAtraso} {values.diasAtraso === 1 ? 'dia' : 'dias'})
                    </p>
                    
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Multa por Atraso ({lateFeePercentage}%)
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrency(values.multa)}
                      </span>
                    </div>

                    {values.juros > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                          Juros ({interestRatePercentage.toFixed(3)}% ao dia)
                        </span>
                        <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                          + {formatCurrency(values.juros)}
                        </span>
                      </div>
                    )}

                    {isEditMode && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <Checkbox
                          id="remove-fees"
                          checked={removeFees}
                          onCheckedChange={(checked) => onRemoveFeesChange(checked as boolean)}
                          disabled={isReadOnly}
                        />
                        <label
                          htmlFor="remove-fees"
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Retirar multa/juros por atraso
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between pt-3 border-t-2 border-primary mt-2">
                <span className="font-bold text-base">VALOR TOTAL</span>
                <span className="font-bold text-base text-primary">
                  {formatCurrency(displayBreakdown.total + (removeFees ? 0 : (values.multa + values.juros)))}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}