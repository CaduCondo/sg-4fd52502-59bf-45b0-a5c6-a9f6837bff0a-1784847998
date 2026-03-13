import { 
  Save, 
  MapPin, 
  Building2,
  AlertCircle,
  Plus,
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
import * as systemUserService from "@/services/systemUserService";
import { roleMenuPermissionService } from "@/services/roleMenuPermissionService";
import { locationPermissionService } from "@/services/locationPermissionService";
import * as adminFeeExemptionService from "@/services/adminFeeExemptionService";
import { LocationExpensesDialog } from "@/components/settings/LocationExpensesDialog";
import { UsersTab } from "@/components/settings/UsersTab";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import type { Location, LocationExpense, SystemUser, RoleMenuPermission } from "@/types";

export default function Settings() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [feePercentage, setFeePercentage] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState("");
  
  const [locationExpenses, setLocationExpenses] = useState<LocationExpense[]>([]);
  const [selectedLocationForExpenses, setSelectedLocationForExpenses] = useState<Location | undefined>();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roleMenuPermissions, setRoleMenuPermissions] = useState<RoleMenuPermission[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  
  const canManageSettings = hasPermission("manage_settings");
  const canManageUsers = hasPermission("manage_users");

  useEffect(() => {
    loadSettings();
    if (canManageUsers) {
      loadUsersAndPermissions();
    }
  }, [canManageUsers]);

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

  const loadUsersAndPermissions = async () => {
    try {
      setIsLoadingUsers(true);
      setIsLoadingPermissions(true);
      
      const [usersData, permissionsData] = await Promise.all([
        systemUserService.getSystemUsers(),
        roleMenuPermissionService.getAll()
      ]);
      
      setUsers(usersData);
      setRoleMenuPermissions(permissionsData);
    } catch (error) {
      console.error("Erro ao carregar usuários e permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar usuários e permissões.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingPermissions(false);
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

  const handleOpenExpensesDialog = (location: Location) => {
    setSelectedLocationForExpenses(location);
    setIsExpenseDialogOpen(true);
  };

  const handleCreateUser = async (userData: any): Promise<boolean> => {
    try {
      await systemUserService.createUser(userData);
      await loadUsersAndPermissions();
      toast({ title: "Sucesso", description: "Usuário criado com sucesso." });
      return true;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast({ title: "Erro", description: "Falha ao criar usuário.", variant: "destructive" });
      return false;
    }
  };

  const handleUpdateUser = async (id: string, userData: any): Promise<boolean> => {
    try {
      await systemUserService.updateUser(id, userData);
      await loadUsersAndPermissions();
      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso." });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({ title: "Erro", description: "Falha ao atualizar usuário.", variant: "destructive" });
      return false;
    }
  };

  const handleDeleteUser = async (id: string): Promise<boolean> => {
    try {
      await systemUserService.deleteUser(id);
      await loadUsersAndPermissions();
      toast({ title: "Sucesso", description: "Usuário excluído com sucesso." });
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({ title: "Erro", description: "Falha ao excluir usuário.", variant: "destructive" });
      return false;
    }
  };

  const handleToggleUserStatus = async (user: SystemUser): Promise<boolean> => {
    try {
      await systemUserService.updateUser(user.id, { active: !user.active });
      await loadUsersAndPermissions();
      toast({ 
        title: "Sucesso", 
        description: `Usuário ${user.active ? 'bloqueado' : 'desbloqueado'} com sucesso.` 
      });
      return true;
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      toast({ title: "Erro", description: "Falha ao alterar status do usuário.", variant: "destructive" });
      return false;
    }
  };

  const handleResetPassword = async (userId: string): Promise<void> => {
    try {
      await systemUserService.resetPassword(userId);
      toast({ 
        title: "Sucesso", 
        description: "Senha zerada com sucesso. Nova senha: 123456" 
      });
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      toast({ title: "Erro", description: "Falha ao resetar senha.", variant: "destructive" });
    }
  };

  const handleUpdateRoleMenuPermission = async (role: string, menuItem: string, hasAccess: boolean): Promise<boolean> => {
    try {
      await roleMenuPermissionService.updatePermission(role, menuItem, hasAccess);
      await loadUsersAndPermissions();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      return false;
    }
  };

  const handleSaveLocationPermissions = async (userId: string, locationIds: string[]): Promise<boolean> => {
    try {
      // Buscar permissões atuais para saber o que adicionar/remover
      const currentPerms = await locationPermissionService.getUserPermissions(userId);
      const currentIds = currentPerms.map(p => p.location_id);
      
      const toAdd = locationIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !locationIds.includes(id));
      
      for (const id of toAdd) {
        await locationPermissionService.grantFullAccess(userId, id);
      }
      for (const id of toRemove) {
        await locationPermissionService.revokeAccess(userId, id);
      }
      
      toast({ title: "Sucesso", description: "Permissões de locais atualizadas com sucesso." });
      return true;
    } catch (error) {
      console.error("Erro ao salvar permissões de locais:", error);
      toast({ title: "Erro", description: "Falha ao salvar permissões de locais.", variant: "destructive" });
      return false;
    }
  };

  const handleSaveFeeExemptions = async (locationIds: string[]): Promise<boolean> => {
    try {
      await adminFeeExemptionService.setExemptLocations(locationIds);
      toast({ title: "Sucesso", description: "Isenções de taxa atualizadas com sucesso." });
      return true;
    } catch (error) {
      console.error("Erro ao salvar isenções:", error);
      toast({ title: "Erro", description: "Falha ao salvar isenções de taxa.", variant: "destructive" });
      return false;
    }
  };

  const getUserLocationPermissions = async (userId: string): Promise<string[]> => {
    try {
      const permissions = await locationPermissionService.getUserPermissions(userId);
      return permissions.map(p => p.location_id);
    } catch (error) {
      console.error("Erro ao buscar permissões do usuário:", error);
      return [];
    }
  };

  const getFeeExemptions = async (): Promise<string[]> => {
    try {
      return await adminFeeExemptionService.getExemptLocations();
    } catch (error) {
      console.error("Erro ao buscar isenções:", error);
      return [];
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
                  </div>
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div key={location.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {locationExpenses.filter(e => e.locationId === location.id).length} despesas cadastradas
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenExpensesDialog(location)}
                        >
                          Gerenciar
                        </Button>
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
                <UsersTab
                  users={users}
                  isLoading={isLoadingUsers}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onToggleStatus={handleToggleUserStatus}
                  onResetPassword={handleResetPassword}
                />
              </TabsContent>
              <TabsContent value="permissions">
                <PermissionsTab
                  users={users}
                  locations={locations}
                  roleMenuPermissions={roleMenuPermissions}
                  isLoading={isLoadingPermissions}
                  onUpdateRoleMenuPermission={handleUpdateRoleMenuPermission}
                  onSaveLocationPermissions={handleSaveLocationPermissions}
                  onSaveFeeExemptions={handleSaveFeeExemptions}
                  getUserLocationPermissions={getUserLocationPermissions}
                  getFeeExemptions={getFeeExemptions}
                />
              </TabsContent>
            </>
          )}
        </Tabs>

        {selectedLocationForExpenses && (
          <LocationExpensesDialog
            open={isExpenseDialogOpen}
            onOpenChange={setIsExpenseDialogOpen}
            location={selectedLocationForExpenses}
          />
        )}
      </div>
    </Layout>
  );
}