import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
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
import { Building2, Plus, Edit, Trash2, Search, MapPin } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, maskCurrency, maskCEP, fetchAddressByCEP } from "@/lib/masks";

const LOCALS = [
  "Jd. Colombo",
  "Signore",
  "Lemos",
  "Marrom",
  "Cinza",
  "Dora",
  "Acacias"
];

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Properties() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied">("all");
  const [filterLocal, setFilterLocal] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [formData, setFormData] = useState({
    local: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    state: "SP",
    description: "",
    monthlyRent: "",
    status: "available" as "available" | "occupied"
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadProperties();
  }, [router]);

  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.complement && p.complement.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (filterLocal) {
      filtered = filtered.filter(p => p.local === filterLocal);
    }

    setFilteredProperties(filtered);
  }, [searchTerm, filterStatus, filterLocal, properties]);

  const loadProperties = () => {
    const data = propertyStorage.getAll();
    setProperties(data);
    setFilteredProperties(data);
  };

  const handleCEPChange = async (cep: string) => {
    const masked = maskCEP(cep);
    setFormData({ ...formData, cep: masked });

    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      const addressData = await fetchAddressByCEP(cleanCEP);
      setLoadingCEP(false);

      if (addressData) {
        setFormData(prev => ({
          ...prev,
          cep: masked,
          address: addressData.logradouro || "",
          state: addressData.uf || "SP"
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const property: Property = {
      id: editingProperty?.id || Date.now().toString(),
      local: formData.local,
      cep: formData.cep,
      address: formData.address,
      number: formData.number,
      complement: formData.complement || undefined,
      state: formData.state,
      description: formData.description,
      monthlyRent: parseCurrency(formData.monthlyRent),
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
      local: property.local,
      cep: property.cep,
      address: property.address,
      number: property.number,
      complement: property.complement || "",
      state: property.state,
      description: property.description,
      monthlyRent: maskCurrency(property.monthlyRent.toString()),
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
      local: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      state: "SP",
      description: "",
      monthlyRent: "",
      status: "available"
    });
    setEditingProperty(null);
    setIsDialogOpen(false);
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setFormData({ ...formData, monthlyRent: masked });
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar imóveis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterLocal}
              onChange={(e) => setFilterLocal(e.target.value)}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
            >
              <option value="">Todos os locais</option>
              {LOCALS.map(local => (
                <option key={local} value={local}>{local}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "available" | "occupied")}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
            >
              <option value="all">Todos os status</option>
              <option value="available">Disponível</option>
              <option value="occupied">Ocupado</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <Link href={`/properties/${property.id}`}>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <MapPin size={18} className="text-emerald-600" />
                          <span>{property.local}</span>
                        </CardTitle>
                        {property.complement && (
                          <CardDescription className="mt-2">
                            {property.complement}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={property.status === "occupied" ? "default" : "secondary"}>
                        {property.status === "occupied" ? "Ocupado" : "Disponível"}
                      </Badge>
                    </div>
                  </CardHeader>
                </Link>
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
              <DialogDescription>
                {editingProperty ? "Atualize as informações do imóvel" : "Adicione um novo imóvel ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="local">Local *</Label>
                    <select
                      id="local"
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                      required
                    >
                      <option value="">Selecione o local</option>
                      {LOCALS.map(local => (
                        <option key={local} value={local}>{local}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleCEPChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                      disabled={loadingCEP}
                    />
                    {loadingCEP && <p className="text-xs text-slate-500">Buscando endereço...</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, avenida"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="Número"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                      required
                    >
                      {STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, bloco, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Características do imóvel"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Valor Mensal *</Label>
                    <Input
                      id="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={handleMoneyChange}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "available" | "occupied" })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    >
                      <option value="available">Disponível</option>
                      <option value="occupied">Ocupado</option>
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProperty ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}