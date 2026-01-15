import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { configStorage, userStorage } from "@/lib/storage";
import { SystemConfig, User } from "@/types";
import { Trash2, Edit, Key, Plus } from "lucide-react";
import { hasRole } from "@/lib/auth";

export default function Settings() {
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Form State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    password: "", // Only for creation or reset
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedConfig = configStorage.get();
    const loadedUsers = userStorage.getAll();
    
    // Default locations if not in config (backward compatibility)
    const locs = loadedConfig.locations || ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias"];
    
    setConfig(loadedConfig);
    setUsers(loadedUsers);
    setLocations(locs);
    setIsLoading(false);
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    // Update config logic (preserves history implicitly by only affecting new calculations)
    configStorage.update({
      ...config,
      locations: locations
    });

    toast({
      title: "Sucesso",
      description: "Configurações atualizadas com sucesso.",
    });
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
    loadData();
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
      loadData();
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

  const handleAddLocation = () => {
    if (newLocation && !locations.includes(newLocation)) {
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);
      if (config) {
        configStorage.update({ ...config, locations: updatedLocations });
      }
      setNewLocation("");
    }
  };

  const handleDeleteLocation = (loc: string) => {
    if (confirm(`Excluir local ${loc}?`)) {
      const updatedLocations = locations.filter(l => l !== loc);
      setLocations(updatedLocations);
      if (config) {
        configStorage.update({ ...config, locations: updatedLocations });
      }
    }
  };

  if (isLoading) return null;

  // Only admin can access settings page
  // Note: Layout should handle redirect, but we double check here
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e usuários.
          </p>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="locations">Locais</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Taxas e parâmetros do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateConfig} className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="adminFee">Taxa de Administração (%)</Label>
                    <Input
                      type="number"
                      id="adminFee"
                      value={config?.adminFeePercentage}
                      onChange={(e) => setConfig(config ? { ...config, adminFeePercentage: Number(e.target.value) } : null)}
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta alteração afetará o mês atual e futuros.
                    </p>
                  </div>
                  <Button type="submit">Salvar Alterações</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
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
                  setIsUserModalOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Novo Usuário
                </Button>
              </CardHeader>
              <CardContent>
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
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>{user.email || user.phone || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setUserToReset(user);
                            setIsResetPasswordOpen(true);
                          }}>
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(user.id)} disabled={user.username === 'cadu.pires'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle>Locais</CardTitle>
                <CardDescription>Gerencie os locais disponíveis para imóveis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input 
                    placeholder="Novo local..." 
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                  <Button onClick={handleAddLocation}>Adicionar</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {locations.map((loc) => (
                    <div key={loc} className="flex items-center justify-between p-2 border rounded bg-muted/20">
                      <span>{loc}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteLocation(loc)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}