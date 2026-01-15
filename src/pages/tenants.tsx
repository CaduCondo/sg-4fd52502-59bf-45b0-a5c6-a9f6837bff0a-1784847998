import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { Search, Plus, Trash2, Edit, User, Phone, Mail, FileText, Eye, LayoutList, Grid } from "lucide-react";
import { Tenant } from "@/types";
import { tenantStorage } from "@/lib/storage";
import { maskCPF, maskCNPJ, maskPhone } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(""); // Name or Phone
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");

  // Form states
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    documentType: "CPF" as "CPF" | "CNPJ",
    cpf: "",
    rg: "",
    phone: "",
    email: "",
    observations: "",
    isActive: true,
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadTenants();
  }, [router]);

  const loadTenants = () => {
    const data = tenantStorage.getAll();
    // Ensure backwards compatibility - add isActive if missing
    const updated = data.map(t => ({
      ...t,
      isActive: t.isActive !== undefined ? t.isActive : true,
      documentType: t.documentType || "CPF" as "CPF" | "CNPJ"
    }));
    setTenants(updated);
  };

  const filteredTenants = tenants
    .filter(tenant => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.phone.includes(searchTerm);
      
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "active" && tenant.isActive) ||
        (filterStatus === "inactive" && !tenant.isActive);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "status") {
        return (Number(b.isActive) - Number(a.isActive));
      }
      return a.name.localeCompare(b.name);
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "cpf") {
      if (formData.documentType === "CPF") {
        finalValue = maskCPF(value);
      } else {
        finalValue = maskCNPJ(value);
      }
    }
    if (name === "phone") finalValue = maskPhone(value);

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleDocumentChange = (value: string) => {
    let formatted = value;
    if (formData.documentType === "CPF") {
      formatted = maskCPF(value);
    } else {
      formatted = maskCNPJ(value);
    }
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: maskPhone(value) }));
  };

  const handleDocumentTypeChange = (value: "CPF" | "CNPJ") => {
    setFormData(prev => ({
      ...prev,
      documentType: value,
      cpf: "",
      rg: value === "CNPJ" ? "" : prev.rg
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tenantData: Tenant = {
      id: selectedTenant ? selectedTenant.id : crypto.randomUUID(),
      name: formData.name,
      documentType: formData.documentType,
      cpf: formData.cpf, // Stores CPF or CNPJ
      rg: formData.documentType === "CNPJ" ? undefined : formData.rg,
      email: formData.email,
      phone: formData.phone,
      observations: formData.observations,
      isActive: selectedTenant ? selectedTenant.isActive : true,
      createdAt: selectedTenant ? selectedTenant.createdAt : new Date().toISOString()
    };

    if (selectedTenant) {
      tenantStorage.update(tenantData);
      toast({ title: "Sucesso", description: "Inquilino atualizado com sucesso!" });
    } else {
      tenantStorage.save(tenantData);
      toast({ title: "Sucesso", description: "Inquilino cadastrado com sucesso!" });
    }

    loadTenants(); // Refresh list immediately
    handleCloseDialog();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    const updatedTenant: Tenant = {
      ...selectedTenant,
      name: formData.name,
      documentType: formData.documentType,
      cpf: formData.cpf,
      rg: formData.rg,
      phone: formData.phone,
      email: formData.email,
      observations: formData.observations,
      isActive: formData.isActive,
    };

    tenantStorage.save(updatedTenant);
    toast({ title: "Sucesso", description: "Inquilino atualizado com sucesso!" });
    setIsEditOpen(false);
    setSelectedTenant(null);
    resetForm();
    loadTenants();
  };

  const handleViewTenant = (tenant: Tenant) => {
    setViewingTenant(tenant);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // if (confirm("Tem certeza que deseja excluir este inquilino?")) { // Moved to Dialog
      tenantStorage.delete(id);
      toast({ title: "Sucesso", description: "Inquilino excluído." });
      loadTenants();
    // }
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      documentType: tenant.documentType || "CPF",
      cpf: tenant.cpf,
      rg: tenant.rg || "",
      phone: tenant.phone,
      email: tenant.email,
      observations: tenant.observations || "",
      isActive: tenant.isActive !== undefined ? tenant.isActive : true,
    });
    setIsEditOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddOpen(false);
    setIsEditOpen(false);
    setSelectedTenant(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      documentType: "CPF",
      cpf: "",
      rg: "",
      phone: "",
      email: "",
      observations: "",
      isActive: true,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inquilinos</h1>
            <p className="text-gray-500">Gerencie os inquilinos cadastrados no sistema.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Novo Inquilino
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Novo Inquilino</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select 
                      value={formData.documentType} 
                      onValueChange={(val: "CPF" | "CNPJ") => setFormData({ ...formData, documentType: val })}
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPF">CPF</SelectItem>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cpf">{formData.documentType}</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      maxLength={formData.documentType === "CPF" ? 14 : 18}
                    />
                  </div>
                </div>

                {formData.documentType === "CPF" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        name="rg"
                        value={formData.rg}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-md">
             <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
             <p className="text-slate-500">Nenhum inquilino encontrado.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-white rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewTenant(tenant)}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.documentType}: {tenant.cpf}</TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>
                      <Badge className={tenant.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
                        {tenant.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTenantToDelete(tenant); setIsDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <StaggerContainer staggerDelay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant) => (
                <Card 
                  key={tenant.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                  onClick={() => handleViewTenant(tenant)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{tenant.name}</CardTitle>
                        <CardDescription>{tenant.phone}</CardDescription>
                      </div>
                      <Badge className={tenant.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
                        {tenant.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-slate-600">
                      {tenant.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{tenant.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{tenant.documentType}: {tenant.cpf}</span>
                      </div>
                    </div>
                    
                    {/* Actions - Prevent bubbling */}
                    <div className="flex gap-2 pt-4 mt-2" onClick={(e) => e.stopPropagation()}>
                       <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTenantToDelete(tenant);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </StaggerContainer>
        )}

        {/* View Tenant Dialog */}
        <Dialog open={!!viewingTenant} onOpenChange={(open) => !open && setViewingTenant(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Inquilino</DialogTitle>
              <DialogDescription>Ficha cadastral completa</DialogDescription>
            </DialogHeader>
            {viewingTenant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{viewingTenant.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Documento ({viewingTenant.documentType})</Label>
                    <p className="font-medium">{viewingTenant.cpf}</p>
                  </div>
                  {viewingTenant.rg && (
                    <div>
                      <Label className="text-muted-foreground">RG</Label>
                      <p className="font-medium">{viewingTenant.rg}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{viewingTenant.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewingTenant.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={viewingTenant.isActive ? "default" : "secondary"}>
                      {viewingTenant.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                
                {viewingTenant.observations && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm mt-1 bg-slate-50 p-3 rounded-md">{viewingTenant.observations}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingTenant(null)}>Fechar</Button>
              <Button onClick={() => {
                handleEdit(viewingTenant!);
                setViewingTenant(null);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Inquilino</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo *</Label>
                <Input id="edit-name" name="name" required value={formData.name} onChange={handleInputChange} />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Documento *</Label>
                <Select value={formData.documentType} onValueChange={handleDocumentTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cpf">{formData.documentType} *</Label>
                  <Input 
                    id="edit-cpf" 
                    name="cpf" 
                    required 
                    value={formData.cpf} 
                    onChange={handleInputChange} 
                    placeholder={formData.documentType === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                    maxLength={formData.documentType === "CPF" ? 14 : 18}
                  />
                </div>
                {formData.documentType === "CPF" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-rg">RG *</Label>
                    <Input id="edit-rg" name="rg" required value={formData.rg} onChange={handleInputChange} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone *</Label>
                  <Input id="edit-phone" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input id="edit-email" name="email" type="email" required value={formData.email} onChange={handleInputChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.isActive ? "active" : "inactive"} onValueChange={(val) => setFormData({...formData, isActive: val === "active"})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-observations">Observações</Label>
                <Textarea id="edit-observations" name="observations" value={formData.observations} onChange={handleInputChange} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Salvar Alterações</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este inquilino? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (tenantToDelete) handleDelete(tenantToDelete.id);
                  setIsDeleteOpen(false);
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}