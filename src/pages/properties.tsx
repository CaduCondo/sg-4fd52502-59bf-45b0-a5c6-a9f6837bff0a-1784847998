import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, MapPin, Trash2, Home } from "lucide-react";
import { Property, Location as LocationModel } from "@/types";
import { getAll as getAllProperties, create as createProperty, remove as deleteProperty } from "@/services/propertyService";
import { getAll as getAllLocations } from "@/services/locationService";
import { applyRealMask, removeMask } from "@/lib/masks";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({
    locationId: "",
    complement: "",
    rentValue: "",
    status: "available"
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [propertiesData, locationsData] = await Promise.all([
        getAllProperties(),
        getAllLocations()
      ]);
      setProperties(propertiesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProperty = async () => {
    try {
      const propertyData = {
        ...newProperty,
        location: getLocationData(newProperty.locationId)?.name || "Local não definido",
        rentValue: parseFloat(removeMask(newProperty.rentValue)),
        status: newProperty.status as "available" | "occupied" | "unavailable"
      };
      
      await createProperty(propertyData);

      toast({
        title: "Sucesso",
        description: "Imóvel cadastrado com sucesso!",
      });
      
      setIsDialogOpen(false);
      setNewProperty({
        locationId: "",
        complement: "",
        rentValue: "",
        status: "available"
      });
      loadData();
    } catch (error) {
      console.error("Error creating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o imóvel.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      await deleteProperty(id);
      
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
      
      loadData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o imóvel.",
        variant: "destructive",
      });
    }
  };

  const getLocationData = (locationId: string): LocationModel | undefined => {
    return locations.find((loc: LocationModel) => loc.id === locationId);
  };

  return (
    <>
      <SEO 
        title="Imóveis - Gerenciador de Locações" 
        description="Gerencie seus imóveis e propriedades"
      />
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie todos os seus imóveis disponíveis e ocupados
              </p>
            </div>
            {hasPermission(user?.role, "canCreateProperty") && (
              <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Imóvel
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        {property.location}
                      </CardTitle>
                      {property.complement && (
                        <CardDescription>{property.complement}</CardDescription>
                      )}
                    </div>
                    <Badge variant={property.status === "available" ? "success" : "secondary"}>
                      {property.status === "available" ? "Disponível" : "Ocupado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor do Aluguel:</span>
                      <span className="font-semibold text-lg text-green-600">
                        {property.rentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      {hasPermission(user?.role, "canDeleteProperty") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
              <DialogDescription>
                Cadastre um novo imóvel para locação
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Localização</Label>
                <Select
                  value={newProperty.locationId}
                  onValueChange={(value) => setNewProperty({ ...newProperty, locationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a localização" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} - {location.neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  placeholder="Ex: Apto 101, Casa 2, etc"
                  value={newProperty.complement}
                  onChange={(e) => setNewProperty({ ...newProperty, complement: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor do Aluguel</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={newProperty.rentValue}
                  onChange={(e) => setNewProperty({ ...newProperty, rentValue: applyRealMask(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleCreateProperty} 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!newProperty.locationId || !newProperty.rentValue}
              >
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}