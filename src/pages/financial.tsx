import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Calendar,
  Building2,
  User
} from "lucide-react";
import { paymentService } from "@/services/paymentService";
import { propertyService } from "@/services/propertyService";
import { rentalService } from "@/services/rentalService";
import { tenantService } from "@/services/tenantService";
import { Payment, Property, Rental, Tenant } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

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

  // Filter payments for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthPayments = payments.filter(payment => {
    const dueDate = new Date(payment.dueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  // Calculate financial metrics
  const totalExpected = currentMonthPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalReceived = currentMonthPayments
    .filter(p => p.status === "paid" || p.status === "partial")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = currentMonthPayments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.expectedAmount, 0);
  const totalOverdue = currentMonthPayments
    .filter(p => p.status === "overdue")
    .reduce((sum, p) => sum + p.expectedAmount, 0);

  const getStatusBadge = (status: Payment["status"]) => {
    const variants = {
      paid: { label: "Pago", className: "bg-green-100 text-green-800" },
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      overdue: { label: "Atrasado", className: "bg-red-100 text-red-800" },
      partial: { label: "Parcial", className: "bg-blue-100 text-blue-800" },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getPaymentDetails = (payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = properties.find(p => p.id === rental?.propertyId);
    const tenant = tenants.find(t => t.id === rental?.tenantId);

    return {
      propertyAddress: property ? `${property.address}, ${property.number}` : "N/A",
      tenantName: tenant?.name || "N/A",
      amount: payment.status === "paid" ? (payment.paidAmount || 0) : payment.expectedAmount,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <ScrollReveal>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-600 mt-2">
              Gestão completa de recebimentos e fluxo de caixa
            </p>
          </div>
        </ScrollReveal>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScrollReveal delay={0.1}>
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Valor Esperado</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalExpected)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Valor Recebido</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalReceived)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Card className="p-6 border-l-4 border-l-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Valor Pendente</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <Card className="p-6 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Valor Atrasado</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalOverdue)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>
          </ScrollReveal>
        </div>

        {/* Payments Table */}
        <ScrollReveal delay={0.5}>
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                Recebimentos do Mês
              </h2>
            </div>
            {currentMonthPayments.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  Nenhum pagamento registrado neste mês
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Inquilino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Imóvel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {currentMonthPayments.map((payment) => {
                      const details = getPaymentDetails(payment);
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-slate-400 mr-2" />
                              <span className="text-sm font-medium text-slate-900">
                                {details.tenantName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 text-slate-400 mr-2" />
                              <span className="text-sm text-slate-600">
                                {details.propertyAddress}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {formatCurrency(details.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(payment.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </ScrollReveal>
      </div>
    </Layout>
  );
}