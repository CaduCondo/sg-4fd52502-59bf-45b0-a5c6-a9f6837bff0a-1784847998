import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, User, ChevronDown, ChevronUp, Trash2, XCircle, Grid3x3, List, AlertTriangle } from "lucide-react";
import { getAll as getAllRentals, remove as deleteRental, terminateContract } from "@/services/rentalService";
import { getAvailable as getAvailableProperties, update as updateProperty, getAll as getAllProperties } from "@/services/propertyService";
import { getActive as getActiveTenants, update as updateTenant, getAll as getAllTenants } from "@/services/tenantService";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateContractAlert, getAlertClasses, getAlertBadgeClasses } from "@/lib/contractAlerts";

export default function RentalsPage() {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);
  const [rentalToEnd, setRentalToEnd] = useState<Rental | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const loadRentalsData = async () => {
    try {
      setLoading(true);
      const rentalsData = await getAllRentals();
      setRentals(rentalsData);
    } catch (error) {
      console.error("Erro ao carregar locações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as locações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableData = async () => {
    try {
      setLoadingAvailable(true);
      // Buscar apenas dados essenciais para os blocos (otimização)
      const [propertiesData, tenantsData] = await Promise.all([
        getAvailableProperties(),
        getActiveTenants(),
      ]);
      setAvailableProperties(propertiesData);
      setAvailableTenants(tenantsData);
    } catch (error) {
      console.error("Erro ao carregar dados disponíveis:", error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const loadAdditionalData = async () => {
    try {
      // Carregar dados adicionais apenas quando necessário (lazy loading)
      const [locationsData, allPropertiesData, allTenantsData] = await Promise.all([
        getAllLocations(),
        getAllProperties(),
        getAllTenants(),
      ]);
      setLocations(locationsData);
      setAllProperties(allPropertiesData);
      setAllTenants(allTenantsData);
    } catch (error) {
      console.error("Erro ao carregar dados adicionais:", error);
    }
  };

  useEffect(() => {
    loadRentalsData();
    loadAvailableData();
  }, []);

  const activeRentals = rentals.filter((r) => r.isActive);
  const inactiveRentals = rentals.filter((r) => !r.isActive);
  const canCreateRental = availableProperties.length > 0 && availableTenants.length > 0;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const confirmEndContract = async () => {
    if (!rentalToEnd) return;

    try {
      await terminateContract(rentalToEnd.id);
      
      if (rentalToEnd.propertyId) {
        await updateProperty(rentalToEnd.propertyId, { status: "available" });
      }
      if (rentalToEnd.tenantId) {
        await updateTenant(rentalToEnd.tenantId, { status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Contrato encerrado com sucesso!",
      });
      
      setRentalToEnd(null);
      await loadRentalsData();
      await loadAvailableData();
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
      await loadRentalsData();
      await loadAvailableData();
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
    // Carregar dados adicionais antes de abrir o formulário
    if (locations.length === 0) {
      loadAdditionalData();
    }
    setSelectedRental(rental);
    setIsViewMode(true);
    setIsRentalDialogOpen(true);
  };

  const handleCreateNew = () => {
    // Carregar dados adicionais antes de abrir o formulário
    if (locations.length === 0) {
      loadAdditionalData();
    }
    setSelectedRental(null);
    setIsViewMode(false);
    setIsRentalDialogOpen(true);
  };

  const handleDialogSuccess = async () => {
    await loadRentalsData();
    await loadAvailableData();
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
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid3x3 className="h-4 w-4 mr-1.5" />
                  Grade
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-none"
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Lista
                </Button>
              </div>
              <Button onClick={handleCreateNew} disabled={!canCreateRental}>
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
                  Imóveis Vagos ({loadingAvailable ? "..." : availableProperties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAvailable ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : availableProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum imóvel disponível</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableProperties.map((property) => {
                      const location = locations.find(loc => loc.id === property.locationId);
                      return (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {property.propertyIdentifier || location?.name || property.location || "Local não encontrado"}
                              {property.complement && ` - ${property.complement}`}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap ml-2">
                            {formatCurrency(property.value || property.monthlyRent || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Inquilinos Disponíveis ({loadingAvailable ? "..." : availableTenants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAvailable ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : availableTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum inquilino disponível</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
                <CardTitle className="text-lg">Locações Ativas ({activeRentals.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeRentals.map((rental) => {
                      const alert = calculateContractAlert(rental.endDate);
                      const alertClasses = getAlertClasses(alert.level);
                      const badgeClasses = getAlertBadgeClasses(alert.level);

                      return (
                        <Card
                          key={rental.id}
                          className={`hover:shadow-lg transition-shadow cursor-pointer border-2 ${alertClasses}`}
                          onClick={() => handleViewRental(rental)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-blue-600 truncate">
                                  {rental.property?.location || "Local não encontrado"}
                                </h3>
                                {rental.property?.complement && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {rental.property.complement}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                                <Badge className={`${badgeClasses} px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap`}>
                                  Ativa
                                </Badge>
                                {alert.level !== "normal" && (
                                  <Badge variant="outline" className={`text-xs whitespace-nowrap ${
                                    alert.level === "critical" 
                                      ? "border-red-500 text-red-700 bg-red-50" 
                                      : "border-yellow-500 text-yellow-700 bg-yellow-50"
                                  }`}>
                                    <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span>{alert.message}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inquilino:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{rental.tenant?.name || "-"}</p>
                            </div>

                            <div className="flex items-end justify-between">
                              <div className="mb-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  Valor do Aluguel
                                </p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(rental.value || 0)}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRentalToEnd(rental);
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
                ) : (
                  <div className="rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Local</TableHead>
                          <TableHead>Complemento</TableHead>
                          <TableHead>Inquilino</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data Início</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRentals.map((rental) => {
                          const alert = calculateContractAlert(rental.endDate);
                          const alertClasses = getAlertClasses(alert.level);
                          const badgeClasses = getAlertBadgeClasses(alert.level);

                          return (
                            <TableRow
                              key={rental.id}
                              className={`cursor-pointer ${alertClasses}`}
                              onClick={() => handleViewRental(rental)}
                            >
                              <TableCell className="font-medium text-blue-600">
                                {rental.property?.location || "Local não encontrado"}
                              </TableCell>
                              <TableCell>{rental.property?.complement || "-"}</TableCell>
                              <TableCell>{rental.tenant?.name || "-"}</TableCell>
                              <TableCell className="font-bold text-emerald-600">
                                {formatCurrency(rental.value || 0)}
                              </TableCell>
                              <TableCell>{formatDate(rental.startDate)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge className={badgeClasses}>
                                    Ativa
                                  </Badge>
                                  {alert.level !== "normal" && (
                                    <Badge variant="outline" className={`text-xs ${
                                      alert.level === "critical" 
                                        ? "border-red-500 text-red-700" 
                                        : "border-yellow-500 text-yellow-700"
                                    }`}>
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {alert.message}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRentalToEnd(rental);
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
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inactiveRentals.map((rental) => {
                        return (
                          <Card key={rental.id} className="opacity-75">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-blue-600">
                                  {rental.property?.location || "Local não encontrado"}
                                </h3>
                                <Badge className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs font-medium rounded-md">
                                  Inativa
                                </Badge>
                              </div>

                              {rental.property?.complement && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {rental.property.complement}
                                </p>
                              )}

                              <div className="mb-3">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Inquilino:</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{rental.tenant?.name || "-"}</p>
                              </div>

                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor</p>
                                  <p className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(rental.value || 0)}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Término: {formatDate(rental.endDate || "")}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Local</TableHead>
                            <TableHead>Complemento</TableHead>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data Término</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inactiveRentals.map((rental) => {
                            return (
                              <TableRow key={rental.id} className="opacity-75">
                                <TableCell className="font-medium text-blue-600">
                                  {rental.property?.location || "Local não encontrado"}
                                </TableCell>
                                <TableCell>{rental.property?.complement || "-"}</TableCell>
                                <TableCell>{rental.tenant?.name || "-"}</TableCell>
                                <TableCell className="font-bold text-gray-600">
                                  {formatCurrency(rental.value || 0)}
                                </TableCell>
                                <TableCell>{formatDate(rental.endDate || "")}</TableCell>
                                <TableCell>
                                  <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
                                    Inativa
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
          properties={selectedRental ? allProperties : availableProperties}
          tenants={selectedRental ? allTenants : availableTenants}
          onSuccess={handleDialogSuccess}
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

        <AlertDialog open={!!rentalToEnd} onOpenChange={() => setRentalToEnd(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar encerramento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja encerrar este contrato? O imóvel ficará disponível e o inquilino voltará ao status ativo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmEndContract} className="bg-yellow-500 text-white hover:bg-yellow-600">
                Encerrar Contrato
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}