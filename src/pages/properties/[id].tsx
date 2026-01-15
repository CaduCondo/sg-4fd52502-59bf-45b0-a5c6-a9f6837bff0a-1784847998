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
import { ArrowLeft, Edit, Trash2, MapPin, Building2, DollarSign } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate, parseCurrency, maskCurrency } from "@/lib/masks";

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

export default function PropertyDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    local: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    state: "SP",
    description: "",
    monthlyRent: "",
    status: "available" as "available" | "rented"
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (id) {
      loadProperty();
    }
  }, [id, router]);

  const loadProperty = () => {
    const properties = propertyStorage.getAll();
    const found = properties.find(p => p.id === id);
    if (found) {
      setProperty(found);
      setFormData({
        local: found.local,
        cep: found.cep,
        address: found.address,
        number: found.number,
        complement: found.complement || "",
        state: found.state,
        description: found.description,
        monthlyRent: maskCurrency(found.monthlyRent.toString()),
        status: found.status
      });
    } else {
      router.push("/properties");
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!property) return;

    const updatedProperty: Property = {
      ...property,
      local: formData.local,
      cep: formData.cep,
      address: formData.address,
      number: formData.number,
      complement: formData.complement || undefined,
      state: formData.state,
      description: formData.description,
      monthlyRent: parseCurrency(formData.monthlyRent),
      status: formData.status
    };

    propertyStorage.save(updatedProperty);
    setProperty(updatedProperty);
    setIsEditDialogOpen(false);
  };

  const handleDelete = () => {
    if (!property) return;
    
    if (confirm("Tem certeza que deseja excluir este imóvel?")) {
      propertyStorage.delete(property.id);
      router.push("/properties");
    }
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setFormData({ ...formData, monthlyRent: masked });
  };

  if (!property) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO 
        title={`${property.local} - ImóvelControl`}
        description={`Detalhes do imóvel em ${property.local}`}
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push("/properties")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <MapPin className="text-emerald-600" />
                <span>{property.local}</span>
              </h1>
              <p className="text-slate-600 mt-2">{property.address}, {property.number}</p>
            </div>
            <Badge variant={property.status === "rented" ? "default" : "secondary"} className="text-base px-4 py-2">
              {property.status === "rented" ? "Alugado" : "Disponível"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Informações do Imóvel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Local</p>
                    <p className="text-lg text-slate-900">{property.local}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">CEP</p>
                    <p className="text-lg text-slate-900">{property.cep}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Endereço</p>
                    <p className="text-lg text-slate-900">{property.address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Número</p>
                    <p className="text-lg text-slate-900">{property.number}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {property.complement && (
                    <div>
                      <p className="text-sm font-medium text-slate-600">Complemento</p>
                      <p className="text-lg text-slate-900">{property.complement}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-600">Estado</p>
                    <p className="text-lg text-slate-900">{property.state}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-600">Descrição</p>
                  <p className="text-slate-900">{property.description}</p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-600">Data de Cadastro</p>
                  <p className="text-slate-900">{formatDate(property.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="text-emerald-600" />
                    <span>Valor Mensal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(property.monthlyRent)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={handleEdit}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Edit size={18} />
                    <span>Editar Imóvel</span>
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Trash2 size={18} />
                    <span>Excluir Imóvel</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Imóvel</DialogTitle>
              <DialogDescription>Atualize as informações do imóvel</DialogDescription>
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
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
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
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "available" | "rented" })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    >
                      <option value="available">Disponível</option>
                      <option value="rented">Alugado</option>
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}