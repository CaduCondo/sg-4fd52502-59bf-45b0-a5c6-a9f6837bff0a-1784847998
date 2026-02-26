import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  DollarSign,
  Percent,
  Settings,
  Receipt,
  TrendingUp,
  Check,
  X,
  Edit2,
  Wallet
} from "lucide-react";
import { DepositInstallmentsTable } from "@/components/financial/DepositInstallmentsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Payment, Property, Rental, Tenant } from "@/types";

type SortField = "paymentNumber" | "local" | "complement" | "status" | "dueDate" | "paymentDate" | "expectedAmount" | "paidAmount";
type SortDirection = "asc" | "desc" | null;

// Cache em memória para financial data
let financialCache: {
  data: {
    payments: Payment[];
    locations: Map<string, string>;
    exemptLocationIds: string[];
    config: any;
  } | null;
  key: string;
  timestamp: number;
} = { data: null, key: "", timestamp: 0 };

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "broker";
  const isFinancial = user?.role === "financial";
  
  // Data fetching state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [locationsMap, setLocationsMap] = useState<Map<string, string>>(new Map());

  // Date State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [locationExpenses, setLocationExpenses] = useState<number>(0);

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Ref para controlar execuções simultâneas
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [editingPixCode, setEditingPixCode] = useState<{
    id: string;
    value: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filterMonth, filterYear]);

  const loadData = async () => {
    // Prevenir execuções simultâneas
    if (loadingRef.current) {
      console.log("⏸️ [Financial] Carregamento já em andamento, ignorando...");
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Verificar cache
    const cacheKey = `${filterMonth}-${filterYear}-${user?.id}`;
    const now = Date.now();
    
    if (
      financialCache.data &&
      financialCache.key === cacheKey &&
      (now - financialCache.timestamp) < CACHE_DURATION
    ) {
      console.log("✅ [Financial] Usando cache em memória");
      setPayments(financialCache.data.payments);
      setLocationsMap(financialCache.data.locations);
      setExemptLocationIds(financialCache.data.exemptLocationIds);
      setConfig(financialCache.data.config);
      setLoading(false);
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      abortControllerRef.current = new AbortController();
      
      console.log("🔄 [Financial] Buscando do banco...", {
        filterMonth,
        filterYear,
        userId: user?.id,
        userRole: user?.role
      });

      // QUERY OTIMIZADA: 1 única query com JOIN completo
      // Usando 'any' para evitar erro TS2589 (excessively deep type instantiation) devido à complexidade dos JOINs
      const paymentsQuery: any = supabase
        .from("payments")
        .select(`
          id,
          rental_id,
          expected_amount,
          paid_amount,
          due_date,
          payment_date,
          payment_time,
          status,
          reference_month,
          reference_year,
          discount_amount,
          late_fee,
          interest,
          payment_method,
          installment,
          total_installments,
          rentals!payments_rental_id_fkey (
            id,
            rent_value,
            garage_value,
            has_garage,
            rent_due_day,
            start_date,
            end_date,
            pix_code,
            properties!rentals_property_id_fkey (
              id,
              property_identifier,
              location_id,
              complement,
              locations!properties_location_id_fkey (
                id,
                name
              )
            ),
            tenants!rentals_tenant_id_fkey (
              id,
              name,
              cpf,
              email,
              phone
            )
          )
        `)
        .eq("reference_month", String(filterMonth))
        .eq("reference_year", String(filterYear))
        .order("due_date", { ascending: true });
        
      if (abortControllerRef.current) {
        paymentsQuery.abortSignal(abortControllerRef.current.signal);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) throw paymentsError;

      console.log("✅ [Financial] Dados retornados:", {
        totalPayments: paymentsData?.length || 0,
        filterMonth,
        filterYear
      });

      // Processar dados e extrair locations
      const locationsMapTemp = new Map<string, string>();
      const formattedPayments: Payment[] = (paymentsData || []).map((payment: any) => {
        const rental = payment.rentals;
        const property = rental?.properties;
        const tenant = rental?.tenants;
        const location = property?.locations;

        // Adicionar location ao map
        if (location && !locationsMapTemp.has(location.id)) {
          locationsMapTemp.set(location.id, location.name);
        }

        return {
          id: payment.id,
          rentalId: payment.rental_id,
          expectedAmount: payment.expected_amount,
          paidAmount: payment.paid_amount || 0,
          dueDate: payment.due_date,
          paymentDate: payment.payment_date,
          paymentTime: payment.payment_time,
          status: payment.status as "paid" | "pending" | "overdue" | "partial",
          referenceMonth: Number(payment.reference_month),
          referenceYear: Number(payment.reference_year),
          discount: payment.discount_amount,
          lateFee: payment.late_fee,
          interest: payment.interest,
          paymentMethod: payment.payment_method,
          installment: payment.installment,
          totalInstallments: payment.total_installments,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
          rental: rental ? {
            id: rental.id,
            monthlyRent: rental.rent_value,
            garageValue: rental.garage_value,
            hasGarage: rental.has_garage,
            paymentDay: rental.rent_due_day,
            startDate: rental.start_date,
            endDate: rental.end_date,
            propertyId: property?.id || "",
            tenantId: tenant?.id || "",
            value: rental.rent_value || 0,
            depositAmount: 0,
            status: "active",
            isActive: true,
            attachments: [],
            contractAttachments: [],
            autoRenew: false,
            hasPartnerBroker: false,
            installments: 1,
            totalInstallments: 1,
            pixCode: rental.pix_code
          } : undefined,
          property: property ? {
            id: property.id,
            propertyIdentifier: property.property_identifier,
            locationId: property.location_id,
            complement: property.complement,
            location: location?.name || "Carregando...",
            description: "",
            rooms: 0,
            bathrooms: 0,
            area: 0,
            value: 0,
            hasGarage: false,
            hasFurniture: false,
            acceptsPets: false,
            status: "unavailable",
            images: [],
            createdAt: "",
            address: "",
            features: []
          } : undefined,
          tenant: tenant ? {
            id: tenant.id,
            name: tenant.name,
            cpf: tenant.cpf,
            email: tenant.email,
            phone: tenant.phone,
            document: tenant.cpf || "",
            status: "active"
          } : undefined,
          propertyId: property?.id || "",
          tenantId: tenant?.id || "",
        };
      });

      // Buscar configurações e isenções em paralelo
      const exemptionsQuery: any = supabase.from("admin_fee_exempt_locations").select("location_id");
      const configQuery: any = supabase.from("configs").select("*").single();
      const expensesQuery: any = supabase
        .from("location_expenses")
        .select("amount")
        .eq("month", filterMonth)
        .eq("year", filterYear);

      // Executar queries sequencialmente para evitar erro TS2589
      const exemptionsResult = await exemptionsQuery;
      const configResult = await configQuery;
      const expensesResult = await expensesQuery;

      // Buscar permissões separadamente para evitar erro de tipo profundo
      let allowedLocations: string[] = [];
      if (user?.role === "financial") {
        const { data: permData } = await supabase
          .from("user_location_permissions")
          .select("location_id")
          .eq("user_id", user.id);
        allowedLocations = permData?.map(p => p.location_id) || [];
      }

      const exemptIds = exemptionsResult.data?.map((e: any) => e.location_id) || [];
      const configData = configResult.data;
      const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      setExemptLocationIds(exemptIds);
      setConfig(configData);
      setLocationExpenses(totalExpenses);
      setAllowedLocationIds(allowedLocations);
      setLocationsMap(locationsMapTemp);

      console.log("✅ [Financial] Processamento concluído:", {
        totalPayments: formattedPayments.length,
        totalLocations: locationsMapTemp.size,
        exemptLocations: exemptIds.length,
        locationExpenses: totalExpenses
      });

      // Atualizar cache
      financialCache = {
        data: {
          payments: formattedPayments,
          locations: locationsMapTemp,
          exemptLocationIds: exemptIds,
          config: configData,
        },
        key: cacheKey,
        timestamp: now,
      };

      setPayments(formattedPayments);

    } catch (error: any) {
      // Ignorar erros de abort
      if (error?.name === 'AbortError') {
        console.log("⏸️ [Financial] Requisição cancelada");
        return;
      }
      
      console.error("❌ Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      loadingRef.current = false;
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Memoizar função de obter detalhes do pagamento
  const getPaymentDetails = useCallback((payment: Payment) => {
    const property = payment.property;
    const tenant = payment.tenant;
    const rental = payment.rental;

    return {
      local: property?.location || "N/A",
      complemento: property?.complement || "N/A",
      tenantName: tenant?.name || "N/A",
      rental: rental,
      pixCode: rental?.pixCode || "",
      paymentTime: payment.paymentTime || "",
    };
  }, []);

  // Memoizar cálculo de número de parcela
  const calculatePaymentNumber = useCallback((payment: Payment, rental: Rental | undefined) => {
    const rentalData = rental || payment.rental;
    
    if (!rentalData || !rentalData.startDate || !rentalData.endDate) {
      return "N/A";
    }
    
    try {
      const contractStartDate = new Date(rentalData.startDate + "T00:00:00");
      const contractEndDate = new Date(rentalData.endDate + "T00:00:00");
      const totalMonths = differenceInMonths(contractEndDate, contractStartDate);
      
      const referenceDate = new Date(payment.referenceYear || 0, (payment.referenceMonth || 1) - 1, 1);
      const currentPaymentNumber = differenceInMonths(referenceDate, contractStartDate) + 1;
      
      if (isNaN(currentPaymentNumber) || isNaN(totalMonths)) {
        return "N/A";
      }
      
      return `${currentPaymentNumber}/${totalMonths}`;
    } catch (error) {
      return "N/A";
    }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  // Memoizar pagamentos ordenados
  const getSortedPayments = useMemo(() => {
    if (!sortField || !sortDirection) return payments;

    return [...payments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "paymentNumber":
          aValue = calculatePaymentNumber(a, a.rental);
          bValue = calculatePaymentNumber(b, b.rental);
          break;
        case "local":
          aValue = getPaymentDetails(a).local;
          bValue = getPaymentDetails(b).local;
          break;
        case "complement":
          aValue = getPaymentDetails(a).complemento;
          bValue = getPaymentDetails(b).complemento;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate + "T00:00:00").getTime();
          bValue = new Date(b.dueDate + "T00:00:00").getTime();
          break;
        case "paymentDate":
          aValue = a.paymentDate ? new Date(a.paymentDate + "T00:00:00").getTime() : 0;
          bValue = b.paymentDate ? new Date(b.paymentDate + "T00:00:00").getTime() : 0;
          break;
        case "expectedAmount":
          aValue = a.expectedAmount;
          bValue = b.expectedAmount;
          break;
        case "paidAmount":
          aValue = a.paidAmount || 0;
          bValue = b.paidAmount || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [payments, sortField, sortDirection, calculatePaymentNumber, getPaymentDetails]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);
  
  const handleEditPixCode = async (paymentId: string, pixCode: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ payment_code: pixCode })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Código PIX atualizado com sucesso!",
      });

      setPayments(prevPayments =>
        prevPayments.map(p =>
          p.id === paymentId ? { ...p, paymentCode: pixCode } : p
        )
      );
      setEditingPixCode(null);
      
      // Invalidar cache
      financialCache = { data: null, key: "", timestamp: 0 };
    } catch (error) {
      console.error("Erro ao atualizar código PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o código PIX.",
        variant: "destructive",
      });
    }
  };

  const handleExport = useCallback(() => {
    const sortedPayments = getSortedPayments;
    const monthName = format(new Date(filterYear, filterMonth - 1), "MMMM", { locale: ptBR });

    const excelData = sortedPayments.map(payment => {
      const details = getPaymentDetails(payment);
      const paymentNumber = calculatePaymentNumber(payment, details.rental);
      
      return {
        "Parcela": paymentNumber,
        "Local": details.local,
        "Complemento": details.complemento,
        "Inquilino": details.tenantName,
        "Ano": filterYear,
        "Mês": monthName,
        "Status": payment.status === "paid" ? "Pago" : 
                 payment.status === "pending" ? "Pendente" :
                 payment.status === "overdue" ? "Atrasado" : "Parcial",
        "Data Vencimento": format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy"),
        "Data Recebida": payment.paymentDate ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy") : "-",
        "Horário Recebido": details.paymentTime || "-",
        "Valor Esperado": payment.expectedAmount,
        "Valor Pago": payment.paidAmount || 0,
        "Código PIX": details.pixCode || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    ws["!cols"] = [
      { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, 
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${filterYear}`);
    XLSX.writeFile(wb, `Financeiro_${monthName}_${filterYear}.xlsx`);

    toast({
      title: "Sucesso!",
      description: "Planilha exportada com sucesso.",
    });
  }, [getSortedPayments, filterMonth, filterYear, getPaymentDetails, calculatePaymentNumber, toast]);

  // KPI Calculations (MEMOIZADOS!)
  const kpiCalculations = useMemo(() => {
    const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
    
    const totalReceived = payments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    const feePercentage = config?.admin_fee_percentage ?? 5;
    const feeRate = feePercentage / 100;
    
    const adminFee = payments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => {
        const property = p.property;
        const isExempt = property && exemptLocationIds.includes(property.locationId);
        const fee = isExempt ? 0 : ((p.paidAmount || 0) * feeRate);
        return sum + fee;
      }, 0);

    const mgmtPercentage = config?.management_fee_percentage ?? 3;
    const mgmtRate = mgmtPercentage / 100;
    
    const managementFee = payments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => {
        const fee = (p.paidAmount || 0) * mgmtRate;
        return sum + fee;
      }, 0);

    const netRevenue = totalReceived - adminFee - managementFee - locationExpenses;
    
    const totalPaid = payments
      .filter(p => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    return {
      totalExpected,
      totalReceived,
      adminFee,
      managementFee,
      netRevenue,
      totalPaid,
    };
  }, [payments, config, exemptLocationIds, locationExpenses]);

  const filteredPayments = getSortedPayments;

  if (!mounted) return null;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <ScrollReveal>
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe suas receitas, despesas e fluxo de caixa
            </p>
          </div>
        </ScrollReveal>

        <Tabs defaultValue="rentals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="rentals">Detalhamento de Locações</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="deposits">Detalhamento de Cauções</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="rentals" className="space-y-8 mt-8">
            <ScrollReveal delay={0.1}>
              <PeriodSelector
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                filterMonth={filterMonth}
                filterYear={filterYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onFilterMonthChange={setFilterMonth}
                onFilterYearChange={setFilterYear}
              />
            </ScrollReveal>

            {/* Cards de Métricas - Locações */}
            <div className={`grid gap-4 ${isFinancial ? 'grid-cols-1 md:grid-cols-4' : user?.role === "broker" ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-5'}`}>
              {isFinancial ? (
                <>
                  <ScrollReveal delay={0.2}>
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-blue-600" />
                              Receita Bruta Esperada
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.totalExpected)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total de aluguéis esperados no período
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  <ScrollReveal delay={0.3}>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              Receita Bruta
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.totalReceived)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total recebido no período
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  <ScrollReveal delay={0.4}>
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-orange-600" />
                              Taxas e Contas
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.adminFee + kpiCalculations.managementFee + locationExpenses)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Taxas e contas a pagar do mês
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  <ScrollReveal delay={0.5}>
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-purple-600" />
                              Receita Líquida
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.netRevenue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Valor após subtração das taxas e contas
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                </>
              ) : (
                <>
                  <ScrollReveal delay={0.2}>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              Receita Bruta
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.totalReceived)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total recebido no período
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  <ScrollReveal delay={0.3}>
                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Percent className="h-4 w-4 text-red-600" />
                              Taxa de Administração
                            </p>
                            <p className="text-2xl font-bold text-red-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.adminFee)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {config ? config.admin_fee_percentage : 5}% sobre a receita bruta
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  {user?.role !== "broker" && (
                    <ScrollReveal delay={0.4}>
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Settings className="h-4 w-4 text-blue-600" />
                                Taxa de Gerenciamento
                              </p>
                              <p className="text-2xl font-bold text-blue-600">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(kpiCalculations.managementFee)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {config ? config.management_fee_percentage : 3}% sobre a receita bruta
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  )}

                  <ScrollReveal delay={0.5}>
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-orange-600" />
                              Contas do Mês
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(user?.role === "broker" ? locationExpenses + kpiCalculations.managementFee : locationExpenses)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user?.role === "broker" 
                                ? "Água, luz, taxa de gerenciamento e outras despesas"
                                : "Água, luz e outras despesas dos locais"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>

                  <ScrollReveal delay={0.6}>
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-purple-600" />
                              Receita Líquida
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.netRevenue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Valor após subtração das taxas e contas
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                </>
              )}
            </div>

            {/* Tabela de Locações */}
            <ScrollReveal delay={0.7}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Detalhamento de Locações - {format(
                          new Date(filterYear, filterMonth - 1),
                          "MMMM yyyy",
                          { locale: ptBR }
                        )}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Imprimir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado para o período selecionado
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("paymentNumber")}>
                              <div className="flex items-center">
                                Parcela
                                <SortIcon field="paymentNumber" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("local")}>
                              <div className="flex items-center">
                                Local
                                <SortIcon field="local" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("complement")}>
                              <div className="flex items-center">
                                Complemento
                                <SortIcon field="complement" />
                              </div>
                            </TableHead>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Ano</TableHead>
                            <TableHead>Mês</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                              <div className="flex items-center">
                                Status
                                <SortIcon field="status" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("dueDate")}>
                              <div className="flex items-center">
                                Data Vencimento
                                <SortIcon field="dueDate" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("paymentDate")}>
                              <div className="flex items-center">
                                Data Recebida
                                <SortIcon field="paymentDate" />
                              </div>
                            </TableHead>
                            <TableHead>Horário Recebido</TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort("expectedAmount")}>
                              <div className="flex items-center justify-end">
                                Valor Esperado
                                <SortIcon field="expectedAmount" />
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort("paidAmount")}>
                              <div className="flex items-center justify-end">
                                Valor Pago
                                <SortIcon field="paidAmount" />
                              </div>
                            </TableHead>
                            <TableHead>Código PIX</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => {
                            const details = getPaymentDetails(payment);
                            const monthName = format(new Date(payment.referenceYear || 0, (payment.referenceMonth || 1) - 1), "MMMM", { locale: ptBR });

                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {calculatePaymentNumber(payment, details.rental)}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-[200px]">
                                    <div className="font-medium truncate">
                                      {details.local}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {details.complemento}
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {details.tenantName}
                                </TableCell>
                                <TableCell>{payment.referenceYear}</TableCell>
                                <TableCell className="capitalize">{monthName}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      payment.status === "paid"
                                        ? "default"
                                        : payment.status === "pending"
                                        ? "secondary"
                                        : payment.status === "overdue"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    {payment.status === "paid"
                                      ? "Pago"
                                      : payment.status === "pending"
                                      ? "Pendente"
                                      : payment.status === "overdue"
                                      ? "Atrasado"
                                      : "Parcial"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  {payment.paymentDate
                                    ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-mono">
                                    {details.paymentTime || "-"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(payment.expectedAmount)}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(payment.paidAmount || 0)}
                                </TableCell>
                                <TableCell>
                                  {editingPixCode?.id === payment.id ? (
                                    <div className="flex items-center gap-3">
                                      <Input
                                        value={editingPixCode.value}
                                        onChange={(e) => {
                                          setEditingPixCode({
                                            ...editingPixCode,
                                            value: e.target.value
                                          });
                                        }}
                                        placeholder="Digite o código PIX"
                                        className="h-9 text-sm border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-w-[250px] bg-white"
                                        autoFocus
                                      />
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => handleEditPixCode(payment.id, editingPixCode.value)}
                                        className="h-9 w-9 p-0 hover:bg-green-100 transition-colors"
                                        title="Salvar código PIX"
                                      >
                                        <Check className="h-5 w-5 text-green-600" />
                                      </Button>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => setEditingPixCode(null)}
                                        className="h-9 w-9 p-0 hover:bg-red-100 transition-colors"
                                        title="Cancelar edição"
                                      >
                                        <X className="h-5 w-5 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-600 max-w-xs truncate text-sm font-mono">
                                        {details.pixCode || "-"}
                                      </span>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingPixCode({
                                            id: payment.id,
                                            value: details.pixCode || ""
                                          });
                                        }}
                                        className="h-9 w-9 p-0 hover:bg-slate-100 transition-colors"
                                        title="Editar código PIX"
                                      >
                                        <Edit2 className="h-5 w-5 text-slate-600" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Linha de Totais */}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={10} className="text-right">
                              Totais:
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.totalExpected)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.totalPaid)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="deposits" className="space-y-6">
              <div className="overflow-x-auto">
                <DepositInstallmentsTable 
                  userRole={user?.role || "user"}
                  allowedLocationIds={allowedLocationIds}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}