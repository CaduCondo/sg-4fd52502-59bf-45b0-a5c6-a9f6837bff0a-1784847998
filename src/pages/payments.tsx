import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { paymentStorage, rentalStorage, propertyStorage, tenantStorage } from "@/lib/storage";
import { Payment, Rental, Property, Tenant } from "@/types";
import { DollarSign, Search, CheckCircle, XCircle, Calendar } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Payments() {
  const router = useRouter();
  const [payments, setPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);
  const [filteredPayments, setFilteredPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadPayments();
    
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
  }, [router]);

  useEffect(() => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterMonth) {
      filtered = filtered.filter(p => p.payment.month === filterMonth);
    }

    if (filterYear) {
      filtered = filtered.filter(p => p.payment.year.toString() === filterYear);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(p => 
        filterStatus === "paid" ? p.payment.isPaid : !p.payment.isPaid
      );
    }

    setFilteredPayments(filtered);
  }, [searchTerm, filterMonth, filterYear, filterStatus, payments]);

  const loadPayments = () => {
    const allPayments = paymentStorage.getAll();
    const rentals = rentalStorage.getAll();
    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();

    const paymentDetails = allPayments.map(payment => {
      const rental = rentals.find(r => r.id === payment.rentalId);
      const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
      const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
      
      if (rental && property && tenant) {
        return { payment, rental, property, tenant };
      }
      return null;
    }).filter(Boolean) as Array<{
      payment: Payment;
      rental: Rental;
      property: Property;
      tenant: Tenant;
    }>;

    paymentDetails.sort((a, b) => {
      if (a.payment.year !== b.payment.year) {
        return b.payment.year - a.payment.year;
      }
      return parseInt(b.payment.month) - parseInt(a.payment.month);
    });

    setPayments(paymentDetails);
    setFilteredPayments(paymentDetails);
  };

  const togglePaymentStatus = (paymentId: string) => {
    const allPayments = paymentStorage.getAll();
    const payment = allPayments.find(p => p.id === paymentId);
    
    if (payment) {
      payment.isPaid = !payment.isPaid;
      payment.paidAt = payment.isPaid ? new Date().toISOString() : undefined;
      paymentStorage.save(payment);
      loadPayments();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const formatMonthYear = (month: string, year: number) => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const totalPaid = filteredPayments
    .filter(p => p.payment.isPaid)
    .reduce((sum, p) => sum + p.payment.amount, 0);

  const totalUnpaid = filteredPayments
    .filter(p => !p.payment.isPaid)
    .reduce((sum, p) => sum + p.payment.amount, 0);

  return (
    <>
      <SEO 
        title="Pagamentos - ImóvelControl"
        description="Controle de pagamentos de locações"
      />
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pagamentos</h1>
            <p className="text-slate-600 mt-2">Controle de pagamentos de locações</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Filtrado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaid + totalUnpaid)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
            >
              <option value="">Todos os meses</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>

            <Input
              type="number"
              placeholder="Ano"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "paid" | "unpaid")}
              className="h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="unpaid">Pendentes</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredPayments.map(({ payment, property, tenant }) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-semibold text-slate-900">{property.address}</h3>
                        <Badge variant={payment.isPaid ? "default" : "destructive"}>
                          {payment.isPaid ? "Pago" : "Pendente"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} />
                          <span>{formatMonthYear(payment.month, payment.year)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Inquilino:</span> {tenant.name}
                        </div>
                        <div>
                          <span className="font-medium">Vencimento:</span> {formatDate(payment.dueDate)}
                        </div>
                      </div>
                      {payment.isPaid && payment.paidAt && (
                        <div className="text-sm text-green-600">
                          Pago em {formatDate(payment.paidAt)}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-6 space-y-3">
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      <Button
                        size="sm"
                        variant={payment.isPaid ? "outline" : "default"}
                        onClick={() => togglePaymentStatus(payment.id)}
                        className="flex items-center space-x-2"
                      >
                        {payment.isPaid ? (
                          <>
                            <XCircle size={16} />
                            <span>Marcar Pendente</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            <span>Marcar Pago</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <DollarSign className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum pagamento encontrado</h3>
                <p className="text-slate-600">Ajuste os filtros para visualizar outros pagamentos</p>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
}