import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Phone, Mail, User, FileText, Calendar, FileType } from "lucide-react";
import { Tenant } from "@/types";
import { tenantStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCPF, formatPhone, maskCPF, maskPhone } from "@/lib/masks";

export default function TenantDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = () => {
    const allTenants = tenantStorage.getAll();
    const found = allTenants.find(t => t.id === id);
    if (found) {
      setTenant(found);
      setFormData({
        name: found.name,
        cpf: found.cpf,
        phone: found.phone,
        email: found.email,
      });
    } else {
      toast({ title: "Erro", description: "Inquilino não encontrado", variant: "destructive" });
      router.push("/tenants");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "cpf") finalValue = maskCPF(value);
    if (name === "phone") finalValue = maskPhone(value);

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    const updatedTenant: Tenant = {
      ...tenant,
      ...formData,
    };

    tenantStorage.save(updatedTenant);
    setTenant(updatedTenant);
    toast({ title: "Sucesso", description: "Dados atualizados com sucesso!" });
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este inquilino?")) {
      if (id && typeof id === "string") {
        tenantStorage.delete(id);
        toast({ title: "Sucesso", description: "Inquilino excluído." });
        router.push("/tenants");
      }
    }
  };

  if (!tenant) return <Layout><div>Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{tenant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={tenant.status === 'active' ? "default" : "secondary"}>
                {tenant.status === 'active' ? "Ativo" : "Inativo"}
              </Badge>
              <span className="text-sm text-gray-500">Cadastrado em {new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsEditOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">CPF</h3>
            <p className="text-lg">{formatCPF(tenant.cpf)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Telefone</h3>
            <p className="text-lg">{formatPhone(tenant.phone)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
            <p className="text-lg">{tenant.email || "-"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
              {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Voltar
          </Button>
        </div>

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cpf">CPF *</Label>
                  <Input id="edit-cpf" name="cpf" required value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone *</Label>
                  <Input id="edit-phone" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input id="edit-email" name="email" type="email" required value={formData.email} onChange={handleInputChange} />
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