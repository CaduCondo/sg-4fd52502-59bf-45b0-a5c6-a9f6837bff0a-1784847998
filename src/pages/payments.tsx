import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, User, Home, AlertCircle } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { paymentService, rentalService, propertyService, tenantService } from "@/services";
import { formatCurrency } from "@/lib/masks";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

// Import the manage payment component content
import ManagePaymentContent from "@/pages/payments/manage/[id]";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, rentalsData, propertiesData, tenantsData] = await Promise.all([
        paymentService.getAll(),
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
      ]);

      setPayments(paymentsData);
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os recebimentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRentalInfo = (rentalId: string) => {
    return rentals.find((r) => r.id === rentalId);
  };

  const getPropertyInfo = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId);
  };

  const getTenantInfo = (tenantId: string) => {
    return tenants.find((t) => t.id === tenantId);
  };

  const handleCardClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPaymentId(null);
    loadData(); // Reload data when dialog closes to reflect any changes
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "partial":
        return "bg-orange-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "partial":
        return "Parcial";
      case "overdue":
        return "Atrasado";
      default:
        return status;
    }
  };

  // Filter payments for current month
  const currentMonthPayments = payments.filter(
    (p) => p.referenceMonth === currentMonth + 1 && p.referenceYear === currentYear
  );

  // Separate into unpaid and paid
  const unpaidPayments = currentMonthPayments.filter(
    (p) => p.status === "pending" || p.status === "partial" || p.status === "overdue"
  );
  const paidPayments = currentMonthPayments.filter((p) => p.status === "paid");

  return (
    <>
      <Head>
        <title>Recebimentos - Gerenciador de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-8">
          <ScrollReveal>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie todos os recebimentos de aluguel
              </p>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando recebimentos...</p>
            </div>
          ) : (
            <>
              {/* Unpaid Rentals Section */}
              <div className="space-y-4">
                <ScrollReveal delay={0.1}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h2 className="text-2xl font-bold">Locações Não Pagas Este Mês</h2>
                    <Badge variant="destructive" className="ml-2">
                      {unpaidPayments.length}
                    </Badge>
                  </div>
                </ScrollReveal>

                {unpaidPayments.length === 0 ? (
                  <ScrollReveal delay={0.2}>
                    <Card>
                      <CardContent className="py-12 text-center">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          Todos os recebimentos foram realizados
                        </h3>
                        <p className="text-muted-foreground">
                          Não há recebimentos pendentes para este mês.
                        </p>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unpaidPayments.map((payment, index) => {
                      const rental = getRentalInfo(payment.rentalId);
                      const property = rental ? getPropertyInfo(rental.propertyId) : null;
                      const tenant = rental ? getTenantInfo(rental.tenantId) : null;

                      return (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 2)}>
                          <Card
                            className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500"
                            onClick={() => handleCardClick(payment.id)}
                          >
                            <CardHeader>
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getStatusColor(payment.status)}>
                                  {getStatusLabel(payment.status)}
                                </Badge>
                              </div>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                {property?.location || "N/A"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{tenant?.name || "N/A"}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">
                                  Vencimento: {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                                </p>
                              </div>

                              <div className="pt-3 border-t">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-sm text-muted-foreground">Valor:</span>
                                  <span className="text-lg font-bold text-red-600">
                                    {formatCurrency(payment.expectedAmount)}
                                  </span>
                                </div>
                                {payment.paidAmount > 0 && (
                                  <div className="flex justify-between items-baseline mt-1">
                                    <span className="text-sm text-muted-foreground">Pago:</span>
                                    <span className="text-sm font-medium">
                                      {formatCurrency(payment.paidAmount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </FloatingCard>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paid Rentals Section */}
              {paidPayments.length > 0 && (
                <div className="space-y-4">
                  <ScrollReveal delay={0.3}>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <h2 className="text-2xl font-bold">Locações Pagas Este Mês</h2>
                      <Badge variant="default" className="ml-2 bg-green-500">
                        {paidPayments.length}
                      </Badge>
                    </div>
                  </ScrollReveal>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paidPayments.map((payment, index) => {
                      const rental = getRentalInfo(payment.rentalId);
                      const property = rental ? getPropertyInfo(rental.propertyId) : null;
                      const tenant = rental ? getTenantInfo(rental.tenantId) : null;

                      return (
                        <FloatingCard key={payment.id} delay={0.1 * (index + 2)}>
                          <Card
                            className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500"
                            onClick={() => handleCardClick(payment.id)}
                          >
                            <CardHeader>
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getStatusColor(payment.status)}>
                                  {getStatusLabel(payment.status)}
                                </Badge>
                              </div>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                {property?.location || "N/A"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{tenant?.name || "N/A"}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">
                                  Pago em: {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("pt-BR") : "N/A"}
                                </p>
                              </div>

                              <div className="pt-3 border-t">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-sm text-muted-foreground">Valor Pago:</span>
                                  <span className="text-lg font-bold text-green-600">
                                    {formatCurrency(payment.paidAmount)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </FloatingCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Management Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            {selectedPaymentId && (
              <ManagePaymentContent
                paymentId={selectedPaymentId}
                onClose={handleCloseDialog}
                embedded={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}