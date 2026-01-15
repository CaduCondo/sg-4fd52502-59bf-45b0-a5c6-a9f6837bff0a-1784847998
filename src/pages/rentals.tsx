import { useEffect, useState, useRef } from "react";
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
  Phone,
  Camera,
  Paperclip,
  Download,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency, formatDate, formatPhone, formatCurrencyInput, unformatCurrency, maskPhone } from "@/lib/masks";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage } from "@/lib/storage";
import { rentalService } from "@/services/rentalService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { paymentService } from "@/services/paymentService";
import type { Property, Tenant, Rental, Payment } from "@/types";
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
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string }>>([]);

  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    paymentDay: "",
    deposit: "",
    hasGarage: false,
    garageValue: ""
  });

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter active rentals
    const active = rentals.filter(r => r.isActive);
    setActiveRentals(active);
    
    // Filter available properties (status = "available")
    const availProps = properties.filter(p => p.status === "available");
    setAvailableProperties(availProps);
    
    // Filter available tenants (status = "active")
    const availTenants = tenants.filter(t => t.status === "active");
    setAvailableTenants(availTenants);
  }, [rentals, properties, tenants]);

  useEffect(() => {
    // Auto-calculate total when property or garage value changes
    if (formData.propertyId) {
      const property = properties.find(p => p.id === formData.propertyId);
      if (property) {
        const baseRent = property.monthlyRent;
        const garageVal = formData.hasGarage && formData.garageValue 
          ? parseCurrency(formData.garageValue) 
          : 0;
        
        const total = baseRent + garageVal;
        setFormData(prev => ({
          ...prev,
          monthlyRent: total.toFixed(2).replace(".", ",")
        }));
      }
    }
  }, [formData.propertyId, formData.hasGarage, formData.garageValue, properties]);

  const loadData = async () => {
    try {
      const [propertiesData, tenantsData, rentalsData] = await Promise.all([
        propertyService.getAll(),
        tenantService.getAll(),
        rentalService.getAll(),
      ]);

      setProperties(propertiesData);
      setTenants(tenantsData);
      setRentals(rentalsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (attachments.length + newFiles.length > 5) {
        toast({ title: "Limite excedido", description: "Máximo de 5 arquivos permitidos", variant: "destructive" });
        return;
      }
      
      const newAttachments = newFiles.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }));
      
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const handleSave = async () => {
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

    const property = properties.find(p => p.id === formData.propertyId);
    if (!property) return;

    const baseRent = property.monthlyRent;
    const garageVal = formData.hasGarage && formData.garageValue 
      ? parseCurrency(formData.garageValue) 
      : 0;
    const totalValue = baseRent + garageVal;

    if (isEditMode && selectedRental) {
      const updatedRental: Rental = {
        ...selectedRental,
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: baseRent,
        paymentDay: parseInt(formData.paymentDay),
        hasGarage: formData.hasGarage,
        garageValue: formData.hasGarage ? garageVal : undefined,
        deposit: formData.deposit,
        value: totalValue,
      };

      await rentalService.update(updatedRental);
      toast({ title: "Sucesso", description: "Locação atualizada com sucesso!" });
    } else {
      const newRental: Omit<Rental, "id" | "createdAt"> = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: baseRent,
        paymentDay: parseInt(formData.paymentDay),
        hasGarage: formData.hasGarage,
        garageValue: formData.hasGarage ? garageVal : undefined,
        deposit: formData.deposit,
        value: totalValue,
        isActive: true,
      };

      const createdRental = await rentalService.create(newRental);

      // Update property status to "occupied"
      const propertyToUpdate = properties.find((p) => p.id === formData.propertyId);
      if (propertyToUpdate) {
        await propertyService.update({ ...propertyToUpdate, status: "occupied" });
      }

      // Update tenant status to "rented"
      const tenant = tenants.find((t) => t.id === formData.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "rented" });
      }

      const currentDate = new Date();
      const referenceMonth = currentDate.getMonth() + 1;
      const referenceYear = currentDate.getFullYear();

      const firstPayment: Omit<Payment, "id" | "createdAt"> = {
        rentalId: createdRental.id,
        referenceMonth: referenceMonth,
        referenceYear: referenceYear,
        dueDate: newRental.startDate,
        expectedAmount: totalValue,
        status: "pending",
        attachments: [],
        interest: 0,
        paidAmount: 0,
        lateFee: 0,
        partialPayments: []
      };

      await paymentService.create(firstPayment);

      toast({ title: "Sucesso", description: "Locação criada com sucesso!" });
    }

    setIsDialogOpen(false);
    setIsViewDialogOpen(false);
    setIsEditMode(false);
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
      hasGarage: false,
      garageValue: "",
    });
    setAttachments([]);
    setSelectedRental(null);
    setIsEditMode(false);
  };

  const handleViewRental = (rental: Rental) => {
    setSelectedRental(rental);
    setIsViewDialogOpen(true);
    setIsEditMode(false);
  };

  const handleEditRental = () => {
    if (selectedRental) {
      const property = properties.find(p => p.id === selectedRental.propertyId);
      
      setFormData({
        propertyId: selectedRental.propertyId,
        tenantId: selectedRental.tenantId,
        startDate: selectedRental.startDate,
        endDate: selectedRental.endDate,
        monthlyRent: selectedRental.monthlyRent.toFixed(2).replace(".", ","),
        paymentDay: selectedRental.paymentDay.toString(),
        deposit: selectedRental.deposit ? selectedRental.deposit : "",
        hasGarage: selectedRental.hasGarage || false,
        garageValue: selectedRental.garageValue ? selectedRental.garageValue.toFixed(2).replace(".", ",") : "",
      });
      
      setIsEditMode(true);
      setIsViewDialogOpen(false);
      setIsDialogOpen(true);
    }
  };

  const handleEndContract = async (rental: Rental) => {
    if (!confirm("Deseja realmente encerrar este contrato?")) return;

    try {
      // Update rental status
      await rentalService.update({
        ...rental,
        isActive: false,
      });

      // Keep tenant active (do not change status)
      // Tenant remains available for new rentals

      // Update property status to available
      await propertyService.update({
        ...properties.find(p => p.id === rental.propertyId)!,
        status: "available",
      });

      toast({ title: "Sucesso", description: "Contrato encerrado com sucesso!" });
      loadData();
    } catch (error) {
      console.error("Error ending contract:", error);
      toast({ 
        title: "Erro", 
        description: "Erro ao encerrar contrato", 
        variant: "destructive" 
      });
    }
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
      tenantStorage.update({ ...tenant, status: "active" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.propertyId || !formData.tenantId || !formData.startDate || !formData.endDate || !formData.monthlyRent || !formData.paymentDay) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const rentalData: Omit<Rental, "id" | "createdAt"> = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: unformatCurrency(formData.monthlyRent),
        paymentDay: parseInt(formData.paymentDay),
        hasGarage: formData.hasGarage,
        garageValue: formData.hasGarage ? unformatCurrency(formData.garageValue) : undefined,
        value: unformatCurrency(formData.monthlyRent) + (formData.hasGarage ? unformatCurrency(formData.garageValue) : 0),
        deposit: formData.deposit,
        isActive: true,
      };

      await rentalService.create(rentalData);

      // Update property status to occupied
      const property = properties.find(p => p.id === formData.propertyId);
      if (property) {
        await propertyService.update({ ...property, status: "occupied" });
      }

      // Update tenant status to rented
      const tenant = tenants.find(t => t.id === formData.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "rented" });
      }

      toast({
        title: "Sucesso",
        description: "Locação cadastrada com sucesso",
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar a locação",
        variant: "destructive",
      });
    }
  };

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
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Locação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Editar Locação" : "Nova Locação"}</DialogTitle>
                  <DialogDescription>
                    {isEditMode ? "Atualize os dados da locação" : "Crie uma nova locação de imóvel"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Imóvel Disponível *</Label>
                      <Select 
                        value={formData.propertyId} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, propertyId: value });
                          const property = properties.find(p => p.id === value);
                          if (property) {
                            setFormData(prev => ({ 
                              ...prev, 
                              propertyId: value,
                              monthlyRent: formatCurrency(property.monthlyRent)
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.location} - {property.complement} - {formatCurrency(property.monthlyRent)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Inquilino Disponível *</Label>
                      <Select 
                        value={formData.tenantId} 
                        onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
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
                        disabled
                        className="bg-slate-50"
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
                            {formatCurrency(parseCurrency(formData.monthlyRent))}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="flex justify-between">
                            <span>Aluguel:</span>
                            <span>
                              {formatCurrency(
                                parseCurrency(formData.monthlyRent) - parseCurrency(formData.garageValue)
                              )}
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
                    <Label htmlFor="deposit">Caução</Label>
                    <Input
                      id="deposit"
                      placeholder="Digite o valor ou informação da caução"
                      value={formData.deposit}
                      onChange={(e) =>
                        setFormData({ ...formData, deposit: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label className="flex justify-between">
                      <span>Contrato ({attachments.length}/5)</span>
                    </Label>
                    
                    <div className="flex gap-2 flex-wrap">
                      {attachments.map((file, i) => (
                        <Badge key={i} variant="secondary" className="flex gap-1 items-center py-1">
                          {file.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} 
                          />
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect} 
                        multiple 
                        accept="image/*,.pdf"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto"
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Anexar
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {isEditMode ? "Atualizar" : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-6">
            {/* Inquilinos Disponíveis */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Inquilinos Disponíveis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableTenants.map((tenant) => (
                  <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-500">{formatPhone(tenant.phone)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {availableTenants.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-6 text-center text-slate-500">
                      Nenhum inquilino ativo disponível
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Imóveis Vagos */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Imóveis Vagos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableProperties.map((property) => (
                  <Card key={property.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Building2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{property.location}</p>
                          <p className="text-xs text-slate-500">{property.complement}</p>
                          <p className="text-xs font-semibold text-emerald-600 mt-1">
                            {formatCurrency(property.monthlyRent)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {availableProperties.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-6 text-center text-slate-500">
                      Nenhum imóvel vago disponível
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

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
                              {property.location}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {tenant.name}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
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
                          <CardFooter className="pt-4 flex flex-col gap-2 border-t">
                            <div className="flex w-full gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRental(rental);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(rental.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEndContract(rental);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Encerrar Contrato
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                          ? `${property.location}${property.complement ? ' - ' + property.complement : ''}`
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
                    <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                      {selectedRental.deposit}
                    </div>
                  </div>
                )}
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Contratos Anexados</Label>
                    <div className="flex gap-2 flex-wrap">
                      {attachments.map((file, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {file.name}
                        </Button>
                      ))}
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
                onClick={() => selectedRental && handleEndContract(selectedRental)}
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