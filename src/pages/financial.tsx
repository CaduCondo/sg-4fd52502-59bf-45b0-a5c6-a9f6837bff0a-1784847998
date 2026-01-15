import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { rentalService } from "@/services/rentalService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import { configService } from "@/services/configService";
import type { Payment, Rental, Property, Tenant, Config } from "@/types";

interface PaymentWithDetails extends Payment {
  rental?: Rental;
  property?: Property;
  tenant?: Tenant;
  editablePixCode?: string;
}

export default function FinancialPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [config, setConfig] = useState<Config>({ adminFeePercentage: 6, locations: [] });
  const [loading, setLoading] = useState(true);
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAdminFee, setTotalAdminFee] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, rentalsData, propertiesData, tenantsData, configData] = await Promise.all([
        paymentService.getAll(),
        rentalService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
        configService.get()
      ]);

      setPayments(paymentsData.map(p => ({ ...p, editablePixCode: p.notes || "" })));
      setRentals(rentalsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setConfig(configData);

      calculateFinancials(paymentsData, rentalsData, propertiesData, configData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = (
    paymentsData: Payment[],
    rentalsData: Rental[],
    propertiesData: Property[],
    configData: Config
  ) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    const currentMonthPayments = paymentsData.filter(
      p => p.referenceMonth === currentMonth && p.referenceYear === currentYear && p.status === "paid"
    );

    let totalRev = 0;
    let adminFeeTotal = 0;

    for (const payment of currentMonthPayments) {
      const paidAmount = payment.paidAmount || 0;
      totalRev += paidAmount;

      const rental = rentalsData.find(r => r.id === payment.rentalId);
      const property = rental ? propertiesData.find(p => p.id === rental.propertyId) : undefined;

      if (property && property.location.toLowerCase() !== "outros") {
        const fee = paidAmount * (configData.adminFeePercentage / 100);
        adminFeeTotal += fee;
      }
    }

    setTotalRevenue(totalRev);
    setTotalAdminFee(adminFeeTotal);
    setNetRevenue(totalRev - adminFeeTotal);
  };

  const handlePixCodeChange = (paymentId: string, value: string) => {
    setPayments(prev =>
      prev.map(p => p.id === paymentId ? { ...p, editablePixCode: value } : p)
    );
  };

  const handleSavePixCode = async (payment: PaymentWithDetails) => {
    try {
      await paymentService.update({
        ...payment,
        notes: payment.editablePixCode || ""
      });
      loadData();
    } catch (error) {
      console.error("Erro ao salvar código PIX:", error);
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: "Pago", class: "bg-green-100 text-green-800" },
      pending: { label: "Pendente", class: "bg-yellow-100 text-yellow-800" },
      partial: { label: "Parcial", class: "bg-orange-100 text-orange-800" },
      overdue: { label: "Atrasado", class: "bg-red-100 text-red-800" }
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, class: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  const paymentsWithDetails: PaymentWithDetails[] = payments.map(payment => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
    const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
    return { ...payment, rental, property, tenant };
  });

  if (loading) {
    return (
      <>
        <Head>
          <title>Financeiro - Sistema de Locações</title>
        </Head>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-slate-600">Carregando...</p>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Financeiro - Sistema de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Relatório Financeiro</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <CardTitle className="text-emerald-700 text-lg">💰 Receita Total do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-emerald-600 mt-1">Todos os pagamentos recebidos</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader>
                <CardTitle className="text-blue-700 text-lg">📊 Taxa de Administração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-900">{formatCurrency(totalAdminFee)}</p>
                <p className="text-sm text-blue-600 mt-1">{config.adminFeePercentage}% (exceto &quot;Outros&quot;)</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="text-purple-700 text-lg">🏠 Líquido para Proprietários</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-900">{formatCurrency(netRevenue)}</p>
                <p className="text-sm text-purple-600 mt-1">Após taxa administrativa</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>📋 Detalhamento de Locações - Todos os Pagamentos do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead>Complemento</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Mês</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Código PIX</TableHead>
                      <TableHead>Data Vencimento</TableHead>
                      <TableHead>Data Recebida</TableHead>
                      <TableHead>Valor Esperado</TableHead>
                      <TableHead>Valor Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsWithDetails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                          Nenhum pagamento cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentsWithDetails.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.property?.location || "-"}
                          </TableCell>
                          <TableCell>{payment.property?.complement || "-"}</TableCell>
                          <TableCell>{payment.referenceYear}</TableCell>
                          <TableCell>{getMonthName(payment.referenceMonth)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                value={payment.editablePixCode || ""}
                                onChange={(e) => handlePixCodeChange(payment.id, e.target.value)}
                                placeholder="Código PIX"
                                className="w-32 text-sm"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSavePixCode(payment)}
                              >
                                💾
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {payment.paymentDate
                              ? new Date(payment.paymentDate).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.expectedAmount)}</TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            {formatCurrency(payment.paidAmount || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}