import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Home, User, Calendar, Trash2, Archive, Upload, Users, DollarSign, Building2, Edit, Key, CheckCircle, XCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Rental, Property, Tenant, Payment, Location } from "@/types";
import { rentalService, propertyService, tenantService, paymentService } from "@/services";
import { formatCurrency, applyRealMask, removeMask } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { getCurrentUser } from "@/lib/auth";
import { isAuthenticatedAsync } from "@/lib/auth";
import { getAll as getAllRentals, create as createRental, remove as deleteRental, update as updateRental } from "@/services/rentalService";
import { getAll as getAllProperties, update as updateProperty } from "@/services/propertyService";
import { getAll as getAllTenants, update as updateTenant } from "@/services/tenantService";
import { getAll as getAllPayments, create as createPayment, deletePendingByRentalId, deleteFutureByRentalId } from "@/services/paymentService";
import { getAll as getAllLocations } from "@/services/locationService";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

export default function Rentals() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Helper for currentUser if needed, though we have 'user' from useAuth
  const currentUser = user;

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    value: "",
    paymentDay: "10",
    hasGarage: false,
    garageValue: "",
    attachments: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter available properties and active tenants - sort properties alphabetically
    const availProps = properties
      .filter((p) => p.status === "available")
      .sort((a, b) => a.location ? a.location.localeCompare(b.location) : 0);
    const availTenants = tenants.filter((t) => t.status === "active");
    setAvailableProperties(availProps);
    setAvailableTenants(availTenants);
  }, [properties, tenants]);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const [rentalsData, propertiesData, tenantsData] = await Promise.all([
        getAllRentals(),
        getAllProperties(),
        getAllTenants()
      ]);
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("🔍 Loading rental data...");
      
      const [rentalsData, propertiesData, tenantsData, locationsData] = await Promise.all([
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
        getAllLocations(),
      ]);

      console.log("📦 Rentals loaded:", rentalsData);
      console.log("📦 Properties loaded:", propertiesData);
      console.log("📦 Tenants loaded:", tenantsData);
      console.log("📦 Locations loaded:", locationsData);

      // CRITICAL: Show ALL data without filtering by permissions
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (availableProperties.length === 0) {
      toast({
        title: "Sem imóveis disponíveis",
        description: "Não há imóveis disponíveis para locação.",
        variant: "destructive",
      });
      return;
    }
    if (availableTenants.length === 0) {
      toast({
        title: "Sem inquilinos disponíveis",
        description: "Não há inquilinos ativos disponíveis para locação.",
        variant: "destructive",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      value: "",
      paymentDay: "10",
      hasGarage: false,
      garageValue: "",
      attachments: [],
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({
        ...formData,
        attachments: [...formData.attachments, base64String],
      });
      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi anexado com sucesso.`,
      });
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const generatePayments = async (rental: Rental) => {
    const paymentDay = rental.paymentDay;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const payments: Omit<Payment, "id" | "createdAt">[] = [];
    
    // Parse rental dates as LOCAL dates (not UTC)
    const [startYear, startMonth, startDay] = rental.startDate.split("-").map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    startDate.setHours(0, 0, 0, 0);
    
    let endDate: Date | null = null;
    if (rental.endDate) {
      const [endYear, endMonth, endDay] = rental.endDate.split("-").map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
      endDate.setHours(0, 0, 0, 0);
    }
    
    // Determine starting month/year
    let currentYear: number;
    let currentMonth: number;
    
    if (startDate <= today) {
      // Contract already started - use CURRENT month
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
    } else {
      // Future contract - use contract start month
      currentYear = startDate.getFullYear();
      currentMonth = startDate.getMonth();
    }
    
    // Set max date: contract end or 12 months ahead
    const maxDate = endDate || new Date(currentYear + 1, currentMonth, paymentDay);
    
    // Generate monthly payments
    while (true) {
      // Get last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Adjust payment day if it exceeds month days
      const validDay = Math.min(paymentDay, lastDayOfMonth);
      
      // Create due date in LOCAL timezone
      const dueDate = new Date(currentYear, currentMonth, validDay);
      dueDate.setHours(0, 0, 0, 0);
      
      // Check if exceeded max date
      if (dueDate > maxDate) break;
      
      // Format date as YYYY-MM-DD in LOCAL timezone (NO UTC conversion!)
      const dueDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;
      
      // Create payment
      const payment: Omit<Payment, "id" | "createdAt"> = {
        rentalId: rental.id,
        referenceMonth: currentMonth + 1,
        referenceYear: currentYear,
        dueDate: dueDateString,
        expectedAmount: rental.value,
        paidAmount: 0,
        paymentDate: null,
        status: "pending",
        paymentMethod: null,
        lateFee: 0,
        interest: 0,
        notes: null,
        attachments: [],
        partialPayments: [],
      };
      
      payments.push(payment);
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    // Create all payments in database
    for (const payment of payments) {
      await paymentService.create(payment);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission immediately
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!formData.propertyId || !formData.tenantId || !formData.startDate || !formData.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsSubmitting(false); // Release lock
      return;
    }

    if (formData.hasGarage && !formData.garageValue) {
      toast({
        title: "Valor da vaga obrigatório",
        description: "Informe o valor da vaga de garagem.",
        variant: "destructive",
      });
      setIsSubmitting(false); // Release lock
      return;
    }

    try {
      setIsSubmitting(true);
      const garageValue = formData.hasGarage ? parseFloat(formData.garageValue.replace(/\./g, "").replace(",", ".")) : 0;
      const rentValue = parseFloat(formData.value.replace(/\./g, "").replace(",", "."));

      const rentalData: Omit<Rental, "id" | "createdAt"> = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        value: rentValue + garageValue,
        rentAmount: rentValue,
        monthlyRent: rentValue,
        hasGarage: formData.hasGarage,
        garageValue: formData.hasGarage ? garageValue : undefined,
        paymentDay: parseInt(formData.paymentDay),
        isActive: true,
        status: "active",
        autoRenew: false,
        attachments: formData.attachments,
      };

      const createdRental = await rentalService.create(rentalData);

      // Generate monthly payments
      await generatePayments({ ...createdRental, ...rentalData });

      // Update property status to occupied
      const property = properties.find((p) => p.id === formData.propertyId);
      if (property) {
        await updateProperty(property.id, {
          status: "occupied",
        });
      }

      // Update tenant status to 'rented'
      const tenantToUpdate = tenants.find(t => t.id === createdRental.tenantId);
      if (tenantToUpdate) {
        await updateTenant(tenantToUpdate.id, {
          status: "rented"
        });
      }

      toast({
        title: "Sucesso",
        description: "Locação cadastrada com sucesso! Recebimentos mensais foram gerados.",
      });

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error("Error creating rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar a locação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rental: Rental) => {
    // Check if user is corretor and rental has payments
    if (currentUser?.role === "broker") {
      const payments = await paymentService.getByRentalId(rental.id);
      if (payments.length > 0) {
        toast({
          title: "Ação não permitida",
          description: "Corretores não podem deletar locações que já possuem recebimentos.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!confirm("Tem certeza que deseja excluir esta locação? Todos os recebimentos pendentes serão excluídos.")) return;

    try {
      // Delete all pending payments for this rental
      await paymentService.deletePendingByRentalId(rental.id);

      // Delete rental
      await deleteRental(rental.id);

      // Update property status to available
      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await updateProperty(property.id, {
          status: "available",
        });
      }

      // Update tenant status to active
      const tenant = tenants.find((t) => t.id === rental.tenantId);
      if (tenant) {
        await updateTenant(tenant.id, { status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Locação e recebimentos pendentes excluídos com sucesso!",
      });

      loadData();
    } catch (error) {
      console.error("Error deleting rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a locação.",
        variant: "destructive",
      });
    }
  };

  const handleEndRental = async (rental: Rental) => {
    if (!confirm("Tem certeza que deseja encerrar esta locação? Todos os recebimentos futuros serão excluídos.")) return;

    try {
      // Delete all future payments for this rental
      await paymentService.deleteFutureByRentalId(rental.id);

      // Update rental to inactive
      await updateRental(rental.id, { isActive: false });

      // Update property status to available
      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await updateProperty(property.id, {
          status: "available",
        });
      }

      // Update tenant status to active
      const tenant = tenants.find((t) => t.id === rental.tenantId);
      if (tenant) {
        await updateTenant(tenant.id, { status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Locação encerrada e recebimentos futuros excluídos com sucesso!",
      });

      loadData();
    } catch (error) {
      console.error("Error ending rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar a locação.",
        variant: "destructive",
      });
    }
  };

  const getPropertyInfo = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId);
  };

  const getTenantInfo = (tenantId: string) => {
    return tenants.find((t) => t.id === tenantId);
  };

  const handleCardClick = (rentalId: string) => {
    router.push(`/rentals/${rentalId}`);
  };

  const getTotalValue = () => {
    const rentValue = parseFloat(formData.value.replace(/\./g, "").replace(",", ".")) || 0;
    const garageValue = formData.hasGarage ? parseFloat(formData.garageValue.replace(/\./g, "").replace(",", ".")) || 0 : 0;
    return rentValue + garageValue;
  };

  const activeRentals = rentals.filter((r) => r.isActive);
  const inactiveRentals = rentals.filter((r) => !r.isActive);

  return (
    <>
      <SEO
        title="Locações - Gerenciador de Locações"
        description="Gerencie as locações de imóveis"
      />
      <Layout>
        {/* Header with New Rental Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Key className="h-8 w-8" />
              Locações
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie contratos e aluguéis
            </p>
          </div>
          
          <Button 
            onClick={() => setIsDialogOpen(true)}
            disabled={availableProperties.length === 0 || availableTenants.length === 0}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Locação
          </Button>
        </div>

        {/* 2 Columns: Vacant Properties & Available Tenants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Column 1: Vacant Properties */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5 text-emerald-600" />
                Imóveis Vagos ({availableProperties.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {availableProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum imóvel vago.</p>
              ) : (
                availableProperties.map(prop => {
                   const locName = locations.find(l => l.id === prop.locationId)?.name || "Local não encontrado";
                   return (
                    <div key={prop.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-blue-600">{locName}</div>
                        <div className="text-sm text-muted-foreground">{prop.complement}</div>
                      </div>
                      <div className="font-bold text-emerald-600">
                        {formatCurrency(prop.value ? prop.value / 100 : 0)}
                      </div>
                    </div>
                   );
                })
              )}
            </CardContent>
          </Card>

          {/* Column 2: Available Tenants */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Inquilinos Disponíveis ({availableTenants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
               {availableTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum inquilino disponível.</p>
              ) : (
                availableTenants.map(tenant => (
                  <div key={tenant.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.cpf}</div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Disponível
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Rentals Section */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 border-b pb-2">
             <CheckCircle className="h-5 w-5 text-green-600" />
             Locações Ativas ({activeRentals.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRentals.map((rental) => {
              const property = properties.find((p) => p.id === rental.propertyId);
              const tenant = tenants.find((t) => t.id === rental.tenantId);
              const location = property ? locations.find((loc) => loc.id === property.locationId) : null;
              
              return (
                <Card key={rental.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <div className="font-bold text-lg text-blue-600 truncate">
                      {location?.name || "Local não encontrado"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {property?.complement || "Sem complemento"}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            {tenant?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{tenant?.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end border-t pt-3">
                       <div className="text-xs text-muted-foreground">
                         Início: {formatDate(rental.startDate)}
                       </div>
                       <div className="text-lg font-bold text-emerald-600">
                         {formatCurrency(rental.value)}
                       </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                        <Button size="sm" variant="outline" onClick={() => {
                          // TODO: Edit rental
                        }}>
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          // TODO: End rental
                        }}>
                          <XCircle className="h-3 w-3 mr-1" /> Encerrar
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Inactive Rentals Section (Collapsible) */}
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            className="w-full justify-between border bg-slate-50 hover:bg-slate-100"
            onClick={() => setShowInactive(!showInactive)}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-600">
              <Archive className="h-5 w-5" />
              Locações Inativas / Histórico ({inactiveRentals.length})
            </div>
            {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showInactive && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveRentals.map((rental) => {
                 const property = properties.find((p) => p.id === rental.propertyId);
                 const tenant = tenants.find((t) => t.id === rental.tenantId);
                 const location = property ? locations.find((loc) => loc.id === property.locationId) : null;

                 return (
                  <Card key={rental.id} className="opacity-75 bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-600">
                         {location?.name || "Local não encontrado"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-500 mb-2">{tenant?.name}</p>
                      <div className="text-sm text-slate-400">
                        Fim: {rental.endDate ? formatDate(rental.endDate) : "N/A"}
                      </div>
                      <Badge variant="secondary" className="mt-2">Encerrado</Badge>
                    </CardContent>
                  </Card>
                 );
              })}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}