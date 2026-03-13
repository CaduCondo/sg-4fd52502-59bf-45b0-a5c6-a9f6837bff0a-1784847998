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
  
  // NUNCA PULAR MESES: Usar contador de meses ao invés de adicionar à data
  let monthOffset = 0;
  let isFirstPayment = true;
  
  while (true) {
    // Calcula o mês e ano atual baseado no início + offset
    const currentMonth = startDate.getMonth() + monthOffset;
    const currentYear = startDate.getFullYear() + Math.floor(currentMonth / 12);
    const normalizedMonth = currentMonth % 12;
    
    // Data base para verificações de período
    const currentDate = new Date(currentYear, normalizedMonth, startDate.getDate());
    
    // Se passamos do fim do contrato (e não é o primeiro mês), paramos
    if (currentDate > endDate && monthOffset > 0) {
      break;
    }
    
    // Determinar data de vencimento deste mês
    let dueDate = new Date(currentYear, normalizedMonth, dueDay);
    
    // Se o dia não existe no mês (ex: 31 de fevereiro), usar último dia do mês
    if (dueDate.getMonth() !== normalizedMonth) {
      dueDate = new Date(currentYear, normalizedMonth + 1, 0);
    }
    
    // Se o contrato começa DEPOIS do vencimento no mês inicial, 
    // o primeiro vencimento cai no mês SEGUINTE
    if (isFirstPayment && startDate.getDate() > dueDay) {
      dueDate = new Date(currentYear, normalizedMonth + 1, dueDay);
      if (dueDate.getMonth() !== (normalizedMonth + 1) % 12) {
        dueDate = new Date(currentYear, normalizedMonth + 2, 0);
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
      
      // REGRA: < 15 dias = "Parcela Proporcional" (não conta na numeração)
      if (daysInPeriod < 15) {
        amount = (rentValue / 30) * daysInPeriod;
        installment = null;
        description = "Parcela Proporcional";
        console.log(`📌 Primeira parcela: ${daysInPeriod} dias (<15) = "Parcela Proporcional" (não conta na numeração)`);
      } else {
        // Se for 15 dias ou mais, conta como 1/XX, mas o valor ainda pode ser proporcional se não for mês completo
        // Assumimos mês completo se for >= 28 dias
        if (daysInPeriod >= 28) {
          amount = rentValue;
        } else {
          amount = (rentValue / 30) * daysInPeriod;
        }
        
        installmentNumber = 1;
        installment = 1;
        description = `1/${totalContractMonths}`;
        console.log(`📌 Primeira parcela: ${daysInPeriod} dias (≥15) = "1/${totalContractMonths}" (conta na numeração)`);
      }
      
      console.log(`   💰 Valor: R$ ${amount.toFixed(2)}`);
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
        periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1); // Simplificado
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
        
        // Finaliza o loop pois chegamos na última
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
        break; // ÚLTIMA PARCELA!
        
      } else {
        // PARCELA INTERMEDIÁRIA (mês completo)
        // Para parcelas intermediárias, o período é sempre do dia seguinte do último vencimento até este vencimento
        const lastDueDate = new Date(dueDate);
        lastDueDate.setMonth(lastDueDate.getMonth() - 1);
        
        periodStart = new Date(lastDueDate);
        periodEnd = new Date(dueDate);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        amount = rentValue;
        
        // Só incrementa se não tiver estourado o total de parcelas
        if (installmentNumber < totalContractMonths) {
          installmentNumber++;
          installment = installmentNumber;
          description = `${installmentNumber}/${totalContractMonths}`;
        } else {
          // Se já passou do total (não deveria acontecer se as datas de início e fim estiverem corretas)
          installment = null;
          description = "Parcela Extra";
        }
        
        console.log(`📌 Parcela ${description}: mês completo = R$ ${amount.toFixed(2)}`);
      }
    }
    
    // Evitar criar pagamentos com vencimento antes do início do contrato (pode acontecer com alguns setups de dias)
    if (dueDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
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
    }
    
    // AVANÇAR PARA O PRÓXIMO MÊS
    monthOffset++;
    
    // Trava de segurança para loop infinito
    if (monthOffset > 120) { // Máximo de 10 anos
      console.log(`⚠️ ALERTA: Loop interrompido forçadamente em 120 meses`);
      break;
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

      // 🔍 DIAGNÓSTICO: Verificar quais locações deveriam ter recebimento em março/2026
      console.log("\n🔍 ============================================");
      console.log("🔍   DIAGNÓSTICO DE MARÇO/2026");
      console.log("🔍 ============================================\n");

      const marchStart = new Date('2026-03-01');
      const marchEnd = new Date('2026-03-31');
      
      const rentalsShouldHaveMarch = rentals.filter(r => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        return start <= marchEnd && end >= marchStart;
      });

      console.log(`📊 Locações que DEVERIAM ter recebimento em março/2026: ${rentalsShouldHaveMarch.length}`);

      // Verificar quais TÊM recebimento em março
      const { data: marchPayments } = await supabase
        .from('payments')
        .select('rental_id, due_date, notes, expected_amount')
        .gte('due_date', '2026-03-01')
        .lte('due_date', '2026-03-31');

      const rentalsWithMarchPayment = new Set(marchPayments?.map(p => p.rental_id) || []);
      
      console.log(`✅ Locações que JÁ TÊM recebimento em março: ${rentalsWithMarchPayment.size}`);
      console.log(`❌ Locações FALTANDO recebimento em março: ${rentalsShouldHaveMarch.length - rentalsWithMarchPayment.size}\n`);

      // Listar as locações que faltam
      const missingMarch = rentalsShouldHaveMarch.filter(r => !rentalsWithMarchPayment.has(r.id));
      
      if (missingMarch.length > 0) {
        console.log("🚨 LOCAÇÕES SEM RECEBIMENTO EM MARÇO:");
        for (const rental of missingMarch.slice(0, 10)) { // Mostrar primeiras 10
          const { data: property } = await supabase
            .from('properties')
            .select('property_identifier')
            .eq('id', rental.property_id)
            .single();
          
          console.log(`   ❌ ${property?.property_identifier || rental.property_id.substring(0, 8)} | ${rental.start_date} a ${rental.end_date}`);
        }
        if (missingMarch.length > 10) {
          console.log(`   ... e mais ${missingMarch.length - 10} locações\n`);
        }
      }

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
            // ➕ Criar novo recebimento (FALTANTE)
            console.log(`➕ CRIANDO RECEBIMENTO FALTANTE:`);
            console.log(`   Vencimento: ${expected.due_date}`);
            console.log(`   Descrição: ${expected.description}`);
            console.log(`   Valor: R$ ${expected.amount.toFixed(2)}`);
            
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
            // 🔄 Atualizar recebimento PENDENTE (se necessário)
            const needsUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
              existing.total_installments !== expected.total_installments ||
              Math.abs(existing.expected_amount - expected.amount) > 0.01;

            if (needsUpdate) {
              console.log(`🔄 ATUALIZANDO RECEBIMENTO PENDENTE:`);
              console.log(`   Vencimento: ${expected.due_date}`);
              console.log(`   Parcela: ${existing.installment || 'null'} → ${expected.installment || 'Proporcional'}`);
              console.log(`   Valor esperado: R$ ${existing.expected_amount.toFixed(2)} → R$ ${expected.amount.toFixed(2)}`);
              
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
            // 🔢 Recebimento PAGO - atualizar apenas numeração se necessário
            const needsNumberUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
              existing.total_installments !== expected.total_installments;

            const needsExpectedAmountFix = Math.abs(existing.expected_amount - expected.amount) > 0.01;

            if (needsNumberUpdate || needsExpectedAmountFix) {
              console.log(`🔢 AJUSTANDO RECEBIMENTO PAGO:`);
              console.log(`   Vencimento: ${expected.due_date}`);
              console.log(`   Parcela: ${existing.installment || 'null'} → ${expected.installment || 'Proporcional'}`);
              console.log(`   Expected amount: R$ ${existing.expected_amount.toFixed(2)} → R$ ${expected.amount.toFixed(2)}`);
              console.log(`   ✅ Mantendo paid_amount: R$ ${existing.paid_amount?.toFixed(2) || existing.expected_amount.toFixed(2)}`);
              
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