import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface FixResult {
  success: boolean;
  rentalsAnalyzed: number;
  duplicatesFound: number;
  duplicatesFixed: number;
  errors: string[];
  details: Array<{
    rentalId: string;
    propertyId: string;
    duplicates: Array<{
      rentalId: string;
      month: number;
      year: number;
      paymentIds: string[];
      dueDates: string[];
    }>;
    action: string;
  }>;
}

export default function FixPaymentsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);

  const runDiagnostic = async () => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch("/api/fix-duplicate-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        rentalsAnalyzed: 0,
        duplicatesFound: 0,
        duplicatesFixed: 0,
        errors: [error.message],
        details: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runFix = async () => {
    if (!confirm("⚠️ ATENÇÃO! Isso vai DELETAR recebimentos duplicados. Tem certeza?")) {
      return;
    }

    setIsFixing(true);
    setResult(null);

    try {
      const response = await fetch("/api/fix-duplicate-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        rentalsAnalyzed: 0,
        duplicatesFound: 0,
        duplicatesFixed: 0,
        errors: [error.message],
        details: [],
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">🔧 Correção de Recebimentos Duplicados</CardTitle>
          <CardDescription>
            Ferramenta para diagnosticar e corrigir recebimentos duplicados no mesmo mês
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>IMPORTANTE:</strong> Execute primeiro o diagnóstico (DRY RUN) para ver o que será corrigido.
              Depois, execute a correção para aplicar as mudanças.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              onClick={runDiagnostic}
              disabled={isAnalyzing || isFixing}
              variant="outline"
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  1. Diagnóstico (Dry Run)
                </>
              )}
            </Button>

            <Button
              onClick={runFix}
              disabled={isAnalyzing || isFixing || !result?.duplicatesFound}
              variant="destructive"
              className="flex-1"
            >
              {isFixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Corrigindo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  2. Corrigir Duplicatas
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Resultado
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Erro
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Locações Analisadas</div>
                <div className="text-2xl font-bold text-blue-900">{result.rentalsAnalyzed}</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-yellow-600 font-medium">Duplicatas Encontradas</div>
                <div className="text-2xl font-bold text-yellow-900">{result.duplicatesFound}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Duplicatas Corrigidas</div>
                <div className="text-2xl font-bold text-green-900">{result.duplicatesFixed}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Erros</div>
                <div className="text-2xl font-bold text-red-900">{result.errors.length}</div>
              </div>
            </div>

            {/* Erros */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Erros encontrados:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((error, idx) => (
                      <li key={idx} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Detalhes */}
            {result.details.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detalhes das Locações com Duplicatas:</h3>
                {result.details.map((detail, idx) => (
                  <Card key={idx} className="bg-gray-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Locação: {detail.rentalId.substring(0, 8)}... | Imóvel: {detail.propertyId.substring(0, 8)}...
                      </CardTitle>
                      <CardDescription>{detail.action}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.duplicates.map((dup, dupIdx) => (
                          <div key={dupIdx} className="p-3 bg-white rounded border">
                            <div className="font-medium text-sm mb-2">
                              🔴 Mês: {dup.month}/{dup.year} ({dup.paymentIds.length} parcelas duplicadas)
                            </div>
                            <div className="text-xs space-y-1">
                              {dup.paymentIds.map((id, idIdx) => (
                                <div key={idIdx} className="flex justify-between">
                                  <span>ID: {id.substring(0, 8)}...</span>
                                  <span>Venc: {dup.dueDates[idIdx]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Mensagem de sucesso */}
            {result.success && result.duplicatesFound === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ Nenhuma duplicata encontrada! Todos os recebimentos estão corretos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}