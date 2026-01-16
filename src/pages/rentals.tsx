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
import { Plus, Home, User, Calendar, Trash2, XCircle, Archive, Upload, X, Users, DollarSign } from "lucide-react";
import type { Rental, Property, Tenant, Payment } from "@/types";
import { rentalService, propertyService, tenantService, paymentService } from "@/services";
import { formatCurrency, applyRealMask, removeMask } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { getCurrentUser } from "@/lib/auth";

export default function RentalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInactiveDialogOpen, setIsInactiveDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

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
      .sort((a, b) => a.location.localeCompare(b.location));
    const availTenants = tenants.filter((t) => t.status === "active");
    setAvailableProperties(availProps);
    setAvailableTenants(availTenants);
  }, [properties, tenants]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rentalsData, propertiesData, tenantsData] = await Promise.all([
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
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
    const startDate = new Date(rental.startDate);
    const endDate = rental.endDate ? new Date(rental.endDate) : null;
    const paymentDay = rental.paymentDay;
    const today = new Date();
    
    const payments: Omit<Payment, "id" | "createdAt">[] = [];
    
    // Para contratos antigos (data início no passado), começar do mês atual
    // Para contratos novos (data início no futuro ou presente), começar da data início
    let currentDate: Date;
    if (startDate < today) {
      // Contrato antigo: começar do mês atual
      currentDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
      
      // Se o dia de vencimento já passou neste mês, começar do próximo mês
      if (currentDate < today) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
      // Contrato novo: começar da data de início
      currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), paymentDay);
      
      // Se a data de vencimento for antes da data de início, começar no próximo mês
      if (currentDate < startDate) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Gerar pagamentos até a data de término ou 12 meses se não houver data de término
    const maxDate = endDate || new Date(currentDate.getFullYear() + 1, currentDate.getMonth() + 11, paymentDay);
    
    while (currentDate <= maxDate) {
      const payment: Omit<Payment, "id" | "createdAt"> = {
        rentalId: rental.id,
        referenceMonth: currentDate.getMonth() + 1,
        referenceYear: currentDate.getFullYear(),
        dueDate: currentDate.toISOString().split("T")[0],
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
      
      // Próximo mês
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Criar todos os pagamentos
    for (const payment of payments) {
      await paymentService.create(payment);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.propertyId || !formData.tenantId || !formData.startDate || !formData.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.hasGarage && !formData.garageValue) {
      toast({
        title: "Valor da vaga obrigatório",
        description: "Informe o valor da vaga de garagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      const garageValue = formData.hasGarage ? parseFloat(formData.garageValue.replace(/\./g, "").replace(",", ".")) : 0;
      const rentValue = parseFloat(formData.value.replace(/\./g, "").replace(",", "."));

      const rental: Omit<Rental, "id" | "createdAt"> = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        value: rentValue + garageValue,
        monthlyRent: rentValue,
        hasGarage: formData.hasGarage,
        garageValue: formData.hasGarage ? garageValue : undefined,
        paymentDay: parseInt(formData.paymentDay),
        isActive: true,
        attachments: formData.attachments,
      };

      const createdRental = await rentalService.create(rental);

      // Gerar pagamentos mensais
      await generatePayments({ ...createdRental, ...rental });

      // Update property status to occupied
      const property = properties.find((p) => p.id === formData.propertyId);
      if (property) {
        await propertyService.update({ ...property, status: "occupied" });
      }

      // Update tenant status to rented
      const tenant = tenants.find((t) => t.id === formData.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "rented" });
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
    }
  };

  const handleDelete = async (rental: Rental) => {
    // Check if user is corretor and rental has payments
    if (currentUser?.role === "corretor") {
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

    if (!confirm("Tem certeza que deseja excluir esta locação?")) return;

    try {
      // Delete rental
      await rentalService.delete(rental.id);

      // Update property status to available
      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await propertyService.update({ ...property, status: "available" });
      }

      // Update tenant status to active
      const tenant = tenants.find((t) => t.id === rental.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Locação excluída com sucesso!",
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
    if (!confirm("Tem certeza que deseja encerrar esta locação?")) return;

    try {
      // Update rental to inactive
      await rentalService.update({ ...rental, isActive: false });

      // Update property status to available
      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await propertyService.update({ ...property, status: "available" });
      }

      // Update tenant status to active
      const tenant = tenants.find((t) => t.id === rental.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "active" });
      }

      toast({
        title: "Sucesso",
        description: "Locação encerrada com sucesso!",
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
        <div className="space-y-8">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Locações</h1>
                <p className="text-muted-foreground mt-2">
                  Gerencie todas as locações ativas e inativas
                </p>
              </div>
              <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" />
                Nova Locação
              </Button>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando locações...</p>
            </div>
          ) : (
            <>
              {/* Available Properties and Active Tenants Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Available Properties */}
                <div className="space-y-4">
                  <ScrollReveal delay={0.1}>
                    <h2 className="text-xl font-bold">Imóveis Vagos</h2>
                  </ScrollReveal>
                  <ScrollReveal delay={0.15}>
                    <Card>
                      <CardContent className="pt-6">
                        {availableProperties.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            Nenhum imóvel vago disponível
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {availableProperties.map((property) => (
                              <div
                                key={property.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Home className="h-4 w-4 text-emerald-600" />
                                  <div>
                                    <p className="font-medium text-sm">{property.location}</p>
                                    <p className="text-xs text-muted-foreground">{property.complement}</p>
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-emerald-600">
                                  {formatCurrency(property.rentValue)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                </div>

                {/* Active Tenants */}
                <div className="space-y-4">
                  <ScrollReveal delay={0.2}>
                    <h2 className="text-xl font-bold">Inquilinos Disponíveis</h2>
                  </ScrollReveal>
                  <ScrollReveal delay={0.25}>
                    <Card>
                      <CardContent className="pt-6">
                        {availableTenants.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            Nenhum inquilino disponível
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {availableTenants.map((tenant) => (
                              <div
                                key={tenant.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <User className="h-4 w-4 text-emerald-600" />
                                  <div>
                                    <p className="font-medium text-sm">{tenant.name}</p>
                                    <p className="text-xs text-muted-foreground">{tenant.document}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                </div>
              </div>

              {/* Active Rentals */}
              <div className="space-y-4">
                <ScrollReveal delay={0.3}>
                  <h2 className="text-2xl font-bold">Locações Ativas</h2>
                </ScrollReveal>

                {activeRentals.length === 0 ? (
                  <ScrollReveal delay={0.35}>
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma locação ativa</h3>
                        <p className="text-muted-foreground mb-4">
                          Cadastre uma nova locação para começar.
                        </p>
                        <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="mr-2 h-4 w-4" />
                          Nova Locação
                        </Button>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeRentals.map((rental, index) => {
                      const property = getPropertyInfo(rental.propertyId);
                      const tenant = getTenantInfo(rental.tenantId);

                      return (
                        <FloatingCard key={rental.id} delay={index * 0.1}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/rentals/${rental.id}`)}>
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-2">
                                    <Home className="h-5 w-5 text-emerald-600" />
                                    {property?.location || "N/A"}
                                  </span>
                                  {property?.complement && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                      {property.complement}
                                    </span>
                                  )}
                                </div>
                                <Badge className="bg-blue-500">Ativa</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                                  {tenant?.document && (
                                    <p className="text-xs text-muted-foreground">{tenant.document}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-emerald-600" />
                                  <span className="text-lg font-bold text-emerald-600">
                                    {formatCurrency(rental.value)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Vencimento dia {rental.paymentDay}
                                </p>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-3 border-t flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRental(rental);
                                  setIsEndDialogOpen(true);
                                }}
                              >
                                Encerrar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(rental);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </FloatingCard>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inactive Rentals Button */}
              {inactiveRentals.length > 0 && (
                <ScrollReveal delay={0.4}>
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsInactiveDialogOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Ver Locações Inativas ({inactiveRentals.length})
                    </Button>
                  </div>
                </ScrollReveal>
              )}
            </>
          )}
        </div>

        {/* New Rental Dialog */}
        <Dialog open={isDialogOpen}>
          <DialogContent 
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            onPointerDownOutside={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onInteractOutside={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <DialogHeader>
              <DialogTitle>Nova Locação</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar uma nova locação
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">
                    Imóveis Vagos <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(value) => {
                      const property = properties.find((p) => p.id === value);
                      setFormData({
                        ...formData,
                        propertyId: value,
                        value: property?.rentValue ? applyRealMask((property.rentValue * 100).toString()) : "",
                      });
                    }}
                  >
                    <SelectTrigger id="propertyId">
                      <SelectValue placeholder="Selecione o imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.location} - {property.complement} - {formatCurrency(property.rentValue)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantId">
                    Inquilinos Disponíveis <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tenantId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tenantId: value })
                    }
                  >
                    <SelectTrigger id="tenantId">
                      <SelectValue placeholder="Selecione o inquilino" />
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

                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    Data Início Contrato <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Término Contrato</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    Valor do Aluguel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="value"
                    placeholder="R$ 0,00"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: applyRealMask(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDay">
                    Dia de Vencimento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.paymentDay}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentDay: value })
                    }
                  >
                    <SelectTrigger id="paymentDay">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Garage Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasGarage"
                    checked={formData.hasGarage}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasGarage: checked as boolean, garageValue: "" })
                    }
                  />
                  <Label htmlFor="hasGarage" className="text-base font-medium cursor-pointer">
                    Vaga Garagem?
                  </Label>
                </div>

                {formData.hasGarage && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="garageValue">
                      Valor da Vaga <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="garageValue"
                      placeholder="R$ 0,00"
                      value={formData.garageValue}
                      onChange={(e) =>
                        setFormData({ ...formData, garageValue: applyRealMask(e.target.value) })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Total Value Card */}
              {formData.value && (
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valor do Aluguel:</span>
                        <span className="font-medium">R$ {formData.value}</span>
                      </div>
                      {formData.hasGarage && formData.garageValue && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Valor da Vaga:</span>
                          <span className="font-medium">R$ {formData.garageValue}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                        <span className="text-lg font-semibold">Valor Total:</span>
                        <span className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(getTotalValue())}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attachments Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Anexos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("fileUpload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Anexar Arquivo
                  </Button>
                  <input
                    id="fileUpload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <span className="text-sm truncate flex-1">
                          Arquivo {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Cadastrar Locação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Inactive Rentals Dialog */}
        <Dialog open={isInactiveDialogOpen} onOpenChange={setIsInactiveDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Locações Inativas</DialogTitle>
              <DialogDescription>
                Lista de todas as locações encerradas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {inactiveRentals.map((rental, index) => {
                const property = getPropertyInfo(rental.propertyId);
                const tenant = getTenantInfo(rental.tenantId);

                return (
                  <FloatingCard key={rental.id} delay={index * 0.1}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75" onClick={() => router.push(`/rentals/${rental.id}`)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2">
                              <Home className="h-5 w-5 text-gray-500" />
                              {property?.location || "N/A"}
                            </span>
                            {property?.complement && (
                              <span className="text-sm font-normal text-muted-foreground">
                                {property.complement}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary">Encerrada</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
                            {tenant?.document && (
                              <p className="text-xs text-muted-foreground">{tenant.document}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Encerrada em {new Date(rental.endDate!).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {formatCurrency(rental.value)}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rental);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </CardFooter>
                    </Card>
                  </FloatingCard>
                );
              })}
            </div>

            <DialogFooter>
              <Button onClick={() => setIsInactiveDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* End Rental Confirmation Dialog */}
        <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Locação</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja encerrar esta locação? O imóvel ficará disponível novamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (selectedRental) {
                    handleEndRental(selectedRental);
                    setIsEndDialogOpen(false);
                  }
                }}
              >
                Confirmar Encerramento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}