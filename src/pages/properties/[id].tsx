import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Save, MapPin } from "lucide-react";
import { Property, Location } from "@/types";
import { getById as getPropertyById, update as updateProperty } from "@/services/propertyService";
import { getAll as getAllLocations, getById as getLocationById } from "@/services/locationService";
import { applyRealMask, removeMask } from "@/lib/masks";

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    locationId: "",
    complement: "",
    value: "",
    rooms: "",
    bathrooms: "",
    area: "",
    description: "",
    status: "available" as "available" | "occupied" | "unavailable",
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ocupado</Badge>;
      case "available":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Vago</Badge>;
      case "unavailable":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Indisponível</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProperty(id);
    }
  }, [id, locations]); // Reload property when locations are loaded to match location data

  // Update selected location when form locationId changes
  useEffect(() => {
    if (formData.locationId && locations.length > 0) {
      const loc = locations.find(l => l.id === formData.locationId);
      setSelectedLocation(loc || null);
    }
  }, [formData.locationId, locations]);

  const loadLocations = async () => {
    try {
      const locationsData = await getAllLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const data = await getPropertyById(propertyId);
      
      if (data) {
        setProperty(data);
        setFormData({
          locationId: data.locationId || "",
          complement: data.complement || "",
          value: data.value ? applyRealMask((data.value * 100).toString()) : "",
          rooms: data.rooms?.toString() || "",
          bathrooms: data.bathrooms?.toString() || "",
          area: data.area?.toString() || "",
          description: data.description || "",
          status: data.status || "available",
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    
    setSaving(true);
    try {
      const payload = {
        location_id: formData.locationId,
        complement: formData.complement,
        value: parseFloat(removeMask(formData.value)) || 0,
        rooms: parseInt(formData.rooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        area: formData.area ? parseFloat(formData.area.replace(",", ".")) : 0,
        description: formData.description,
        status: formData.status,
      };

      await updateProperty(property.id, payload);
      
      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });
      router.push("/properties");
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar imóvel.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!property) return null;

  return (
    <>
      <SEO title={`Editar Imóvel - ${property.location || "Detalhes"}`} />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Editar Imóvel</h1>
            <div className="ml-auto">
              {getStatusBadge(property.status)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Local *</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                      required
                    >
                      <SelectTrigger id="location">
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedLocation && (
                    <div className="bg-muted/50 p-4 rounded-lg border space-y-2 text-sm">
                      <p className="font-medium text-base">{selectedLocation.name}</p>
                      <p className="text-muted-foreground">
                        {selectedLocation.street}, {selectedLocation.number}
                        {selectedLocation.complement && ` - ${selectedLocation.complement}`}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedLocation.neighborhood} - {selectedLocation.city}/{selectedLocation.state}
                      </p>
                      <p className="text-muted-foreground">CEP: {selectedLocation.zip_code}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Ex: Apto 101"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Detalhes do Imóvel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor (R$)</Label>
                    <Input
                      id="value"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: applyRealMask(e.target.value) })}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rooms">Quartos</Label>
                      <Input
                        id="rooms"
                        type="number"
                        value={formData.rooms}
                        onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Banheiros</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Área (m²)</Label>
                    <Input
                      id="area"
                      type="text"
                      inputMode="decimal"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Informações adicionais sobre o imóvel..."
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
}