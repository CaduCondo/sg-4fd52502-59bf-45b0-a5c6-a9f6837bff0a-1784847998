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
import { Search, Plus, Trash2, Edit, User, Phone, Mail, FileText, Eye } from "lucide-react";
import { Tenant } from "@/types";
import { tenantStorage } from "@/lib/storage";
import { maskCPF, maskCNPJ, maskPhone } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function TenantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Filters
  const [searchName, setSearchName] = useState("");
  const [searchCpf, setSearchCpf] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "vacant">("all");
  const [sortBy, setSortBy] = useState<"name" | "cpf" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchName, searchCpf, searchEmail, searchPhone, filterStatus, sortBy, sortOrder, tenants]);

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

  const filterTenants = () => {
    let filtered = tenants;

    if (searchName) {
      filtered = filtered.filter(t => t.name.toLowerCase().includes(searchName.toLowerCase()));
    }
    if (searchCpf) {
      filtered = filtered.filter(t => t.cpf.includes(searchCpf));
    }
    if (searchEmail) {
      filtered = filtered.filter(t => t.email.toLowerCase().includes(searchEmail.toLowerCase()));
    }
    if (searchPhone) {
      filtered = filtered.filter(t => t.phone.includes(searchPhone));
    }
    // 2. Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter(t => t.isActive);
      } else if (filterStatus === "vacant") {
        filtered = filtered.filter(t => !t.isActive);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];

      if (sortBy === "createdAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTenants(filtered);
  };

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
    
    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      name: formData.name,
      documentType: formData.documentType as "CPF" | "CNPJ",
      cpf: formData.cpf,
      rg: formData.rg,
      email: formData.email,
      phone: formData.phone,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    tenantStorage.save(newTenant);
    toast({ title: "Sucesso", description: "Inquilino cadastrado com sucesso!" });
    setIsAddOpen(false);
    resetForm();
    loadTenants();
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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este inquilino?")) {
      tenantStorage.delete(id);
      toast({ title: "Sucesso", description: "Inquilino excluído." });
      loadTenants();
    }
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
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} />
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
                    <Label htmlFor="cpf">{formData.documentType} *</Label>
                    <Input 
                      id="cpf" 
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
                      <Label htmlFor="rg">RG *</Label>
                      <Input id="rg" name="rg" required value={formData.rg} onChange={handleInputChange} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" maxLength={15} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} />
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
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea id="observations" name="observations" value={formData.observations} onChange={handleInputChange} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Cadastrar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Filtrar por nome..." 
                    className="pl-9"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input 
                  placeholder="Filtrar..." 
                  value={searchCpf}
                  onChange={(e) => setSearchCpf(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  placeholder="Filtrar por email..." 
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  placeholder="Filtrar por telefone..." 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(maskPhone(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="filterStatus">Status</Label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="vacant">Vagos</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortBy">Ordenar Por</Label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                >
                  <option value="name">Nome</option>
                  <option value="cpf">CPF/CNPJ</option>
                  <option value="createdAt">Data de Cadastro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Ordem</Label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                {filteredTenants.length} {filteredTenants.length === 1 ? "inquilino encontrado" : "inquilinos encontrados"}
              </Badge>
              {(searchName || searchCpf || searchEmail || searchPhone || filterStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchName("");
                    setSearchCpf("");
                    setSearchEmail("");
                    setSearchPhone("");
                    setFilterStatus("all");
                    setSortBy("name");
                    setSortOrder("asc");
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <StaggerContainer staggerDelay={0.08}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant, index) => (
              <StaggerItem key={tenant.id}>
                <FloatingCard delay={index * 0.05}>
                  <div 
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                    className="group cursor-pointer"
                  >
                    <Card className="h-full hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${tenant.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <CardHeader className="pb-2 pl-6">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold truncate pr-2">{tenant.name}</CardTitle>
                          <Badge variant={tenant.isActive ? "default" : "secondary"} className={tenant.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                            {tenant.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {tenant.documentType}: {tenant.cpf}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pl-6 text-sm space-y-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{tenant.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{tenant.phone}</span>
                        </div>
                        {!tenant.isActive && (
                          <Badge variant="destructive" className="mt-2">Inativo</Badge>
                        )}
                        
                        <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                          <div className="flex gap-2 pt-4 mt-auto">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setViewingTenant(tenant)}
                              className="flex-1 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                              title="Visualizar Detalhes"
                            >
                              <Eye size={14} className="mr-1" />
                              Ver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(tenant)}
                              className="flex-1"
                            >
                              <Edit size={14} className="mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </FloatingCard>
              </StaggerItem>
            ))}
            {filteredTenants.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                Nenhum inquilino encontrado com os filtros atuais.
              </div>
            )}
          </div>
        </StaggerContainer>

        {/* View Tenant Dialog */}
        <Dialog open={!!viewingTenant} onOpenChange={(open) => !open && setViewingTenant(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Inquilino</DialogTitle>
              <DialogDescription>Ficha cadastral completa</DialogDescription>
            </DialogHeader>
            {viewingTenant && (
              <div className="space-y-6 py-4">
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-2xl font-bold">
                    {viewingTenant.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{viewingTenant.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={viewingTenant.isActive ? "default" : "secondary"}>
                        {viewingTenant.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        Cadastrado em {new Date(viewingTenant.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Documento ({viewingTenant.documentType || "CPF"})</Label>
                    <p className="font-medium text-slate-900">{viewingTenant.cpf}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">RG</Label>
                    <p className="font-medium text-slate-900">{viewingTenant.rg || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Email</Label>
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      {viewingTenant.email || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Telefone</Label>
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      {viewingTenant.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewingTenant(null)}>Fechar</Button>
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
      </div>
    </Layout>
  );
}