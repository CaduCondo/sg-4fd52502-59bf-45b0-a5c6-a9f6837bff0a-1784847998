import { useState, useEffect } from "react";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  UserPlus, 
  Trash2, 
  Edit, 
  Save, 
  Shield, 
  MapPin, 
  Check, 
  X,
  Building,
  DollarSign,
  Users,
  Lock,
  Menu,
  Unlock,
  Building2,
  Percent,
  AlertCircle,
  Coins,
  Plus,
  Key,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Pencil
} from "lucide-react";

// Services
import { 
  getConfig, 
  updateConfig 
} from "@/services/configService";
import { 
  getSystemUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  resetPassword,
  unlockUser
} from "@/services/systemUserService";
import { 
  getAllLocations, 
  createLocation, 
  deleteLocation, 
  updateLocation 
} from "@/services/locationService";
import { 
  getUserLocationPermissions, 
  updateUserLocationPermission 
} from "@/services/userLocationPermissionService";
import { 
  getRoleMenuPermissions, 
  updateRoleMenuPermission 
} from "@/services/roleMenuPermissionService";

// Helpers
import {
  applyCnpjMask,
  applyPhoneMask,
  applyCepMask,
  parsePercentageToFloat,
  formatPercentage
} from "@/lib/masks";

// Types & Permissions
import { SystemUser, Location, CompanyConfig } from "@/types";
import { ROLES, getRoleLabel, hasPermission } from "@/lib/permissions";

// Define Menu Types internally since they are only used here for UI
type MenuRole = "admin" | "broker" | "financial";
type MenuItem = "dashboard" | "properties" | "tenants" | "rentals" | "payments" | "financial" | "settings";

