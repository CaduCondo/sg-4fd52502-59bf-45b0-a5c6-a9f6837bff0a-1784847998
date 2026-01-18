import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Save, X, Building2, MapPin } from "lucide-react";
import { propertyService, type PropertyWithLocation } from "@/services/propertyService";
import { locationService } from "@/services/locationService";
import type { Location } from "@/types";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/masks";

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const [property, setProperty] = useState<PropertyWithLocation | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState({
    location_id: "",
    property_identifier: "",
    type: "residential" as "residential" | "commercial",
    monthly_rent: "",
    status: "available" as "available" | "occupied" | "unavailable",
    description: "",
  });

  useEffect(() => {
    if (id) {
      loadProperty();
      loadLocations();
    }
    if (edit === "true") {
      setIsEditing(true);
    }
  }, [id, edit]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getById(id as string);
      if (data) {
        setProperty(data);
        setEditForm({
          location_id: data.location_id || "",
          property_identifier: data.property_identifier || "Apartamento",
          type: data.type,
          monthly_rent: data.monthly_rent.toString(),
          status: data.status,
          description: data.description || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar imóvel:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do imóvel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const handleSave = async () => {
    try {
      const selectedLocation = locations.find(l => l.id === editForm.location_id);
      
      if (!selectedLocation) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um local válido.",
          variant: "destructive",
        });
        return;
      }

      await propertyService.update(id as string, {
        location: selectedLocation.name,
        location_id: editForm.location_id,
        property_identifier: editForm.property_identifier,
        type: editForm.type,
        monthly_rent: parseFloat(editForm.monthly_rent),
        status: editForm.status,
        description: editForm.description,
      });

      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });

      setIsEditing(false);
      loadProperty();
    } catch (error) {
      console.error("Erro ao atualizar imóvel:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      available: { label: "Disponível", variant: "default" as const },
      occupied: { label: "Ocupado", variant: "secondary" as const },
      unavailable: { label: "Indisponível", variant: "destructive" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.available;
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      residential: { label: "Residencial", variant: "outline" as const },
      commercial: { label: "Comercial", variant: "outline" as const },
    };
    return typeMap[type as keyof typeof typeMap] || typeMap.residential;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground">Imóvel não encontrado</p>
          <Button onClick={() => router.push("/properties")}>
            Voltar para Imóveis
          </Button>
        </div>
      </Layout>
    );
  }

  const locationData = property.locationData;
  const fullAddress = locationData
    ? `${locationData.street}, ${locationData.number}${
        locationData.complement ? ` - ${locationData.complement}` : ""
      }, ${locationData.neighborhood}, ${locationData.city}/${locationData.state} - CEP: ${locationData.zip_code}`
    : "Endereço não disponível";

  return (
    <Layout>
      <SEO
        title={`${property.property_identifier} - ${locationData?.name || property.location}`}
        description={`Detalhes do imóvel ${property.property_identifier}`}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/properties")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {property.property_identifier}
              </h1>
              <p className="text-muted-foreground">
                {locationData?.name || property.location}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações do Imóvel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="location_id">Local</Label>
                    <Select
                      value={editForm.location_id}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, location_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} - {location.street}, {location.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property_identifier">Identificação</Label>
                    <Input
                      id="property_identifier"
                      value={editForm.property_identifier}
                      onChange={(e) =>
                        setEditForm({ ...editForm, property_identifier: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value: "residential" | "commercial") =>
                        setEditForm({ ...editForm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residencial</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value: "available" | "occupied" | "unavailable") =>
                        setEditForm({ ...editForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="occupied">Ocupado</SelectItem>
                        <SelectItem value="unavailable">Indisponível</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthly_rent">Aluguel Mensal</Label>
                    <Input
                      id="monthly_rent"
                      type="number"
                      step="0.01"
                      value={editForm.monthly_rent}
                      onChange={(e) =>
                        setEditForm({ ...editForm, monthly_rent: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Identificação</p>
                    <p className="font-medium">{property.property_identifier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant={getTypeBadge(property.type).variant}>
                      {getTypeBadge(property.type).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={getStatusBadge(property.status).variant}>
                      {getStatusBadge(property.status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aluguel Mensal</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(property.monthly_rent)}
                    </p>
                  </div>
                  {property.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{property.description}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Local</p>
                <p className="font-medium text-lg">
                  {locationData?.name || property.location}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endereço Completo</p>
                <p className="font-medium">{fullAddress}</p>
              </div>
              {locationData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p className="font-medium">{locationData.neighborhood}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade/Estado</p>
                      <p className="font-medium">
                        {locationData.city}/{locationData.state}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CEP</p>
                    <p className="font-medium">{locationData.zip_code}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}