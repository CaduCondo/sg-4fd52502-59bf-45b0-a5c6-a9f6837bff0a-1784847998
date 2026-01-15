import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { rentalStorage, paymentStorage, propertyStorage, tenantStorage, configStorage } from "@/lib/storage";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { Payment, Rental, Property, Tenant } from "@/types";
import { formatCurrency } from "@/lib/masks";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PaymentRow {
  paymentId: string;
  rentalId: string;
  location: string;
  complement: string;
  tenantName: string;
  year: number;
  month: number;
  status: string;
  paymentCode: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
}

type SortField = "location" | "dueDate" | "expectedAmount" | "paidAmount" | "status";
type SortOrder = "asc" | "desc";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function FinancialPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const isAdmin = hasRole("admin");
  const isFinanceiro = hasRole("financeiro");

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<PaymentRow[]>([]);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentMonth);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Summary stats
  const [totalExpected, setTotalExpected] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [difference, setDifference] = useState(0);
  const [adminFee, setAdminFee] = useState(0);

  // Chart Data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [revenueByLocationData, setRevenueByLocationData] = useState<any[]>([]);

  // Editable payment code
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentCode, setEditPaymentCode] = useState("");

  // Available locations from config
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Only admin and financeiro can access
    if (!isAdmin && !isFinanceiro) {
      router.push("/dashboard");
      return;
    }

    loadData();
  }, [user, router, isAdmin, isFinanceiro]);

  useEffect(() => {
    applyFilters();
  }, [rows, selectedYear, selectedMonth, selectedPropertyType, selectedLocations, sortField, sortOrder]);

  const loadData = () => {
    const config = configStorage.get();
    const locations = config.locations || ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias"];
    
    // Financeiro users only see specific locations
    if (isFinanceiro) {
      setAvailableLocations(["Jd. Colombo", "Signore"]);
      setSelectedLocations(["Jd. Colombo", "Signore"]);
    } else {
      setAvailableLocations(locations);
      setSelectedLocations(locations);
    }

    const rentals = rentalStorage.getAll();
    const payments = paymentStorage.getAll();
    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();

    const paymentRows: PaymentRow[] = [];

    rentals.forEach(rental => {
      const property = properties.find(p => p.id === rental.propertyId);
      const tenant = tenants.find(t => t.id === rental.tenantId);
      if (!property || !tenant) return;

      // Get all payments for this rental
      const rentalPayments = payments.filter(p => p.rentalId === rental.id);

      rentalPayments.forEach(payment => {
        const dueDate = new Date(rental.startDate);
        const monthNum = payment.referenceMonth;
        const monthsFromStart = monthNum - 1;
        
        dueDate.setMonth(dueDate.getMonth() + monthsFromStart);
        dueDate.setDate(rental.paymentDay);

        // Calculate expected amount with late fees
        let expectedAmount = rental.monthlyRent;
        if (rental.hasGarage && rental.garageValue) {
            expectedAmount += rental.garageValue;
        }

        // Add late fees if overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(dueDate);
        dueDateObj.setHours(0, 0, 0, 0);

        if (today > dueDateObj && payment.status !== "paid") {
          const daysLate = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
          const lateFee = expectedAmount * 0.10;
          const dailyInterest = expectedAmount * 0.02 * daysLate;
          expectedAmount += lateFee + dailyInterest;
        }

        paymentRows.push({
          paymentId: payment.id,
          rentalId: rental.id,
          location: property.local,
          complement: property.complement || "",
          tenantName: tenant.name,
          year: parseInt(String(payment.referenceYear)),
          month: monthNum,
          status: payment.isPaid ? "Pago" : (payment.paidAmount && payment.paidAmount > 0) ? "Parcial" : "Não Pago",
          paymentCode: payment.paymentCode || "",
          dueDate: dueDate.toISOString().split('T')[0],
          expectedAmount,
          paidAmount: payment.paidAmount || payment.expectedAmount || 0,
        });
      });
    });

    setRows(paymentRows);
  };

  const applyFilters = () => {
    let filtered = [...rows];

    filtered = filtered.filter(row => row.year === selectedYear);

    if (selectedMonth !== "all") {
      filtered = filtered.filter(row => row.month === selectedMonth);
    }

    if (selectedPropertyType !== "all") {
      const rentals = rentalStorage.getAll();
      const properties = propertyStorage.getAll();
      const filteredRentalIds = rentals
        .filter(rental => {
          const property = properties.find(p => p.id === rental.propertyId);
          return property?.type === selectedPropertyType;
        })
        .map(r => r.id);
      
      filtered = filtered.filter(row => filteredRentalIds.includes(row.rentalId));
    }

    if (selectedLocations.length > 0) {
      filtered = filtered.filter(row => selectedLocations.includes(row.location));
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "dueDate") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredRows(filtered);

    const expected = filtered.reduce((sum, row) => sum + row.expectedAmount, 0);
    const paid = filtered.reduce((sum, row) => sum + row.paidAmount, 0);
    const diff = expected - paid;

    const config = configStorage.get();
    const fee = paid * (config.adminFeePercentage / 100);

    setTotalExpected(expected);
    setTotalPaid(paid);
    setDifference(diff);
    setAdminFee(fee);

    updateChartData(filtered, config.adminFeePercentage);
  };

  const updateChartData = (data: PaymentRow[], adminFeePercent: number) => {
    const monthlyData: Record<number, { revenue: number; adminFee: number }> = {};
    data.forEach(row => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = { revenue: 0, adminFee: 0 };
      }
      monthlyData[row.month].revenue += row.paidAmount;
      monthlyData[row.month].adminFee += row.paidAmount * (adminFeePercent / 100);
    });

    const revData = Object.keys(monthlyData).map(m => ({
        month: new Date(0, parseInt(m) - 1).toLocaleString('pt-BR', { month: 'long' }),
        revenue: monthlyData[parseInt(m)].revenue,
        adminFee: monthlyData[parseInt(m)].adminFee
    }));
    setRevenueData(revData);

    const statusCounts = { Pago: 0, Parcial: 0, 'Não Pago': 0 };
    data.forEach(row => {
        if (row.status === 'Pago') statusCounts.Pago++;
        else if (row.status === 'Parcial') statusCounts.Parcial++;
        else statusCounts['Não Pago']++;
    });
    setPaymentStatusData([
        { name: 'Pago', value: statusCounts.Pago },
        { name: 'Parcial', value: statusCounts.Parcial },
        { name: 'Não Pago', value: statusCounts['Não Pago'] }
    ]);

    const locData: Record<string, number> = {};
    data.forEach(row => {
        if (!locData[row.location]) locData[row.location] = 0;
        locData[row.location] += row.paidAmount;
    });
    const revLocData = Object.keys(locData).map(k => ({
        location: k,
        revenue: locData[k]
    }));
    setRevenueByLocationData(revLocData);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(l => l !== location);
      } else {
        return [...prev, location];
      }
    });
  };

  const handlePaymentCodeChange = (paymentId: string, newCode: string) => {
    const payment = paymentStorage.getAll().find(p => p.id === paymentId);
    if (payment) {
      const updated: Payment = { ...payment, paymentCode: newCode };
      paymentStorage.update(updated);
      loadData();
    }
    setEditingPaymentId(null);
    setEditPaymentCode("");
  };

  const exportData = (format: "xml" | "csv" | "xlsx") => {
    if (format === "csv") {
      let csv = "Local,Complemento,Inquilino,Ano,Mês,Status,Código PIX,Data Vencimento,Valor Esperado,Valor Pago\n";
      filteredRows.forEach(row => {
        csv += `"${row.location}","${row.complement}","${row.tenantName}",${row.year},${row.month},"${row.status}","${row.paymentCode}","${row.dueDate}",${row.expectedAmount.toFixed(2)},${row.paidAmount.toFixed(2)}\n`;
      });
      csv += `\nTOTAL,,,,,,,,${totalExpected.toFixed(2)},${totalPaid.toFixed(2)}`;

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-financeiro-${selectedYear}-${selectedMonth}.csv`;
      a.click();
    } else if (format === "xml") {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<relatorio>\n';
      filteredRows.forEach(row => {
        xml += `  <pagamento>\n`;
        xml += `    <local>${row.location}</local>\n`;
        xml += `    <complemento>${row.complement}</complemento>\n`;
        xml += `    <inquilino>${row.tenantName}</inquilino>\n`;
        xml += `    <ano>${row.year}</ano>\n`;
        xml += `    <mes>${row.month}</mes>\n`;
        xml += `    <status>${row.status}</status>\n`;
        xml += `    <codigo_pix>${row.paymentCode}</codigo_pix>\n`;
        xml += `    <data_vencimento>${row.dueDate}</data_vencimento>\n`;
        xml += `    <valor_esperado>${row.expectedAmount.toFixed(2)}</valor_esperado>\n`;
        xml += `    <valor_pago>${row.paidAmount.toFixed(2)}</valor_pago>\n`;
        xml += `  </pagamento>\n`;
      });
      xml += `  <totais>\n`;
      xml += `    <total_esperado>${totalExpected.toFixed(2)}</total_esperado>\n`;
      xml += `    <total_pago>${totalPaid.toFixed(2)}</total_pago>\n`;
      xml += `  </totais>\n`;
      xml += '</relatorio>';

      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-financeiro-${selectedYear}-${selectedMonth}.xml`;
      a.click();
    } else if (format === "xlsx") {
      alert("Exportação XLSX será implementada com biblioteca específica");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user || (!isAdmin && !isFinanceiro)) {
    return null;
  }

  return (
    <>
      <SEO title="Financeiro - Gestão de Locações" />
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Financeiro</h1>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                <Printer size={16} />
                Imprimir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Download size={16} />
                    Exportar Relatório
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportData("xml")}>
                    Exportar XML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("csv")}>
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("xlsx")}>
                    Exportar XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Esperado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpected)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Diferença</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(difference)}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Taxa Administração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(adminFee)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Ano de Referência</Label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mês de Referência</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(v === "all" ? "all" : Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Meses</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2000, month - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Imóvel</Label>
                  <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="Apartamento">Apartamento</SelectItem>
                      <SelectItem value="Casa">Casa</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Terreno">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ordenar Por</Label>
                  <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="location">Local</SelectItem>
                      <SelectItem value="dueDate">Data de Vencimento</SelectItem>
                      <SelectItem value="expectedAmount">Valor Esperado</SelectItem>
                      <SelectItem value="paidAmount">Valor Pago</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isFinanceiro && (
                <div>
                  <Label className="mb-2 block">Local (selecione múltiplos)</Label>
                  <div className="flex flex-wrap gap-4">
                    {availableLocations.map(location => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={location}
                          checked={selectedLocations.includes(location)}
                          onCheckedChange={() => handleLocationToggle(location)}
                        />
                        <label htmlFor={location} className="text-sm cursor-pointer">{location}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Receita Mensal (Filtro Atual)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Receita" />
                      <Line type="monotone" dataKey="adminFee" stroke="#6366f1" strokeWidth={2} name="Taxa Admin" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receita por Local</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByLocationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="location" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("location")}>
                        Local {sortField === "location" && (sortOrder === "asc" ? <ChevronUp className="inline" size={16} /> : <ChevronDown className="inline" size={16} />)}
                      </TableHead>
                      <TableHead>Complemento</TableHead>
                      <TableHead>Inquilino</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Mês</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                        Status {sortField === "status" && (sortOrder === "asc" ? <ChevronUp className="inline" size={16} /> : <ChevronDown className="inline" size={16} />)}
                      </TableHead>
                      {isAdmin && <TableHead>Código PIX</TableHead>}
                      <TableHead className="cursor-pointer" onClick={() => handleSort("dueDate")}>
                        Data Vencimento {sortField === "dueDate" && (sortOrder === "asc" ? <ChevronUp className="inline" size={16} /> : <ChevronDown className="inline" size={16} />)}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("expectedAmount")}>
                        Valor Esperado {sortField === "expectedAmount" && (sortOrder === "asc" ? <ChevronUp className="inline" size={16} /> : <ChevronDown className="inline" size={16} />)}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("paidAmount")}>
                        Valor Pago {sortField === "paidAmount" && (sortOrder === "asc" ? <ChevronUp className="inline" size={16} /> : <ChevronDown className="inline" size={16} />)}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.paymentId}>
                        <TableCell className="font-medium">{row.location}</TableCell>
                        <TableCell>{row.complement}</TableCell>
                        <TableCell>{row.tenantName}</TableCell>
                        <TableCell>{row.year}</TableCell>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.status === "Pago" ? "bg-blue-100 text-blue-800" :
                            row.status === "Parcial" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {row.status}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {editingPaymentId === row.paymentId ? (
                              <Input
                                value={editPaymentCode}
                                onChange={(e) => setEditPaymentCode(e.target.value)}
                                onBlur={() => handlePaymentCodeChange(row.paymentId, editPaymentCode)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handlePaymentCodeChange(row.paymentId, editPaymentCode);
                                  }
                                }}
                                autoFocus
                                className="w-32"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => {
                                  setEditingPaymentId(row.paymentId);
                                  setEditPaymentCode(row.paymentCode);
                                }}
                              >
                                {row.paymentCode || "-"}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>{new Date(row.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.expectedAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.paidAmount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={isAdmin ? 7 : 6}>TOTAL</TableCell>
                      {isAdmin && <TableCell></TableCell>}
                      <TableCell className="text-right">{formatCurrency(totalExpected)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalPaid)}</TableCell>
                    </TableRow>
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