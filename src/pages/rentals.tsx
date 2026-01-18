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
import { Plus, Home, User, Calendar, Trash2, Archive, Upload, X, Users, DollarSign } from "lucide-react";
import type { Rental, Property, Tenant, Payment } from "@/types";
import { rentalService, propertyService, tenantService, paymentService } from "@/services";
import { formatCurrency, applyRealMask } from "@/lib/masks";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    depositAmount: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
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
      depositAmount: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!formData.propertyId || !formData.tenantId || !formData.startDate || !formData.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const garageValue = formData.hasGarage ? parseFloat(formData.garageValue.replace(/\./g, "").replace(",", ".")) : 0;
      const rentValue = parseFloat(formData.value.replace(/\./g, "").replace(",", "."));
      const depositAmount = formData.depositAmount ? parseFloat(formData.depositAmount.replace(/\./g, "").replace(",", ".")) : 0;

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
        depositAmount: depositAmount,
        adminFee: 0,
        contractAttachments: [],
      };

      await rentalService.create(rentalData);

      // Atualizar status do imóvel e inquilino
      const property = properties.find((p) => p.id === formData.propertyId);
      if (property) {
        await propertyService.update(property.id, { ...property, status: "occupied" });
      }

      const tenant = tenants.find((t) => t.id === formData.tenantId);
      if (tenant) {
        await tenantService.update({ ...tenant, status: "rented" });
      }

      toast({
        title: "Sucesso",
        description: "Locação cadastrada com sucesso!",
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
      await paymentService.deletePendingByRentalId(rental.id);
      await rentalService.delete(rental.id);

      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await propertyService.update(property.id, { ...property, status: "available" });
      }

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
    try {
      await paymentService.deleteFutureByRentalId(rental.id);
      await rentalService.update({ ...rental, isActive: false });

      const property = properties.find((p) => p.id === rental.propertyId);
      if (property) {
        await propertyService.update(property.id, { ...property, status: "available" });
      }

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

  const getTotalValue = () => {
    const rentValue = parseFloat(formData.value.replace(/\./g, "").replace(",", ".")) || 0;
    const garageValue = formData.hasGarage ? parseFloat(formData.garageValue.replace(/\./g, "").replace(",", ".")) || 0 : 0;
    return rentValue + garageValue;
  };

  const activeRentals = rentals.filter((r) => r.isActive);
  const inactiveRentals = rentals.filter((r) => !r.isActive);

  return (
    <>
      <SEO title="Locações - Gerenciador de Locações" description="Gerencie as locações de imóveis" />
      <Layout>
        <div className="space-y-8">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Locações</h1>
                <p className="text-muted-foreground mt-2">Gerencie todas as locações ativas e inativas</p>
              </div>
              <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Nova Locação
              </Button>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando locações...</p>
            </div>
          ) : (
            <>
              {/* Cards de Imóveis Vagos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Imóveis Vagos</h2>
                  <Card>
                    <CardContent className="pt-6">
                      {availableProperties.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhum imóvel vago disponível</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {availableProperties.map((property) => (
                            <div key={property.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Home className="h-4 w-4 text-emerald-600" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {property.location} - {property.property_identifier}
                                  </p>
                                  {property.locationData && (
                                    <p className="text-xs text-muted-foreground">
                                      {property.locationData.street}, {property.locationData.number}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-emerald-600">
                                {formatCurrency(property.monthly_rent)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Inquilinos Disponíveis</h2>
                  <Card>
                    <CardContent className="pt-6">
                      {availableTenants.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nenhum inquilino disponível</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {availableTenants.map((tenant) => (
                            <div key={tenant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                </div>
              </div>

              {/* Lista de Locações Ativas */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Locações Ativas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeRentals.map((rental, index) => (
                    <FloatingCard key={rental.id} delay={index * 0.1}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/rentals/${rental.id}`)}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-2">
                                <Home className="h-5 w-5 text-emerald-600" />
                                {rental.property?.location || "N/A"}
                              </span>
                              {rental.property?.property_identifier && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  {rental.property.property_identifier}
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
                              <p className="text-sm font-medium">{rental.tenant?.name || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                              <span className="text-lg font-bold text-emerald-600">
                                {formatCurrency(rental.monthlyRent || rental.rentAmount || 0)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">Dia {rental.paymentDay}</p>
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
                  ))}
                </div>
              </div>

              {inactiveRentals.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setIsInactiveDialogOpen(true)}>
                    <Archive className="mr-2 h-4 w-4" /> Ver Locações Inativas ({inactiveRentals.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Locação</DialogTitle>
              <DialogDescription>Preencha os dados para cadastrar uma nova locação</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imóvel</Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(value) => {
                      const property = properties.find((p) => p.id === value);
                      setFormData({
                        ...formData,
                        propertyId: value,
                        value: property?.monthly_rent ? applyRealMask((property.monthly_rent * 100).toString()) : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.location} - {property.property_identifier} - {formatCurrency(property.monthly_rent)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inquilino</Label>
                  <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                    <SelectTrigger>
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
                  <Label>Data Início</Label>
                  <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Data Término</Label>
                  <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor do Aluguel</Label>
                  <Input value={formData.value} onChange={(e) => setFormData({ ...formData, value: applyRealMask(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Select value={formData.paymentDay} onValueChange={(value) => setFormData({ ...formData, paymentDay: value })}>
                    <SelectTrigger>
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                  {isSubmitting ? "Processando..." : "Cadastrar Locação"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Locação</DialogTitle>
              <DialogDescription>Tem certeza que deseja encerrar esta locação?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedRental) {
                    handleEndRental(selectedRental);
                    setIsEndDialogOpen(false);
                  }
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isInactiveDialogOpen} onOpenChange={setIsInactiveDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Locações Inativas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {inactiveRentals.map((rental) => (
                <Card key={rental.id} className="opacity-75">
                  <CardHeader>
                    <CardTitle className="text-base">{rental.property?.location}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Inquilino: {rental.tenant?.name}</p>
                    <p className="text-sm">Fim: {new Date(rental.endDate!).toLocaleDateString("pt-BR")}</p>
                  </CardContent>
                  <CardFooter>
                     <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-500"
                        onClick={() => handleDelete(rental)}
                      >
                        Excluir Histórico
                      </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}