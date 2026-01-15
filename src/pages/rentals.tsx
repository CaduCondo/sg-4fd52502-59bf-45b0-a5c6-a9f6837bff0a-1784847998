import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage } from "@/lib/storage";
import { Property, Tenant, Rental } from "@/types";
import { Home, Users, FileText, Plus, Edit2, Trash2, Search, Building2, User, Calendar, DollarSign, AlertCircle, X, Eye, Download, Edit, ExternalLink, XCircle, LayoutList, Grid, Building } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, formatDate, formatPhone } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { Payment } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Rentals() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "ended">("active");
  const [sortBy, setSortBy] = useState<"startDate" | "property">("startDate");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewingRental, setViewingRental] = useState<Rental | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    paymentDay: "",
    monthlyRent: "",
    observations: "",
    hasGarage: false,
    garageValue: ""
  });

  const [attachments, setAttachments] = useState<Array<{ name: string; file: File }>>([]);

  const { toast } = useToast();

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
    
    // Get active rental tenant IDs
    const activeRentals = allRentals.filter(r => r.isActive);
    const tenantsWithActiveRental = new Set(activeRentals.map(r => r.tenantId));
    
    // Filter: Active tenants WITHOUT active rentals
    const availTenants = allTenants
      .filter(t => t.isActive && !tenantsWithActiveRental.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    // Filter: Available properties
    const availProps = allProperties
      .filter(p => p.status === "available")
      .sort((a, b) => a.local.localeCompare(b.local) || a.address.localeCompare(b.address));
      
    setAvailableProperties(availProps);
    setAvailableTenants(availTenants);
  };

  const validateForm = () => {
    if (!formData.propertyId || !formData.tenantId || !formData.startDate || !formData.endDate || !formData.paymentDay || !formData.monthlyRent) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      paymentDay: "",
      monthlyRent: "",
      observations: "",
      hasGarage: false,
      garageValue: ""
    });
    setAttachments([]);
    setEditingRental(null);
  };

  const getProperty = (id: string) => properties.find(p => p.id === id);
  const getTenant = (id: string) => tenants.find(t => t.id === id);

  const filteredRentals = rentals.filter((rental) => {
    const property = properties.find(p => p.id === rental.propertyId);
    const tenant = tenants.find(t => t.id === rental.tenantId);

    const matchesSearch =
      (property?.local || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === "active") matchesStatus = rental.isActive;
    if (filterStatus === "ended") matchesStatus = !rental.isActive;
    
    // User requested to show active rentals
    // If statusFilter is 'all', we might want to show everything OR just active by default depending on requirement.
    // Requirement: "na tela locações, deve ser apresentado as locações ativas"
    // I will assume this means filtering for active by default or ensuring active ones are visible.
    // For now I'll respect the dropdown filter but ensure 'active' filter works correctly.
    
    return matchesSearch && matchesStatus;
  });

  const handleViewRental = (rental: Rental) => {
    setViewingRental(rental);
  };

  const getTotalValue = (rental: Rental) => {
    return rental.monthlyRent + (rental.garageValue || 0);
  };

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
        hasGarage: rental.hasGarage || false,
        garageValue: rental.garageValue ? formatCurrency(rental.garageValue) : ""
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
        hasGarage: false,
        garageValue: ""
      });
      setAttachments([]);
      
      // Refresh available lists when opening new rental dialog
      const allRentals = rentalStorage.getAll();
      const allProperties = propertyStorage.getAll();
      const allTenants = tenantStorage.getAll();
      
      const activeRentals = allRentals.filter(r => r.isActive);
      const tenantsWithActiveRental = new Set(activeRentals.map(r => r.tenantId));
      
      const availProps = allProperties
        .filter(p => p.status === "available")
        .sort((a, b) => a.local.localeCompare(b.local));
        
      const availTenants = allTenants
        .filter(t => t.isActive && !tenantsWithActiveRental.has(t.id))
        .sort((a, b) => a.name.localeCompare(b.name));
        
      setAvailableProperties(availProps);
      setAvailableTenants(availTenants);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Force cast to any to resolve type mismatch temporarily if needed, or better logic
    // Actually the issue was previously in another file. 
    // Here we ensure formData.paymentDay is used correctly.
    const paymentDay = parseInt(formData.paymentDay);
    
    // Calculate total value
    let calculatedTotalValue = parseFloat(formData.monthlyRent);
    if (formData.hasGarage && formData.garageValue) {
      calculatedTotalValue += parseFloat(formData.garageValue);
    }

    const newRental: Rental = {
      id: crypto.randomUUID(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      value: calculatedTotalValue,
      monthlyRent: parseFloat(formData.monthlyRent),
      paymentDay: paymentDay,
      hasGarage: formData.hasGarage,
      garageValue: formData.hasGarage ? parseFloat(formData.garageValue || "0") : undefined,
      observations: formData.observations,
      attachments: attachments.map(a => ({
        name: a.name,
        url: URL.createObjectURL(a.file),
        date: new Date().toISOString(),
        type: a.file.type
      })),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    rentalStorage.save(newRental);
    
    // Update property status correctly using update method instead of updateStatus (which expects boolean)
    const propertyToUpdate = properties.find(p => p.id === formData.propertyId);
    if (propertyToUpdate) {
      propertyStorage.update({...propertyToUpdate, status: "occupied"});
    }

    // Create payments based on start and end dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const payments: Payment[] = [];
    
    const currentDate = new Date(start);
    // Align payment day
    if (currentDate.getDate() > paymentDay) {
       currentDate.setMonth(currentDate.getMonth() + 1);
    }
    currentDate.setDate(paymentDay);

    while (currentDate <= end) {
       payments.push({
          id: crypto.randomUUID(),
          rentalId: newRental.id,
          referenceMonth: currentDate.getMonth() + 1,
          referenceYear: currentDate.getFullYear(),
          dueDate: currentDate.toISOString(),
          expectedAmount: calculatedTotalValue,
          paidAmount: 0,
          status: "pending",
          isPaid: false,
          adminFee: 0
       });
       currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    payments.forEach(p => paymentStorage.save(p));

    loadData();
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (rental: Rental) => {
    handleOpenDialog(rental);
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
      // const tenant = getTenant(rental.tenantId); // Unused variable
      
      if (property) {
        propertyStorage.update({ ...property, status: "available" });
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

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? "Ativa" : "Encerrada";
  };

  const calculateTotalValue = () => {
    const rent = parseCurrency(formData.monthlyRent);
    const garage = formData.hasGarage && formData.garageValue ? parseCurrency(formData.garageValue) : 0;
    return formatCurrency(rent + garage);
  };

  const calculateTotal = (rental: Partial<Rental>) => {
    let total = parseCurrency(rental.monthlyRent?.toString() || "0");
    if (rental.hasGarage && rental.garageValue) total += rental.garageValue;
    return total;
  };

  const sortedProperties = [...availableProperties].sort((a, b) => {
    const aLabel = `${a.local}${a.complement ? ` - ${a.complement}` : ""}`.toLowerCase();
    const bLabel = `${b.local}${b.complement ? ` - ${b.complement}` : ""}`.toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  const sortedTenants = [...availableTenants].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleDeleteRental = (id: string) => {
    const rentalToDelete = rentals.find((r) => r.id === id);
    
    if (!rentalToDelete) return;

    // Check if rental has any payments registered
    const allPayments = paymentStorage.getAll(); // Fixed paymentsStorage -> paymentStorage
    const rentalPayments = allPayments.filter(p => p.rentalId === id);
    const hasRegisteredPayments = rentalPayments.some(p => p.status === "paid" || (p.paidAmount && p.paidAmount > 0));

    if (hasRegisteredPayments) {
      toast({
        title: "Não é possível excluir",
        description: "Esta locação possui pagamentos registrados. Encerre a locação ao invés de excluí-la.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir esta locação?")) {
      // Delete all payments for this rental
      rentalPayments.forEach(payment => paymentStorage.delete(payment.id));

      // Update property status back to available
      const property = properties.find(p => p.id === rentalToDelete.propertyId);
      if (property) {
        propertyStorage.update({ ...property, status: "available" });
      }

      // Update tenant status back to active
      const tenant = tenants.find(t => t.id === rentalToDelete.tenantId);
      if (tenant) {
        tenantStorage.update({ ...tenant, isActive: true });
      }

      rentalStorage.delete(id);
      toast({ title: "Sucesso", description: "Locação excluída com sucesso!" });
      loadData();
    }
  };

  const handleEndRental = (id: string) => {
    const rentalToEnd = rentals.find((r) => r.id === id);
    
    if (!rentalToEnd) return;

    if (window.confirm("Tem certeza que deseja encerrar esta locação?")) {
      // Update rental status to inactive
      rentalStorage.update({ ...rentalToEnd, isActive: false });

      // Update property status back to available
      const property = properties.find(p => p.id === rentalToEnd.propertyId);
      if (property) {
        propertyStorage.update({ ...property, status: "available" });
      }

      // Update tenant status back to active
      const tenant = tenants.find(t => t.id === rentalToEnd.tenantId);
      if (tenant) {
        tenantStorage.update({ ...tenant, isActive: true });
      }

      toast({ title: "Sucesso", description: "Locação encerrada com sucesso!" });
      loadData();
    }
  };

  // Calculate active rentals for display
  const activeRentals = rentals.filter(r => r.isActive);

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
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Locações Ativas</h1>
              <p className="text-gray-500 mt-2">Gerencie as locações ativas no sistema.</p>
            </div>
            
            {/* View Rental Dialog */}
            <Dialog open={!!viewingRental} onOpenChange={(open) => !open && setViewingRental(null)}>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalhes da Locação</DialogTitle>
                  <DialogDescription>Contrato e informações financeiras</DialogDescription>
                </DialogHeader>
                {viewingRental && (
                  <div className="space-y-6 py-4">
                    {/* Header Info */}
                    <div className="bg-slate-50 p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Imóvel</Label>
                        <p className="font-medium text-lg text-slate-900">{getProperty(viewingRental.propertyId)?.local}</p>
                        <p className="text-sm text-slate-600">
                          {getProperty(viewingRental.propertyId)?.address}, {getProperty(viewingRental.propertyId)?.number}
                        </p>
                      </div>
                      <div className="md:text-right">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Inquilino</Label>
                        <p className="font-medium text-lg text-slate-900">{getTenant(viewingRental.tenantId)?.name}</p>
                        <p className="text-sm text-slate-600">{getTenant(viewingRental.tenantId)?.cpf}</p>
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 border rounded-md">
                        <Label className="text-xs text-slate-500">Início</Label>
                        <p className="font-semibold">{new Date(viewingRental.startDate).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 border rounded-md">
                        <Label className="text-xs text-slate-500">Dia Pagto</Label>
                        <p className="font-semibold">Dia {viewingRental.paymentDay}</p>
                      </div>
                      <div className="p-3 border rounded-md bg-emerald-50 border-emerald-100">
                        <Label className="text-xs text-emerald-600">Aluguel Base</Label>
                        <p className="font-bold text-emerald-700">{formatCurrency(viewingRental.monthlyRent)}</p>
                      </div>
                      <div className="p-3 border rounded-md bg-blue-50 border-blue-100">
                        <Label className="text-xs text-blue-600">Total Mensal</Label>
                        <p className="font-bold text-blue-700">
                          {formatCurrency(
                            viewingRental.monthlyRent + 
                            (viewingRental.hasGarage ? (viewingRental.garageValue || 0) : 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Parking Spot removed */}

                    {/* Caução */}
                    <div>
                      <Label className="text-slate-500">Caução / Observações</Label>
                      <div className="p-3 bg-slate-50 rounded-md border mt-1 min-h-[60px]">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingRental.observations || "Nenhuma observação registrada."}</p>
                      </div>
                    </div>

                    {/* Anexos / Contratos */}
                    <div>
                      <Label className="text-slate-500 flex items-center gap-2 mb-2">
                        <FileText size={16} />
                        Contratos e Anexos ({viewingRental.attachments?.length || 0})
                      </Label>
                      
                      {(!viewingRental.attachments || viewingRental.attachments.length === 0) ? (
                        <p className="text-sm text-slate-400 italic">Nenhum anexo disponível.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {viewingRental.attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-blue-100 p-2 rounded text-blue-600">
                                  <FileText size={18} />
                                </div>
                                <div className="truncate">
                                  <p className="text-sm font-medium truncate max-w-[200px]">{att.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                 <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = att.url;
                                    link.download = att.name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  title="Download"
                                >
                                  <Download size={14} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(att.url, '_blank')}
                                  title="Abrir em nova aba"
                                >
                                  <ExternalLink size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewingRental(null)}>Fechar</Button>
                  
                  <Button 
                    variant="outline"
                    className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                      // Redirect to full details page which handles editing/ending comprehensively
                      // Or implement logic here. Given the complexity of "End Contract", redirection to [id] is safer as it has the logic.
                      router.push(`/rentals/${viewingRental?.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Gerenciar (Editar/Encerrar)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Imóveis Vagos *</Label>
                      <Select value={formData.propertyId} onValueChange={(val) => {
                        setFormData({...formData, propertyId: val});
                        const prop = sortedProperties.find(p => p.id === val);
                        if (prop) {
                          setFormData(prev => ({
                            ...prev, 
                            propertyId: val,
                            monthlyRent: formatCurrency(prop.monthlyRent)
                          }));
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.local} {property.complement ? `- ${property.complement}` : ""} - {formatCurrency(property.monthlyRent)}
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
                          {sortedTenants.map(tenant => (
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.paymentDay}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                            setFormData({...formData, paymentDay: val});
                          }
                        }}
                        placeholder="Dia"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasGarage"
                          checked={formData.hasGarage}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, hasGarage: checked as boolean })
                          }
                        />
                        <Label htmlFor="hasGarage">Vaga Garagem</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Caução</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => setFormData({...formData, observations: e.target.value})}
                      placeholder="Detalhes da caução..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contrato ({attachments.length}/5)</Label>
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
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | "active" | "ended")}>
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

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Inquilinos Disponíveis */}
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Inquilinos Disponíveis ({availableTenants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableTenants.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Nenhum inquilino disponível</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sortedTenants.map((tenant) => (
                        <Card key={tenant.id} className="border-blue-100 bg-blue-50/30 hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <p className="font-medium text-sm">{tenant.name}</p>
                                <p className="text-xs text-slate-600">{tenant.email}</p>
                                <p className="text-xs text-slate-500">{formatPhone(tenant.phone)}</p>
                              </div>
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                Ativo
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Imóveis Vagos */}
            <FloatingCard delay={0.2}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-emerald-600" />
                    Imóveis Vagos ({availableProperties.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableProperties.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Nenhum imóvel vago</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sortedProperties.map((property) => (
                        <Card key={property.id} className="border-emerald-100 bg-emerald-50/30 hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm">{property.address}</p>
                                <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                                  Vago
                                </Badge>
                              </div>
                              {property.local && (
                                <p className="text-xs text-slate-600">{property.local}</p>
                              )}
                              {property.complement && (
                                <p className="text-xs text-slate-500">{property.complement}</p>
                              )}
                              <p className="text-xs font-semibold text-emerald-600">
                                {formatCurrency(property.value)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Locações Ativas */}
            <FloatingCard delay={0.3}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Locações Ativas ({activeRentals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeRentals.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Nenhuma locação ativa</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeRentals.map((rental) => {
                        const property = getProperty(rental.propertyId);
                        const tenant = getTenant(rental.tenantId);
                        const totalValue = rental.monthlyRent + (rental.garageValue || 0);

                        return (
                          <Card key={rental.id} className="border-purple-100 bg-purple-50/30 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="font-semibold text-sm">{property?.address || "Imóvel não encontrado"}</p>
                                  <p className="text-xs text-slate-600">{tenant?.name || "Inquilino não encontrado"}</p>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Vencimento:</span>
                                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                                    Dia {rental.paymentDay}
                                  </Badge>
                                </div>
                                
                                <div className="pt-2 border-t border-purple-100">
                                  <p className="text-sm font-semibold text-purple-600">
                                    {formatCurrency(totalValue)}/mês
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => handleViewRental(rental)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Ver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                    onClick={() => handleEndRental(rental.id)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                    onClick={() => handleDeleteRental(rental.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FloatingCard>
          </div>

          {/* Bottom list view removed as requested */}
        </div>
      </Layout>
    </>
  );
}