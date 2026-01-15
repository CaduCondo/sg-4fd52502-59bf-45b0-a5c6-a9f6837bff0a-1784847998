import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAuthenticated } from "@/lib/auth";
import { paymentStorage, rentalStorage, propertyStorage, tenantStorage, configStorage } from "@/lib/storage";
import { Payment, Rental, Property, Tenant } from "@/types";
import { DollarSign, AlertTriangle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { FloatingCard } from "@/components/animations/FloatingCard";

export default function Recebimentos() {
  const router = useRouter();
  const [payments, setPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
    installmentNumber: number;
  }>>([]);
  const [filteredPayments, setFilteredPayments] = useState<Array<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
    installmentNumber: number;
  }>>([]);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid" | "partial">("all");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
    
    loadPayments();
  }, [router]);

  useEffect(() => {
    let filtered = payments;

    if (filterMonth) {
      filtered = filtered.filter(p => p.payment.month === filterMonth);
    }

    if (filterYear) {
      filtered = filtered.filter(p => p.payment.year.toString() === filterYear);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(p => p.payment.status === filterStatus);
    }

    // Ordenar por cor: vermelhos (unpaid/partial) → amarelos (partial) → azuis (paid)
    filtered.sort((a, b) => {
      const statusOrder = { unpaid: 0, partial: 1, paid: 2 };
      return statusOrder[a.payment.status] - statusOrder[b.payment.status];
    });

    setFilteredPayments(filtered);
  }, [filterMonth, filterYear, filterStatus, payments]);

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
        // Calcular número da prestação
        const startDate = new Date(rental.startDate);
        const paymentDate = new Date(payment.year, parseInt(payment.month) - 1);
        const monthsDiff = (paymentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (paymentDate.getMonth() - startDate.getMonth()) + 1;
        
        return { 
          payment, 
          rental, 
          property, 
          tenant,
          installmentNumber: monthsDiff
        };
      }
      return null;
    }).filter(Boolean) as Array<{
      payment: Payment;
      rental: Rental;
      property: Property;
      tenant: Tenant;
      installmentNumber: number;
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

  const formatMonthYear = (month: string, year: number) => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  const getOrdinalSuffix = (num: number) => {
    return `${num}ª`;
  };

  const getStatusBadge = (status: "paid" | "unpaid" | "partial") => {
    const variants = {
      paid: { variant: "default" as const, label: "Pago", color: "bg-blue-500" },
      unpaid: { variant: "destructive" as const, label: "Não Pago", color: "bg-red-500" },
      partial: { variant: "secondary" as const, label: "Parcial", color: "bg-yellow-500" }
    };
    return variants[status];
  };

  const unpaidPayments = filteredPayments.filter(p => p.payment.status === "unpaid" || p.payment.status === "partial");
  const paidPayments = filteredPayments.filter(p => p.payment.status === "paid");

  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.payment.partialAmount || p.payment.amount), 0);
  const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + (p.payment.amount - (p.payment.partialAmount || 0)), 0);

  const config = configStorage.get();
  
  // Logic to calculate admin fee excluding "Outros"
  const adminFee = paidPayments.reduce((acc, curr) => {
    // Only apply fee if property local is NOT "Outros"
    if (curr.property && curr.property.local !== "Outros") {
      const amount = curr.payment.partialAmount || curr.payment.amount;
      return acc + (amount * (config.adminFeePercentage / 100));
    }
    return acc;
  }, 0);

  return (
    <>
      <SEO 
        title="Gestão de Recebimento - ImóvelControl"
        description="Controle de recebimentos de locações"
      />
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão de Recebimentos</h1>
            <p className="text-slate-600 mt-2">Controle de recebimentos de locações</p>
          </div>

          {/* Locações Não Pagas Este Mês */}
          {unpaidPayments.length > 0 && (
            <FloatingCard delay={0.1}>
              <Card className="border-l-4 border-l-red-500 bg-red-50">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-red-900">Locações Não Pagas Este Mês</CardTitle>
                      <CardDescription className="text-red-700">
                        {unpaidPayments.length} {unpaidPayments.length === 1 ? "locação pendente" : "locações pendentes"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <StaggerContainer staggerDelay={0.05}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unpaidPayments.map(({ payment, property, tenant }, index) => (
                        <StaggerItem key={payment.id}>
                          <Link 
                            href={`/payments/${payment.id}`}
                            className="block"
                          >
                            <div className="p-4 bg-white border-2 border-red-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm">{property.local}</p>
                                    {property.complement && (
                                      <p className="text-xs text-slate-600">{property.complement}</p>
                                    )}
                                  </div>
                                  <Badge variant={getStatusBadge(payment.status).variant} className="ml-2 flex-shrink-0">
                                    {getStatusBadge(payment.status).label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-700">
                                  <span className="font-medium">Inquilino:</span> {tenant.name}
                                </p>
                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-xs text-slate-600">Venc: {formatDate(payment.dueDate)}</span>
                                  <span className="font-bold text-red-700">
                                    {formatCurrency(payment.amount - (payment.partialAmount || 0))}
                                  </span>
                                </div>
                                {payment.partialAmount && payment.partialAmount > 0 && (
                                  <p className="text-xs text-yellow-700">
                                    Pago parcial: {formatCurrency(payment.partialAmount)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </StaggerItem>
                      ))}
                    </div>
                  </StaggerContainer>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-red-900">Total a Receber:</span>
                      <span className="text-xl font-bold text-red-700">{formatCurrency(totalUnpaid)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FloatingCard>
          )}

          {/* Resumo e Filtros */}
          <StaggerContainer staggerDelay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StaggerItem>
                <FloatingCard delay={0}>
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Recebido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.05}>
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Pendente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.1}>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Taxa Administração</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(adminFee)}</div>
                      <p className="text-xs text-slate-500 mt-1">
                        {config.adminFeePercentage}% (exceto "Outros")
                      </p>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>

              <StaggerItem>
                <FloatingCard delay={0.15}>
                  <Card className="border-l-4 border-l-slate-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Filtrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaid + totalUnpaid)}</div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              </StaggerItem>
            </div>
          </StaggerContainer>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os meses</SelectItem>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Ano"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            />

            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="unpaid">Não Pagos</SelectItem>
                <SelectItem value="partial">Parciais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Todos os Registros dos Pagamentos Realizados */}
          <FloatingCard delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Todos os Registros dos Pagamentos Realizados</CardTitle>
                <CardDescription>
                  {filteredPayments.length} {filteredPayments.length === 1 ? "registro" : "registros"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaggerContainer staggerDelay={0.04}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPayments.map(({ payment, property, tenant, installmentNumber }, index) => {
                      const status = getStatusBadge(payment.status);
                      return (
                        <StaggerItem key={payment.id}>
                          <Link 
                            href={`/payments/${payment.id}`}
                            className="block"
                          >
                            <div className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                              payment.status === "paid" ? "bg-blue-50 border-blue-200" :
                              payment.status === "partial" ? "bg-yellow-50 border-yellow-200" :
                              "bg-red-50 border-red-200"
                            }`}>
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm">
                                      {property.local}
                                      {property.complement && ` - ${property.complement}`}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                      {tenant.name}
                                    </p>
                                  </div>
                                  <Badge variant={status.variant} className="ml-2 flex-shrink-0">
                                    {status.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <span className="text-xs font-medium text-slate-600">
                                    {getOrdinalSuffix(installmentNumber)} prestação
                                  </span>
                                  <span className="text-sm font-bold text-slate-900">
                                    {formatCurrency(payment.partialAmount || payment.amount)}
                                  </span>
                                </div>
                                {payment.paymentMethod === "Pix" && payment.paymentCode && (
                                  <p className="text-xs text-slate-500">
                                    <span className="font-medium">Código:</span> {payment.paymentCode}
                                  </p>
                                )}
                                {payment.partialAmount && payment.partialAmount > 0 && payment.status !== "paid" && (
                                  <p className="text-xs text-yellow-700">
                                    Restante: {formatCurrency(payment.amount - payment.partialAmount)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </StaggerItem>
                      );
                    })}
                  </div>
                </StaggerContainer>
              </CardContent>
            </Card>
          </FloatingCard>

          {filteredPayments.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <DollarSign className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum registro encontrado</h3>
                <p className="text-slate-600">Ajuste os filtros para visualizar outros registros</p>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
}