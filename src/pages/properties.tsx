import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building2, MapPin, DollarSign, LayoutGrid, List } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import type { Property } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await propertyService.getAll();
      setProperties(data);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = 
      property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.property_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.locationData?.street || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Disponível</Badge>;
      case "occupied":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Alugado</Badge>;
      case "unavailable":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Indisponível</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <SEO 
        title="Imóveis - Gerenciador de Locações" 
        description="Gerencie seus imóveis, visualize status e informações financeiras."
      />
      
      <div className="space-y-8">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus imóveis e acompanhe a ocupação
              </p>
            </div>
            <Button onClick={() => router.push("/properties/new")} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Imóvel
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex flex-1 gap-4 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por local, identificador ou endereço..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="occupied">Alugado</SelectItem>
                  <SelectItem value="unavailable">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                title="Visualização em Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando imóveis...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Nenhum imóvel encontrado</h3>
            <p className="text-slate-500">Tente ajustar os filtros ou adicione um novo imóvel.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <FloatingCard key={property.id} delay={index * 0.05}>
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer group border-slate-200"
                  onClick={() => router.push(`/properties/${property.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold group-hover:text-emerald-600 transition-colors">
                          {property.property_identifier}
                        </CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {property.location}
                        </div>
                      </div>
                      {getStatusBadge(property.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                        {property.locationData ? (
                          <>
                            <p className="font-medium text-slate-900">{property.locationData.street}, {property.locationData.number}</p>
                            <p>{property.locationData.neighborhood} - {property.locationData.city}/{property.locationData.state}</p>
                          </>
                        ) : (
                          <p className="italic text-slate-400">Endereço não disponível</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center text-slate-600">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span className="text-sm capitalize">{property.type === 'residential' ? 'Residencial' : 'Comercial'}</span>
                        </div>
                        <div className="flex items-center font-bold text-emerald-600">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(property.monthly_rent)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FloatingCard>
            ))}
          </div>
        ) : (
          <ScrollReveal delay={0.2}>
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Identificador</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow 
                      key={property.id} 
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/properties/${property.id}`)}
                    >
                      <TableCell className="font-medium">{property.property_identifier}</TableCell>
                      <TableCell>{property.location}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {property.locationData ? (
                          <>
                            {property.locationData.street}, {property.locationData.number} - {property.locationData.neighborhood}
                          </>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{property.type === 'residential' ? 'Residencial' : 'Comercial'}</TableCell>
                      <TableCell>{getStatusBadge(property.status)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatCurrency(property.monthly_rent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollReveal>
        )}
      </div>
    </Layout>
  );
}