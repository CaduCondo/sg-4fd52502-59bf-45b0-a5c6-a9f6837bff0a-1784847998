import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
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
  Shield,
  KeyRound,
  Unlock,
  Eye,
  Edit2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { configService } from "@/services/configService";
import { systemUserService } from "@/services/systemUserService";
import { locationService } from "@/services/locationService";
import { roleMenuPermissionService } from "@/services/roleMenuPermissionService";
import { userLocationPermissionService } from "@/services/userLocationPermissionService";
import type { CompanyConfig, SystemUser, Location } from "@/types";
import { applyCepMask, applyPhoneMask, applyCnpjMask, formatPercentage, removeMask } from "@/lib/masks";

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
    role: "broker",
    isActive: true
  });

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Menu Permissions State
  const [menuPermissions, setMenuPermissions] = useState<any[]>([]);
  const [isLoadingMenuPermissions, setIsLoadingMenuPermissions] = useState(false);

  // Confirmation Dialogs State
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [unlockUserDialogOpen, setUnlockUserDialogOpen] = useState(false);
  const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetLocationId, setTargetLocationId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
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
      console.error("Erro ao carregar permissões:", error);
    } finally {
      setIsLoadingMenuPermissions(false);
    }
  };

  // --- HANDLERS ---

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.updateConfig(config);
      toast({ title: "Sucesso", description: "Configurações salvas!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar.", variant: "destructive" });
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await systemUserService.update(editingUser.id, {
          ...editingUser,
          name: userFormData.name,
          email: userFormData.email,
          phone: removeMask(userFormData.phone),
          role: userFormData.role as any,
          active: userFormData.isActive
        });
        toast({ title: "Sucesso", description: "Usuário atualizado!" });
      } else {
        await systemUserService.create({
          name: userFormData.name,
          email: userFormData.email,
          phone: removeMask(userFormData.phone),
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
      toast({ title: "Erro", description: "Erro ao salvar usuário.", variant: "destructive" });
    }
  };

  const openUserDialog = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        phone: applyPhoneMask(user.phone || ""),
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
    setTargetUserId(userId);
    setDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!targetUserId) return;
    try {
      await systemUserService.delete(targetUserId);
      toast({ title: "Sucesso", description: "Usuário excluído!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir usuário.", variant: "destructive" });
    } finally {
      setDeleteUserDialogOpen(false);
      setTargetUserId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setTargetUserId(userId);
    setResetPasswordDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!targetUserId) return;
    try {
      await systemUserService.resetPassword(targetUserId);
      toast({ title: "Sucesso", description: "Senha resetada para padrão!" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao resetar senha.", variant: "destructive" });
    } finally {
      setResetPasswordDialogOpen(false);
      setTargetUserId(null);
    }
  };

  const handleUnlockUser = async (userId: string) => {
    setTargetUserId(userId);
    setUnlockUserDialogOpen(true);
  };

  const confirmUnlockUser = async () => {
    if (!targetUserId) return;
    try {
      await systemUserService.unlockUser(targetUserId);
      toast({ title: "Sucesso", description: "Usuário desbloqueado!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao desbloquear usuário.", variant: "destructive" });
    } finally {
      setUnlockUserDialogOpen(false);
      setTargetUserId(null);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    setTargetLocationId(locationId);
    setDeleteLocationDialogOpen(true);
  };

  const confirmDeleteLocation = async () => {
    if (!targetLocationId) return;
    try {
      await locationService.delete(targetLocationId);
      toast({ title: "Local excluído com sucesso!" });
      loadLocations();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir local.", variant: "destructive" });
    } finally {
      setDeleteLocationDialogOpen(false);
      setTargetLocationId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="company" className="gap-2 border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-4 w-4" /> Dados da Empresa
            </TabsTrigger>
            <TabsTrigger value="admin-fees" className="gap-2 border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Percent className="h-4 w-4" /> Taxas Admin
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="h-4 w-4" /> Locais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={config.cnpj} onChange={e => setConfig({...config, cnpj: applyCnpjMask(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={config.phone} onChange={e => setConfig({...config, phone: applyPhoneMask(e.target.value)})} />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleConfigSubmit}>Salvar Dados da Empresa</Button>
            </div>
          </TabsContent>

          <TabsContent value="admin-fees">
             <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Taxa Administrativa (%)</Label>
                <Input 
                  type="number" 
                  value={config.adminFeePercentage} 
                  onChange={e => setConfig({...config, adminFeePercentage: Number(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Juros Mensal (%)</Label>
                <Input 
                  type="number" 
                  value={config.interestRatePercentage} 
                  onChange={e => setConfig({...config, interestRatePercentage: Number(e.target.value)})} 
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleConfigSubmit}>Salvar Taxas</Button>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Usuários do Sistema</h3>
              <Button onClick={() => openUserDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Novo Usuário
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "destructive"}>
                          {user.active ? "Ativo" : "Bloqueado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openUserDialog(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleResetPassword(user.id)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleUnlockUser(user.id)}>
                            <Unlock className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Locais Cadastrados</h3>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map(location => (
                    <TableRow key={location.id}>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.street}, {location.number}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteLocation(location.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* User Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} required disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required />
                </div>
              )}
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: applyPhoneMask(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={userFormData.role} onValueChange={v => setUserFormData({...userFormData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialogs */}
        <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>Deseja excluir este usuário?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-white">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
              <AlertDialogDescription>A senha será redefinida para o padrão. Continuar?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmResetPassword}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={unlockUserDialogOpen} onOpenChange={setUnlockUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desbloquear Usuário</AlertDialogTitle>
              <AlertDialogDescription>Confirmar o desbloqueio deste usuário?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmUnlockUser}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteLocationDialogOpen} onOpenChange={setDeleteLocationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Local</AlertDialogTitle>
              <AlertDialogDescription>Deseja excluir este local? Isso pode afetar imóveis vinculados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLocation} className="bg-destructive text-white">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}