import { supabase } from "@/integrations/supabase/client";

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
   */
  async syncDepositInstallments(
    rentalId: string,
    depositInstallments: number | null,
    depositData: {
      installment1?: number;
      paymentDate1?: string;
      pixCode1?: string;
      installment2?: number;
      paymentDate2?: string;
      pixCode2?: string;
      installment3?: number;
      paymentDate3?: string;
      pixCode3?: string;
    },
    hasPartnerBroker: boolean = false
  ): Promise<void> {
    console.log("🔄 Iniciando sincronização de parcelas do caução");
    console.log("Rental ID:", rentalId);
    console.log("Número de parcelas:", depositInstallments);
    console.log("Dados recebidos:", depositData);

    try {
      // 1. Deletar todas as parcelas existentes desta locação
      const { error: deleteError } = await supabase
        .from("deposit_installments")
        .delete()
        .eq("rental_id", rentalId);

      if (deleteError) {
        console.error("Erro ao deletar parcelas antigas:", deleteError);
        throw deleteError;
      }

      console.log("✅ Parcelas antigas deletadas");

      // 2. Se não houver parcelas, retornar
      if (!depositInstallments || depositInstallments === 0) {
        console.log("ℹ️ Caução sem parcelamento - nada a criar");
        return;
      }

      // 3. Calcular comissões (se houver corretor parceiro)
      const calculateCommissions = (amount: number) => {
        if (hasPartnerBroker) {
          return {
            partner_commission: amount * 0.5, // 50% para parceiro
            internal_commission: amount * 0.5, // 50% interno
          };
        }
        return {
          partner_commission: 0,
          internal_commission: amount, // 100% interno se não houver parceiro
        };
      };

      // 4. Calcular total do caução
      const totalDeposit =
        (depositData.installment1 || 0) +
        (depositData.installment2 || 0) +
        (depositData.installment3 || 0);

      // 5. Criar novas parcelas
      const installmentsToCreate: DepositInstallmentData[] = [];

      // Parcela 1
      if (depositData.installment1) {
        const commissions = calculateCommissions(depositData.installment1);
        installmentsToCreate.push({
          rental_id: rentalId,
          installment_number: 1,
          total_installments: depositInstallments,
          installment_total: totalDeposit,
          amount: depositData.installment1,
          pix_code: depositData.pixCode1 || null,
          payment_date: depositData.paymentDate1 || null,
          partner_commission: commissions.partner_commission,
          internal_commission: commissions.internal_commission,
        });
      }

      // Parcela 2
      if (depositData.installment2) {
        const commissions = calculateCommissions(depositData.installment2);
        installmentsToCreate.push({
          rental_id: rentalId,
          installment_number: 2,
          total_installments: depositInstallments,
          installment_total: totalDeposit,
          amount: depositData.installment2,
          pix_code: depositData.pixCode2 || null,
          payment_date: depositData.paymentDate2 || null,
          partner_commission: commissions.partner_commission,
          internal_commission: commissions.internal_commission,
        });
      }

      // Parcela 3
      if (depositData.installment3) {
        const commissions = calculateCommissions(depositData.installment3);
        installmentsToCreate.push({
          rental_id: rentalId,
          installment_number: 3,
          total_installments: depositInstallments,
          installment_total: totalDeposit,
          amount: depositData.installment3,
          pix_code: depositData.pixCode3 || null,
          payment_date: depositData.paymentDate3 || null,
          partner_commission: commissions.partner_commission,
          internal_commission: commissions.internal_commission,
        });
      }

      console.log("📦 Parcelas a criar:", installmentsToCreate.length);

      if (installmentsToCreate.length > 0) {
        const { data, error: insertError } = await supabase
          .from("deposit_installments")
          .insert(installmentsToCreate)
          .select();

        if (insertError) {
          console.error("Erro ao inserir parcelas:", insertError);
          throw insertError;
        }

        console.log("✅ Parcelas criadas com sucesso:", data?.length || 0);
      }
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