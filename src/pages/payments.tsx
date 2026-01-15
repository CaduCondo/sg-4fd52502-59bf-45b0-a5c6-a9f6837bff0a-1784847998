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
import { Property, Tenant, Rental, Payment } from "@/types";
import { AlertCircle, CheckCircle2, Clock, Search } from "lucide-react";
import { FloatingCard } from "@/components/animations/FloatingCard";
import { TabsContent } from "@/components/ui/tabs";
import { paymentService } from "@/services/paymentService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { rentalService } from "@/services/rentalService";
import { useToast } from "@/hooks/use-toast";

interface PaymentWithDetails extends Payment {
  propertyName: string;
  tenantName: string;
  rentalValue: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [notPaidPayments, setNotPaidPayments] = useState<PaymentWithDetails[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentWithDetails[]>([]);

  useEffect(() => {
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
    
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      const allPayments = await paymentService.getAll();
      const properties = await propertyService.getAll();
      const tenants = await tenantService.getAll();

      // Filter by month/year
      const filtered = allPayments.filter(p => 
        p.referenceMonth === selectedMonth && 
        p.referenceYear === selectedYear
      );

      const withDetails = filtered.map(payment => {
        const property = properties.find(p => {
          // Find property by rental -> property relation logic would go here
          // But payment doesn't have direct propertyId, need to fetch rental first ideally
          // For now assuming we can link via rentalId if we had rentals loaded
          return true; 
        });
        
        // We need to fetch rentals to link property/tenant correctly
        // optimizing: fetch rentals once
        return {
           ...payment,
           propertyName: "Carregando...", // placeholder, logic below improves this
           tenantName: "Carregando..."
        };
      });
      
      // Better loading approach
      const rentals = await rentalService.getAll();
      
      const enrichedPayments = filtered.map(payment => {
        const rental = rentals.find(r => r.id === payment.rentalId);
        const property = rental ? properties.find(p => p.id === rental.propertyId) : null;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;
        
        return {
          ...payment,
          propertyName: property ? `${property.location} ${property.complement || ''}` : "Imóvel não encontrado",
          tenantName: tenant ? tenant.name : "Inquilino não encontrado",
          rentalValue: rental ? rental.value : 0
        };
      });

      setNotPaidPayments(enrichedPayments.filter(p => p.status !== 'paid'));
      setPaidPayments(enrichedPayments.filter(p => p.status === 'paid'));

    } catch (error) {
       toast({ title: "Erro", description: "Falha ao carregar pagamentos." });
    }
  };

  const getCardColor = (payment: PaymentWithDetails) => {
    if (payment.status === 'paid') return "bg-white";
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0,0,0,0);
    
    if (today > dueDate) return "bg-red-50 border-red-200"; // Atrasado
    if (today.getTime() === dueDate.getTime()) return "bg-yellow-50 border-yellow-200"; // Vence hoje
    return "bg-emerald-50 border-emerald-200"; // A vencer
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
        property?.location?.toLowerCase().includes(search) ||
        tenant?.name.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const getScore = (p: Payment) => {
      const isOverdue = !p.isPaid && new Date(p.dueDate) < new Date();
      if (isOverdue) return 0;
      if (!p.isPaid) return 1;
      return 2;
    };
    return getScore(a) - getScore(b);
  });

  const unpaidThisMonth = sortedPayments.filter(p => !p.isPaid);
  const overduePayments = unpaidThisMonth.filter(p => new Date(p.dueDate) < new Date());
  const dueSoonPayments = unpaidThisMonth.filter(p => new Date(p.dueDate) >= new Date());

  const consolidatedPayments = sortedPayments.reduce((acc, curr) => {
    const existing = acc.find(p => p.rentalId === curr.rentalId);
    if (!existing || (curr.status === "partial" && existing.status !== "partial")) {
      if (existing) {
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

          <TabsContent value="pending" className="space-y-4">
            <div className="space-y-4">
               <h3 className="font-semibold text-lg">Locações Não Pagas Este Mês</h3>
               {notPaidPayments.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">Nenhum pagamento pendente para este mês.</p>
               ) : (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {notPaidPayments.map(payment => (
                     <Card 
                       key={payment.id} 
                       className={`cursor-pointer transition-all hover:shadow-md ${getCardColor(payment)}`}
                       onClick={() => router.push(`/payments/manage/${payment.id}`)}
                     >
                       <CardContent className="p-4">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold">{payment.propertyName}</h4>
                             <p className="text-sm text-muted-foreground">{payment.tenantName}</p>
                           </div>
                           <Badge variant={payment.status === 'pending' ? 'outline' : 'secondary'}>
                             {payment.status === 'pending' ? 'Pendente' : 'Parcial'}
                           </Badge>
                         </div>
                         <div className="flex justify-between items-end mt-4">
                           <div>
                             <p className="text-xs text-muted-foreground">Vencimento</p>
                             <p className="font-medium">{formatDate(payment.dueDate)}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-xs text-muted-foreground">Valor</p>
                             <p className="font-bold text-lg">{formatCurrency(payment.expectedAmount)}</p>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )}

               <h3 className="font-semibold text-lg pt-8 border-t">Todos os Registros dos Pagamentos Realizados</h3>
               {paidPayments.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">Nenhum pagamento realizado este mês.</p>
               ) : (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {paidPayments.map(payment => (
                     <Card 
                       key={payment.id} 
                       className="cursor-pointer bg-white hover:shadow-md transition-all"
                       onClick={() => router.push(`/payments/manage/${payment.id}`)}
                     >
                       <CardContent className="p-4">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold">{payment.propertyName}</h4>
                             <p className="text-sm text-muted-foreground">{payment.tenantName}</p>
                           </div>
                           <Badge className="bg-emerald-600">Pago</Badge>
                         </div>
                         <div className="flex justify-between items-end mt-4">
                           <div>
                             <p className="text-xs text-muted-foreground">Pago em</p>
                             <p className="font-medium">{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-xs text-muted-foreground">Valor Pago</p>
                             <p className="font-bold text-lg text-emerald-600">{formatCurrency(payment.paidAmount || 0)}</p>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )}
            </div>
          </TabsContent>
        </div>
      </Layout>
    </>
  );
}