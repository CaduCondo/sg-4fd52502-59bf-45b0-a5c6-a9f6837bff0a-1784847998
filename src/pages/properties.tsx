import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage } from "@/lib/storage";
import { Property } from "@/types";
import { Building2, Plus, Edit, Trash2, Search } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Properties() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    description: "",
    monthlyRent: "",
    status: "available" as "available" | "rented"
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadProperties();
  }, [router]);

  useEffect(() => {
    const filtered = properties.filter(p =>
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProperties(filtered);
  }, [searchTerm, properties]);

  const loadProperties = () => {
    const data = propertyStorage.getAll();
    setProperties(data);
    setFilteredProperties(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const property: Property = {
      id: editingProperty?.id || Date.now().toString(),
      address: formData.address,
      description: formData.description,
      monthlyRent: parseFloat(formData.monthlyRent),
      status: formData.status,
      createdAt: editingProperty?.createdAt || new Date().toISOString()
    };

    propertyStorage.save(property);
    loadProperties();
    resetForm();
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      address: property.address,
      description: property.description,
      monthlyRent: property.monthlyRent.toString(),
      status: property.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este imóvel?")) {
      propertyStorage.delete(id);
      loadProperties();
    }
  };

  const resetForm = () => {
    setFormData({
      address: "",
      description: "",
      monthlyRent: "",
      status: "available"
    });
    setEditingProperty(null);
    setIsDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  return (
    <>
      <SEO 
        title="Imóveis - ImóvelControl"
        description="Gerenciamento de imóveis cadastrados"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
              <p className="text-slate-600 mt-2">Gerenciamento de imóveis cadastrados</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Novo Imóvel</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar imóveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{property.address}</CardTitle>
                      <CardDescription className="mt-2">{property.description}</CardDescription>
                    </div>
                    <Badge variant={property.status === "rented" ? "default" : "secondary"}>
                      {property.status === "rented" ? "Alugado" : "Disponível"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600">Valor Mensal</p>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(property.monthlyRent)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(property)}
                        className="flex-1"
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(property.id)}
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

          {filteredProperties.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Building2 className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-slate-600 mb-6">Comece adicionando seu primeiro imóvel</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus size={18} className="mr-2" />
                  Adicionar Imóvel
                </Button>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
              <DialogDescription>
                {editingProperty ? "Atualize as informações do imóvel" : "Adicione um novo imóvel ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Características do imóvel"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Valor Mensal</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "available" | "rented" })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                  >
                    <option value="available">Disponível</option>
                    <option value="rented">Alugado</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProperty ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}