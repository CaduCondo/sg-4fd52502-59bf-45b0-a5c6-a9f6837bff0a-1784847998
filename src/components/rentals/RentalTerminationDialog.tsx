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

interface RentalTerminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rental: Rental | null;
  onConfirm: (data: {
    terminationDate: string;
    applyPenalty: boolean;
    penaltyAmount: number;
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

  useEffect(() => {
    if (!rental || !open) {
      setTerminationDate("");
      setApplyFullContractPenalty(false);
      setApply12MonthsPenalty(false);
      setPenaltyAmount(0);
      setCurrentMonth(0);
      setTotalMonths(0);
      setRemainingMonths(0);
      setMonthsUntil12th(0);
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

    // Calcula quantos meses faltam para chegar na 12ª parcela
    const until12 = Math.max(0, 12 - current);
    setMonthsUntil12th(until12);
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

      // Calcula multa sobre contrato completo
      if (applyFullContractPenalty && remaining > 0) {
        const penalty = (remaining * monthlyRent) * 0.10;
        setPenaltyAmount(penalty);
      } 
      // Calcula multa sobre 12 meses
      else if (apply12MonthsPenalty) {
        if (currentMonthFromDate < 12) {
          const monthsTo12th = Math.max(0, 12 - currentMonthFromDate);
          const penalty = (monthsTo12th * monthlyRent) * 0.10;
          setPenaltyAmount(penalty);
          setMonthsUntil12th(monthsTo12th);
        } else {
          // Já passou da 12ª parcela, sem multa
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
  }, [rental, terminationDate, applyFullContractPenalty, apply12MonthsPenalty]);

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        terminationDate,
        applyPenalty: applyFullContractPenalty || apply12MonthsPenalty,
        penaltyAmount,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error terminating rental:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rental) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Encerrar Contrato
          </DialogTitle>
          <DialogDescription>
            Você está encerrando o contrato de locação. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 px-1">
          {/* Contract Progress - Compacto em Grid */}
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
              Usada para calcular o valor da rescisão
            </p>
          </div>

          {/* Penalty Type Checkboxes - Layout Compacto */}
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
                  10% sobre todos os meses restantes
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
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <Label
                  htmlFor="apply-12months-penalty"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Multa sobre 12 meses
                </Label>
                <p className="text-xs text-muted-foreground">
                  10% até a 12ª parcela (se antes dela)
                </p>
              </div>
            </div>
          </div>

          {/* Penalty Calculation Info - Compacto */}
          {applyFullContractPenalty && remainingMonths > 0 && (
            <Alert className="py-2.5">
              <AlertDescription className="text-xs leading-relaxed">
                <strong>Cálculo:</strong> {remainingMonths} {remainingMonths === 1 ? "mês" : "meses"} × R${" "}
                {rental.value?.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                × 10% = <strong>R${" "}
                {penaltyAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</strong>
              </AlertDescription>
            </Alert>
          )}

          {apply12MonthsPenalty && (
            <Alert className="py-2.5">
              <AlertDescription className="text-xs leading-relaxed">
                {monthsUntil12th > 0 ? (
                  <>
                    <strong>Cálculo:</strong> Faltam {monthsUntil12th} {monthsUntil12th === 1 ? "mês" : "meses"} para a 12ª parcela
                    <br />
                    {monthsUntil12th} × R${" "}
                    {rental.value?.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    × 10% = <strong>R${" "}
                    {penaltyAmount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</strong>
                  </>
                ) : (
                  <>
                    <strong>Sem multa:</strong> Rescisão após a 12ª parcela
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Penalty Amount Display - Compacto */}
          {(applyFullContractPenalty || apply12MonthsPenalty) && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Valor da Rescisão</p>
              <p className="text-2xl font-bold text-primary">
                R${" "}
                {penaltyAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
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
            {isSubmitting ? "Encerrando..." : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}