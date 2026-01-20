import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Plus, User, Building2, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { getAll as getAllRentals, create as createRental, remove as deleteRental, update as updateRental } from "@/services/rentalService";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import { RentalFormDialog } from "@/components/rentals/RentalFormDialog";
import type { Rental, Property, Tenant, Location } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { useRouter } from "next/router";
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

export default function Rentals() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rentalsData, propertiesData, tenantsData, locationsData] = await Promise.all([
        getAllRentals(),
        getAllProperties(),
        getAllTenants(),
        getAllLocations(),
      ]);

      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar imóveis e inquilinos disponíveis
  const availableProperties = properties.filter((p) => p.status === "available");
  const availableTenants = tenants.filter((t) => {
    // Inquilino disponível = não está em nenhuma locação ativa
    const isInActiveRental = activeRentals.some((r) => r.tenantId === t.id);
    return !isInActiveRental;
  });

  // Filtrar locações ativas e inativas
  const activeRentals = rentals.filter((r) => r.isActive);
  const inactiveRentals = rentals.filter((r) => !r.isActive);

  // Verificar se pode criar nova locação
  const canCreateRental = availableProperties.length > 0 && availableTenants.length > 0;

  const getLocationName = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.name || "Local não encontrado";
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant?.name || "Inquilino não encontrado";
  };

  const getPropertyByRental = (rental: Rental) => {
    return properties.find((p) => p.id === rental.propertyId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDeleteRental = async () => {
    if (!rentalToDelete) return;

    try {
      await deleteRental(rentalToDelete.id);
      toast({
        title: "Sucesso!",
        description: "Locação removida com sucesso.",
      });
      setRentalToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao deletar locação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a locação.",
        variant: "destructive",
      });
    }
  };

  const handleViewRental = (rentalId: string) => {
    router.push(`/rentals/${rentalId}`);
  };

  return (
    <>
      <SEO title="Locações - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          {/* Header com Botão Nova Locação */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Home className="h-8 w-8" />
                Locações
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeRentals.length} locações ativas
              </p>
            </div>
            <Button
              onClick={() => setIsRentalDialogOpen(true)}
              disabled={!canCreateRental}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Locação
            </Button>
          </div>

          {/* Duas Colunas: Imóveis Vagos e Inquilinos Disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna 1: Imóveis Vagos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Imóveis Vagos ({availableProperties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum imóvel disponível
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableProperties.map((property) => {
                      const location = locations.find((loc) => loc.id === property.locationId);
                      return (
                        <Card className="hover:shadow-md transition-shadow" key={property.id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-semibold text-blue-600 truncate">
                                {location?.name || "Local não encontrado"}
                              </span>
                              {property.complement && (
                                <span className="text-sm text-muted-foreground truncate border-l pl-2">
                                  {property.complement}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-emerald-600 whitespace-nowrap ml-2">
                              {formatCurrency(property.value)}
                            </span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 2: Inquilinos Disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Inquilinos Disponíveis ({availableTenants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum inquilino disponível
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableTenants.map((tenant) => (
                      <Card className="hover:shadow-md transition-shadow" key={tenant.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {tenant.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold truncate">{tenant.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                            {tenant.phone}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Rentals Section */}
          {activeRentals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Locações Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRentals.map((rental) => {
                    const property = getPropertyByRental(rental);
                    const location = property ? locations.find((loc) => loc.id === property.locationId) : null;
                    const tenant = tenants.find((t) => t.id === rental.tenantId);

                    return (
                      <Card 
                        key={rental.id} 
                        className="hover:shadow-lg transition-shadow cursor-pointer relative p-4"
                        onClick={() => handleViewRental(rental.id)}
                      >
                        <div className="space-y-3">
                          {/* Header: Location name + Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-semibold text-blue-600">
                              {location?.name || "Local não encontrado"}
                            </h3>
                            <Badge variant="default" className="shrink-0">Ativa</Badge>
                          </div>

                          {/* Complement */}
                          {property?.complement && (
                            <p className="text-sm text-muted-foreground">
                              {property.complement}
                            </p>
                          )}

                          {/* Tenant */}
                          <div>
                            <p className="text-sm font-semibold">Inquilino:</p>
                            <p className="text-sm text-muted-foreground">{tenant?.name || "-"}</p>
                          </div>

                          {/* Value */}
                          <div>
                            <p className="text-sm text-muted-foreground">Valor</p>
                            <p className="text-2xl font-bold text-emerald-600">
                              {formatCurrency(rental.value)}
                            </p>
                          </div>

                          {/* Start date */}
                          <p className="text-sm text-muted-foreground">
                            Início: {formatDate(rental.startDate)}
                          </p>

                          {/* Delete button */}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute bottom-4 right-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRentalToDelete(rental);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Locações Inativas (Colapsável) */}
          {inactiveRentals.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowInactive(!showInactive)}
              >
                <CardTitle className="flex items-center justify-between">
                  <span>Locações Inativas ({inactiveRentals.length})</span>
                  {showInactive ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {showInactive && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inactiveRentals.map((rental) => {
                      const property = getPropertyByRental(rental);
                      const location = property ? locations.find((loc) => loc.id === property.locationId) : null;
                      const tenant = tenants.find((t) => t.id === rental.tenantId);

                      return (
                        <Card key={rental.id} className="opacity-75">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-blue-600">
                              {location?.name || "Local não encontrado"}
                            </CardTitle>
                            {property?.complement && (
                              <p className="text-sm text-muted-foreground">
                                {property.complement}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">Inquilino:</p>
                              <p className="text-sm text-muted-foreground">{tenant?.name || "-"}</p>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Valor</p>
                                <p className="font-semibold text-muted-foreground">
                                  {formatCurrency(rental.value)}
                                </p>
                              </div>
                              <Badge variant="secondary">Inativa</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Término: {formatDate(rental.endDate)}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Mensagem quando não há locações */}
          {activeRentals.length === 0 && inactiveRentals.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma locação cadastrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira locação
                </p>
                <Button onClick={() => setIsRentalDialogOpen(true)} disabled={!canCreateRental}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Locação
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <RentalFormDialog
          open={isRentalDialogOpen}
          onOpenChange={setIsRentalDialogOpen}
          availableProperties={availableProperties}
          availableTenants={availableTenants}
          onSuccess={loadData}
        />

        <AlertDialog open={!!rentalToDelete} onOpenChange={() => setRentalToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta locação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRental} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}