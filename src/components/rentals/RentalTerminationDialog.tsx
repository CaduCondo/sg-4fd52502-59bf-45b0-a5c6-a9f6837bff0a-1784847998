import { useState, useEffect } from "react";
import { format, differenceInMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle } from "lucide-react";
import type { Rental } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface RentalTerminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
  onConfirm: (data: {
    terminationDate: string;
    applyPenalty: boolean;
    penaltyAmount: number;
    depositAmount: number;
    repairExpenses: number;
  }) => Promise<void>;
}

export function RentalTerminationDialog({
  open,
  onOpenChange,
  rental,
  onConfirm,
}: RentalTerminationDialogProps) {
  const [terminationDate, setTerminationDate] = useState<string>("");
  const [applyFullContractPenalty, setApplyFullContractPenalty] = useState<boolean>(false);
  const [apply12MonthsPenalty, setApply12MonthsPenalty] = useState<boolean>(false);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<number>(0);
  const [totalMonths, setTotalMonths] = useState<number>(0);
  const [remainingMonths, setRemainingMonths] = useState<number>(0);
  const [monthsUntil12th, setMonthsUntil12th] = useState<number>(0);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [repairExpenses, setRepairExpenses] = useState<number>(0);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);

  useEffect(() => {
    if (!rental || !open) {
      setTerminationDate("");
      setApplyFullContractPenalty(false);
      setApply12MonthsPenalty(false);
      setPenaltyAmount(0);
      setIsSubmitting(false);
      setCurrentMonth(0);
      setTotalMonths(0);
      setRemainingMonths(0);
      setMonthsUntil12th(0);
      setApplyDiscount(false);
      setDiscountPercentage(0);
      setRepairExpenses(0);
      setFinalAmount(0);
      setDepositAmount(0);
      return;
    }

    const startDate = parseISO(rental.startDate);
    const endDate = parseISO(rental.endDate);
    const today = new Date();

    const total = differenceInMonths(endDate, startDate) + 1;
    const current = differenceInMonths(today, startDate) + 1;

    setTotalMonths(total);
    setCurrentMonth(Math.min(current, total));
    setTerminationDate(format(today, "yyyy-MM-dd"));

    const until12 = Math.max(0, 12 - current);
    setMonthsUntil12th(until12);

    // Buscar valor TOTAL do caução somando todas as parcelas
    const fetchTotalDeposit = async () => {
      try {
        const { data: installments, error } = await supabase
          .from("deposit_installments")
          .select("amount")
          .eq("rental_id", rental.id);

        if (error) {
          console.error("Erro ao buscar parcelas do caução:", error);
          // Fallback para security_deposit se houver erro
          setDepositAmount(rental.security_deposit || 0);
          return;
        }

        // Somar TODAS as parcelas
        const totalDeposit = installments?.reduce((sum, inst) => sum + (inst.amount || 0), 0) || 0;
        
        console.log("💰 Caução calculado:", {
          parcelas: installments?.length || 0,
          valorTotal: totalDeposit,
          securityDeposit: rental.security_deposit
        });

        setDepositAmount(totalDeposit);
      } catch (error) {
        console.error("Erro ao calcular caução total:", error);
        setDepositAmount(rental.security_deposit || 0);
      }
    };

    fetchTotalDeposit();
  }, [rental, open]);

  useEffect(() => {
    if (!rental || !terminationDate) {
      setPenaltyAmount(0);
      setRemainingMonths(0);
      return;
    }

    try {
      const termDate = parseISO(terminationDate);
      const endDate = parseISO(rental.endDate);
      const startDate = parseISO(rental.startDate);
      
      const currentMonthFromDate = differenceInMonths(termDate, startDate) + 1;
      const remaining = Math.max(0, differenceInMonths(endDate, termDate));
      
      setRemainingMonths(remaining);

      const monthlyRent = rental.value || 0;

      if (applyFullContractPenalty && remaining > 0) {
        const threeTimesRent = 3 * monthlyRent;
        const perMonthPenalty = threeTimesRent / totalMonths;
        const penalty = perMonthPenalty * remaining;
        setPenaltyAmount(penalty);
      } 
      else if (apply12MonthsPenalty) {
        if (currentMonthFromDate < 12) {
          const monthsTo12th = Math.max(0, 12 - currentMonthFromDate);
          const threeTimesRent = 3 * monthlyRent;
          const perMonthPenalty = threeTimesRent / 12;
          const penalty = perMonthPenalty * monthsTo12th;
          setPenaltyAmount(penalty);
          setMonthsUntil12th(monthsTo12th);
        } else {
          setPenaltyAmount(0);
          setMonthsUntil12th(0);
        }
      } 
      else {
        setPenaltyAmount(0);
      }
    } catch (error) {
      console.error("Error calculating penalty:", error);
      setPenaltyAmount(0);
      setRemainingMonths(0);
    }
  }, [rental, terminationDate, applyFullContractPenalty, apply12MonthsPenalty, totalMonths]);

  // Calcula o valor final: Multa - Caução + Despesas de Reforma - Desconto
  useEffect(() => {
    let total = penaltyAmount;
    
    // Subtrai caução (devolução ao inquilino)
    total -= depositAmount;
    
    // Adiciona despesas de reforma
    total += repairExpenses;
    
    // Aplica desconto se marcado
    if (applyDiscount && discountPercentage > 0) {
      const discount = (total * discountPercentage) / 100;
      total -= discount;
    }
    
    setFinalAmount(Math.max(0, total));
  }, [penaltyAmount, depositAmount, repairExpenses, applyDiscount, discountPercentage]);

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        terminationDate,
        applyPenalty: applyFullContractPenalty || apply12MonthsPenalty,
        penaltyAmount: finalAmount,
        depositAmount,
        repairExpenses,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error terminating rental:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rental) return null;

  const monthlyRent = rental.value || 0;
  const threeTimesRent = 3 * monthlyRent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rescisão de Contrato
          </DialogTitle>
          <DialogDescription>
            Você está encerrando o contrato de locação. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 px-1">
          {/* Contract Progress */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Progresso</p>
                <p className="text-lg font-bold">
                  Parcela {currentMonth}/{totalMonths}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="text-xs font-medium leading-tight">
                  {format(parseISO(rental.startDate), "dd/MM/yy", { locale: ptBR })} -{" "}
                  {format(parseISO(rental.endDate), "dd/MM/yy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Termination Date */}
          <div className="space-y-1.5">
            <Label htmlFor="termination-date" className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              Data da Rescisão *
            </Label>
            <Input
              id="termination-date"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              max={format(parseISO(rental.endDate), "yyyy-MM-dd")}
              required
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Recebimentos ATÉ este mês serão mantidos
            </p>
          </div>

          {/* Penalty Type Checkboxes */}
          <div className="space-y-2.5">
            {/* Full Contract Penalty */}
            <div className="flex items-start space-x-2 rounded-md border p-2.5 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="apply-full-penalty"
                checked={applyFullContractPenalty}
                onCheckedChange={(checked) => {
                  setApplyFullContractPenalty(checked as boolean);
                  if (checked) setApply12MonthsPenalty(false);
                }}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <Label
                  htmlFor="apply-full-penalty"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Multa sobre contrato completo
                </Label>
                <p className="text-xs text-muted-foreground">
                  (3 × aluguel) ÷ meses totais × meses restantes
                </p>
              </div>
            </div>

            {/* 12 Months Penalty */}
            <div className="flex items-start space-x-2 rounded-md border p-2.5 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="apply-12months-penalty"
                checked={apply12MonthsPenalty}
                onCheckedChange={(checked) => {
                  setApply12MonthsPenalty(checked as boolean);
                  if (checked) setApplyFullContractPenalty(false);
                }}
                disabled={currentMonth >= 12}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <Label
                  htmlFor="apply-12months-penalty"
                  className={`text-sm font-medium leading-none cursor-pointer ${currentMonth >= 12 ? "opacity-50" : ""}`}
                >
                  Multa para contratos com cláusula dos 12 meses
                </Label>
                <p className={`text-xs text-muted-foreground ${currentMonth >= 12 ? "opacity-50" : ""}`}>
                  (3 × aluguel) ÷ 12 × meses até 12ª parcela
                </p>
                {currentMonth >= 12 && (
                  <p className="text-xs text-yellow-600 font-medium">
                    Disponível apenas antes da 12ª parcela
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Penalty Calculation Info */}
          {applyFullContractPenalty && remainingMonths > 0 && (
            <Alert className="py-2.5">
              <AlertDescription className="text-xs leading-relaxed space-y-1">
                <div><strong>Cálculo:</strong></div>
                <div>3 × R$ {monthlyRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = R$ {threeTimesRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>R$ {threeTimesRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ {totalMonths} meses = R$ {(threeTimesRent / totalMonths).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>R$ {(threeTimesRent / totalMonths).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {remainingMonths} meses restantes = <strong>R$ {penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              </AlertDescription>
            </Alert>
          )}

          {apply12MonthsPenalty && (
            <Alert className="py-2.5">
              <AlertDescription className="text-xs leading-relaxed space-y-1">
                {monthsUntil12th > 0 ? (
                  <>
                    <div><strong>Cálculo:</strong> Faltam {monthsUntil12th} {monthsUntil12th === 1 ? "mês" : "meses"} para a 12ª parcela</div>
                    <div>3 × R$ {monthlyRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = R$ {threeTimesRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>R$ {threeTimesRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 12 = R$ {(threeTimesRent / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>R$ {(threeTimesRent / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {monthsUntil12th} {monthsUntil12th === 1 ? "mês" : "meses"} até 12ª = <strong>R$ {penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                  </>
                ) : (
                  <>
                    <strong>Sem multa:</strong> Rescisão após a 12ª parcela
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Caução Info */}
          {depositAmount > 0 && (
            <div className="rounded-lg border bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-900 mb-0.5">💰 Caução TOTAL a Devolver</p>
              <p className="text-lg font-bold text-blue-600">
                R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Este valor será devolvido ao inquilino
              </p>
            </div>
          )}

          {/* Repair Expenses Section */}
          {(applyFullContractPenalty || apply12MonthsPenalty) && penaltyAmount > 0 && (
            <div className="space-y-2">
              <Label htmlFor="repair-expenses" className="text-sm font-medium">
                Despesas de Reforma/Limpeza (Opcional)
              </Label>
              <Input
                id="repair-expenses"
                type="number"
                min="0"
                step="0.01"
                value={repairExpenses || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setRepairExpenses(Math.max(0, value));
                }}
                placeholder="0,00"
                className="h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground">
                Valor gasto para deixar o imóvel nas condições originais
              </p>
            </div>
          )}

          {/* Discount Section */}
          {(applyFullContractPenalty || apply12MonthsPenalty) && penaltyAmount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apply-discount"
                  checked={applyDiscount}
                  onCheckedChange={(checked) => {
                    setApplyDiscount(checked as boolean);
                    if (!checked) {
                      setDiscountPercentage(0);
                    }
                  }}
                />
                <Label
                  htmlFor="apply-discount"
                  className="text-sm font-medium cursor-pointer"
                >
                  Aplicar Desconto na Multa?
                </Label>
              </div>

              {applyDiscount && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountPercentage || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setDiscountPercentage(Math.min(100, Math.max(0, value)));
                    }}
                    placeholder="0"
                    className="h-9 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              )}
            </div>
          )}

          {/* Final Amount Display */}
          {(applyFullContractPenalty || apply12MonthsPenalty) && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Cálculo Final do Recebimento</p>
              
              <div className="space-y-1.5 text-sm mb-3 pb-3 border-b">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multa de rescisão:</span>
                  <span className="font-medium">+ R$ {penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {depositAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Caução a devolver:</span>
                    <span className="font-medium">- R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                {repairExpenses > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Despesas de reforma:</span>
                    <span className="font-medium">+ R$ {repairExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                {applyDiscount && discountPercentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto ({discountPercentage}%):</span>
                    <span className="font-medium">- R$ {(((penaltyAmount - depositAmount + repairExpenses) * discountPercentage) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Valor Total:</span>
                <p className="text-2xl font-bold text-primary">
                  R$ {finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              {finalAmount < 0 && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Valor negativo: O inquilino receberá R$ {Math.abs(finalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de volta
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!terminationDate || isSubmitting}
            className="h-9"
          >
            {isSubmitting ? "Processando..." : "Confirmar Rescisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}