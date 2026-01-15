import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Home, User, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { rentalService } from "@/services/rentalService";
import type { Payment, Property, Tenant, Rental } from "@/types";

interface PaymentWithDetails extends Payment {
  property?: Property;
  tenant?: Tenant;
  rental?: Rental;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithDetails[]>([]);
  const [unpaidPayments, setUnpaidPayments] = useState<PaymentWithDetails[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentWithDetails[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth((currentDate.getMonth() + 1).toString().padStart(2, "0"));
    setSelectedYear(currentDate.getFullYear().toString());
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      const [allPayments, properties, tenants, rentals] = await Promise.all([
        paymentService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
        rentalService.getAll()
      ]);

      const paymentsWithDetails: PaymentWithDetails[] = allPayments.map(payment => {
        const rental = rentals.find(r => r.id === payment.rentalId);
        const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
        
        return {
          ...payment,
          property,
          tenant,
          rental
        };
      });

      setPayments(paymentsWithDetails);

      // Filter by selected month/year
      const filtered = paymentsWithDetails.filter((p) => {
        const matchMonth = selectedMonth === "all" || p.referenceMonth === parseInt(selectedMonth);
        const matchYear = selectedYear === "all" || p.referenceYear === parseInt(selectedYear);
        return matchMonth && matchYear;
      });

      setFilteredPayments(filtered);

      // Split into unpaid and paid
      const unpaid = filtered.filter(p => p.status === "pending" || p.status === "partial");
      const paid = filtered.filter(p => p.status === "paid");

      setUnpaidPayments(unpaid);
      setPaidPayments(paid);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar pagamentos.", variant: "destructive" });
    }
  };

  const getCardColorClass = (payment: Payment): string => {
    if (payment.status === "paid") return "bg-white border-slate-200";
    
    const currentDate = new Date();
    const dueDate = new Date(payment.dueDate);
    
    currentDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (currentDate > dueDate) return "bg-red-50 border-red-300"; // Atrasado
    if (currentDate.getTime() === dueDate.getTime()) return "bg-yellow-50 border-yellow-300"; // Vence hoje
    return "bg-emerald-50 border-emerald-200"; // A vencer
  };

  const getStatusBadge = (payment: Payment) => {
    const currentDate = new Date();
    const dueDate = new Date(payment.dueDate);
    
    currentDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (payment.status === "paid") {
      return <Badge variant="default" className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    
    if (currentDate > dueDate) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
    }
    
    if (currentDate.getTime() === dueDate.getTime()) {
      return <Badge variant="default" className="bg-yellow-600"><Clock className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />A Vencer</Badge>;
  };

  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <>
      <SEO title="Gestão de Recebimentos" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gestão de Recebimentos</h1>
              <p className="text-muted-foreground">Gerencie os pagamentos mensais</p>
            </div>
          </div>

          <Card className="p-4">
            <div className="flex gap-4 items-center">
              <div className="w-full md:w-1/4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="unpaid" className="space-y-4">
            <TabsList>
              <TabsTrigger value="unpaid">
                Locações Não Pagas Este Mês ({unpaidPayments.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Todos os Registros dos Pagamentos Realizados ({paidPayments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unpaid" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpaidPayments.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum pagamento pendente neste mês
                  </p>
                ) : (
                  unpaidPayments.map((payment) => (
                    <Card
                      key={payment.id}
                      className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${getCardColorClass(payment)}`}
                      onClick={() => router.push(`/payments/manage/${payment.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">
                            {payment.property?.location || "Imóvel não encontrado"}
                          </CardTitle>
                          {getStatusBadge(payment)}
                        </div>
                        <CardDescription className="text-sm">
                          {payment.tenant?.name || "Inquilino não encontrado"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {payment.property?.complement && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <span>{payment.property.complement}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Vencimento: {formatDate(payment.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span>{formatCurrency(payment.expectedAmount)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="paid" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paidPayments.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum pagamento realizado neste mês
                  </p>
                ) : (
                  paidPayments.map((payment) => (
                    <Card
                      key={payment.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200"
                      onClick={() => router.push(`/payments/${payment.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">
                            {payment.property?.location || "Imóvel não encontrado"}
                          </CardTitle>
                          {getStatusBadge(payment)}
                        </div>
                        <CardDescription className="text-sm">
                          {payment.tenant?.name || "Inquilino não encontrado"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {payment.property?.complement && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <span>{payment.property.complement}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Pago em: {payment.paymentDate ? formatDate(payment.paymentDate) : "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span>{formatCurrency(payment.paidAmount || payment.expectedAmount)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}