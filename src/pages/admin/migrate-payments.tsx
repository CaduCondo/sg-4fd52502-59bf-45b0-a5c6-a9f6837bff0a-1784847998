import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

interface MigrationResult {
  success: boolean;
  message: string;
  processed: number;
  updated: number;
  errors: string[];
}

export default function MigratePaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const handleMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/migrate-proportional-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        message: "Erro ao executar migração",
        processed: 0,
        updated: 0,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEO title="Migração de Pagamentos - Gerenciador de Locações" />
      
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Migração de Pagamentos</h1>
          <p className="text-muted-foreground">
            Corrigir valores proporcionais das primeiras parcelas de contratos ativos
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Atualização de Parcelas Proporcionais</CardTitle>
            <CardDescription>
              Esta ferramenta irá recalcular e corrigir o valor da primeira parcela de todos os contratos ativos
              que possuem data de início diferente do dia de vencimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Como funciona</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p><strong>1.</strong> Busca todas as locações ativas no sistema</p>
                <p><strong>2.</strong> Identifica contratos onde data de início ≠ dia de vencimento</p>
                <p><strong>3.</strong> Calcula o valor proporcional correto baseado nos dias</p>
                <p><strong>4.</strong> Atualiza apenas a primeira parcela de cada contrato</p>
                <p className="mt-4 font-semibold">
                  Exemplo: Se o contrato inicia dia 15 e vence dia 10, serão cobrados 26 dias proporcionais.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleMigration}
                disabled={loading}
                size="lg"
                className="w-full max-w-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando migração...
                  </>
                ) : (
                  "Executar Migração"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={result.success ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Migração Concluída
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Migração Concluída com Erros
                  </>
                )}
              </CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Contratos Processados</p>
                  <p className="text-2xl font-bold">{result.processed}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Parcelas Atualizadas</p>
                  <p className="text-2xl font-bold">{result.updated}</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erros Encontrados ({result.errors.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {result.success && result.updated > 0 && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700 dark:text-green-300">
                    Sucesso!
                  </AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    {result.updated} primeira(s) parcela(s) foi(ram) recalculada(s) e atualizada(s) com sucesso!
                    Verifique os pagamentos dos contratos ativos para confirmar os valores.
                  </AlertDescription>
                </Alert>
              )}

              {result.success && result.updated === 0 && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-700 dark:text-blue-300">
                    Nenhuma atualização necessária
                  </AlertTitle>
                  <AlertDescription className="text-blue-600 dark:text-blue-400">
                    Todos os contratos ativos já estão com os valores corretos ou não possuem
                    primeiras parcelas proporcionais.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}