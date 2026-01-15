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
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  
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
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [props, config] = await Promise.all([
        propertyService.getAll(),
        configService.get()
      ]);
      setProperties(props);
      setLocations(config.locations || []);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    }
  };

  useEffect(() => {
    let filtered = properties;
    
    if (selectedLocation !== "all") {
      filtered = filtered.filter(p => p.location === selectedLocation);
    }
    
    // Sort by location
    filtered.sort((a, b) => a.location.localeCompare(b.location));
    setFilteredProperties(filtered);
  }, [properties, selectedLocation]);

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      location: property.location,
      address: property.address,
      number: property.number,
      complement: property.complement || "",
      monthlyRent: property.monthlyRent.toFixed(2).replace(".", ","),
      description: property.description || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.location || !formData.address || !formData.monthlyRent) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      const propertyData = {
        location: formData.location,
        address: formData.address,
        number: formData.number,
        complement: formData.complement,
        monthlyRent: parseCurrency(formData.monthlyRent),
        description: formData.description,
        status: isEditMode && selectedProperty ? selectedProperty.status : "available" as const
      };

      if (isEditMode && selectedProperty) {
        await propertyService.update({
          ...selectedProperty,
          ...propertyData
        });
        toast({ title: "Sucesso", description: "Imóvel atualizado!" });
      } else {
        const newProperty: Omit<Property, "id" | "createdAt"> = {
          location: formData.location,
          address: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: "Bairro", // Valor padrão ou adicionar campo no formulário
          city: "São Paulo",     // Valor padrão ou adicionar campo no formulário
          state: "SP",           // Valor padrão ou adicionar campo no formulário
          zipCode: "00000-000",  // Valor padrão ou adicionar campo no formulário
          monthlyRent: parseCurrency(formData.monthlyRent),
          description: "",
          status: "available",
        };

        await propertyService.create(newProperty);
        toast({ title: "Sucesso", description: "Imóvel criado!" });
      }

      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedProperty(null);
      setFormData({ location: "", address: "", number: "", complement: "", monthlyRent: "", description: "" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar imóvel.", variant: "destructive" });
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
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Local" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Locais</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Local *</Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(val) => setFormData({...formData, location: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Endereço *</Label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input 
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input 
                    value={formData.complement}
                    onChange={(e) => setFormData({...formData, complement: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor do Aluguel (R$) *</Label>
                <Input 
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({...formData, monthlyRent: formatCurrencyInput(e.target.value)})}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}