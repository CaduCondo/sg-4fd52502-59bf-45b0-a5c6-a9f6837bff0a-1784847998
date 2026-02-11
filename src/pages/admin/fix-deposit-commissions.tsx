import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FixResult {
  rentalId: string;
  propertyName: string;
  tenantName: string;
  installmentsFixed: number;
  oldPartnerCommission: number;
  oldInternalCommission: number;
}

export default function FixDepositCommissions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<FixResult[]>([]);
  const [totalFixed, setTotalFixed] = useState(0);
  const { toast } = useToast();

  const fixCommissions = async () => {
    setIsProcessing(true);
    setResults([]);
    setTotalFixed(0);

    try {
      console.log("🔧 Iniciando correção de comissões do caução...");

      // 1. Buscar todas as parcelas do caução com comissões preenchidas
      const { data: installments, error: fetchError } = await supabase
        .from("deposit_installments")
        .select(`
          id,
          rental_id,
          partner_commission,
          internal_commission,
          rental:rentals!rental_id(
            id,
            tenant:tenants(name),
            property:properties(
              complement,
              location:locations(name)
            )
          )
        `)
        .or("partner_commission.neq.0,internal_commission.neq.0");

      if (fetchError) throw fetchError;

      if (!installments || installments.length === 0) {
        toast({
          title: "Nenhuma correção necessária",
          description: "Todas as comissões já estão zeradas.",
        });
        setIsProcessing(false);
        return;
      }

      console.log(`📊 Encontradas ${installments.length} parcelas com comissões preenchidas`);

      // 2. Agrupar por rental_id
      const groupedByRental = installments.reduce((acc, inst) => {
        if (!acc[inst.rental_id]) {
          acc[inst.rental_id] = [];
        }
        acc[inst.rental_id].push(inst);
        return acc;
      }, {} as Record<string, typeof installments>);

      const fixResults: FixResult[] = [];

      // 3. Processar cada locação
      for (const [rentalId, rentalInstallments] of Object.entries(groupedByRental)) {
        const firstInstallment = rentalInstallments[0];

        console.log(`\n🔄 Processando locação ${rentalId}...`);
        console.log(`   - ${rentalInstallments.length} parcelas a corrigir`);

        // Zerar todas as comissões das parcelas desta locação
        const installmentIds = rentalInstallments.map(i => i.id);
        
        const { error: updateError } = await supabase
          .from("deposit_installments")
          .update({
            partner_commission: 0,
            internal_commission: 0,
          })
          .in("id", installmentIds);

        if (updateError) {
          console.error(`❌ Erro ao atualizar locação ${rentalId}:`, updateError);
          continue;
        }

        console.log(`✅ ${rentalInstallments.length} parcelas corrigidas`);

        fixResults.push({
          rentalId,
          propertyName: `${firstInstallment.rental?.property?.location?.name || "?"} - ${firstInstallment.rental?.property?.complement || "?"}`,
          tenantName: firstInstallment.rental?.tenant?.name || "?",
          installmentsFixed: rentalInstallments.length,
          oldPartnerCommission: firstInstallment.partner_commission || 0,
          oldInternalCommission: firstInstallment.internal_commission || 0,
        });
      }

      setResults(fixResults);
      setTotalFixed(installments.length);

      toast({
        title: "✅ Correção concluída!",
        description: `${installments.length} parcelas de caução foram zeradas com sucesso.`,
      });

      console.log("\n=== RESUMO DA CORREÇÃO ===");
      console.log(`Total de parcelas corrigidas: ${installments.length}`);
      console.log(`Total de locações afetadas: ${fixResults.length}`);
      console.log("===========================");

    } catch (error) {
      console.error("❌ Erro ao corrigir comissões:", error);
      toast({
        title: "Erro na correção",
        description: "Ocorreu um erro ao zerar as comissões. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🔧 Corrigir Comissões do Caução</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta ferramenta irá zerar todas as comissões de corretor (parceiro e interno)
            das parcelas do caução que foram preenchidas automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Atenção</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Esta ação irá zerar os campos "Valor Pg Corretor Parceiro" e "Valor Pg Corretor Interno"</li>
                <li>Você precisará preencher manualmente os valores corretos após a correção</li>
                <li>A operação afeta apenas parcelas que já têm comissões preenchidas</li>
                <li>Não é possível desfazer esta ação</li>
              </ul>
            </div>

            <Button
              onClick={fixCommissions}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "🔧 Zerar Comissões do Caução"
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Correção Concluída!</h3>
                <p className="text-sm text-green-800">
                  Total de parcelas corrigidas: <strong>{totalFixed}</strong>
                </p>
                <p className="text-sm text-green-800">
                  Locações afetadas: <strong>{results.length}</strong>
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 font-semibold text-sm border-b">
                  Detalhes das Correções
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="p-4 hover:bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{result.propertyName}</p>
                          <p className="text-sm text-muted-foreground">
                            Inquilino: {result.tenantName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {result.installmentsFixed} parcela{result.installmentsFixed > 1 ? 's' : ''} corrigida{result.installmentsFixed > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Valores anteriores: Parceiro R$ {result.oldPartnerCommission.toFixed(2)} | 
                        Interno R$ {result.oldInternalCommission.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📝 Próximos Passos</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse a página "Financeiro" → "Detalhamento dos Cauções"</li>
                  <li>Clique no ícone de lápis nas colunas de comissão</li>
                  <li>Preencha manualmente os valores corretos de cada comissão</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}