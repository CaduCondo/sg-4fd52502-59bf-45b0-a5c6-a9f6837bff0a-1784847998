import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function FixSignorePayments() {
  const [isFixing, setIsFixing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  const fixSignorePayments = async () => {
    setIsFixing(true);
    setLogs([]);

    try {
      addLog("🔍 Buscando locação Signore Apto 10...");

      // Buscar a locação do Signore Apto 10
      const { data: rental, error: rentalError } = await supabase
        .from("rentals")
        .select("*, property:properties!inner(address, complement)")
        .ilike("property.address", "%signore%")
        .ilike("property.complement", "%apto 10%")
        .single();

      if (rentalError || !rental) {
        addLog("❌ Erro ao buscar locação: " + (rentalError?.message || "Não encontrada"));
        toast({
          title: "Erro",
          description: "Locação Signore Apto 10 não encontrada",
          variant: "destructive",
        });
        return;
      }

      addLog(`✅ Locação encontrada: ${rental.id}`);
      addLog(`📅 Data de início: ${rental.startDate}`);
      addLog(`📅 Data de término: ${rental.endDate}`);
      addLog(`💰 Valor mensal: R$ ${rental.monthlyRent}`);
      addLog(`📆 Dia de vencimento: ${rental.paymentDay}`);

      // Buscar pagamentos existentes
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("reference_month, reference_year, expected_amount")
        .eq("rental_id", rental.id)
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });

      addLog(`📊 Pagamentos existentes: ${existingPayments?.length || 0}`);
      
      if (existingPayments && existingPayments.length > 0) {
        addLog("📋 Primeiro pagamento: " + existingPayments[0].reference_month + "/" + existingPayments[0].reference_year);
        addLog("📋 Último pagamento: " + existingPayments[existingPayments.length - 1].reference_month + "/" + existingPayments[existingPayments.length - 1].reference_year);
      }

      // Calcular todos os meses que deveriam ter pagamento
      const startDate = new Date(rental.startDate + "T00:00:00");
      const endDate = new Date(rental.endDate + "T00:00:00");
      const paymentDay = rental.paymentDay;
      const monthlyRent = rental.monthlyRent || 0;
      const garageAmount = rental.hasGarage ? (rental.garageValue || 0) : 0;
      const totalMonthlyRent = monthlyRent + garageAmount;

      addLog(`💰 Valor total mensal (aluguel + garagem): R$ ${totalMonthlyRent}`);

      // Criar set de meses existentes
      const existingRefs = new Set(
        (existingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
      );

      // Gerar todos os pagamentos que deveriam existir
      const newPayments = [];
      const currentDate = new Date(startDate);
      let totalMonths = 0;

      while (currentDate <= endDate) {
        totalMonths++;
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const refKey = `${year}-${month}`;

        if (!existingRefs.has(refKey)) {
          const dueDate = new Date(year, month - 1, paymentDay);
          const isLastMonth = (year === endDate.getFullYear() && month === endDate.getMonth() + 1);
          
          if (isLastMonth) {
            // Último mês - verificar se é proporcional
            const endDay = endDate.getDate();
            const daysInMonth = new Date(year, month, 0).getDate();
            const isProportional = endDay < daysInMonth;
            
            if (isProportional) {
              const proportionalRent = (monthlyRent / 30) * endDay;
              const proportionalGarage = garageAmount > 0 ? (garageAmount / 30) * endDay : 0;
              const proportionalTotal = proportionalRent + proportionalGarage;
              
              const breakdown = [
                {
                  description: `Aluguel - Última Parcela (${endDay} dias)`,
                  amount: parseFloat(proportionalRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                breakdown.push({
                  description: `Garagem (${endDay} dias)`,
                  amount: parseFloat(proportionalGarage.toFixed(2)),
                  type: "addition",
                });
              }

              newPayments.push({
                rental_id: rental.id,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                status: "pending",
                breakdown: breakdown,
              });
              
              addLog(`📅 ${month}/${year}: R$ ${proportionalTotal.toFixed(2)} (proporcional - ${endDay} dias)`);
            } else {
              const breakdown = [
                {
                  description: "Aluguel",
                  amount: parseFloat(monthlyRent.toFixed(2)),
                  type: "addition",
                }
              ];

              if (garageAmount > 0) {
                breakdown.push({
                  description: "Garagem",
                  amount: parseFloat(garageAmount.toFixed(2)),
                  type: "addition",
                });
              }

              newPayments.push({
                rental_id: rental.id,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: totalMonthlyRent,
                status: "pending",
                breakdown: breakdown,
              });
              
              addLog(`📅 ${month}/${year}: R$ ${totalMonthlyRent.toFixed(2)} (integral)`);
            }
          } else {
            const breakdown = [
              {
                description: "Aluguel",
                amount: parseFloat(monthlyRent.toFixed(2)),
                type: "addition",
              }
            ];

            if (garageAmount > 0) {
              breakdown.push({
                description: "Garagem",
                amount: parseFloat(garageAmount.toFixed(2)),
                type: "addition",
              });
            }

            newPayments.push({
              rental_id: rental.id,
              reference_month: month.toString(),
              reference_year: year.toString(),
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: totalMonthlyRent,
              status: "pending",
              breakdown: breakdown,
            });
            
            addLog(`📅 ${month}/${year}: R$ ${totalMonthlyRent.toFixed(2)} (integral)`);
          }
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      addLog(`📊 Total de meses no contrato: ${totalMonths}`);
      addLog(`📊 Pagamentos que já existem: ${existingPayments?.length || 0}`);
      addLog(`📊 Novos pagamentos a criar: ${newPayments.length}`);

      if (newPayments.length > 0) {
        addLog("💾 Inserindo novos pagamentos...");
        
        const { data: insertedData, error: insertError } = await supabase
          .from("payments")
          .insert(newPayments)
          .select();

        if (insertError) {
          addLog("❌ Erro ao inserir: " + insertError.message);
          toast({
            title: "Erro",
            description: "Erro ao criar pagamentos: " + insertError.message,
            variant: "destructive",
          });
          return;
        }

        addLog(`✅ ${insertedData?.length || 0} pagamentos criados com sucesso!`);

        // Atualizar total_installments
        const { error: updateError } = await supabase
          .from("payments")
          .update({ total_installments: totalMonths })
          .eq("rental_id", rental.id);

        if (updateError) {
          addLog("⚠️ Erro ao atualizar total_installments: " + updateError.message);
        } else {
          addLog(`✅ Total de parcelas atualizado: ${totalMonths}`);
        }

        toast({
          title: "Sucesso!",
          description: `${insertedData?.length || 0} pagamentos criados para Signore Apto 10`,
        });
      } else {
        addLog("✅ Todos os pagamentos já existem!");
        toast({
          title: "Informação",
          description: "Todos os pagamentos já existem, nenhuma ação necessária",
        });
      }

    } catch (error: any) {
      addLog("❌ Erro geral: " + error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Corrigir Pagamentos - Signore Apto 10</CardTitle>
          <CardDescription>
            Cria os pagamentos faltantes baseado nas datas do contrato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={fixSignorePayments} 
            disabled={isFixing}
            className="w-full"
          >
            {isFixing ? "Processando..." : "Criar Pagamentos Faltantes"}
          </Button>

          {logs.length > 0 && (
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}