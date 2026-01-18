import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Home, Building2, MapPin, Edit, Trash2, LayoutGrid, List } from "lucide-react";
import type { Property, Location } from "@/types";
import { propertyService } from "@/services/propertyService";
import { locationService } from "@/services/locationService";
import { formatCurrency, applyRealMask } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function PropertiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    propertyIdentifier: "",
    type: "residential",
    monthlyRent: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = properties.filter(p => 
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.property_identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProperties(filtered);
  }, [searchTerm, properties]);

  const loadData = async () => {
    try {
      const [propsData, locsData] = await Promise.all([
        propertyService.getAll(),
        locationService.getAll()
      ]);
      setProperties(propsData);
      setFilteredProperties(propsData);
      setLocations(locsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId || !formData.propertyIdentifier || !formData.monthlyRent) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      const selectedLocation = locations.find(l => l.id === formData.locationId);
      const rentValue = parseFloat(formData.monthlyRent.replace(/\./g, "").replace(",", "."));

      const newProperty: Omit<Property, "id" | "created_at" | "updated_at"> = {
        location: selectedLocation?.name || "",
        location_id: formData.locationId,
        property_identifier: formData.propertyIdentifier,
        type: formData.type as "residential" | "commercial",
        monthly_rent: rentValue,
        status: "available",
        description: formData.description,
      };

      await propertyService.create(newProperty);
      toast({ title: "Sucesso", description: "Imóvel cadastrado!" });
      setIsDialogOpen(false);
      setFormData({ locationId: "", propertyIdentifier: "", type: "residential", monthlyRent: "", description: "" });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Erro ao cadastrar imóvel", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await propertyService.delete(id);
      toast({ title: "Sucesso", description: "Imóvel excluído!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir imóvel", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "occupied": return "text-blue-600 bg-blue-50 border-blue-200";
      case "unavailable": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Disponível";
      case "occupied": return "Ocupado";
      case "unavailable": return "Indisponível";
      default: return status;
    }
  };

  return (
    <Layout>
      <SEO title="Imóveis - Gerenciador" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-muted-foreground">Gerencie seus imóveis</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-muted p-1 rounded-md flex">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por local ou identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <ScrollReveal key={property.id} delay={index * 0.05}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push(`/properties/${property.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                          {property.location}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground">{property.property_identifier}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(property.status)}`}>
                        {getStatusLabel(property.status)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {property.locationData && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>{property.locationData.street}, {property.locationData.number}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="text-lg font-bold text-emerald-600">
                        {formatCurrency(property.monthly_rent)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(property.id); }}>
                           <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             {filteredProperties.map((property) => (
               <Card key={property.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/properties/${property.id}`)}>
                 <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="bg-emerald-100 p-2 rounded-full">
                       <Building2 className="h-5 w-5 text-emerald-600" />
                     </div>
                     <div>
                       <p className="font-medium">{property.location} - {property.property_identifier}</p>
                       <p className="text-sm text-muted-foreground">
                         {property.locationData?.street}, {property.locationData?.number}
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(property.status)}`}>
                        {getStatusLabel(property.status)}
                      </span>
                      <span className="font-bold text-emerald-600 w-24 text-right">
                        {formatCurrency(property.monthly_rent)}
                      </span>
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        )}

        {/* Dialog Novo Imóvel */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Imóvel</DialogTitle>
              <DialogDescription>Cadastre um novo imóvel em um local existente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Local</Label>
                <Select value={formData.locationId} onValueChange={(val) => setFormData({...formData, locationId: val})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Identificador (ex: Apto 101, Casa A)</Label>
                <Input value={formData.propertyIdentifier} onChange={e => setFormData({...formData, propertyIdentifier: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Valor do Aluguel</Label>
                <Input value={formData.monthlyRent} onChange={e => setFormData({...formData, monthlyRent: applyRealMask(e.target.value)})} required placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}