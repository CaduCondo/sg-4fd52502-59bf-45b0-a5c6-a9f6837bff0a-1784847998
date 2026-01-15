import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, applyRealMask, parseCurrency, formatCurrencyInput } from "@/lib/masks";
import { propertyService } from "@/services/propertyService";
import { configService } from "@/services/configService";
import { Property } from "@/types";
import { Plus, Search, Trash2, Home, MapPin, Building } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    location: "all",
    status: "all",
    search: "",
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  
  const [formData, setFormData] = useState({
    location: "",
    address: "",
    number: "",
    complement: "",
    monthlyRent: "",
    description: "",
    zipCode: "",
    neighborhood: "",
    city: "",
    state: "",
    type: "",
  });

  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      location: "",
      address: "",
      number: "",
      complement: "",
      monthlyRent: "",
      description: "",
      zipCode: "",
      neighborhood: "",
      city: "",
      state: "",
      type: "",
    });
    setSelectedProperty(null);
    setIsEditMode(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [propertiesData, config] = await Promise.all([
        propertyService.getAll(),
        configService.get()
      ]);
      
      setProperties(propertiesData);
      
      // Get unique locations from properties + config locations
      const propertyLocations = [...new Set(propertiesData.map(p => p.location))];
      const configLocations = config.locations || [];
      const allLocations = [...new Set([...propertyLocations, ...configLocations])].sort();
      setLocations(allLocations);
      
      setFilteredProperties(propertiesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ 
        title: "Erro", 
        description: "Erro ao carregar dados", 
        variant: "destructive" 
      });
    }
  };

  useEffect(() => {
    let filtered = properties;
    
    if (filters.location !== "all") {
      filtered = filtered.filter(p => p.location === filters.location);
    }
    
    // Sort by location
    filtered.sort((a, b) => a.location.localeCompare(b.location));
    setFilteredProperties(filtered);
  }, [properties, filters]);

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      location: property.location,
      address: property.address,
      number: property.number,
      complement: property.complement || "",
      monthlyRent: property.monthlyRent.toFixed(2).replace(".", ","),
      description: property.description || "",
      zipCode: property.zipCode || "",
      neighborhood: property.neighborhood || "",
      city: property.city || "",
      state: property.state || "",
      type: property.type || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.location || !formData.complement) {
        toast({
          title: "Erro",
          description: "Preencha os campos obrigatórios: Local e Complemento",
          variant: "destructive",
        });
        return;
      }

      // Validate monthly rent
      const rentValue = parseCurrency(formData.monthlyRent);
      if (!rentValue || rentValue <= 0) {
        toast({
          title: "Erro",
          description: "Informe um valor de aluguel válido",
          variant: "destructive",
        });
        return;
      }

      if (isEditMode && selectedProperty) {
        const updatedProperty: Property = {
          ...selectedProperty,
          location: formData.location,
          complement: formData.complement,
          zipCode: formData.zipCode || "",
          address: formData.address || "",
          number: formData.number || "",
          neighborhood: formData.neighborhood || "",
          city: formData.city || "",
          state: formData.state || "",
          type: formData.type || "",
          monthlyRent: rentValue,
          description: formData.description || "",
        };

        await propertyService.update(updatedProperty);
        toast({ title: "Sucesso", description: "Imóvel atualizado com sucesso!" });
      } else {
        const newProperty: Omit<Property, "id" | "createdAt"> = {
          location: formData.location,
          complement: formData.complement,
          zipCode: formData.zipCode || "",
          address: formData.address || "",
          number: formData.number || "",
          neighborhood: formData.neighborhood || "",
          city: formData.city || "",
          state: formData.state || "",
          type: formData.type || "",
          monthlyRent: rentValue,
          description: formData.description || "",
          status: "available",
        };

        await propertyService.create(newProperty);
        toast({ title: "Sucesso", description: "Imóvel cadastrado com sucesso!" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar imóvel",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (property: Property) => {
    setPropertyToDelete(property);
    setIsDeleteOpen(true);
  };

  return (
    <>
      <SEO title="Imóveis" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Imóveis</h1>
              <p className="text-muted-foreground">Gerencie seus imóveis</p>
            </div>
            <Button onClick={() => { setIsEditMode(false); setIsDialogOpen(true); setFormData({ location: "", address: "", number: "", complement: "", monthlyRent: "", description: "" }); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </Button>
          </div>

          <Card className="p-4">
            <div className="flex gap-4 items-center">
              <div className="w-full md:w-1/3">
                <Select value={filters.location} onValueChange={(value) => setFilters({ ...filters, location: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por local" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Locais</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProperties.map((property) => (
              <Card 
                key={property.id}
                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-4 border-l-emerald-500"
                onClick={() => handleEdit(property)}
              >
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 truncate">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {property.location}
                    </h3>
                    {property.complement && (
                       <p className="text-sm text-muted-foreground mt-1 truncate">
                         {property.complement}
                       </p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-dashed space-y-1">
                    <div className="flex justify-between items-center">
                       <span className="text-emerald-600 font-bold">
                         {formatCurrency(property.monthlyRent)}
                       </span>
                       <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                         {property.status === 'available' ? 'Vago' : 'Ocupado'}
                       </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 p-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(property);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Local *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="complement">Complemento *</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  placeholder="Ex: Apto 101, Casa 2, Sala 3"
                />
              </div>

              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="Ex: 123"
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                />
              </div>

              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Ex: SP"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Ex: Apartamento, Casa, Sala Comercial"
                />
              </div>

              <div>
                <Label htmlFor="monthlyRent">Valor do Aluguel *</Label>
                <Input
                  id="monthlyRent"
                  value={formData.monthlyRent}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setFormData({ ...formData, monthlyRent: formatted });
                  }}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição adicional do imóvel"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}