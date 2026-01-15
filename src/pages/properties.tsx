import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SEO } from "@/components/SEO";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, configStorage } from "@/lib/storage";
import { Property, Config } from "@/types";
import { Plus, Search, Trash2, MapPin, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, applyRealMask, parseCurrency } from "@/lib/masks";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied">("all");
  const [sortBy, setSortBy] = useState<"location" | "status" | "value">("location");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    location: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
    type: "",
    monthlyRent: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const config = configStorage.get();
    setLocations(config.locations || []);
    loadProperties();
  }, [router]);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchTerm, filterStatus, sortBy]);

  const loadProperties = () => {
    const data = propertyStorage.getAll();
    setProperties(data);
  };

  const filterAndSortProperties = () => {
    let filtered = [...properties];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.complement && p.complement.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    filtered.sort((a, b) => {
      if (sortBy === "value") {
        return a.monthlyRent - b.monthlyRent;
      }
      if (sortBy === "status") {
        return (a.status || "").localeCompare(b.status || "");
      }
      return (a.location || "").localeCompare(b.location || "");
    });

    setFilteredProperties(filtered);
  };

  const resetForm = () => {
    setFormData({
      location: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      cep: "",
      type: "",
      monthlyRent: "",
    });
    setEditingProperty(null);
    setIsDialogOpen(false);
  };

  const handleSave = () => {
    if (!formData.location || !formData.address || !formData.monthlyRent) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const propertyData: Property = {
      id: editingProperty ? editingProperty.id : crypto.randomUUID(),
      location: formData.location,
      address: formData.address,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      cep: formData.cep,
      type: formData.type,
      monthlyRent: parseCurrency(formData.monthlyRent),
      status: editingProperty ? editingProperty.status : "available",
      createdAt: editingProperty ? editingProperty.createdAt : new Date().toISOString()
    };

    if (editingProperty) {
      propertyStorage.update(propertyData);
      toast({ title: "Sucesso", description: "Imóvel atualizado com sucesso!" });
    } else {
      propertyStorage.save(propertyData);
      toast({ title: "Sucesso", description: "Imóvel cadastrado com sucesso!" });
    }

    resetForm();
    loadProperties();
  };

  const handleEdit = (property: Property) => {
    setFormData({
      location: property.location,
      address: property.address,
      number: property.number,
      complement: property.complement || "",
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      cep: property.cep,
      type: property.type,
      monthlyRent: property.monthlyRent.toString().replace(".", ","),
    });
    setEditingProperty(property);
    setViewingProperty(null);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (propertyToDelete) {
      propertyStorage.delete(propertyToDelete.id);
      toast({ title: "Sucesso", description: "Imóvel excluído com sucesso!" });
      loadProperties();
      setPropertyToDelete(null);
      setIsDeleteOpen(false);
    }
  };

  const handleCardClick = (property: Property) => {
    setViewingProperty(property);
    setIsDialogOpen(true);
  };

  return (
    <>
      <SEO title="Imóveis - Gerenciador de Locações" description="Gerencie seus imóveis" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Imóveis</h1>
              <p className="text-muted-foreground">Gerencie seus imóveis cadastrados</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóvel..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="occupied">Alugado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">Local (A-Z)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="value">Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProperties.map((property, index) => (
              <FloatingCard key={property.id} delay={index * 0.05}>
                <Card 
                  className="group hover:shadow-lg transition-all cursor-pointer relative"
                  onClick={() => handleCardClick(property)}
                >
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold text-sm">{property.location}</span>
                        </div>
                        {property.complement && (
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{property.complement}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-dashed">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Valor:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(property.monthlyRent)}</span>
                      </div>
                      <Badge variant={property.status === "available" ? "default" : "secondary"} className="w-full justify-center">
                        {property.status === "available" ? "Disponível" : "Alugado"}
                      </Badge>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pb-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyToDelete(property);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              </FloatingCard>
            ))}
          </div>
        </div>

        {/* View/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingProperty ? "Detalhes do Imóvel" : editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
            </DialogHeader>

            {viewingProperty && !editingProperty ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Local</Label>
                    <p className="font-medium">{viewingProperty.location}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Complemento</Label>
                    <p className="font-medium">{viewingProperty.complement || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{viewingProperty.address}, {viewingProperty.number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bairro</Label>
                    <p className="font-medium">{viewingProperty.neighborhood}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade/Estado</Label>
                    <p className="font-medium">{viewingProperty.city}/{viewingProperty.state}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CEP</Label>
                    <p className="font-medium">{viewingProperty.cep}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{viewingProperty.type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor do Aluguel</Label>
                    <p className="font-bold text-emerald-600">{formatCurrency(viewingProperty.monthlyRent)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={viewingProperty.status === "available" ? "default" : "secondary"}>
                      {viewingProperty.status === "available" ? "Disponível" : "Alugado"}
                    </Badge>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Fechar</Button>
                  <Button onClick={() => handleEdit(viewingProperty)}>Editar</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Local *</Label>
                    <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({ ...formData, location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Cadastre locais nas Configurações
                          </SelectItem>
                        ) : (
                          locations.sort().map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto 101, Casa 5, etc"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, Avenida..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      maxLength={2}
                      placeholder="SP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="Casa, Apartamento, Comercial..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Valor do Aluguel (R$) *</Label>
                    <Input
                      id="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: applyRealMask(e.target.value) })}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o imóvel "{propertyToDelete?.location} - {propertyToDelete?.complement}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}