import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3x3, List, Search } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { Payment, Rental, Property, Tenant } from "@/types";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { hasPermission } from "@/lib/permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function Payments() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const mountedRef = useRef(false);
  
  // Permissões baseadas no sistema centralizado
  const permissions = useMemo(() => ({
    canDeletePayment: hasPermission(user?.role, "canDeletePayment"),
    canViewReceipt: true, // Todos podem ver recibos de pagamentos pagos
  }), [user?.role]);

  // Estados consolidados
  const [uiState, setUiState] = useState({
    viewMode: "grid" as "grid" | "list",
    searchQuery: "",
    selectedPaymentId: null as string | null,
    paymentToCancel: null as string | null,
    showReceiptDialog: false,
    selectedPayment: null as Payment | null,
  });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce do search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(uiState.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [uiState.searchQuery]);

  // ✅ Filtros padrão para mês/ano ATUAL
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string | number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<string | number>(currentDate.getFullYear());
  const firstLoadRef = useRef(true);

  const { 
    payments, 
    rentals, 
    properties, 
    tenants, 
    loading, 
    handleCancelPayment: cancelPayment,
    loadPayments
  } = usePayments();
  
  // 🔍 LOG: Verificar quantos payments chegam do hook em CADA RENDER
  console.log(`🎨 [payments.tsx RENDER] Payments recebidos do hook:`, {
    paymentsLength: payments.length,
    rentalsLength: rentals.length,
    propertiesLength: properties.length,
    tenantsLength: tenants.length,
    loading,
    selectedMonth,
    selectedYear
  });
  
  // 🔍 LOG: Rastrear MUDANÇAS no estado payments
  useEffect(() => {
    console.log(`🔔 [payments.tsx] Estado 'payments' MUDOU:`, {
      length: payments.length,
      timestamp: new Date().toISOString()
    });
  }, [payments]);

  // Helpers memoizados
  const getPropertyForPayment = useCallback((payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return null;
    return properties.find(p => p.id === rental.propertyId) || null;
  }, [rentals, properties]);

  const getTenantForPayment = useCallback((payment: Payment) => {
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (!rental) return null;
    return tenants.find(t => t.id === rental.tenantId) || null;
  }, [rentals, tenants]);

  const getPaymentInstallment = useCallback((payment: Payment) => {
    // Todos os pagamentos devem ter installment e totalInstallments definidos
    // Formato sempre: "X/Y" mesmo para parcelas proporcionais
    if (!payment.installment || !payment.totalInstallments) {
      console.warn("Payment sem installment ou totalInstallments:", payment);
      return "N/A";
    }
    
    return `${payment.installment}/${payment.totalInstallments}`;
  }, []);

  const getExpectedAmount = useCallback((payment: Payment) => {
    // 🔥 CORREÇÃO: Calcular valor total a partir do breakdown quando ele existir
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;
        
        // Se o breakdown for um array, somar todos os valores PRESERVANDO SINAIS NEGATIVOS
        if (Array.isArray(breakdownData) && breakdownData.length > 0) {
          const breakdownTotal = breakdownData.reduce((sum: number, item: any) => {
            return sum + (item.value || item.amount || 0);
          }, 0);
          
          // Adicionar multa e juros ao total do breakdown (podem ser removidos se negativos)
          return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
        }
        
        // Se o breakdown for um objeto, processar as chaves
        if (typeof breakdownData === 'object' && !Array.isArray(breakdownData)) {
          let breakdownTotal = 0;
          Object.values(breakdownData).forEach((value: any) => {
            if (value && typeof value === 'object') {
              breakdownTotal += (value.value || value.amount || 0);
            }
          });
          
          if (breakdownTotal > 0 || breakdownTotal < 0) {
            return breakdownTotal + (payment.lateFee || 0) + (payment.interest || 0);
          }
        }
      } catch (error) {
        console.error("Erro ao processar breakdown:", error);
      }
    }
    
    // Fallback: usar expected_amount base + multa + juros
    return payment.expectedAmount + (payment.lateFee || 0) + (payment.interest || 0);
  }, []);

  const getMonthName = useCallback((month: number) => {
    return MONTH_NAMES[month - 1] || "";
  }, []);

  // Carregar pagamentos quando os filtros mudarem (incluindo montagem inicial)
  useEffect(() => {
    console.log(`🔄 [payments.tsx useEffect] Chamando loadPayments:`, {
      selectedMonth: selectedMonth.toString(),
      selectedYear: selectedYear.toString(),
      isFirstLoad: firstLoadRef.current,
      timestamp: new Date().toISOString()
    });
    
    loadPayments(selectedMonth.toString(), selectedYear.toString());
    
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
    }
  }, [loadPayments, selectedMonth, selectedYear]); // ✅ loadPayments agora é estável
  
  // 🔥 FORÇA RE-RENDER: Garantir que mudanças no estado payments causem re-render
  useEffect(() => {
    console.log(`🔔 [payments.tsx] FORÇANDO RE-RENDER - payments mudou para ${payments.length} itens`);
  }, [payments]);

  // Handlers otimizados
  const handleMonthChange = useCallback((value: string | number) => {
    setUiState(prev => ({ ...prev, paymentToCancel: null }));
    setSelectedMonth(value);
  }, []);

  const handleYearChange = useCallback((value: string | number) => {
    setUiState(prev => ({ ...prev, paymentToCancel: null }));
    setSelectedYear(value);
  }, []);

  const handlePaymentClick = useCallback((payment: Payment) => {
    if (payment.status === "paid") {
      setUiState(prev => ({
        ...prev,
        selectedPayment: payment,
        showReceiptDialog: true,
      }));
    } else {
      setUiState(prev => ({
        ...prev,
        selectedPaymentId: payment.id,
        showReceiptDialog: true,
      }));
    }
  }, []);

  const confirmCancelPayment = useCallback(async () => {
    if (!uiState.paymentToCancel) return;

    try {
      await cancelPayment(uiState.paymentToCancel);
      
      setUiState(prev => ({ ...prev, paymentToCancel: null }));
      
      await loadPayments("all", "all");
      
      toast({
        title: "Recebimento cancelado",
        description: "O recebimento foi cancelado com sucesso.",
      });
    } catch (error) {
      setUiState(prev => ({ ...prev, paymentToCancel: null }));
    }
  }, [uiState.paymentToCancel, cancelPayment, loadPayments, toast]);

  const handleCancelPayment = useCallback((paymentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!permissions.canDeletePayment) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para cancelar recebimentos",
        variant: "destructive",
      });
      return;
    }

    setUiState(prev => ({ ...prev, paymentToCancel: paymentId }));
  }, [permissions.canDeletePayment, toast]);

  const handleViewReceipt = useCallback((payment: Payment) => {
    setUiState(prev => ({
      ...prev,
      selectedPayment: payment,
      showReceiptDialog: true,
    }));
  }, []);

  const handleManagePaymentSuccess = useCallback(async () => {
    const paymentId = uiState.selectedPaymentId;
    
    setUiState(prev => ({ ...prev, selectedPaymentId: null }));
    
    // 🔥 CORREÇÃO: Recarregar com os filtros corretos
    await loadPayments(selectedMonth.toString(), selectedYear.toString());
    
    // 🔥 NOVA ABORDAGEM: Buscar dados completos DIRETAMENTE do banco COM JOINS
    if (paymentId) {
      try {
        // Buscar o payment atualizado
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", paymentId)
          .single();
          
        if (paymentError) throw paymentError;
        
        if (paymentData) {
          // Buscar a rental associada
          const { data: rentalData, error: rentalError } = await supabase
            .from("rentals")
            .select("*")
            .eq("id", paymentData.rental_id)
            .single();
            
          if (rentalError) throw rentalError;
          
          if (rentalData) {
            // 🔥 CORREÇÃO CRÍTICA: Buscar property COM location via JOIN
            const { data: propertyData, error: propertyError } = await supabase
              .from("properties")
              .select(`
                *,
                locations:location_id (
                  id,
                  name,
                  street,
                  number,
                  complement,
                  neighborhood,
                  city,
                  state,
                  zip_code
                )
              `)
              .eq("id", rentalData.property_id)
              .single();
              
            if (propertyError) throw propertyError;
            
            // Buscar tenant
            const { data: tenantData, error: tenantError } = await supabase
              .from("tenants")
              .select("*")
              .eq("id", rentalData.tenant_id)
              .single();
              
            if (tenantError) throw tenantError;
            
            console.log("✅ DADOS COMPLETOS BUSCADOS DO BANCO:", {
              payment: paymentData,
              rental: rentalData,
              property: propertyData,
              tenant: tenantData
            });
            
            if (propertyData && tenantData) {
              // Extrair dados da location
              const locationData = propertyData.locations as any;
              
              // Converter os dados do banco para o formato do tipo Payment
              const payment: Payment = {
                id: paymentData.id,
                rentalId: paymentData.rental_id,
                referenceMonth: Number(paymentData.reference_month),
                referenceYear: Number(paymentData.reference_year),
                dueDate: paymentData.due_date,
                expectedAmount: paymentData.expected_amount || 0,
                paidAmount: paymentData.paid_amount || 0,
                status: paymentData.status as "pending" | "paid" | "overdue" | "partial",
                paymentDate: paymentData.payment_date || null,
                paymentMethod: paymentData.payment_method || null,
                notes: paymentData.notes || null,
                lateFee: paymentData.late_fee || 0,
                interest: paymentData.interest || 0,
                breakdown: paymentData.breakdown || null,
                attachments: Array.isArray(paymentData.attachments) ? paymentData.attachments : null,
                installment: paymentData.installment || 1,
                totalInstallments: paymentData.total_installments || 24,
                discountAmount: paymentData.discount_amount || 0,
                createdAt: paymentData.created_at,
                updatedAt: paymentData.updated_at,
              };
              
              // Converter rental com valores corretos
              const rental: Rental = {
                id: rentalData.id,
                propertyId: rentalData.property_id,
                tenantId: rentalData.tenant_id,
                startDate: rentalData.start_date,
                start_date: rentalData.start_date,
                endDate: rentalData.end_date,
                monthlyRent: rentalData.rent_value || 0,
                value: rentalData.rent_value || 0,
                deposit: rentalData.security_deposit || rentalData.deposit_value || 0,
                status: (rentalData.status === "active" || rentalData.status === "ended" || rentalData.status === "terminated") 
                  ? rentalData.status 
                  : "active" as "active" | "ended" | "terminated",
                hasGarage: rentalData.has_garage || false,
                has_garage: rentalData.has_garage || false,
                garageValue: rentalData.garage_value || 0,
                installments: rentalData.deposit_installments || 24,
                totalInstallments: rentalData.deposit_installments || 24,
                createdAt: rentalData.created_at,
              };
              
              // 🔥 CORREÇÃO: Converter property COM dados da location
              const property: Property = {
                id: propertyData.id,
                address: locationData?.street || "",
                number: locationData?.number || propertyData.property_identifier || "",
                complement: locationData?.complement || propertyData.complement || "",
                neighborhood: locationData?.neighborhood || "",
                city: locationData?.city || "",
                state: locationData?.state || "",
                zipCode: locationData?.zip_code || "",
                type: (propertyData.type === "apartment" || propertyData.type === "house" || propertyData.type === "commercial")
                  ? propertyData.type
                  : "apartment" as "apartment" | "house" | "commercial",
                bedrooms: propertyData.rooms || 0,
                bathrooms: propertyData.bathrooms || 0,
                area: propertyData.area || 0,
                status: (propertyData.status === "available" || propertyData.status === "occupied" || propertyData.status === "unavailable")
                  ? propertyData.status
                  : "available" as "available" | "occupied" | "unavailable",
                locationId: propertyData.location_id,
                createdAt: propertyData.created_at,
              };
              
              // Converter tenant
              const tenant: Tenant = {
                id: tenantData.id,
                name: tenantData.name,
                email: tenantData.email,
                phone: tenantData.phone,
                cpf: tenantData.cpf || tenantData.document || "",
                rg: tenantData.rg || "",
                createdAt: tenantData.created_at,
                document: tenantData.document || tenantData.cpf || "",
                status: (tenantData.status === "active" || tenantData.status === "inactive" || tenantData.status === "rented" || tenantData.status === "late" || tenantData.status === "debt")
                  ? tenantData.status
                  : "active" as "active" | "inactive" | "rented" | "late" | "debt",
              };
              
              console.log("✅ DADOS CONVERTIDOS PARA O RECIBO:", {
                payment,
                rental,
                property,
                tenant
              });
              
              // Abrir o recibo com os dados completos
              setUiState(prev => ({
                ...prev,
                selectedPayment: payment,
                showReceiptDialog: true,
              }));
              
              toast({
                title: "Sucesso!",
                description: "Recebimento registrado com sucesso.",
              });
              
              return;
            }
          }
        }
        
        // Se chegou aqui, algo deu errado
        toast({
          title: "Aviso",
          description: "Recebimento registrado, mas não foi possível carregar os dados completos. Recarregue a página.",
          variant: "destructive",
        });
        
      } catch (error) {
        console.error("❌ Erro ao buscar dados completos:", error);
        toast({
          title: "Erro",
          description: "Erro ao buscar dados do recebimento.",
          variant: "destructive",
        });
      }
    }
  }, [uiState.selectedPaymentId, loadPayments, selectedMonth, selectedYear, toast]);

  // Pagamentos filtrados por busca e separados por status
  const { pendingPayments, paidPayments } = useMemo(() => {
    console.log(`🔍 [payments.tsx] Separando recebimentos - Total disponível: ${payments.length}`);
    
    const filterBySearch = (p: Payment) => {
      if (!debouncedSearchQuery) return true;
      
      const query = debouncedSearchQuery.toLowerCase();
      const rental = rentals.find(r => r.id === p.rentalId);
      const property = rental ? properties.find(prop => prop.id === rental.propertyId) : null;
      const tenant = rental ? tenants.find(t => t.id === rental.tenantId) : null;

      const propertyAddress = property ? 
        `${property.address} ${property.number} ${property.complement || ''}`.toLowerCase() : "";
      const tenantName = tenant ? tenant.name.toLowerCase() : "";

      return propertyAddress.includes(query) || tenantName.includes(query);
    };

    const pending = payments.filter((p) => {
      const isStatusMatch = p.status === "pending" || p.status === "partial" || p.status === "overdue";
      return isStatusMatch && filterBySearch(p);
    });

    const paid = payments.filter((p) => {
      return p.status === "paid" && filterBySearch(p);
    });
    
    console.log(`📊 [payments.tsx] Resultado da separação:`, {
      pending: pending.length,
      paid: paid.length,
      searchQuery: debouncedSearchQuery || "(vazio)"
    });

    return { pendingPayments: pending, paidPayments: paid };
  }, [payments, debouncedSearchQuery, rentals, properties, tenants]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
            <p className="text-muted-foreground">
              Gerencie os recebimentos de aluguel
            </p>
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={uiState.viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUiState(prev => ({ ...prev, viewMode: "grid" }))}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4 mr-1.5" />
              Grade
            </Button>
            <Button
              variant={uiState.viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUiState(prev => ({ ...prev, viewMode: "list" }))}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
            <PeriodSelector
              selectedMonth={selectedMonth as number}
              selectedYear={selectedYear as number}
              onMonthChange={handleMonthChange}
              onYearChange={handleYearChange}
            />
            
            <div className="relative w-full max-w-sm ml-0 sm:ml-2">
              <Input
                type="search"
                placeholder="Buscar por inquilino, endereço..."
                className="pl-8 w-full"
                value={uiState.searchQuery}
                onChange={(e) => setUiState(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando recebimentos...</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-auto p-1">
              <TabsTrigger value="pending" className="gap-2 text-xs sm:text-base py-2 px-2 sm:px-4">
                <span className="hidden sm:inline">Recebimentos Pendentes</span>
                <span className="sm:hidden">Pendentes</span>
                <Badge variant="destructive" className="text-xs">
                  {pendingPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2 text-xs sm:text-base py-2 px-2 sm:px-4">
                <span className="hidden sm:inline">Recebimentos Pagos</span>
                <span className="sm:hidden">Pagos</span>
                <Badge variant="default" className="bg-green-500 text-xs">
                  {paidPayments.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Aba: Recebimentos Pendentes */}
            <TabsContent value="pending" className="space-y-6">
              {pendingPayments.length > 0 ? (
                <div
                  className={
                    uiState.viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {pendingPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      property={getPropertyForPayment(payment)}
                      tenant={getTenantForPayment(payment)}
                      isPaid={payment.status === "paid"}
                      viewMode={uiState.viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setUiState(prev => ({ ...prev, selectedPaymentId: id }))}
                      onClick={() => setUiState(prev => ({ ...prev, selectedPaymentId: payment.id }))}
                      getMonthName={getMonthName}
                      onCancelPayment={permissions.canDeletePayment ? handleCancelPayment : undefined}
                      onViewReceipt={permissions.canViewReceipt ? (id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      } : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pendente encontrado</p>
                </div>
              )}
            </TabsContent>

            {/* Aba: Recebimentos Pagos */}
            <TabsContent value="paid" className="space-y-6">
              {paidPayments.length > 0 ? (
                <div
                  className={
                    uiState.viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {paidPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      property={getPropertyForPayment(payment)}
                      tenant={getTenantForPayment(payment)}
                      isPaid={payment.status === "paid"}
                      viewMode={uiState.viewMode}
                      installment={getPaymentInstallment(payment)}
                      expectedAmount={getExpectedAmount(payment)}
                      onCardClick={(id) => setUiState(prev => ({ ...prev, selectedPaymentId: id }))}
                      onClick={() => setUiState(prev => ({ ...prev, selectedPaymentId: payment.id }))}
                      getMonthName={getMonthName}
                      onCancelPayment={permissions.canDeletePayment ? handleCancelPayment : undefined}
                      onViewReceipt={permissions.canViewReceipt ? (id, e) => {
                        e?.stopPropagation();
                        handleViewReceipt(payment);
                      } : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum recebimento pago encontrado</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={!!uiState.paymentToCancel} onOpenChange={(open) => !open && setUiState(prev => ({ ...prev, paymentToCancel: null }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Tem certeza que deseja cancelar este recebimento? Esta ação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Alterar o status para "Pendente"</li>
                  <li>Remover a data e hora do pagamento</li>
                  <li>Zerar o valor pago</li>
                  <li>Remover o método de pagamento</li>
                  <li>Remover anexos</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelPayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {uiState.showReceiptDialog && uiState.selectedPayment && (
        <PaymentReceipt
          payment={uiState.selectedPayment}
          rental={rentals.find(r => r.id === uiState.selectedPayment!.rentalId) as any}
          property={getPropertyForPayment(uiState.selectedPayment) as any}
          tenant={getTenantForPayment(uiState.selectedPayment) as any}
          onClose={() => {
            setUiState(prev => ({
              ...prev,
              showReceiptDialog: false,
              selectedPayment: null,
            }));
          }}
        />
      )}

      <Dialog open={!!uiState.selectedPaymentId} onOpenChange={(open) => !open && setUiState(prev => ({ ...prev, selectedPaymentId: null }))}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hidden">Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {uiState.selectedPaymentId && (
            <ManagePaymentForm
              paymentId={uiState.selectedPaymentId}
              onSuccess={handleManagePaymentSuccess}
              onClose={() => setUiState(prev => ({ ...prev, selectedPaymentId: null }))}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}