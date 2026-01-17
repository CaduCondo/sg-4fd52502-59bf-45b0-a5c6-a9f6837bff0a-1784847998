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
  FileText,
  AlertCircle,
  Coins,
  User,
  Shield,
  Mail,
  Phone,
  Calendar,
  Edit,
  Key,
  Unlock
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configService } from "@/services/configService";
import { systemUserService } from "@/services/systemUserService";
import type { CompanyConfig, Location, SystemUser } from "@/types";
import { applyCepMask, applyPhoneMask, applyCnpjMask } from "@/lib/masks";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("company");
  
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
    locations: [],
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
    role: "user",
    isActive: true
  });

  // Locations State
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [locationFormData, setLocationFormData] = useState({
    name: "",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    state: ""
  });
  const [newLocation, setNewLocation] = useState({ name: "", address: "" });
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  useEffect(() => {
    loadData();
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
        role: "user",
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

  // --- LOCATIONS HANDLERS ---

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar o endereço para este CEP.",
          variant: "destructive",
        });
        return;
      }

      setLocationFormData(prev => ({
        ...prev,
        address: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || ""
      }));

      toast({
        title: "Endereço encontrado!",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (error) {
      console.error("Error fetching address:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    }
  };

  const handleCepChange = (value: string) => {
    const masked = applyCepMask(value);
    setLocationFormData(prev => ({ ...prev, cep: masked }));
    
    if (masked.replace(/\D/g, "").length === 8) {
      fetchAddressByCep(masked);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationFormData.name) return;

    try {
      const locationData: Location = {
        id: crypto.randomUUID(),
        name: locationFormData.name,
        cep: locationFormData.cep,
        address: locationFormData.address,
        number: locationFormData.number,
        neighborhood: locationFormData.neighborhood,
        city: locationFormData.city,
        state: locationFormData.state
      };

      await configService.createLocation(locationData);
      
      setConfig(prev => ({
        ...prev,
        locations: [...prev.locations, locationData]
      }));
      
      toast({
        title: "Sucesso",
        description: "Local adicionado com sucesso!",
      });
      setIsLocationDialogOpen(false);
      setLocationFormData({ 
        name: "", 
        cep: "",
        address: "",
        number: "",
        neighborhood: "",
        city: "",
        state: ""
      });
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar local.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;
    try {
      await configService.deleteLocation(locationId);
      setConfig(prev => ({
        ...prev,
        locations: prev.locations.filter(l => l.id !== locationId)
      }));
      toast({ title: "Sucesso", description: "Local excluído!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir local.", variant: "destructive" });
    }
  };

  const handleAdminFeeChange = (value: string) => {
    const numValue = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const parsed = parseFloat(numValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setConfig({...config, adminFeePercentage: parsed});
    } else if (value === "") {
      setConfig({...config, adminFeePercentage: 0});
    }
  };

  const handleLateFeeChange = (value: string) => {
    const numValue = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const parsed = parseFloat(numValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setConfig({...config, lateFeePercentage: parsed});
    } else if (value === "") {
      setConfig({...config, lateFeePercentage: 0});
    }
  };

  const handleInterestRateChange = (value: string) => {
    const numValue = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const parsed = parseFloat(numValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setConfig({...config, interestRatePercentage: parsed});
    } else if (value === "") {
      setConfig({...config, interestRatePercentage: 0});
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os dados da empresa, usuários e parâmetros do sistema
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="company" className="gap-2 py-3">
              <Building2 className="h-4 w-4" />
              Dados Gerais
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
                        onChange={(e) => handleAdminFeeChange(e.target.value)}
                        className="pr-8"
                        placeholder="0.00"
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
                          value={config.lateFeePercentage}
                          onChange={(e) => handleLateFeeChange(e.target.value)}
                          className="pr-8"
                          placeholder="0.00"
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
                          value={config.interestRatePercentage}
                          onChange={(e) => handleInterestRateChange(e.target.value)}
                          className="pr-8"
                          placeholder="0.000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cobrado por dia de atraso (Pro Rata Die).
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mt-4">
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Exemplo de Cálculo</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Para um boleto de R$ 1.000,00 com 10 dias de atraso:
                        </p>
                        <ul className="text-sm text-amber-700 list-disc ml-5 mt-1">
                          <li>Multa ({config.lateFeePercentage}%): R$ {(1000 * (config.lateFeePercentage/100)).toFixed(2)}</li>
                          <li>Juros ({config.interestRatePercentage}% ao dia × 10): R$ {(1000 * (config.interestRatePercentage/100) * 10).toFixed(2)}</li>
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
                          <Badge variant={user.active ? "success" : "destructive"} className={user.active ? "bg-green-100 text-green-800" : ""}>
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

          {/* Locais Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Locais
              </CardTitle>
              <Button onClick={() => setIsLocationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Local
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {config?.locations.map((location) => (
                  <div key={location.id} className="relative group">
                    <Link href={`/locations/${location.id}`}>
                      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                        <CardContent className="pt-6 pb-12">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">{location.name}</h3>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>{location.address}, {location.number}</p>
                            <p>{location.neighborhood} - {location.city}/{location.state}</p>
                            <p>CEP: {location.cep}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteLocation(location.id);
                      }}
                      className="absolute bottom-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                <div className="space-y-2">
                  <Label htmlFor="userRole">Perfil de Acesso</Label>
                  <Select 
                    value={userFormData.role} 
                    onValueChange={(value) => setUserFormData({...userFormData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="broker">Corretor</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Local</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="locName">Nome do Local / Condomínio</Label>
                  <Input 
                    id="locName" 
                    value={locationFormData.name} 
                    onChange={(e) => setLocationFormData({...locationFormData, name: e.target.value})}
                    placeholder="Ex: Edifício Central"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locCep">CEP</Label>
                  <Input 
                    id="locCep" 
                    value={locationFormData.cep} 
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locNumber">Número</Label>
                  <Input 
                    id="locNumber" 
                    value={locationFormData.number} 
                    onChange={(e) => setLocationFormData({...locationFormData, number: e.target.value})}
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="locAddress">Endereço</Label>
                  <Input 
                    id="locAddress" 
                    value={locationFormData.address} 
                    onChange={(e) => setLocationFormData({...locationFormData, address: e.target.value})}
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locNeighborhood">Bairro</Label>
                  <Input 
                    id="locNeighborhood" 
                    value={locationFormData.neighborhood} 
                    onChange={(e) => setLocationFormData({...locationFormData, neighborhood: e.target.value})}
                    placeholder="Centro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locCity">Cidade</Label>
                  <Input 
                    id="locCity" 
                    value={locationFormData.city} 
                    onChange={(e) => setLocationFormData({...locationFormData, city: e.target.value})}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locState">Estado</Label>
                  <Input 
                    id="locState" 
                    value={locationFormData.state} 
                    onChange={(e) => setLocationFormData({...locationFormData, state: e.target.value.toUpperCase()})}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLocationDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Adicionar Local</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}