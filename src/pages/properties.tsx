import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { propertyService, configService } from "@/services";
import { Property, Config } from "@/types";
import { Building2, MapPin, DollarSign, Trash2, Edit, X, Save, Home } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, unformatCurrency } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";

export default function Properties() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    address: "",
    location: "",
    value: "",
    description: "",
  });

  const { status } = router.query;

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setMounted(true);
    loadData();
  }, [router, status]);

  const loadData = async () => {
    try {
      const [propertiesData, configData] = await Promise.all([
        propertyService.getAll(),
        configService.get()
      ]);
      
      let filteredProperties = propertiesData;
      if (status) {
        filteredProperties = propertiesData.filter(p => p.status === status);
      }
      
      setProperties(filteredProperties);
      setLocations(configData.locations);
      
      // Set default location if available
      if (configData.locations.length > 0 && !formData.location) {
        setFormData(prev => ({ ...prev, location: configData.locations[0] }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      const updatedConfig = await configService.addLocation(newLocation);
      setLocations(updatedConfig.locations);
      setFormData(prev => ({ ...prev, location: newLocation }));
      setNewLocation("");
      setIsAddingLocation(false);
      toast({
        title: "Sucesso",
        description: "Local adicionado com sucesso",
      });
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o local",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.address || !formData.location || !formData.value) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData: Omit<Property, "id" | "createdAt"> = {
        address: formData.address,
        location: formData.location,
        monthlyRent: unformatCurrency(formData.value),
        description: formData.description,
        status: "available",
        neighborhood: "", // Adding default missing fields
        city: "",
        state: "",
        zipCode: "",
        number: "",
      };

      await propertyService.create(propertyData);
      
      toast({
        title: "Sucesso",
        description: "Imóvel cadastrado com sucesso",
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o imóvel",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedProperty) return;

    if (!formData.address || !formData.location || !formData.value) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const propertyData: Property = {
        ...selectedProperty,
        address: formData.address,
        location: formData.location,
        monthlyRent: unformatCurrency(formData.value),
        description: formData.description,
      };

      await propertyService.update(propertyData);
      
      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso",
      });

      setIsEditing(false);
      setViewDialogOpen(false);
      setSelectedProperty(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o imóvel",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) {
      return;
    }

    try {
      await propertyService.delete(id);
      
      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso",
      });

      loadData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o imóvel",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      address: property.address,
      location: property.location,
      value: formatCurrency(property.monthlyRent),
      description: property.description || "",
    });
    setIsEditing(false);
    setViewDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedProperty) {
      setFormData({
        address: selectedProperty.address,
        location: selectedProperty.location,
        value: formatCurrency(selectedProperty.monthlyRent),
        description: selectedProperty.description || "",
      });
    }
    setIsEditing(false);
  };

  const resetForm = () => {
    setFormData({
      address: "",
      location: locations.length > 0 ? locations[0] : "",
      value: "",
      description: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return <Badge variant="default" className="bg-purple-600">Ocupado</Badge>;
      case "available":
        return <Badge variant="success" className="bg-emerald-600">Disponível</Badge>;
      case "maintenance":
        return <Badge variant="warning" className="bg-amber-600">Manutenção</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <SEO 
        title="Imóveis - ImóvelControl"
        description="Gerenciamento de imóveis"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
              <p className="text-slate-600 mt-2">
                {status === 'occupied' ? 'Imóveis Ocupados' : 
                 status === 'available' ? 'Imóveis Disponíveis' : 
                 'Gerencie os imóveis cadastrados'}
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Building2 className="mr-2 h-5 w-5" />
              Novo Imóvel
            </Button>
          </div>

          {properties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 text-center">
                  Nenhum imóvel encontrado.
                  <br />
                  Clique em "Novo Imóvel" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <StaggerContainer staggerDelay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <StaggerItem key={property.id}>
                    <Card 
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer relative pb-12 group"
                      onClick={() => handleCardClick(property)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Home className="h-4 w-4 text-slate-500" />
                              {property.address}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.location}
                            </CardDescription>
                          </div>
                          {getStatusBadge(property.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center text-lg font-semibold text-emerald-600">
                            <DollarSign className="h-5 w-5 mr-1" />
                            {formatCurrency(property.monthlyRent)}
                          </div>
                          {property.description && (
                            <p className="text-sm text-slate-500 line-clamp-2">
                              {property.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                      <div className="absolute bottom-3 right-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(property.id, e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          )}
        </div>

        {/* Dialog Novo Imóvel */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
              <DialogDescription>
                Cadastre um novo imóvel no sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="location">Local/Condomínio *</Label>
                  <div className="flex gap-2">
                    {!isAddingLocation ? (
                      <>
                        <Select 
                          value={formData.location} 
                          onValueChange={(value) => setFormData({ ...formData, location: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um local" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddingLocation(true)}
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Input
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="Nome do novo local"
                          className="flex-1"
                        />
                        <Button type="button" onClick={handleAddLocation}>
                          Salvar
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setIsAddingLocation(false)}
                        >
                          X
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Endereço/Complemento *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex: Bloco A, Apto 101"
                  />
                </div>

                <div>
                  <Label htmlFor="value">Valor do Aluguel *</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: formatCurrency(e.target.value) })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes adicionais do imóvel"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Visualizar/Editar Imóvel */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Imóvel" : "Detalhes do Imóvel"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize as informações do imóvel" : "Visualize as informações do imóvel"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="view-location">Local/Condomínio *</Label>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Input value={formData.location} disabled />
                  ) : (
                    !isAddingLocation ? (
                      <>
                        <Select 
                          value={formData.location} 
                          onValueChange={(value) => setFormData({ ...formData, location: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um local" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddingLocation(true)}
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Input
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="Nome do novo local"
                          className="flex-1"
                        />
                        <Button type="button" onClick={handleAddLocation}>
                          Salvar
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setIsAddingLocation(false)}
                        >
                          X
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="view-address">Endereço/Complemento *</Label>
                <Input
                  id="view-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="view-value">Valor do Aluguel *</Label>
                <Input
                  id="view-value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: formatCurrency(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="view-description">Descrição</Label>
                <Input
                  id="view-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              {selectedProperty && (
                <div>
                  <Label>Status Atual</Label>
                  <div className="mt-2">
                    {getStatusBadge(selectedProperty.status)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleUpdate}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Fechar
                  </Button>
                  <Button type="button" onClick={handleEditClick}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}