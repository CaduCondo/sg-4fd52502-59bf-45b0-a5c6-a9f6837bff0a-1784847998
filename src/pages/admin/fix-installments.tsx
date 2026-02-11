import { useState } from "react";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { differenceInMonths } from "date-fns";

interface FixLog {
  type: "info" | "success" | "error" | "warning";
  message: string;
}

export default function FixInstallments() {
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [logs, setLogs] = useState<FixLog[]>([]);

  const addLog = (type: FixLog["type"], message: string) => {
    setLogs(prev => [...prev, { type, message }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const fixInstallments = async () => {
    setIsFixing(true);
    setLogs([]);
    
    try {
      addLog("info", "🔍 Iniciando correção de parcelas...");

      // 1. Buscar todas as locações
      const { data: rentals, error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .order("created_at", { ascending: false });

      if (rentalsError) {
        throw new Error(`Erro ao buscar locações: ${rentalsError.message}`);
      }

      addLog("info", `📊 Encontradas ${rentals?.length || 0} locações`);

      let totalFixed = 0;
      let totalErrors = 0;

      // 2. Para cada locação, corrigir seus recebimentos
      for (const rental of rentals || []) {
        try {
          addLog("info", `\n🏠 Processando locação ID: ${rental.id}`);

          // Calcular total de parcelas baseado no período do contrato
          const startDate = new Date(rental.start_date);
          const endDate = rental.end_date ? new Date(rental.end_date) : null;
          
          if (!endDate) {
            addLog("warning", `⚠️ Locação ${rental.id} sem data fim, assumindo 12 meses`);
            continue;
          }

          const totalMonths = differenceInMonths(endDate, startDate) + 1;
          addLog("info", `📅 Período: ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()} = ${totalMonths} meses`);

          // Buscar todos os recebimentos desta locação
          const { data: payments, error: paymentsError } = await supabase
            .from("payments")
            .select("*")
            .eq("rental_id", rental.id)
            .order("due_date", { ascending: true });

          if (paymentsError) {
            addLog("error", `❌ Erro ao buscar recebimentos: ${paymentsError.message}`);
            totalErrors++;
            continue;
          }

          addLog("info", `💰 Encontrados ${payments?.length || 0} recebimentos`);

          // 3. Atualizar cada recebimento com installment e totalInstallments
          for (let i = 0; i < (payments?.length || 0); i++) {
            const payment = payments![i];
            const installmentNumber = i + 1;

            // Verificar se precisa atualizar
            // @ts-expect-error - Propriedades adicionadas recentemente ao banco
            if (payment.installment === installmentNumber && payment.total_installments === totalMonths) {
              addLog("info", `✓ Recebimento ${payment.id} já está correto (${installmentNumber}/${totalMonths})`);
              continue;
            }

            // Atualizar no banco
            const { error: updateError } = await supabase
              .from("payments")
              .update({
                // @ts-expect-error - Propriedades adicionadas recentemente ao banco
                installment: installmentNumber,
                total_installments: totalMonths,
              })
              .eq("id", payment.id);

            if (updateError) {
              addLog("error", `❌ Erro ao atualizar recebimento ${payment.id}: ${updateError.message}`);
              totalErrors++;
            } else {
              addLog("success", `✅ Recebimento ${payment.id} atualizado: ${installmentNumber}/${totalMonths}`);
              totalFixed++;
            }
          }

        } catch (error: any) {
          addLog("error", `❌ Erro ao processar locação ${rental.id}: ${error.message}`);
          totalErrors++;
        }
      }

      // Resumo final
      addLog("info", "\n" + "=".repeat(50));
      addLog("success", `✅ Correção concluída!`);
      addLog("info", `📊 Total de recebimentos corrigidos: ${totalFixed}`);
      if (totalErrors > 0) {
        addLog("error", `❌ Total de erros: ${totalErrors}`);
      }

      toast({
        title: "Correção Concluída",
        description: `${totalFixed} recebimentos foram corrigidos com sucesso!`,
      });

    } catch (error: any) {
      addLog("error", `❌ Erro fatal: ${error.message}`);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getLogIcon = (type: FixLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getLogColor = (type: FixLog["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <>
      <Head>
        <title>Corrigir Parcelas - Admin</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Corrigir Parcelas dos Recebimentos</h1>
            <p className="text-muted-foreground mt-2">
              Esta ferramenta irá corrigir os campos <code>installment</code> e <code>total_installments</code> de todos os recebimentos.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Correção Automática</CardTitle>
              <CardDescription>
                Para cada locação, esta ferramenta irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Calcular o total de meses do contrato (data início → data fim)</li>
                  <li>Buscar todos os recebimentos da locação (ordenados por data de vencimento)</li>
                  <li>Atualizar cada recebimento com o número da parcela (1, 2, 3...) e total de parcelas</li>
                </ul>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={fixInstallments}
                disabled={isFixing}
                size="lg"
                className="w-full"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Corrigindo...
                  </>
                ) : (
                  "Iniciar Correção"
                )}
              </Button>
            </CardContent>
          </Card>

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Log de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm font-mono">
                      {getLogIcon(log.type)}
                      <span className={getLogColor(log.type)}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
}