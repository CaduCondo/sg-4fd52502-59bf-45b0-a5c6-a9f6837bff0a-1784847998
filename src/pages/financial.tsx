import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { paymentService, propertyService, rentalService, tenantService } from "@/services";
import type { Payment, Property, Rental, Tenant } from "@/types";
import { applyRealMask } from "@/lib/masks";
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
      setLoading(true);
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

  // Helper function to get payment details
  const getPaymentDetails = (payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = properties.find(p => p.id === rental?.propertyId);
    const tenant = tenants.find(t => t.id === rental?.tenantId);

    return {
      rental,
      propertyAddress: property ? `${property.address}, ${property.number}` : "Imóvel não encontrado",
      tenantName: tenant?.name || "Inquilino não encontrado",
      amount: payment.status === 'paid' ? (payment.paidAmount || 0) : payment.expectedAmount
    };
  };

  // Calculate financial metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.dueDate);
    return (
      paymentDate.getMonth() === currentMonth &&
      paymentDate.getFullYear() === currentYear
    );
  });

  const totalExpected = monthlyPayments.reduce(
    (sum, payment) => sum + payment.expectedAmount,
    0
  );

  const totalReceived = monthlyPayments
    .filter((payment) => payment.status === "paid" || payment.status === "partial")
    .reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);

  const totalPending = monthlyPayments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.expectedAmount, 0);

  const totalOverdue = monthlyPayments
    .filter((payment) => payment.status === "overdue")
    .reduce((sum, payment) => sum + payment.expectedAmount, 0);

  const stats = [
    {
      title: "Valor Esperado",
      value: applyRealMask(totalExpected.toString()),
      icon: DollarSign,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Valor Recebido",
      value: applyRealMask(totalReceived.toString()),
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Valor Pendente",
      value: applyRealMask(totalPending.toString()),
      icon: Clock,
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Valor Atrasado",
      value: applyRealMask(totalOverdue.toString()),
      icon: TrendingDown,
      color: "from-red-500 to-red-600",
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: "Pago", color: "bg-green-100 text-green-800" },
      pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
      overdue: { label: "Atrasado", color: "bg-red-100 text-red-800" },
      partial: { label: "Parcial", color: "bg-orange-100 text-orange-800" },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <Layout>
      <SEO
        title="Financeiro - Gerenciador de Locações"
        description="Gestão financeira completa de recebimentos e pagamentos"
      />

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financeiro
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestão completa de recebimentos e fluxo de caixa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.title} delay={index * 0.1}>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Payments Table */}
        <ScrollReveal>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Recebimentos do Mês
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  Carregando pagamentos...
                </p>
              </div>
            ) : monthlyPayments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Nenhum pagamento registrado neste mês
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Inquilino
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Imóvel
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Vencimento
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Valor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPayments.map((payment) => {
                      const details = getPaymentDetails(payment);
                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                            {details.tenantName}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {details.propertyAddress}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(payment.dueDate)}
                          </td>
                          <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                            {applyRealMask(details.amount.toString())}
                          </td>
                          <td className="py-4 px-4 text-sm">
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