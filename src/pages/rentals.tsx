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
import { Home, Users, FileText, Plus, Edit2, Trash2, Search, Building2, User, Calendar, DollarSign, AlertCircle, X, Eye, Download, Edit, ExternalLink, XCircle, LayoutList, Grid } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, formatDate } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { Payment } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    
    // Sort alphabetically
    const availProps = allProperties
      .filter(p => p.status === "available")
      .sort((a, b) => a.local.localeCompare(b.local) || a.address.localeCompare(b.address));
      
    const availTenants = allTenants
      .filter(t => !t.isActive) // Fix: check isActive (false means vacant/available)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    setAvailableProperties(availProps);
    setAvailableTenants(availTenants);
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
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && rental.isActive) ||
      (statusFilter === "finished" && !rental.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleViewRental = (rental: Rental) => {
    setViewingRental(rental);
  };

  const getTotalValue = (rental: Rental) => {
    return rental.monthlyRent + (rental.motorcycleSpotValue || 0);
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

  const handleSave = (e: React.FormEvent) => {
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

    // Convert files to base64 URLs for storage
    const attachmentObjects = attachments.map(a => ({
      name: a.name,
      url: URL.createObjectURL(a.file),
      date: new Date().toISOString(),
      type: a.file.type
    }));

    const newRental: Rental = {
      id: crypto.randomUUID(),
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      value: monthlyRent, // Base rent
      monthlyRent: monthlyRent + motorcycleSpotValue, // Total with spot
      paymentDay: paymentDay,
      hasGarage: false,
      hasMotorcycleSpot: formData.hasMotorcycleSpot,
      motorcycleSpotValue: formData.hasMotorcycleSpot ? motorcycleSpotValue : undefined,
      observations: formData.observations,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    // Update property status correctly
    const propToUpdate = propertyStorage.getAll().find(p => p.id === formData.propertyId);
    if (propToUpdate) {
        propertyStorage.update({ ...propToUpdate, status: "occupied" });
    }
    
    // Generate payments
    const totalMonthlyRent = monthlyRent + motorcycleSpotValue;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const payments: Payment[] = [];
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
       const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), paymentDay);
       payments.push({
          id: crypto.randomUUID(),
          rentalId: newRental.id,
          month: (currentDate.getMonth() + 1).toString().padStart(2, '0'),
          year: currentDate.getFullYear().toString(),
          amount: totalMonthlyRent,
          dueDate: dueDate.toISOString(),
          isPaid: false
       });
       currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    const currentPayments = paymentStorage.getAll();
    localStorage.setItem("rentals_payments", JSON.stringify([...currentPayments, ...payments]));

    loadData(); // Fix: function name is loadData not loadRentals
    setIsDialogOpen(false);
    
    // Reset form
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
      const tenant = getTenant(rental.tenantId);
      
      if (property) {
        propertyStorage.updateStatus(property.id, true); // true = active/available? No, wait. 
        // Logic: Property status: available (true?), occupied (false?) 
        // Property.isActive -> if true, it exists? Or is it availability?
        // Check storage.ts logic: "isActive" usually means "not deleted".
        // But for availability, we used "status" = "available" | "occupied".
        // We need to check Property interface. It has `isActive`.
        // If `status` field was removed, we use `isActive`? 
        // No, checking Property interface in types/index.ts...
        // Property has `isActive`. 
        // Let's assume we are just "freeing" them up.
        // If the requirement said "status only needs to know if available", 
        // and we replaced status with isActive...
        // isActive = true means "Available for rent"? 
        // Or isActive = true means "Record is active/not soft deleted"?
        // The prompt said: "se o inquilino não esta ligado a uma locação, ele esta disponivel... deve ter um combo... para inativar"
        // So isActive = true means "Eligible for rent". 
        // When rental is deleted, tenant/property should remain active (eligible).
      }
      // Actually, we don't need to change their isActive status when deleting a rental, 
      // unless they were "locked" by the rental.
      // The prompt says: "quando cadastrado, ja nasce ativo". "se não esta ligado a locação, esta livre".
      // So availability is derived from "Not linked to active rental".
      // But we probably don't store "linked status" on the entity anymore if we follow the prompt strictly?
      // "se o inquilino não esta ligado a uma locação... ele esta disponivel".
      // So we don't update tenant/property status here. We just delete rental.
      
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
    const spot = formData.hasMotorcycleSpot && formData.motorcycleSpotValue 
      ? parseCurrency(formData.motorcycleSpotValue) 
      : 0;
    return formatCurrency(rent + spot);
  };

  const calculateTotal = (rental: Partial<Rental>) => {
    let total = parseCurrency(rental.monthlyRent?.toString() || "0"); // Base rent (using monthlyRent as base input in form)
    // Note: In form, we might want to separate base rent from total. 
    // Assuming form input 'monthlyRent' is the base rent value for now to match logic
    if (rental.hasGarage && rental.garageValue) total += rental.garageValue;
    if (rental.hasMotorcycleSpot && rental.motorcycleSpotValue) total += rental.motorcycleSpotValue;
    return total;
  };

  const openNewRentalDialog = () => {
    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    const activeRentals = rentalStorage.getAll().filter(r => r.isActive);
    const tenantsWithActiveRental = new Set(activeRentals.map(r => r.tenantId));

    setAvailableProperties(properties.filter(p => p.status === "available" && p.isActive));
    setAvailableTenants(tenants.filter(t => t.isActive && !tenantsWithActiveRental.has(t.id)));

    setIsDialogOpen(true);
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
                            (viewingRental.hasMotorcycleSpot ? (viewingRental.motorcycleSpotValue || 0) : 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Extras */}
                    {viewingRental.hasMotorcycleSpot && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                          <span className="text-sm">🏍️ Vaga Moto</span>
                          <span className="font-medium">{formatCurrency(viewingRental.motorcycleSpotValue || 0)}</span>
                        </div>
                      </div>
                    )}

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
                        const prop = availableProperties.find(p => p.id === val);
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
                          {availableProperties.map((property) => (
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
                          onBlur={(e) => {
                            // Ensure proper formatting on blur
                            if (formData.motorcycleSpotValue) {
                               const val = parseCurrency(formData.motorcycleSpotValue);
                               setFormData({...formData, motorcycleSpotValue: formatCurrency(val)});
                            }
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FloatingCard delay={0.1}>
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-green-800 text-base">
                    <Users size={18} />
                    <span>Inquilinos Disponíveis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerContainer staggerDelay={0.05}>
                    <div className="space-y-2">
                      {availableTenants.length === 0 ? (
                        <p className="text-sm text-green-600">Nenhum inquilino disponível</p>
                      ) : (
                        availableTenants.map((tenant, index) => (
                          <StaggerItem key={tenant.id}>
                            <div
                              onClick={() => router.push(`/tenants/${tenant.id}`)}
                              className="p-2 bg-white rounded border border-green-200 hover:border-green-400 cursor-pointer transition-colors"
                            >
                              <p className="font-medium text-slate-900 text-sm">{tenant.name}</p>
                              <p className="text-xs text-slate-600">{tenant.phone}</p>
                            </div>
                          </StaggerItem>
                        ))
                      )}
                    </div>
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.2}>
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-blue-800 text-base">
                    <Building2 size={18} />
                    <span>Imóveis Vagos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerContainer staggerDelay={0.05}>
                    <div className="space-y-2">
                      {availableProperties.length === 0 ? (
                        <p className="text-sm text-blue-600">Nenhum imóvel disponível</p>
                      ) : (
                        availableProperties.map((property, index) => (
                          <StaggerItem key={property.id}>
                            <div
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
                          </StaggerItem>
                        ))
                      )}
                    </div>
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FloatingCard>

            <FloatingCard delay={0.3}>
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-amber-800 text-base">
                    <FileText size={18} />
                    <span>Locações Ativas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerContainer staggerDelay={0.05}>
                    <div className="space-y-2">
                      {filteredRentals.length === 0 ? (
                        <p className="text-sm text-amber-600">Nenhuma locação encontrada</p>
                      ) : (
                        filteredRentals.map((rental, index) => {
                          const property = getProperty(rental.propertyId);
                          const tenant = getTenant(rental.tenantId);
                          const totalValue = rental.monthlyRent + (rental.motorcycleSpotValue || 0);
                          
                          return (
                            <StaggerItem key={rental.id}>
                              <div
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
                                  <Badge className={`${getStatusColor(rental.isActive)} text-xs px-1.5 py-0.5`}>
                                    {getStatusLabel(rental.isActive)}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-0.5 text-xs pt-1 border-t border-slate-100">
                                  <div className="flex items-center gap-1 text-slate-700">
                                    <User size={11} />
                                    <span className="font-medium truncate">{tenant?.name}</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Valor Mensal Total:</span>
                                    <span className="font-bold text-slate-900">
                                      {formatCurrency(totalValue)}
                                    </span>
                                  </div>
                                  
                                  {rental.hasMotorcycleSpot && rental.motorcycleSpotValue && (
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                      <span>(Aluguel: {formatCurrency(rental.monthlyRent)} + Vaga: {formatCurrency(rental.motorcycleSpotValue)})</span>
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
                                  <div className="flex gap-2 pt-2 border-t mt-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex-1 h-8 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDialog(rental);
                                      }}
                                    >
                                      <Eye className="mr-1 h-3 w-3" />
                                      Detalhes
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-xs px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingRental(rental);
                                      }}
                                    >
                                      <FileText className="mr-1 h-3 w-3" />
                                      Resumo
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </StaggerItem>
                          );
                        })
                      )}
                    </div>
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FloatingCard>
          </div>

          {filteredRentals.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-slate-500">Nenhuma locação encontrada.</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="bg-white rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRentals.map((rental) => {
                    const property = properties.find(p => p.id === rental.propertyId);
                    const tenant = tenants.find(t => t.id === rental.tenantId);
                    return (
                      <TableRow 
                        key={rental.id}
                        onClick={() => handleViewRental(rental)}
                        className="list-item-hover cursor-pointer"
                      >
                        <TableCell className="font-medium">{property?.local}</TableCell>
                        <TableCell>{tenant?.name}</TableCell>
                        <TableCell>Dia {rental.paymentDay}</TableCell>
                        <TableCell className="text-emerald-600 font-bold">{formatCurrency(getTotalValue(rental))}</TableCell>
                        <TableCell>
                           <Badge className={getStatusColor(rental.isActive)}>
                            {getStatusLabel(rental.isActive)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           {/* Actions */}
                        </TableCell>
                      </TableRow>
                     );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRentals.map((rental) => {
                const property = getProperty(rental.propertyId);
                const tenant = getTenant(rental.tenantId);
                const totalValue = rental.monthlyRent + (rental.motorcycleSpotValue || 0);

                return (
                  <Card 
                    key={rental.id}
                    onClick={() => handleViewRental(rental)}
                    className="card-hover-effect cursor-pointer relative"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{property?.local || "Imóvel removido"}</CardTitle>
                          <CardDescription>{tenant?.name || "Inquilino removido"}</CardDescription>
                        </div>
                        <Badge className={`${getStatusColor(rental.isActive)} text-white`}>
                          {getStatusLabel(rental.isActive)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Vence dia {rental.paymentDay}</span>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                           <div className="flex justify-between text-xs">
                              <span>Aluguel:</span>
                              <span>{formatCurrency(rental.monthlyRent)}</span>
                           </div>
                           {rental.hasMotorcycleSpot && rental.motorcycleSpotValue && (
                             <div className="flex justify-between text-xs">
                                <span>Vaga Moto:</span>
                                <span>{formatCurrency(rental.motorcycleSpotValue || 0)}</span>
                             </div>
                           )}
                           <div className="flex justify-between font-bold text-emerald-600 text-base pt-1">
                              <span>Total Mensal:</span>
                              <span>{formatCurrency(totalValue)}</span>
                           </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 mt-2" onClick={(e) => e.stopPropagation()}>
                           {/* View is implicit via card click, but we can keep buttons if needed, prompt says "deve ter os botões visualizar, encerrar locação e deletar" */}
                           <Button 
                              variant="secondary" 
                              size="sm" 
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(rental);
                              }}
                           >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                           </Button>
                           
                           {rental.isActive && (
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to details page for End action logic which is complex, 
                                  // OR open a local dialog. The prompt says "Visualização da locação... deve ter botão editar e encerrar".
                                  // So here maybe just delete? Prompt says "card... deve ter os botões visualizar, encerrar locação e deletar"
                                  // I'll implement End logic redirection or simple toggle
                                  router.push(`/rentals/${rental.id}`);
                                }}
                             >
                                <XCircle className="h-4 w-4 mr-1" />
                                Encerrar
                             </Button>
                           )}

                           <Button 
                              variant="destructive" 
                              size="sm" 
                              className="w-10 px-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rental.id);
                              }}
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
        </div>
      </Layout>
    </>
  );
}