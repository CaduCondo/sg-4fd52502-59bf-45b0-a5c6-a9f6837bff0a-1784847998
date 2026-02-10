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
import { Calendar, AlertTriangle, Info } from "lucide-react";
import type { Rental } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { calculateCorrectedDeposit } from "@/services/igpmService";

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
  
  // Estado para valor corrigido do caução pelo IGPM
  const [correctedDepositAmount, setCorrectedDepositAmount] = useState<number>(0);
  const [igpmPercentage, setIgpmPercentage] = useState<number>(0);

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

    // Buscar valor TOTAL do caução com MÚLTIPLAS FONTES DE DADOS
    const fetchTotalDeposit = async () => {
      try {
        console.log("💰 === BUSCANDO CAUÇÃO TOTAL (MULTI-FONTE) ===");
        console.log("Rental ID:", rental.id);

        let totalDeposit = 0;
        let source = "";

        // ========================================
        // FONTE 1: Tabela deposit_installments
        // ========================================
        console.log("\n🔍 FONTE 1: Buscando na tabela deposit_installments...");
        const { data: installments, error: installmentsError } = await supabase
          .from("deposit_installments")
          .select("amount, payment_date, installment_number")
          .eq("rental_id", rental.id);

        if (installmentsError) {
          console.error("❌ Erro ao buscar parcelas:", installmentsError);
        } else if (installments && installments.length > 0) {
          console.log("✅ Parcelas encontradas:", installments.length);
          console.log("📋 Detalhes:");
          installments.forEach(inst => {
            const status = inst.payment_date ? `✅ Pago em: ${inst.payment_date}` : "⏳ Pendente";
            console.log(`   Parcela ${inst.installment_number}: R$ ${inst.amount} (${status})`);
          });

          totalDeposit = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
          source = "deposit_installments (tabela de parcelas)";
          console.log("✅ SOMA DAS PARCELAS: R$", totalDeposit);
        } else {
          console.log("⚠️ Nenhuma parcela encontrada na deposit_installments");
        }

        // ========================================
        // FONTE 2: Campos antigos (deposit_installment_1/2/3)
        // ========================================
        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 2: Buscando nos campos antigos (deposit_installment_1/2/3)...");
          const { data: rentalData, error: rentalError } = await supabase
            .from("rentals")
            .select("deposit_installment_1, deposit_installment_2, deposit_installment_3")
            .eq("id", rental.id)
            .single();

          if (rentalError) {
            console.error("❌ Erro ao buscar rental:", rentalError);
          } else if (rentalData) {
            const inst1 = Number(rentalData.deposit_installment_1) || 0;
            const inst2 = Number(rentalData.deposit_installment_2) || 0;
            const inst3 = Number(rentalData.deposit_installment_3) || 0;

            console.log("📋 Detalhes dos campos antigos:");
            console.log(`   deposit_installment_1: R$ ${inst1}`);
            console.log(`   deposit_installment_2: R$ ${inst2}`);
            console.log(`   deposit_installment_3: R$ ${inst3}`);

            totalDeposit = inst1 + inst2 + inst3;
            if (totalDeposit > 0) {
              source = "campos deposit_installment_X (rentals)";
              console.log("✅ SOMA DOS CAMPOS ANTIGOS: R$", totalDeposit);
            } else {
              console.log("⚠️ Campos antigos também estão zerados");
            }
          }
        }

        // ========================================
        // FONTE 3: Campo security_deposit
        // ========================================
        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 3: Buscando no campo security_deposit...");
          const securityDepositValue = Number(rental.security_deposit) || 0;
          console.log(`   security_deposit: R$ ${securityDepositValue}`);

          if (securityDepositValue > 0) {
            totalDeposit = securityDepositValue;
            source = "security_deposit (rentals)";
            console.log("✅ USANDO SECURITY_DEPOSIT: R$", totalDeposit);
          } else {
            console.log("⚠️ security_deposit também está zerado");
          }
        }

        // ========================================
        // FONTE 4: Campo deposit_value
        // ========================================
        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 4: Buscando no campo deposit_value...");
          const { data: rentalData, error: rentalError } = await supabase
            .from("rentals")
            .select("deposit_value")
            .eq("id", rental.id)
            .single();

          if (rentalError) {
            console.error("❌ Erro ao buscar rental:", rentalError);
          } else if (rentalData) {
            const depositValue = Number(rentalData.deposit_value) || 0;
            console.log(`   deposit_value: R$ ${depositValue}`);

            if (depositValue > 0) {
              totalDeposit = depositValue;
              source = "deposit_value (rentals)";
              console.log("✅ USANDO DEPOSIT_VALUE: R$", totalDeposit);
            } else {
              console.log("⚠️ deposit_value também está zerado");
            }
          }
        }

        // ========================================
        // RESULTADO FINAL
        // ========================================
        console.log("\n💰 === RESULTADO FINAL ===");
        if (totalDeposit > 0) {
          console.log(`✅ Caução encontrado: R$ ${totalDeposit}`);
          console.log(`📍 Fonte: ${source}`);
        } else {
          console.error("❌ NENHUM VALOR DE CAUÇÃO ENCONTRADO EM NENHUMA FONTE!");
          console.log("⚠️ Rescisão será BLOQUEADA até o caução ser cadastrado");
        }
        console.log("💰 === FIM DA BUSCA ===\n");

        setDepositAmount(totalDeposit);
        
        // APLICAR CORREÇÃO DO IGPM NO CAUÇÃO
        if (totalDeposit > 0 && rental.startDate && terminationDate) {
          console.log("\n💰 === APLICANDO CORREÇÃO POUPANÇA NO CAUÇÃO ===");
          console.log("Valor original do caução:", totalDeposit);
          console.log("Data início contrato:", rental.startDate);
          console.log("Data rescisão:", terminationDate);
          
          try {
            const poupancaCorrection = calculateCorrectedDeposit(
              totalDeposit,
              rental.startDate,
              terminationDate
            );
            
            console.log("✅ Valor corrigido pela Poupança:", poupancaCorrection.correctedAmount);
            console.log("📊 Percentual Poupança acumulado:", poupancaCorrection.poupancaPercentage.toFixed(2) + "%");
            console.log("📅 Detalhamento:", poupancaCorrection.poupancaDetails);
            console.log("💰 === FIM DA APLICAÇÃO DA POUPANÇA ===\n");
            
            setCorrectedDepositAmount(poupancaCorrection.correctedAmount);
            setIgpmPercentage(poupancaCorrection.poupancaPercentage);
          } catch (error) {
            console.error("❌ Erro ao calcular Poupança:", error);
            setCorrectedDepositAmount(totalDeposit); // Fallback para valor original
            setIgpmPercentage(0);
          }
        } else {
          console.log("⚠️ Não foi possível calcular Poupança (dados insuficientes)");
          setCorrectedDepositAmount(totalDeposit);
          setIgpmPercentage(0);
        }

      } catch (error) {
        console.error("❌ Erro CRÍTICO ao buscar caução:", error);
        console.error("Detalhes:", JSON.stringify(error, null, 2));
        setDepositAmount(0);
        setCorrectedDepositAmount(0);
        setIgpmPercentage(0);
      }
    };

    fetchTotalDeposit();
  }, [rental, open, terminationDate]);

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
      const paymentDay = rental.paymentDay || 1;
      const terminationDay = termDate.getDate();
      
      let daysUsed = 0;
      if (terminationDay >= paymentDay) {
        daysUsed = terminationDay - paymentDay + 1;
      } else {
        daysUsed = 30;
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

  const handleConfirm = async () => {
    if (!terminationDate) {
      return;
    }

    // VALIDAÇÃO CRÍTICA: Impedir rescisão se caução = 0
    if (depositAmount === 0) {
      alert(
        "⚠️ ATENÇÃO: Não é possível rescindir o contrato sem caução cadastrado.\n\n" +
        "O sistema não encontrou o valor do caução em nenhuma fonte de dados:\n" +
        "• Tabela deposit_installments\n" +
        "• Campos deposit_installment_1/2/3\n" +
        "• Campo security_deposit\n" +
        "• Campo deposit_value\n\n" +
        "Por favor, verifique se o caução foi cadastrado corretamente e tente novamente."
      );
      console.error("❌ RESCISÃO BLOQUEADA: depositAmount = 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        terminationDate,
        applyPenalty: applyFullContractPenalty || apply12MonthsPenalty,
        penaltyAmount,
        depositAmount: correctedDepositAmount > 0 ? correctedDepositAmount : depositAmount, // Usa valor corrigido se disponível
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
          {depositAmount > 0 ? (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    🔔 ATENÇÃO: VALOR DO CAUÇÃO
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Esta rescisão devolverá:
                  </p>
                  {igpmPercentage > 0 ? (
                    <>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p>Valor original: R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="font-medium">Correção Poupança: {igpmPercentage.toFixed(2)}%</p>
                      </div>
                      <p className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100">
                        R$ {correctedDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Valor corrigido pela Taxa da Poupança do período.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100">
                        R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Será adicionado ao recebimento final.
                      </p>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    ⚠️ ATENÇÃO: CAUÇÃO NÃO ENCONTRADO
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    O sistema não encontrou o valor do caução para esta locação.
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Não será possível prosseguir com a rescisão até que o caução seja cadastrado corretamente.
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
            disabled={!terminationDate || isSubmitting || depositAmount === 0}
          >
            {isSubmitting ? "Processando..." : "Confirmar Rescisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}