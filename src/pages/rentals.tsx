import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, User, ChevronDown, ChevronUp, Trash2, XCircle } from "lucide-react";
import { getAll as getAllRentals, remove as deleteRental, terminateContract } from "@/services/rentalService";
import { getAll as getAllProperties, update as updateProperty } from "@/services/propertyService";
import { getAll as getAllTenants, update as updateTenant } from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import { RentalFormDialog } from "@/components/rentals/RentalFormDialog";
import type { Rental, Property, Tenant, Location } from "@/types";
import { formatCurrency } from "@/lib/masks";
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

export default function RentalsPage() {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);
  const [showInactive, setShowInactive] = useState(false);

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

  const availableProperties = properties.filter((p) => p.status === "available");
  const availableTenants = tenants.filter((t) => t.status === "active");
  const vacantProperties = properties.filter((p) => p.status === "available");
  const activeRentals = rentals.filter((r) => r.isActive);
  const inactiveRentals = rentals.filter((r) => !r.isActive);
  const canCreateRental = availableProperties.length > 0 && availableTenants.length > 0;

  const getLocationName = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.name || "Local não encontrado";
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

  const handleEndContract = async (rental: Rental) => {
    try {
      await terminateContract(rental.id);
      
      // Update property and tenant status
      if (rental.propertyId) {
        await updateProperty(rental.propertyId, { status: "available" });
      }
      if (rental.tenantId) {
        await updateTenant(rental.tenantId, { status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Contrato encerrado com sucesso!",
      });
      
      loadData();
    } catch (error) {
      console.error("Error ending contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar o contrato.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRental = async () => {
    if (!rentalToDelete) return;

    try {
      await updateProperty(rentalToDelete.propertyId, { status: "available" });
      await updateTenant(rentalToDelete.tenantId, { status: "active" });
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

  const handleViewRental = (rental: Rental) => {
    setSelectedRental(rental);
    setIsViewMode(true);
    setIsRentalDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRental(null);
    setIsViewMode(false);
    setIsRentalDialogOpen(true);
  };

  return (
    <>
      <SEO title="Locações - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Locações</h1>
              <p className="text-muted-foreground">Gerencie os contratos de locação</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Locação
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-4 w-4" />
                  Imóveis Vagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vacantProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum imóvel disponível</p>
                ) : (
                  <div className="space-y-2">
                    {vacantProperties.map((property) => {
                      const location = locations.find(loc => loc.id === property.locationId);
                      return (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {location?.name || "Local não encontrado"}
                              {property.complement && ` - ${property.complement}`}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap ml-2">
                            {formatCurrency(property.value || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Inquilinos Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum inquilino disponível</p>
                ) : (
                  <div className="space-y-2">
                    {availableTenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm font-medium truncate flex-1">{tenant.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {activeRentals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Locações Ativas</CardTitle>
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
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleViewRental(rental)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-blue-600">
                              {location?.name || "Local não encontrado"}
                            </h3>
                            <Badge className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-xs font-medium rounded-md">
                              Ativa
                            </Badge>
                          </div>

                          {property?.complement && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {property.complement}
                            </p>
                          )}

                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inquilino:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{tenant?.name || "-"}</p>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Valor</p>
                              <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(rental.value)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Início: {formatDate(rental.startDate)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const confirmEnd = confirm("Tem certeza que deseja encerrar este contrato?");
                                  if (confirmEnd) handleEndContract(rental);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRentalToDelete(rental);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-lg font-semibold text-blue-600">
                                {location?.name || "Local não encontrado"}
                              </h3>
                              <Badge className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs font-medium rounded-md">
                                Inativa
                              </Badge>
                            </div>

                            {property?.complement && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {property.complement}
                              </p>
                            )}

                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inquilino:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{tenant?.name || "-"}</p>
                            </div>

                            <div className="mb-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400">Valor</p>
                              <p className="text-2xl font-bold text-gray-600">
                                {formatCurrency(rental.value)}
                              </p>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Término: {formatDate(rental.endDate)}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {activeRentals.length === 0 && inactiveRentals.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma locação cadastrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira locação
                </p>
                <Button onClick={handleCreateNew} disabled={!canCreateRental}>
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
          properties={properties}
          tenants={tenants}
          onSuccess={loadData}
          rental={selectedRental}
          isViewMode={isViewMode}
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