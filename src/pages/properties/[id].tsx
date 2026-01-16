import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Edit, X } from "lucide-react";
import { Property, Location } from "@/types";
import { propertyService } from "@/services";
import { configService } from "@/services/configService";
import { applyCepMask, applyRealMask, removeMask, formatCurrency } from "@/lib/masks";

export default function PropertyDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    location: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    rentValue: "",
    description: "",
  });

  useEffect(() => {
    if (id) {
      loadProperty(id as string);
      loadLocations();
    }
  }, [id]);

  const loadLocations = async () => {
    try {
      const config = await configService.get();
      setLocations(config.locations || []);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const propertyData = await propertyService.getById(propertyId);
      if (propertyData) {
        setProperty(propertyData);
        setFormData({
          location: propertyData.location,
          cep: propertyData.cep || "",
          address: propertyData.address || "",
          number: propertyData.number || "",
          complement: propertyData.complement,
          neighborhood: propertyData.neighborhood || "",
          city: propertyData.city || "",
          state: propertyData.state || "",
          rentValue: applyRealMask(propertyData.rentValue.toString()),
          description: propertyData.description || "",
        });
      } else {
        toast({
          title: "Erro",
          description: "Imóvel não encontrado.",
          variant: "destructive",
        });
        router.push("/properties");
      }
    } catch (error) {
      console.error("Error loading property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o imóvel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (property) {
      setFormData({
        location: property.location,
        cep: property.cep || "",
        address: property.address || "",
        number: property.number || "",
        complement: property.complement,
        neighborhood: property.neighborhood || "",
        city: property.city || "",
        state: property.state || "",
        rentValue: applyRealMask(property.rentValue.toString()),
        description: property.description || "",
      });
    }
    setIsEditMode(false);
  };

  const handleLocationChange = (value: string) => {
    const selectedLocation = locations.find(l => l.name === value);
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        location: selectedLocation.name,
        cep: selectedLocation.cep,
        address: selectedLocation.address,
        number: selectedLocation.number,
        neighborhood: selectedLocation.neighborhood,
        city: selectedLocation.city,
        state: selectedLocation.state
      }));
    } else {
      setFormData(prev => ({ ...prev, location: value }));
    }
  };

  const handleSave = async () => {
    if (!property) return;

    if (!formData.location || !formData.complement || !formData.rentValue) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios: Local, Complemento e Valor do Aluguel.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedProperty = {
        ...property,
        location: formData.location,
        cep: formData.cep || undefined,
        address: formData.address || undefined,
        number: formData.number || undefined,
        complement: formData.complement,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        monthlyRent: convertMaskedValueToNumber(formData.rentValue),
        rentValue: convertMaskedValueToNumber(formData.rentValue),
        description: formData.description || undefined,
      };

      await propertyService.update(updatedProperty as Property);
      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });
      setProperty(updatedProperty as Property);
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "occupied":
        return "Alugado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Imóvel não encontrado</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Detalhes do Imóvel - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/properties")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} className="bg-emerald-600 hover:bg-emerald-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <CardTitle className="text-2xl">{property.location}</CardTitle>
                    <p className="text-muted-foreground">{property.complement}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(property.status)}>
                  {getStatusLabel(property.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">
                      Local <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <Select
                        value={formData.location}
                        onValueChange={handleLocationChange}
                      >
                        <SelectTrigger id="location">
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.name}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg font-medium">{property.location}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">
                      Complemento <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="complement"
                        placeholder="Ex: Casa 2, Apto 101"
                        value={formData.complement}
                        onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      />
                    ) : (
                      <p className="text-lg font-medium">{property.complement}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    {isEditMode ? (
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: applyCepMask(e.target.value) })}
                        maxLength={9}
                        disabled={!!locations.find(l => l.name === formData.location)}
                      />
                    ) : (
                      <p className="text-lg font-medium">{property.cep || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rentValue">
                      Valor do Aluguel <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="rentValue"
                        placeholder="R$ 0,00"
                        value={formData.rentValue}
                        onChange={(e) => setFormData({ ...formData, rentValue: applyRealMask(e.target.value) })}
                      />
                    ) : (
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(property.rentValue)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  {isEditMode ? (
                    <Input
                      id="address"
                      placeholder="Rua, Avenida, etc."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!!locations.find(l => l.name === formData.location)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{property.address || "—"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  {isEditMode ? (
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      disabled={!!locations.find(l => l.name === formData.location)}
                    />
                  ) : (
                    <p className="text-lg font-medium">{property.neighborhood || "—"}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    {isEditMode ? (
                      <Input
                        id="number"
                        placeholder="123"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        disabled={!!locations.find(l => l.name === formData.location)}
                      />
                    ) : (
                      <p className="text-lg font-medium">{property.number || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    {isEditMode ? (
                      <Input
                        id="city"
                        placeholder="São Paulo"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        disabled={!!locations.find(l => l.name === formData.location)}
                      />
                    ) : (
                      <p className="text-lg font-medium">{property.city || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    {isEditMode ? (
                      <Input
                        id="state"
                        placeholder="SP"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        maxLength={2}
                        disabled={!!locations.find(l => l.name === formData.location)}
                      />
                    ) : (
                      <p className="text-lg font-medium">{property.state || "—"}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  {isEditMode ? (
                    <Textarea
                      id="description"
                      placeholder="Informações adicionais sobre o imóvel..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-lg font-medium whitespace-pre-wrap">{property.description || "—"}</p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}