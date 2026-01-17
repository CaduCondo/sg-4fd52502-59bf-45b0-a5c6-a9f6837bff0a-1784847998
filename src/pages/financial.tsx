import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { isAuthenticatedAsync } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, applyRealMask, removeMask } from "@/lib/masks";
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
  
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAdminFee, setTotalAdminFee] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [expectedGrossRevenue, setExpectedGrossRevenue] = useState(0);

  useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth((currentDate.getMonth() + 1).toString());
    setSelectedYear(currentDate.getFullYear().toString());
  }, []);

  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const isAuth = await isAuthenticatedAsync();
  //     if (!isAuth) {
  //       router.push("/login");
  //       return;
  //     }
  //     loadData();
  //   };
  //   checkAuth();
  // }, [router]);

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
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    // All payments for the month (any status) for expected gross revenue
    const allMonthPayments = paymentsData.filter(
      p => p.referenceMonth === month && p.referenceYear === year
    );
    
    const expectedGross = allMonthPayments.reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    // Only paid payments for actual revenue
    const currentMonthPayments = paymentsData.filter(
      p => p.referenceMonth === month && p.referenceYear === year && p.status === "paid"
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
    setExpectedGrossRevenue(expectedGross);
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

  const paymentsWithDetails: PaymentWithDetails[] = payments
    .filter(p => p.referenceMonth === parseInt(selectedMonth) && p.referenceYear === parseInt(selectedYear))
    // No status filtering here, so it shows all receipts (paid, pending, partial, overdue)
    .map(payment => {
      const rental = rentals.find(r => r.id === payment.rentalId);
      const property = rental ? properties.find(p => p.id === rental.propertyId) : undefined;
      const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : undefined;
      return { ...payment, rental, property, tenant };
    });

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

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
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Relatório Financeiro</h1>
              <p className="text-muted-foreground">
                {getMonthName(parseInt(selectedMonth))} de {selectedYear}
              </p>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
              <CardHeader>
                <CardTitle className="text-cyan-700 text-lg">📊 Valor Bruto Esperado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-900">{formatCurrency(expectedGrossRevenue)}</p>
                <p className="text-sm text-cyan-600 mt-1">Soma de todos os recebimentos</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <CardTitle className="text-emerald-700 text-lg">💰 Valor Bruto Recebido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-emerald-600 mt-1">Todos os pagamentos recebidos</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="text-purple-700 text-lg">💜 Taxa de Administração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-900">{formatCurrency(totalAdminFee)}</p>
                <p className="text-sm text-purple-600 mt-1">{config.adminFeePercentage}% da receita</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader>
                <CardTitle className="text-blue-700 text-lg">🎯 Receita Líquida</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-900">{formatCurrency(netRevenue)}</p>
                <p className="text-sm text-blue-600 mt-1">Receita após taxa administrativa</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>📋 Detalhamento de Locações - {getMonthName(parseInt(selectedMonth))} {selectedYear}</CardTitle>
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
                          Nenhum recebimento cadastrado para este período
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
                    {paymentsWithDetails.length > 0 && (
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell colSpan={8} className="text-right">
                          TOTAIS:
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatCurrency(paymentsWithDetails.reduce((sum, p) => sum + (p.expectedAmount || 0), 0))}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700">
                          {formatCurrency(paymentsWithDetails.reduce((sum, p) => sum + (p.paidAmount || 0), 0))}
                        </TableCell>
                      </TableRow>
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