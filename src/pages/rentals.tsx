import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, User, ChevronDown, ChevronUp, Trash2, XCircle, Grid3x3, List, AlertTriangle, RefreshCw, Ban, MapPin, Eye, FileText, Calendar, Search } from "lucide-react";
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
import { RentalTerminationDialog } from "@/components/rentals/RentalTerminationDialog";
import { useContractExpiration } from "@/hooks/useContractExpiration";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default function RentalsPage() {
  const { toast } = useToast();
  const router = useRouter();
  useContractExpiration();
  
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
  
  const [dataCache, setDataCache] = useState({
    loaded: false,
    timestamp: 0,
  });
  
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<Rental | null>(null);
  const [rentalToEnd, setRentalToEnd] = useState<Rental | null>(null);
  const [rentalToRenew, setRentalToRenew] = useState<Rental | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [rentalTerminations, setRentalTerminations] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "terminated">("active");

  // Helper para formatar data
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }, []);

  // Carregar informações de rescisão
  const loadTerminationInfo = useCallback(async (activeRentals: Rental[]) => {
    try {
      const terminationMap: Record<string, boolean> = {};
      
      await Promise.all(
        activeRentals.map(async (rental) => {
          const { data: payments } = await supabase
            .from("payments")
            .select("notes")
            .eq("rental_id", rental.id);
          
          const hasTermination = payments?.some(p => p.notes?.includes("Rescisão de Contrato"));
          terminationMap[rental.id] = hasTermination || false;
        })
      );
      
      setRentalTerminations(terminationMap);
    } catch (error) {
      console.error("Erro ao carregar informações de rescisão:", error);
    }
  }, []);

  // Carregar dados de locações
  const loadRentalsData = useCallback(async () => {
    try {
      setLoading(true);
      const rentalsData = await getAllRentals();
      setRentals(rentalsData);
      
      // DEBUG: Log rental data structure
      console.log("🔍 DEBUG Rentals - Sample rental:", rentalsData[0]);
      console.log("🔍 DEBUG Rentals - Property data:", rentalsData[0]?.property);
      console.log("🔍 DEBUG Rentals - LocationId:", rentalsData[0]?.property?.locationId);
      console.log("🔍 DEBUG Rentals - Location name:", rentalsData[0]?.property?.location);
      
      await loadTerminationInfo(rentalsData.filter(r => r.isActive));
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
  }, [toast, loadTerminationInfo]);

  // Carregar dados disponíveis
  const loadAvailableData = useCallback(async () => {
    try {
      setLoadingAvailable(true);
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
  }, []);

  // Carregar dados adicionais com cache
  const loadAdditionalData = useCallback(async () => {
    const now = Date.now();
    
    if (dataCache.loaded && (now - dataCache.timestamp) < CACHE_DURATION) {
      return;
    }

    try {
      setLoadingAdditionalData(true);
      
      const [locationsData, allPropertiesData, allTenantsData] = await Promise.all([
        getAllLocations(),
        getAllProperties(),
        getAllTenants(),
      ]);
      
      // DEBUG: Log locations data
      console.log("🔍 DEBUG Locations - Total:", locationsData.length);
      console.log("🔍 DEBUG Locations - Sample:", locationsData[0]);
      
      setLocations(locationsData);
      setAllProperties(allPropertiesData);
      setAllTenants(allTenantsData);
      setDataCache({ loaded: true, timestamp: now });
    } catch (error) {
      console.error("❌ Erro ao carregar dados adicionais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados completos. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoadingAdditionalData(false);
    }
  }, [dataCache.loaded, dataCache.timestamp, toast]);

  useEffect(() => {
    loadRentalsData();
    loadAvailableData();
  }, [loadRentalsData, loadAvailableData]);

  // Filtrar locações
  const filteredRentals = useMemo(() => {
    return rentals.filter((rental) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        rental.tenant?.name?.toLowerCase().includes(searchLower) ||
        rental.property?.location?.toLowerCase().includes(searchLower) ||
        rental.property?.complement?.toLowerCase().includes(searchLower);

      if (statusFilter === "all") return matchesSearch;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = rental.endDate && new Date(rental.endDate) < today;
      const effectiveStatus = (rental.isActive && !isExpired) ? "active" : "terminated";

      return matchesSearch && statusFilter === effectiveStatus;
    });
  }, [rentals, searchTerm, statusFilter]);

  const activeRentals = useMemo(() => rentals.filter((r) => r.isActive), [rentals]);
  const canCreateRental = useMemo(() => 
    availableProperties.length > 0 && availableTenants.length > 0, 
    [availableProperties.length, availableTenants.length]
  );

  // Handler para rescisão
  const handleTerminateRental = useCallback(async (data: {
    terminationDate: string;
    applyPenalty: boolean;
    penaltyAmount: number;
    depositAmount: number;
  }) => {
    if (!rentalToEnd) return;

    try {
      const { processContractTermination } = await import("@/services/terminationService");
      
      await processContractTermination({
        rentalId: rentalToEnd.id,
        terminationDate: data.terminationDate,
        penaltyAmount: data.penaltyAmount,
        paymentDay: rentalToEnd.paymentDay || 1,
        depositAmount: data.depositAmount,
        monthlyRent: rentalToEnd.value || 0,
      });

      toast({
        title: "Sucesso",
        description: "Rescisão processada com sucesso! Aguardando pagamento final.",
        className: "bg-green-500 text-white border-none",
      });
      
      await loadRentalsData();
    } catch (error) {
      console.error("❌ Erro ao processar rescisão:", error);
      throw error;
    }
  }, [rentalToEnd, toast, loadRentalsData]);

  // Handler para confirmar rescisão
  const handleConfirmTermination = useCallback(async (data: {
    terminationDate: string;
    applyPenalty: boolean;
    penaltyAmount: number;
    depositAmount: number;
  }) => {
    try {
      await handleTerminateRental(data);
      setRentalToEnd(null);
    } catch (error) {
      console.error("❌ Error ending contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a rescisão.",
        variant: "destructive",
      });
    }
  }, [handleTerminateRental, toast]);

  // Handler para renovar locação
  const handleRenewRental = useCallback(async () => {
    if (!rentalToRenew) return;

    try {
      const currentEndDate = new Date(rentalToRenew.endDate);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      const { update: updateRental } = await import("@/services/rentalService");
      await updateRental(rentalToRenew.id, {
        endDate: newEndDate.toISOString().split("T")[0],
      });

      toast({
        title: "Sucesso",
        description: `Contrato renovado com sucesso! Nova data final: ${formatDate(newEndDate.toISOString())}`,
      });

      setRentalToRenew(null);
      await loadRentalsData();
    } catch (error) {
      console.error("Error renewing contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o contrato.",
        variant: "destructive",
      });
    }
  }, [rentalToRenew, toast, formatDate, loadRentalsData]);

  // Handler para deletar locação
  const handleDeleteRental = useCallback(async () => {
    if (!rentalToDelete) return;

    try {
      const { deletePaymentsByRentalId } = await import("@/services/paymentService");
      await deletePaymentsByRentalId(rentalToDelete.id);
      await deleteRental(rentalToDelete.id);
      await updateProperty(rentalToDelete.propertyId, { status: "available" });
      await updateTenant(rentalToDelete.tenantId, { status: "active" });

      toast({
        title: "Sucesso!",
        description: "Locação e todos os pagamentos associados foram removidos.",
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
  }, [rentalToDelete, toast, loadRentalsData, loadAvailableData]);

  // Handler para visualizar locação
  const handleViewRental = useCallback(async (rental: Rental) => {
    try {
      await loadAdditionalData();
      setSelectedRental(rental);
      setIsViewMode(true);
      setIsRentalDialogOpen(true);
    } catch (error) {
      // Erro já foi tratado no loadAdditionalData
    }
  }, [loadAdditionalData]);

  // Handler para criar nova locação
  const handleCreateNew = useCallback(async () => {
    try {
      await loadAdditionalData();
      setSelectedRental(null);
      setIsViewMode(false);
      setIsRentalDialogOpen(true);
    } catch (error) {
      // Erro já foi tratado no loadAdditionalData
    }
  }, [loadAdditionalData]);

  // Handler de sucesso do diálogo
  const handleDialogSuccess = useCallback(async () => {
    await loadRentalsData();
    await loadAvailableData();
  }, [loadRentalsData, loadAvailableData]);

  const handleViewDetails = useCallback((rental: Rental) => {
    router.push(`/rentals/${rental.id}`);
  }, [router]);

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

          {/* Vacant Properties Card */}
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
                              {location?.name || property.location || "Local não encontrado"}
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

          {/* Filtros de Busca e Status */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por inquilino, local ou complemento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-[250px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">
                      Status:
                    </span>
                    <Select
                      value={statusFilter}
                      onValueChange={(value: "all" | "active" | "terminated") => setStatusFilter(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="terminated">Encerrado</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rentals List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-bold">
                Contratos de Locação ({filteredRentals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredRentals.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-center py-8">
                    {searchTerm || statusFilter !== "all" 
                      ? "Nenhuma locação encontrada com os filtros aplicados."
                      : "Nenhuma locação cadastrada ainda."}
                  </p>
                  {statusFilter === "all" && !searchTerm && (
                    <div className="flex justify-center">
                      <Button onClick={handleCreateNew} disabled={!canCreateRental}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Locação
                      </Button>
                    </div>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRentals.map((rental) => {
                    const alert = calculateContractAlert(rental.endDate);
                    const isExpired = rental.endDate && new Date(rental.endDate) < new Date(new Date().setHours(0,0,0,0));
                    const isVisuallyActive = rental.isActive && !isExpired;
                    
                    const alertClasses = isVisuallyActive ? getAlertClasses(alert.level) : "";
                    const badgeClasses = getAlertBadgeClasses(alert.level);

                    return (
                      <Card
                        key={rental.id}
                        className={`hover:shadow-lg transition-shadow cursor-pointer border-2 ${alertClasses} ${!isVisuallyActive ? "opacity-75 bg-slate-50" : ""}`}
                        onClick={() => handleViewRental(rental)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Home className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <h3 className="text-lg font-semibold text-blue-600 truncate">
                                  {(() => {
                                    const foundLocation = locations.find(loc => loc.id === rental.property?.locationId);
                                    console.log("🔍 DEBUG Card Render:", {
                                      rentalId: rental.id,
                                      propertyId: rental.property?.id,
                                      locationId: rental.property?.locationId,
                                      foundLocation: foundLocation?.name,
                                      propertyLocation: rental.property?.location,
                                      locationsArrayLength: locations.length
                                    });
                                    return foundLocation?.name || rental.property?.location || "Local não encontrado";
                                  })()}
                                </h3>
                              </div>
                              {rental.property?.complement && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                                  {rental.property.complement}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                              {isVisuallyActive ? (
                                <>
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
                                  {rentalTerminations[rental.id] && (
                                    <Badge className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap">
                                      Rescisão
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <Badge className={isExpired && rental.isActive ? "bg-red-100 text-red-700 border-red-200" : "bg-gray-500 hover:bg-gray-600 text-white"}>
                                  Encerrado
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">{rental.tenant?.name || "-"}</p>
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                            </p>
                          </div>

                          <div className="flex items-end justify-between gap-3 pt-3 border-t">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Valor do Aluguel
                              </p>
                              <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(rental.value || 0)}
                              </p>
                            </div>
                            {rental.isActive && (
                              <div className="flex gap-1.5 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRentalToRenew(rental);
                                  }}
                                  title="Renovar Contrato"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRentalToEnd(rental);
                                  }}
                                  title="Rescisão de Contrato"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRentalToDelete(rental);
                                  }}
                                  title="Excluir Locação"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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
                        <TableHead>Data {statusFilter === 'terminated' ? 'Término' : 'Início'}</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRentals.map((rental) => {
                        const alert = calculateContractAlert(rental.endDate);
                        const isExpired = rental.endDate && new Date(rental.endDate) < new Date(new Date().setHours(0,0,0,0));
                        const isVisuallyActive = rental.isActive && !isExpired;
                        
                        const alertClasses = isVisuallyActive ? getAlertClasses(alert.level) : "";
                        const badgeClasses = getAlertBadgeClasses(alert.level);

                        return (
                          <TableRow
                            key={rental.id}
                            className={`cursor-pointer ${alertClasses} ${!isVisuallyActive ? "opacity-75" : ""}`}
                            onClick={() => handleViewRental(rental)}
                          >
                            <TableCell className="font-medium text-blue-600">
                              {rental.property?.location || "Local não encontrado"}
                            </TableCell>
                            <TableCell>{rental.property?.complement || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">{rental.tenant?.name || "-"}</TableCell>
                            <TableCell className="font-bold text-emerald-600">
                              {formatCurrency(rental.value || 0)}
                            </TableCell>
                            <TableCell>{formatDate(statusFilter === 'terminated' ? rental.endDate : rental.startDate)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {isVisuallyActive ? (
                                  <>
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
                                    {rentalTerminations[rental.id] && (
                                      <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                        Rescisão
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge className={isExpired && rental.isActive ? "bg-red-100 text-red-700 border-red-200" : "bg-gray-500 hover:bg-gray-600 text-white"}>
                                    Encerrado
                                  </Badge>
                                )}
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

          {activeRentals.length === 0 && rentals.length === 0 && !loading && (
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
          properties={allProperties}
          tenants={allTenants}
          locations={locations}
          onSuccess={handleDialogSuccess}
          rental={selectedRental}
          isViewMode={isViewMode}
          isLoadingData={loadingAdditionalData}
        />

        <RentalTerminationDialog
          open={!!rentalToEnd}
          onOpenChange={(open) => !open && setRentalToEnd(null)}
          rental={rentalToEnd}
          onConfirm={handleConfirmTermination}
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

        <AlertDialog open={!!rentalToRenew} onOpenChange={() => setRentalToRenew(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Renovação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que você deseja adicionar mais 1 ano de contrato a essa locação?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction onClick={handleRenewRental} className="bg-green-500 hover:bg-green-600">
                Sim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}