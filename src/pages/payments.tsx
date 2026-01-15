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
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage, configStorage } from "@/lib/storage";
import { Property, Tenant, Rental, Payment, SystemConfig } from "@/types";
import { DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Eye, Download, ExternalLink, FileText, Edit, LayoutList, Grid, Clock, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, parseCurrency, numberToWords, formatDate } from "@/lib/masks";
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
    const user = getCurrentUser();
    if (!user) {
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
    
    setPayments(allPayments);
    setRentals(allRentals);
    setProperties(allProperties);
    setTenants(allTenants);
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

          <div className="flex flex-col gap-6">
            {/* A Receber */}
            <FloatingCard delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    A Receber
                  </CardTitle>
                  <CardDescription>
                    Pagamentos pendentes e parciais do mês atual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.filter(p => p.status === "pending" || p.status === "partial").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum pagamento pendente no momento
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {payments
                        .filter(p => p.status === "pending" || p.status === "partial")
                        .map((payment) => {
                          const rental = rentals.find(r => r.id === payment.rentalId);
                          const property = rental ? properties.find(p => p.id === rental.propertyId) : null;
                          const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

                          return (
                            <Card key={payment.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate">
                                        {property?.address}, {property?.number}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">{tenant?.name}</p>
                                    </div>
                                    <Badge 
                                      variant={payment.status === "partial" ? "secondary" : "destructive"}
                                      className="ml-2 flex-shrink-0"
                                    >
                                      {payment.status === "partial" ? "Parcial" : "Pendente"}
                                    </Badge>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Referência:</span>
                                      <span className="font-medium">
                                        {new Date(payment.referenceMonth).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Valor:</span>
                                      <span className="font-semibold text-emerald-600">
                                        {formatCurrency(payment.expectedAmount)}
                                      </span>
                                    </div>
                                    {payment.status === "partial" && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Pago:</span>
                                        <span className="font-medium text-blue-600">
                                          {formatCurrency(payment.paidAmount || 0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => router.push(`/payments/manage/${payment.id}`)}
                                  >
                                    Gerenciar Pagamento
                                  </Button>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FloatingCard>

            {/* Recebidos */}
            <FloatingCard delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Recebidos
                  </CardTitle>
                  <CardDescription>
                    Pagamentos quitados do mês atual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.filter(p => p.status === "paid").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum pagamento recebido no momento
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {payments
                        .filter(p => p.status === "paid")
                        .map((payment) => {
                          const rental = rentals.find(r => r.id === payment.rentalId);
                          const property = rental ? properties.find(p => p.id === rental.propertyId) : null;
                          const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

                          return (
                            <Card key={payment.id} className="hover:shadow-md transition-shadow border-green-200">
                              <CardHeader className="pb-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate">
                                        {property?.address}, {property?.number}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">{tenant?.name}</p>
                                    </div>
                                    <Badge variant="default" className="ml-2 flex-shrink-0 bg-green-500">
                                      Pago
                                    </Badge>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Referência:</span>
                                      <span className="font-medium">
                                        {new Date(payment.referenceMonth).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Valor Pago:</span>
                                      <span className="font-semibold text-green-600">
                                        {formatCurrency(payment.paidAmount || 0)}
                                      </span>
                                    </div>
                                    {payment.paymentDate && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Data Pgto:</span>
                                        <span className="font-medium">
                                          {formatDate(payment.paymentDate)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => router.push(`/payments/manage/${payment.id}`)}
                                  >
                                    Ver Detalhes
                                  </Button>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FloatingCard>
          </div>
        </div>
      </Layout>
    </>
  );
}