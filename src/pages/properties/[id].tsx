import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, configStorage } from "@/lib/storage";
import { propertyService } from "@/services/propertyService";
import { Property } from "@/types";
import { ArrowLeft, Edit, Trash2, MapPin, DollarSign, Save, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate, parseCurrency, maskCurrency } from "@/lib/masks";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent } from "@/components/ui/select";

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function PropertyDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [formData, setFormData] = useState({ 
    location: "",
    zipCode: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    description: "",
    type: "",
    monthlyRent: "",
    status: "available" as "available" | "occupied"
  }); 

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const config = configStorage.get();
    setLocations(config.locations || []);
    loadProperty();
  }, [router, id]);

  const loadProperty = () => {
    const properties = propertyStorage.getAll();
    const found = properties.find(p => p.id === id);
    if (found) {
      setProperty(found);
      setFormData({
        location: found.location,
        address: found.address,
        number: found.number,
        complement: found.complement || "",
        zipCode: found.zipCode,
        neighborhood: found.neighborhood || "",
        city: found.city || "",
        state: found.state || "",
        description: found.description || "",
        type: found.type || "",
        monthlyRent: maskCurrency(found.monthlyRent.toString()),
        status: found.status
      });
    } else {
      router.push("/properties");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (property) {
      setFormData({
        location: property.location,
        zipCode: property.zipCode,
        address: property.address,
        number: property.number,
        complement: property.complement || "",
        neighborhood: property.neighborhood || "",
        city: property.city || "",
        state: property.state || "",
        description: property.description || "",
        type: property.type || "",
        monthlyRent: maskCurrency(property.monthlyRent.toString()),
        status: property.status
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!property) return;

    const updatedProperty: Property = {
      ...property,
      location: formData.location,
      address: formData.address,
      number: formData.number,
      complement: formData.complement,
      zipCode: formData.zipCode,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      monthlyRent: parseCurrency(formData.monthlyRent),
      description: formData.description,
    };

    await propertyService.update(updatedProperty);
    setProperty(updatedProperty);
    setIsEditing(false);
    toast({ title: "Sucesso", description: "Imóvel atualizado com sucesso!" });
  };

  const handleDelete = () => {
    if (!property) return;
    
    if (confirm("Tem certeza que deseja excluir este imóvel?")) {
      propertyStorage.delete(property.id);
      toast({ title: "Sucesso", description: "Imóvel excluído com sucesso!" });
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
        title={`${property.location} - ImóvelControl`}
        description={`Detalhes do imóvel em ${property.location}`}
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit} className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Informações do Imóvel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Local</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                    disabled={!isEditing}
                  >
                    <SelectContent>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">CEP</p>
                    {isEditing ? (
                      <Input value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                    ) : (
                      <p className="text-lg text-slate-900">{property.zipCode}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Endereço</p>
                    {isEditing ? (
                      <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    ) : (
                      <p className="text-lg text-slate-900">{property.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Número</p>
                    {isEditing ? (
                      <Input value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                    ) : (
                      <p className="text-lg text-slate-900">{property.number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Complemento</p>
                    {isEditing ? (
                      <Input value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} />
                    ) : (
                      <p className="text-lg text-slate-900">{property.complement || "-"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Estado</p>
                    {isEditing ? (
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                      >
                        {STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-lg text-slate-900">{property.state}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Descrição</h3>
                  <p className="text-gray-600">{property.description || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Valor Mensal</p>
                    {isEditing ? (
                      <Input
                        value={formData.monthlyRent}
                        onChange={handleMoneyChange}
                        placeholder="R$ 0,00"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(property.monthlyRent)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Status</p>
                    {isEditing ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as "available" | "occupied" })}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                      >
                        <option value="available">Disponível</option>
                        <option value="occupied">Ocupado</option>
                      </select>
                    ) : (
                      <Badge variant={property.status === "occupied" ? "default" : "secondary"} className="text-base px-4 py-1">
                        {property.status === "occupied" ? "Ocupado" : "Disponível"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-slate-600">Data de Cadastro</p>
                  <p className="text-slate-900">{formatDate(property.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="text-emerald-600" />
                  <span>Resumo Financeiro</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Valor Mensal</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(property.monthlyRent)}
                    </p>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-600">Status do Imóvel</p>
                    <Badge variant={property.status === "occupied" ? "default" : "secondary"} className="mt-1">
                      {property.status === "occupied" ? "Ocupado" : "Disponível"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}