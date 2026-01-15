import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Home, 
  Clock, 
  X, 
  Eye, 
  Trash2,
  MapPin,
  Building,
  Building2,
  Edit,
  XCircle,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency, formatDate, formatPhone, formatCurrencyInput } from "@/lib/masks";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage } from "@/lib/storage";
import type { Property, Tenant, Rental, Payment } from "@/types";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function RentalsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; file: File }>>([]);

  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    paymentDay: "",
    deposit: "",
    observations: "",
    hasGarage: false,
    garageValue: ""
  });

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allProperties = propertyStorage.getAll();
    const allTenants = tenantStorage.getAll();
    const allRentals = rentalStorage.getAll();

    setProperties(allProperties);
    setTenants(allTenants);
    setRentals(allRentals);

    const available = allTenants.filter((t) => t.isActive);
    setAvailableTenants(available);

    const vacant = allProperties.filter((p) => p.status === "available");
    setAvailableProperties(vacant);

    const active = allRentals.filter((r) => r.isActive);
    setActiveRentals(active);
  };

  const handleSave = () => {
    if (
      !formData.propertyId ||
      !formData.tenantId ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.monthlyRent ||
      !formData.paymentDay
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    let calculatedTotalValue = parseCurrency(formData.monthlyRent);
    if (formData.hasGarage && formData.garageValue) {
      calculatedTotalValue += parseCurrency(formData.garageValue);
    }

    const newRental: Rental = {
      id: crypto.randomUUID(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      value: calculatedTotalValue,
      monthlyRent: parseCurrency(formData.monthlyRent),
      paymentDay: parseInt(formData.paymentDay),
      deposit: formData.deposit ? parseCurrency(formData.deposit) : undefined,
      observations: formData.observations,
      hasGarage: formData.hasGarage,
      garageValue: formData.hasGarage ? parseCurrency(formData.garageValue) : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    rentalStorage.save(newRental);

    const property = properties.find((p) => p.id === formData.propertyId);
    if (property) {
      propertyStorage.update({ ...property, status: "occupied" });
    }

    const tenant = tenants.find((t) => t.id === formData.tenantId);
    if (tenant) {
      tenantStorage.update({ ...tenant, isActive: false });
    }

    const currentDate = new Date();
    const paymentMonth = currentDate.toISOString().slice(0, 7);
    const paymentYear = currentDate.getFullYear().toString();

    const firstPayment: Payment = {
      id: crypto.randomUUID(),
      rentalId: newRental.id,
      referenceMonth: paymentMonth,
      referenceYear: paymentYear,
      dueDate: newRental.startDate, // Initial due date
      expectedAmount: calculatedTotalValue,
      status: "pending",
      isPaid: false,
      createdAt: new Date().toISOString(),
    };

    paymentStorage.save(firstPayment);

    toast({ title: "Sucesso", description: "Locação criada com sucesso!" });
    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      monthlyRent: "",
      paymentDay: "",
      deposit: "",
      observations: "",
      hasGarage: false,
      garageValue: "",
    });
    setAttachments([]);
  };

  const handleViewRental = (rental: Rental) => {
    setSelectedRental(rental);
    setIsViewDialogOpen(true);
  };

  const handleEditRental = () => {
    if (selectedRental) {
      router.push(`/rentals/${selectedRental.id}`);
    }
  };

  const handleEndRental = (id: string) => {
    const rentalToEnd = rentals.find((r) => r.id === id);
    if (!rentalToEnd) return;

    rentalStorage.update({ ...rentalToEnd, isActive: false });

    const property = properties.find((p) => p.id === rentalToEnd.propertyId);
    if (property) {
      propertyStorage.update({ ...property, status: "available" });
    }

    const tenant = tenants.find((t) => t.id === rentalToEnd.tenantId);
    if (tenant) {
      tenantStorage.update({ ...tenant, isActive: true });
    }

    toast({ title: "Sucesso", description: "Locação encerrada com sucesso!" });
    setIsViewDialogOpen(false);
    loadData();
  };

  const handleDeleteRental = (id: string) => {
    const rentalToDelete = rentals.find((r) => r.id === id);
    if (!rentalToDelete) return;

    const allPayments = paymentStorage.getAll();
    const hasRegisteredPayments = allPayments
      .filter((p) => p.rentalId === id)
      .some((p) => p.status === "paid" || (p.paidAmount && p.paidAmount > 0));

    if (hasRegisteredPayments) {
      toast({
        title: "Erro",
        description: "Não é possível excluir locação com pagamentos registrados",
        variant: "destructive",
      });
      return;
    }

    const property = properties.find((p) => p.id === rentalToDelete.propertyId);
    if (property) {
      propertyStorage.update({ ...property, status: "available" });
    }

    const tenant = tenants.find((t) => t.id === rentalToDelete.tenantId);
    if (tenant) {
      tenantStorage.update({ ...tenant, isActive: true });
    }

    allPayments
      .filter((p) => p.rentalId === id)
      .forEach((p) => paymentStorage.delete(p.id));

    rentalStorage.delete(id);
    toast({ title: "Sucesso", description: "Locação excluída com sucesso!" });
    setIsViewDialogOpen(false);
    setIsDeleteDialogOpen(false);
    loadData();
  };

  const confirmDelete = (id: string) => {
    setRentalToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const getPropertyById = (id: string) => properties.find((p) => p.id === id);
  const getTenantById = (id: string) => tenants.find((t) => t.id === id);

  const filteredRentals = activeRentals.filter((rental) => {
    const property = getPropertyById(rental.propertyId);
    const tenant = getTenantById(rental.tenantId);
    const searchLower = searchTerm.toLowerCase();

    return (
      property?.address.toLowerCase().includes(searchLower) ||
      property?.location.toLowerCase().includes(searchLower) ||
      tenant?.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <SEO
        title="Locações - Gerenciador de Locações"
        description="Gerencie suas locações de imóveis"
      />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Locações</h1>
              <p className="text-muted-foreground">Gerencie suas locações de imóveis</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Locação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Locação</DialogTitle>
                  <DialogDescription>Crie uma nova locação de imóvel</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Imóvel *</Label>
                      <Select
                        value={formData.propertyId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, propertyId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.address} - {property.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Inquilino *</Label>
                      <Select
                        value={formData.tenantId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tenantId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um inquilino" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data de Início *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data de Término *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRent">Valor do Aluguel (R$) *</Label>
                      <Input
                        id="monthlyRent"
                        placeholder="0,00"
                        value={formData.monthlyRent}
                        onChange={(e) => {
                          const value = formatCurrencyInput(e.target.value);
                          setFormData({ ...formData, monthlyRent: value });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentDay">Dia do Pagamento *</Label>
                      <Input
                        id="paymentDay"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="10"
                        value={formData.paymentDay}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentDay: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasGarage"
                        checked={formData.hasGarage}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            hasGarage: checked as boolean,
                            garageValue: !checked ? "" : formData.garageValue,
                          })
                        }
                      />
                      <Label htmlFor="hasGarage" className="cursor-pointer">
                        Vaga de Garagem?
                      </Label>
                    </div>
                  </div>

                  {formData.hasGarage && (
                    <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                      <Label htmlFor="garageValue">Valor da Vaga (R$)</Label>
                      <Input
                        id="garageValue"
                        placeholder="0,00"
                        value={formData.garageValue}
                        onChange={(e) => {
                          const value = formatCurrencyInput(e.target.value);
                          setFormData({ ...formData, garageValue: value });
                        }}
                      />
                    </div>
                  )}

                  {formData.hasGarage &&
                    formData.garageValue &&
                    formData.monthlyRent && (
                      <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg animate-in fade-in-0 slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            💰 Valor Total do Aluguel:
                          </span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(
                              parseCurrency(formData.monthlyRent) +
                                parseCurrency(formData.garageValue)
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="flex justify-between">
                            <span>Aluguel:</span>
                            <span>
                              {formatCurrency(parseCurrency(formData.monthlyRent))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vaga de Garagem:</span>
                            <span>
                              {formatCurrency(parseCurrency(formData.garageValue))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label htmlFor="deposit">Caução (R$)</Label>
                    <Input
                      id="deposit"
                      placeholder="0,00"
                      value={formData.deposit}
                      onChange={(e) => {
                        const value = formatCurrencyInput(e.target.value);
                        setFormData({ ...formData, deposit: value });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      placeholder="Informações adicionais sobre a locação"
                      value={formData.observations}
                      onChange={(e) =>
                        setFormData({ ...formData, observations: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-6">
            {/* Inquilinos Disponíveis */}
            <FloatingCard delay={0}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Inquilinos Disponíveis
                  </CardTitle>
                  <CardDescription>
                    {availableTenants.length} inquilinos disponíveis para locação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableTenants.map((tenant) => (
                      <Card
                        key={tenant.id}
                        className="group hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => router.push(`/tenants/${tenant.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{tenant.name}</CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/tenants/${tenant.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{tenant.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{formatPhone(tenant.phone)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Imóveis Vagos */}
            <FloatingCard delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Imóveis Vagos
                  </CardTitle>
                  <CardDescription>
                    {availableProperties.length} imóveis disponíveis para locação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableProperties.map((property) => (
                      <Card
                        key={property.id}
                        className="group hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => router.push(`/properties/${property.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {property.address}, {property.number}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{property.location}</span>
                          </div>
                          {property.complement && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building className="h-4 w-4 flex-shrink-0" />
                              <span>{property.complement}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span>{formatCurrency(property.monthlyRent)}/mês</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Locações Ativas */}
            <FloatingCard delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Locações Ativas
                  </CardTitle>
                  <CardDescription>
                    {activeRentals.length} locações em andamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRentals.map((rental) => {
                      const property = getPropertyById(rental.propertyId);
                      const tenant = getTenantById(rental.tenantId);
                      if (!property || !tenant) return null;

                      return (
                        <Card
                          key={rental.id}
                          className="group hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => handleViewRental(rental)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {property.address}, {property.number}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {tenant.name}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span>{property.location}</span>
                            </div>
                            {property.complement && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="h-4 w-4 flex-shrink-0" />
                                <span>{property.complement}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>Vencimento: Dia {rental.paymentDay}</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <DollarSign className="h-4 w-4 flex-shrink-0" />
                              <span>{formatCurrency(rental.value)}</span>
                            </div>
                            <Badge variant="default" className="mt-2">
                              Ativa
                            </Badge>
                          </CardContent>
                          <CardFooter className="pt-4 flex gap-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewRental(rental);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEndRental(rental.id);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Encerrar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(rental.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>
        </div>

        {/* View Rental Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Locação</DialogTitle>
              <DialogDescription>Informações completas da locação</DialogDescription>
            </DialogHeader>
            {selectedRental && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imóvel</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {(() => {
                        const property = getPropertyById(selectedRental.propertyId);
                        return property
                          ? `${property.address}, ${property.number} - ${property.location}`
                          : "N/A";
                      })()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Inquilino</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {(() => {
                        const tenant = getTenantById(selectedRental.tenantId);
                        return tenant ? tenant.name : "N/A";
                      })()}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatDate(selectedRental.startDate)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Término</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatDate(selectedRental.endDate)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Mensal</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatCurrency(selectedRental.value)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do Pagamento</Label>
                    <div className="p-3 bg-muted rounded-md">
                      Dia {selectedRental.paymentDay}
                    </div>
                  </div>
                </div>
                {selectedRental.hasGarage && (
                  <div className="space-y-2">
                    <Label>Vaga de Garagem</Label>
                    <div className="p-3 bg-muted rounded-md">
                      Sim - {formatCurrency(selectedRental.garageValue || 0)}
                    </div>
                  </div>
                )}
                {selectedRental.deposit && (
                  <div className="space-y-2">
                    <Label>Caução</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatCurrency(selectedRental.deposit)}
                    </div>
                  </div>
                )}
                {selectedRental.observations && (
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                      {selectedRental.observations}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
              <Button variant="outline" onClick={handleEditRental}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRental && handleEndRental(selectedRental.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Encerrar Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta locação? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => rentalToDelete && handleDeleteRental(rentalToDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </>
  );
}