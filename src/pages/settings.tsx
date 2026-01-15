import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { configStorage } from "@/lib/storage";
import { Settings as SettingsIcon, Save, AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Settings() {
  const router = useRouter();
  const [adminFeePercentage, setAdminFeePercentage] = useState("6");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadConfig();
  }, [router]);

  const loadConfig = () => {
    const config = configStorage.get();
    setAdminFeePercentage(config.adminFeePercentage.toString());
    if (config.lastUpdated) {
      const date = new Date(config.lastUpdated);
      setLastUpdated(date.toLocaleString("pt-BR"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const percentage = parseFloat(adminFeePercentage);
    if (percentage < 0 || percentage > 100) {
      setMessage("A porcentagem deve estar entre 0 e 100");
      return;
    }

    configStorage.update(percentage);
    loadConfig();
    setMessage("Configurações atualizadas com sucesso! Os pagamentos do mês corrente foram recalculados.");
    
    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <>
      <SEO 
        title="Configurações - ImóvelControl"
        description="Configurações do sistema de gerenciamento"
      />
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
            <p className="text-slate-600 mt-2">Ajuste as configurações do sistema</p>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>Taxa de Administração</CardTitle>
                  <CardDescription>
                    Configure a porcentagem da comissão do corretor
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="adminFeePercentage">Porcentagem da Taxa (%)</Label>
                  <Input
                    id="adminFeePercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={adminFeePercentage}
                    onChange={(e) => setAdminFeePercentage(e.target.value)}
                    placeholder="6.00"
                    required
                    className="text-lg"
                  />
                  <p className="text-sm text-slate-500">
                    Esta porcentagem será aplicada sobre todos os valores recebidos no mês
                  </p>
                </div>

                {message && (
                  <div className={`flex items-start space-x-2 p-4 rounded-md border ${
                    message.includes("sucesso") 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{message}</span>
                  </div>
                )}

                {lastUpdated && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Última atualização:</span> {lastUpdated}
                  </div>
                )}

                <Button type="submit" className="flex items-center space-x-2">
                  <Save size={18} />
                  <span>Salvar Configurações</span>
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">Informações Importantes</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      Ao alterar a taxa, todos os pagamentos do mês corrente serão recalculados automaticamente
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      A nova taxa será aplicada apenas aos novos pagamentos gerados
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      A taxa de administração é calculada sobre o valor total recebido no mês
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}