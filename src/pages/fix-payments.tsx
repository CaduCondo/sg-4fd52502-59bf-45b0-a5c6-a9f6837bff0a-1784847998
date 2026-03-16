import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FixResult {
  success: boolean;
  summary: {
    totalRentals: number;
    totalFixed: number;
    paymentsCreated: number;
    paymentsUpdated: number;
    paymentsDeleted: number;
    paidPaymentsRenumbered: number;
  };
  details: Array<{
    rentalInfo: string;
    changes: string[];
    paidPaymentsChanges: string[];
  }>;
}

/**
 * Calcula o número de dias entre duas datas (inclusivo)
 */
function daysBetween(start: Date, end: Date): number {
  const oneDay = 1000 * 60 * 60 * 24;
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / oneDay) + 1;
}

/**
 * Nova lógica de geração de recebimentos esperados
 * Segue as regras definidas pelo usuário
 */
function generateExpectedPayments(rental: any) {
  const payments = [];
  const startDate = new Date(rental.start_date);
  const endDate = new Date(rental.end_date);
  const paymentDay = rental.rent_due_day;
  const rentValue = parseFloat(rental.rent_value || 0);
  const garageValue = rental.has_garage ? parseFloat(rental.garage_value || 0) : 0;
  
  console.log(`\n=== GERANDO RECEBIMENTOS PARA LOCAÇÃO ${rental.id} ===`);
  console.log(`📅 Período: ${rental.start_date} até ${rental.end_date}`);
  console.log(`💵 Valor mensal: R$ ${rentValue.toFixed(2)} ${garageValue > 0 ? `+ Garagem R$ ${garageValue.toFixed(2)}` : ''}`);
  console.log(`📌 Dia vencimento: ${paymentDay}`);
  console.log(`📅 Data início: dia ${startDate.getDate()} do mês ${startDate.getMonth() + 1}`);

  // **ETAPA 1: Determinar o primeiro mês de cobrança**
  let firstPaymentMonth: number;
  let firstPaymentYear: number;
  let firstPaymentDaysToCharge: number;
  let firstPaymentStartDate: Date;
  let firstPaymentEndDate: Date;

  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth() + 1;
  const startYear = startDate.getFullYear();

  if (startDay <= paymentDay) {
    // Primeiro recebimento no MESMO mês
    firstPaymentMonth = startMonth;
    firstPaymentYear = startYear;
    firstPaymentStartDate = new Date(startDate);
    firstPaymentEndDate = new Date(startYear, startMonth - 1, paymentDay);
    firstPaymentDaysToCharge = daysBetween(firstPaymentStartDate, firstPaymentEndDate);
    
    console.log(`✅ Primeiro recebimento no MESMO mês (${startDay} <= ${paymentDay})`);
    console.log(`   Período: ${firstPaymentStartDate.toISOString().split('T')[0]} até ${firstPaymentEndDate.toISOString().split('T')[0]}`);
    console.log(`   Dias a cobrar: ${firstPaymentDaysToCharge}`);
  } else {
    // Primeiro recebimento no MÊS SEGUINTE
    firstPaymentMonth = startMonth === 12 ? 1 : startMonth + 1;
    firstPaymentYear = startMonth === 12 ? startYear + 1 : startYear;
    firstPaymentStartDate = new Date(startDate);
    firstPaymentEndDate = new Date(firstPaymentYear, firstPaymentMonth - 1, paymentDay);
    firstPaymentDaysToCharge = daysBetween(firstPaymentStartDate, firstPaymentEndDate);
    
    console.log(`✅ Primeiro recebimento no MÊS SEGUINTE (${startDay} > ${paymentDay})`);
    console.log(`   Período: ${firstPaymentStartDate.toISOString().split('T')[0]} até ${firstPaymentEndDate.toISOString().split('T')[0]}`);
    console.log(`   Dias a cobrar: ${firstPaymentDaysToCharge}`);
  }

  // **ETAPA 2: Criar o primeiro recebimento (sempre parcela 1/XX)**
  const firstPaymentDueDate = `${firstPaymentYear}-${String(firstPaymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
  
  const firstProportionalRent = (rentValue / 30) * firstPaymentDaysToCharge;
  const firstProportionalGarage = garageValue > 0 ? (garageValue / 30) * firstPaymentDaysToCharge : 0;
  const firstPaymentAmount = firstProportionalRent + firstProportionalGarage;

  const firstPaymentBreakdown: Array<{ description: string; amount: number; type: string }> = [
    {
      description: `Aluguel - Parcela 1 (${firstPaymentDaysToCharge} dias)`,
      amount: parseFloat(firstProportionalRent.toFixed(2)),
      type: "addition",
    }
  ];

  if (garageValue > 0) {
    firstPaymentBreakdown.push({
      description: `Garagem Proporcional (${firstPaymentDaysToCharge} dias)`,
      amount: parseFloat(firstProportionalGarage.toFixed(2)),
      type: "addition",
    });
  }

  payments.push({
    rental_id: rental.id,
    reference_month: String(firstPaymentMonth).padStart(2, '0'),
    reference_year: String(firstPaymentYear),
    due_date: firstPaymentDueDate,
    expected_amount: parseFloat(firstPaymentAmount.toFixed(2)),
    status: "pending",
    breakdown: firstPaymentBreakdown,
    installment: 1,
    period_start: firstPaymentStartDate.toISOString().split('T')[0],
    period_end: firstPaymentEndDate.toISOString().split('T')[0],
    days_charged: firstPaymentDaysToCharge
  });

  console.log(`📝 Primeiro recebimento: 1/XX - ${firstPaymentDueDate} - R$ ${firstPaymentAmount.toFixed(2)}`);

  // **ETAPA 3: Criar recebimentos intermediários (valor integral)**
  let currentMonth = firstPaymentMonth;
  let currentYear = firstPaymentYear;
  let installmentNumber = 1;

  // Loop para criar recebimentos até o último mês
  while (true) {
    // Avançar para o próximo mês
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }

    // Verificar se chegamos no último mês do contrato
    const endMonth = endDate.getMonth() + 1;
    const endYear = endDate.getFullYear();

    // Se passou do último mês, parar
    if (currentYear > endYear || (currentYear === endYear && currentMonth > endMonth)) {
      break;
    }

    const dueDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
    
    // Verificar se este é o ÚLTIMO recebimento
    const isLastPayment = (currentYear === endYear && currentMonth === endMonth);

    if (isLastPayment) {
      // **ÚLTIMO RECEBIMENTO (proporcional)**
      const lastPaymentStartDate = new Date(currentYear, currentMonth - 1, paymentDay);
      const lastPaymentEndDate = new Date(endDate);
      const lastPaymentDaysToCharge = daysBetween(lastPaymentStartDate, lastPaymentEndDate);

      const lastProportionalRent = (rentValue / 30) * lastPaymentDaysToCharge;
      const lastProportionalGarage = garageValue > 0 ? (garageValue / 30) * lastPaymentDaysToCharge : 0;
      const lastPaymentAmount = lastProportionalRent + lastProportionalGarage;

      installmentNumber++;

      const lastPaymentBreakdown: Array<{ description: string; amount: number; type: string }> = [
        {
          description: `Aluguel - Última Parcela (${lastPaymentDaysToCharge} dias)`,
          amount: parseFloat(lastProportionalRent.toFixed(2)),
          type: "addition",
        }
      ];

      if (garageValue > 0) {
        lastPaymentBreakdown.push({
          description: `Garagem Proporcional (${lastPaymentDaysToCharge} dias)`,
          amount: parseFloat(lastProportionalGarage.toFixed(2)),
          type: "addition",
        });
      }

      payments.push({
        rental_id: rental.id,
        reference_month: String(currentMonth).padStart(2, '0'),
        reference_year: String(currentYear),
        due_date: dueDate,
        expected_amount: parseFloat(lastPaymentAmount.toFixed(2)),
        status: "pending",
        breakdown: lastPaymentBreakdown,
        installment: installmentNumber,
        period_start: lastPaymentStartDate.toISOString().split('T')[0],
        period_end: lastPaymentEndDate.toISOString().split('T')[0],
        days_charged: lastPaymentDaysToCharge
      });

      console.log(`📝 Último recebimento: ${installmentNumber}/XX - ${dueDate} - R$ ${lastPaymentAmount.toFixed(2)} (${lastPaymentDaysToCharge} dias)`);
      
      break; // Saímos do loop pois criamos o último
    } else {
      // **RECEBIMENTO INTERMEDIÁRIO (valor integral)**
      const totalMonthlyValue = rentValue + garageValue;

      installmentNumber++;

      const breakdown: Array<{ description: string; amount: number; type: string }> = [
        {
          description: "Aluguel",
          amount: parseFloat(rentValue.toFixed(2)),
          type: "addition",
        }
      ];

      if (garageValue > 0) {
        breakdown.push({
          description: "Garagem",
          amount: parseFloat(garageValue.toFixed(2)),
          type: "addition",
        });
      }

      payments.push({
        rental_id: rental.id,
        reference_month: String(currentMonth).padStart(2, '0'),
        reference_year: String(currentYear),
        due_date: dueDate,
        expected_amount: parseFloat(totalMonthlyValue.toFixed(2)),
        status: "pending",
        breakdown: breakdown,
        installment: installmentNumber,
        period_start: null,
        period_end: null,
        days_charged: 30
      });

      console.log(`📝 Recebimento ${installmentNumber}/XX - ${dueDate} - R$ ${totalMonthlyValue.toFixed(2)} (mês completo)`);
    }
  }

  // **ETAPA 4: Adicionar total_installments a todos os recebimentos**
  const totalInstallments = payments.length;
  
  payments.forEach(payment => {
    payment.total_installments = totalInstallments;
  });

  console.log(`✅ Total de recebimentos gerados: ${totalInstallments}`);
  console.log(`✅ Numeração: 1/${totalInstallments} até ${totalInstallments}/${totalInstallments}`);

  return payments;
}

export default function FixPaymentsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRental, setCurrentRental] = useState("");
  const [result, setResult] = useState<FixResult | null>(null);

  const runFix = async () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      console.log("\n🚀 ============================================");
      console.log("🚀   INICIANDO CORREÇÃO DE RECEBIMENTOS");
      console.log("🚀 ============================================\n");

      // Fetch all active and ended rentals
      const { data: rentals, error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .in("status", ["active", "ended"]);

      if (rentalsError) throw rentalsError;

      console.log(`📋 Total de locações ativas/finalizadas: ${rentals.length}\n`);

      const summary = {
        totalRentals: rentals.length,
        totalFixed: 0,
        paymentsCreated: 0,
        paymentsUpdated: 0,
        paymentsDeleted: 0,
        paidPaymentsRenumbered: 0
      };

      const details: Array<{ rentalInfo: string; changes: string[]; paidPaymentsChanges: string[] }> = [];

      for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
        setProgress(((i + 1) / rentals.length) * 100);
        
        // Fetch property and tenant data
        const { data: property } = await supabase
          .from("properties")
          .select("property_identifier")
          .eq("id", rental.property_id)
          .single();
        
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", rental.tenant_id)
          .single();
        
        const propertyName = property?.property_identifier || `Imóvel ID: ${rental.property_id.substring(0, 8)}`;
        const tenantName = tenant?.name || 'Inquilino';
        
        setCurrentRental(`${propertyName} - ${tenantName}`);
        
        console.log(`\n🏠 ============================================`);
        console.log(`🏠 PROCESSANDO LOCAÇÃO ${i + 1}/${rentals.length}`);
        console.log(`🏠 ${propertyName} - ${tenantName}`);
        console.log(`🏠 ============================================`);

        const rentalChanges: string[] = [];
        const paidPaymentsChanges: string[] = [];

        // Validate rental data
        if (!rental.start_date || !rental.end_date || !rental.rent_due_day) {
          rentalChanges.push(`⚠️ ERRO: Dados do contrato inválidos`);
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges,
            paidPaymentsChanges: []
          });
          continue;
        }

        // Fetch existing payments
        const { data: existingPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("rental_id", rental.id)
          .order("due_date", { ascending: true });

        if (paymentsError) throw paymentsError;
        
        console.log(`📋 Recebimentos existentes: ${existingPayments.length}`);

        // Generate expected payments
        const expectedPayments = generateExpectedPayments(rental);

        console.log(`\n📊 COMPARAÇÃO:`);
        console.log(`   Existentes: ${existingPayments.length}`);
        console.log(`   Esperados: ${expectedPayments.length}`);

        // Separate paid and pending payments
        const paidPayments = existingPayments.filter(p => p.status === 'paid');
        const pendingPayments = existingPayments.filter(p => p.status === 'pending' || p.status === 'overdue');

        console.log(`   Pagos: ${paidPayments.length}`);
        console.log(`   Pendentes: ${pendingPayments.length}`);

        // **PROCESSO 1: Atualizar numeração de recebimentos PAGOS**
        console.log(`\n💰 ATUALIZANDO NUMERAÇÃO DE RECEBIMENTOS PAGOS...`);
        
        for (const paidPayment of paidPayments) {
          // Encontrar o recebimento esperado correspondente (mesmo mês/ano)
          const expectedMatch = expectedPayments.find(exp => 
            exp.reference_month === String(paidPayment.reference_month).padStart(2, '0') &&
            exp.reference_year === String(paidPayment.reference_year)
          );

          if (expectedMatch) {
            const needsUpdate = 
              paidPayment.installment !== expectedMatch.installment ||
              paidPayment.total_installments !== expectedMatch.total_installments;

            if (needsUpdate) {
              console.log(`   🔢 Atualizando: ${paidPayment.due_date}`);
              console.log(`      Parcela: ${paidPayment.installment || 'null'}/${paidPayment.total_installments || 'null'} → ${expectedMatch.installment}/${expectedMatch.total_installments}`);
              
              await supabase
                .from("payments")
                .update({
                  installment: expectedMatch.installment,
                  total_installments: expectedMatch.total_installments
                })
                .eq("id", paidPayment.id);

              summary.paidPaymentsRenumbered++;
              paidPaymentsChanges.push(
                `🔢 Recebimento PAGO atualizado: ${paidPayment.due_date} - Parcela ${paidPayment.installment || 'null'}/${paidPayment.total_installments || 'null'} → ${expectedMatch.installment}/${expectedMatch.total_installments}`
              );
            }
          } else {
            console.log(`   ⚠️ Recebimento pago sem correspondência: ${paidPayment.due_date} (${paidPayment.reference_month}/${paidPayment.reference_year})`);
            paidPaymentsChanges.push(
              `⚠️ Recebimento PAGO sem correspondência nos esperados: ${paidPayment.due_date} - Mantido sem alterações`
            );
          }
        }

        // **PROCESSO 2: Gerenciar recebimentos PENDENTES**
        console.log(`\n📝 GERENCIANDO RECEBIMENTOS PENDENTES...`);

        // Criar um map de recebimentos esperados por mês/ano
        const expectedMap = new Map<string, typeof expectedPayments[0]>();
        expectedPayments.forEach(exp => {
          const key = `${exp.reference_year}-${exp.reference_month}`;
          expectedMap.set(key, exp);
        });

        // Criar um map de recebimentos pendentes existentes por mês/ano
        const pendingMap = new Map<string, typeof pendingPayments[0]>();
        pendingPayments.forEach(pend => {
          const key = `${pend.reference_year}-${String(pend.reference_month).padStart(2, '0')}`;
          pendingMap.set(key, pend);
        });

        // **2A: Criar recebimentos faltantes**
        for (const [key, expected] of expectedMap) {
          // Verificar se já existe (pago ou pendente)
          const existsPaid = paidPayments.some(p => 
            `${p.reference_year}-${String(p.reference_month).padStart(2, '0')}` === key
          );
          const existsPending = pendingMap.has(key);

          if (!existsPaid && !existsPending) {
            console.log(`   ➕ Criando faltante: ${expected.due_date} - Parcela ${expected.installment}/${expected.total_installments}`);
            
            await supabase
              .from("payments")
              .insert({
                rental_id: rental.id,
                expected_amount: expected.expected_amount,
                due_date: expected.due_date,
                installment: expected.installment,
                total_installments: expected.total_installments,
                reference_month: expected.reference_month,
                reference_year: expected.reference_year,
                status: "pending",
                breakdown: expected.breakdown
              });

            summary.paymentsCreated++;
            rentalChanges.push(`➕ Recebimento criado: ${expected.due_date} - Parcela ${expected.installment}/${expected.total_installments} - R$ ${expected.expected_amount.toFixed(2)}`);
          }
        }

        // **2B: Atualizar recebimentos pendentes existentes**
        for (const [key, pending] of pendingMap) {
          const expected = expectedMap.get(key);

          if (expected) {
            // Existe correspondência - atualizar se necessário
            const needsUpdate = 
              pending.installment !== expected.installment ||
              pending.total_installments !== expected.total_installments ||
              Math.abs(pending.expected_amount - expected.expected_amount) > 0.01;

            if (needsUpdate) {
              console.log(`   🔄 Atualizando pendente: ${pending.due_date}`);
              console.log(`      Parcela: ${pending.installment}/${pending.total_installments} → ${expected.installment}/${expected.total_installments}`);
              console.log(`      Valor: R$ ${pending.expected_amount.toFixed(2)} → R$ ${expected.expected_amount.toFixed(2)}`);
              
              await supabase
                .from("payments")
                .update({
                  installment: expected.installment,
                  total_installments: expected.total_installments,
                  expected_amount: expected.expected_amount,
                  breakdown: expected.breakdown,
                  due_date: expected.due_date
                })
                .eq("id", pending.id);

              summary.paymentsUpdated++;
              rentalChanges.push(`🔄 Recebimento atualizado: ${expected.due_date} - Parcela ${expected.installment}/${expected.total_installments} - R$ ${expected.expected_amount.toFixed(2)}`);
            }
          } else {
            // Não existe correspondência - deletar (recebimento incorreto)
            console.log(`   🗑️ Deletando incorreto: ${pending.due_date} (${key})`);
            
            await supabase
              .from("payments")
              .delete()
              .eq("id", pending.id);

            summary.paymentsDeleted++;
            rentalChanges.push(`🗑️ Recebimento deletado (incorreto): ${pending.due_date}`);
          }
        }

        if (rentalChanges.length > 0 || paidPaymentsChanges.length > 0) {
          summary.totalFixed++;
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges,
            paidPaymentsChanges: paidPaymentsChanges
          });
        }
      }

      setResult({
        success: true,
        summary,
        details
      });

      console.log("\n✅ ============================================");
      console.log("✅   CORREÇÃO CONCLUÍDA COM SUCESSO");
      console.log("✅ ============================================\n");
      console.log(`📊 Resumo:`);
      console.log(`   Total de locações: ${summary.totalRentals}`);
      console.log(`   Locações corrigidas: ${summary.totalFixed}`);
      console.log(`   Recebimentos criados: ${summary.paymentsCreated}`);
      console.log(`   Recebimentos atualizados: ${summary.paymentsUpdated}`);
      console.log(`   Recebimentos deletados: ${summary.paymentsDeleted}`);
      console.log(`   Recebimentos pagos renumerados: ${summary.paidPaymentsRenumbered}`);

    } catch (error: any) {
      console.error("❌ ERRO:", error);
      setResult({
        success: false,
        summary: { 
          totalRentals: 0, 
          totalFixed: 0, 
          paymentsCreated: 0, 
          paymentsUpdated: 0, 
          paymentsDeleted: 0,
          paidPaymentsRenumbered: 0
        },
        details: [{ 
          rentalInfo: 'Erro', 
          changes: [error.message],
          paidPaymentsChanges: []
        }]
      });
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Correção Completa de Recebimentos</CardTitle>
          <CardDescription>
            Sistema automático de correção aplicando as novas regras para todas as locações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Regras aplicadas:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>✅ Primeiro recebimento: se dia_inicio ≤ dia_vencimento → mesmo mês (proporcional)</li>
                <li>✅ Primeiro recebimento: se dia_inicio &gt; dia_vencimento → mês seguinte (proporcional ~30 dias)</li>
                <li>✅ Primeiro recebimento SEMPRE é parcela 1/XX</li>
                <li>✅ Recebimentos intermediários: valor integral, 1 por mês</li>
                <li>✅ Último recebimento: proporcional aos dias do último mês</li>
                <li>✅ Total de parcelas = total de recebimentos criados</li>
                <li>✅ Não pula meses, não duplica meses</li>
                <li>🔒 Recebimentos PAGOS: apenas atualiza numeração (installment/total_installments)</li>
                <li>🔄 Recebimentos PENDENTES: atualiza valores, cria faltantes, deleta incorretos</li>
              </ul>
            </AlertDescription>
          </Alert>

          {!isRunning && !result && (
            <Button onClick={runFix} size="lg" className="w-full">
              Iniciar Correção de Todos os Recebimentos
            </Button>
          )}

          {isRunning && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando: {currentRental}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    {result.success ? "✅ Correção Concluída com Sucesso!" : "❌ Erro na Correção"}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>📋 Total de locações: <strong>{result.summary.totalRentals}</strong></div>
                    <div>✅ Locações corrigidas: <strong>{result.summary.totalFixed}</strong></div>
                    <div>➕ Recebimentos criados: <strong>{result.summary.paymentsCreated}</strong></div>
                    <div>🔄 Recebimentos atualizados: <strong>{result.summary.paymentsUpdated}</strong></div>
                    <div>🗑️ Recebimentos deletados: <strong>{result.summary.paymentsDeleted}</strong></div>
                    <div>🔢 Recebimentos pagos renumerados: <strong>{result.summary.paidPaymentsRenumbered}</strong></div>
                  </div>
                </AlertDescription>
              </Alert>

              {result.details.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📝 Detalhes por Locação</h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {result.details.map((detail, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{detail.rentalInfo}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {detail.paidPaymentsChanges.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">💰 Recebimentos Pagos (apenas numeração):</h4>
                              <ul className="space-y-1 text-sm">
                                {detail.paidPaymentsChanges.map((change, i) => (
                                  <li key={i} className="text-blue-600">{change}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {detail.changes.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">🔄 Recebimentos Pendentes:</h4>
                              <ul className="space-y-1 text-sm">
                                {detail.changes.map((change, i) => (
                                  <li key={i}>{change}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => window.location.href = '/payments'} className="w-full">
                Ver Recebimentos Corrigidos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}