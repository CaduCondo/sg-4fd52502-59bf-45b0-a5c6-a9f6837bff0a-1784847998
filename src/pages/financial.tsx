import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/masks";
import { 
  rentalService, 
  paymentService, 
  propertyService, 
  tenantService,
  configService 
} from "@/services";
import { Property, Tenant, Rental, Payment, Config } from "@/types";
import { DollarSign, TrendingUp, TrendingDown, Percent, FileText } from "lucide-react";

export default function FinancialPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [config, setConfig] = useState<Config | null>(null);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => {
    const now = new Date();
    setFilterMonth((now.getMonth() + 1).toString().padStart(2, "0"));
    setFilterYear(now.getFullYear().toString());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [r, p, prop, t, c] = await Promise.all([
        rentalService.getAll(),
        paymentService.getAll(),
        propertyService.getAll(),
        tenantService.getAll(),
        configService.get()
      ]);
      setRentals(r);
      setPayments(p);
      setProperties(prop);
      setTenants(t);
      setConfig(c);
    } catch (error) {
      console.error("Error loading financial data", error);
    }
  };

  // Filter payments for selected period
  const filteredPayments = payments.filter(p => 
    p.referenceMonth === filterMonth && 
    p.referenceYear === filterYear
  );

  // Calculate totals
  const totalExpected = filteredPayments.reduce((acc, curr) => acc + curr.expectedAmount, 0);
  const totalPaid = filteredPayments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  const totalPending = totalExpected - totalPaid; // Approximate for simple display
  
  // Calculate admin fee based on PAID amount
  const adminFeePercentage = config?.adminFeePercentage || 6;
  const totalAdminFee = (totalPaid * adminFeePercentage) / 100;
  
  const netRevenue = totalPaid - totalAdminFee;

  // Prepare table data
  const tableData = filteredPayments.map(payment => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    const property = properties.find(p => p.id === rental?.propertyId);
    const tenant = tenants.find(t => t.id === rental?.tenantId);
    
    return {
      id: payment.id,
      location: property?.location || "N/A",
      complement: property?.complement || "",
      tenant: tenant?.name || "N/A",
      dueDate: payment.dueDate,
      expected: payment.expectedAmount,
      paid: payment.paidAmount || 0,
      status: payment.status,
      adminFee: ((payment.paidAmount || 0) * adminFeePercentage) / 100
    };
  });

  return (
    <>
      <SEO title="Financeiro" />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Relatório Financeiro</h1>
            
            <div className="flex gap-4">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={m.toString().padStart(2, "0")}>
                      {new Date(2024, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
                <p className="text-xs text-muted-foreground">Valor efetivamente recebido</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa Adm. ({adminFeePercentage}%)</CardTitle>
                <Percent className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAdminFee)}</div>
                <p className="text-xs text-muted-foreground">Sobre o valor recebido</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repasse Líquido</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(netRevenue)}</div>
                <p className="text-xs text-muted-foreground">Receita - Taxa Adm.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpected - totalPaid)}</div>
                <p className="text-xs text-muted-foreground">A receber no mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhamento de Locações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor Esperado</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Taxa Adm.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Nenhum registro encontrado para este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.location}</div>
                          <div className="text-xs text-muted-foreground">{row.complement}</div>
                        </TableCell>
                        <TableCell>{row.tenant}</TableCell>
                        <TableCell>{new Date(row.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{formatCurrency(row.expected)}</TableCell>
                        <TableCell className="font-medium text-emerald-600">{formatCurrency(row.paid)}</TableCell>
                        <TableCell className="text-blue-600">{formatCurrency(row.adminFee)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            row.status === 'paid' ? 'bg-green-100 text-green-800' :
                            row.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.status === 'paid' ? 'Pago' : row.status === 'partial' ? 'Parcial' : 'Pendente'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}