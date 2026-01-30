import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Shield,
  Wallet
} from "lucide-react";

// Services
import { 
  getConfig, 
  updateConfig 
} from "@/services/configService";
import * as locationService from "@/services/locationService";

// Helpers
import {
  applyCnpjMask,
  applyPhoneMask,
  applyCepMask,
  parsePercentageToFloat,
  formatPercentage,
  applyPercentageMask
} from "@/lib/masks";

// Types
import { Location, CompanyConfig } from "@/types";

// New modular components
import { UsersTab } from "@/components/settings/UsersTab";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import { FeeExemptionDialog } from "@/components/settings/FeeExemptionDialog";
import { UserDialog } from "@/components/settings/UserDialog";

// Custom hooks
import { useUsers } from "@/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { LocationExpensesDialog } from "@/components/settings/LocationExpensesDialog";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");

  // Config State
  const [config, setConfig] = useState<CompanyConfig>({
    id: "",
    company_name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    admin_fee_percentage: 0,
    management_fee_percentage: 0,
    late_fee_percentage: 0,
    interest_rate_percentage: 0,
  });

  // State for form inputs (strings to handle formatting)
  const [adminFee, setAdminFee] = useState("0,000");
  const [managementFee, setManagementFee] = useState("0,000");
  const [lateFee, setLateFee] = useState("0,000");
  const [interestRate, setInterestRate] = useState("0,000");

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
  });
  const [selectedLocationForExpenses, setSelectedLocationForExpenses] = useState<Location | null>(null);

  // Use custom hooks for users and permissions
  const { 
    permissions, 
    loading: permissionsLoading, 
    updateRoleMenuPermission, 
    saveLocationPermissions, 
    saveFeeExemptions,
    getUserLocationPermissions,
    getUserFeeExemptions
  } = usePermissions();

  const { 
    users, 
    isLoading: usersLoading, // Rename exposed isLoading to usersLoading
    error: usersError, 
    refresh: refreshUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleToggleUserStatus
  } = useUsers();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await Promise.all([
          loadConfig(),
          loadLocations()
        ]);
      } catch (err) {
        console.error("Error loading settings data:", err);
      }
    };

    loadData();
  }, [user?.id]);

  const loadConfig = async () => {
    try {
      const data = await getConfig();
      if (data) {
        setConfig(data);
        setAdminFee(formatPercentage(data.admin_fee_percentage));
        setManagementFee(formatPercentage(data.management_fee_percentage || 0));
        setLateFee(formatPercentage(data.late_fee_percentage));
        setInterestRate(formatPercentage(data.interest_rate_percentage));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    }
  };

  const loadLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = {
      ...config,
      admin_fee_percentage: parsePercentageToFloat(adminFee),
      management_fee_percentage: parsePercentageToFloat(managementFee),
      late_fee_percentage: parsePercentageToFloat(lateFee),
      interest_rate_percentage: parsePercentageToFloat(interestRate),
    };
    try {
      await updateConfig(updatedConfig);
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      console.error("Erro ao salvar config:", error);
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setLocationForm(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));

        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching CEP:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive",
      });
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const locationData = {
        name: locationForm.name,
        street: locationForm.street,
        number: locationForm.number,
        complement: locationForm.complement,
        neighborhood: locationForm.neighborhood,
        city: locationForm.city,
        state: locationForm.state,
        zip_code: locationForm.zip_code,
        is_active: true,
      };

      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, locationData);
        toast({
          title: "Sucesso",
          description: "Local atualizado com sucesso.",
        });
      } else {
        await locationService.createLocation(locationData);
        toast({
          title: "Sucesso",
          description: "Local cadastrado com sucesso.",
        });
      }

      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      setLocationForm({
        name: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
      });
      loadLocations();
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o local.",
        variant: "destructive",
      });
    }
  };

  const openLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        street: location.street || "",
        number: location.number || "",
        complement: location.complement || "",
        neighborhood: location.neighborhood || "",
        city: location.city,
        state: location.state,
        zip_code: location.zip_code || "",
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        name: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
      });
    }
    setIsLocationDialogOpen(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;

    try {
      await locationService.deleteLocation(locationId);
      toast({ title: "Local excluído com sucesso!" });
      loadLocations();
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      toast({ title: "Erro ao excluir local", variant: "destructive" });
    }
  };

  const filteredLocations = locations.filter((location) => {
    const search = searchLocation.toLowerCase();
    return (
      location.name?.toLowerCase().includes(search) ||
      location.city?.toLowerCase().includes(search) ||
      location.neighborhood?.toLowerCase().includes(search)
    );
  });

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Deseja resetar a senha deste usuário para 'mudar123'?")) return;
    try {
      const { error } = await supabase
        .from("system_users")
        .update({ password: "mudar123" })
        .eq("id", userId);

      if (error) throw error;
      toast({ title: "Senha resetada com sucesso!" });
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      toast({ title: "Erro ao resetar senha", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os dados da empresa, usuários e parâmetros do sistema
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
            <TabsTrigger value="company" className="gap-2 py-3">
              <Building2 className="h-4 w-4" />
              Dados da Empresa
            </TabsTrigger>
            <TabsTrigger value="admin-fees" className="gap-2 py-3">
              <Percent className="h-4 w-4" />
              Taxas Admin
            </TabsTrigger>
            <TabsTrigger value="fines" className="gap-2 py-3">
              <AlertCircle className="h-4 w-4" />
              Multas e Juros
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 py-3">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2 py-3">
              <Shield className="h-4 w-4" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 py-3">
              <MapPin className="h-4 w-4" />
              Locais
            </TabsTrigger>
          </TabsList>

          {/* DADOS DA EMPRESA */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações cadastrais exibidas em relatórios e contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Razão Social</Label>
                      <Input 
                        id="companyName" 
                        value={config.company_name}
                        onChange={(e) => setConfig({...config, company_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input 
                        id="cnpj" 
                        value={config.cnpj}
                        onChange={(e) => setConfig({...config, cnpj: applyCnpjMask(e.target.value)})}
                        maxLength={18}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={config.email}
                        onChange={(e) => setConfig({...config, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        value={config.phone}
                        onChange={(e) => setConfig({...config, phone: applyPhoneMask(e.target.value)})}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input 
                      id="address" 
                      value={config.address}
                      onChange={(e) => setConfig({...config, address: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input 
                        id="city" 
                        value={config.city}
                        onChange={(e) => setConfig({...config, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input 
                        id="state" 
                        value={config.state}
                        onChange={(e) => setConfig({...config, state: e.target.value})}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input 
                        id="zipCode" 
                        value={config.zip_code}
                        onChange={(e) => setConfig({...config, zip_code: applyCepMask(e.target.value)})}
                        maxLength={9}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAXAS ADMINISTRATIVAS & GERENCIAMENTO */}
          <TabsContent value="admin-fees">
            <Card>
              <CardHeader>
                <CardTitle>Taxas e Comissões</CardTitle>
                <CardDescription>
                  Configure as taxas cobradas sobre os aluguéis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminFee" className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-emerald-600" />
                        Taxa de Administração (%)
                      </Label>
                      <div className="relative">
                        <Input 
                          id="adminFee" 
                          type="text"
                          value={adminFee}
                          onChange={(e) => setAdminFee(e.target.value)}
                          className="pr-8"
                          placeholder="0,000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Incide sobre o valor bruto do aluguel.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="managementFee" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        Taxa de Gerenciamento (%)
                      </Label>
                      <div className="relative">
                        <Input 
                          id="managementFee" 
                          type="text"
                          value={managementFee}
                          onChange={(e) => setManagementFee(e.target.value)}
                          className="pr-8"
                          placeholder="0,000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Taxa adicional para gestão de imóveis (opcional).
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Taxas
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MULTAS E JUROS */}
          <TabsContent value="fines">
            <Card>
              <CardHeader>
                <CardTitle>Multas e Juros</CardTitle>
                <CardDescription>
                  Configuração de encargos para pagamentos em atraso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="lateFee">Multa por Atraso (%)</Label>
                      <div className="relative">
                        <Input 
                          id="lateFee" 
                          type="text"
                          value={lateFee}
                          onChange={(e) => setLateFee(e.target.value)}
                          className="pr-8"
                          placeholder="0,000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cobrado uma única vez sobre o valor do boleto vencido.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Juros Diários (%)</Label>
                      <div className="relative">
                        <Input 
                          id="interestRate" 
                          type="text"
                          value={interestRate}
                          onChange={(e) => setInterestRate(applyPercentageMask(e.target.value))}
                          className="pr-8"
                          placeholder="0,000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cobrado por dia de atraso (Pro Rata Die).
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md border border-amber-200 dark:border-amber-800 mt-4">
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Exemplo de Cálculo</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          Para um boleto de R$ 1.000,00 com 10 dias de atraso:
                        </p>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc ml-5 mt-1">
                          <li>Multa ({lateFee}%): R$ {(1000 * (parsePercentageToFloat(lateFee)/100)).toFixed(2)}</li>
                          <li>Juros ({interestRate}% ao dia × 10): R$ {(1000 * (parsePercentageToFloat(interestRate)/100) * 10).toFixed(2)}</li>
                          <li><strong>Total a Pagar: R$ {(1000 * (1 + (parsePercentageToFloat(lateFee)/100) + ((parsePercentageToFloat(interestRate)/100) * 10))).toFixed(2)}</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Encargos
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USUÁRIOS */}
          <TabsContent value="users">
            <UsersTab
              users={users}
              isLoading={usersLoading}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
              onResetPassword={handleResetPassword}
            />
          </TabsContent>

          {/* PERMISSÕES */}
          <TabsContent value="permissions">
            <PermissionsTab
              users={users}
              locations={locations}
              roleMenuPermissions={permissions}
              isLoading={permissionsLoading}
              onUpdateRoleMenuPermission={updateRoleMenuPermission}
              onSaveLocationPermissions={saveLocationPermissions}
              onSaveFeeExemptions={saveFeeExemptions}
              getUserLocationPermissions={getUserLocationPermissions}
              getUserFeeExemptions={getUserFeeExemptions}
            />
          </TabsContent>

          {/* LOCAIS */}
          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Gerenciar Locais
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastre os locais/condomínios e gerencie suas contas mensais
                  </p>
                </div>
                <Button onClick={() => openLocationDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Local
                </Button>
              </CardHeader>
              <CardContent>
                {/* Busca */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nome, cidade ou bairro..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Lista de Locais */}
                {isLoadingLocations ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando locais...
                  </div>
                ) : filteredLocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchLocation
                      ? "Nenhum local encontrado com esse filtro"
                      : "Nenhum local cadastrado ainda"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLocations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {location.name}
                          </h4>
                          {(location.street || location.number) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location.street}
                              {location.number && `, ${location.number}`}
                              {location.complement && ` - ${location.complement}`}
                            </p>
                          )}
                          {location.neighborhood && (
                            <p className="text-sm text-muted-foreground">
                              {location.neighborhood}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {location.city}, {location.state}
                            {location.zip_code && ` • ${location.zip_code}`}
                          </p>
                          
                          {/* Botão para gerenciar contas do local */}
                          <div className="mt-2">
                             <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                               onClick={() => setSelectedLocationForExpenses(location)}>
                               <Wallet className="h-3 w-3" />
                               Gerenciar Contas (Água, Luz)
                             </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openLocationDialog(location)}>
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer com total */}
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
                  Total: {filteredLocations.length} local(is) cadastrado(s)
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOG DE LOCAL */}
        <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Editar Local" : "Novo Local"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">Nome do Local <span className="text-red-500">*</span></Label>
                <Input
                  id="locationName"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="Ex: Casa 1, Apartamento A, Loja Centro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationZipCode">CEP <span className="text-red-500">*</span></Label>
                <Input
                  id="locationZipCode"
                  value={locationForm.zip_code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                    const formatted = value.replace(/(\d{5})(\d)/, "$1-$2");
                    setLocationForm({ ...locationForm, zip_code: formatted });
                    if (value.length === 8) {
                      handleCepLookup(value);
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="locationStreet">Endereço <span className="text-red-500">*</span></Label>
                  <Input
                    id="locationStreet"
                    value={locationForm.street}
                    onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationNumber">Número <span className="text-red-500">*</span></Label>
                  <Input
                    id="locationNumber"
                    value={locationForm.number}
                    onChange={(e) => setLocationForm({ ...locationForm, number: e.target.value })}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationComplement">Complemento</Label>
                <Input
                  id="locationComplement"
                  value={locationForm.complement}
                  onChange={(e) => setLocationForm({ ...locationForm, complement: e.target.value })}
                  placeholder="Bloco, Andar, Sala, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locationNeighborhood">Bairro <span className="text-red-500">*</span></Label>
                  <Input
                    id="locationNeighborhood"
                    value={locationForm.neighborhood}
                    onChange={(e) => setLocationForm({ ...locationForm, neighborhood: e.target.value })}
                    placeholder="Centro, Jardins, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationCity">Cidade <span className="text-red-500">*</span></Label>
                  <Input
                    id="locationCity"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    placeholder="São Paulo"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationState">Estado <span className="text-red-500">*</span></Label>
                <Select
                  value={locationForm.state}
                  onValueChange={(value) => setLocationForm({ ...locationForm, state: value })}
                >
                  <SelectTrigger id="locationState">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">Acre</SelectItem>
                    <SelectItem value="AL">Alagoas</SelectItem>
                    <SelectItem value="AP">Amapá</SelectItem>
                    <SelectItem value="AM">Amazonas</SelectItem>
                    <SelectItem value="BA">Bahia</SelectItem>
                    <SelectItem value="CE">Ceará</SelectItem>
                    <SelectItem value="DF">Distrito Federal</SelectItem>
                    <SelectItem value="ES">Espírito Santo</SelectItem>
                    <SelectItem value="GO">Goiás</SelectItem>
                    <SelectItem value="MA">Maranhão</SelectItem>
                    <SelectItem value="MT">Mato Grosso</SelectItem>
                    <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                    <SelectItem value="MG">Minas Gerais</SelectItem>
                    <SelectItem value="PA">Pará</SelectItem>
                    <SelectItem value="PB">Paraíba</SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="PE">Pernambuco</SelectItem>
                    <SelectItem value="PI">Piauí</SelectItem>
                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                    <SelectItem value="RO">Rondônia</SelectItem>
                    <SelectItem value="RR">Roraima</SelectItem>
                    <SelectItem value="SC">Santa Catarina</SelectItem>
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="SE">Sergipe</SelectItem>
                    <SelectItem value="TO">Tocantins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsLocationDialogOpen(false);
                    setEditingLocation(null);
                    setLocationForm({
                      name: "",
                      street: "",
                      number: "",
                      complement: "",
                      neighborhood: "",
                      city: "",
                      state: "",
                      zip_code: "",
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingLocation ? "Atualizar" : "Cadastrar"} Local
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {selectedLocationForExpenses && (
          <LocationExpensesDialog
            open={!!selectedLocationForExpenses}
            onOpenChange={(open) => !open && setSelectedLocationForExpenses(null)}
            location={selectedLocationForExpenses}
          />
        )}
      </div>
    </Layout>
  );
}