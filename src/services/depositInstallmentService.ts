import { supabase } from "@/integrations/supabase/client";

/**
 * Normaliza uma data para o formato YYYY-MM-DD, garantindo que não haja perda de dias por timezone
 */
const normalizeDate = (date: string | Date | null): string | null => {
  if (!date) return null;
  
  // Se já for uma string YYYY-MM-DD simples, retorna ela mesma
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Se for string ISO completa (com hora), extrair apenas a parte da data
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0];
  }
  
  // Se for objeto Date ou string em outro formato
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  // Pega os componentes da data no timezone LOCAL (não UTC)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

interface DepositInstallmentData {
  rental_id: string;
  installment_number: number;
  total_installments: number;
  installment_total: number;
  amount: number;
  pix_code: string | null;
  payment_date: string | null;
  partner_commission: number;
  internal_commission: number;
}

export const depositInstallmentService = {
  /**
   * Sincroniza as parcelas do caução ao criar/editar uma locação
   * VERSÃO CORRIGIDA: Atualiza registros existentes em vez de deletar tudo
   */
  async syncDepositInstallments(
    rentalId: string,
    depositInstallments: number | null,
    depositData: {
      installment1?: number;
      paymentDate1?: string;
      dueDate1?: string;
      pixCode1?: string;
      installment2?: number;
      paymentDate2?: string;
      dueDate2?: string;
      pixCode2?: string;
      installment3?: number;
      paymentDate3?: string;
      dueDate3?: string;
      pixCode3?: string;
    },
    hasPartnerBroker: boolean = false
  ): Promise<void> {
    console.log("🔄 Iniciando sincronização de parcelas do caução");
    console.log("Rental ID:", rentalId);
    console.log("Número de parcelas:", depositInstallments);
    console.log("Dados recebidos:", depositData);

    try {
      // 1. Buscar parcelas existentes
      const { data: existingInstallments, error: fetchError } = await supabase
        .from("deposit_installments")
        .select("*")
        .eq("rental_id", rentalId);

      if (fetchError) {
        console.error("Erro ao buscar parcelas existentes:", fetchError);
        throw fetchError;
      }

      console.log("📋 Parcelas existentes:", existingInstallments?.length || 0);

      // 2. Se não houver parcelas configuradas, deletar todas existentes
      if (!depositInstallments || depositInstallments === 0) {
        if (existingInstallments && existingInstallments.length > 0) {
          const { error: deleteError } = await supabase
            .from("deposit_installments")
            .delete()
            .eq("rental_id", rentalId);

          if (deleteError) throw deleteError;
          console.log("✅ Todas as parcelas foram removidas");
        } else {
          console.log("ℹ️ Caução sem parcelamento - nada a fazer");
        }
        return;
      }

      // 3. Calcular comissões
      const calculateCommissions = (amount: number) => {
        if (hasPartnerBroker) {
          return {
            partner_commission: 0,
            internal_commission: 0,
          };
        }
        return {
          partner_commission: 0,
          internal_commission: 0,
        };
      };

      // 5. Preparar dados das parcelas
      const installmentsData: Array<{
        installment_number: number;
        amount: number;
        payment_date: string | null;
        due_date: string | null;
        pix_code: string | null;
      }> = [];

      if (depositData.installment1) {
        const normalizedDate = normalizeDate(depositData.paymentDate1 || null);
        const normalizedDueDate = normalizeDate(depositData.dueDate1 || null);
        
        installmentsData.push({
          installment_number: 1,
          amount: depositData.installment1,
          payment_date: normalizedDate,
          due_date: normalizedDueDate,
          pix_code: depositData.pixCode1 || null,
        });
      }

      if (depositData.installment2) {
        const normalizedDate = normalizeDate(depositData.paymentDate2 || null);
        const normalizedDueDate = normalizeDate(depositData.dueDate2 || null);
        
        installmentsData.push({
          installment_number: 2,
          amount: depositData.installment2,
          payment_date: normalizedDate,
          due_date: normalizedDueDate,
          pix_code: depositData.pixCode2 || null,
        });
      }

      if (depositData.installment3) {
        const normalizedDate = normalizeDate(depositData.paymentDate3 || null);
        const normalizedDueDate = normalizeDate(depositData.dueDate3 || null);
        
        installmentsData.push({
          installment_number: 3,
          amount: depositData.installment3,
          payment_date: normalizedDate,
          due_date: normalizedDueDate,
          pix_code: depositData.pixCode3 || null,
        });
      }

      // 6. Atualizar ou criar cada parcela
      for (const installmentData of installmentsData) {
        const commissions = calculateCommissions(installmentData.amount);
        const existingInstallment = existingInstallments?.find(
          (i) => i.installment_number === installmentData.installment_number
        );

        const installmentRecord = {
          rental_id: rentalId,
          installment_number: installmentData.installment_number,
          total_installments: depositInstallments,
          installment_total: depositInstallments, 
          amount: installmentData.amount,
          pix_code: installmentData.pix_code,
          payment_date: installmentData.payment_date,
          due_date: installmentData.due_date,
          partner_commission: commissions.partner_commission,
          internal_commission: commissions.internal_commission,
        };

        console.log(`💾 Salvando parcela ${installmentData.installment_number}:`);
        console.log("   - payment_date original:", installmentData.payment_date);
        console.log("   - payment_date normalizada:", installmentRecord.payment_date);
        console.log("   - Dados completos:", installmentRecord);

        if (existingInstallment) {
          // ATUALIZAR parcela existente
          const { error: updateError } = await supabase
            .from("deposit_installments")
            .update(installmentRecord)
            .eq("id", existingInstallment.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar parcela ${installmentData.installment_number}:`, updateError);
            console.error("   - Dados que causaram erro:", installmentRecord);
            console.error("   - Erro detalhado:", JSON.stringify(updateError, null, 2));
            throw updateError;
          }

          console.log(`✅ Parcela ${installmentData.installment_number}/${depositInstallments} ATUALIZADA`);
        } else {
          // CRIAR nova parcela
          const { error: insertError } = await supabase
            .from("deposit_installments")
            .insert([installmentRecord]);

          if (insertError) {
            console.error(`❌ Erro ao criar parcela ${installmentData.installment_number}:`, insertError);
            console.error("   - Dados que causaram erro:", installmentRecord);
            console.error("   - Erro detalhado:", JSON.stringify(insertError, null, 2));
            throw insertError;
          }

          console.log(`✅ Parcela ${installmentData.installment_number}/${depositInstallments} CRIADA`);
        }
      }

      // 7. Deletar parcelas que não existem mais
      const installmentNumbers = installmentsData.map((i) => i.installment_number);
      const toDelete = existingInstallments?.filter(
        (i) => !installmentNumbers.includes(i.installment_number)
      );

      if (toDelete && toDelete.length > 0) {
        for (const installment of toDelete) {
          const { error: deleteError } = await supabase
            .from("deposit_installments")
            .delete()
            .eq("id", installment.id);

          if (deleteError) {
            console.error(`Erro ao deletar parcela ${installment.installment_number}:`, deleteError);
            throw deleteError;
          }

          console.log(`🗑️ Parcela ${installment.installment_number} REMOVIDA`);
        }
      }

      console.log("✅ Sincronização de parcelas do caução concluída com sucesso");
    } catch (error) {
      console.error("❌ Erro na sincronização de parcelas do caução:", error);
      throw error;
    }
  },

  /**
   * Busca todas as parcelas de uma locação
   */
  async getByRentalId(rentalId: string) {
    const { data, error } = await supabase
      .from("deposit_installments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("installment_number", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Deleta todas as parcelas de uma locação
   */
  async deleteByRentalId(rentalId: string): Promise<void> {
    const { error } = await supabase
      .from("deposit_installments")
      .delete()
      .eq("rental_id", rentalId);

    if (error) throw error;
  },
};