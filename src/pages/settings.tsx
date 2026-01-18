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
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configService } from "@/services/configService";
import { systemUserService } from "@/services/systemUserService";
import type { CompanyConfig, Location, SystemUser } from "@/types";
import { applyCepMask, applyPhoneMask, applyCnpjMask, parsePercentageToFloat, formatPercentage } from "@/lib/masks";

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

                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mt-4">
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Exemplo de Cálculo</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Para um boleto de R$ 1.000,00 com 10 dias de atraso:
                        </p>
                        <ul className="text-sm text-amber-700 list-disc ml-5 mt-1">
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
      </div>
    </Layout>
  );
}