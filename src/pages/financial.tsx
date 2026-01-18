import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { paymentService } from "@/services";
import { locationService } from "@/services/locationService";
import { propertyService } from "@/services/propertyService";
import type { Payment } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PropertyWithLocation {
  id: string;
  location: string;
  location_id: string;
  property_identifier: string;
  monthly_rent: number;
}

export default function FinancialPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [properties, setProperties] = useState<PropertyWithLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPayments();
    calculateTotals();
  }, [payments, selectedLocation, selectedMonth, selectedYear, selectedStatus, searchTerm]);

  const loadData = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Buscar locais
      const locationsData = await locationService.getAll();
      setLocations(locationsData);

      // Buscar locais permitidos para usuário financeiro
      let allowedLocations: string[] = [];
      if (currentUser && currentUser.role === "financial") {
        const { userLocationPermissionService } = await import("@/services/userLocationPermissionService");
        const permissions = await userLocationPermissionService.getByUserId(currentUser.id);
        allowedLocations = permissions; // permissions is already string[]
      }

      // Buscar propriedades
      const propertiesData = await propertyService.getAll();
      
      // Filtrar propriedades por locais permitidos (se for financeiro)
      let filteredProperties = propertiesData;
      if (currentUser && currentUser.role === "financial" && allowedLocations.length > 0) {
        filteredProperties = propertiesData.filter(prop => 
          allowedLocations.includes(prop.location_id || "")
        );
      }
      
      setProperties(filteredProperties as PropertyWithLocation[]);

      // Buscar pagamentos
      const paymentsData = await paymentService.getAll();
      
      // Filtrar pagamentos por propriedades permitidas
      const filteredPayments = paymentsData.filter(payment => {
        const propertyId = payment.rental?.propertyId;
        return filteredProperties.some(prop => prop.id === propertyId);
      });
      
      setPayments(filteredPayments);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    const filtered = payments.filter((payment) => {
      const paymentDate = new Date(payment.dueDate);
      const paymentMonth = (paymentDate.getMonth() + 1).toString();
      const paymentYear = paymentDate.getFullYear().toString();

      const matchesSearch =
        payment.rental?.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.rental?.property?.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "paid" && payment.status === "paid") ||
        (selectedStatus === "pending" && payment.status === "pending") ||
        (selectedStatus === "overdue" && payment.status === "overdue");

      const matchesMonth = selectedMonth === "all" || paymentMonth === selectedMonth;
      const matchesYear = selectedYear === "all" || paymentYear === selectedYear;
      const matchesLocation =
        !selectedLocation || 
        selectedLocation === "all" || 
        payment.rental?.property?.location_id === selectedLocation;

      return matchesSearch && matchesStatus && matchesMonth && matchesYear && matchesLocation;
    });

    setFilteredPayments(filtered);
  };

  const calculateTotals = () => {
    const received = filteredPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const pending = filteredPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    const overdue = filteredPayments
      .filter((p) => p.status === "overdue")
      .reduce((sum, p) => sum + (p.expectedAmount || 0), 0);

    setTotalReceived(received);
    setTotalPending(pending);
    setTotalOverdue(overdue);
  };

  const exportToCSV = () => {
    const headers = ["Data", "Inquilino", "Local", "Valor", "Status"];
    const rows = filteredPayments.map((payment) => [
      format(new Date(payment.dueDate), "dd/MM/yyyy"),
      payment.rental?.tenant?.name || "-",
      payment.rental?.property?.location || "-",
      (payment.status === "paid" ? payment.paidAmount : payment.expectedAmount).toFixed(2),
      payment.status === "paid" ? "Pago" : payment.status === "pending" ? "Pendente" : "Atrasado",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_financeiro_${format(new Date(), "dd-MM-yyyy")}.csv`;
    link.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
    };

    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      overdue: "Atrasado",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Relatório Financeiro - Gerenciador de Locações" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatório Financeiro</h1>
            <p className="text-muted-foreground">
              Visualize e exporte relatórios financeiros detalhados
            </p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceived)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalPending)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOverdue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Meses</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Anos</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{payment.rental?.tenant?.name || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.rental?.property?.location}</p>
                          {payment.rental?.property?.locationData && (
                            <p className="text-sm text-muted-foreground">
                              {payment.rental.property.locationData.street}, {payment.rental.property.locationData.number}
                              {payment.rental.property.locationData.neighborhood && 
                                ` - ${payment.rental.property.locationData.neighborhood}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {payment.rental?.property?.property_identifier || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.status === "paid" ? payment.paidAmount : payment.expectedAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}