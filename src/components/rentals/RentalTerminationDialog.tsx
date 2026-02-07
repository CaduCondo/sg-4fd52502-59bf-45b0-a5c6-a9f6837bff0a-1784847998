import { useState, useEffect } from "react";
import { format, differenceInMonths, parseISO, getDate, getDaysInMonth } from "date-fns";
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
    proportionalRent: number;
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
  const [proportionalRent, setProportionalRent] = useState<number>(0);

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
      setProportionalRent(0);
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
          setDepositAmount(rental.security_deposit || 0);
          return;
        }

        const totalDeposit = installments?.reduce((sum, inst) => sum + (inst.amount || 0), 0) || 0;
        
        console.log("💰 Caução calculado:", {
          parcelas: installments?.length || 0,
          valorTotal: totalDeposit,
          securityDeposit: rental.security_deposit
        });

        // Se tiver parcelas, usa a soma. Senão, usa o valor do campo no cadastro (fallback)
        if (totalDeposit > 0) {
          setDepositAmount(totalDeposit);
        } else {
          setDepositAmount(rental.security_deposit || 0);
        }
      } catch (error) {
        console.error("Erro ao calcular caução total:", error);
        setDepositAmount(rental.security_deposit || 0);
      }
    };

    fetchTotalDeposit();
  }, [rental, open]);

  // Calcular multas e aluguel proporcional ao mudar data
  useEffect(() => {
    if (!rental || !terminationDate) {
      setPenaltyAmount(0);
      setRemainingMonths(0);
      setProportionalRent(0);
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

      // Calcular Aluguel Proporcional
      const daysInMonth = getDaysInMonth(termDate);
      const dayOfMonth = getDate(termDate);
      // Se rescisão for dia 30/31, considera mês cheio. Senão calcula proporcional.
      // Assumindo que o mês da rescisão não foi pago (já que deletamos os futuros)
      const calculatedProportional = (monthlyRent / daysInMonth) * dayOfMonth;
      setProportionalRent(calculatedProportional);

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
      console.error("Error calculating values:", error);
      setPenaltyAmount(0);
      setRemainingMonths(0);
      setProportionalRent(0);
    }
  }, [rental, terminationDate, applyFullContractPenalty, apply12MonthsPenalty, totalMonths]);

  // Calcula o valor final
  useEffect(() => {
    let total = 0;
    
    // (+) Aluguel Proporcional
    total += proportionalRent;

    // (+) Multa
    total += penaltyAmount;
    
    // (+) Despesas de reforma
    total += repairExpenses;

    // (-) Desconto na Multa (aplica-se sobre o valor total acumulado até aqui?)
    // Normalmente desconto é sobre a multa.
    if (applyDiscount && discountPercentage > 0) {
      const discount = (penaltyAmount * discountPercentage) / 100;
      total -= discount;
    }

    // (-) Caução (devolução ao inquilino)
    total -= depositAmount;
    
    setFinalAmount(Math.max(0, total));
  }, [penaltyAmount, depositAmount, repairExpenses, applyDiscount, discountPercentage, proportionalRent]);

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Ajusta valor final da multa com desconto se houver, para enviar limpo
      let finalPenalty = penaltyAmount;
      if (applyDiscount && discountPercentage > 0) {
        finalPenalty -= (penaltyAmount * discountPercentage) / 100;
      }

      await onConfirm({
        terminationDate,
        applyPenalty: applyFullContractPenalty || apply12MonthsPenalty,
        penaltyAmount: finalPenalty,
        depositAmount,
        repairExpenses,
        proportionalRent,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rescisão de Contrato
          </DialogTitle>
          <DialogDescription>
            Encerramento de contrato e cálculo final de valores.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 px-1">
          {/* Info Principal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Locação</Label>
              <p className="font-medium">{rental.property?.location?.name} - {rental.property?.complement}</p>
            </div>
            <div className="space-y-1.5 text-right">
              <Label className="text-sm text-muted-foreground">Inquilino</Label>
              <p className="font-medium">{rental.tenant?.name}</p>
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
          </div>

          <div className="grid gap-4 py-4 border-y">
            {/* 1. Aluguel Proporcional */}
            <div className="space-y-2">
               <Label className="text-base font-semibold text-blue-700">1. Aluguel Proporcional</Label>
               <div className="flex items-center gap-3">
                 <div className="flex-1">
                   <p className="text-sm text-muted-foreground mb-1">
                     Calculado sobre {getDate(parseISO(terminationDate) || new Date())} dias de uso no mês
                   </p>
                   <p className="text-xs text-muted-foreground">
                     (Aluguel R$ {monthlyRent} ÷ dias do mês) × dias uso
                   </p>
                 </div>
                 <div className="w-32 text-right font-bold text-blue-700">
                   R$ {proportionalRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
               </div>
            </div>

            {/* 2. Multas */}
            <div className="space-y-2 pt-2 border-t border-dashed">
              <Label className="text-base font-semibold text-red-700">2. Multas Rescisórias</Label>
              
              <div className="space-y-2.5">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="apply-full-penalty"
                    checked={applyFullContractPenalty}
                    onCheckedChange={(checked) => {
                      setApplyFullContractPenalty(checked as boolean);
                      if (checked) setApply12MonthsPenalty(false);
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="apply-full-penalty" className="cursor-pointer">
                      Multa Contratual Padrão (Proporcional)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      (3 aluguéis ÷ meses totais) × meses restantes
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="apply-12months-penalty"
                    checked={apply12MonthsPenalty}
                    onCheckedChange={(checked) => {
                      setApply12MonthsPenalty(checked as boolean);
                      if (checked) setApplyFullContractPenalty(false);
                    }}
                    disabled={currentMonth >= 12}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor="apply-12months-penalty" 
                      className={`cursor-pointer ${currentMonth >= 12 ? "opacity-50" : ""}`}
                    >
                      Multa Cláusula 12 Meses
                    </Label>
                    {currentMonth >= 12 && (
                      <span className="text-xs text-green-600 font-medium">Isento (após 12 meses)</span>
                    )}
                  </div>
                </div>

                {penaltyAmount > 0 && (
                  <div className="flex justify-between items-center bg-red-50 p-2 rounded text-sm">
                    <span className="text-red-700 font-medium">Valor da Multa:</span>
                    <span className="font-bold text-red-700">
                      R$ {penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Despesas */}
            <div className="space-y-2 pt-2 border-t border-dashed">
              <Label className="text-base font-semibold text-orange-700">3. Despesas Adicionais</Label>
              <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                <Label htmlFor="repair-expenses" className="text-sm font-normal">
                  Reformas, pinturas ou reparos necessários
                </Label>
                <Input
                  id="repair-expenses"
                  type="number"
                  min="0"
                  step="0.01"
                  value={repairExpenses || ""}
                  onChange={(e) => setRepairExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-8 text-right"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* 4. Devoluções */}
            <div className="space-y-2 pt-2 border-t border-dashed">
              <Label className="text-base font-semibold text-green-700">4. Deduções (Créditos do Inquilino)</Label>
              
              <div className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                <div>
                  <span className="text-green-800 font-medium block">Devolução de Caução</span>
                  <span className="text-xs text-green-600">Valor total pago pelo inquilino</span>
                </div>
                <span className="font-bold text-green-700">
                  - R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {(applyFullContractPenalty || apply12MonthsPenalty) && penaltyAmount > 0 && (
                 <div className="flex items-center gap-2 mt-2">
                   <Checkbox
                     id="apply-discount"
                     checked={applyDiscount}
                     onCheckedChange={(c) => {
                       setApplyDiscount(c as boolean);
                       if (!c) setDiscountPercentage(0);
                     }}
                   />
                   <Label htmlFor="apply-discount" className="text-sm cursor-pointer">Aplicar desconto na multa?</Label>
                   
                   {applyDiscount && (
                     <div className="flex items-center gap-1 ml-auto">
                       <Input
                         type="number"
                         value={discountPercentage || ""}
                         onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                         className="h-7 w-16 text-center"
                         placeholder="%"
                       />
                       <span className="text-sm">%</span>
                     </div>
                   )}
                 </div>
              )}
            </div>
          </div>

          {/* TOTAL FINAL */}
          <div className="rounded-lg bg-slate-900 p-4 text-white">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-slate-400 mb-1">Valor Final a Receber</p>
                <p className="text-xs text-slate-500">
                  (Proporcional + Multas + Despesas) - (Caução + Descontos)
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  R$ {finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {finalAmount === 0 && (finalAmount < 0 || (penaltyAmount + proportionalRent + repairExpenses - depositAmount) < 0) && (
               <p className="text-xs text-red-400 mt-2 text-right">
                 * O valor de caução supera as cobranças. Saldo a devolver ao inquilino: R$ {Math.abs(penaltyAmount + proportionalRent + repairExpenses - depositAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
               </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-3 border-t mt-auto">
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