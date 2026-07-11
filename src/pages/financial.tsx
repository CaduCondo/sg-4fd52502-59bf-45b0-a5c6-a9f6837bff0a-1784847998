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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Wallet,
  MapPin
} from "lucide-react";
import { DepositInstallmentsTable } from "@/components/financial/DepositInstallmentsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Payment, Property, Rental, Tenant } from "@/types";

type SortField = "paymentNumber" | "local" | "complement" | "status" | "dueDate" | "paymentDate" | "expectedAmount" | "paidAmount";
type SortDirection = "asc" | "desc" | null;

type ExpenseSortField = "location_name" | "description" | "amount";

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
  
  // Novo estado para armazenar as despesas com location_id
  const [locationExpensesData, setLocationExpensesData] = useState<Array<{amount: number, location_id: string}>>([]);
  
  // Estado para controlar o dialog de detalhamento de contas
  const [showExpensesDialog, setShowExpensesDialog] = useState(false);
  const [expensesDetails, setExpensesDetails] = useState<Array<{
    id: string;
    location_name: string;
    amount: number;
    description: string;
    reference_month: number;
    reference_year: number;
    location_id: string;
  }>>([]);

  // Date State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [locationExpenses, setLocationExpenses] = useState<number>(0);

  // Location filter state
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Sorting state for expenses dialog
  const [expenseSortField, setExpenseSortField] = useState<ExpenseSortField | null>(null);
  const [expenseSortDirection, setExpenseSortDirection] = useState<SortDirection>(null);

  const expensesContentRef = useRef<HTMLDivElement>(null);

  // Ref para controlar execuções simultâneas
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [editingPixCode, setEditingPixCode] = useState<{
    id: string;
    value: string;
  } | null>(null);

  useEffect(() => {
    console.log("🔄 [Financial] Componente montando...");
    setMounted(true);
    console.log("✅ [Financial] Componente montado (mounted = true)");
  }, []);

  useEffect(() => {
    console.log("🔄 [Financial] useEffect loadData disparado", {
      user: !!user,
      filterMonth,
      filterYear,
      mounted
    });
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
    
    console.log("🔍 [Financial] Verificando cache:", {
      cacheKey,
      hasCachedData: !!financialCache.data,
      cacheAge: financialCache.timestamp ? (now - financialCache.timestamp) : 'N/A',
      cacheDuration: CACHE_DURATION
    });
    
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

      // QUERY OTIMIZADA: já filtra por location_id quando necessário
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
          pix_code,
          rentals!payments_rental_id_fkey (
            id,
            rent_value,
            garage_value,
            has_garage,
            rent_due_day,
            start_date,
            end_date,
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
        .eq("reference_month", String(filterMonth).padStart(2, '0'))
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
      const formattedPayments = (paymentsData || []).map((payment: any) => {
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
          pixCode: payment.pix_code,
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
            totalInstallments: 1
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
      }) as Payment[];

      // Buscar configurações, isenções e permissões
      const exemptionsQuery: any = supabase.from("admin_fee_exempt_locations").select("location_id");
      const configQuery: any = supabase.from("configs").select("*").maybeSingle();
      
      // ✅ CORREÇÃO: Incluir location_id na query de despesas
      const expensesQuery: any = supabase
        .from("location_expenses")
        .select("id, amount, location_id, description, reference_month, reference_year")
        .eq("reference_month", filterMonth)
        .eq("reference_year", filterYear);

      const exemptionsResult: any = await exemptionsQuery;
      const configResult: any = await configQuery;
      const expensesResult: any = await expensesQuery;

      // 🔥 FILTRO DE LOCALIZAÇÃO: Buscar permissões para usuários financeiros
      let allowedLocations: string[] = [];
      if (user?.role === "financial") {
        const permResult: any = await supabase
          .from("user_location_permissions")
          .select("location_id")
          .eq("user_id", user.id);
        allowedLocations = permResult.data?.map((p: any) => p.location_id) || [];
      }

      const exemptIds: string[] = exemptionsResult.data?.map((e: any) => e.location_id) || [];
      const configData: any = configResult.data;
      
      // ✅ CORREÇÃO: Armazenar array completo de despesas com location_id
      const expensesData = expensesResult.data || [];
      
      // Processar despesas com nome da localização
      const expensesWithLocationName = expensesData.map((expense: any) => ({
        id: expense.id,
        location_name: locationsMapTemp.get(expense.location_id) || "N/A",
        amount: expense.amount || 0,
        description: expense.description || "Sem descrição",
        reference_month: expense.reference_month,
        reference_year: expense.reference_year,
        location_id: expense.location_id
      }));

      setExemptLocationIds(exemptIds);
      setConfig(configData);
      setLocationExpensesData(expensesData);
      setExpensesDetails(expensesWithLocationName);
      setAllowedLocationIds(allowedLocations);
      setLocationsMap(locationsMapTemp);

      // 🔥 APLICAR FILTRO DE LOCALIZAÇÃO NOS PAGAMENTOS
      let filteredPayments = formattedPayments;
      if (user?.role === "financial" && allowedLocations.length > 0) {
        filteredPayments = formattedPayments.filter(payment => {
          const locationId = payment.property?.locationId;
          return locationId && allowedLocations.includes(locationId);
        });
        
        console.log("🔍 [Financial] Filtro de localização aplicado:", {
          totalPayments: formattedPayments.length,
          filteredPayments: filteredPayments.length,
          allowedLocations: allowedLocations
        });
      }

      console.log("✅ [Financial] Processamento concluído:", {
        totalPayments: filteredPayments.length,
        totalLocations: locationsMapTemp.size,
        exemptLocations: exemptIds.length,
        locationExpenses: expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)
      });

      // Atualizar cache com dados já filtrados
      financialCache = {
        data: {
          payments: filteredPayments,
          locations: locationsMapTemp,
          exemptLocationIds: exemptIds,
          config: configData,
        },
        key: cacheKey,
        timestamp: now,
      };

      setPayments(filteredPayments);

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

  // Filtrar pagamentos por localização selecionada
  const locationFilteredPayments = useMemo(() => {
    if (selectedLocationId === "all") {
      return payments;
    }
    return payments.filter(payment => payment.property?.locationId === selectedLocationId);
  }, [payments, selectedLocationId]);

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
      pixCode: payment.pixCode || "",
      paymentTime: payment.paymentTime || "",
    };
  }, []);

  // Memoizar cálculo de número de parcela
  const calculatePaymentNumber = useCallback((payment: Payment, rental: Rental | undefined) => {
    const rentalData = rental || payment.rental;
    
    // PRIORIDADE 1: Usar valores do banco se existirem
    if (payment.installment && payment.totalInstallments) {
      return `${payment.installment}/${payment.totalInstallments}`;
    }
    
    // PRIORIDADE 2: Calcular apenas se não existir no banco
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

  // Função para calcular valor esperado total (com juros/multas do breakdown)
  const getExpectedAmount = useCallback((payment: Payment): number => {
    // Prioridade 1: Tentar usar breakdown se existir
    if (payment.breakdown && typeof payment.breakdown === 'object') {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;

        // Se for array direto, somar os valores
        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
          const total = breakdownData.reduce((sum: number, item: any) => {
            const itemValue = Number(item.value || item.amount || 0);
            return sum + itemValue;
          }, 0);
          
          if (total > 0) return total;
        }
        
        // Se for objeto com items
        if (breakdownData.items && Array.isArray(breakdownData.items)) {
          const total = breakdownData.items.reduce((sum: number, item: any) => {
            const itemValue = Number(item.value || item.amount || 0);
            return sum + itemValue;
          }, 0);
          
          if (total > 0) return total;
        }
      } catch (error) {
        console.error("Erro ao processar breakdown:", error);
      }
    }
    
    // Prioridade 2: Calcular manualmente com lateFee e interest se disponíveis
    const base = payment.expectedAmount || 0;
    const lateFee = Number(payment.lateFee || 0);
    const interest = Number(payment.interest || 0);
    const discount = Number(payment.discount || 0);
    
    const calculated = base + lateFee + interest - discount;
    
    if (calculated !== base && calculated > 0) {
      return calculated;
    }
    
    // Fallback final: usar expected_amount base
    return base;
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

  const handleExpenseSort = useCallback((field: ExpenseSortField) => {
    if (expenseSortField === field) {
      if (expenseSortDirection === "asc") {
        setExpenseSortDirection("desc");
      } else if (expenseSortDirection === "desc") {
        setExpenseSortDirection(null);
        setExpenseSortField(null);
      } else {
        setExpenseSortDirection("asc");
      }
    } else {
      setExpenseSortField(field);
      setExpenseSortDirection("asc");
    }
  }, [expenseSortField, expenseSortDirection]);

  const ExpenseSortIcon = ({ field }: { field: ExpenseSortField }) => {
    if (expenseSortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    if (expenseSortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };

  // Memoizar pagamentos ordenados COM FILTRO DE LOCALIZAÇÃO
  const getSortedPayments = useMemo(() => {
    const paymentsToSort = locationFilteredPayments;
    
    if (!sortField || !sortDirection) return paymentsToSort;

    return [...paymentsToSort].sort((a, b) => {
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
          aValue = new Date(a.dueDate + "T12:00:00").getTime();
          bValue = new Date(b.dueDate + "T12:00:00").getTime();
          break;
        case "paymentDate":
          aValue = a.paymentDate ? new Date(a.paymentDate + "T12:00:00").getTime() : 0;
          bValue = b.paymentDate ? new Date(b.paymentDate + "T12:00:00").getTime() : 0;
          break;
        case "expectedAmount":
          aValue = getExpectedAmount(a);
          bValue = getExpectedAmount(b);
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
  }, [locationFilteredPayments, sortField, sortDirection, calculatePaymentNumber, getPaymentDetails]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handlePrintExpenses = useCallback(async () => {
    if (!expensesContentRef.current) return;

    try {
      // Import dinâmico apenas no client-side
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `contas-do-mes-${format(new Date(filterYear, filterMonth - 1), "MMM-yyyy", { locale: ptBR })}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      html2pdf().set(opt).from(expensesContentRef.current).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  }, [filterYear, filterMonth]);
  
  const handleEditPixCode = async (paymentId: string, pixCode: string) => {
    try {
      // ✅ CORREÇÃO: Salvar na tabela payments, não rentals
      const { error } = await supabase
        .from("payments")
        .update({ pix_code: pixCode })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Código PIX atualizado com sucesso!",
      });

      // ✅ Atualizar estado local corretamente
      setPayments(prevPayments =>
        prevPayments.map(p => {
          if (p.id === paymentId) {
            return {
              ...p,
              pixCode: pixCode
            };
          }
          return p;
        })
      );
      
      setEditingPixCode(null);
      
      // Invalidar cache para garantir dados atualizados
      financialCache = { data: null, key: "", timestamp: 0 };
      
    } catch (error) {
      console.error("Erro ao atualizar código PIX:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o código PIX.",
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
        "Valor Esperado": getExpectedAmount(payment),
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
  }, [getSortedPayments, filterMonth, filterYear, getPaymentDetails, calculatePaymentNumber, getExpectedAmount, toast]);

  // KPI Calculations (MEMOIZADOS COM FILTRO DE LOCALIZAÇÃO!)
  const kpiCalculations = useMemo(() => {
    const paymentsToCalculate = locationFilteredPayments;
    
    // ✅ CORREÇÃO: Filtrar despesas de localização pelo filtro selecionado
    const filteredExpenses = selectedLocationId === "all" 
      ? locationExpensesData 
      : locationExpensesData.filter(expense => expense.location_id === selectedLocationId);
    
    const totalLocationExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const totalExpected = paymentsToCalculate.reduce((sum, p) => {
      const expectedValue = getExpectedAmount(p);
      return sum + expectedValue;
    }, 0);
    
    const totalReceived = paymentsToCalculate
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    const feePercentage = config?.admin_fee_percentage ?? 5;
    const feeRate = feePercentage / 100;
    
    const adminFee = paymentsToCalculate
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => {
        const property = p.property;
        const isExempt = property && exemptLocationIds.includes(property.locationId);
        const fee = isExempt ? 0 : ((p.paidAmount || 0) * feeRate);
        return sum + fee;
      }, 0);

    const mgmtPercentage = config?.management_fee_percentage ?? 3;
    const mgmtRate = mgmtPercentage / 100;
    
    const managementFee = paymentsToCalculate
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => {
        const fee = (p.paidAmount || 0) * mgmtRate;
        return sum + fee;
      }, 0);

    const netRevenue = totalReceived - adminFee - managementFee - totalLocationExpenses;
    
    const totalPaid = paymentsToCalculate
      .filter(p => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    return {
      totalExpected,
      totalReceived,
      adminFee,
      managementFee,
      netRevenue,
      totalPaid,
      locationExpenses: totalLocationExpenses, // ✅ Retornar as despesas filtradas
    };
  }, [locationFilteredPayments, config, exemptLocationIds, locationExpensesData, selectedLocationId, getExpectedAmount]);

  const filteredPayments = getSortedPayments;

  // Preparar lista de locais para o Select
  const locationOptions = useMemo(() => {
    const options = Array.from(locationsMap.entries()).map(([id, name]) => ({
      id,
      name
    }));
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [locationsMap]);
  
  // Filtrar despesas detalhadas por localização
  const filteredExpensesDetails = useMemo(() => {
    let filtered = selectedLocationId === "all" 
      ? expensesDetails 
      : expensesDetails.filter(expense => 
          locationsMap.get(expense.location_id) === locationsMap.get(selectedLocationId)
        );
    
    // Aplicar ordenação
    if (expenseSortField && expenseSortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (expenseSortField) {
          case "location_name":
            aValue = a.location_name.toLowerCase();
            bValue = b.location_name.toLowerCase();
            break;
          case "description":
            aValue = (a.description || "").toLowerCase();
            bValue = (b.description || "").toLowerCase();
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return expenseSortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return expenseSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [expensesDetails, selectedLocationId, locationsMap, expenseSortField, expenseSortDirection]);

  if (!mounted) return null;

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
        <ScrollReveal>
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Acompanhe suas receitas, despesas e fluxo de caixa
            </p>
          </div>
        </ScrollReveal>

        <Tabs defaultValue="rentals" className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 gap-1 sm:gap-2 h-auto p-1">
              <TabsTrigger value="rentals" className="text-xs sm:text-sm whitespace-normal h-auto py-2 px-3">
                Locações
              </TabsTrigger>
              {(isAdmin || user?.role === "broker") && (
                <TabsTrigger value="deposits" className="text-xs sm:text-sm whitespace-normal h-auto py-2 px-3">
                  Cauções
                </TabsTrigger>
              )}
            </TabsList>

            <div className="w-full sm:w-auto">
              <PeriodSelector 
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear}
                onMonthChange={(m) => setSelectedMonth(m === 'all' ? new Date().getMonth() + 1 : Number(m))}
                onYearChange={(y) => setSelectedYear(y === 'all' ? new Date().getFullYear() : Number(y))}
                onFilterMonthChange={(m) => setFilterMonth(m === 'all' ? new Date().getMonth() + 1 : Number(m))}
                onFilterYearChange={(y) => setFilterYear(y === 'all' ? new Date().getFullYear() : Number(y))}
                showAllOption={false}
              />
            </div>
          </div>

          <TabsContent value="rentals" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Cards de Métricas - Locações */}
            <div className={`grid gap-3 sm:gap-4 grid-cols-1 ${isFinancial ? 'sm:grid-cols-2 lg:grid-cols-4' : user?.role === "broker" ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-5'}`}>
              {isFinancial ? (
                <>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            Receita Bruta Esperada
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.totalExpected)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total de aluguéis esperados
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            Receita Bruta
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.totalReceived)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total recebido
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                            Taxas e Contas
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-orange-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.adminFee + kpiCalculations.managementFee + kpiCalculations.locationExpenses)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Taxas e contas a pagar
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                            Receita Líquida
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-purple-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.netRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Após taxas e contas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            Receita Bruta
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.totalReceived)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total recebido
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Percent className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                            Taxa de Administração
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.adminFee)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {config ? config.admin_fee_percentage : 5}% sobre receita
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {user?.role !== "broker" && (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              Taxa de Gerenciamento
                            </p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(kpiCalculations.managementFee)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {config ? config.management_fee_percentage : 3}% sobre receita
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowExpensesDialog(true)}>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                            Contas do Mês
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-orange-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(user?.role === "broker" ? kpiCalculations.locationExpenses + kpiCalculations.managementFee : kpiCalculations.locationExpenses)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.role === "broker" 
                              ? "Despesas + taxa gerenciamento"
                              : "Despesas dos locais"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                            Receita Líquida
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-purple-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.netRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Após taxas e contas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Tabela de Locações */}
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 px-2 sm:px-0">
                  <div className="w-full sm:w-auto">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                      <span className="line-clamp-2 sm:line-clamp-1">
                        Detalhamento de Locações - {format(
                          new Date(filterYear, filterMonth - 1),
                          "MMMM yyyy",
                          { locale: ptBR }
                        )}
                      </span>
                    </h2>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    {/* Select de Locais */}
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger className="w-full sm:w-[200px] h-8 sm:h-9 text-xs sm:text-sm">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <SelectValue placeholder="Todos os Locais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Locais</SelectItem>
                        {locationOptions.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                      <span className="sm:hidden">Print</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Exportar Excel</span>
                      <span className="sm:hidden">Excel</span>
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                    Nenhum pagamento encontrado para o período selecionado
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <Table className="min-w-[1200px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("paymentNumber")}>
                                <div className="flex items-center">
                                  Parcela
                                  <SortIcon field="paymentNumber" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("local")}>
                                <div className="flex items-center">
                                  Local
                                  <SortIcon field="local" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("complement")}>
                                <div className="flex items-center">
                                  Complemento
                                  <SortIcon field="complement" />
                                </div>
                              </TableHead>
                              <TableHead className="text-xs sm:text-sm">Inquilino</TableHead>
                              <TableHead className="text-xs sm:text-sm">Ano</TableHead>
                              <TableHead className="text-xs sm:text-sm">Mês</TableHead>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("status")}>
                                <div className="flex items-center">
                                  Status
                                  <SortIcon field="status" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("dueDate")}>
                                <div className="flex items-center">
                                  Data Vencimento
                                  <SortIcon field="dueDate" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("paymentDate")}>
                                <div className="flex items-center">
                                  Data Recebida
                                  <SortIcon field="paymentDate" />
                                </div>
                              </TableHead>
                              <TableHead className="text-xs sm:text-sm">Horário Recebido</TableHead>
                              <TableHead className="cursor-pointer text-right text-xs sm:text-sm" onClick={() => handleSort("expectedAmount")}>
                                <div className="flex items-center justify-end">
                                  Valor Esperado
                                  <SortIcon field="expectedAmount" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-right text-xs sm:text-sm" onClick={() => handleSort("paidAmount")}>
                                <div className="flex items-center justify-end">
                                  Valor Pago
                                  <SortIcon field="paidAmount" />
                                </div>
                              </TableHead>
                              <TableHead className="text-xs sm:text-sm">Código PIX</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPayments.map((payment) => {
                              const details = getPaymentDetails(payment);
                              const monthName = format(new Date(payment.referenceYear || 0, (payment.referenceMonth || 1) - 1), "MMMM", { locale: ptBR });

                              return (
                                <TableRow key={payment.id}>
                                  <TableCell className="text-xs sm:text-sm">
                                    {calculatePaymentNumber(payment, details.rental)}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    <div className="max-w-[200px]">
                                      <div className="font-medium truncate">
                                        {details.local}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    <div className="text-muted-foreground truncate">
                                      {details.complemento}
                                    </div>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    {details.tenantName}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">{payment.referenceYear}</TableCell>
                                  <TableCell className="capitalize text-xs sm:text-sm">{monthName}</TableCell>
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
                                      className="text-xs"
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
                                  <TableCell className="text-xs sm:text-sm">
                                    {format(new Date(payment.dueDate + "T12:00:00"), "dd/MM/yyyy")}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    {payment.paymentDate
                                      ? format(new Date(payment.paymentDate + "T12:00:00"), "dd/MM/yyyy")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    <span className="font-mono">
                                      {details.paymentTime || "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(getExpectedAmount(payment))}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-600 text-xs sm:text-sm">
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(payment.paidAmount || 0)}
                                  </TableCell>
                                  <TableCell>
                                    {editingPixCode?.id === payment.id ? (
                                      <div className="flex items-center gap-2 sm:gap-3">
                                        <Input
                                          value={editingPixCode.value}
                                          onChange={(e) => {
                                            setEditingPixCode({
                                              ...editingPixCode,
                                              value: e.target.value
                                            });
                                          }}
                                          placeholder="Digite o código PIX"
                                          className="h-8 sm:h-9 text-xs sm:text-sm border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-w-[180px] sm:min-w-[250px] bg-white"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleEditPixCode(payment.id, editingPixCode.value)}
                                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-green-100 transition-colors"
                                          title="Salvar código PIX"
                                        >
                                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingPixCode(null)}
                                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-red-100 transition-colors"
                                          title="Cancelar edição"
                                        >
                                          <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-slate-600 max-w-xs truncate text-xs sm:text-sm font-mono">
                                          {details.pixCode || "-"}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingPixCode({
                                              id: payment.id,
                                              value: details.pixCode || ""
                                            });
                                          }}
                                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-slate-100 transition-colors"
                                          title="Editar código PIX"
                                        >
                                          <Edit2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Linha de Totais */}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell colSpan={10} className="text-right text-xs sm:text-sm">
                                Totais:
                              </TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(kpiCalculations.totalExpected)}
                              </TableCell>
                              <TableCell className="text-right text-green-600 text-xs sm:text-sm">
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
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(isAdmin || user?.role === "broker") && (
            <TabsContent value="deposits" className="space-y-6 mt-6">
              <div className="overflow-x-auto w-full">
                <DepositInstallmentsTable 
                  userRole={user?.role || "user"}
                  allowedLocationIds={allowedLocationIds}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        {/* Dialog de Detalhamento de Contas do Mês */}
        <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    Detalhamento das Contas do Mês
                  </DialogTitle>
                  <DialogDescription>
                    {format(new Date(filterYear, filterMonth - 1), "MMMM yyyy", { locale: ptBR })}
                    {selectedLocationId !== "all" && ` - ${locationsMap.get(selectedLocationId)}`}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintExpenses}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </DialogHeader>
            
            <div ref={expensesContentRef} className="space-y-4">
              {/* Tabela de Despesas */}
              {filteredExpensesDetails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa cadastrada para este período
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleExpenseSort("location_name")}>
                          <div className="flex items-center">
                            Local
                            <ExpenseSortIcon field="location_name" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleExpenseSort("description")}>
                          <div className="flex items-center">
                            Descrição
                            <ExpenseSortIcon field="description" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleExpenseSort("amount")}>
                          <div className="flex items-center justify-end">
                            Valor
                            <ExpenseSortIcon field="amount" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpensesDetails.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            {expense.location_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Linha de Total */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2} className="text-right">
                          Total de Despesas:
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(kpiCalculations.locationExpenses)}
                        </TableCell>
                      </TableRow>
                      
                      {user?.role === "broker" && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={2} className="text-right">
                            Taxa de Gerenciamento ({config?.management_fee_percentage || 3}%):
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.managementFee)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {user?.role === "broker" && (
                        <TableRow className="bg-muted font-bold">
                          <TableCell colSpan={2} className="text-right">
                            Total Geral:
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(kpiCalculations.locationExpenses + kpiCalculations.managementFee)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}