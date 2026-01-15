import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAuthenticated } from "@/lib/auth";
import { tenantStorage } from "@/lib/storage";
import { Tenant } from "@/types";
import { Users, Plus, Edit, Trash2, Search, Mail, Phone } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Tenants() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadTenants();
  }, [router]);

  useEffect(() => {
    const filtered = tenants.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cpf.includes(searchTerm) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTenants(filtered);
  }, [searchTerm, tenants]);

  const loadTenants = () => {
    const data = tenantStorage.getAll();
    setTenants(data);
    setFilteredTenants(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tenant: Tenant = {
      id: editingTenant?.id || Date.now().toString(),
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      email: formData.email,
      createdAt: editingTenant?.createdAt || new Date().toISOString()
    };

    tenantStorage.save(tenant);
    loadTenants();
    resetForm();
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      cpf: tenant.cpf,
      phone: tenant.phone,
      email: tenant.email
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este inquilino?")) {
      tenantStorage.delete(id);
      loadTenants();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      phone: "",
      email: ""
    });
    setEditingTenant(null);
    setIsDialogOpen(false);
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  return (
    <>
      <SEO 
        title="Inquilinos - ImóvelControl"
        description="Gerenciamento de inquilinos cadastrados"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Inquilinos</h1>
              <p className="text-slate-600 mt-2">Gerenciamento de inquilinos cadastrados</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Novo Inquilino</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar inquilinos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                  <CardDescription>CPF: {formatCPF(tenant.cpf)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Phone size={16} />
                        <span>{formatPhone(tenant.phone)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Mail size={16} />
                        <span className="truncate">{tenant.email}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(tenant)}
                        className="flex-1"
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(tenant.id)}
                        className="flex-1"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTenants.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum inquilino encontrado</h3>
                <p className="text-slate-600 mb-6">Comece adicionando seu primeiro inquilino</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus size={18} className="mr-2" />
                  Adicionar Inquilino
                </Button>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTenant ? "Editar Inquilino" : "Novo Inquilino"}</DialogTitle>
              <DialogDescription>
                {editingTenant ? "Atualize as informações do inquilino" : "Adicione um novo inquilino ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do inquilino"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, "") })}
                    placeholder="00000000000"
                    maxLength={11}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                    placeholder="00000000000"
                    maxLength={11}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTenant ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}