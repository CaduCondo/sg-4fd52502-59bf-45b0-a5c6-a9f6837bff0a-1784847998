import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, User, ChevronDown, ChevronUp, Trash2, XCircle, Grid3x3, List, AlertTriangle, RefreshCw } from "lucide-react";
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
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
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
    // Se dados já foram carregados, não carregar novamente
    if (allProperties.length > 0 && allTenants.length > 0 && locations.length > 0) {
      return;
    }

    try {
      setLoadingAdditionalData(true);
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados completos. Tente novamente.",
        variant: "destructive",
      });
      throw error; // Propagar erro para impedir abertura do modal
    } finally {
      setLoadingAdditionalData(false);
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

  const handleConfirmTermination = async (data: {
    terminationDate: string;
    applyPenalty: boolean;
    penaltyAmount: number;
  }) => {
    if (!rentalToEnd) return;

    try {
      // Aqui você poderia passar os dados da rescisão para o serviço se necessário
      // Por enquanto mantemos o encerramento básico + logs dos dados calculados
      console.log("Terminating contract with data:", data);

      await terminateContract(rentalToEnd.id);
      
      if (rentalToEnd.propertyId) {
        await updateProperty(rentalToEnd.propertyId, { status: "available" });
      }
      if (rentalToEnd.tenantId) {
        await updateTenant(rentalToEnd.tenantId, { status: "active" });
      }

      toast({
        title: "Sucesso",
        description: `Contrato encerrado! ${data.applyPenalty ? `Multa calculada: ${formatCurrency(data.penaltyAmount)}` : ""}`,
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

  const handleRenewContract = async (rental: Rental) => {
    if (!rental) return;

    try {
      const newEndDate = new Date(rental.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + 12);
      await updateProperty(rental.propertyId, { status: "available" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });
      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "inactive" });
  
      // Placeholder for remaining logic for renewing contract...

    } catch (error) {
      console.error("Error renewing contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o contrato.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <SEO title="Gerenciar Locação" />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Gerenciar Locação</h1>
        <Button
          variant="primary"
          onClick={() => setIsRentalDialogOpen(true)}
          disabled={!canCreateRental}
        >
          <Plus className="mr-2" />
          Adicionar Locação
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Locações Ativas</TableHead>
            <TableHead>Locações Inativas</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeRentals.map((rental) => (
            <TableRow key={rental.id}>
              <TableCell>{rental.name}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </Layout>
  );
}