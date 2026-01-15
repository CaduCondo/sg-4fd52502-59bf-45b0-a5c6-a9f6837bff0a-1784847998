import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage, configStorage } from "@/lib/storage";
import { Property, Tenant, Rental, Payment, SystemConfig } from "@/types";
import { DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Eye, Download, ExternalLink, FileText, Edit, LayoutList, Grid } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, numberToWords } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Payments() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    paidDate: "",
    paidAmount: "",
    paymentMethod: "Pix",
    notes: ""
  });
  const [attachments, setAttachments] = useState<Array<{ name: string; file: File }>>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
    
    loadData();
  }, [router]);

  const loadData = () => {
    const allPayments = paymentStorage.getAll();
    const allRentals = rentalStorage.getAll();
    const allProperties = propertyStorage.getAll();
    const allTenants = tenantStorage.getAll();
    const systemConfig = configStorage.get();
    
    setPayments(allPayments);
    setRentals(allRentals);
    setProperties(allProperties);
    setTenants(allTenants);
    setConfig(systemConfig);
  };

  const getRental = (id: string) => rentals.find(r => r.id === id);
  const getProperty = (rental: Rental) => properties.find(p => p.id === rental.propertyId);
  const getTenant = (rental: Rental) => tenants.find(t => t.id === rental.tenantId);

  const filteredPayments = payments.filter(payment => {
    // Ensure strict string comparison
    const matchesMonth = filterMonth === "all" || payment.referenceMonth.toString() === filterMonth;
    const matchesYear = payment.referenceYear.toString() === filterYear;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "paid" && payment.isPaid) ||
      (filterStatus === "pending" && !payment.isPaid);
    return matchesMonth && matchesYear && matchesStatus;
  });

  const unpaidPayments = payments.filter(p => {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0");
    const currentYear = now.getFullYear().toString();
    // Ensure strict string comparison
    return !p.isPaid && p.referenceMonth.toString() === currentMonth && p.referenceYear.toString() === currentYear;
  });

  const calculateTotals = () => {
    const totalReceived = filteredPayments
      .filter(p => p.isPaid)
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    const totalPending = filteredPayments
      .filter(p => !p.isPaid)
      .reduce((sum, p) => sum + p.expectedAmount, 0);

    // Admin fee only for properties NOT in "Outros" location
    const adminFee = filteredPayments
      .filter(p => p.isPaid)
      .reduce((sum, p) => {
        const rental = getRental(p.rentalId);
        if (!rental) return sum;
        const property = getProperty(rental);
        if (!property || property.local === "Outros") return sum;
        return sum + ((p.paidAmount || 0) * (config?.adminFeePercentage || 0) / 100);
      }, 0);

    const totalFiltered = filteredPayments.reduce((sum, p) => sum + p.expectedAmount, 0);

    return { totalReceived, totalPending, adminFee, totalFiltered };
  };

  const { totalReceived, totalPending, adminFee, totalFiltered } = calculateTotals();

  const handleViewPayment = (payment: Payment) => {
    setViewingPayment(payment);
  };

  const handleOpenDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      paidDate: new Date().toISOString().split("T")[0],
      paidAmount: formatCurrency(payment.expectedAmount),
      paymentMethod: "Pix",
      notes: ""
    });
    setAttachments([]);
    setIsDialogOpen(true);
  };

  const calculateLateFee = (payment: Payment, paidDate: string) => {
    const dueDate = new Date(payment.dueDate);
    const paymentDate = new Date(paidDate);
    
    // No late fee if paid on or before due date
    if (paymentDate <= dueDate) return 0;
    
    const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLate <= 0) return 0;
    
    // 2% fine + 0.033% per day late
    const baseAmount = payment.expectedAmount;
    const fine = baseAmount * 0.02;
    const dailyInterest = baseAmount * 0.00033 * daysLate;
    
    return fine + dailyInterest;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;

    const paidAmount = parseCurrency(formData.paidAmount);
    const lateFee = calculateLateFee(selectedPayment, formData.paidDate);
    
    // Convert files to base64 for storage
    const attachmentObjects = attachments.map(a => ({
      id: crypto.randomUUID(),
      name: a.name,
      url: URL.createObjectURL(a.file),
      date: new Date().toISOString(),
      type: a.file.type
    }));

    const updatedPayment: Payment = {
      ...selectedPayment,
      isPaid: true,
      paymentDate: new Date(formData.paidDate).toISOString(),
      paidAmount,
      lateFee,
      paymentMethod: formData.paymentMethod.toLowerCase() as "pix" | "boleto" | "dinheiro",
      notes: formData.notes,
      attachments: attachmentObjects
    };

    paymentStorage.save(updatedPayment);
    
    // Show receipt
    setReceiptData(updatedPayment);
    setShowReceipt(true);
    
    loadData();
    setIsDialogOpen(false);
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

  const getStatusBadge = (payment: Payment) => {
    if (payment.isPaid) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
    }
    
    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    
    if (now > dueDate) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const formatMonthYear = (month: number | string, year: number | string) => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthNum = typeof month === 'string' ? parseInt(month) : month;
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    return `${monthNames[monthNum - 1]} ${yearNum}`;
  };

  return (
    <>
      <SEO 
        title="Recebimentos - ImóvelControl"
        description="Controle de recebimentos de locações"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestão de Recebimentos</h1>
              <p className="text-slate-600 mt-2">Controle de recebimentos de locações</p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-md">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}><LayoutList className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Unpaid This Month Alert */}
          {unpaidPayments.length > 0 && (
            <FloatingCard delay={0.1}>
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-red-800">
                    <AlertCircle size={20} />
                    <span>Locações Não Pagas Este Mês ({unpaidPayments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerContainer staggerDelay={0.05}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unpaidPayments.map((payment, index) => {
                        const rental = getRental(payment.rentalId);
                        if (!rental) return null;
                        const property = getProperty(rental);
                        const tenant = getTenant(rental);
                        
                        return (
                          <StaggerItem key={payment.id}>
                            <FloatingCard delay={index * 0.03}>
                              <div className="p-3 bg-white rounded-lg border border-red-200 space-y-2">
                                <p className="font-semibold text-slate-900 text-sm">{property?.local}</p>
                                <p className="text-xs text-slate-600">{tenant?.name}</p>
                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-xs text-slate-500">Vencimento:</span>
                                  <span className="text-xs font-medium">{new Date(payment.dueDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Valor:</span>
                                  <span className="text-sm font-bold text-red-700">{formatCurrency(payment.expectedAmount)}</span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenDialog(payment)}
                                  className="w-full mt-2 bg-red-600 hover:bg-red-700"
                                >
                                  Registrar Pagamento
                                </Button>
                              </div>
                            </FloatingCard>
                          </StaggerItem>
                        );
                      })}
                    </div>
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FloatingCard>
          )}

          {/* Summary Cards */}
          <StaggerContainer staggerDelay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StaggerItem>
                <FloatingCard delay={0}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Recebido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="text-green-600" size={24} />
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalReceived)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.05}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Pendente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="text-amber-600" size={24} />
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalPending)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.08}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Taxa Administração</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="text-blue-600" size={24} />
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(adminFee)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Excluindo imóveis em "Outros"</p>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.15}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Filtrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-purple-600" size={24} />
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalFiltered)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>
            </div>
          </StaggerContainer>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = (i + 1).toString().padStart(2, "0");
                        const monthName = new Date(2024, i, 1).toLocaleDateString("pt-BR", { month: "long" });
                        return (
                          <SelectItem key={month} value={month}>
                            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Payment Records */}
          <FloatingCard delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Todos os Registros dos Recebimentos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <StaggerContainer staggerDelay={0.04}>
                  {filteredPayments.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <p className="text-slate-500">Nenhum recebimento encontrado.</p>
                    </div>
                  ) : viewMode === "list" ? (
                    <div className="bg-white rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Imóvel</TableHead>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => {
                            const rental = rentals.find(r => r.id === payment.rentalId);
                            const tenant = tenants.find(t => t.id === rental?.tenantId);
                            const property = properties.find(p => p.id === rental?.propertyId);
                            
                            return (
                              <TableRow 
                                key={payment.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(`/payments/manage/${payment.id}`);
                                }}
                                className="list-item-hover cursor-pointer"
                              >
                                <TableCell className="font-medium">{property?.local}</TableCell>
                                <TableCell>{tenant?.name}</TableCell>
                                <TableCell>{payment.referenceMonth}/{payment.referenceYear}</TableCell>
                                <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <span className={`font-semibold ${
                                    !payment.isPaid && calculateLateFee(payment, new Date().toISOString().split("T")[0]) > 0 
                                      ? "text-red-600" 
                                      : "text-gray-900"
                                  }`}>
                                    {formatCurrency(payment.expectedAmount)}
                                  </span>
                                </TableCell>
                                <TableCell>{getStatusBadge(payment)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewingPayment(payment); }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPayments.map(payment => {
                        const rental = getRental(payment.rentalId);
                        const property = rental ? getProperty(rental) : null;
                        const tenant = rental ? getTenant(rental) : null;
                        return (
                          <StaggerItem key={payment.id}>
                            <FloatingCard delay={0}>
                              <Card 
                                key={payment.id}
                                onClick={() => handleViewPayment(payment)}
                                className="card-hover-effect cursor-pointer"
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-base">{property?.local}</CardTitle>
                                      <CardDescription>{tenant?.name}</CardDescription>
                                    </div>
                                    {getStatusBadge(payment)}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Ref:</span>
                                      <span className="font-medium">{payment.referenceMonth}/{payment.referenceYear}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Valor:</span>
                                      <span className="font-bold">{formatCurrency(payment.expectedAmount)}</span>
                                    </div>
                                    {payment.isPaid && (
                                      <div className="flex justify-between text-green-700">
                                        <span>Pago:</span>
                                        <span className="font-bold">{formatCurrency(payment.paidAmount || 0)}</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </FloatingCard>
                          </StaggerItem>
                        );
                      })}
                    </div>
                  )}
                </StaggerContainer>
              </CardContent>
            </Card>
          </FloatingCard>

          {/* View Payment Dialog */}
          <Dialog open={!!viewingPayment} onOpenChange={(open) => !open && setViewingPayment(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes do Recebimento</DialogTitle>
                <DialogDescription>Informações completas do registro</DialogDescription>
              </DialogHeader>
              {viewingPayment && (() => {
                const rental = getRental(viewingPayment.rentalId);
                const property = rental ? getProperty(rental) : null;
                const tenant = rental ? getTenant(rental) : null;
                
                return (
                  <div className="space-y-4 py-4">
                    <div className="bg-slate-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Imóvel</Label>
                          <p className="font-medium">{property?.local}</p>
                          <p className="text-sm text-slate-600">{property?.address}, {property?.number}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Inquilino</Label>
                          <p className="font-medium">{tenant?.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-500">Referência</Label>
                        <p className="font-medium">{formatMonthYear(viewingPayment.referenceMonth, viewingPayment.referenceYear)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Vencimento</Label>
                        <p className="font-medium">{new Date(viewingPayment.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Valor Original</Label>
                        <p className="font-bold text-lg">{formatCurrency(viewingPayment.expectedAmount)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Status</Label>
                        <div className="mt-1">{getStatusBadge(viewingPayment)}</div>
                      </div>
                    </div>

                    {viewingPayment.isPaid && (
                      <>
                        <div className="border-t pt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-slate-500">Data do Pagamento</Label>
                              <p className="font-medium">{viewingPayment.paymentDate ? new Date(viewingPayment.paymentDate).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Método</Label>
                              <p className="font-medium">{viewingPayment.paymentMethod || "-"}</p>
                            </div>
                          </div>

                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <Label className="text-xs text-green-700">Valor Pago</Label>
                            <p className="font-bold text-2xl text-green-700">{formatCurrency(viewingPayment.paidAmount || 0)}</p>
                          </div>

                          {viewingPayment.lateFee && viewingPayment.lateFee > 0 && (
                            <div className="bg-red-50 p-3 rounded border border-red-200">
                              <Label className="text-xs text-red-700">Multa e Juros por Atraso</Label>
                              <p className="font-bold text-lg text-red-700">{formatCurrency(viewingPayment.lateFee)}</p>
                            </div>
                          )}

                          {viewingPayment.notes && (
                            <div>
                              <Label className="text-xs text-slate-500">Observações</Label>
                              <p className="text-sm mt-1 p-2 bg-slate-50 rounded">{viewingPayment.notes}</p>
                            </div>
                          )}

                          {viewingPayment.attachments && viewingPayment.attachments.length > 0 && (
                            <div>
                              <Label className="text-xs text-slate-500 flex items-center gap-2 mb-2">
                                <FileText size={14} />
                                Comprovantes Anexados ({viewingPayment.attachments.length})
                              </Label>
                              <div className="space-y-2">
                                {viewingPayment.attachments.map((att, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                                    <span className="text-sm truncate">{att.name}</span>
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
                                      >
                                        <Download size={14} />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.open(att.url, '_blank')}
                                      >
                                        <ExternalLink size={14} />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => setViewingPayment(null)}>Fechar</Button>
                <Button onClick={() => window.print()}>
                  Imprimir
                </Button>
                <Button onClick={() => {
                   // Navigate to details page for editing
                   router.push(`/payments/${viewingPayment?.id}`);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Register Payment Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Recebimento</DialogTitle>
              </DialogHeader>
              
              {selectedPayment && (() => {
                const rental = getRental(selectedPayment.rentalId);
                const property = rental ? getProperty(rental) : null;
                const tenant = rental ? getTenant(rental) : null;
                const lateFee = calculateLateFee(selectedPayment, formData.paidDate);
                const totalWithFee = parseCurrency(formData.paidAmount) + lateFee;
                
                return (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-sm font-medium">{property?.local}</p>
                      <p className="text-xs text-slate-600">{tenant?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Ref: {formatMonthYear(selectedPayment.referenceMonth, selectedPayment.referenceYear)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paidDate">Data do Pagamento *</Label>
                      <Input
                        id="paidDate"
                        type="date"
                        value={formData.paidDate}
                        onChange={(e) => setFormData({...formData, paidDate: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paidAmount">Valor do Aluguel *</Label>
                      <Input
                        id="paidAmount"
                        type="text"
                        value={formData.paidAmount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          const formatted = formatCurrency(parseFloat(value) / 100);
                          setFormData({...formData, paidAmount: formatted});
                        }}
                        required
                      />
                    </div>

                    {lateFee > 0 && (
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <Label className="text-sm text-amber-800">Encargos por Atraso</Label>
                        <p className="font-bold text-lg text-amber-900">{formatCurrency(lateFee)}</p>
                        <p className="text-xs text-amber-700 mt-1">Multa de 2% + juros de 0,033% ao dia</p>
                      </div>
                    )}

                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <Label className="text-sm text-blue-800">Valor Total a Receber</Label>
                      <p className="font-bold text-2xl text-blue-900">{formatCurrency(totalWithFee)}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
                      <Select 
                        value={formData.paymentMethod} 
                        onValueChange={(val) => setFormData({...formData, paymentMethod: val})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pix">Pix</SelectItem>
                          <SelectItem value="Transferência">Transferência</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Boleto">Boleto</SelectItem>
                          <SelectItem value="Cartão">Cartão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Comprovantes ({attachments.length}/5)</Label>
                      <div className="space-y-2">
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                            <span className="text-sm truncate">{attachment.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveAttachment(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        {attachments.length < 5 && (
                          <div>
                            <Input
                              type="file"
                              onChange={handleAddAttachment}
                              accept="image/*,.pdf"
                              capture="environment"
                              className="hidden"
                              id="file-upload"
                            />
                            <Label
                              htmlFor="file-upload"
                              className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-50 w-full"
                            >
                              <Plus size={16} className="mr-2" />
                              Adicionar Comprovante (Foto ou Arquivo)
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1">
                        Confirmar Recebimento
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
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Recibo de Aluguel</DialogTitle>
              </DialogHeader>
              
              {receiptData && (() => {
                const rental = getRental(receiptData.rentalId);
                const property = rental ? getProperty(rental) : null;
                const tenant = rental ? getTenant(rental) : null;
                const totalAmount = (receiptData.paidAmount || 0) + (receiptData.lateFee || 0);
                const amountInWords = numberToWords(totalAmount);
                const now = new Date();
                
                return (
                  <div className="space-y-6 py-4 text-sm">
                    <div className="text-center border-b pb-4">
                      <h2 className="text-2xl font-bold text-slate-900">RECIBO DE ALUGUEL</h2>
                      <p className="text-slate-600 mt-2">Nº {receiptData.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Valor do Aluguel</Label>
                          <p className="font-bold text-lg">{formatCurrency(receiptData.paidAmount || 0)}</p>
                        </div>
                        {receiptData.lateFee && receiptData.lateFee > 0 && (
                          <div>
                            <Label className="text-xs text-slate-500">Encargos por Atraso</Label>
                            <p className="font-bold text-lg text-red-600">{formatCurrency(receiptData.lateFee)}</p>
                          </div>
                        )}
                        {rental?.hasMotorcycleSpot && rental.motorcycleSpotValue && (
                          <div>
                            <Label className="text-xs text-slate-500">Vaga de Garagem</Label>
                            <p className="font-bold text-lg">{formatCurrency(rental.motorcycleSpotValue)}</p>
                          </div>
                        )}
                        <div className="col-span-2 bg-green-50 p-3 rounded border border-green-200">
                          <Label className="text-xs text-green-700">Valor Total</Label>
                          <p className="font-bold text-2xl text-green-700">{formatCurrency(totalAmount)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-justify leading-relaxed">
                      <p className="font-semibold text-center text-lg">RECIBO DE ALUGUEL</p>
                      
                      <p>
                        Recebi de <span className="font-semibold">{tenant?.name}</span> a importância de{' '}
                        <span className="font-semibold">{amountInWords}</span> ({formatCurrency(totalAmount)}),{' '}
                        proveniente ao depósito de aluguel referente ao mês de{' '}
                        <span className="font-semibold">{formatMonthYear(receiptData.referenceMonth, receiptData.referenceYear)}</span>,{' '}
                        tendo seu vencimento em{' '}
                        <span className="font-semibold">{new Date(receiptData.dueDate).toLocaleDateString()}</span>{' '}
                        do imóvel localizado em{' '}
                        <span className="font-semibold">
                          {property?.local}, {property?.address}, {property?.number}
                          {property?.complement && `, ${property.complement}`}
                          {property?.neighborhood && `, ${property.neighborhood}`}
                          {property?.city && `, ${property.city}`}
                          {property?.state && ` - ${property.state}`}
                          {property?.cep && `, CEP: ${property.cep}`}
                        </span>,{' '}
                        após apresentação dos comprovantes de depósito bancário e contas de água e luz do mês anterior pagas,{' '}
                        sendo este vinculado ao{' '}
                        <span className="font-semibold">INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FINS RESIDENCIAL</span>,{' '}
                        assinado entre as partes em{' '}
                        <span className="font-semibold">{rental ? new Date(rental.startDate).toLocaleDateString() : '-'}</span>.
                      </p>

                      <p className="text-right pt-4">
                        São Paulo, {now.toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}, às {now.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}.
                      </p>
                    </div>

                    <div className="border-t pt-6 mt-8">
                      <div className="text-center">
                        <div className="border-t border-slate-400 w-64 mx-auto mb-2"></div>
                        <p className="text-sm text-slate-600">Assinatura do Locador</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <DialogFooter>
                <Button onClick={() => window.print()} variant="outline">
                  Imprimir
                </Button>
                <Button onClick={() => setShowReceipt(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}