import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { isAuthenticated } from "@/lib/auth";
import { rentalStorage, propertyStorage, tenantStorage, paymentStorage, configStorage } from "@/lib/storage";
import { Rental, Property, Tenant } from "@/types";
import { Home, Plus, Edit, Trash2, Search, Users, Building2, Key, Calendar } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate, parseCurrency, maskCurrency } from "@/lib/masks";

export default function Rentals() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Array<{
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);
  const [filteredRentals, setFilteredRentals] = useState<Array<{
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "ended" | "expired">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    paymentDay: "5"
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRentals();
    loadAvailableTenantsAndProperties();
  }, [router]);

  useEffect(() => {
    let filtered = rentals;

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.property.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(r => r.rental.status === filterStatus);
    }

    setFilteredRentals(filtered);
  }, [searchTerm, filterStatus, rentals]);

  const loadRentals = () => {
    const allRentals = rentalStorage.getAll();
    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();

    const rentalDetails = allRentals.map(rental => {
      const property = properties.find(p => p.id === rental.propertyId);
      const tenant = tenants.find(t => t.id === rental.tenantId);
      
      if (property && tenant) {
        return { rental, property, tenant };
      }
      return null;
    }).filter(Boolean) as Array<{
      rental: Rental;
      property: Property;
      tenant: Tenant;
    }>;

    rentalDetails.sort((a, b) => 
      new Date(b.rental.startDate).getTime() - new Date(a.rental.startDate).getTime()
    );

    setRentals(rentalDetails);
    setFilteredRentals(rentalDetails);
  };

  const loadAvailableTenantsAndProperties = () => {
    const tenants = tenantStorage.getAll();
    const properties = propertyStorage.getAll();
    
    setAvailableTenants(tenants.filter(t => t.status === "vacant"));
    setAvailableProperties(properties.filter(p => p.status === "available"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rental: Rental = {
      id: editingRental?.id || Date.now().toString(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyRent: parseCurrency(formData.monthlyRent),
      paymentDay: parseInt(formData.paymentDay),
      status: "active",
      createdAt: editingRental?.createdAt || new Date().toISOString()
    };

    rentalStorage.save(rental);

    const property = propertyStorage.getAll().find(p => p.id === formData.propertyId);
    if (property) {
      property.status = "rented";
      propertyStorage.save(property);
    }

    const tenant = tenantStorage.getAll().find(t => t.id === formData.tenantId);
    if (tenant) {
      tenant.status = "rented";
      tenantStorage.save(tenant);
    }

    if (!editingRental) {
      generatePayments(rental);
    }

    loadRentals();
    loadAvailableTenantsAndProperties();
    resetForm();
  };

  const generatePayments = (rental: Rental) => {
    const config = configStorage.get();
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), rental.paymentDay);
    
    if (currentDate < startDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    while (currentDate <= endDate) {
      const dueDate = new Date(currentDate);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const year = currentDate.getFullYear();
      
      const adminFee = rental.monthlyRent * (config.adminFeePercentage / 100);
      
      const payment = {
        id: `${rental.id}-${year}-${month}`,
        rentalId: rental.id,
        month,
        year,
        amount: rental.monthlyRent,
        adminFee,
        dueDate: dueDate.toISOString(),
        isPaid: false,
        createdAt: new Date().toISOString()
      };
      
      paymentStorage.save(payment);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  };

  const handleEdit = (rental: Rental, property: Property) => {
    setEditingRental(rental);
    setFormData({
      propertyId: rental.propertyId,
      tenantId: rental.tenantId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      monthlyRent: maskCurrency(rental.monthlyRent.toString()),
      paymentDay: rental.paymentDay.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (rentalId: string, propertyId: string, tenantId: string) => {
    if (confirm("Tem certeza que deseja excluir esta locação?")) {
      rentalStorage.delete(rentalId);
      
      const property = propertyStorage.getAll().find(p => p.id === propertyId);
      if (property) {
        property.status = "available";
        propertyStorage.save(property);
      }

      const tenant = tenantStorage.getAll().find(t => t.id === tenantId);
      if (tenant) {
        tenant.status = "vacant";
        tenantStorage.save(tenant);
      }

      const payments = paymentStorage.getAll();
      payments.filter(p => p.rentalId === rentalId).forEach(p => {
        paymentStorage.delete(p.id);
      });

      loadRentals();
      loadAvailableTenantsAndProperties();
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      monthlyRent: "",
      paymentDay: "5"
    });
    setEditingRental(null);
    setIsDialogOpen(false);
  };

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setFormData({ ...formData, monthlyRent: masked });
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      active: "Ativa",
      ended: "Encerrada",
      expired: "Vencida"
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    const variantMap = {
      active: "default" as const,
      ended: "secondary" as const,
      expired: "destructive" as const
    };
    return variantMap[status as keyof typeof variantMap] || "secondary";
  };

  return (
    <>
      <SEO 
        title="Locações - ImóvelControl"
        description="Gerenciamento de locações de imóveis"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Locações</h1>
              <p className="text-slate-600 mt-2">Gerenciamento de locações de imóveis</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Nova Locação</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar locações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "ended" | "expired")}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="ended">Encerradas</option>
              <option value="expired">Vencidas</option>
            </select>
          </div>

          {/* Inquilinos Disponíveis */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Users className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-slate-900">Inquilinos Disponíveis</h2>
              <Badge variant="secondary">{availableTenants.length}</Badge>
            </div>
            
            {availableTenants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {availableTenants.map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="truncate">{tenant.name}</span>
                          <Badge variant="secondary" className="ml-2">Disponível</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-sm text-slate-600 truncate">{tenant.phone}</p>
                        <p className="text-sm text-slate-600 truncate">{tenant.email}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">Nenhum inquilino disponível</p>
              </Card>
            )}
          </div>

          <Separator />

          {/* Imóveis Disponíveis */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="text-green-600" size={24} />
              <h2 className="text-xl font-semibold text-slate-900">Imóveis Disponíveis</h2>
              <Badge variant="secondary">{availableProperties.length}</Badge>
            </div>
            
            {availableProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {availableProperties.map((property) => (
                  <Link key={property.id} href={`/properties/${property.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="truncate">{property.local}</span>
                          <Badge variant="secondary" className="ml-2">Disponível</Badge>
                        </CardTitle>
                        {property.complement && (
                          <CardDescription className="text-xs truncate">{property.complement}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(property.monthlyRent)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">Nenhum imóvel disponível</p>
              </Card>
            )}
          </div>

          <Separator />

          {/* Imóveis Locados */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Key className="text-emerald-600" size={24} />
              <h2 className="text-xl font-semibold text-slate-900">Imóveis Locados</h2>
              <Badge variant="default">{filteredRentals.length}</Badge>
            </div>

            {filteredRentals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRentals.map(({ rental, property, tenant }) => (
                  <Card key={rental.id} className="hover:shadow-md transition-shadow">
                    <Link href={`/properties/${property.id}`}>
                      <CardHeader className="cursor-pointer pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <CardTitle className="text-base truncate">{property.local}</CardTitle>
                            {property.complement && (
                              <CardDescription className="text-xs mt-1 truncate">{property.complement}</CardDescription>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(rental.status)} className="ml-2">
                            {getStatusLabel(rental.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Link>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-slate-600">
                          <Users size={14} className="mr-2" />
                          <span className="truncate">{tenant.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar size={14} className="mr-2" />
                          <span>{formatDate(rental.startDate)} - {formatDate(rental.endDate)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Valor Mensal</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(rental.monthlyRent)}</p>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(rental, property)}
                          className="flex-1"
                        >
                          <Edit size={14} className="mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(rental.id, property.id, tenant.id)}
                          className="flex-1"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <Home className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma locação encontrada</h3>
                  <p className="text-slate-600 mb-6">Comece criando uma nova locação</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus size={18} className="mr-2" />
                    Nova Locação
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingRental ? "Editar Locação" : "Nova Locação"}</DialogTitle>
              <DialogDescription>
                {editingRental ? "Atualize as informações da locação" : "Adicione uma nova locação ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Imóvel *</Label>
                  <select
                    id="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    required
                    disabled={!!editingRental}
                  >
                    <option value="">Selecione o imóvel</option>
                    {(editingRental 
                      ? [...availableProperties, propertyStorage.getAll().find(p => p.id === editingRental.propertyId)].filter(Boolean)
                      : availableProperties
                    ).map((property) => (
                      <option key={property!.id} value={property!.id}>
                        {property!.local} - {property!.complement || property!.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantId">Inquilino *</Label>
                  <select
                    id="tenantId"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    required
                    disabled={!!editingRental}
                  >
                    <option value="">Selecione o inquilino</option>
                    {(editingRental 
                      ? [...availableTenants, tenantStorage.getAll().find(t => t.id === editingRental.tenantId)].filter(Boolean)
                      : availableTenants
                    ).map((tenant) => (
                      <option key={tenant!.id} value={tenant!.id}>
                        {tenant!.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Valor Mensal *</Label>
                    <Input
                      id="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={handleMoneyChange}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDay">Dia de Vencimento *</Label>
                    <Input
                      id="paymentDay"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.paymentDay}
                      onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRental ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}