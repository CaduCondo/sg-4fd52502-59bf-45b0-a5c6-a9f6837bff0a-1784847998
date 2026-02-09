import { useState, useEffect } from "react";
import { format, differenceInMonths, parseISO, differenceInDays } from "date-fns";
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
import { Calendar, AlertTriangle, Info } from "lucide-react";
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
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [proportionalDays, setProportionalDays] = useState<number>(0);
  const [proportionalRent, setProportionalRent] = useState<number>(0);

  const [currentMonth, setCurrentMonth] = useState<number>(0);
  const [totalMonths, setTotalMonths] = useState<number>(0);

  useEffect(() => {
    if (!rental || !open) {
      setTerminationDate("");
      setApplyFullContractPenalty(false);
      setApply12MonthsPenalty(false);
      setPenaltyAmount(0);
      setIsSubmitting(false);
      setCurrentMonth(0);
      setTotalMonths(0);
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

    // Buscar valor TOTAL do caução (TODAS as parcelas, pagas ou não)
    const fetchTotalDeposit = async () => {
      try {
        console.log("💰 === BUSCANDO CAUÇÃO TOTAL (CORRIGIDO) ===");
        console.log("Rental ID:", rental.id);

        // BUSCAR TODAS AS PARCELAS (pagas ou não pagas)
        const { data: installments, error } = await supabase
          .from("deposit_installments")
          .select("amount, payment_date, installment_number")
          .eq("rental_id", rental.id);

        if (error) {
          console.error("❌ Erro ao buscar parcelas:", error);
          throw error;
        }

        console.log("✅ Total de parcelas encontradas:", installments?.length || 0);
        
        if (installments && installments.length > 0) {
          console.log("📋 Detalhes de TODAS as parcelas:");
          installments.forEach(inst => {
            const status = inst.payment_date ? `✅ Pago em: ${inst.payment_date}` : "⏳ Pendente";
            console.log(`   Parcela ${inst.installment_number}: R$ ${inst.amount} (${status})`);
          });

          // SOMAR TODAS AS PARCELAS (independente de pagamento)
          const totalDeposit = installments.reduce(
            (sum, inst) => sum + (inst.amount || 0), 
            0
          );

          console.log("📊 CAUÇÃO TOTAL (soma de todas as parcelas):", totalDeposit);
          console.log("💰 === CAUÇÃO FINAL: R$", totalDeposit, "===\n");
          
          setDepositAmount(totalDeposit);
          return;
        }

        // Fallback: usar security_deposit apenas se NÃO houver parcelas
        console.log("⚠️ NENHUMA parcela encontrada - Usando security_deposit como fallback");
        const fallbackValue = rental.security_deposit || 0;
        console.log("💰 Security Deposit (fallback): R$", fallbackValue);
        console.log("💰 === CAUÇÃO FINAL: R$", fallbackValue, "===\n");
        
        setDepositAmount(fallbackValue);

      } catch (error) {
        console.error("❌ Erro ao calcular caução:", error);
        console.error("Detalhes do erro:", JSON.stringify(error, null, 2));
        
        // Em caso de erro, usar security_deposit como último recurso
        const fallbackValue = rental.security_deposit || 0;
        console.log("⚠️ Usando fallback devido ao erro: R$", fallbackValue);
        setDepositAmount(fallbackValue);
      }
    };

    fetchTotalDeposit();
  }, [rental, open]);

  // Calcular aluguel proporcional e multas ao mudar data
  useEffect(() => {
    if (!rental || !terminationDate) {
      setPenaltyAmount(0);
      setProportionalDays(0);
      setProportionalRent(0);
      return;
    }

    try {
      const termDate = parseISO(terminationDate);
      const startDate = parseISO(rental.startDate);
      const endDate = parseISO(rental.endDate);
      
      const currentMonthFromDate = differenceInMonths(termDate, startDate) + 1;
      const remaining = Math.max(0, differenceInMonths(endDate, termDate));

      const monthlyRent = rental.value || 0;

      // Calcular aluguel proporcional
      // Do dia de vencimento (rental.paymentDay) até o dia da rescisão
      const paymentDay = rental.paymentDay || 1;
      const terminationDay = termDate.getDate();
      
      // Se rescisão é antes do vencimento, considera mês anterior
      // Se rescisão é depois do vencimento, calcula dias do vencimento até rescisão
      let daysUsed = 0;
      if (terminationDay >= paymentDay) {
        daysUsed = terminationDay - paymentDay + 1;
      } else {
        // Rescisão antes do vencimento - considera mês completo anterior
        daysUsed = 30; // Simplificação - considera mês padrão
      }
      
      setProportionalDays(daysUsed);
      const proportionalValue = (monthlyRent / 30) * daysUsed;
      setProportionalRent(proportionalValue);

      // Calcular multas
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
        } else {
          setPenaltyAmount(0);
        }
      } 
      else {
        setPenaltyAmount(0);
      }
    } catch (error) {
      console.error("Error calculating values:", error);
      setPenaltyAmount(0);
      setProportionalDays(0);
      setProportionalRent(0);
    }
  }, [rental, terminationDate, applyFullContractPenalty, apply12MonthsPenalty, totalMonths]);

  // Calcular multas ao mudar data ou checkbox
  useEffect(() => {
    if (!rental || !terminationDate) {
      setPenaltyAmount(0);
      return;
    }

    try {
      const termDate = parseISO(terminationDate);
      const startDate = parseISO(rental.startDate);
      const endDate = parseISO(rental.endDate);
      
      const monthlyRent = rental.value || 0;
      
      // Calcular meses decorridos desde o início
      const monthsElapsed = differenceInMonths(termDate, startDate);
      
      // Calcular meses restantes até o fim
      const monthsRemaining = differenceInMonths(endDate, termDate);

      console.log("📊 Cálculo de Multa:", {
        dataInicio: rental.startDate,
        dataRescisao: terminationDate,
        dataFim: rental.endDate,
        mesesDecorridos: monthsElapsed,
        mesesRestantes: monthsRemaining,
        aluguelMensal: monthlyRent
      });

      // REGRA 1: Multa Proporcional ao Tempo Restante (até o fim do contrato)
      if (applyFullContractPenalty && monthsRemaining > 0) {
        // 3 aluguéis dividido pelos meses TOTAIS do contrato × meses RESTANTES
        const totalContractMonths = totalMonths;
        const threeRents = 3 * monthlyRent;
        const penaltyPerMonth = threeRents / totalContractMonths;
        const penalty = penaltyPerMonth * monthsRemaining;
        
        console.log("💰 Multa Proporcional:", {
          formula: `(3 × ${monthlyRent}) ÷ ${totalContractMonths} × ${monthsRemaining}`,
          resultado: penalty
        });
        
        setPenaltyAmount(penalty);
      }
      // REGRA 2: Multa Cláusula 12 Meses (se sair antes de completar 12 meses)
      else if (apply12MonthsPenalty) {
        if (monthsElapsed < 12) {
          // 3 aluguéis dividido por 12 × meses FALTANDO para completar 12
          const monthsTo12 = 12 - monthsElapsed;
          const threeRents = 3 * monthlyRent;
          const penaltyPerMonth = threeRents / 12;
          const penalty = penaltyPerMonth * monthsTo12;
          
          console.log("💰 Multa 12 Meses:", {
            mesesDecorridos: monthsElapsed,
            mesesFaltandoPara12: monthsTo12,
            formula: `(3 × ${monthlyRent}) ÷ 12 × ${monthsTo12}`,
            resultado: penalty
          });
          
          setPenaltyAmount(penalty);
        } else {
          console.log("✅ Isento de multa (12+ meses)");
          setPenaltyAmount(0);
        }
      }
      else {
        setPenaltyAmount(0);
      }
    } catch (error) {
      console.error("❌ Erro ao calcular multa:", error);
      setPenaltyAmount(0);
    }
  }, [rental, terminationDate, applyFullContractPenalty, apply12MonthsPenalty, totalMonths]);

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    // VALIDAÇÃO CRÍTICA: Impedir rescisão se caução = 0
    if (depositAmount === 0) {
      alert("⚠️ ATENÇÃO: Não é possível rescindir o contrato sem caução.\n\nPor favor, verifique se o caução foi cadastrado corretamente no sistema.");
      console.error("❌ RESCISÃO BLOQUEADA: depositAmount = 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        terminationDate,
        applyPenalty: applyFullContractPenalty || apply12MonthsPenalty,
        penaltyAmount,
        depositAmount,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rescisão de Contrato
          </DialogTitle>
          <DialogDescription>
            Encerramento de contrato de locação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info da Locação */}
          <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Imóvel:</span>
              <span className="font-medium">
                {typeof rental.property?.location === 'object' 
                  ? (rental.property?.location as any)?.name 
                  : rental.property?.location} - {rental.property?.complement}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inquilino:</span>
              <span className="font-medium">{rental.tenant?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aluguel:</span>
              <span className="font-medium">
                R$ {monthlyRent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* ALERTA DESTACADO - VALOR DO CAUÇÃO */}
          {depositAmount > 0 && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    🔔 ATENÇÃO: VALOR DO CAUÇÃO
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Esta rescisão devolverá:
                  </p>
                  <p className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100">
                    R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Valor corrigido pela inflação será adicionado automaticamente ao recebimento final.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Data da Rescisão */}
          <div className="space-y-2">
            <Label htmlFor="termination-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Saída do Inquilino *
            </Label>
            <Input
              id="termination-date"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              max={format(parseISO(rental.endDate), "yyyy-MM-dd")}
              required
            />
            {proportionalDays > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Aluguel proporcional: {proportionalDays} dias × R$ {(monthlyRent / 30).toFixed(2)}/dia = R$ {proportionalRent.toFixed(2)}
              </p>
            )}
          </div>

          {/* Multas */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Multa Rescisória</Label>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="apply-full-penalty"
                  checked={applyFullContractPenalty}
                  onCheckedChange={(checked) => {
                    setApplyFullContractPenalty(checked as boolean);
                    if (checked) setApply12MonthsPenalty(false);
                  }}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="apply-full-penalty" className="cursor-pointer font-normal">
                    Multa Proporcional ao Tempo Restante
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
                <div className="grid gap-1 leading-none">
                  <Label 
                    htmlFor="apply-12months-penalty" 
                    className={`cursor-pointer font-normal ${currentMonth >= 12 ? "opacity-50" : ""}`}
                  >
                    Multa Cláusula 12 Meses
                  </Label>
                  {currentMonth >= 12 ? (
                    <span className="text-xs text-green-600 font-medium">Isento (após 12 meses)</span>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      (3 aluguéis ÷ 12) × meses até completar 12
                    </p>
                  )}
                </div>
              </div>

              {penaltyAmount > 0 && (
                <div className="flex justify-between items-center bg-red-50 dark:bg-red-950 p-2 rounded">
                  <span className="text-sm text-red-700 dark:text-red-300 font-medium">Valor da Multa:</span>
                  <span className="font-bold text-red-700 dark:text-red-300">
                    R$ {penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Caução */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950 p-3 rounded">
              <div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Caução Total a Devolver</span>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Valor será corrigido pela inflação e incluído no recebimento final
                </p>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Resumo */}
          <Alert>
            <AlertDescription className="text-xs space-y-1">
              <p className="font-medium">O que vai acontecer:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Recebimento do mês será atualizado com aluguel proporcional</li>
                <li>Recebimentos futuros serão excluídos</li>
                <li>Multa e caução serão adicionados ao recebimento</li>
                <li>Despesas de reforma podem ser adicionadas depois na tela de Recebimentos</li>
              </ul>
            </AlertDescription>
          </Alert>
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
            {isSubmitting ? "Processando..." : "Confirmar Rescisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}