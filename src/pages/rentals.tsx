import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage } from "@/lib/storage";
import { Property, Tenant, Rental } from "@/types";
import { Home, Users, FileText, Plus, Edit2, Trash2, Search, Building2, User, Calendar, DollarSign, AlertCircle, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, formatDate } from "@/lib/masks";

export default function Rentals() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    paymentDay: "",
    monthlyRent: "",
    observations: "",
    hasMotorcycleSpot: false,
    motorcycleSpotValue: ""
  });

  const [attachments, setAttachments] = useState<Array<{ name: string; file: File }>>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = () => {
    const allRentals = rentalStorage.getAll();
    const allProperties = propertyStorage.getAll();
    const allTenants = tenantStorage.getAll();
    
    setRentals(allRentals);
    setProperties(allProperties);
    setTenants(allTenants);
    setAvailableProperties(allProperties.filter(p => p.status === "available"));
    setAvailableTenants(allTenants.filter(t => t.status === "vacant"));
  };

  const getProperty = (id: string) => properties.find(p => p.id === id);
  const getTenant = (id: string) => tenants.find(t => t.id === id);

  const filteredRentals = rentals.filter(rental => {
    const property = getProperty(rental.propertyId);
    const tenant = getTenant(rental.tenantId);
    const matchesSearch = searchTerm === "" || 
      property?.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rental.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (rental?: Rental) => {
    if (rental) {
      setEditingRental(rental);
      setFormData({
        propertyId: rental.propertyId,
        tenantId: rental.tenantId,
        startDate: rental.startDate.split("T")[0],
        endDate: rental.endDate.split("T")[0],
        paymentDay: rental.paymentDay.toString(),
        monthlyRent: formatCurrency(rental.monthlyRent),
        observations: rental.observations || "",
        hasMotorcycleSpot: rental.hasMotorcycleSpot || false,
        motorcycleSpotValue: rental.motorcycleSpotValue ? formatCurrency(rental.motorcycleSpotValue) : ""
      });
      setAttachments([]);
    } else {
      setEditingRental(null);
      setFormData({
        propertyId: "",
        tenantId: "",
        startDate: "",
        endDate: "",
        paymentDay: "",
        monthlyRent: "",
        observations: "",
        hasMotorcycleSpot: false,
        motorcycleSpotValue: ""
      });
      setAttachments([]);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyId || !formData.tenantId || !formData.startDate || 
        !formData.endDate || !formData.paymentDay || !formData.monthlyRent) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (formData.hasMotorcycleSpot && !formData.motorcycleSpotValue) {
      alert("O valor da vaga de moto é obrigatório quando marcado");
      return;
    }

    const paymentDay = parseInt(formData.paymentDay);
    if (paymentDay < 1 || paymentDay > 28) {
      alert("O dia de pagamento deve estar entre 1 e 28");
      return;
    }

    const monthlyRent = parseCurrency(formData.monthlyRent);
    const motorcycleSpotValue = formData.hasMotorcycleSpot && formData.motorcycleSpotValue 
      ? parseCurrency(formData.motorcycleSpotValue) 
      : 0;

    const rental: Rental = {
      id: editingRental?.id || crypto.randomUUID(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      paymentDay,
      monthlyRent,
      observations: formData.observations,
      hasMotorcycleSpot: formData.hasMotorcycleSpot,
      motorcycleSpotValue,
      attachments: attachments.map(a => a.name),
      status: "active",
      createdAt: editingRental?.createdAt || new Date().toISOString()
    };

    rentalStorage.save(rental);

    const property = getProperty(rental.propertyId);
    const tenant = getTenant(rental.tenantId);
    if (property) {
      property.status = "occupied";
      propertyStorage.save(property);
    }
    if (tenant) {
      tenant.status = "active";
      tenantStorage.save(tenant);
    }

    if (!editingRental) {
      generatePayments(rental);
    }

    loadData();
    setIsDialogOpen(false);
  };

  const generatePayments = (rental: Rental) => {
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const dueDate = new Date(year, currentDate.getMonth(), rental.paymentDay);

      if (dueDate >= start && dueDate <= end) {
        const totalValue = rental.monthlyRent + (rental.motorcycleSpotValue || 0);
        const payment = {
          id: crypto.randomUUID(),
          rentalId: rental.id,
          month,
          year,
          amount: totalValue,
          isPaid: false,
          dueDate: dueDate.toISOString(),
          createdAt: new Date().toISOString()
        };
        paymentStorage.save(payment);
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  };

  const handleDelete = (id: string) => {
    const rental = rentals.find(r => r.id === id);
    if (!rental) return;

    const payments = paymentStorage.getAll().filter(p => p.rentalId === id);
    const hasPaidPayments = payments.some(p => p.isPaid);

    if (hasPaidPayments) {
      alert("Não é possível excluir esta locação pois há pagamentos registrados.");
      return;
    }

    if (confirm("Tem certeza que deseja excluir esta locação? Esta ação não pode ser desfeita.")) {
      const property = getProperty(rental.propertyId);
      const tenant = getTenant(rental.tenantId);
      
      if (property) {
        property.status = "available";
        propertyStorage.save(property);
      }
      if (tenant) {
        tenant.status = "vacant";
        tenantStorage.save(tenant);
      }

      payments.forEach(p => paymentStorage.delete(p.id));
      rentalStorage.delete(id);
      loadData();
    }
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFile = e.target.files[0];
      
      if (attachments.length >= 5) {
        alert("Você pode anexar no máximo 5 arquivos");
        return;
      }

      setAttachments([...attachments, { name: newFile.name, file: newFile }]);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "ended": return "bg-gray-100 text-gray-800 border-gray-200";
      case "expired": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativa";
      case "ended": return "Encerrada";
      case "expired": return "Vencida";
      default: return status;
    }
  };

  const calculateTotalValue = () => {
    const rent = parseCurrency(formData.monthlyRent);
    const spot = formData.hasMotorcycleSpot && formData.motorcycleSpotValue 
      ? parseCurrency(formData.motorcycleSpotValue) 
      : 0;
    return formatCurrency(rent + spot);
  };

  return (
    <>
      <SEO 
        title="Locações - ImóvelControl"
        description="Gerenciamento de locações de imóveis"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestão de Locações</h1>
              <p className="text-slate-600 mt-2">Gerencie as locações de imóveis</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
                  <Plus size={18} />
                  <span>Nova Locação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRental ? "Editar Locação" : "Nova Locação"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Imóveis Vagos *</Label>
                      <Select 
                        value={formData.propertyId}
                        onValueChange={(value) => setFormData({...formData, propertyId: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map(property => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.local} - {property.address}, {property.number}
                              {property.complement && ` - ${property.complement}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Inquilinos Disponíveis *</Label>
                      <Select 
                        value={formData.tenantId}
                        onValueChange={(value) => setFormData({...formData, tenantId: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o inquilino" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data Início Contrato *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data Término Contrato *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentDay">Dia de Pagamento *</Label>
                      <Input
                        id="paymentDay"
                        type="number"
                        min="1"
                        max="28"
                        value={formData.paymentDay}
                        onChange={(e) => setFormData({...formData, paymentDay: e.target.value})}
                        placeholder="1-28"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Valor Mensal *</Label>
                    <Input
                      id="monthlyRent"
                      type="text"
                      value={formData.monthlyRent}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted = formatCurrency(parseFloat(value) / 100);
                        setFormData({...formData, monthlyRent: formatted});
                      }}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasMotorcycleSpot"
                        checked={formData.hasMotorcycleSpot}
                        onChange={(e) => setFormData({
                          ...formData, 
                          hasMotorcycleSpot: e.target.checked,
                          motorcycleSpotValue: e.target.checked ? formData.motorcycleSpotValue : ""
                        })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="hasMotorcycleSpot">Vaga Garagem ?</Label>
                    </div>

                    {formData.hasMotorcycleSpot && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="motorcycleSpotValue">Valor da Vaga *</Label>
                        <Input
                          id="motorcycleSpotValue"
                          type="text"
                          value={formData.motorcycleSpotValue}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const formatted = formatCurrency(parseFloat(value) / 100);
                            setFormData({...formData, motorcycleSpotValue: formatted});
                          }}
                          placeholder="R$ 0,00"
                          required={formData.hasMotorcycleSpot}
                        />
                      </div>
                    )}

                    {(formData.monthlyRent || formData.motorcycleSpotValue) && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-slate-600">Valor Total Mensal:</p>
                        <p className="text-2xl font-bold text-blue-700">{calculateTotalValue()}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => setFormData({...formData, observations: e.target.value})}
                      placeholder="Detalhes do contrato..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Anexos ({attachments.length}/5)</Label>
                    <div className="space-y-2">
                      {attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                          <span className="text-sm text-slate-700 truncate flex-1">{attachment.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAttachment(index)}
                            className="ml-2"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      {attachments.length < 5 && (
                        <div>
                          <Input
                            type="file"
                            onChange={handleAddAttachment}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            id="file-upload"
                          />
                          <Label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                          >
                            <Plus size={16} className="mr-2" />
                            Adicionar Arquivo
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" className="flex-1">
                      Salvar
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Buscar por imóvel ou inquilino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="ended">Encerradas</SelectItem>
                <SelectItem value="expired">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-green-800 text-base">
                  <Users size={18} />
                  <span>Inquilinos Disponíveis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableTenants.length === 0 ? (
                    <p className="text-sm text-green-600">Nenhum inquilino disponível</p>
                  ) : (
                    availableTenants.map(tenant => (
                      <div
                        key={tenant.id}
                        onClick={() => router.push(`/tenants/${tenant.id}`)}
                        className="p-2 bg-white rounded border border-green-200 hover:border-green-400 cursor-pointer transition-colors"
                      >
                        <p className="font-medium text-slate-900 text-sm">{tenant.name}</p>
                        <p className="text-xs text-slate-600">{tenant.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-blue-800 text-base">
                  <Building2 size={18} />
                  <span>Imóveis Vagos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableProperties.length === 0 ? (
                    <p className="text-sm text-blue-600">Nenhum imóvel disponível</p>
                  ) : (
                    availableProperties.map(property => (
                      <div
                        key={property.id}
                        onClick={() => router.push(`/properties/${property.id}`)}
                        className="p-2 bg-white rounded border border-blue-200 hover:border-blue-400 cursor-pointer transition-colors"
                      >
                        <p className="font-medium text-slate-900 text-sm">{property.local}</p>
                        <p className="text-xs text-slate-600">
                          {property.address}, {property.number}
                        </p>
                        <p className="text-xs text-blue-700 font-medium mt-1">
                          {formatCurrency(property.monthlyRent)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-amber-800 text-base">
                  <FileText size={18} />
                  <span>Locações Ativas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredRentals.length === 0 ? (
                    <p className="text-sm text-amber-600">Nenhuma locação encontrada</p>
                  ) : (
                    filteredRentals.map(rental => {
                      const property = getProperty(rental.propertyId);
                      const tenant = getTenant(rental.tenantId);
                      const totalValue = rental.monthlyRent + (rental.motorcycleSpotValue || 0);
                      
                      return (
                        <div
                          key={rental.id}
                          className="p-2.5 bg-white rounded border border-amber-200 hover:border-amber-400 cursor-pointer transition-colors space-y-1.5"
                          onClick={() => router.push(`/rentals/${rental.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {property?.local}
                              </p>
                              {property?.complement && (
                                <p className="text-xs text-slate-600 truncate">{property.complement}</p>
                              )}
                            </div>
                            <Badge className={`${getStatusColor(rental.status)} text-xs px-1.5 py-0.5`}>
                              {getStatusLabel(rental.status)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-0.5 text-xs pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1 text-slate-700">
                              <User size={11} />
                              <span className="font-medium truncate">{tenant?.name}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Valor Mensal:</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(rental.monthlyRent)}
                              </span>
                            </div>
                            
                            {rental.hasMotorcycleSpot && rental.motorcycleSpotValue && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Vaga Garagem:</span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(rental.motorcycleSpotValue)}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                              <span className="text-slate-600 font-medium">Total:</span>
                              <span className="font-bold text-green-700">
                                {formatCurrency(totalValue)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(rental);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rental.id);
                              }}
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}