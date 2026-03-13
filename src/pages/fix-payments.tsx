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
  
  // Calcular total de meses: contar do dia X ao dia X
  let totalMonths = 0;
  let tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    totalMonths++;
    tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
  }
  
  console.log(`Total de meses calculado: ${totalMonths}`);
  
  let installmentNumber = 0;
  let currentDate = new Date(startDate);
  let monthIndex = 0;
  
  while (currentDate <= endDate) {
    monthIndex++;
    
    // Determinar data de vencimento deste mês
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Data de vencimento deste mês
    let dueDate = new Date(currentYear, currentMonth, dueDay);
    
    // Se o dia de vencimento não existe no mês (ex: dia 31 em fevereiro), usar último dia do mês
    if (dueDate.getMonth() !== currentMonth) {
      dueDate = new Date(currentYear, currentMonth + 1, 0);
    }
    
    // Calcular período cobrado neste recebimento
    let periodStart: Date;
    let periodEnd: Date;
    let daysInPeriod: number;
    let amount: number;
    let description: string;
    
    if (monthIndex === 1) {
      // PRIMEIRA PARCELA
      periodStart = new Date(startDate);
      
      // Se o contrato começa depois do dia de vencimento, o primeiro vencimento é no mês seguinte
      if (startDate.getDate() > dueDay) {
        dueDate = new Date(currentYear, currentMonth + 1, dueDay);
        if (dueDate.getMonth() !== (currentMonth + 1) % 12) {
          dueDate = new Date(currentYear, currentMonth + 2, 0);
        }
      }
      
      // Período vai do início do contrato até o dia anterior ao vencimento
      periodEnd = new Date(dueDate);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      // Se period_end ultrapassar end_date, ajustar
      if (periodEnd > endDate) {
        periodEnd = new Date(endDate);
      }
      
      daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calcular valor proporcional
      amount = (rentValue / 30) * daysInPeriod;
      
      // Determinar se conta como parcela numerada
      if (daysInPeriod >= 15) {
        installmentNumber = 1;
        description = `1/${totalMonths}`;
      } else {
        description = "Parcela Proporcional";
      }
      
      console.log(`Primeira parcela: ${daysInPeriod} dias = R$ ${amount.toFixed(2)} - ${description}`);
      
    } else if (currentDate.getFullYear() === endDate.getFullYear() && 
               currentDate.getMonth() === endDate.getMonth() &&
               currentDate.getDate() <= endDate.getDate()) {
      // ÚLTIMA PARCELA (pode ser proporcional)
      periodStart = new Date(currentYear, currentMonth, 1);
      periodEnd = new Date(endDate);
      
      // Se o vencimento é depois da data fim, ajustar
      if (dueDate > endDate) {
        daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        amount = (rentValue / 30) * daysInPeriod;
        
        if (daysInPeriod < 15) {
          description = "Parcela Proporcional Final";
        } else {
          installmentNumber++;
          description = `${installmentNumber}/${totalMonths}`;
        }
      } else {
        // Última parcela completa
        periodEnd = new Date(dueDate);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (daysInPeriod >= 28) {
          amount = rentValue;
          installmentNumber++;
          description = `${installmentNumber}/${totalMonths}`;
        } else {
          amount = (rentValue / 30) * daysInPeriod;
          description = "Parcela Proporcional Final";
        }
      }
      
      console.log(`Última parcela: ${daysInPeriod} dias = R$ ${amount.toFixed(2)} - ${description}`);
      
    } else {
      // PARCELAS INTERMEDIÁRIAS (sempre completas)
      periodStart = new Date(currentYear, currentMonth, 1);
      periodEnd = new Date(dueDate);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      amount = rentValue;
      installmentNumber++;
      description = `${installmentNumber}/${totalMonths}`;
      
      console.log(`Parcela ${description}: mês completo = R$ ${amount.toFixed(2)}`);
    }
    
    // Adicionar pagamento
    payments.push({
      rental_id: rental.id,
      due_date: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      status: 'pending',
      installment: installmentNumber || null,
      total_installments: totalMonths,
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
  
  console.log(`Total de ${payments.length} recebimentos gerados`);
  console.log(`Parcelas numeradas: ${installmentNumber}/${totalMonths}`);
  
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

        // DELETAR recebimentos que não deveriam existir
        for (const existing of existingPayments) {
          const shouldExist = expectedPayments.find(p => p.due_date === existing.due_date);
          
          if (!shouldExist && existing.status !== 'paid') {
            await supabase
              .from("payments")
              .delete()
              .eq("id", existing.id);
            
            summary.paymentsDeleted++;
            rentalChanges.push(`🗑️ Removido recebimento EXTRA indevido - Vencimento: ${existing.due_date}`);
          }
        }

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
              rentalChanges.push(`   💰 Valor: R$ ${expected.amount.toFixed(2)}`);
            }
            
          } else {
            // Recebimento PAGO - apenas atualizar numeração/descrição
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
                <li>✅ EXATAMENTE 1 recebimento por mês do contrato (NUNCA pula mês!)</li>
                <li>✅ Primeira parcela proporcional: ≥15 dias = "1/XX", &lt;15 dias = "Parcela Proporcional"</li>
                <li>✅ Última parcela proporcional quando necessário</li>
                <li>✅ Recebimentos pagos: preserva valores, status e anexos (só ajusta numeração)</li>
                <li>✅ Sequência SEQUENCIAL de parcelas (1/XX, 2/XX, 3/XX... até XX/XX - SEM PULOS!)</li>
                <li>✅ Valores proporcionais: (valor_mensal / 30) × dias</li>
                <li>✅ Remove recebimentos extras indevidos</li>
                <li>✅ Mostra período cobrado e quantidade de dias em cada parcela</li>
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