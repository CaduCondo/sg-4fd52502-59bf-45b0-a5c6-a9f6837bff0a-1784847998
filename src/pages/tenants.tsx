import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { formatCPF, formatPhone } from "@/lib/masks";
import { tenantService } from "@/services/tenantService";
import { Tenant } from "@/types";
import { Plus, Search, Trash2, User, Phone, Mail, FileText } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar inquilinos.", variant: "destructive" });
    }
  };

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = tenants.filter(t => 
      t.name.toLowerCase().includes(lowerTerm) ||
      t.cpf.includes(lowerTerm) ||
      t.email.toLowerCase().includes(lowerTerm)
    );
    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    setFilteredTenants(filtered);
  }, [tenants, searchTerm]);

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      cpf: formatCPF(tenant.cpf),
      email: tenant.email,
      phone: formatPhone(tenant.phone),
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cpf || !formData.phone) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      const tenantData = {
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""),
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ""),
        status: isEditMode && selectedTenant ? selectedTenant.status : "active" as const
      };

      if (isEditMode && selectedTenant) {
        await tenantService.update({
          ...selectedTenant,
          ...tenantData
        });
        toast({ title: "Sucesso", description: "Inquilino atualizado!" });
      } else {
        await tenantService.create(tenantData);
        toast({ title: "Sucesso", description: "Inquilino cadastrado!" });
      }
      
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedTenant(null);
      setFormData({ name: "", cpf: "", email: "", phone: "" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar inquilino.", variant: "destructive" });
    }
  };

  const confirmDelete = (id: string) => {
    setTenantToDelete(id);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (tenantToDelete) {
      try {
        await tenantService.delete(tenantToDelete);
        toast({ title: "Sucesso", description: "Inquilino excluído com sucesso!" });
        loadData();
      } catch (error) {
        toast({ title: "Erro", description: "Erro ao excluir inquilino.", variant: "destructive" });
      }
    }
    setIsDeleteAlertOpen(false);
    setTenantToDelete(null);
  };

  return (
    <>
      <SEO title="Inquilinos" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Inquilinos</h1>
              <p className="text-muted-foreground">Gerencie seus inquilinos</p>
            </div>
            <Button onClick={() => { setIsEditMode(false); setIsDialogOpen(true); setFormData({ name: "", cpf: "", email: "", phone: "" }); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Inquilino
            </Button>
          </div>

          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTenants.map((tenant) => (
              <Card 
                key={tenant.id}
                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-4 border-l-blue-500"
                onClick={() => handleEdit(tenant)}
              >
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 truncate">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {tenant.name}
                    </h3>
                  </div>
                  
                  <div className="pt-2 border-t border-dashed space-y-1 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {formatCPF(tenant.cpf)}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {formatPhone(tenant.phone)}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 p-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(tenant.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Inquilino" : "Novo Inquilino"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input 
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone (WhatsApp) *</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                  maxLength={15}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Inquilino</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este inquilino?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}