import { 
  Save, 
  MapPin, 
  Building2,
  Percent,
  AlertCircle,
  Coins,
  Plus,
  Pencil,
  Trash2,
  Check,
  User,
  Shield,
  Settings as SettingsIcon,
  Users,
  Wrench,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import * as configService from "@/services/configService";
import * as locationService from "@/services/locationService";
import * as igpmService from "@/services/igpmService";
import * as adminFeeExemptionService from "@/services/adminFeeExemptionService";
import * as locationExpenseService from "@/services/locationExpenseService";
import { analyzeAllRentalsPayments, fixSpecificRentalPayments } from "@/services/paymentService";
import { LocationExpensesDialog } from "@/components/settings/LocationExpensesDialog";
import { FeeExemptionDialog } from "@/components/settings/FeeExemptionDialog";
import { UsersTab } from "@/components/settings/UsersTab";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import type { 
  Location, 
  AdminFeeExemption, 
  LocationExpense 
} from "@/types";

export default function Settings() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [feePercentage, setFeePercentage] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [igpmRates, setIgpmRates] = useState<
    Array<{ month: number; year: number; rate: number }>
  >([]);
  const [newIgpmMonth, setNewIgpmMonth] = useState<number | "">("");
  const [newIgpmYear, setNewIgpmYear] = useState<number | "">("");
  const [newIgpmRate, setNewIgpmRate] = useState<number | "">("");
  const [exemptions, setExemptions] = useState<AdminFeeExemption[]>([]);
  const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
  const [selectedExemption, setSelectedExemption] = useState<AdminFeeExemption | undefined>();
  const [locationExpenses, setLocationExpenses] = useState<LocationExpense[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LocationExpense | undefined>();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ 
    totalRentals: number; 
    problems: { rentalId: string; propertyName: string; reason: string }[];
  } | null>(null);

  const canManageSettings = hasPermission("manage_settings");
  const canManageUsers = hasPermission("manage_users");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await configService.get();
      setFeePercentage(config.adminFeePercentage.toString());

      const locationsData = await locationService.getAll();
      setLocations(locationsData);

      const rates = await igpmService.getAll();
      setIgpmRates(rates);

      const exemptionsData = await adminFeeExemptionService.getAll();
      setExemptions(exemptionsData);

      const expensesData = await locationExpenseService.getAll();
      setLocationExpenses(expensesData);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFee = async () => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para alterar configurações.",
        variant: "destructive",
      });
      return;
    }

    try {
      await configService.update({ adminFeePercentage: Number(feePercentage) });
      toast({
        title: "Sucesso",
        description: "Taxa de administração atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a taxa.",
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async () => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para adicionar locais.",
        variant: "destructive",
      });
      return;
    }

    if (!newLocation.trim()) return;

    try {
      await locationService.create({ name: newLocation.trim() });
      setNewLocation("");
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Local adicionado.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o local.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir locais.",
        variant: "destructive",
      });
      return;
    }

    try {
      await locationService.remove(id);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Local removido.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o local.",
        variant: "destructive",
      });
    }
  };

  const handleAddIgpmRate = async () => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para adicionar taxas IGPM.",
        variant: "destructive",
      });
      return;
    }

    if (newIgpmMonth === "" || newIgpmYear === "" || newIgpmRate === "") return;

    try {
      await igpmService.create({
        month: Number(newIgpmMonth),
        year: Number(newIgpmYear),
        rate: Number(newIgpmRate),
      });
      setNewIgpmMonth("");
      setNewIgpmYear("");
      setNewIgpmRate("");
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Taxa IGPM adicionada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a taxa IGPM.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIgpmRate = async (id: string) => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir taxas IGPM.",
        variant: "destructive",
      });
      return;
    }

    try {
      await igpmService.remove(id);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Taxa IGPM removida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a taxa IGPM.",
        variant: "destructive",
      });
    }
  };

  const handleAddExemption = () => {
    setSelectedExemption(undefined);
    setIsExemptionDialogOpen(true);
  };

  const handleEditExemption = (exemption: AdminFeeExemption) => {
    setSelectedExemption(exemption);
    setIsExemptionDialogOpen(true);
  };

  const handleDeleteExemption = async (id: string) => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir isenções.",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminFeeExemptionService.remove(id);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Isenção removida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a isenção.",
        variant: "destructive",
      });
    }
  };

  const handleAddExpense = () => {
    setSelectedExpense(undefined);
    setIsExpenseDialogOpen(true);
  };

  const handleEditExpense = (expense: LocationExpense) => {
    setSelectedExpense(expense);
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!canManageSettings) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para excluir despesas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await locationExpenseService.remove(id);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: "Despesa removida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a despesa.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzePayments = async () => {
    if (!canManageSettings) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeAllRentalsPayments();
      if (result.success) {
        setAnalysisResult({
          totalRentals: result.totalRentals,
          problems: result.problems
        });
        toast({
          title: "Análise concluída",
          description: `Foram encontradas ${result.problems.length} locações com inconsistências.`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível analisar os pagamentos.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFixSpecific = async (rentalId: string) => {
    if (!canManageSettings) return;
    setIsFixing(rentalId);
    try {
      const success = await fixSpecificRentalPayments(rentalId);
      if (success) {
        toast({
          title: "Sucesso",
          description: "Os recebimentos desta locação foram corrigidos mantendo status e anexos.",
        });
        await handleAnalyzePayments();
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível corrigir a locação.",
          variant: "destructive",
        });
      }
    } finally {
      setIsFixing(null);
    }
  };

  if (!canManageSettings && !canManageUsers) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar as configurações do sistema.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações do sistema
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            {canManageSettings && (
              <>
                <TabsTrigger value="general">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="locations">
                  <MapPin className="w-4 h-4 mr-2" />
                  Locais
                </TabsTrigger>
                <TabsTrigger value="igpm">
                  <Percent className="w-4 h-4 mr-2" />
                  IGPM
                </TabsTrigger>
                <TabsTrigger value="exemptions">
                  <Coins className="w-4 h-4 mr-2" />
                  Isenções
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  <Building2 className="w-4 h-4 mr-2" />
                  Despesas
                </TabsTrigger>
                <TabsTrigger value="maintenance">
                  <Wrench className="w-4 h-4 mr-2" />
                  Manutenção
                </TabsTrigger>
              </>
            )}
            {canManageUsers && (
              <>
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="permissions">
                  <Shield className="w-4 h-4 mr-2" />
                  Permissões
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {canManageSettings && (
            <>
              <TabsContent value="general" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Taxa de Administração
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fee">
                        Percentual da Taxa (%)
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="fee"
                          type="number"
                          step="0.01"
                          value={feePercentage}
                          onChange={(e) => setFeePercentage(e.target.value)}
                          placeholder="10"
                        />
                        <Button onClick={handleSaveFee}>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Locais</h2>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Nome do local"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleAddLocation();
                        }}
                      />
                      <Button onClick={handleAddLocation}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {locations.map((location) => (
                        <div
                          key={location.id}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <span>{location.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="igpm" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Taxas IGPM</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        type="number"
                        value={newIgpmMonth}
                        onChange={(e) =>
                          setNewIgpmMonth(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                        placeholder="Mês (1-12)"
                        min="1"
                        max="12"
                      />
                      <Input
                        type="number"
                        value={newIgpmYear}
                        onChange={(e) =>
                          setNewIgpmYear(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                        placeholder="Ano"
                        min="2000"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={newIgpmRate}
                        onChange={(e) =>
                          setNewIgpmRate(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                        placeholder="Taxa (%)"
                      />
                      <Button onClick={handleAddIgpmRate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {igpmRates
                        .sort((a, b) => {
                          if (a.year !== b.year) return b.year - a.year;
                          return b.month - a.month;
                        })
                        .map((rate) => (
                          <div
                            key={rate.id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <span>
                              {rate.month.toString().padStart(2, "0")}/
                              {rate.year} - {rate.rate}%
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIgpmRate(rate.id!)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="exemptions" className="space-y-4">
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                      Isenções de Taxa de Administração
                    </h2>
                    <Button onClick={handleAddExemption}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Isenção
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {exemptions.map((exemption) => (
                      <div
                        key={exemption.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{exemption.tenantName}</p>
                          <p className="text-sm text-muted-foreground">
                            {exemption.propertyIdentifier}
                          </p>
                          {exemption.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Motivo: {exemption.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExemption(exemption)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExemption(exemption.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {exemptions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma isenção cadastrada
                      </p>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                      Despesas dos Locais
                    </h2>
                    <Button onClick={handleAddExpense}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Despesa
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {locationExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{expense.locationName}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.expenseType} - R${" "}
                            {expense.value.toFixed(2)}
                          </p>
                          {expense.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {locationExpenses.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma despesa cadastrada
                      </p>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Ferramentas de Manutenção de Recebimentos
                  </h2>
                  
                  <Alert className="mb-4 bg-blue-50 text-blue-900 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-900" />
                    <AlertTitle>Análise Segura</AlertTitle>
                    <AlertDescription>
                      Esta ferramenta analisa os recebimentos atuais e identifica meses faltando ou numeração de parcelas incorretas. Ela <strong>NÃO DELETA</strong> nenhum dado e a correção individual preserva status de pago e anexos.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Analisar Inconsistências</h3>
                          <p className="text-sm text-muted-foreground">
                            Verifique se alguma locação está com parcelas faltantes ou com a numeração errada (ex: Prorata em loop).
                          </p>
                        </div>
                        <Button 
                          onClick={handleAnalyzePayments}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-2" />
                              Verificar Locações
                            </>
                          )}
                        </Button>
                      </div>

                      {analysisResult && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="font-medium mb-3">
                            Resultado: {analysisResult.totalRentals} locações verificadas. {analysisResult.problems.length} com problemas.
                          </p>
                          
                          {analysisResult.problems.length > 0 ? (
                            <div className="space-y-3">
                              {analysisResult.problems.map((problem) => (
                                <div key={problem.rentalId} className="flex items-center justify-between bg-red-50 p-3 rounded-md border border-red-100">
                                  <div>
                                    <p className="font-semibold text-red-900">{problem.propertyName}</p>
                                    <p className="text-sm text-red-700">{problem.reason}</p>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleFixSpecific(problem.rentalId)}
                                    disabled={isFixing === problem.rentalId}
                                  >
                                    {isFixing === problem.rentalId ? (
                                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                    ) : (
                                      <Wrench className="w-3 h-3 mr-2" />
                                    )}
                                    Corrigir Apenas Esta
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-green-50 p-4 rounded-md border border-green-200 flex items-center">
                              <Check className="w-5 h-5 text-green-600 mr-2" />
                              <span className="text-green-800 font-medium">Todas as locações estão com os recebimentos perfeitos!</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </>
          )}

          {canManageUsers && (
            <>
              <TabsContent value="users">
                <UsersTab />
              </TabsContent>

              <TabsContent value="permissions">
                <PermissionsTab />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* DIALOG DE LOCAL */}
        <FeeExemptionDialog
          open={isExemptionDialogOpen}
          onOpenChange={setIsExemptionDialogOpen}
          exemption={selectedExemption}
          onSave={loadSettings}
        />

        <LocationExpensesDialog
          open={isExpenseDialogOpen}
          onOpenChange={setIsExpenseDialogOpen}
          expense={selectedExpense}
          onSave={loadSettings}
        />
      </div>
    </Layout>
  );
}