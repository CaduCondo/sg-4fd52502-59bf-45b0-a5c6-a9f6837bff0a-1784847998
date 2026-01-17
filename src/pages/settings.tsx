import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { configService } from "@/services/configService";
import { Config, Location } from "@/types";
import { Trash2, Plus, Save, MapPin, Percent } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { applyCepMask } from "@/lib/masks";
import { SEO } from "@/components/SEO";

export default function Settings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config>({ adminFeePercentage: 6, lateFeePercentage: 2, interestRatePercentage: 0.033, locations: [] });
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Location State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: "",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  const sortedLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const configData = await configService.get();
      setConfig(configData);
      setLocations(configData.locations || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      await configService.save({
        ...config,
        locations: locations
      });

      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    }
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name || !locationForm.cep || !locationForm.address || !locationForm.number || !locationForm.city || !locationForm.state) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newLocation: Location = {
        id: crypto.randomUUID(),
        name: locationForm.name,
        cep: locationForm.cep,
        address: locationForm.address,
        number: locationForm.number,
        neighborhood: locationForm.neighborhood,
        city: locationForm.city,
        state: locationForm.state,
        createdAt: new Date().toISOString()
      };

      await configService.addLocation(newLocation);
      setLocationForm({ name: "", cep: "", address: "", number: "", neighborhood: "", city: "", state: "" });
      setIsLocationModalOpen(false);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: `Local "${newLocation.name}" adicionado`,
      });
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar local",
        variant: "destructive"
      });
    }
  };

  const handleRemoveLocation = async (locationId: string) => {
    try {
      await configService.removeLocation(locationId);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Local removido",
      });
    } catch (error) {
      console.error("Error removing location:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover local",
        variant: "destructive"
      });
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setLocationForm(prev => ({
          ...prev,
          address: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  if (isLoading) return null;

  return (
    <Layout>
      <SEO 
        title="Configurações - Sistema de Locações"
        description="Configure suas preferências e dados da empresa"
      />
      
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Configure suas preferências e dados da empresa
          </p>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-1 max-w-md">
            <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Parâmetros financeiros do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateConfig} className="space-y-6">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Label htmlFor="adminFee">Taxa de Administração (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          id="adminFee"
                          value={config?.adminFeePercentage}
                          onChange={(e) => setConfig(config ? { ...config, adminFeePercentage: Number(e.target.value) } : config)}
                          step="0.1"
                          min="0"
                          max="100"
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Esta taxa será aplicada a todos os cálculos de receita, exceto imóveis classificados como "Outros".
                      </p>
                    </div>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Configuração de Multa e Juros
                  </CardTitle>
                  <CardDescription>
                    Configure as porcentagens aplicadas em pagamentos atrasados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateConfig} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="lateFee">Multa por Atraso (%)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            id="lateFee"
                            value={config?.lateFeePercentage || 2}
                            onChange={(e) => setConfig(config ? { ...config, lateFeePercentage: Number(e.target.value) } : config)}
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Multa aplicada sobre o valor do aluguel quando o pagamento atrasa (padrão: 2%)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="interestRate">Juros Diário (%)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            id="interestRate"
                            value={config?.interestRatePercentage || 0.033}
                            onChange={(e) => setConfig(config ? { ...config, interestRatePercentage: Number(e.target.value) } : config)}
                            step="0.001"
                            min="0"
                            max="10"
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">% ao dia</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Juros aplicado por dia de atraso sobre o valor do aluguel (padrão: 0.033% = 1% ao mês)
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Exemplo de Cálculo</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• Valor do aluguel: R$ 1.500,00</p>
                        <p>• Vencimento: 10/01/2026</p>
                        <p>• Pagamento: 20/01/2026 (10 dias de atraso)</p>
                        <p className="font-semibold mt-2">Cálculo:</p>
                        <p>• Multa ({config?.lateFeePercentage || 2}%): R$ {((config?.lateFeePercentage || 2) * 15).toFixed(2)}</p>
                        <p>• Juros ({config?.interestRatePercentage || 0.033}% × 10 dias): R$ {((config?.interestRatePercentage || 0.033) * 10 * 15).toFixed(2)}</p>
                        <p className="font-bold text-blue-900 mt-2">
                          Total a pagar: R$ {(1500 + ((config?.lateFeePercentage || 2) * 15) + ((config?.interestRatePercentage || 0.033) * 10 * 15)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> Salvar Configurações
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Locais</CardTitle>
                    <CardDescription>Adicione ou remova locais (condomínios/prédios)</CardDescription>
                  </div>
                  <Button onClick={() => setIsLocationModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" /> Novo Local
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-6 border">
                      <StaggerContainer staggerDelay={0.05}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sortedLocations.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Nenhum local cadastrado</p>
                          ) : (
                            sortedLocations.map((location) => (
                              <StaggerItem key={location.id}>
                                <div className="group flex flex-col p-4 bg-white border rounded-md shadow-sm hover:shadow-md transition-all relative">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-slate-100 rounded-full text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                      <MapPin className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-slate-700">{location.name}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-11">
                                    <p>{location.address}, {location.number}</p>
                                    <p>{location.neighborhood} - {location.city}/{location.state}</p>
                                  </div>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleRemoveLocation(location.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Excluir local"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </StaggerItem>
                            ))
                          )}
                        </div>
                      </StaggerContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          </TabsContent>
        </Tabs>

        {/* Location Dialog */}
        <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Local</DialogTitle>
              <CardDescription>Cadastre um condomínio ou prédio.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Local (Ex: Ed. Solar)</Label>
                <Input value={locationForm.name} onChange={(e) => setLocationForm({...locationForm, name: e.target.value})} placeholder="Nome do condomínio" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input 
                    value={locationForm.cep} 
                    onChange={(e) => {
                      const masked = applyCepMask(e.target.value);
                      setLocationForm({...locationForm, cep: masked});
                      if (masked.length === 9) fetchAddressByCep(masked);
                    }} 
                    maxLength={9}
                    placeholder="00000-000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={locationForm.number} onChange={(e) => setLocationForm({...locationForm, number: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={locationForm.address} onChange={(e) => setLocationForm({...locationForm, address: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={locationForm.neighborhood} onChange={(e) => setLocationForm({...locationForm, neighborhood: e.target.value})} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Cidade</Label>
                  <Input value={locationForm.city} onChange={(e) => setLocationForm({...locationForm, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={locationForm.state} onChange={(e) => setLocationForm({...locationForm, state: e.target.value.toUpperCase()})} maxLength={2} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLocationModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveLocation}>Salvar Local</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}