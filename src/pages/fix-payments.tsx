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
  };
  details: Array<{
    rentalInfo: string;
    changes: string[];
  }>;
}

function calculateDaysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExactMonthsDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  // Se o dia final é maior ou igual ao dia inicial, conta esse mês completo
  if (end.getDate() >= start.getDate()) {
    months += 1;
  }
  
  return months;
}

function generateExpectedPayments(rental: any) {
  const payments = [];
  const startDate = new Date(rental.start_date);
  const endDate = new Date(rental.end_date);
  const dueDay = rental.rent_due_day;
  const rentValue = parseFloat(rental.rent_value || 0);
  
  // Calcular total EXATO de meses do contrato
  const totalMonths = getExactMonthsDifference(rental.start_date, rental.end_date);
  
  console.log(`
    === GERANDO RECEBIMENTOS ===
    Contrato: ${rental.start_date} até ${rental.end_date}
    Dia vencimento: ${dueDay}
    Valor mensal: R$ ${rentValue}
    Total de meses: ${totalMonths}
  `);
  
  let paymentNumber = 0;
  let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const finalMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  
  // Primeira parcela - verificar se é proporcional
  const firstDueDate = new Date(startDate.getFullYear(), startDate.getMonth(), dueDay);
  
  // Se o contrato começa depois do dia de vencimento, o primeiro vencimento é no mês seguinte
  let actualFirstDueDate = firstDueDate;
  if (startDate.getDate() > dueDay) {
    actualFirstDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, dueDay);
  }
  
  // Calcular dias da primeira parcela (do início do contrato até o primeiro vencimento)
  const daysUntilFirstDue = calculateDaysBetween(startDate, actualFirstDueDate);
  
  let isFirstPaymentProportional = false;
  let firstPaymentAmount = rentValue;
  let firstPaymentDescription = "";
  
  if (daysUntilFirstDue < 30) {
    isFirstPaymentProportional = true;
    firstPaymentAmount = (rentValue / 30) * daysUntilFirstDue;
    
    if (daysUntilFirstDue >= 15) {
      paymentNumber = 1;
      firstPaymentDescription = `1/${totalMonths}`;
    } else {
      firstPaymentDescription = "Parcela Proporcional";
    }
    
    console.log(`Primeira parcela PROPORCIONAL: ${daysUntilFirstDue} dias = R$ ${firstPaymentAmount.toFixed(2)}`);
  } else {
    paymentNumber = 1;
    firstPaymentDescription = `1/${totalMonths}`;
    console.log(`Primeira parcela COMPLETA: ${firstPaymentDescription}`);
  }
  
  // Adicionar primeira parcela
  payments.push({
    rental_id: rental.id,
    due_date: actualFirstDueDate.toISOString().split('T')[0],
    amount: Math.round(firstPaymentAmount * 100) / 100,
    status: 'pending',
    installment: paymentNumber || null,
    total_installments: totalMonths,
    reference_month: (actualFirstDueDate.getMonth() + 1).toString().padStart(2, '0'),
    reference_year: actualFirstDueDate.getFullYear().toString(),
    description: firstPaymentDescription,
    period_start: startDate.toISOString().split('T')[0],
    period_end: new Date(actualFirstDueDate.getTime() - 86400000).toISOString().split('T')[0]
  });
  
  // Avançar para o próximo mês
  currentMonth = new Date(actualFirstDueDate.getFullYear(), actualFirstDueDate.getMonth() + 1, 1);
  
  // Gerar parcelas mensais intermediárias
  while (currentMonth <= finalMonth) {
    const currentDueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDay);
    
    // Verificar se essa parcela ainda está dentro do período do contrato
    if (currentDueDate > endDate) {
      break;
    }
    
    // Verificar se esta é a última parcela e se precisa ser proporcional
    const isLastMonth = currentMonth.getFullYear() === finalMonth.getFullYear() && 
                        currentMonth.getMonth() === finalMonth.getMonth();
    
    let amount = rentValue;
    let description = "";
    
    if (isLastMonth) {
      // Última parcela - verificar se é proporcional
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const daysInLastPeriod = calculateDaysBetween(monthStart, endDate) + 1;
      
      if (daysInLastPeriod < 30 && endDate < currentDueDate) {
        // Última parcela proporcional
        amount = (rentValue / 30) * daysInLastPeriod;
        description = "Parcela Proporcional Final";
        console.log(`Última parcela PROPORCIONAL: ${daysInLastPeriod} dias = R$ ${amount.toFixed(2)}`);
      } else {
        // Última parcela completa
        paymentNumber++;
        description = `${paymentNumber}/${totalMonths}`;
        console.log(`Última parcela COMPLETA: ${description}`);
      }
    } else {
      // Parcela intermediária normal
      paymentNumber++;
      description = `${paymentNumber}/${totalMonths}`;
    }
    
    const periodStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const periodEnd = isLastMonth ? 
      endDate : 
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    payments.push({
      rental_id: rental.id,
      due_date: currentDueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      status: 'pending',
      installment: paymentNumber || null,
      total_installments: totalMonths,
      reference_month: (currentMonth.getMonth() + 1).toString().padStart(2, '0'),
      reference_year: currentMonth.getFullYear().toString(),
      description: description,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0]
    });
    
    // Avançar para o próximo mês
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }
  
  console.log(`Total de parcelas geradas: ${payments.length}`);
  console.log(`Parcelas numeradas: 1 a ${paymentNumber}`);
  
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
      // Fetch rentals
      const { data: rentals, error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "active");

      if (rentalsError) throw rentalsError;

      const summary = {
        totalRentals: rentals.length,
        totalFixed: 0,
        paymentsCreated: 0,
        paymentsUpdated: 0
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

        // Test if dates are valid
        const testStartDate = new Date(rental.start_date);
        const testEndDate = new Date(rental.end_date);
        
        if (isNaN(testStartDate.getTime()) || isNaN(testEndDate.getTime())) {
          rentalChanges.push(`⚠️ ERRO: Datas do contrato inválidas (formato incorreto)`);
          rentalChanges.push(`  - start_date: ${rental.start_date}`);
          rentalChanges.push(`  - end_date: ${rental.end_date}`);
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

        const expectedPayments = generateExpectedPayments(rental);

        // DELETAR recebimentos que não deveriam existir (meses extras)
        for (const existing of existingPayments) {
          const shouldExist = expectedPayments.find(p => p.due_date === existing.due_date);
          
          if (!shouldExist && existing.status !== 'paid') {
            await supabase
              .from("payments")
              .delete()
              .eq("id", existing.id);
            
            rentalChanges.push(`🗑️ Removido recebimento EXTRA indevido - Vencimento: ${existing.due_date}`);
          }
        }

        for (const expected of expectedPayments) {
          const existing = existingPayments.find(p => p.due_date === expected.due_date);

          if (!existing) {
            // Create new payment
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
            rentalChanges.push(`➕ Criada parcela ${expected.description} - Vencimento: ${expected.due_date} - Valor: R$ ${expected.amount.toFixed(2)}`);
          } else if (existing.status !== 'paid') {
            // Update unpaid payment if needed
            const needsUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
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
              rentalChanges.push(`🔄 Atualizada parcela ${expected.description} - Vencimento: ${expected.due_date} - Valor: R$ ${expected.amount.toFixed(2)}`);
            }
          } else if (existing.status === 'paid') {
            // Only update payment number/description if it's paid (preserve paid amount)
            const needsNumberUpdate = 
              existing.installment !== expected.installment ||
              existing.notes !== expected.description ||
              existing.total_installments !== expected.total_installments;

            if (needsNumberUpdate) {
              await supabase
                .from('payments')
                .update({
                  installment: expected.installment,
                  total_installments: expected.total_installments,
                  notes: expected.description
                })
                .eq('id', existing.id);

              summary.paymentsUpdated++;
              rentalChanges.push(`🔢 Ajustada numeração da parcela PAGA para ${expected.description}`);
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
        summary: { totalRentals: 0, totalFixed: 0, paymentsCreated: 0, paymentsUpdated: 0 },
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
                <li>1 recebimento por mês no período do contrato (SEM meses extras)</li>
                <li>Primeira parcela proporcional: ≥15 dias = "1/XX", &lt;15 dias = "Parcela Proporcional"</li>
                <li>Última parcela proporcional quando necessário</li>
                <li>Recebimentos pagos: preserva valores, status e anexos (só ajusta numeração)</li>
                <li>Sequência SEQUENCIAL de parcelas (1/XX, 2/XX, 3/XX... até XX/XX - SEM PULOS!)</li>
                <li>Valores proporcionais calculados corretamente: (valor_mensal / 30) × dias</li>
                <li>Remove recebimentos extras que não deveriam existir</li>
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
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => window.location.href = '/rentals'} className="w-full">
                Ver Locações Corrigidas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}