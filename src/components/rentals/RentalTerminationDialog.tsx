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
  
  const [correctedDepositAmount, setCorrectedDepositAmount] = useState<number>(0);
  const [poupancaPercentage, setPoupancaPercentage] = useState<number>(0);
  const [lastInstallmentDate, setLastInstallmentDate] = useState<string>("");

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
      setCorrectedDepositAmount(0);
      setPoupancaPercentage(0);
      setLastInstallmentDate("");
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

    const fetchTotalDeposit = async () => {
      try {
        console.log("\n\n");
        console.log("💰 ========================================");
        console.log("💰   BUSCA DE CAUÇÃO E DATA BASE POUPANÇA");
        console.log("💰 ========================================");
        console.log("📋 Rental ID:", rental.id);

        let totalDeposit = 0;
        let source = "";
        let lastPaidDate = "";

        console.log("\n🔍 FONTE 1: Tabela deposit_installments");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const { data: installments, error: installmentsError } = await supabase
          .from("deposit_installments")
          .select("amount, payment_date, installment_number")
          .eq("rental_id", rental.id)
          .order("installment_number", { ascending: false });

        if (installmentsError) {
          console.error("❌ Erro ao buscar parcelas:", installmentsError);
        } else if (installments && installments.length > 0) {
          console.log("✅ Total de parcelas encontradas:", installments.length);
          console.log("\n📊 TODAS AS PARCELAS (ordem DESC - maior para menor):");
          
          installments.forEach((inst, index) => {
            const status = inst.payment_date ? `✅ PAGA em ${inst.payment_date}` : "⏳ PENDENTE";
            console.log(`   ${index + 1}. Parcela ${inst.installment_number}: R$ ${inst.amount.toFixed(2)} - ${status}`);
          });

          const paidInstallments = installments.filter(inst => inst.payment_date);
          
          console.log("\n🎯 PARCELAS PAGAS (filtradas, ordem DESC):");
          if (paidInstallments.length > 0) {
            paidInstallments.forEach((inst, index) => {
              console.log(`   ${index + 1}. Parcela ${inst.installment_number}: Data ${inst.payment_date}`);
            });
            
            const lastPaid = paidInstallments[0];
            lastPaidDate = lastPaid.payment_date;
            
            console.log("\n🔥🔥🔥 CONFIRMAÇÃO DA DATA BASE 🔥🔥🔥");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("✅ ÚLTIMA PARCELA PAGA IDENTIFICADA:");
            console.log(`   • Número da Parcela: ${lastPaid.installment_number}`);
            console.log(`   • Valor: R$ ${lastPaid.amount.toFixed(2)}`);
            console.log(`   • Data de Pagamento: ${lastPaidDate}`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📅 ESTA DATA SERÁ USADA COMO BASE PARA CORREÇÃO POUPANÇA");
            console.log("🔥🔥🔥 FIM DA CONFIRMAÇÃO 🔥🔥🔥\n");
          } else {
            console.log("⚠️ Nenhuma parcela paga ainda");
            lastPaidDate = rental.startDate;
            console.log(`📅 Usando data início do contrato como base: ${lastPaidDate}`);
          }

          totalDeposit = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
          source = "deposit_installments";
          console.log(`\n💰 SOMA TOTAL DAS PARCELAS: R$ ${totalDeposit.toFixed(2)}`);
        } else {
          console.log("⚠️ Nenhuma parcela encontrada");
        }

        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 2: Campos antigos (deposit_installment_1/2/3)");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          
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

            console.log(`   Parcela 1: R$ ${inst1.toFixed(2)}`);
            console.log(`   Parcela 2: R$ ${inst2.toFixed(2)}`);
            console.log(`   Parcela 3: R$ ${inst3.toFixed(2)}`);

            totalDeposit = inst1 + inst2 + inst3;
            if (totalDeposit > 0) {
              source = "campos deposit_installment_X";
              lastPaidDate = rental.startDate;
              console.log(`✅ Total: R$ ${totalDeposit.toFixed(2)}`);
            }
          }
        }

        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 3: Campo security_deposit");
          const securityDepositValue = Number(rental.security_deposit) || 0;
          if (securityDepositValue > 0) {
            totalDeposit = securityDepositValue;
            source = "security_deposit";
            lastPaidDate = rental.startDate;
            console.log(`✅ Valor: R$ ${totalDeposit.toFixed(2)}`);
          }
        }

        if (totalDeposit === 0) {
          console.log("\n🔍 FONTE 4: Campo deposit_value");
          const { data: rentalData } = await supabase
            .from("rentals")
            .select("deposit_value")
            .eq("id", rental.id)
            .single();

          if (rentalData) {
            const depositValue = Number(rentalData.deposit_value) || 0;
            if (depositValue > 0) {
              totalDeposit = depositValue;
              source = "deposit_value";
              lastPaidDate = rental.startDate;
              console.log(`✅ Valor: R$ ${totalDeposit.toFixed(2)}`);
            }
          }
        }

        console.log("\n💰 ========================================");
        console.log("💰   RESULTADO FINAL DA BUSCA");
        console.log("💰 ========================================");
        if (totalDeposit > 0) {
          console.log(`✅ Caução encontrado: R$ ${totalDeposit.toFixed(2)}`);
          console.log(`📍 Fonte: ${source}`);
          console.log(`📅 Data base: ${lastPaidDate}`);
        } else {
          console.error("❌ NENHUM VALOR DE CAUÇÃO ENCONTRADO!");
        }
        console.log("💰 ========================================\n");

        setDepositAmount(totalDeposit);
        setLastInstallmentDate(lastPaidDate);
        
        if (totalDeposit > 0 && lastPaidDate) {
          console.log("\n📈 ========================================");
          console.log("📈   APLICAÇÃO DA CORREÇÃO POUPANÇA");
          console.log("📈 ========================================");
          console.log(`💰 Valor original: R$ ${totalDeposit.toFixed(2)}`);
          console.log(`📅 Data base (última parcela): ${lastPaidDate}`);
          console.log(`📅 Data rescisão (hoje): ${format(today, "yyyy-MM-dd")}`);
          
          try {
            const poupancaCorrection = calculateCorrectedDeposit(
              totalDeposit,
              lastPaidDate,
              format(today, "yyyy-MM-dd")
            );
            
            console.log(`✅ Valor corrigido: R$ ${poupancaCorrection.correctedAmount.toFixed(2)}`);
            console.log(`📊 Percentual Poupança: +${poupancaCorrection.poupancaPercentage.toFixed(4)}%`);
            console.log(`📋 Detalhes: ${poupancaCorrection.poupancaDetails}`);
            console.log("📈 ========================================\n");
            
            setCorrectedDepositAmount(poupancaCorrection.correctedAmount);
            setPoupancaPercentage(poupancaCorrection.poupancaPercentage);
          } catch (error) {
            console.error("❌ Erro ao calcular Poupança:", error);
            setCorrectedDepositAmount(totalDeposit);
            setPoupancaPercentage(0);
          }
        } else {
          setCorrectedDepositAmount(totalDeposit);
          setPoupancaPercentage(0);
        }

      } catch (error) {
        console.error("❌ ERRO CRÍTICO:", error);
        setDepositAmount(0);
        setCorrectedDepositAmount(0);
        setPoupancaPercentage(0);
        setLastInstallmentDate("");
      }
    };

    fetchTotalDeposit();
  }, [rental, open]);

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
        depositAmount: correctedDepositAmount > 0 ? correctedDepositAmount : depositAmount,
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
                  {correctedDepositAmount > 0 && poupancaPercentage > 0 ? (
                    <>
                      <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <p>Valor original: R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p>Data base: {lastInstallmentDate ? format(parseISO(lastInstallmentDate), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}</p>
                        <p className="font-medium">Correção Poupança: +{poupancaPercentage.toFixed(4)}%</p>
                      </div>
                      <p className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100">
                        R$ {correctedDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Valor corrigido pela Taxa da Poupança desde {lastInstallmentDate ? format(parseISO(lastInstallmentDate), "dd/MM/yyyy", { locale: ptBR }) : "data início"} até hoje.
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
              required
            />
            {proportionalDays > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Aluguel proporcional: {proportionalDays} dias × R$ {(monthlyRent / 30).toFixed(2)}/dia = R$ {proportionalRent.toFixed(2)}
              </p>
            )}
          </div>

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