// Mock do usuário logado (simulação)
// Em produção, isso viria de um contexto de autenticação real
const MOCK_CURRENT_USER = {
  id: "5fa0af84-d74e-4cc0-80c0-1ccfd87c20b9", // ID do admin no banco
  name: "Cadu Pires",
  email: "cadu.pires@imobiliaria.com",
  role: "admin"
};

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("company");
  
  // Current logged user state
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  
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
    late_fee_percentage: 0,
    interest_rate_percentage: 0,
  });

  // State for form inputs (strings to handle formatting)
  const [adminFee, setAdminFee] = useState("0,000");
  const [lateFee, setLateFee] = useState("0,000");
  const [interestRate, setInterestRate] = useState("0,000");

  // Users State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "", // Mantido para compatibilidade com form, mas não usado no backend
    password: "",
    role: "broker",
    isActive: true
  });

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState("");
  const [newLocationName, setNewLocationName] = useState(""); // Add missing state

  // User Location Permissions State
  const [selectedUserForLocations, setSelectedUserForLocations] = useState<SystemUser | null>(null);
  const [userLocationPermissions, setUserLocationPermissions] = useState<string[]>([]);
  const [isLocationPermissionsDialogOpen, setIsLocationPermissionsDialogOpen] = useState(false);

  // Menu Permissions State
  const [menuPermissions, setMenuPermissions] = useState<Record<string, string[]>>({});
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
      const data = await getConfig();
      if (data) {
        setConfig(data);
        // Inicializar estados com dados carregados
        setAdminFee(formatPercentage(data.admin_fee_percentage));
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

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getSystemUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const loadMenuPermissions = async () => {
    // Carregar permissões para cada role
    const roles = ["admin", "broker", "financial"];
    const allPermissions: Record<string, string[]> = {};
    
    for (const role of roles) {
      try {
        const perms = await getRoleMenuPermissions(role);
        allPermissions[role] = perms.map(p => p.menu_id);
      } catch (error) {
        console.error(`Erro ao carregar permissões para ${role}:`, error);
      }
    }
    
    setMenuPermissions(allPermissions);
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
      await Promise.all([
        loadConfig(),
        loadUsers()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // --- CONFIG HANDLERS ---

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        company_name: config.company_name,
        cnpj: config.cnpj,
        email: config.email,
        phone: config.phone,
        address: config.address,
        city: config.city,
        state: config.state,
        zip_code: config.zip_code,
        admin_fee_percentage: parsePercentageToFloat(adminFee),
        late_fee_percentage: parsePercentageToFloat(lateFee),
        interest_rate_percentage: parsePercentageToFloat(interestRate)
      });
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
        await updateUser(editingUser.id, {
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.role as any,
          active: userFormData.isActive
        });
        toast({ title: "Sucesso", description: "Usuário atualizado!" });
      } else {
        await createUser({
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          // username e password seriam tratados no backend em um sistema real de auth
          role: userFormData.role as any,
          active: true,
        });
        toast({ title: "Sucesso", description: "Usuário criado!" });
      }
      
      setIsUserDialogOpen(false);
      loadUsers();
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
        username: "", // Não temos username no tipo SystemUser atual
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
      await deleteUser(userId);
      toast({ title: "Sucesso", description: "Usuário excluído!" });
      loadUsers();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir usuário.", variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Tem certeza que deseja resetar a senha deste usuário?")) return;
    try {
      // Simulação - em produção chamaria endpoint de auth
      toast({ title: "Sucesso", description: "Senha resetada!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao resetar senha.", variant: "destructive" });
    }
  };

  const handleUnlockUser = async (user: SystemUser) => {
    if (!confirm(`Tem certeza que deseja ${user.active ? 'bloquear' : 'desbloquear'} este usuário?`)) return;
    try {
      await updateUser(user.id, { active: !user.active });
      toast({ title: "Sucesso", description: `Usuário ${!user.active ? 'desbloqueado' : 'bloqueado'}!` });
      loadUsers();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao alterar status do usuário.", variant: "destructive" });
    }
  };

  // --- LOCATION HANDLERS ---

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, { name: locationName });
        toast({ title: "Sucesso", description: "Local atualizado com sucesso!" });
      } else {
        await createLocation({ 
          name: newLocationName,
          city: "Cidade Padrão",
          state: "UF"
        });
        toast({ title: "Sucesso", description: "Local criado com sucesso!" });
      }
      
      setLocationName("");
      setEditingLocation(null);
      setIsLocationDialogOpen(false);
      loadLocations();
    } catch (error) {
      console.error("Erro ao salvar local:", error);
      toast({ title: "Erro", description: "Erro ao salvar local.", variant: "destructive" });
    }
  };

  const openLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationName(location.name);
    } else {
      setEditingLocation(null);
      setLocationName("");
    }
    setIsLocationDialogOpen(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;

    try {
      await deleteLocation(locationId);
      toast({ title: "Local excluído com sucesso!" });
      loadLocations();
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      toast({ title: "Erro ao excluir local", variant: "destructive" });
    }
  };

  // --- PERMISSION HANDLERS ---

  const openLocationPermissionsDialog = async (user: SystemUser) => {
    setSelectedUserForLocations(user);
    try {
      const permissions = await getUserLocationPermissions(user.id);
      setUserLocationPermissions(permissions.map(p => p.location_id));
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
      // Para cada local, verificar se precisa adicionar ou remover
      // Esta é uma implementação simplificada. O ideal seria ter um endpoint bulk update.
      // Como não temos, vamos iterar sobre as permissões atuais vs novas.
      
      // 1. Buscar permissões atuais do banco para garantir estado fresco
      const currentPerms = await getUserLocationPermissions(selectedUserForLocations.id);
      const currentLocationIds = currentPerms.map(p => p.location_id);
      
      // 2. Identificar adições
      const toAdd = userLocationPermissions.filter(id => !currentLocationIds.includes(id));
      
      // 3. Identificar remoções
      const toRemove = currentLocationIds.filter(id => !userLocationPermissions.includes(id));
      
      // 4. Executar updates
      const promises = [
        ...toAdd.map(id => updateUserLocationPermission(selectedUserForLocations.id, id, true)),
        ...toRemove.map(id => updateUserLocationPermission(selectedUserForLocations.id, id, false))
      ];
      
      await Promise.all(promises);
      
      toast({ title: "Permissões salvas com sucesso!" });
      setIsLocationPermissionsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({ title: "Erro ao salvar permissões", variant: "destructive" });
    }
  };

  const handleToggleMenuPermission = async (role: string, menuId: string) => {
    const currentPermissions = menuPermissions[role] || [];
    const hasPermission = currentPermissions.includes(menuId);
    
    try {
      await updateRoleMenuPermission(role, menuId, !hasPermission);
      
      // Atualizar estado local
      const newPermissions = hasPermission
        ? currentPermissions.filter(id => id !== menuId)
        : [...currentPermissions, menuId];
      
      setMenuPermissions({
        ...menuPermissions,
        [role]: newPermissions
      });
    } catch (error) {
      console.error("Erro ao atualizar permissão de menu:", error);
      toast({ title: "Erro", description: "Erro ao atualizar permissão.", variant: "destructive" });
    }
  };

  const getMenuPermission = (role: string, menuItem: string): boolean => {
    const rolePerms = menuPermissions[role] || [];
    return rolePerms.includes(menuItem);
  };

  const filteredLocations = locations.filter((location) => {
    const search = searchLocation.toLowerCase();
    return (
      location.name?.toLowerCase().includes(search) ||
      location.city?.toLowerCase().includes(search) ||
      location.neighborhood?.toLowerCase().includes(search)
    );
  });

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    broker: "Corretor",
    financial: "Financeiro",
  };

  const menuLabels: Record<string, string> = {
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
                        value={adminFee}
                        onChange={(e) => setAdminFee(e.target.value)}
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
                          onChange={(e) => setInterestRate(e.target.value)}
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
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnlockUser(user)}
                              className={`h-8 w-8 ${!user.active ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                              title={user.active ? "Bloquear" : "Desbloquear"}
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                            
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
                                  onClick={() => handleToggleMenuPermission(role, menuItem)}
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

        {/* DIALOG DE LOCAL */}
        <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Editar Local" : "Novo Local"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">Nome do Local</Label>
                <Input
                  id="locationName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex: Condomínio Jardins"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLocationDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
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