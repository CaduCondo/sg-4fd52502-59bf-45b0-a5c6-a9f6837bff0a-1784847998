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
  };
  details: Array<{
    rentalInfo: string;
    changes: string[];
  }>;
}

function calculateMonthsBetweenDates(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let months = 0;
  let current = new Date(start);
  
  while (current < end || (current.getFullYear() === end.getFullYear() && 
                           current.getMonth() === end.getMonth() && 
                           current.getDate() <= end.getDate())) {
    months++;
    current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
  }
  
  return months;
}

function generateExpectedPayments(rental: any) {
  const payments = [];
  const startDate = new Date(rental.start_date);
  const endDate = new Date(rental.end_date);
  const dueDay = rental.rent_due_day;
  const rentValue = parseFloat(rental.rent_value || 0);
  
  console.log(`\n=== GERANDO RECEBIMENTOS PARA LOCAÇÃO ${rental.id} ===`);
  console.log(`Período: ${rental.start_date} até ${rental.end_date}`);
  console.log(`Dia vencimento: ${dueDay}`);
  console.log(`Valor mensal: R$ ${rentValue}`);
  
  // Calcular total de MESES do contrato
  const totalContractMonths = calculateMonthsBetweenDates(startDate, endDate);
  console.log(`🎯 TOTAL DE MESES DO CONTRATO: ${totalContractMonths}`);
  
  let installmentNumber = 0;
  let currentDate = new Date(startDate);
  let isFirstPayment = true;
  
  while (currentDate <= endDate) {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Determinar data de vencimento deste mês
    let dueDate = new Date(currentYear, currentMonth, dueDay);
    
    // Se o dia não existe no mês, usar último dia
    if (dueDate.getMonth() !== currentMonth) {
      dueDate = new Date(currentYear, currentMonth + 1, 0);
    }
    
    // Se o contrato começa depois do vencimento, primeiro vencimento é no mês seguinte
    if (isFirstPayment && currentDate.getDate() > dueDay) {
      dueDate = new Date(currentYear, currentMonth + 1, dueDay);
      if (dueDate.getMonth() !== (currentMonth + 1) % 12) {
        dueDate = new Date(currentYear, currentMonth + 2, 0);
      }
    }
    
    // Calcular período e valor
    let periodStart: Date;
    let periodEnd: Date;
    let daysInPeriod: number;
    let amount: number;
    let description: string;
    let installment: number | null;
    
    if (isFirstPayment) {
      // PRIMEIRA PARCELA
      periodStart = new Date(startDate);
      periodEnd = new Date(dueDate);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      if (periodEnd > endDate) {
        periodEnd = new Date(endDate);
      }
      
      daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      amount = (rentValue / 30) * daysInPeriod;
      
      // REGRA: < 15 dias = "Parcela Proporcional" (não conta na numeração)
      if (daysInPeriod < 15) {
        installment = null;
        description = "Parcela Proporcional";
        console.log(`📌 Primeira parcela: ${daysInPeriod} dias (<15) = "Parcela Proporcional" (não conta na numeração)`);
      } else {
        installmentNumber = 1;
        installment = 1;
        description = `1/${totalContractMonths}`;
        console.log(`📌 Primeira parcela: ${daysInPeriod} dias (≥15) = "1/${totalContractMonths}" (conta na numeração)`);
      }
      
      console.log(`   💰 Valor: R$ ${amount.toFixed(2)} (${daysInPeriod} dias × R$ ${(rentValue/30).toFixed(2)}/dia)`);
      
      isFirstPayment = false;
      
    } else {
      // PARCELAS SEGUINTES
      
      // Verificar se esta é a última parcela
      const nextDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDay);
      if (nextDueDate.getMonth() !== (dueDate.getMonth() + 1) % 12) {
        nextDueDate.setDate(0);
      }
      
      if (nextDueDate > endDate) {
        // ÚLTIMA PARCELA (pode ser proporcional)
        periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
        periodEnd = new Date(endDate);
        
        daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Se for um mês quase completo (≥28 dias), considerar mês completo
        if (daysInPeriod >= 28) {
          amount = rentValue;
          installmentNumber++;
          installment = installmentNumber;
          description = `${installmentNumber}/${totalContractMonths}`;
          console.log(`📌 Última parcela (mês completo): ${daysInPeriod} dias = "${description}"`);
        } else {
          amount = (rentValue / 30) * daysInPeriod;
          installment = null;
          description = "Parcela Proporcional Final";
          console.log(`📌 Última parcela proporcional: ${daysInPeriod} dias = "Parcela Proporcional Final"`);
        }
        
        console.log(`   💰 Valor: R$ ${amount.toFixed(2)}`);
        
      } else {
        // PARCELA INTERMEDIÁRIA (mês completo)
        periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
        periodEnd = new Date(dueDate);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        amount = rentValue;
        installmentNumber++;
        installment = installmentNumber;
        description = `${installmentNumber}/${totalContractMonths}`;
        
        console.log(`📌 Parcela ${description}: mês completo = R$ ${amount.toFixed(2)}`);
      }
    }
    
    // Adicionar pagamento
    payments.push({
      rental_id: rental.id,
      due_date: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      status: 'pending',
      installment: installment,
      total_installments: totalContractMonths,
      reference_month: (dueDate.getMonth() + 1).toString().padStart(2, '0'),
      reference_year: dueDate.getFullYear().toString(),
      description: description,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      days_in_period: daysInPeriod
    });
    
    // Avançar para o próximo mês
    currentDate = new Date(currentYear, currentMonth + 1, startDate.getDate());
    
    // Se a data não existe no próximo mês, ajustar
    if (currentDate.getMonth() !== (currentMonth + 1) % 12) {
      currentDate = new Date(currentYear, currentMonth + 2, 0);
    }
  }
  
  console.log(`✅ Total de ${payments.length} recebimentos gerados`);
  console.log(`✅ Parcelas numeradas: ${installmentNumber}/${totalContractMonths}`);
  
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

      // Fetch rentals
      const { data: rentals, error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "active");

      if (rentalsError) throw rentalsError;

      console.log(`📋 Total de locações ativas: ${rentals.length}\n`);

      const summary = {
        totalRentals: rentals.length,
        totalFixed: 0,
        paymentsCreated: 0,
        paymentsUpdated: 0,
        paymentsDeleted: 0
      };

      const details: Array<{ rentalInfo: string; changes: string[] }> = [];

      for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
        setProgress(((i + 1) / rentals.length) * 100);
        
        // Fetch property and tenant data separately
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
        
        const propertyName = property?.property_identifier ? `Imóvel: ${property.property_identifier}` : `Imóvel ID: ${rental.property_id.substring(0, 8)}`;
        const tenantName = tenant?.name || 'Inquilino';
        
        setCurrentRental(`${propertyName} - ${tenantName}`);
        
        console.log(`\n🏠 ============================================`);
        console.log(`🏠 PROCESSANDO LOCAÇÃO ${i + 1}/${rentals.length}`);
        console.log(`🏠 ${propertyName} - ${tenantName}`);
        console.log(`🏠 Período: ${rental.start_date} a ${rental.end_date}`);
        console.log(`🏠 Dia vencimento: ${rental.rent_due_day}`);
        console.log(`🏠 ============================================`);

        const rentalChanges: string[] = [];

        // Validate rental dates before processing
        if (!rental.start_date || !rental.end_date) {
          rentalChanges.push(`⚠️ ERRO: Datas do contrato inválidas (start_date ou end_date ausentes)`);
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges
          });
          continue;
        }

        const testStartDate = new Date(rental.start_date);
        const testEndDate = new Date(rental.end_date);
        
        if (isNaN(testStartDate.getTime()) || isNaN(testEndDate.getTime())) {
          rentalChanges.push(`⚠️ ERRO: Datas do contrato inválidas (formato incorreto)`);
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges
          });
          continue;
        }

        if (!rental.rent_due_day || rental.rent_due_day < 1 || rental.rent_due_day > 31) {
          rentalChanges.push(`⚠️ ERRO: Dia de vencimento inválido (${rental.rent_due_day})`);
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges
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

        const expectedPayments = generateExpectedPayments(rental);

        // ⚠️ DELEÇÃO ULTRA-CONSERVADORA: Só remove DUPLICATAS CONFIRMADAS
        // Agrupar recebimentos existentes por data de vencimento
        const paymentsByDueDate = new Map<string, typeof existingPayments>();
        for (const payment of existingPayments) {
          const existing = paymentsByDueDate.get(payment.due_date) || [];
          existing.push(payment);
          paymentsByDueDate.set(payment.due_date, existing);
        }

        // Deletar apenas se houver 2+ recebimentos na MESMA data (duplicata real)
        for (const [dueDate, payments] of paymentsByDueDate) {
          if (payments.length > 1) {
            // Há duplicata nesta data - manter apenas o primeiro/mais antigo
            const toKeep = payments[0];
            const toDelete = payments.slice(1);
            
            for (const duplicate of toDelete) {
              if (duplicate.status !== 'paid') {
                console.log(`🗑️ DELETANDO DUPLICATA: ${dueDate} (ID: ${duplicate.id})`);
                
                await supabase
                  .from("payments")
                  .delete()
                  .eq("id", duplicate.id);
                
                summary.paymentsDeleted++;
                rentalChanges.push(`🗑️ Removida DUPLICATA - Vencimento: ${dueDate} (mantido ID: ${toKeep.id})`);
              } else {
                console.log(`⚠️ DUPLICATA PAGA (não deletando): ${dueDate} (ID: ${duplicate.id})`);
              }
            }
          }
        }

        console.log(`✅ Após remoção de duplicatas, recebimentos: ${existingPayments.length - summary.paymentsDeleted}`);

        // Criar ou atualizar recebimentos esperados
        for (const expected of expectedPayments) {
          const existing = existingPayments.find(p => p.due_date === expected.due_date);

          if (!existing) {
            // Criar novo recebimento
            await supabase
              .from("payments")
              .insert({
                rental_id: rental.id,
                expected_amount: expected.amount,
                due_date: expected.due_date,
                installment: expected.installment,
                total_installments: expected.total_installments,
                reference_month: expected.reference_month,
                reference_year: expected.reference_year,
                status: "pending",
                notes: expected.description
              });

            summary.paymentsCreated++;
            rentalChanges.push(`➕ Criada parcela ${expected.description} - Vencimento: ${expected.due_date}`);
            rentalChanges.push(`   📅 Período: ${expected.period_start} a ${expected.period_end} (${expected.days_in_period} dias)`);
            rentalChanges.push(`   💰 Valor: R$ ${expected.amount.toFixed(2)}`);
            
          } else if (existing.status !== 'paid') {
            // Atualizar recebimento pendente se necessário
            const needsUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
              existing.total_installments !== expected.total_installments ||
              Math.abs(existing.expected_amount - expected.amount) > 0.01;

            if (needsUpdate) {
              await supabase
                .from("payments")
                .update({
                  installment: expected.installment,
                  total_installments: expected.total_installments,
                  notes: expected.description,
                  expected_amount: expected.amount
                })
                .eq("id", existing.id);
              
              summary.paymentsUpdated++;
              rentalChanges.push(`🔄 Atualizada parcela ${expected.description} - Vencimento: ${expected.due_date}`);
              rentalChanges.push(`   📅 Período: ${expected.period_start} a ${expected.period_end} (${expected.days_in_period} dias)`);
              rentalChanges.push(`   💰 Valor esperado: R$ ${expected.amount.toFixed(2)}`);
            }
            
          } else {
            // Recebimento PAGO - atualizar numeração E expected_amount se estiver errado
            const needsNumberUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
              existing.total_installments !== expected.total_installments;

            const needsExpectedAmountFix = Math.abs(existing.expected_amount - expected.amount) > 0.01;

            if (needsNumberUpdate || needsExpectedAmountFix) {
              await supabase
                .from('payments')
                .update({
                  installment: expected.installment,
                  total_installments: expected.total_installments,
                  notes: expected.description,
                  expected_amount: expected.amount
                })
                .eq('id', existing.id);

              summary.paymentsUpdated++;
              rentalChanges.push(`🔢 Ajustada parcela PAGA para ${expected.description}`);
              rentalChanges.push(`   📅 Período: ${expected.period_start} a ${expected.period_end} (${expected.days_in_period} dias)`);
              rentalChanges.push(`   💰 Valor esperado corrigido: R$ ${expected.amount.toFixed(2)}`);
              rentalChanges.push(`   💰 Valor pago preservado: R$ ${existing.paid_amount?.toFixed(2) || existing.expected_amount.toFixed(2)}`);
            }
          }
        }

        if (rentalChanges.length > 0) {
          summary.totalFixed++;
          details.push({
            rentalInfo: `${propertyName} - ${tenantName}`,
            changes: rentalChanges
          });
        }
      }

      setResult({
        success: true,
        summary,
        details
      });

    } catch (error: any) {
      setResult({
        success: false,
        summary: { totalRentals: 0, totalFixed: 0, paymentsCreated: 0, paymentsUpdated: 0, paymentsDeleted: 0 },
        details: [{ rentalInfo: 'Erro', changes: [error.message] }]
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
          <CardTitle className="text-3xl">Correção de Recebimentos</CardTitle>
          <CardDescription>
            Sistema automático de correção e validação de recebimentos de todas as locações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Regras aplicadas:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>✅ Total de parcelas NUMERADAS = meses do contrato (12, 24, 30...)</li>
                <li>✅ Primeira parcela &lt;15 dias = "Parcela Proporcional" (NÃO conta na numeração)</li>
                <li>✅ Primeira parcela ≥15 dias = "1/XX" (conta na numeração)</li>
                <li>✅ Parcelas intermediárias sempre numeradas sequencialmente</li>
                <li>✅ Última parcela proporcional quando necessário</li>
                <li>✅ Recebimentos pagos: preserva valores, status e anexos (só ajusta numeração)</li>
                <li>✅ Valores proporcionais: (valor_mensal / 30) × dias</li>
                <li>✅ Remove recebimentos extras indevidos</li>
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
                    <div>📋 Total de locações analisadas: <strong>{result.summary.totalRentals}</strong></div>
                    <div>✅ Total de locações corrigidas: <strong>{result.summary.totalFixed}</strong></div>
                    <div>➕ Total de parcelas criadas: <strong>{result.summary.paymentsCreated}</strong></div>
                    <div>🔄 Total de parcelas atualizadas: <strong>{result.summary.paymentsUpdated}</strong></div>
                    <div>🗑️ Total de parcelas removidas: <strong>{result.summary.paymentsDeleted}</strong></div>
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
                        <CardContent>
                          <ul className="space-y-1 text-sm">
                            {detail.changes.map((change, i) => (
                              <li key={i} className={change.startsWith('   ') ? 'ml-4 text-muted-foreground' : ''}>{change}</li>
                            ))}
                          </ul>
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