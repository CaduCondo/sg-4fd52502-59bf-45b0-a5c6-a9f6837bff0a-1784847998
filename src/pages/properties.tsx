import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, configStorage } from "@/lib/storage";
import { Property, Config } from "@/types";
import { Building2, Plus, Edit, Trash2, Search, MapPin, Eye, LayoutList, Grid, Building, DollarSign } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, maskCurrency, maskCEP, fetchAddressByCEP, applyCurrencyMask, formatCurrencyInput } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Properties() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied">("all");
  const [filterLocal, setFilterLocal] = useState("");
  const [sortBy, setSortBy] = useState<"local" | "status" | "value">("local");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
    description: "",
    location: "", // Updated
    type: "",
    monthlyRent: "",
    status: "available" as "available" | "occupied",
  });
  const [availableLocals, setAvailableLocals] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadProperties();
    loadLocations();
  }, [router]);

  const loadLocations = () => {
    const settings = configStorage.get();
    const sortedLocations = (settings.locations || []).sort((a, b) => a.localeCompare(b));
    setAvailableLocations(sortedLocations);
  };

  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) || // Fix local -> location
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.complement && p.complement.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (filterLocal) {
      filtered = filtered.filter(p => p.location === filterLocal);
    }

    // Sorting
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
  }, [searchTerm, filterStatus, filterLocal, sortBy, properties]);

  const loadProperties = () => {
    setProperties(propertyStorage.getAll());
  };

  const handleCEPChange = async (cep: string) => {
    const masked = maskCEP(cep);
    setFormData({ ...formData, cep: masked });

    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      const addressData = await fetchAddressByCEP(cleanCEP);
      setLoadingCEP(false);

      if (addressData) {
        setFormData(prev => ({
          ...prev,
          cep: masked,
          address: addressData.logradouro || "",
          state: addressData.uf || "SP"
        }));
      }
    }
  };

  const handleViewProperty = (property: Property) => {
    setViewingProperty(property);
  };

  const getStatusColor = (status: string) => {
    return status === "available" 
      ? "bg-emerald-100 text-emerald-800" 
      : "bg-blue-100 text-blue-800";
  };

  const getStatusLabel = (status: string) => {
    return status === "available" ? "Disponível" : "Ocupado";
  };

  const handleBuscaCEP = async () => {
    if (formData.cep.length >= 8) {
      setLoadingCEP(true);
      const data = await fetchAddressByCEP(formData.cep);
      setLoadingCEP(false);
      if (data) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const propertyData: Property = {
      id: editingProperty ? editingProperty.id : crypto.randomUUID(),
      location: formData.location,
      type: formData.type || "Residencial",
      cep: formData.cep,
      address: formData.address,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      description: formData.description,
      monthlyRent: parseCurrency(formData.monthlyRent),
      value: parseCurrency(formData.monthlyRent), // Use monthlyRent as value
      status: formData.status,
      createdAt: editingProperty ? editingProperty.createdAt : new Date().toISOString()
    };

    if (editingProperty) {
      propertyStorage.update(propertyData);
      toast({ title: "Sucesso", description: "Imóvel atualizado com sucesso!" });
    } else {
      propertyStorage.save(propertyData);
      toast({ title: "Sucesso", description: "Imóvel cadastrado com sucesso!" });
    }

    loadProperties(); // Refresh list immediately
    resetForm();
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const handleEdit = (property: Property) => {
    setFormData({
      address: property.address,
      number: property.number,
      complement: property.complement || "",
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      cep: property.cep,
      description: property.description || "",
      location: property.location, // Updated
      type: property.type,
      monthlyRent: property.monthlyRent 
        ? property.monthlyRent.toFixed(2).replace(".", ",") 
        : "",
      status: property.status,
    });
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este imóvel?")) {
      propertyStorage.delete(id);
      loadProperties();
    }
  };

  const resetForm = () => {
    setFormData({
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      cep: "",
      description: "",
      location: "", // Use location instead of local
      type: "",
      monthlyRent: "",
      status: "available",
    });
    setEditingProperty(null);
    setIsDialogOpen(false);
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setFormData({ ...formData, monthlyRent: masked });
  };

  return (
    <>
      <SEO 
        title="Imóveis - Gerenciador de Locações" 
        description="Gerencie seus imóveis"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
              <p className="text-slate-600 mt-2">Gerenciamento de imóveis cadastrados</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Novo Imóvel</span>
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por local ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="occupied">Ocupado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (A-Z)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="value">Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Card Removed */}
          <div className="mt-4 flex items-center justify-between">
            <Badge variant="outline" className="text-sm">
              {filteredProperties.length} {filteredProperties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
            </Badge>
            {(searchTerm || filterStatus !== "all" || filterLocal) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterLocal("");
                  setFilterStatus("all");
                  setSortBy("local");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-slate-500">Nenhum imóvel encontrado.</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="bg-white rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow 
                      key={property.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleViewProperty(property)}
                    >
                      <TableCell className="font-medium">{property.location}</TableCell>
                      <TableCell>{property.address}, {property.number}</TableCell>
                      <TableCell>{formatCurrency(property.monthlyRent)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(property.status)}>
                          {getStatusLabel(property.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); confirmDelete(property.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <StaggerContainer staggerDelay={0.08}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <Card 
                    key={property.id} 
                    className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/properties/${property.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                            {property.address}, {property.number}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProperty(property);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-3">
                        {/* Local */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{property.location}</span>
                        </div>

                        {/* Complemento */}
                        {property.complement && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-500">{property.complement}</span>
                          </div>
                        )}

                        {/* Valor do Aluguel */}
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <span className="text-slate-700 font-semibold">
                            {formatCurrency(property.monthlyRent)}/mês
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="pt-2">
                          <Badge variant={property.status === "available" ? "default" : "secondary"}>
                            {property.status === "available" ? "Disponível" : "Ocupado"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>

                    {/* Card Footer with Delete Button */}
                    <CardFooter className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(property.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </StaggerContainer>
          )}
        </div>

        {/* View Details Dialog */}
        <Dialog open={!!viewingProperty} onOpenChange={(open) => !open && setViewingProperty(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Imóvel</DialogTitle>
              <DialogDescription>Visualização completa dos dados</DialogDescription>
            </DialogHeader>
            {viewingProperty && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Local</Label>
                    <p className="font-medium">{viewingProperty.location}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{viewingProperty.type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{viewingProperty.address}, {viewingProperty.number}</p>
                  </div>
                  {viewingProperty.complement && (
                    <div>
                      <Label className="text-muted-foreground">Complemento</Label>
                      <p className="font-medium">{viewingProperty.complement}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Bairro</Label>
                    <p className="font-medium">{viewingProperty.neighborhood}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CEP</Label>
                    <p className="font-medium">{viewingProperty.cep}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade/UF</Label>
                    <p className="font-medium">{viewingProperty.city}/{viewingProperty.state}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Aluguel</Label>
                    <p className="font-medium text-green-600">{formatCurrency(viewingProperty.monthlyRent)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={viewingProperty.status === "available" ? "default" : "secondary"}>
                      {viewingProperty.status === "available" ? "Disponível" : "Ocupado"}
                    </Badge>
                  </div>
                </div>

                {viewingProperty.description && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="text-sm mt-1 bg-slate-50 p-3 rounded-md">{viewingProperty.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setViewingProperty(null)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setViewingProperty(null);
                handleEdit(viewingProperty);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
              <DialogDescription>
                {editingProperty ? "Atualize as informações do imóvel" : "Adicione um novo imóvel ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Local</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {configStorage.get().locations.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Cadastre locais nas Configurações
                      </SelectItem>
                    ) : (
                      configStorage.get().locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Hidden Type Field */}
                
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Valor Aluguel *</Label>
                  <Input
                    id="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: applyCurrencyMask(e.target.value) })}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                      maxLength={9}
                      placeholder="00000-000"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleBuscaCEP}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento *</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    required
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor do Aluguel</Label>
                <Input
                  id="value"
                  placeholder="R$ 0,00"
                  value={formData.monthlyRent}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setFormData({ ...formData, monthlyRent: formatted });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "available" | "occupied" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="occupied">Ocupado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (deletingId) handleDelete(deletingId);
                  setShowDeleteDialog(false);
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}