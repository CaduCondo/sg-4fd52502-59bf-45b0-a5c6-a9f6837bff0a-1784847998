import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Payment, Property, Rental } from "@/types";

export function useDashboardData(month: number, year: number, userId: string | undefined, userRole: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [locationExpenses, setLocationExpenses] = useState<number>(0);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

  // Memoizar as funções de mapeamento para evitar recriação
  const mapPaymentFromDB = useCallback((data: any): Payment => {
    return {
      ...data,
      rentalId: data.rental_id,
      dueDate: data.due_date,
      expectedAmount: data.expected_amount,
      paidAmount: data.paid_amount,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      referenceMonth: data.reference_month ? parseInt(data.reference_month) : undefined,
      referenceYear: data.reference_year ? parseInt(data.reference_year) : undefined,
      receiptUrl: data.receipt_url,
      penaltyAmount: data.penalty_amount,
      interestAmount: data.interest_amount,
      discountAmount: data.discount_amount,
      paymentCode: data.payment_code,
      lateFee: data.late_fee,
      interest: data.interest,
      paymentLocation: data.payment_location,
    };
  }, []);

  const mapPropertyFromDB = useCallback((data: any): Property => {
    return {
      id: data.id,
      address: data.address,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      value: Number(data.value),
      monthlyRent: Number(data.monthly_rent),
      description: data.description,
      area: Number(data.area),
      bathrooms: Number(data.bathrooms),
      hasGarage: data.has_garage,
      acceptsPets: data.accepts_pets,
      hasFurniture: data.has_furniture,
      hasPartnerBroker: data.has_partner_broker,
      status: data.status,
      locationId: data.location_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      images: data.photos || [],
    };
  }, []);

  const mapRentalFromDB = useCallback((data: any): Rental => {
    return {
      id: data.id,
      propertyId: data.property_id,
      tenantId: data.tenant_id,
      startDate: data.start_date,
      endDate: data.end_date,
      value: Number(data.value || data.monthly_rent),
      paymentDay: Number(data.payment_day),
      status: data.status,
      isActive: data.is_active,
      depositAmount: Number(data.deposit),
      depositInstallments: data.deposit_installments,
      depositInstallment1: data.deposit_installment_1,
      depositInstallment2: data.deposit_installment_2,
      depositInstallment3: data.deposit_installment_3,
      hasGarage: data.has_garage,
      garageValue: data.garage_value,
      hasPartnerBroker: data.has_partner_broker,
      contractAttachments: data.contract_attachments,
      attachments: data.attachments,
      autoRenew: false
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (!userId) {
          console.log("⚠️ Dashboard: userId não fornecido, aguardando...");
          return;
        }

        setLoading(true);
        
        console.log("🔄 Dashboard: Carregando dados...", { month, year, userId, userRole });

        // 1. Buscar locais isentos de taxa de administração (GLOBAL)
        const { data: exemptLocations, error: exemptError } = await supabase
          .from("admin_fee_exempt_locations")
          .select("location_id");

        if (exemptError) {
          console.error("❌ Erro ao buscar locais isentos:", exemptError);
        } else {
          const exemptIds = exemptLocations?.map(e => e.location_id) || [];
          console.log("🔐 Locais isentos de taxa de administração:", exemptIds);
          if (isMounted) {
            setExemptLocationIds(exemptIds);
          }
        }

        // 2. Buscar locais permitidos para usuários Financial
        let allowedLocations: string[] = [];
        
        if (userRole === "financial") {
          const { data: permissions, error: permError } = await supabase
            .from("user_location_permissions")
            .select("location_id")
            .eq("user_id", userId);

          if (permError) {
            console.error("❌ Erro ao buscar permissões:", permError);
          } else {
            allowedLocations = permissions?.map(p => p.location_id) || [];
            console.log("🔐 Locais permitidos para usuário Financial:", allowedLocations);
            
            if (isMounted) {
              setAllowedLocationIds(allowedLocations);
            }
          }
        } else {
          console.log("👑 Usuário Admin/Broker: acesso a todos os locais");
          if (isMounted) {
            setAllowedLocationIds([]);
          }
        }

        // 3. Buscar imóveis (filtrados por local se Financial)
        let propertiesQuery = supabase.from("properties").select("*");
        
        if (userRole === "financial" && allowedLocations.length > 0) {
          propertiesQuery = propertiesQuery.in("location_id", allowedLocations);
          console.log("🏢 Filtrando properties por locais:", allowedLocations);
        }

        const { data: propertiesData, error: propertiesError } = await propertiesQuery;

        if (propertiesError) {
          console.error("❌ Erro ao buscar imóveis:", propertiesError);
        } else {
          console.log(`✅ Properties carregados: ${propertiesData?.length || 0}`);
        }

        // 4. Buscar TODAS as locações (ativas e inativas) para contar inquilinos corretamente
        const allowedPropertyIds = (propertiesData || []).map((p: any) => p.id);
        
        let rentalsQuery = supabase
          .from("rentals")
          .select("*");

        if (userRole === "financial" && allowedPropertyIds.length > 0) {
          rentalsQuery = rentalsQuery.in("property_id", allowedPropertyIds);
          console.log(`🏠 Filtrando rentals por ${allowedPropertyIds.length} properties permitidos`);
        } else if (userRole === "financial" && allowedPropertyIds.length === 0) {
          console.log("⚠️ Nenhum property permitido, sem rentals");
          if (isMounted) {
            setPayments([]);
            setProperties([]);
            setRentals([]);
            setLoading(false);
          }
          return;
        }

        const { data: rentalsData, error: rentalsError } = await rentalsQuery;

        if (rentalsError) {
          console.error("❌ Erro ao buscar locações:", rentalsError);
        } else {
          console.log(`✅ Rentals carregados (TODOS): ${rentalsData?.length || 0}`);
          const activeRentals = rentalsData?.filter(r => r.is_active).length || 0;
          console.log(`   - Ativos: ${activeRentals}`);
          console.log(`   - Inativos: ${(rentalsData?.length || 0) - activeRentals}`);
          
          // Contar tenant_ids únicos para total de inquilinos
          const uniqueTenantIds = new Set(rentalsData?.map((r: any) => r.tenant_id) || []);
          console.log(`👥 Total de inquilinos únicos: ${uniqueTenantIds.size}`);
        }

        // 5. Buscar pagamentos do período (filtrados pelos rentals ATIVOS permitidos)
        const activeRentalIds = (rentalsData || [])
          .filter((r: any) => r.is_active)
          .map((r: any) => r.id);
        
        let paymentsQuery = supabase
          .from("payments")
          .select("*")
          .eq("reference_month", month.toString())
          .eq("reference_year", year.toString());

        if (userRole === "financial" && activeRentalIds.length > 0) {
          paymentsQuery = paymentsQuery.in("rental_id", activeRentalIds);
          console.log(`💰 Filtrando payments por ${activeRentalIds.length} rentals ativos permitidos`);
        } else if (userRole === "financial" && activeRentalIds.length === 0) {
          console.log("⚠️ Nenhum rental ativo permitido, sem payments");
          if (isMounted) {
            setPayments([]);
            setProperties((propertiesData || []).map(mapPropertyFromDB));
            setRentals((rentalsData || []).map(mapRentalFromDB));
            setLoading(false);
          }
          return;
        }

        const { data: paymentsData, error: paymentsError } = await paymentsQuery;

        if (paymentsError) {
          console.error("❌ Erro ao buscar pagamentos:", paymentsError);
        } else {
          console.log(`✅ Payments carregados: ${paymentsData?.length || 0}`);
        }

        // 6. Buscar despesas de locais para o período selecionado (CONTAS A PAGAR)
        let expensesQuery = supabase
          .from("location_expenses")
          .select("amount, status, location_id")
          .eq("reference_month", month)
          .eq("reference_year", year);
        
        // Filtrar despesas por locais permitidos se for usuário financeiro
        if (userRole === "financial" && allowedLocations.length > 0) {
          expensesQuery = expensesQuery.in("location_id", allowedLocations);
          console.log("💸 Filtrando location_expenses por locais permitidos");
        }
        
        const { data: expensesData, error: expensesError } = await expensesQuery;
        
        if (expensesError) {
          console.error("❌ Erro ao buscar despesas de locais:", expensesError);
        } else {
          const totalExpenses = expensesData
            ? expensesData.reduce((sum, e) => sum + (e.amount || 0), 0)
            : 0;
          
          console.log("💰 Location Expenses carregadas:", {
            month,
            year,
            userRole,
            allowedLocations: userRole === "financial" ? allowedLocations : "Todos",
            totalExpenses,
            count: expensesData?.length || 0
          });
          
          if (isMounted) {
            setLocationExpenses(totalExpenses);
          }
        }

        if (isMounted) {
          setPayments((paymentsData || []).map(mapPaymentFromDB));
          setProperties((propertiesData || []).map(mapPropertyFromDB));
          setRentals((rentalsData || []).map(mapRentalFromDB)); // Salva TODAS as locações
          console.log("✅ Dashboard: Dados carregados com sucesso");
          console.log("📊 Resumo:", {
            properties: propertiesData?.length || 0,
            rentals: rentalsData?.length || 0,
            payments: paymentsData?.length || 0,
            allowedLocations: userRole === "financial" ? allowedLocations : "Todos"
          });
        }
      } catch (error) {
        console.error("❌ Erro ao carregar dados do dashboard:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [month, year, userId, userRole, mapPaymentFromDB, mapPropertyFromDB, mapRentalFromDB]);

  return { loading, payments, properties, rentals, allowedLocationIds, locationExpenses, exemptLocationIds };
}