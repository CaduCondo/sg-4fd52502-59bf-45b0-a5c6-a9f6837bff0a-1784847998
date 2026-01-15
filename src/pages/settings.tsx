import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { configStorage, userStorage } from "@/lib/storage";
import { configService } from "@/services/configService";
import { SystemConfig, User, Config } from "@/types";
import { Trash2, Edit, Key, Plus, Save, MapPin } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function Settings() {
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState<Config>({ adminFeePercentage: 6, locations: [] });
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Form State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "corretor",
    rg: "",
    cpf: "",
    email: "",
    phone: ""
  });

  // Password Reset State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);

  // Location State
  const [newLocation, setNewLocation] = useState("");

  const sortedLocations = [...locations].sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      const configData = await configService.get();
      const users = userStorage.getAll();
      
      // Ensure "Outros" is always present
      const locs = configData.locations || ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias", "Outros"];
      if (!locs.includes("Outros")) locs.push("Outros");
      
      setConfig(configData);
      setUsers(users);
      setLocations(locs);
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

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.username || (!editingUser && !userForm.password)) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (editingUser) {
      userStorage.update({
        ...editingUser,
        name: userForm.name,
        username: userForm.username,
        role: userForm.role as any,
        rg: userForm.rg,
        cpf: userForm.cpf,
        email: userForm.email,
        phone: userForm.phone
      });
      toast({ title: "Usuário atualizado" });
    } else {
      const newUser: User = {
        id: crypto.randomUUID(),
        name: userForm.name,
        username: userForm.username,
        password: userForm.password,
        role: userForm.role as any,
        rg: userForm.rg,
        cpf: userForm.cpf,
        email: userForm.email,
        phone: userForm.phone,
        createdAt: new Date().toISOString()
      };
      userStorage.save(newUser);
      toast({ title: "Usuário criado" });
    }

    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserForm({
      name: "",
      username: "",
      password: "",
      role: "corretor",
      rg: "",
      cpf: "",
      email: "",
      phone: ""
    });
    loadSettings();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role,
      rg: user.rg || "",
      cpf: user.cpf || "",
      email: user.email || "",
      phone: user.phone || ""
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      userStorage.delete(id);
      loadSettings();
      toast({ title: "Usuário excluído" });
    }
  };

  const handleResetPassword = () => {
    if (userToReset && resetPasswordValue) {
      userStorage.resetPassword(userToReset.id, resetPasswordValue);
      setIsResetPasswordOpen(false);
      setResetPasswordValue("");
      setUserToReset(null);
      toast({ title: "Senha alterada com sucesso" });
    }
  };

  const handleAddLocation = async () => {
    if (newLocation.trim()) {
      try {
        await configService.addLocation(newLocation.trim());
        setNewLocation("");
        await loadSettings();
        toast({
          title: "Sucesso",
          description: `Local "${newLocation}" adicionado`,
        });
      } catch (error) {
        console.error("Error adding location:", error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar local",
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveLocation = async (location: string) => {
    try {
      await configService.removeLocation(location);
      await loadSettings();
      toast({
        title: "Sucesso",
        description: `Local "${location}" removido`,
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

  const handleUpdateAdminFee = async () => {
    if (!config) return;
    const newAdminFee = Number((document.getElementById("adminFee") as HTMLInputElement).value);
    if (isNaN(newAdminFee) || newAdminFee < 0 || newAdminFee > 100) return;
    
    try {
      await configService.save({ ...config, adminFeePercentage: newAdminFee });
      await loadSettings();
      toast({ title: "Taxa de administração atualizada" });
    } catch (error) {
      console.error("Error updating admin fee:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar taxa",
        variant: "destructive"
      });
    }
  };

  if (isLoading) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema, usuários e locais.
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="locations">Locais</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
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
          </TabsContent>

          <TabsContent value="users">
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>
                      Gerencie o acesso ao sistema
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingUser(null);
                    setUserForm({ name: "", username: "", password: "", role: "corretor", rg: "", cpf: "", email: "", phone: "" });
                    setIsUserModalOpen(true);
                  }} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" /> Novo Usuário
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                                  user.role === 'financeiro' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-green-100 text-green-800'}`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>{user.email || user.phone || "-"}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setUserToReset(user);
                                setIsResetPasswordOpen(true);
                              }} title="Alterar Senha">
                                <Key className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} title="Editar">
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={user.username === 'cadu.pires'} title="Excluir">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          </TabsContent>

          <TabsContent value="locations">
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Locais</CardTitle>
                  <CardDescription>Adicione ou remova locais disponíveis para cadastro de imóveis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Locais Cadastrados</h3>
                    <div className="flex gap-4 mb-8 items-end max-w-lg">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="new-location">Novo Local</Label>
                        <Input 
                          id="new-location"
                          placeholder="Nome do condomínio ou bairro..." 
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                        />
                      </div>
                      <Button onClick={handleAddLocation} disabled={!newLocation} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar
                      </Button>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-6 border">
                      <h3 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wider">Locais Cadastrados</h3>
                      <StaggerContainer staggerDelay={0.05}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sortedLocations.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Nenhum local cadastrado</p>
                          ) : (
                            sortedLocations.map((location) => (
                              <StaggerItem key={location}>
                                <div className="group flex items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-full text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                      <MapPin className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-slate-700">{location}</span>
                                  </div>
                                  {location !== "Outros" && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleRemoveLocation(location)}
                                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      title="Excluir local"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {location === "Outros" && (
                                    <span className="text-xs text-slate-400 px-2 italic">Padrão</span>
                                  )}
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

        {/* User Dialog */}
        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input value={userForm.username} onChange={(e) => setUserForm({...userForm, username: e.target.value})} />
                </div>
              </div>
              
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={userForm.role} onValueChange={(val) => setUserForm({...userForm, role: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input value={userForm.rg} onChange={(e) => setUserForm({...userForm, rg: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={userForm.cpf} onChange={(e) => setUserForm({...userForm, cpf: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input value={userForm.phone} onChange={(e) => setUserForm({...userForm, phone: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveUser}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redefinir Senha - {userToReset?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Nova Senha</Label>
              <Input type="password" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={handleResetPassword}>Salvar Nova Senha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}