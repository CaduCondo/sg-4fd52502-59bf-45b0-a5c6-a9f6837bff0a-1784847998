import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  MapPin, 
  Save, 
  Plus, 
  Trash2, 
  Percent, 
  AlertCircle,
  Coins,
  User,
  Shield,
  Edit,
  Key,
  Unlock,
  Pencil,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configService } from "@/services/configService";
import { systemUserService } from "@/services/systemUserService";
import { locationService } from "@/services/locationService";
import { userLocationPermissionService } from "@/services/userLocationPermissionService";
import { roleMenuPermissionService, type UserRole as MenuRole, type MenuItem } from "@/services/roleMenuPermissionService";
import type { CompanyConfig, SystemUser, Location } from "@/types";
import { applyCepMask, applyPhoneMask, applyCnpjMask, parsePercentageToFloat, formatPercentage } from "@/lib/masks";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("company");
  
  // Current logged user state
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  
  // Config State
  const [config, setConfig] = useState<CompanyConfig>({
    companyName: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    adminFeePercentage: 0,
    lateFeePercentage: 0,
    interestRatePercentage: 0,
  });

  // Users State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    role: "broker",
    isActive: true
  });

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");

  // User Location Permissions State
  const [selectedUserForLocations, setSelectedUserForLocations] = useState<SystemUser | null>(null);
  const [userLocationPermissions, setUserLocationPermissions] = useState<string[]>([]);
  const [isLocationPermissionsDialogOpen, setIsLocationPermissionsDialogOpen] = useState(false);

  // Menu Permissions State
  const [menuPermissions, setMenuPermissions] = useState<any[]>([]);
  const [isLoadingMenuPermissions, setIsLoadingMenuPermissions] = useState(false);

  const loadCurrentUser = async () => {
    try {
      const sessionData = localStorage.getItem("session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user) {
          setCurrentUser(session.user);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar usuário logado:", error);
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await configService.getConfig();
      if (data) setConfig(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as configurações.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await systemUserService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
      toast({ title: "Erro ao carregar locais", variant: "destructive" });
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const loadMenuPermissions = async () => {
    try {
      setIsLoadingMenuPermissions(true);
      const data = await roleMenuPermissionService.getAll();
      setMenuPermissions(data);
    } catch (error) {
      console.error("Erro ao carregar permissões de menu:", error);
      toast({ title: "Erro ao carregar permissões", variant: "destructive" });
    } finally {
      setIsLoadingMenuPermissions(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadConfig();
    loadUsers();
    loadLocations();
    loadMenuPermissions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, usersData] = await Promise.all([
        configService.getConfig(),
        systemUserService.getAll()
      ]);
      
      if (configData) setConfig(configData);
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- CONFIG HANDLERS ---

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.updateConfig(config);
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações.",
        variant: "destructive",
      });
    }
  };

  // --- USERS HANDLERS ---

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await systemUserService.update(editingUser.id, {
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.role as any,
          active: userFormData.isActive
        });
        toast({ title: "Sucesso", description: "Usuário atualizado!" });
      } else {
        await systemUserService.create({
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          username: userFormData.username,
          password: userFormData.password,
          role: userFormData.role as any,
          active: true,
        });
        toast({ title: "Sucesso", description: "Usuário criado!" });
      }
      
      setIsUserDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar usuário.",
        variant: "destructive",
      });
    }
  };

  const openUserDialog = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        username: user.username,
        password: "",
        role: user.role,
        isActive: user.active
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: "",
        email: "",
        phone: "",
        username: "",
        password: "",
        role: "broker",
        isActive: true
      });
    }
    setIsUserDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
      await systemUserService.delete(userId);
      toast({ title: "Sucesso", description: "Usuário excluído!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir usuário.", variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Tem certeza que deseja resetar a senha deste usuário?")) return;
    try {
      await systemUserService.resetPassword(userId);
      toast({ title: "Sucesso", description: "Senha resetada!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao resetar senha.", variant: "destructive" });
    }
  };

  const handleUnlockUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja desbloquear este usuário?")) return;
    try {
      await systemUserService.unlockUser(userId);
      toast({ title: "Sucesso", description: "Usuário desbloqueado!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao desbloquear usuário.", variant: "destructive" });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;

    try {
      await locationService.delete(locationId);
      toast({ title: "Local excluído com sucesso!" });
      loadLocations();
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      toast({ title: "Erro ao excluir local", variant: "destructive" });
    }
  };

  const openLocationPermissionsDialog = async (user: SystemUser) => {
    setSelectedUserForLocations(user);
    try {
      const permissions = await userLocationPermissionService.getByUserId(user.id);
      setUserLocationPermissions(permissions);
      setIsLocationPermissionsDialogOpen(true);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({ title: "Erro ao carregar permissões", variant: "destructive" });
    }
  };

  const handleToggleLocationPermission = (locationId: string) => {
    setUserLocationPermissions((prev) => {
      if (prev.includes(locationId)) {
        return prev.filter((id) => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handleSaveLocationPermissions = async () => {
    if (!selectedUserForLocations) return;

    try {
      await userLocationPermissionService.setPermissions(
        selectedUserForLocations.id,
        userLocationPermissions
      );
      toast({ title: "Permissões salvas com sucesso!" });
      setIsLocationPermissionsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({ title: "Erro ao salvar permissões", variant: "destructive" });
    }
  };

  const handleToggleMenuPermission = async (role: MenuRole, menuItem: MenuItem, currentValue: boolean) => {
    try {
      await roleMenuPermissionService.update(role, menuItem, !currentValue);
      await loadMenuPermissions();
      toast({ 
        title: "Permissão atualizada",
        description: `${roleLabels[role]} → ${menuLabels[menuItem]}`
      });
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      toast({ title: "Erro ao atualizar permissão", variant: "destructive" });
    }
  };

  const getMenuPermission = (role: MenuRole, menuItem: MenuItem): boolean => {
    const perm = menuPermissions.find(p => p.role === role && p.menu_item === menuItem);
    return perm?.can_access || false;
  };

  const filteredLocations = locations.filter((location) => {
    const search = searchLocation.toLowerCase();
    return (
      location.name?.toLowerCase().includes(search) ||
      location.city?.toLowerCase().includes(search) ||
      location.neighborhood?.toLowerCase().includes(search)
    );
  });

  const roleLabels: Record<MenuRole, string> = {
    admin: "Administrador",
    broker: "Corretor",
    financial: "Financeiro",
  };

  const menuLabels: Record<MenuItem, string> = {
    dashboard: "Dashboard",
    properties: "Imóveis",
    tenants: "Inquilinos",
    rentals: "Locações",
    payments: "Recebimentos",
    financial: "Financeiro",
    settings: "Configurações",
  };

  const menuItems: MenuItem[] = ["dashboard", "properties", "tenants", "rentals", "payments", "financial", "settings"];
  const roles: MenuRole[] = ["admin", "broker", "financial"];

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
                        value={config.companyName}
                        onChange={(e) => setConfig({...config, companyName: e.target.value})}
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
                        value={config.zipCode}
                        onChange={(e) => setConfig({...config, zipCode: applyCepMask(e.target.value)})}
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

          {/* TAXAS ADMINISTRATIVAS */}
          <TabsContent value="admin-fees">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Administração</CardTitle>
                <CardDescription>
                  Percentual padrão cobrado sobre os aluguéis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSubmit} className="space-y-4">
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="adminFee">Taxa Administrativa (%)</Label>
                    <div className="relative">
                      <Input 
                        id="adminFee" 
                        type="text"
                        value={config.adminFeePercentage}
                        onChange={(e) => setConfig({...config, adminFeePercentage: parsePercentageToFloat(e.target.value)})}
                        className="pr-8"
                        placeholder="0,000"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Esta taxa será sugerida ao criar novos contratos de locação.
                    </p>
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
                          value={formatPercentage(config.lateFeePercentage)}
                          onChange={(e) => setConfig({...config, lateFeePercentage: parsePercentageToFloat(e.target.value)})}
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
                          value={formatPercentage(config.interestRatePercentage)}
                          onChange={(e) => setConfig({...config, interestRatePercentage: parsePercentageToFloat(e.target.value)})}
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
                          <li>Multa ({formatPercentage(config.lateFeePercentage)}%): R$ {(1000 * (config.lateFeePercentage/100)).toFixed(2)}</li>
                          <li>Juros ({formatPercentage(config.interestRatePercentage)}% ao dia × 10): R$ {(1000 * (config.interestRatePercentage/100) * 10).toFixed(2)}</li>
                          <li><strong>Total a Pagar: R$ {(1000 * (1 + (config.lateFeePercentage/100) + ((config.interestRatePercentage/100) * 10))).toFixed(2)}</strong></li>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Usuários do Sistema</h2>
              <Button onClick={() => openUserDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === "admin" ? "default" : 
                            user.role === "financial" ? "secondary" : 
                            user.role === "broker" ? "outline" : "secondary"
                          }>
                            {user.role === "admin" ? "Admin" : 
                             user.role === "financial" ? "Financeiro" : 
                             user.role === "broker" ? "Corretor" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? "success" : "destructive"} className={user.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
                            {user.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUserDialog(user)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            
                            {!user.active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUnlockUser(user.id)}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Desbloquear Usuário"
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetPassword(user.id)}
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Zerar Senha"
                            >
                              <Key className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERMISSÕES */}
          <TabsContent value="permissions" className="space-y-6">
            {/* Seção 1: Permissões de Menu por Perfil */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissões de Menu por Perfil
                </CardTitle>
                <CardDescription>
                  Controle quais menus cada perfil de usuário pode acessar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Menu</TableHead>
                        {roles.map((role) => (
                          <TableHead key={role} className="text-center">
                            {roleLabels[role]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuItems.map((menuItem) => (
                        <TableRow key={menuItem}>
                          <TableCell className="font-medium">
                            {menuLabels[menuItem]}
                          </TableCell>
                          {roles.map((role) => {
                            const hasAccess = getMenuPermission(role, menuItem);
                            return (
                              <TableCell key={role} className="text-center">
                                <button
                                  onClick={() => handleToggleMenuPermission(role, menuItem, hasAccess)}
                                  className="inline-flex items-center justify-center"
                                >
                                  {hasAccess ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                  )}
                                </button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  💡 <strong>Dica:</strong> Clique nos ícones para habilitar/desabilitar o acesso de cada perfil aos menus do sistema.
                </p>
              </CardContent>
            </Card>

            {/* Seção 2: Permissões de Local por Usuário Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Permissões de Local (Usuários Financeiros)
                </CardTitle>
                <CardDescription>
                  Defina quais locais cada usuário financeiro pode visualizar na página Financeiro
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.filter(u => u.role === "financial").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário com perfil Financeiro cadastrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users
                      .filter((u) => u.role === "financial")
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              {user.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openLocationPermissionsDialog(user)}
                          >
                            <MapPin className="h-3 w-3" />
                            Gerenciar Locais
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                    Cadastre os locais/condomínios onde seus imóveis estão localizados
                  </p>
                </div>
                <Link href="/locations/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Local
                  </Button>
                </Link>
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
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Link href={`/locations/${location.id}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>
                          </Link>
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

        {/* DIALOG DE USUÁRIO */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Nome Completo</Label>
                  <Input 
                    id="userName" 
                    value={userFormData.name} 
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email</Label>
                  <Input 
                    id="userEmail" 
                    type="email" 
                    value={userFormData.email} 
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPhone">Telefone</Label>
                  <Input 
                    id="userPhone" 
                    value={userFormData.phone} 
                    onChange={(e) => setUserFormData({...userFormData, phone: applyPhoneMask(e.target.value)})}
                  />
                </div>
                {/* Campo de Perfil (Role) - Apenas admin pode alterar */}
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(value) => setUserFormData({ ...userFormData, role: value as SystemUser["role"] })}
                    disabled={currentUser?.role !== "admin"}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="broker">Corretor</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentUser?.role !== "admin" && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Apenas administradores podem alterar o perfil
                    </p>
                  )}
                </div>
                {!editingUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="userUsername">Usuário (Login)</Label>
                      <Input 
                        id="userUsername" 
                        value={userFormData.username} 
                        onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userPassword">Senha</Label>
                      <Input 
                        id="userPassword" 
                        type="password"
                        value={userFormData.password} 
                        onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Salvar Usuário</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE PERMISSÕES DE LOCAIS */}
        <Dialog open={isLocationPermissionsDialogOpen} onOpenChange={setIsLocationPermissionsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gerenciar Locais - {selectedUserForLocations?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione os locais que este usuário pode visualizar na página Financeiro
              </p>
              
              {isLoadingLocations ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando locais...
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum local cadastrado
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center gap-3 p-3 border rounded hover:bg-accent/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        id={`location-${location.id}`}
                        checked={userLocationPermissions.includes(location.id)}
                        onChange={() => handleToggleLocationPermission(location.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`location-${location.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.city}, {location.state}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationPermissionsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveLocationPermissions}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Permissões
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}