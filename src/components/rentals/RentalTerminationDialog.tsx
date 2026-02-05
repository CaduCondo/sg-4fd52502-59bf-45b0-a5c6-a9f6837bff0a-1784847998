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
  const [applyPenalty, setApplyPenalty] = useState<boolean>(false);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<number>(0);
  const [totalMonths, setTotalMonths] = useState<number>(0);
  const [remainingMonths, setRemainingMonths] = useState<number>(0);

  useEffect(() => {
    if (!rental || !open) {
      setTerminationDate("");
      setApplyPenalty(false);
      setPenaltyAmount(0);
      setCurrentMonth(0);
      setTotalMonths(0);
      setRemainingMonths(0);
      return;
    }

    const startDate = parseISO(rental.start_date);
    const endDate = parseISO(rental.end_date);
    const today = new Date();

    const total = differenceInMonths(endDate, startDate) + 1;
    const current = differenceInMonths(today, startDate) + 1;

    setTotalMonths(total);
    setCurrentMonth(Math.min(current, total));
    setTerminationDate(format(today, "yyyy-MM-dd"));
  }, [rental, open]);

  useEffect(() => {
    if (!rental || !terminationDate) {
      setPenaltyAmount(0);
      setRemainingMonths(0);
      return;
    }

    try {
      const termDate = parseISO(terminationDate);
      const endDate = parseISO(rental.end_date);
      const remaining = Math.max(0, differenceInMonths(endDate, termDate));
      
      setRemainingMonths(remaining);

      if (applyPenalty && remaining > 0) {
        const monthlyRent = rental.rental_amount || 0;
        const penalty = (remaining * monthlyRent) * 0.10;
        setPenaltyAmount(penalty);
      } else {
        setPenaltyAmount(0);
      }
    } catch (error) {
      console.error("Error calculating penalty:", error);
      setPenaltyAmount(0);
      setRemainingMonths(0);
    }
  }, [rental, terminationDate, applyPenalty]);

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        terminationDate,
        applyPenalty,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Encerrar Contrato
          </DialogTitle>
          <DialogDescription>
            Você está encerrando o contrato de locação. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contract Progress */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso do Contrato</p>
                <p className="text-2xl font-bold">
                  Parcela {currentMonth}/{totalMonths}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="text-sm font-medium">
                  {format(parseISO(rental.start_date), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(parseISO(rental.end_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Termination Date */}
          <div className="space-y-2">
            <Label htmlFor="termination-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Rescisão *
            </Label>
            <Input
              id="termination-date"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              max={format(parseISO(rental.end_date), "yyyy-MM-dd")}
              required
            />
            <p className="text-xs text-muted-foreground">
              Esta data será usada para calcular o valor da rescisão
            </p>
          </div>

          {/* Apply Penalty Checkbox */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="apply-penalty"
              checked={applyPenalty}
              onCheckedChange={(checked) => setApplyPenalty(checked as boolean)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="apply-penalty"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Aplicar multa rescisória?
              </Label>
              <p className="text-xs text-muted-foreground">
                Multa de 10% sobre o valor dos meses restantes do contrato
              </p>
            </div>
          </div>

          {/* Penalty Calculation Info */}
          {applyPenalty && remainingMonths > 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Cálculo da Multa:</strong>
                <br />
                {remainingMonths} {remainingMonths === 1 ? "mês" : "meses"} restante(s) × R${" "}
                {rental.rental_amount?.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                × 10% = R${" "}
                {penaltyAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Termination Amount */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Valor Rescisão</Label>
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
              <p className="text-3xl font-bold text-primary">
                R${" "}
                {penaltyAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!terminationDate || isSubmitting}
          >
            {isSubmitting ? "Encerrando..." : "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}