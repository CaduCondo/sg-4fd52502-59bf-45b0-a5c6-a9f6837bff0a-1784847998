import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/router";
import { findAndRemoveDuplicatePayments, generateExpectedPayments } from "@/services/paymentService";

interface FixReport {
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
    paidPaymentsChanges: string[];
    changes: string[];
  }>;
  errors: string[];
}

interface DuplicatesReport {
  success: boolean;
  duplicatesFound: number;
  duplicatesRemoved: number;
  details: Array<{
    rentalId: string;
    month: number;
    year: number;
    total: number;
    kept: string;
    keptInstallment: string;
    removed: Array<{ id: string; installment: string; status: string }>;
    reason: string;
  }>;
  warnings: Array<{
    rentalId: string;
    month: number;
    year: number;
    message: string;
    payments: Array<{ id: string; installment: string; status: string }>;
  }>;
  errors: string[];
}

export default function FixPaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRental, setCurrentRental] = useState("");
  const [report, setReport] = useState<FixReport | null>(null);
  const [duplicatesReport, setDuplicatesReport] = useState<DuplicatesReport | null>(null);

  const handleRemoveDuplicates = async () => {
    setRemovingDuplicates(true);
    setDuplicatesReport(null);

    try {
      const result = await findAndRemoveDuplicatePayments();
      setDuplicatesReport(result);
    } catch (error) {
      console.error("Erro ao remover duplicatas:", error);
      setDuplicatesReport({
        success: false,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        details: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : "Erro desconhecido"],
      });
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const handleFixAllPayments = async () => {
    setLoading(true);
    setProgress(0);
    setReport(null);

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

      console.log(`📋 Total de locações ativas/finalizadas: ${rentals?.length || 0}\n`);

      const summary = {
        totalRentals: rentals?.length || 0,
        totalFixed: 0,
        paymentsCreated: 0,
        paymentsUpdated: 0,
        paymentsDeleted: 0,
        paidPaymentsRenumbered: 0
      };

      const details: Array<{ rentalInfo: string; changes: string[]; paidPaymentsChanges: string[] }> = [];

      if (!rentals) {
        throw new Error("Nenhuma locação encontrada");
      }

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
        const expectedPayments = generateExpectedPayments({
          rentalId: rental.id,
          startDate: rental.start_date,
          endDate: rental.end_date,
          monthlyRent: rental.rent_value || 0,
          paymentDay: rental.rent_due_day || 5,
          hasGarage: rental.has_garage || false,
          garageValue: rental.garage_value || 0
        });

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
            String(exp.reference_month).padStart(2, '0') === String(paidPayment.reference_month).padStart(2, '0') &&
            String(exp.reference_year) === String(paidPayment.reference_year)
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
          const key = `${exp.reference_year}-${String(exp.reference_month).padStart(2, '0')}`;
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
                reference_month: String(expected.reference_month),
                reference_year: String(expected.reference_year),
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
              Math.abs(Number(pending.expected_amount) - Number(expected.expected_amount)) > 0.01;

            if (needsUpdate) {
              console.log(`   🔄 Atualizando pendente: ${pending.due_date}`);
              console.log(`      Parcela: ${pending.installment}/${pending.total_installments} → ${expected.installment}/${expected.total_installments}`);
              console.log(`      Valor: R$ ${Number(pending.expected_amount).toFixed(2)} → R$ ${Number(expected.expected_amount).toFixed(2)}`);
              
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

      setReport({
        success: true,
        summary,
        details,
        errors: []
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
      setReport({
        success: false,
        summary: { 
          totalRentals: 0, 
          totalFixed: 0, 
          paymentsCreated: 0, 
          paymentsUpdated: 0, 
          paymentsDeleted: 0,
          paidPaymentsRenumbered: 0
        },
        details: [],
        errors: [error.message]
      });
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Correção de Recebimentos</CardTitle>
            <CardDescription>
              Ferramenta para corrigir todos os recebimentos do sistema baseado nas novas regras de negócio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seção: Remover Duplicatas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">1. Remover Recebimentos Duplicados</h3>
                  <p className="text-sm text-muted-foreground">
                    Identifica e remove recebimentos duplicados (mesmo imóvel, mesmo mês/ano)
                  </p>
                </div>
                <Button
                  onClick={handleRemoveDuplicates}
                  disabled={removingDuplicates || loading}
                  variant="destructive"
                  className="gap-2"
                >
                  {removingDuplicates ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remover Duplicatas
                    </>
                  )}
                </Button>
              </div>

              {duplicatesReport && (
                <Alert variant={duplicatesReport.success ? "default" : "destructive"}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {duplicatesReport.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-semibold">
                        {duplicatesReport.success ? "Duplicatas Removidas com Sucesso" : "Erro ao Remover Duplicatas"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duplicatas encontradas:</span>
                        <span className="font-semibold ml-2">{duplicatesReport.duplicatesFound}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recebimentos removidos:</span>
                        <span className="font-semibold ml-2">{duplicatesReport.duplicatesRemoved}</span>
                      </div>
                    </div>

                    {duplicatesReport.details.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold">Detalhes das duplicatas:</p>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {duplicatesReport.details.map((detail, idx) => (
                            <div key={idx} className="text-xs bg-muted p-2 rounded">
                              <div>
                                <span className="font-semibold">Mês:</span> {detail.month}/{detail.year}
                              </div>
                              <div>
                                <span className="font-semibold">Total encontrado:</span> {detail.total}
                              </div>
                              <div className="mt-1">
                                <span className="font-semibold">Motivo:</span> {detail.reason}
                              </div>
                              <div className="text-green-600 mt-1">
                                <span className="font-semibold">✓ Mantido:</span> {detail.kept} (Parcela: {detail.keptInstallment})
                              </div>
                              <div className="text-red-600">
                                <span className="font-semibold">✗ Removidos:</span> {detail.removed.map(r => `[${r.status.toUpperCase()}] Parcela ${r.installment} (ID: ${r.id})`).join(", ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {duplicatesReport.warnings && duplicatesReport.warnings.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-yellow-600">⚠️ Avisos (Requerem análise manual):</p>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {duplicatesReport.warnings.map((warning, idx) => (
                            <div key={idx} className="text-xs bg-yellow-50 border border-yellow-200 p-2 rounded text-yellow-800">
                              <div className="font-semibold mb-1">{warning.month}/{warning.year}: {warning.message}</div>
                              <ul className="list-disc list-inside">
                                {warning.payments.map((p, i) => (
                                  <li key={i}>[{p.status.toUpperCase()}] Parcela: {p.installment} (ID: {p.id})</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {duplicatesReport.errors.length > 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            {duplicatesReport.errors.map((error, idx) => (
                              <div key={idx} className="text-xs">{error}</div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </Alert>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">2. Corrigir Todos os Recebimentos</h3>
                  <p className="text-sm text-muted-foreground">
                    Após remover duplicatas, execute a correção completa dos recebimentos
                  </p>
                </div>
                <Button
                  onClick={handleFixAllPayments}
                  disabled={loading || removingDuplicates}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Iniciar Correção"
                  )}
                </Button>
              </div>
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processando: {currentRental}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {report && (
              <div className="space-y-6 mt-6">
                <Alert className={report.success ? "border-green-500" : "border-red-500"}>
                  {report.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {report.success ? "✅ Correção Concluída com Sucesso!" : "❌ Erro na Correção"}
                    </div>
                    {report.errors.length > 0 && (
                      <div className="mb-4 text-red-500 text-sm">
                        {report.errors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>📋 Total de locações: <strong>{report.summary.totalRentals}</strong></div>
                      <div>✅ Locações corrigidas: <strong>{report.summary.totalFixed}</strong></div>
                      <div>➕ Recebimentos criados: <strong>{report.summary.paymentsCreated}</strong></div>
                      <div>🔄 Recebimentos atualizados: <strong>{report.summary.paymentsUpdated}</strong></div>
                      <div>🗑️ Recebimentos deletados: <strong>{report.summary.paymentsDeleted}</strong></div>
                      <div>🔢 Recebimentos pagos renumerados: <strong>{report.summary.paidPaymentsRenumbered}</strong></div>
                    </div>
                  </AlertDescription>
                </Alert>

                {report.details.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">📝 Detalhes por Locação</h3>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {report.details.map((detail, index) => (
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

                <Button onClick={() => router.push('/payments')} className="w-full">
                  Ver Recebimentos Corrigidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}