import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Percent, Plus, Trash2, Users } from "lucide-react";
import { configService } from "@/services/configService";
import { applyCnpjMask, applyPhoneMask, applyCepMask, removeMask, applyRealMask } from "@/lib/masks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { CompanyConfig, Location, SystemUser } from "@/types";
import { systemUserService } from "@/services/systemUserService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  
  // Estados para gerenciamento de usuários
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    role: "user" | "broker" | "financial" | "admin";
    isActive: boolean;
  }>({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    role: "user",
    isActive: true
  });

  // Estados para locais
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationFormData, setLocationFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: ""
  });

  // Carregar configuração da empresa
  useEffect(() => {
    loadConfig();
    loadLocations();
    loadUsers();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await configService.getConfig();
      setConfig(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await configService.getLocations();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log("🔄 Carregando usuários do sistema...");
      const data = await systemUserService.getAll();
      console.log(`✅ ${data.length} usuários carregados`);
      setUsers(data);
    } catch (error) {
      console.error("❌ Erro ao carregar usuários:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      });
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsLoading(true);
    try {
      await configService.updateConfig(config);
      toast({
        title: "Configurações salvas!",
        description: "As configurações foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationFormData({
        name: location.name,
        address: location.address || "",
        city: location.city || "",
        state: location.state || "",
        zipCode: location.zipCode || ""
      });
    } else {
      setEditingLocation(null);
      setLocationFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        zipCode: ""
      });
    }
    setIsLocationDialogOpen(true);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingLocation) {
        await configService.updateLocation(editingLocation.id, locationFormData);
        toast({
          title: "Local atualizado!",
          description: "As informações do local foram atualizadas."
        });
      } else {
        await configService.createLocation(locationFormData);
        toast({
          title: "Local criado!",
          description: "O novo local foi adicionado ao sistema."
        });
      }
      
      setIsLocationDialogOpen(false);
      loadLocations();
    } catch (error) {
      console.error("Erro ao salvar local:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o local.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;

    try {
      await configService.deleteLocation(id);
      toast({
        title: "Local excluído!",
        description: "O local foi removido do sistema."
      });
      loadLocations();
    } catch (error) {
      console.error("Erro ao excluir local:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o local.",
        variant: "destructive"
      });
    }
  };

  // Funções de gerenciamento de usuários
  const handleOpenDialog = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        username: user.username,
        password: "", // Não preencher a senha por segurança
        role: user.role as "user" | "broker" | "financial" | "admin",
        isActive: user.active
      });
    } else {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        // Edição
        console.log("✏️ Editando usuário:", editingUser.id);
        
        const updateData: Partial<SystemUser> = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          role: formData.role,
          active: formData.isActive
        };

        // Só atualizar senha se foi preenchida
        if (formData.password) {
          updateData.password = formData.password;
        }

        await systemUserService.update(editingUser.id, updateData);
        
        toast({
          title: "Usuário atualizado!",
          description: "As informações do usuário foram atualizadas com sucesso."
        });
      } else {
        // Criação
        console.log("➕ Criando novo usuário...");
        
        const newUser = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          active: formData.isActive
        };

        await systemUserService.create(newUser);
        
        toast({
          title: "Usuário criado!",
          description: "O novo usuário foi adicionado ao sistema com sucesso."
        });
      }

      setIsDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error("❌ Erro ao salvar usuário:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o usuário. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (user: SystemUser) => {
    try {
      const newStatus = !user.active;
      
      await systemUserService.update(user.id, { active: newStatus });
      
      loadUsers();
      
      toast({
        title: `Usuário ${newStatus ? "ativado" : "desativado"}!`,
        description: `${user.name} foi ${newStatus ? "ativado" : "desativado"} com sucesso.`
      });
      
      console.log(`✅ Usuário ${newStatus ? "ativado" : "desativado"} com sucesso`);
    } catch (error) {
      console.error("❌ Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status do usuário.",
        variant: "destructive"
      });
    }
  };

  if (!config) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Configurações - Sistema de Locações"
        description="Configure os dados da empresa e gerenciamento do sistema"
      />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações do sistema, dados da empresa e usuários
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dados da Empresa
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Locais
            </TabsTrigger>
          </TabsList>

          {/* Aba de Dados da Empresa */}
          <TabsContent value="company" className="space-y-6">
            <form onSubmit={handleConfigSubmit} className="space-y-6">
              {/* Configurações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Configurações Gerais
                  </CardTitle>
                  <CardDescription>
                    Informações básicas da empresa e taxa de administração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        value={config.companyName}
                        onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                        placeholder="Sua Imobiliária LTDA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={config.cnpj}
                        onChange={(e) => setConfig({ ...config, cnpj: applyCnpjMask(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={config.email}
                        onChange={(e) => setConfig({ ...config, email: e.target.value })}
                        placeholder="contato@imobiliaria.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={config.phone}
                        onChange={(e) => setConfig({ ...config, phone: applyPhoneMask(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Input
                      id="address"
                      value={config.address}
                      onChange={(e) => setConfig({ ...config, address: e.target.value })}
                      placeholder="Rua, número, bairro, cidade - UF"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={config.city}
                        onChange={(e) => setConfig({ ...config, city: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={config.state}
                        onChange={(e) => setConfig({ ...config, state: e.target.value.toUpperCase() })}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={config.zipCode}
                        onChange={(e) => setConfig({ ...config, zipCode: applyCepMask(e.target.value) })}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="adminFee">Taxa de Administração (%)</Label>
                    <Input
                      id="adminFee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={config.adminFee}
                      onChange={(e) => setConfig({ ...config, adminFee: parseFloat(e.target.value) || 0 })}
                      placeholder="10.00"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Percentual cobrado sobre o valor do aluguel
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Configuração de Multa e Juros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    Configuração de Multa e Juros
                  </CardTitle>
                  <CardDescription>
                    Defina os valores padrão para atrasos de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lateFeePercent">Multa por Atraso (%)</Label>
                      <Input
                        id="lateFeePercent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={config.lateFeePercent}
                        onChange={(e) => setConfig({ ...config, lateFeePercent: parseFloat(e.target.value) || 0 })}
                        placeholder="2.00"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Percentual aplicado uma única vez
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="interestRate">Juros por Dia (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={config.interestRate}
                        onChange={(e) => setConfig({ ...config, interestRate: parseFloat(e.target.value) || 0 })}
                        placeholder="0.033"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Juros diários aplicados após o vencimento
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Exemplo de Cálculo</h4>
                    <p className="text-sm text-muted-foreground">
                      Para um aluguel de R$ 1.000,00 com 10 dias de atraso:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>Multa: R$ {(1000 * (config.lateFeePercent / 100)).toFixed(2)} ({config.lateFeePercent}%)</li>
                      <li>Juros: R$ {(1000 * (config.interestRate / 100) * 10).toFixed(2)} ({config.interestRate}% ao dia × 10 dias)</li>
                      <li>Total: R$ {(1000 + (1000 * (config.lateFeePercent / 100)) + (1000 * (config.interestRate / 100) * 10)).toFixed(2)}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading} size="lg">
                  {isLoading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Aba de Usuários */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Usuários</CardTitle>
                    <CardDescription>
                      Cadastre e gerencie os usuários do sistema
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum usuário cadastrado ainda.</p>
                      <p className="text-sm">Clique em "Novo Usuário" para começar.</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{user.name}</h3>
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "default"
                                  : user.role === "financial"
                                  ? "secondary"
                                  : user.role === "broker"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {user.role === "admin"
                                ? "⚡ Administrador"
                                : user.role === "financial"
                                ? "💰 Financeiro"
                                : user.role === "broker"
                                ? "🏢 Corretor"
                                : "👤 Usuário"}
                            </Badge>
                            <Badge variant={user.active ? "default" : "secondary"}>
                              {user.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>📧 {user.email}</p>
                            <p>👤 Username: {user.username}</p>
                            {user.phone && <p>📱 {user.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(user)}
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            variant={user.active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.active ? (
                              <>
                                🚫 Desativar
                              </>
                            ) : (
                              <>
                                ✅ Ativar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Locais */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Locais</CardTitle>
                    <CardDescription>
                      Cadastre condomínios, prédios e outros locais onde estão seus imóveis
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenLocationDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Local
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum local cadastrado ainda.</p>
                      <p className="text-sm">Clique em "Novo Local" para começar.</p>
                    </div>
                  ) : (
                    locations.map((location) => (
                      <div key={location.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div>
                          <h3 className="font-semibold mb-2">{location.name}</h3>
                          {location.address && (
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          )}
                          {(location.city || location.state || location.zipCode) && (
                            <p className="text-sm text-muted-foreground">
                              {location.city && `${location.city}`}
                              {location.state && ` - ${location.state}`}
                              {location.zipCode && ` | CEP: ${location.zipCode}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLocationDialog(location)}
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para Usuários */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize as informações do usuário do sistema"
                : "Preencha os dados para criar um novo usuário do sistema"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João da Silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@exemplo.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username (Login) *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="joao.silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">
                Senha {editingUser && "(deixe em branco para não alterar)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required={!editingUser}
                minLength={6}
              />
              {!editingUser && (
                <p className="text-sm text-muted-foreground mt-1">
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Perfil de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "user" | "broker" | "financial" | "admin") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">👤 Usuário</SelectItem>
                    <SelectItem value="broker">🏢 Corretor</SelectItem>
                    <SelectItem value="financial">💰 Financeiro</SelectItem>
                    <SelectItem value="admin">⚡ Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Usuário ativo (pode fazer login)</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Locais */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Editar Local" : "Novo Local"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Atualize as informações do local"
                : "Preencha os dados para cadastrar um novo local"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="locationName">Nome do Local *</Label>
              <Input
                id="locationName"
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                placeholder="Edifício Central, Condomínio Sol Nascente, etc."
                required
              />
            </div>

            <div>
              <Label htmlFor="locationAddress">Endereço Completo</Label>
              <Input
                id="locationAddress"
                value={locationFormData.address}
                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="locationCity">Cidade</Label>
                <Input
                  id="locationCity"
                  value={locationFormData.city}
                  onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <Label htmlFor="locationState">Estado</Label>
                <Input
                  id="locationState"
                  value={locationFormData.state}
                  onChange={(e) => setLocationFormData({ ...locationFormData, state: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="locationZipCode">CEP</Label>
                <Input
                  id="locationZipCode"
                  value={locationFormData.zipCode}
                  onChange={(e) => setLocationFormData({ ...locationFormData, zipCode: applyCepMask(e.target.value) })}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : editingLocation ? "Salvar Alterações" : "Criar Local"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}