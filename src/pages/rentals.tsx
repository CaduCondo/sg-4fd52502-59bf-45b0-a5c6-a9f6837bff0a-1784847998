import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { rentalStorage, propertyStorage, tenantStorage, paymentStorage } from "@/lib/storage";
import { Rental, Property, Tenant } from "@/types";
import { Home, Plus, Edit, Trash2, Search, User, Building2, Calendar, XCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    monthlyRent: "",
    status: "active" as "active" | "terminated"
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRentals();
    loadAvailableProperties();
    loadTenants();
  }, [router]);

  useEffect(() => {
    const filtered = rentals.filter(r =>
      r.property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRentals(filtered);
  }, [searchTerm, rentals]);

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

    setRentals(rentalDetails);
    setFilteredRentals(rentalDetails);
  };

  const loadAvailableProperties = () => {
    const properties = propertyStorage.getAll();
    const available = properties.filter(p => p.status === "available");
    setAvailableProperties(available);
  };

  const loadTenants = () => {
    const tenants = tenantStorage.getAll();
    setAllTenants(tenants);
  };

  const generatePaymentsForRental = (rental: Rental) => {
    const startDate = new Date(rental.startDate);
    const currentDate = new Date();
    
    const date = new Date(startDate);
    date.setDate(5);
    
    while (date <= currentDate) {
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      
      const existingPayment = paymentStorage.getAll().find(
        p => p.rentalId === rental.id && p.month === month && p.year === year
      );
      
      if (!existingPayment) {
        const payment = {
          id: `${rental.id}-${month}-${year}`,
          rentalId: rental.id,
          month,
          year,
          amount: rental.monthlyRent,
          isPaid: false,
          dueDate: date.toISOString(),
          createdAt: new Date().toISOString()
        };
        paymentStorage.save(payment);
      }
      
      date.setMonth(date.getMonth() + 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rental: Rental = {
      id: editingRental?.id || Date.now().toString(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: formData.startDate,
      monthlyRent: parseFloat(formData.monthlyRent),
      status: formData.status,
      createdAt: editingRental?.createdAt || new Date().toISOString()
    };

    rentalStorage.save(rental);
    
    const property = propertyStorage.getAll().find(p => p.id === rental.propertyId);
    if (property) {
      property.status = rental.status === "active" ? "rented" : "available";
      propertyStorage.save(property);
    }
    
    if (rental.status === "active") {
      generatePaymentsForRental(rental);
    }
    
    loadRentals();
    loadAvailableProperties();
    resetForm();
  };

  const handleEdit = (rental: Rental) => {
    setEditingRental(rental);
    setFormData({
      propertyId: rental.propertyId,
      tenantId: rental.tenantId,
      startDate: rental.startDate.split("T")[0],
      monthlyRent: rental.monthlyRent.toString(),
      status: rental.status
    });
    setIsDialogOpen(true);
  };

  const handleTerminate = (rental: Rental) => {
    if (confirm("Tem certeza que deseja encerrar esta locação?")) {
      rental.status = "terminated";
      rentalStorage.save(rental);
      
      const property = propertyStorage.getAll().find(p => p.id === rental.propertyId);
      if (property) {
        property.status = "available";
        propertyStorage.save(property);
      }
      
      loadRentals();
      loadAvailableProperties();
    }
  };

  const handleDelete = (id: string, propertyId: string) => {
    if (confirm("Tem certeza que deseja excluir esta locação?")) {
      rentalStorage.delete(id);
      
      const property = propertyStorage.getAll().find(p => p.id === propertyId);
      if (property) {
        property.status = "available";
        propertyStorage.save(property);
      }
      
      loadRentals();
      loadAvailableProperties();
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      monthlyRent: "",
      status: "active"
    });
    setEditingRental(null);
    setIsDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
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
              <p className="text-slate-600 mt-2">Gerenciamento de contratos de locação</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Nova Locação</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar locações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRentals.map(({ rental, property, tenant }) => (
              <Card key={rental.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{property.address}</CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center space-x-2">
                          <User size={14} />
                          <span>{tenant.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} />
                          <span>Início: {formatDate(rental.startDate)}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant={rental.status === "active" ? "default" : "secondary"}>
                      {rental.status === "active" ? "Ativa" : "Encerrada"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600">Valor Mensal</p>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(rental.monthlyRent)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(rental)}
                        className="flex-1"
                      >
                        <Edit size={16} className="mr-2" />
                        Editar
                      </Button>
                      {rental.status === "active" && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleTerminate(rental)}
                          className="flex-1"
                        >
                          <XCircle size={16} className="mr-2" />
                          Encerrar
                        </Button>
                      )}
                      {rental.status === "terminated" && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(rental.id, rental.propertyId)}
                          className="flex-1"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRentals.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Home className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma locação encontrada</h3>
                <p className="text-slate-600 mb-6">Comece adicionando sua primeira locação</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus size={18} className="mr-2" />
                  Adicionar Locação
                </Button>
              </div>
            </Card>
          )}
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
                  <Label htmlFor="propertyId">Imóvel</Label>
                  <select
                    id="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    required
                  >
                    <option value="">Selecione um imóvel</option>
                    {availableProperties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <select
                    id="tenantId"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                    required
                  >
                    <option value="">Selecione um inquilino</option>
                    {allTenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Valor Mensal</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "terminated" })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
                  >
                    <option value="active">Ativa</option>
                    <option value="terminated">Encerrada</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRental ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}