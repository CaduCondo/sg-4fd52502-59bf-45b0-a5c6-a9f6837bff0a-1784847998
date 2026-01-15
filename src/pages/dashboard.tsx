import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage, configStorage } from "@/lib/storage";
import { DashboardStats, Property, Tenant, Rental, Payment } from "@/types";
import { Building2, Users, DollarSign, CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate } from "@/lib/masks";

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    rentedProperties: 0,
    availableProperties: 0,
    totalTenants: 0,
    paidThisMonth: 0,
    unpaidThisMonth: 0,
    totalRevenue: 0,
    adminFee: 0,
    dueThisMonth: 0
  });
  const [upcomingPayments, setUpcomingPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    const rentals = rentalStorage.getAll();
    const payments = paymentStorage.getAll();
    const config = configStorage.get();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentMonthPayments = payments.filter(
      p => p.month === currentMonth.toString().padStart(2, "0") && p.year === currentYear
    );

    const paidCount = currentMonthPayments.filter(p => p.isPaid).length;
    const unpaidCount = currentMonthPayments.filter(p => !p.isPaid).length;
    const totalRevenue = currentMonthPayments
      .filter(p => p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);
    const adminFee = totalRevenue * (config.adminFeePercentage / 100);
    const dueThisMonth = currentMonthPayments
      .filter(p => !p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0);

    const rentedCount = properties.filter(p => p.status === "rented").length;

    setStats({
      totalProperties: properties.length,
      rentedProperties: rentedCount,
      availableProperties: properties.length - rentedCount,
      totalTenants: tenants.length,
      paidThisMonth: paidCount,
      unpaidThisMonth: unpaidCount,
      totalRevenue,
      adminFee,
      dueThisMonth
    });

    const upcoming = currentMonthPayments
      .filter(p => !p.isPaid)
      .map(payment => {
        const rental = rentals.find(r => r.id === payment.rentalId);
        const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
        const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
        
        if (rental && property && tenant) {
          return { payment, rental, property, tenant };
        }
        return null;
      })
      .filter(Boolean) as Array<{
        payment: Payment;
        rental: Rental;
        property: Property;
        tenant: Tenant;
      }>;

    setUpcomingPayments(upcoming);
  }, [router]);

  return (
    <>
      <SEO 
        title="Dashboard - ImóvelControl"
        description="Painel de controle do sistema de gerenciamento de locações"
      />
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Visão geral do sistema de locações</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/properties">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Total de Imóveis</CardTitle>
                  <Building2 className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalProperties}</div>
                  <p className="text-xs text-gray-500 mt-1">Todos os imóveis</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/properties?filter=rented">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Imóveis Alugados</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.rentedProperties}</div>
                  <p className="text-xs text-gray-500 mt-1">Com inquilinos</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/properties?filter=available">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Imóveis Disponíveis</CardTitle>
                  <Building2 className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.availableProperties}</div>
                  <p className="text-xs text-gray-500 mt-1">Para locação</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tenants">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Total de Inquilinos</CardTitle>
                  <Users className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalTenants}</div>
                  <p className="text-xs text-gray-500 mt-1">Cadastrados</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/payments?filter=paid">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos no Mês</CardTitle>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.paidThisMonth}</div>
                  <p className="text-xs text-gray-500 mt-1">Confirmados</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/payments?filter=unpaid">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-600">Pendentes no Mês</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.unpaidThisMonth}</div>
                  <p className="text-xs text-gray-500 mt-1">Aguardando</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-gray-600">Recebido no Mês</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-gray-500 mt-1">Total recebido</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 bg-indigo-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-gray-600">Taxa Administração</CardTitle>
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.adminFee)}</div>
                <p className="text-xs text-gray-500 mt-1">Comissão</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle>Prestes a Vencer</CardTitle>
                  <CardDescription>Pagamentos pendentes do mês corrente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>Todos os pagamentos do mês estão em dia!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map(({ payment, property, tenant }) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-600">Inquilino: {tenant.name}</p>
                        <p className="text-xs text-gray-500">Vencimento: {formatDate(payment.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-700">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-gray-500">Pendente</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total a Receber:</span>
                      <span className="text-xl font-bold text-amber-700">{formatCurrency(stats.dueThisMonth)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}