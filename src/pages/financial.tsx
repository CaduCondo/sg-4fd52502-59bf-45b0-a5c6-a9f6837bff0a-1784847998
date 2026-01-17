import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, TrendingDown } from "lucide-react";
import { Payment, Property, Rental, Tenant } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { paymentService } from "@/services/paymentService";
import { propertyService } from "@/services/propertyService";
import { rentalService } from "@/services/rentalService";
import { tenantService } from "@/services/tenantService";
import ScrollReveal from "@/components/animations/ScrollReveal";

export default function Financial() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, propertiesData, rentalsData, tenantsData] = await Promise.all([
        paymentService.getAll(),
        propertyService.getAll(),
        rentalService.getAll(),
        tenantService.getAll(),
      ]);

      setPayments(paymentsData);
      setProperties(propertiesData);
      setRentals(rentalsData);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get current month payments
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthPayments = payments.filter((payment) => {
    const dueDate = new Date(payment.dueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  // Calculate financial metrics
  const totalExpected = currentMonthPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalReceived = currentMonthPayments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = currentMonthPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalOverdue = currentMonthPayments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.expectedAmount, 0);

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: <Badge className="bg-green-500">Pago</Badge>,
      pending: <Badge className="bg-yellow-500">Pendente</Badge>,
      overdue: <Badge className="bg-red-500">Atrasado</Badge>,
      partial: <Badge className="bg-blue-500">Parcial</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const getPaymentDetails = (payment: Payment) => {
    const rental = rentals.find((r) => r.id === payment.rentalId);
    const property = properties.find((p) => p.id === rental?.propertyId);
    const tenant = tenants.find((t) => t.id === rental?.tenantId);

    return {
      propertyAddress: property ? `${property.address}, ${property.number}` : "N/A",
      tenantName: tenant?.name || "N/A",
      amount: payment.status === "paid" ? (payment.paidAmount || 0) : payment.expectedAmount,
    };
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <ScrollReveal>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-600 mt-2">
              Gestão completa de recebimentos e fluxo de caixa
            </p>
          </div>
        </ScrollReveal>

        {/* Financial Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ScrollReveal delay={0.1}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Valor Esperado
                </CardTitle>
                <DollarSign className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {totalExpected.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">Total do mês</p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Valor Recebido
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {totalReceived.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {totalExpected > 0
                    ? `${((totalReceived / totalExpected) * 100).toFixed(1)}% do esperado`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Valor Pendente
                </CardTitle>
                <Clock className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {totalPending.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">Aguardando pagamento</p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Valor Atrasado
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {totalOverdue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pagamentos vencidos</p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* Payments Table */}
        <ScrollReveal delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle>Recebimentos do Mês</CardTitle>
              <CardDescription>
                {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : currentMonthPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum pagamento registrado neste mês
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthPayments.map((payment) => {
                        const details = getPaymentDetails(payment);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {details.tenantName}
                            </TableCell>
                            <TableCell>{details.propertyAddress}</TableCell>
                            <TableCell>
                              {format(new Date(payment.dueDate), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              {details.amount.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </Layout>
  );
}