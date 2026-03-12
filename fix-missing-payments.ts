import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function formatDateLocal(dateString: string): Date {
  if (!dateString) return new Date();
  return new Date(dateString + "T00:00:00");
}

function calculateDaysBetweenDates(startDate: string, paymentDay: number): number {
  const start = formatDateLocal(startDate);
  const startDay = start.getDate();
  if (startDay === paymentDay) return 30;
  
  const paymentDate = new Date(start);
  if (startDay > paymentDay) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  }
  paymentDate.setDate(paymentDay);
  
  const diffTime = paymentDate.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function run() {
  console.log("🔍 Iniciando script de correção inteligente...\n");
  
  const { data: rentals, error: rentalsError } = await supabase
    .from("rentals")
    .select(`
      id, start_date, end_date, rent_value, rent_due_day, has_garage, garage_value,
      properties ( property_identifier )
    `)
    .neq("status", "terminated");
    
  if (rentalsError) {
    console.error("Erro ao buscar rentals:", rentalsError);
    return;
  }
  
  console.log(`Encontradas ${rentals.length} locações ativas.`);

  for (const rental of rentals) {
    const propName = rental.properties?.property_identifier || rental.id;
    console.log(`\n==============================================`);
    console.log(`🏠 Processando Locação: ${propName}`);

    // Buscar pagamentos atuais dessa locação
    const { data: currentPayments } = await supabase
      .from("payments")
      .select("id, reference_month, reference_year, is_paid, expected_amount, installment, total_installments, notes")
      .eq("rental_id", rental.id)
      .order("reference_year", { ascending: true })
      .order("reference_month", { ascending: true });

    const totalRentValue = Number(rental.rent_value || 0) + (rental.has_garage ? Number(rental.garage_value || 0) : 0);
    
    // Configurar as datas
    const startDate = formatDateLocal(rental.start_date);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // 1-12
    
    // Se não tiver data fim, projetar 12 meses como padrão
    let endDate = rental.end_date ? formatDateLocal(rental.end_date) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;

    let currentYear = startYear;
    let currentMonth = startMonth;
    
    // Lógica para contagem de parcelas
    const firstMonthDays = calculateDaysBetweenDates(rental.start_date, rental.rent_due_day);
    let installmentCounter = 1;
    
    // Gerar mapa ideal
    const expectedPayments = [];

    while (
      currentYear < endYear || 
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const isFirstMonthOfContract = currentYear === startYear && currentMonth === startMonth;
      const isLastMonthOfContract = currentYear === endYear && currentMonth === endMonth;

      let expectedAmount = totalRentValue;
      let currentInstallment = 0;
      let isProportional = false;

      if (isFirstMonthOfContract) {
        if (firstMonthDays === 30) {
          expectedAmount = totalRentValue;
          currentInstallment = installmentCounter++;
        } else {
          isProportional = true;
          expectedAmount = Math.round((totalRentValue / 30) * firstMonthDays * 100) / 100;
          if (firstMonthDays < 15) {
            currentInstallment = 0; // Prorata
          } else {
            currentInstallment = installmentCounter++; // Conta como primeira
          }
        }
      } else if (isLastMonthOfContract) {
        // Último mês
        const lastDay = endDate.getDate();
        if (lastDay !== rental.rent_due_day) {
          isProportional = true;
          let lastMonthDays = lastDay;
          if (rental.rent_due_day < lastDay) {
            lastMonthDays = lastDay - rental.rent_due_day;
          }
          if (lastMonthDays < 30) {
             expectedAmount = Math.round((totalRentValue / 30) * lastMonthDays * 100) / 100;
          }
        }
        currentInstallment = installmentCounter++;
      } else {
        // Intermediárias
        currentInstallment = installmentCounter++;
      }

      expectedPayments.push({
        month: currentMonth.toString().padStart(2, '0'),
        year: currentYear.toString(),
        amount: expectedAmount,
        installment: currentInstallment,
        isProportional
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    const maxInstallment = installmentCounter - 1;
    console.log(`  Map Ideal gerou ${expectedPayments.length} meses.`);
    
    // Cruze com os existentes e resolva discrepâncias
    for (const ideal of expectedPayments) {
      const existing = currentPayments?.find(p => p.reference_month === ideal.month && p.reference_year === ideal.year);
      
      if (!existing) {
        // FALTANDO - Precisa inserir
        console.log(`  ➕ Faltando mês ${ideal.month}/${ideal.year}. Inserindo...`);
        
        // Calcular dia de vencimento real
        let dueDateObj = new Date(Number(ideal.year), Number(ideal.month) - 1, rental.rent_due_day);
        let actualDueDateStr = `${dueDateObj.getFullYear()}-${(dueDateObj.getMonth()+1).toString().padStart(2, '0')}-${dueDateObj.getDate().toString().padStart(2, '0')}`;

        await supabase.from("payments").insert({
          rental_id: rental.id,
          reference_month: ideal.month,
          reference_year: ideal.year,
          expected_amount: ideal.amount,
          due_date: actualDueDateStr,
          status: "pending",
          is_paid: false,
          installment: ideal.installment > 0 ? ideal.installment : null,
          total_installments: maxInstallment,
          notes: ideal.isProportional ? "Parcela Proporcional" : ""
        });
      } else {
        // EXISTE - Apenas ATUALIZAR a numeração de parcela e remover nota incorreta
        // Mantém o amount e is_paid intacto para não estragar nada!
        let needsUpdate = false;
        let updateData: any = {};
        
        const idealInstallmentToSave = ideal.installment > 0 ? ideal.installment : null;
        
        if (existing.installment !== idealInstallmentToSave) {
           needsUpdate = true;
           updateData.installment = idealInstallmentToSave;
        }
        
        if (existing.total_installments !== maxInstallment) {
           needsUpdate = true;
           updateData.total_installments = maxInstallment;
        }

        // LIMPAR O TEXTO "Parcela Proporcional" se não for mais proporcional (ex: março)
        const idealNote = ideal.isProportional ? "Parcela Proporcional" : "";
        if (existing.notes === "Parcela Proporcional" && !ideal.isProportional) {
            needsUpdate = true;
            updateData.notes = "";
        }

        if (needsUpdate) {
           console.log(`  🔄 Atualizando parcela mês ${ideal.month}/${ideal.year}. Era ${existing.installment}/${existing.total_installments}, será ${idealInstallmentToSave}/${maxInstallment}`);
           await supabase.from("payments").update(updateData).eq("id", existing.id);
        } else {
           console.log(`  ✅ Mês ${ideal.month}/${ideal.year} está correto.`);
        }
      }
    }
  }

  console.log("\n🚀 Script Finalizado com sucesso.");
}

run();