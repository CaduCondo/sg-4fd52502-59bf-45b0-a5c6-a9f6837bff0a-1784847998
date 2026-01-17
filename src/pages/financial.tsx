import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { formatCurrency } from "@/lib/masks";
import { paymentService, propertyService, rentalService, tenantService } from "@/services";
import type { Payment, Property, Rental, Tenant } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/router";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  Download
} from "lucide-react";

export default function FinancialPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const user = getCurrentUser();

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const userStr = localStorage.getItem("user");
      const currentUser = userStr ? JSON.parse(userStr) : null;

      const [propertiesData, rentalsData, paymentsData, tenantsData] = await Promise.all([
        propertyService.getAll(),
        rentalService.getAll(),
        paymentService.getAll(),
        tenantService.getAll(),
      ]);

      let filteredProperties = propertiesData;
      let filteredRentals = rentalsData;
      let filteredPayments = paymentsData;

      if (currentUser?.role === "financial") {
        const allowedLocations = ["Jd. Colombo", "Signore"];
        
        filteredProperties = propertiesData.filter(p => 
          allowedLocations.some(loc => p.location?.includes(loc))
        );
        
        const allowedPropertyIds = filteredProperties.map(p => p.id);
        filteredRentals = rentalsData.filter(r => allowedPropertyIds.includes(r.propertyId));
        
        const allowedRentalIds = filteredRentals.map(r => r.id);
        filteredPayments = paymentsData.filter(p => allowedRentalIds.includes(p.rentalId));
      }

      setProperties(filteredProperties);
      setRentals(filteredRentals);
      setPayments(filteredPayments);
      setTenants(tenantsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    return payment.referenceMonth === selectedMonth && payment.referenceYear === selectedYear;
  });

  const totalExpected = filteredPayments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0);
  const totalReceived = filteredPayments
    .filter(p => p.status === "paid" || p.status === "partial")
    .reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalPending = filteredPayments
    .filter(p => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + (p.expectedAmount || 0), 0);

  const paidPayments = filteredPayments.filter(p => p.status === "paid");
  const pendingPayments = filteredPayments.filter(p => p.status === "pending" || p.status === "partial");
  const overduePayments = filteredPayments.filter(p => p.status === "overdue");

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const getPaymentDetails = (payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = properties.find(p => p.id === rental?.propertyId);
    const tenant = tenants.find(t => t.id === rental?.tenantId);

    return {
      propertyLocation: property?.location || "N/A",
      propertyAddress: property?.address || "N/A",
      tenantName: tenant?.name || "N/A",
    };
  };

  const exportFinancialData = () => {
    const monthName = monthNames[selectedMonth - 1];
    
    const exportData = {
      periodo: `${monthName} de ${selectedYear}`,
      resumo: {
        valorEsperado: formatCurrency(totalExpected),
        valorRecebido: formatCurrency(totalReceived),
        valorPendente: formatCurrency(totalPending),
        pagamentosRealizados: paidPayments.length,
        pagamentosPendentes: pendingPayments.length,
        pagamentosAtrasados: overduePayments.length,
      },
      pagamentos: filteredPayments.map(p => {
        const details = getPaymentDetails(p);
        return {
          imovel: details.propertyLocation,
          endereco: details.propertyAddress,
          inquilino: details.tenantName,
          valorEsperado: formatCurrency(p.expectedAmount),
          valorPago: formatCurrency(p.paidAmount),
          dataVencimento: p.dueDate,
          dataPagamento: p.paymentDate || "N/A",
          status: p.status === "paid" ? "Pago" : 
                  p.status === "partial" ? "Parcial" : 
                  p.status === "overdue" ? "Atrasado" : "Pendente",
        };
      }),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${monthName.toLowerCase()}-${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado com sucesso",
      description: `Relatório de ${monthName}/${selectedYear} foi baixado.`,
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financeiro</h1>
              <p className="text-muted-foreground mt-2">
                Gestão completa de recebimentos e fluxo de caixa
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={exportFinancialData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollReveal delay={0.1}>
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Valor Esperado</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalExpected)}</div>
                <p className="text-xs text-blue-600 mt-1">Total a receber no mês</p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <Card className="bg-emerald-50 border-emerald-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Valor Recebido</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalReceived)}</div>
                <p className="text-xs text-emerald-600 mt-1">
                  {((totalReceived / (totalExpected || 1)) * 100).toFixed(1)}% do previsto
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <Card className="bg-amber-50 border-amber-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Valor Pendente</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{formatCurrency(totalPending)}</div>
                <p className="text-xs text-amber-600 mt-1">Aguardando pagamento</p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4}>
          <Card>
            <CardHeader>
              <CardTitle>Recebimentos do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum recebimento encontrado</p>
                    <p className="text-sm">Não há lançamentos para o período selecionado.</p>
                  </div>
                ) : (
                  filteredPayments
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((payment) => {
                      const details = getPaymentDetails(payment);
                      return (
                        <div 
                          key={payment.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => router.push(`/payments/${payment.id}`)}
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-2 rounded-full ${
                              payment.status === "paid" ? "bg-emerald-100 text-emerald-600" :
                              payment.status === "overdue" ? "bg-red-100 text-red-600" :
                              "bg-amber-100 text-amber-600"
                            }`}>
                              {payment.status === "paid" ? <CheckCircle2 className="h-5 w-5" /> :
                               payment.status === "overdue" ? <AlertCircle className="h-5 w-5" /> :
                               <Calendar className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">
                                {details.propertyLocation} - {details.propertyAddress}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Inquilino: {details.tenantName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Vencimento: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                                {payment.paymentDate && ` | Pago em: ${new Date(payment.paymentDate).toLocaleDateString('pt-BR')}`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-slate-900">{formatCurrency(payment.expectedAmount)}</p>
                            {payment.status === "paid" && payment.paidAmount !== payment.expectedAmount && (
                              <p className="text-sm text-emerald-600">Pago: {formatCurrency(payment.paidAmount)}</p>
                            )}
                            <Badge variant={
                              payment.status === "paid" ? "default" :
                              payment.status === "overdue" ? "destructive" : 
                              "secondary"
                            } className="mt-1">
                              {payment.status === "paid" ? "Pago" :
                               payment.status === "overdue" ? "Atrasado" :
                               payment.status === "partial" ? "Parcial" :
                               "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollReveal delay={0.5}>
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Pagamentos Realizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{paidPayments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(paidPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0))}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.6}>
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  Pagamentos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{pendingPayments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(pendingPayments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0))}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.7}>
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Pagamentos Atrasados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{overduePayments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(overduePayments.reduce((acc, p) => acc + (p.expectedAmount || 0), 0))}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </Layout>
  );
}