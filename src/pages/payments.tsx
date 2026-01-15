import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Home, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { rentalService } from "@/services/rentalService";
import type { Payment, Property, Tenant, Rental } from "@/types";

interface RentalWithDetails extends Rental {
  property?: Property;
  tenant?: Tenant;
  payment?: Payment;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rentals, setRentals] = useState<RentalWithDetails[]>([]);
  const [unpaidRentals, setUnpaidRentals] = useState<RentalWithDetails[]>([]);
  const [paidRentals, setPaidRentals] = useState<RentalWithDetails[]>([]);
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
      const [allRentals, properties, tenants, payments] = await Promise.all([
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
        paymentService.getAll()
      ]);

      // Filter only active rentals
      const activeRentals = allRentals.filter(r => r.status === "active");

      // Enrich rentals with property and tenant details + payment info
      const rentalsWithDetails: RentalWithDetails[] = activeRentals.map(rental => {
        const property = properties.find(p => p.id === rental.propertyId);
        const tenant = tenants.find(t => t.id === rental.tenantId);
        
        // Find payment for this rental in selected month/year
        const payment = payments.find(p => 
          p.rentalId === rental.id &&
          p.referenceMonth === parseInt(selectedMonth) &&
          p.referenceYear === parseInt(selectedYear)
        );

        return {
          ...rental,
          property,
          tenant,
          payment
        };
      });

      setRentals(rentalsWithDetails);

      // Split into unpaid (no payment or pending/partial) and paid
      const unpaid = rentalsWithDetails.filter(r => 
        !r.payment || r.payment.status === "pending" || r.payment.status === "partial"
      );
      const paid = rentalsWithDetails.filter(r => 
        r.payment && r.payment.status === "paid"
      );

      setUnpaidRentals(unpaid);
      setPaidRentals(paid);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar locações.", variant: "destructive" });
    }
  };

  const getCardColorClass = (rental: RentalWithDetails): string => {
    if (rental.payment?.status === "paid") return "bg-white border-slate-200";
    
    const currentDate = new Date();
    const dueDay = rental.dueDay || 5;
    const dueDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, dueDay);
    
    currentDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (currentDate > dueDate) return "bg-red-50 border-red-300"; // Atrasado
    if (currentDate.getTime() === dueDate.getTime()) return "bg-yellow-50 border-yellow-300"; // Vence hoje
    return "bg-emerald-50 border-emerald-200"; // A vencer
  };

  const getStatusBadge = (rental: RentalWithDetails) => {
    if (rental.payment?.status === "paid") {
      return <Badge variant="default" className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    
    if (rental.payment?.status === "partial") {
      return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Parcial</Badge>;
    }
    
    const currentDate = new Date();
    const dueDay = rental.dueDay || 5;
    const dueDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, dueDay);
    
    currentDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (currentDate > dueDate) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
    }
    
    if (currentDate.getTime() === dueDate.getTime()) {
      return <Badge variant="default" className="bg-yellow-600"><Clock className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />A Vencer</Badge>;
  };

  const handleCardClick = (rental: RentalWithDetails) => {
    if (rental.payment) {
      // If payment exists, go to manage payment page
      router.push(`/payments/manage/${rental.payment.id}`);
    } else {
      // If no payment, create one and go to manage page
      createPaymentAndNavigate(rental);
    }
  };

  const createPaymentAndNavigate = async (rental: RentalWithDetails) => {
    try {
      const dueDay = rental.dueDay || 5;
      const dueDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, dueDay);
      
      const newPayment: Omit<Payment, "id"> = {
        rentalId: rental.id,
        referenceMonth: parseInt(selectedMonth),
        referenceYear: parseInt(selectedYear),
        dueDate: dueDate.toISOString().split("T")[0],
        expectedAmount: rental.rentAmount,
        paidAmount: 0,
        adminFee: 0,
        status: "pending",
        paymentDate: null,
        notes: ""
      };

      const created = await paymentService.create(newPayment);
      router.push(`/payments/manage/${created.id}`);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar pagamento.", variant: "destructive" });
    }
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
              <p className="text-muted-foreground">Gerencie os pagamentos mensais das locações</p>
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
                Locações Não Pagas Este Mês ({unpaidRentals.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Locações Pagas Este Mês ({paidRentals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unpaid" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpaidRentals.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhuma locação pendente neste mês
                  </p>
                ) : (
                  unpaidRentals.map((rental) => (
                    <Card
                      key={rental.id}
                      className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${getCardColorClass(rental)}`}
                      onClick={() => handleCardClick(rental)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">
                            {rental.property?.location || "Imóvel não encontrado"}
                          </CardTitle>
                          {getStatusBadge(rental)}
                        </div>
                        <CardDescription className="text-sm">
                          {rental.tenant?.name || "Inquilino não encontrado"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {rental.property?.complement && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <span>{rental.property.complement}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Vencimento: Dia {rental.dueDay || 5}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span>{formatCurrency(rental.rentAmount)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="paid" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paidRentals.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhuma locação paga neste mês
                  </p>
                ) : (
                  paidRentals.map((rental) => (
                    <Card
                      key={rental.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200"
                      onClick={() => handleCardClick(rental)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">
                            {rental.property?.location || "Imóvel não encontrado"}
                          </CardTitle>
                          {getStatusBadge(rental)}
                        </div>
                        <CardDescription className="text-sm">
                          {rental.tenant?.name || "Inquilino não encontrado"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {rental.property?.complement && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <span>{rental.property.complement}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Pago em: {rental.payment?.paymentDate ? formatDate(rental.payment.paymentDate) : "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span>{formatCurrency(rental.payment?.paidAmount || rental.rentAmount)}</span>
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