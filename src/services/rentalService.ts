import { supabase } from "@/integrations/supabase/client";
import type { Rental, Attachment } from "@/types";
import { deleteDepositInstallmentsByRental, createDepositInstallments } from "./depositInstallmentService";
import { getAllLocations } from "./locationService";
import { updatePendingPaymentsOnRentalEdit, createPaymentsForRental } from "./paymentService";

// ✅ CACHE: Cache simples em memória
let rentalsCache: { data: Rental[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// Helper function to invalidate payments cache
function invalidatePaymentsCache() {
  // Payments cache invalidation is handled by paymentService
  console.log("🗑️ [rentalService] Invalidating payments cache");
}

// Helper para mapear dados do banco para o tipo Rental
const mapRentalData = (data: any): Rental => {
  // Extrair parcelas do caução da resposta
  const installments = data.deposit_installments || [];
  const installment1 = installments.find((i: any) => i.installment_number === 1);
  const installment2 = installments.find((i: any) => i.installment_number === 2);
  const installment3 = installments.find((i: any) => i.installment_number === 3);

  // Tratamento seguro para tenants e properties
  const tenantData = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
  const propertyData = Array.isArray(data.properties) ? data.properties[0] : data.properties;

  const rental: Rental = {
    id: data.id,
    propertyId: data.property_id,
    tenantId: data.tenant_id,
    startDate: data.start_date,
    endDate: data.end_date,
    paymentDay: data.rent_due_day,
    value: Number(data.rent_value || 0),
    monthlyRent: Number(data.rent_value || 0),
    depositAmount: data.deposit_value ? Number(data.deposit_value) : 0,
    status: data.status as "active" | "ended" | "terminated",
    isActive: data.is_active,
    attachments: (data.attachments as unknown as (string | Attachment)[]) || [],
    contractAttachments: (data.contract_attachments as unknown as string[]) || [],
    hasGarage: data.has_garage || false,
    garageValue: Number(data.garage_value || 0),
    hasPartnerBroker: data.has_partner_broker || false,
    pixCode: data.pix_code || "",
    
    depositInstallments: data.deposit_installments || 0,

    property: propertyData ? {
      id: propertyData.id,
      locationId: propertyData.location_id,
      location: propertyData.locations?.name || "",
      propertyIdentifier: propertyData.property_identifier,
      complement: propertyData.complement,
      description: propertyData.description || "",
      rooms: propertyData.rooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      area: propertyData.area || 0,
      value: Number(propertyData.value || 0),
      monthlyRent: Number(propertyData.value || 0),
      hasGarage: propertyData.has_garage || false,
      hasFurniture: propertyData.has_furniture || false,
      acceptsPets: propertyData.accepts_pets || false,
      status: (propertyData.status as "available" | "occupied" | "unavailable") || "available",
      images: propertyData.images || [],
      createdAt: propertyData.created_at || new Date().toISOString(),
      address: "",
      features: [],
    } : undefined,
    
    tenant: tenantData ? {
      id: tenantData.id,
      name: tenantData.name,
      phone: tenantData.phone,
      email: "",
      document: tenantData.cpf || "",
      cpf: tenantData.cpf || "",
      status: "rented",
    } : undefined,

    // 1ª Parcela (ou À Vista)
    depositInstallment1: Number(installment1?.amount || 0),
    depositInstallment1DueDate: installment1?.due_date || null,
    depositInstallment1PaymentDate: installment1?.payment_date || null,
    depositInstallment1PixCode: installment1?.pix_code || "",
    
    // Aliases para compatibilidade
    depositPaymentDate: installment1?.payment_date || null,
    depositPixCode: installment1?.pix_code || "",
    depositDueDate: installment1?.due_date || null,
    
    // 2ª Parcela
    depositInstallment2: Number(installment2?.amount || 0),
    depositInstallment2DueDate: installment2?.due_date || null,
    depositInstallment2PaymentDate: installment2?.payment_date || null,
    depositInstallment2PixCode: installment2?.pix_code || "",
    
    // 3ª Parcela
    depositInstallment3: Number(installment3?.amount || 0),
    depositInstallment3DueDate: installment3?.due_date || null,
    depositInstallment3PaymentDate: installment3?.payment_date || null,
    depositInstallment3PixCode: installment3?.pix_code || "",
  };

  return rental;
};

export const rentalService = {
  /**
   * Verifica e atualiza automaticamente locações cujo contrato expirou (end_date passou)
   * Atualiza:
   * - rental.status = 'ended'
   * - property.status = 'available'
   * - tenant.status = 'active'
   */
  async checkAndUpdateExpiredRentals(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log("🔍 [rentalService.checkAndUpdateExpiredRentals] Verificando contratos expirados...");
      
      // Buscar locações ativas cuja end_date já passou
      const { data: expiredRentals, error } = await supabase
        .from("rentals")
        .select("id, tenant_id, property_id, end_date")
        .eq("status", "active")
        .not("end_date", "is", null)
        .lt("end_date", today);

      if (error) {
        console.error("❌ [rentalService.checkAndUpdateExpiredRentals] Erro:", error);
        return;
      }

      if (!expiredRentals || expiredRentals.length === 0) {
        console.log("✅ [rentalService.checkAndUpdateExpiredRentals] Nenhum contrato expirado encontrado");
        return;
      }

      console.log(`📋 [rentalService.checkAndUpdateExpiredRentals] ${expiredRentals.length} contrato(s) expirado(s) encontrado(s)`);

      // Atualizar cada locação expirada
      for (const rental of expiredRentals) {
        console.log(`🔄 [rentalService.checkAndUpdateExpiredRentals] Encerrando contrato ${rental.id}...`);
        
        // 1. Atualizar status da locação para 'ended'
        const { error: rentalError } = await supabase
          .from("rentals")
          .update({ status: "ended" })
          .eq("id", rental.id);

        if (rentalError) {
          console.error(`❌ Erro ao atualizar locação ${rental.id}:`, rentalError);
          continue;
        }

        // 2. Atualizar status do imóvel para 'available'
        if (rental.property_id) {
          const { error: propertyError } = await supabase
            .from("properties")
            .update({ status: "available" })
            .eq("id", rental.property_id);

          if (propertyError) {
            console.error(`❌ Erro ao atualizar imóvel ${rental.property_id}:`, propertyError);
          }
        }

        // 3. Atualizar status do inquilino para 'active'
        if (rental.tenant_id) {
          const { error: tenantError } = await supabase
            .from("tenants")
            .update({ status: "active" })
            .eq("id", rental.tenant_id);

          if (tenantError) {
            console.error(`❌ Erro ao atualizar inquilino ${rental.tenant_id}:`, tenantError);
          }
        }

        console.log(`✅ [rentalService.checkAndUpdateExpiredRentals] Contrato ${rental.id} encerrado com sucesso`);
      }

      // Invalidar cache após atualização
      rentalService.invalidateCache();
      
      console.log("✅ [rentalService.checkAndUpdateExpiredRentals] Verificação concluída");
    } catch (error) {
      console.error("❌ [rentalService.checkAndUpdateExpiredRentals] Erro inesperado:", error);
    }
  },

  async getAll(forceRefresh = false): Promise<Rental[]> {
    const now = Date.now();
    
    // ✅ Verificar e atualizar contratos expirados antes de buscar dados
    await rentalService.checkAndUpdateExpiredRentals();
    
    // ✅ OTIMIZAÇÃO: Usar cache se disponível e não expirado
    if (!forceRefresh && rentalsCache.data && (now - rentalsCache.timestamp) < CACHE_DURATION) {
      console.log("✅ [rentalService.getAll] Usando cache");
      return rentalsCache.data;
    }

    console.log("🔄 [rentalService.getAll] Buscando do banco...");
    
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        rent_value,
        rent_due_day,
        deposit_value,
        status,
        is_active,
        attachments,
        contract_attachments,
        has_garage,
        garage_value,
        has_partner_broker,
        pix_code,
        deposit_installments,
        created_at,
        tenants!rentals_tenant_id_fkey(
          id, name, phone, cpf
        ),
        properties!rentals_property_id_fkey(
          id, location_id, property_identifier, complement, value,
          locations!properties_location_id_fkey(id, name)
        ),
        deposit_installments(
          id, installment_number, amount, pix_code, payment_date, due_date, 
          status, total_installments
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [rentalService.getAll] Erro:", error);
      throw error;
    }

    console.log(`✅ [rentalService.getAll] ${data?.length || 0} locações retornadas`);
    
    const mappedRentals = data?.map((rental: any) => mapRentalData(rental)) || [];
    
    // ✅ OTIMIZAÇÃO: Atualizar cache
    rentalsCache = {
      data: mappedRentals,
      timestamp: now,
    };
    
    return mappedRentals;
  },

  // ✅ OTIMIZAÇÃO: Função para invalidar cache
  invalidateCache() {
    console.log("🗑️ [rentalService] Cache invalidado");
    rentalsCache = { data: null, timestamp: 0 };
  },

  async getById(id: string): Promise<Rental> {
    console.log(`🔄 [rentalService.getById] Buscando locação ${id}...`);
    
    // ✅ Verificar e atualizar contratos expirados antes de buscar dados
    await rentalService.checkAndUpdateExpiredRentals();
    
    const { data, error } = await supabase
      .from("rentals")
      .select(`
        *,
        tenants!rentals_tenant_id_fkey(
          id, name, phone, cpf
        ),
        properties!rentals_property_id_fkey(
          id, location_id, property_identifier, complement, value, description, 
          rooms, bathrooms, area, has_garage, has_furniture, accepts_pets, status, 
          images, created_at,
          locations!properties_location_id_fkey(id, name)
        ),
        deposit_installments(
          id, installment_number, amount, pix_code, payment_date, due_date, 
          status, total_installments
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ [rentalService.getById] Erro:", error);
      throw error;
    }

    console.log("✅ [rentalService.getById] Locação encontrada");
    
    return mapRentalData(data);
  },

  async create(rental: Partial<Rental>): Promise<Rental> {
    const dbData = {
      property_id: rental.propertyId,
      tenant_id: rental.tenantId,
      start_date: rental.startDate,
      end_date: rental.endDate,
      rent_value: rental.monthlyRent || rental.value,
      rent_due_day: rental.paymentDay,
      deposit_value: rental.depositAmount ? rental.depositAmount : null,
      status: rental.status,
      attachments: rental.attachments as any,
      contract_attachments: rental.contractAttachments,
      has_garage: rental.hasGarage,
      garage_value: rental.garageValue,
      has_partner_broker: rental.hasPartnerBroker,
      deposit_installments: rental.depositInstallments,
    };

    const { data, error } = await supabase
      .from("rentals")
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    
    // 🔍 LOG: Confirmar que a locação foi criada com todos os dados
    console.log("✅ [rentalService.create] Locação criada no banco:", {
      id: data.id,
      property_id: data.property_id,
      tenant_id: data.tenant_id,
      start_date: data.start_date,
      end_date: data.end_date,
      rent_value: data.rent_value,
      rent_due_day: data.rent_due_day,
    });

    // ✅ CRÍTICO: Gerar recebimentos automáticos da locação
    if (rental.startDate && rental.endDate && rental.paymentDay) {
      console.log("🔄 [rentalService.create] Gerando recebimentos automáticos...");
      console.log("📋 [rentalService.create] Parâmetros:", {
        rentalId: data.id,
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyRent: rental.monthlyRent || rental.value || 0,
        paymentDay: rental.paymentDay,
        hasGarage: rental.hasGarage,
        garageValue: rental.garageValue
      });
      
      try {
        await createPaymentsForRental({
          rental: { id: data.id } as Rental,
          startDate: new Date(rental.startDate),
          endDate: new Date(rental.endDate),
          monthlyRent: rental.monthlyRent || rental.value || 0,
          paymentDay: rental.paymentDay,
          hasGarage: rental.hasGarage,
          garageValue: rental.garageValue,
        });
        console.log("✅ [rentalService.create] Recebimentos gerados com sucesso!");
      } catch (paymentError) {
        console.error("❌ [rentalService.create] ERRO CRÍTICO ao gerar recebimentos:", paymentError);
        console.error("❌ Stack trace:", (paymentError as any).stack);
        // Re-throw para que o erro seja visível
        throw new Error(`Falha ao criar recebimentos: ${(paymentError as any).message}`);
      }
      
      // 🔥 CRÍTICO: Invalidar cache de payments para forçar reload
      invalidatePaymentsCache();
      console.log("🗑️ [rentalService.create] Cache de payments invalidado");
    } else {
      console.warn("⚠️ [rentalService.create] Recebimentos NÃO foram gerados. Parâmetros faltando:", {
        startDate: rental.startDate,
        endDate: rental.endDate,
        paymentDay: rental.paymentDay
      });
    }

    // ✅ CRÍTICO: Gerar parcelas de caução se houver
    if (rental.depositAmount && rental.depositAmount > 0) {
      console.log("🔄 [rentalService.create] Gerando parcelas de caução...");
      
      try {
        const installmentsToCreate = [];
        const totalInstallments = rental.depositInstallments || 1;
        
        // 1ª Parcela
        installmentsToCreate.push({
          installment_number: 1,
          total_installments: totalInstallments,
          amount: rental.depositInstallment1 || rental.depositAmount,
          due_date: rental.depositInstallment1DueDate || rental.depositDueDate || rental.startDate!,
          payment_date: rental.depositInstallment1PaymentDate || rental.depositPaymentDate || null,
          pix_code: rental.depositInstallment1PixCode || rental.depositPixCode || null,
        });
        
        // 2ª Parcela (se houver)
        if (totalInstallments >= 2 && rental.depositInstallment2 && rental.depositInstallment2 > 0) {
          installmentsToCreate.push({
            installment_number: 2,
            total_installments: totalInstallments,
            amount: rental.depositInstallment2,
            due_date: rental.depositInstallment2DueDate!,
            payment_date: rental.depositInstallment2PaymentDate || null,
            pix_code: rental.depositInstallment2PixCode || null,
          });
        }
        
        // 3ª Parcela (se houver)
        if (totalInstallments === 3 && rental.depositInstallment3 && rental.depositInstallment3 > 0) {
          installmentsToCreate.push({
            installment_number: 3,
            total_installments: totalInstallments,
            amount: rental.depositInstallment3,
            due_date: rental.depositInstallment3DueDate!,
            payment_date: rental.depositInstallment3PaymentDate || null,
            pix_code: rental.depositInstallment3PixCode || null,
          });
        }
        
        console.log("📦 [rentalService.create] Criando parcelas:", installmentsToCreate);
        
        await createDepositInstallments(data.id, installmentsToCreate);
        
        console.log("✅ [rentalService.create] Parcelas de caução criadas com sucesso!");
      } catch (depositError) {
        console.error("❌ [rentalService.create] ERRO ao criar parcelas de caução:", depositError);
        // Não fazer throw aqui para não bloquear a criação da locação
      }
    }

    // Atualizar status do inquilino
    if (rental.tenantId) {
      await supabase
        .from("tenants")
        .update({ status: "rented" })
        .eq("id", rental.tenantId);
    }

    // ✅ OTIMIZAÇÃO: Invalidar cache
    rentalService.invalidateCache();
    invalidatePaymentsCache();

    // Buscar dados completos para retornar
    return rentalService.getById(data.id);
  },

  async update(id: string, rental: Partial<Rental>): Promise<Rental> {
    // 1️⃣ BUSCAR DADOS ANTIGOS PRIMEIRO (para comparação)
    const { data: oldRentalData, error: fetchError } = await supabase
      .from("rentals")
      .select(`
        *,
        deposit_installments(
          id, installment_number, amount, due_date, payment_date, pix_code, 
          status, total_installments
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    
    const oldRental = mapRentalData(oldRentalData);
    
    console.log("🔍 [rentalService.update] Dados antigos:", {
      depositAmount: oldRental.depositAmount,
      depositInstallments: oldRental.depositInstallments,
      monthlyRent: oldRental.monthlyRent,
      paymentDay: oldRental.paymentDay,
      hasGarage: oldRental.hasGarage,
      garageValue: oldRental.garageValue,
      startDate: oldRental.startDate,
      endDate: oldRental.endDate,
    });

    // 2️⃣ PREPARAR DADOS PARA ATUALIZAÇÃO NO BANCO
    const dbData: any = {};
    if (rental.propertyId !== undefined) dbData.property_id = rental.propertyId;
    if (rental.tenantId !== undefined) dbData.tenant_id = rental.tenantId;
    if (rental.startDate !== undefined) dbData.start_date = rental.startDate;
    if (rental.endDate !== undefined) dbData.end_date = rental.endDate;
    if (rental.value !== undefined || rental.monthlyRent !== undefined) {
      dbData.rent_value = rental.monthlyRent || rental.value;
    }
    if (rental.paymentDay !== undefined) dbData.rent_due_day = rental.paymentDay;
    if (rental.depositAmount !== undefined) dbData.deposit_value = rental.depositAmount;
    if (rental.status !== undefined) dbData.status = rental.status;
    if (rental.attachments !== undefined) dbData.attachments = rental.attachments as any;
    if (rental.contractAttachments !== undefined) dbData.contract_attachments = rental.contractAttachments;
    if (rental.hasGarage !== undefined) dbData.has_garage = rental.hasGarage;
    if (rental.garageValue !== undefined) dbData.garage_value = rental.garageValue;
    if (rental.hasPartnerBroker !== undefined) dbData.has_partner_broker = rental.hasPartnerBroker;
    if (rental.depositInstallments !== undefined) dbData.deposit_installments = rental.depositInstallments;

    // 3️⃣ ATUALIZAR RENTAL NO BANCO
    const { data, error } = await supabase
      .from("rentals")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 4️⃣ ATUALIZAÇÃO INTELIGENTE DE PARCELAS DE CAUÇÃO
    // Buscar parcelas existentes
    const { data: existingInstallments } = await supabase
      .from("deposit_installments")
      .select("*")
      .eq("rental_id", id)
      .order("installment_number", { ascending: true });

    const hasExistingInstallments = existingInstallments && existingInstallments.length > 0;
    const depositAmount = rental.depositAmount ?? oldRental.depositAmount ?? 0;

    console.log("🔍 [rentalService.update] Status das parcelas:", {
      hasExistingInstallments,
      existingCount: existingInstallments?.length || 0,
      depositAmount,
      oldDepositAmount: oldRental.depositAmount,
    });

    // REGRA SIMPLIFICADA: Se NÃO tem parcelas E tem depositAmount > 0, CRIAR
    if (!hasExistingInstallments && depositAmount > 0) {
      console.log("🔄 [rentalService.update] NÃO há parcelas e HÁ valor de caução - CRIANDO...");
      
      try {
        const installmentsToCreate = [];
        const totalInstallments = rental.depositInstallments ?? oldRental.depositInstallments ?? 1;
        
        console.log("📦 [rentalService.update] Parâmetros para criação:", {
          totalInstallments,
          depositAmount,
          depositInstallment1: rental.depositInstallment1 ?? oldRental.depositInstallment1,
          depositInstallment2: rental.depositInstallment2 ?? oldRental.depositInstallment2,
          depositInstallment3: rental.depositInstallment3 ?? oldRental.depositInstallment3,
        });
        
        // 1ª Parcela
        installmentsToCreate.push({
          installment_number: 1,
          total_installments: totalInstallments,
          amount: rental.depositInstallment1 ?? oldRental.depositInstallment1 ?? depositAmount,
          due_date: rental.depositInstallment1DueDate ?? oldRental.depositInstallment1DueDate ?? rental.startDate ?? oldRental.startDate ?? new Date().toISOString().split('T')[0],
          payment_date: rental.depositInstallment1PaymentDate ?? oldRental.depositInstallment1PaymentDate ?? null,
          pix_code: rental.depositInstallment1PixCode ?? oldRental.depositInstallment1PixCode ?? null,
        });
        
        // 2ª Parcela (se houver)
        if (totalInstallments >= 2) {
          const installment2Amount = rental.depositInstallment2 ?? oldRental.depositInstallment2 ?? 0;
          if (installment2Amount > 0) {
            installmentsToCreate.push({
              installment_number: 2,
              total_installments: totalInstallments,
              amount: installment2Amount,
              due_date: rental.depositInstallment2DueDate ?? oldRental.depositInstallment2DueDate ?? new Date().toISOString().split('T')[0],
              payment_date: rental.depositInstallment2PaymentDate ?? oldRental.depositInstallment2PaymentDate ?? null,
              pix_code: rental.depositInstallment2PixCode ?? oldRental.depositInstallment2PixCode ?? null,
            });
          }
        }
        
        // 3ª Parcela (se houver)
        if (totalInstallments === 3) {
          const installment3Amount = rental.depositInstallment3 ?? oldRental.depositInstallment3 ?? 0;
          if (installment3Amount > 0) {
            installmentsToCreate.push({
              installment_number: 3,
              total_installments: totalInstallments,
              amount: installment3Amount,
              due_date: rental.depositInstallment3DueDate ?? oldRental.depositInstallment3DueDate ?? new Date().toISOString().split('T')[0],
              payment_date: rental.depositInstallment3PaymentDate ?? oldRental.depositInstallment3PaymentDate ?? null,
              pix_code: rental.depositInstallment3PixCode ?? oldRental.depositInstallment3PixCode ?? null,
            });
          }
        }
        
        console.log("📦 [rentalService.update] Criando parcelas:", installmentsToCreate);
        
        await createDepositInstallments(id, installmentsToCreate);
        
        console.log("✅ [rentalService.update] Parcelas de caução criadas com sucesso!");
      } catch (depositError) {
        console.error("❌ [rentalService.update] ERRO ao criar parcelas de caução:", depositError);
        console.error("Stack:", (depositError as any).stack);
      }
    } 
    // Se JÁ tem parcelas, verificar se precisa atualizar valores/datas
    else if (hasExistingInstallments) {
      const depositChanged = 
        (rental.depositInstallment1 !== undefined && rental.depositInstallment1 !== oldRental.depositInstallment1) ||
        (rental.depositInstallment2 !== undefined && rental.depositInstallment2 !== oldRental.depositInstallment2) ||
        (rental.depositInstallment3 !== undefined && rental.depositInstallment3 !== oldRental.depositInstallment3) ||
        (rental.depositInstallment1DueDate !== undefined && rental.depositInstallment1DueDate !== oldRental.depositInstallment1DueDate) ||
        (rental.depositInstallment2DueDate !== undefined && rental.depositInstallment2DueDate !== oldRental.depositInstallment2DueDate) ||
        (rental.depositInstallment3DueDate !== undefined && rental.depositInstallment3DueDate !== oldRental.depositInstallment3DueDate);

      if (depositChanged) {
        console.log("🔄 [rentalService.update] Parcelas existem mas valores/datas mudaram - ATUALIZANDO...");
        
        try {
          // ATUALIZAR cada parcela que mudou (sem deletar)
          for (const existingInstallment of existingInstallments) {
            const installmentNum = existingInstallment.installment_number;
            const updateData: any = {};
            
            // Determinar novos valores baseado no número da parcela
            if (installmentNum === 1) {
              if (rental.depositInstallment1 !== undefined && rental.depositInstallment1 !== existingInstallment.amount) {
                updateData.amount = rental.depositInstallment1;
              }
              if (rental.depositInstallment1DueDate !== undefined && rental.depositInstallment1DueDate !== existingInstallment.due_date) {
                updateData.due_date = rental.depositInstallment1DueDate;
              }
            } else if (installmentNum === 2) {
              if (rental.depositInstallment2 !== undefined && rental.depositInstallment2 !== existingInstallment.amount) {
                updateData.amount = rental.depositInstallment2;
              }
              if (rental.depositInstallment2DueDate !== undefined && rental.depositInstallment2DueDate !== existingInstallment.due_date) {
                updateData.due_date = rental.depositInstallment2DueDate;
              }
            } else if (installmentNum === 3) {
              if (rental.depositInstallment3 !== undefined && rental.depositInstallment3 !== existingInstallment.amount) {
                updateData.amount = rental.depositInstallment3;
              }
              if (rental.depositInstallment3DueDate !== undefined && rental.depositInstallment3DueDate !== existingInstallment.due_date) {
                updateData.due_date = rental.depositInstallment3DueDate;
              }
            }
            
            // Se houver mudanças, atualizar
            if (Object.keys(updateData).length > 0) {
              updateData.updated_at = new Date().toISOString();
              
              console.log(`📝 [rentalService.update] Atualizando parcela ${installmentNum}:`, updateData);
              
              const { error: updateError } = await supabase
                .from("deposit_installments")
                .update(updateData)
                .eq("id", existingInstallment.id);
              
              if (updateError) throw updateError;
            }
          }
          
          console.log("✅ [rentalService.update] Parcelas de caução atualizadas com sucesso!");
        } catch (depositError) {
          console.error("❌ [rentalService.update] ERRO ao atualizar parcelas de caução:", depositError);
        }
      } else {
        console.log("✅ [rentalService.update] Parcelas de caução já existem e sem mudanças");
      }
    } else {
      console.log("ℹ️ [rentalService.update] Sem caução ou sem mudanças necessárias");
    }

    // 5️⃣ DETECTAR MUDANÇAS E ATUALIZAR RECEBIMENTOS DE ALUGUEL (se necessário)
    const rentPaymentsChanged = 
      (rental.startDate !== undefined && rental.startDate !== oldRental.startDate) ||
      (rental.endDate !== undefined && rental.endDate !== oldRental.endDate) ||
      (rental.paymentDay !== undefined && rental.paymentDay !== oldRental.paymentDay) ||
      (rental.hasGarage !== undefined && rental.hasGarage !== oldRental.hasGarage) ||
      (rental.garageValue !== undefined && rental.garageValue !== oldRental.garageValue) ||
      (rental.monthlyRent !== undefined && rental.monthlyRent !== oldRental.monthlyRent) ||
      (rental.value !== undefined && rental.value !== oldRental.monthlyRent);

    if (rentPaymentsChanged) {
      console.log("🔄 [rentalService.update] RECEBIMENTOS MUDARAM - Sincronizando...");
      
      try {
        const fullRental = await rentalService.getById(id);
        await updatePendingPaymentsOnRentalEdit(
          id, 
          {
            monthlyRent: rental.monthlyRent ?? rental.value,
            paymentDay: rental.paymentDay,
            hasGarage: rental.hasGarage,
            garageValue: rental.garageValue,
          }, 
          fullRental
        );
        
        console.log("✅ [rentalService.update] Recebimentos de aluguel atualizados com sucesso!");
      } catch (paymentError) {
        console.error("❌ [rentalService.update] ERRO ao atualizar recebimentos:", paymentError);
        // Não fazer throw para não bloquear a atualização da locação
      }
    }

    // 6️⃣ SINCRONIZAR STATUS DO INQUILINO
    if (rental.status !== undefined) {
      const tenantId = rental.tenantId || data.tenant_id;
      if (tenantId) {
        const newTenantStatus = rental.status === "active" ? "rented" : "active";
        await supabase
          .from("tenants")
          .update({ status: newTenantStatus })
          .eq("id", tenantId);
      }
    }

    // ✅ OTIMIZAÇÃO: Invalidar cache
    rentalService.invalidateCache();
    invalidatePaymentsCache();

    // Buscar dados completos para retornar
    return rentalService.getById(id);
  },

  async remove(id: string): Promise<void> {
    // 🔒 GATILHO DE SEGURANÇA: Verificar se existem recebimentos pagos/parciais
    const { data: paidPayments, error: paidError } = await supabase
      .from("payments")
      .select("id")
      .eq("rental_id", id)
      .in("status", ["paid", "partial"]);

    if (paidError) throw paidError;

    // Se houver algum pagamento que NÃO seja pending, não permitir deletar
    if (paidPayments && paidPayments.length > 0) {
      throw new Error(
        `❌ Não é possível deletar esta locação porque ela possui ${paidPayments.length} recebimento(s) pago(s) ou parcialmente pago(s). ` +
        "Apenas locações sem nenhum recebimento efetivado podem ser deletadas."
      );
    }

    // Se chegou aqui, todos os pagamentos são pending (ou não há pagamentos)
    // Deletar todos os pagamentos pendentes primeiro
    const { error: deletePaymentsError } = await supabase
      .from("payments")
      .delete()
      .eq("rental_id", id)
      .eq("status", "pending");

    if (deletePaymentsError) {
      console.error("❌ Erro ao deletar pagamentos pendentes:", deletePaymentsError);
      throw deletePaymentsError;
    }

    // Agora deletar a locação
    const { error } = await supabase.from("rentals").delete().eq("id", id);
    if (error) throw error;
    
    // ✅ OTIMIZAÇÃO: Invalidar cache
    rentalService.invalidateCache();
    invalidatePaymentsCache();
  },

  async terminateContract(id: string): Promise<void> {
    const { data: rentalData, error: fetchError } = await supabase
      .from("rentals")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("rentals")
      .update({ 
        status: "terminated", 
        end_date: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) throw error;

    // Atualizar status do inquilino
    if (rentalData?.tenant_id) {
      await supabase
        .from("tenants")
        .update({ status: "active" })
        .eq("id", rentalData.tenant_id);
    }
    
    // ✅ OTIMIZAÇÃO: Invalidar cache
    rentalService.invalidateCache();
  }
};

// Aliases para compatibilidade
export const getAll = rentalService.getAll;
export const getById = rentalService.getById;
export const remove = rentalService.remove;
export const terminateContract = rentalService.terminateContract;
export const create = async (rental: Omit<Rental, "id">) => rentalService.create(rental);
export const update = async (id: string, rental: Partial<Rental>) => rentalService.update(id, rental);