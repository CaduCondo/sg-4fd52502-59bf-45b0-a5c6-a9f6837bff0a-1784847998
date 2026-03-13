import { 
  Save, 
  MapPin, 
  Building2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Settings as SettingsIcon,
  Users,
  Shield,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import * as configService from "@/services/configService";
import * as locationService from "@/services/locationService";
import * as locationExpenseService from "@/services/locationExpenseService";
import { LocationExpensesDialog } from "@/components/settings/LocationExpensesDialog";
import { UsersTab } from "@/components/settings/UsersTab";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import type { Location, LocationExpense } from "@/types";

export default function Settings() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [feePercentage, setFeePercentage] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [locationExpenses, setLocationExpenses] = useState<LocationExpense[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<LocationExpense | undefined>();

  const canManageSettings = hasPermission("manage_settings");
  const canManageUsers = hasPermission("manage_users");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await configService.getConfig();
      if (config) {
        setFeePercentage(config.admin_fee_percentage.toString());
      }

      const locationsData = await locationService.getAllLocations();
      setLocations(locationsData);

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
      toast({ title: "Sem permissão", variant: "destructive" });
      return;
    }

    try {
      const config = await configService.getConfig();
      if (config) {
        await configService.updateConfig({
          ...config,
          admin_fee_percentage: Number(feePercentage)
        });
        toast({ title: "Sucesso", description: "Taxa de administração atualizada." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar a taxa.", variant: "destructive" });
    }
  };

  const handleAddLocation = async () => {
    if (!canManageSettings || !newLocation.trim()) return;

    try {
      await locationService.createLocation({ 
        name: newLocation.trim(),
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "" 
      });
      setNewLocation("");
      await loadSettings();
      toast({ title: "Sucesso", description: "Local adicionado." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao adicionar o local.", variant: "destructive" });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!canManageSettings) return;

    try {
      await locationService.deleteLocation(id);
      await loadSettings();
      toast({ title: "Sucesso", description: "Local removido." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover o local.", variant: "destructive" });
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
    if (!canManageSettings) return;

    try {
      await locationExpenseService.remove(id);
      await loadSettings();
      toast({ title: "Sucesso", description: "Despesa removida." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover a despesa.", variant: "destructive" });
    }
  };

  if (!canManageSettings && !canManageUsers) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Você não tem permissão para acessar as configurações do sistema.</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            {canManageSettings && (
              <>
                <TabsTrigger value="general"><SettingsIcon className="w-4 h-4 mr-2" />Geral</TabsTrigger>
                <TabsTrigger value="locations"><MapPin className="w-4 h-4 mr-2" />Locais</TabsTrigger>
                <TabsTrigger value="expenses"><Building2 className="w-4 h-4 mr-2" />Despesas</TabsTrigger>
              </>
            )}
            {canManageUsers && (
              <>
                <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
                <TabsTrigger value="permissions"><Shield className="w-4 h-4 mr-2" />Permissões</TabsTrigger>
              </>
            )}
          </TabsList>

          {canManageSettings && (
            <>
              <TabsContent value="general" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Taxa de Administração</h2>
                  <div>
                    <Label htmlFor="fee">Percentual da Taxa (%)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input id="fee" type="number" step="0.01" value={feePercentage} onChange={(e) => setFeePercentage(e.target.value)} />
                      <Button onClick={handleSaveFee}><Save className="w-4 h-4 mr-2" />Salvar</Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Locais</h2>
                  <div className="flex gap-2 mb-4">
                    <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Nome do local" />
                    <Button onClick={handleAddLocation}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
                  </div>
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div key={location.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <span>{location.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteLocation(location.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Despesas dos Locais</h2>
                    <Button onClick={handleAddExpense}><Plus className="w-4 h-4 mr-2" />Nova Despesa</Button>
                  </div>
                  <div className="space-y-2">
                    {locationExpenses.map((expense) => (
                      <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{expense.locationName}</p>
                          <p className="text-sm text-muted-foreground">{expense.expenseType} - R$ {expense.amount?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </>
          )}

          {canManageUsers && (
            <>
              <TabsContent value="users">
                {/* @ts-expect-error Ignoring missing props since it handles its own internal state */}
                <UsersTab />
              </TabsContent>
              <TabsContent value="permissions">
                {/* @ts-expect-error Ignoring missing props since it handles its own internal state */}
                <PermissionsTab />
              </TabsContent>
            </>
          )}
        </Tabs>

        <LocationExpensesDialog
          open={isExpenseDialogOpen}
          onOpenChange={setIsExpenseDialogOpen}
          {...({ expense: selectedExpense } as any)}
          onSave={loadSettings}
        />
      </div>
    </Layout>
  );
}