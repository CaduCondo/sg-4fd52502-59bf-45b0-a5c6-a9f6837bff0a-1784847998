import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { systemUserService } from "@/services/systemUserService";
import { SystemUser } from "@/types";
import { Plus, Edit, UserX, UserCheck, Mail, Shield, User } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { SEO } from "@/components/SEO";
import { applyPhoneMask } from "@/lib/masks";

type UserFormData = {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  role: "admin" | "user";
  isActive: boolean;
};

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    role: "user",
    isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log("🔄 Carregando usuários do banco...");
      setIsLoading(true);
      const data = await systemUserService.getAll();
      console.log(`✅ ${data.length} usuários carregados com sucesso`);
      setUsers(data);
    } catch (error) {
      console.error("❌ Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários do sistema",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user?: SystemUser) => {
    if (user) {
      console.log("✏️ Abrindo edição do usuário:", user.id);
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        username: user.username,
        password: "", // Não carrega senha por segurança
        role: user.role as "admin" | "user",
        isActive: user.active
      });
    } else {
      console.log("➕ Abrindo criação de novo usuário");
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        username: "",
        password: "",
        role: "user",
        isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      role: "user",
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name || !formData.email || !formData.username) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!editingUser && !formData.password) {
      toast({
        title: "Erro",
        description: "A senha é obrigatória para novos usuários",
        variant: "destructive"
      });
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingUser) {
        // Edição
        console.log("💾 Salvando alterações do usuário:", editingUser.id);
        const updateData: Partial<SystemUser> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          role: formData.role,
          active: formData.isActive
        };

        // Só atualiza senha se foi preenchida
        if (formData.password) {
          updateData.password = formData.password;
        }

        await systemUserService.update(editingUser.id, updateData);
        console.log("✅ Usuário atualizado com sucesso");
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso"
        });
      } else {
        // Criação
        console.log("➕ Criando novo usuário...");
        const newUser: Omit<SystemUser, "id" | "created_at" | "updated_at"> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          active: formData.isActive
        };

        await systemUserService.create(newUser);
        console.log("✅ Usuário criado com sucesso");
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso"
        });
      }

      handleCloseDialog();
      await loadUsers();
    } catch (error: any) {
      console.error("❌ Erro ao salvar usuário:", error);
      
      // Tratamento de erros específicos
      if (error.message?.includes("duplicate") || error.message?.includes("já existe")) {
        toast({
          title: "Erro",
          description: "Já existe um usuário com este email ou username",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao salvar usuário. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleActive = async (user: SystemUser) => {
    try {
      const newStatus = !user.active;
      console.log(`🔄 ${newStatus ? "Ativando" : "Desativando"} usuário:`, user.id);
      
      await systemUserService.update(user.id, { active: newStatus });
      
      console.log(`✅ Usuário ${newStatus ? "ativado" : "desativado"} com sucesso`);
      toast({
        title: "Sucesso",
        description: `Usuário ${newStatus ? "ativado" : "desativado"} com sucesso`
      });

      await loadUsers();
    } catch (error) {
      console.error("❌ Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando usuários...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Gerenciar Usuários - Sistema de Locações"
        description="Gerencie os usuários do sistema, crie novos usuários e defina perfis de acesso"
      />
      
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
            <p className="text-muted-foreground mt-2">
              Crie e gerencie os usuários do sistema
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        <FloatingCard delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "usuário cadastrado" : "usuários cadastrados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaggerContainer staggerDelay={0.05}>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <User className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <p className="mt-4 text-muted-foreground">Nenhum usuário cadastrado</p>
                      <Button 
                        onClick={() => handleOpenDialog()} 
                        variant="outline" 
                        className="mt-4"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Usuário
                      </Button>
                    </div>
                  ) : (
                    users.map((user) => (
                      <StaggerItem key={user.id}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${user.active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                              {user.role === "admin" ? (
                                <Shield className="h-5 w-5" />
                              ) : (
                                <User className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{user.name}</h3>
                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                  {user.role === "admin" ? "Administrador" : "Usuário"}
                                </Badge>
                                <Badge variant={user.active ? "default" : "destructive"}>
                                  {user.active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {user.email}
                                </span>
                                <span>@{user.username}</span>
                                {user.phone && <span>📞 {user.phone}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                            >
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </Button>
                            <Button
                              variant={user.active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => handleToggleActive(user)}
                            >
                              {user.active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" /> Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" /> Ativar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </StaggerItem>
                    ))
                  )}
                </div>
              </StaggerContainer>
            </CardContent>
          </Card>
        </FloatingCard>
      </div>

      {/* Dialog de Criação/Edição de Usuário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Atualize os dados do usuário do sistema" 
                : "Crie um novo usuário para acessar o sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (login) *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  placeholder="joao.silva"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Será usado para fazer login no sistema
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha {editingUser ? "(deixe em branco para não alterar)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Usuário</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Administrador</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.role === "admin" 
                    ? "Acesso total ao sistema, incluindo configurações" 
                    : "Acesso às funcionalidades principais do sistema"}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Usuário ativo (pode fazer login)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}