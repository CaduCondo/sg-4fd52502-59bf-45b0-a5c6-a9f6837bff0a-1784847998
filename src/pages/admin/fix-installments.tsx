import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function FixInstallments() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    updated: number;
    errors: number;
  } | null>(null);

  const handleFixInstallments = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      console.log("🔧 Iniciando correção de parcelas...");

      // Buscar todas as locações ativas
      const { data: rentals, error: rentalsError } = await supabase
        .from("rentals")
        .select("id");

      if (rentalsError) throw rentalsError;

      if (!rentals || rentals.length === 0) {
        toast({
          title: "Nenhuma locação encontrada",
          description: "Não há locações para processar.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      console.log(`📊 Total de locações encontradas: ${rentals.length}`);

      let totalUpdated = 0;
      let totalErrors = 0;

      // Processar cada locação
      for (const rental of rentals) {
        try {
          console.log(`\n🏠 Processando locação ${rental.id}...`);

          // Buscar todos os pagamentos desta locação, ordenados por data de vencimento
          const { data: payments, error: paymentsError } = await supabase
            .from("payments")
            .select("id, due_date")
            .eq("rental_id", rental.id)
            .order("due_date", { ascending: true });

          if (paymentsError) throw paymentsError;

          if (!payments || payments.length === 0) {
            console.log(`   ⚠️ Nenhum pagamento encontrado para esta locação`);
            continue;
          }

          const totalInstallments = payments.length;
          console.log(`   📋 Total de pagamentos: ${totalInstallments}`);

          // Atualizar cada pagamento com o número da parcela
          for (let i = 0; i < payments.length; i++) {
            const installmentNumber = i + 1;

            const { error: updateError } = await supabase
              .from("payments")
              .update({
                installment: installmentNumber,
                total_installments: totalInstallments,
              })
              .eq("id", payments[i].id);

            if (updateError) {
              console.error(`   ❌ Erro ao atualizar pagamento ${payments[i].id}:`, updateError);
              totalErrors++;
            } else {
              console.log(`   ✅ Pagamento atualizado: Parcela ${installmentNumber}/${totalInstallments}`);
              totalUpdated++;
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar locação ${rental.id}:`, error);
          totalErrors++;
        }
      }

      setResults({
        total: rentals.length,
        updated: totalUpdated,
        errors: totalErrors,
      });

      toast({
        title: "Correção concluída!",
        description: `${totalUpdated} pagamentos atualizados com sucesso.`,
      });

      console.log("\n🎉 Correção de parcelas concluída!");
      console.log(`   Total de locações: ${rentals.length}`);
      console.log(`   Pagamentos atualizados: ${totalUpdated}`);
      console.log(`   Erros: ${totalErrors}`);
    } catch (error) {
      console.error("❌ Erro ao corrigir parcelas:", error);
      toast({
        title: "Erro",
        description: "Erro ao corrigir parcelas. Veja o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Corrigir Numeração de Parcelas</CardTitle>
          <CardDescription>
            Esta ferramenta atualiza todos os pagamentos no banco de dados com os campos
            <code className="mx-1 px-1 py-0.5 bg-muted rounded">installment</code> e
            <code className="mx-1 px-1 py-0.5 bg-muted rounded">total_installments</code>.
            <br />
            <br />
            Isso garante que todos os cards de pagamento mostrem a informação "Parcela X/Y"
            corretamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFixInstallments}
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
              "Corrigir Parcelas"
            )}
          </Button>

          {results && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">Resultado da Correção</p>
                  <p className="text-sm text-muted-foreground">
                    Total de locações processadas: {results.total}
                  </p>
                  <p className="text-sm text-green-600">
                    Pagamentos atualizados: {results.updated}
                  </p>
                  {results.errors > 0 && (
                    <p className="text-sm text-red-600">
                      Erros: {results.errors}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">Importante</p>
                <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  <li>Esta operação pode levar alguns minutos dependendo da quantidade de locações</li>
                  <li>Todas as locações e seus pagamentos serão processados</li>
                  <li>A numeração será baseada na ordem cronológica dos pagamentos</li>
                  <li>Execute apenas uma vez - pagamentos já corretos não serão afetados</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}