import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate } from "@/lib/masks";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage } from "@/lib/storage";
import { Property, Tenant, Rental, Payment } from "@/types";
import { AlertCircle, CheckCircle2, Clock, Search, Filter } from "lucide-react";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Set default filter to current month/year
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
    
    loadData();
  }, []);

  const loadData = () => {
    setPayments(paymentStorage.getAll());
    setRentals(rentalStorage.getAll());
    setProperties(propertyStorage.getAll());
    setTenants(tenantStorage.getAll());
  };

  const getRental = (id: string) => rentals.find(r => r.id === id);
  const getProperty = (rental: Rental | undefined) => rental ? properties.find(p => p.id === rental.propertyId) : undefined;
  const getTenant = (rental: Rental | undefined) => rental ? tenants.find(t => t.id === rental.tenantId) : undefined;

  const calculateInstallmentNumber = (rental: Rental, paymentMonth: string, paymentYear: string) => {
    const start = new Date(rental.startDate);
    const current = new Date(parseInt(paymentYear), parseInt(paymentMonth) - 1, 1);
    
    let months = (current.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += current.getMonth();
    
    return months + 1;
  };

  const filteredPayments = payments.filter(payment => {
    const matchesMonth = payment.referenceMonth === filterMonth;
    const matchesYear = payment.referenceYear === filterYear;
    
    if (!matchesMonth || !matchesYear) return false;

    if (filterStatus !== "all") {
      if (filterStatus === "paid" && !payment.isPaid) return false;
      if (filterStatus === "pending" && payment.isPaid) return false;
      if (filterStatus === "overdue" && (!payment.isPaid && new Date(payment.dueDate) < new Date())) return false;
    }

    const rental = getRental(payment.rentalId);
    const property = getProperty(rental);
    const tenant = getTenant(rental);
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        property?.address.toLowerCase().includes(search) ||
        tenant?.name.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Group payments by status for ordering: Overdue (Red) -> Pending (Yellow) -> Paid (Blue/Green)
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const getScore = (p: Payment) => {
      const isOverdue = !p.isPaid && new Date(p.dueDate) < new Date();
      if (isOverdue) return 0; // Red
      if (!p.isPaid) return 1; // Yellow
      return 2; // Blue
    };
    return getScore(a) - getScore(b);
  });

  const unpaidThisMonth = filteredPayments.filter(p => !p.isPaid);
  const overduePayments = payments.filter(p => !p.isPaid && new Date(p.dueDate) < new Date());

  // Consolidate payments for "Todos os Registros" (1 per rental)
  const consolidatedPayments = sortedPayments.reduce((acc, curr) => {
    const existing = acc.find(p => p.rentalId === curr.rentalId);
    if (!existing || (curr.status === "partial" && existing.status !== "partial")) {
      if (existing) {
        // Replace if current is more relevant (e.g. partial update)
        const index = acc.indexOf(existing);
        acc[index] = curr;
      } else {
        acc.push(curr);
      }
    }
    return acc;
  }, [] as Payment[]);

  return (
    <>
      <SEO title="Gestão de Recebimento" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gestão de Recebimento</h1>
              <p className="text-muted-foreground">Controle de pagamentos e recebimentos</p>
            </div>
          </div>

          {/* Top Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Mês de Referência</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString().padStart(2, "0")}>
                          {new Date(2024, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                        </SelectItem>
                      ))}
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
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="overdue">Em Atraso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Imóvel ou inquilino..." 
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Em Atraso Block - Top Priority */}
          {overduePayments.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in-0 slide-in-from-top-4">
              <div className="flex items-center gap-2 text-red-700 mb-2 font-semibold">
                <AlertCircle className="h-5 w-5" />
                <h3>EM ATRASO ({overduePayments.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overduePayments.map(payment => {
                  const rental = getRental(payment.rentalId);
                  const property = getProperty(rental);
                  const tenant = getTenant(rental);
                  if (!rental || !property || !tenant) return null;

                  return (
                    <Card 
                      key={payment.id} 
                      className="cursor-pointer hover:shadow-md border-red-200 bg-white"
                      onClick={() => router.push(`/payments/manage/${payment.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="destructive">Atrasado</Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            {calculateInstallmentNumber(rental, payment.referenceMonth, payment.referenceYear)}ª Parcela
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm truncate">{property.address}, {property.number}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{tenant.name}</p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-600 font-bold">{formatCurrency(payment.expectedAmount)}</span>
                          <span className="text-xs text-muted-foreground">Venc: {formatDate(payment.dueDate)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Locações Não Pagas Este Mês */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Locações Não Pagas Este Mês
            </h2>
            {unpaidThisMonth.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Nenhuma pendência para este mês.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpaidThisMonth.map(payment => {
                  const rental = getRental(payment.rentalId);
                  const property = getProperty(rental);
                  const tenant = getTenant(rental);
                  if (!rental || !property || !tenant) return null;

                  return (
                    <FloatingCard key={payment.id} delay={0.1}>
                      <Card 
                        className="cursor-pointer hover:shadow-lg transition-all border-amber-200"
                        onClick={() => router.push(`/payments/manage/${payment.id}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                  {payment.status === 'partial' ? 'Parcial' : 'Pendente'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {calculateInstallmentNumber(rental, payment.referenceMonth, payment.referenceYear)}ª
                                </span>
                              </div>
                              <h4 className="font-semibold text-sm">{property.address}, {property.number}</h4>
                              <p className="text-xs text-muted-foreground">{property.complement}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1 pt-2 border-t border-dashed border-amber-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Inquilino:</span>
                              <span className="font-medium">{tenant.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Valor Esperado:</span>
                              <span className="font-bold text-amber-600">
                                {formatCurrency(payment.expectedAmount - (payment.paidAmount || 0))}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Vencimento:</span>
                              <span>{formatDate(payment.dueDate)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </FloatingCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Todos os Registros dos Pagamentos Realizados */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Todos os Registros dos Pagamentos Realizados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {consolidatedPayments.map(payment => {
                const rental = getRental(payment.rentalId);
                const property = getProperty(rental);
                const tenant = getTenant(rental);
                if (!rental || !property || !tenant) return null;

                const isOverdue = !payment.isPaid && new Date(payment.dueDate) < new Date();
                const borderColor = isOverdue ? 'border-red-200' : (payment.isPaid ? 'border-green-200' : 'border-amber-200');
                const bgColor = isOverdue ? 'bg-red-50' : (payment.isPaid ? 'bg-green-50' : 'bg-amber-50');

                return (
                  <Card 
                    key={payment.id} 
                    className={`cursor-pointer hover:shadow-md transition-all ${borderColor} ${bgColor}`}
                    onClick={() => router.push(`/payments/manage/${payment.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={isOverdue ? "destructive" : (payment.isPaid ? "default" : "secondary")} className={payment.isPaid ? "bg-green-600" : ""}>
                          {isOverdue ? "Atrasado" : (payment.isPaid ? "Pago" : "Pendente")}
                        </Badge>
                        {payment.paymentCode && (
                          <span className="text-[10px] font-mono bg-white px-1 rounded border">
                            {payment.paymentCode}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-semibold truncate">{property.address}, {property.number}</p>
                        {property.complement && <p className="text-[10px] text-muted-foreground truncate">{property.complement}</p>}
                        <div className="h-px bg-slate-200 my-1" />
                        <p className="text-xs truncate">{tenant.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}