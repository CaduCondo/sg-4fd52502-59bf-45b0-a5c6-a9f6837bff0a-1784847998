import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  console.log("🔍 Iniciando análise de recebimentos...\n");
  
  const { data: rentals } = await supabase
    .from("rentals")
    .select("id, start_date, end_date, property_identifier, rent_value, rent_due_day")
    .neq("status", "terminated");
    
  if (!rentals || rentals.length === 0) {
    return console.log("Nenhuma locação ativa encontrada.");
  }
  
  let totalWithProblems = 0;
  
  for (const rental of rentals) {
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("rental_id", rental.id)
      .order("year", { ascending: true })
      .order("month", { ascending: true });
      
    if (!payments || payments.length === 0) {
      console.log(`❌ [PROBLEMA] Locação: ${rental.property_identifier}`);
      console.log(`   Motivo: Nenhum recebimento encontrado!\n`);
      totalWithProblems++;
      continue;
    }

    const problems: string[] = [];

    // Verificando se todos os recebimentos ficaram como "proporcionais"
    const proportionalCount = payments.filter(p => p.is_proportional).length;
    if (proportionalCount > 2) {
      problems.push(`Erro crítico: ${proportionalCount} parcelas estão marcadas como proporcionais (deveria ser no máximo a primeira e/ou a última).`);
    }

    // Identificando lacunas de meses (pulos de mês)
    let previousMonth = payments[0].month;
    let previousYear = payments[0].year;
    
    for (let i = 1; i < payments.length; i++) {
      let expectedMonth = previousMonth + 1;
      let expectedYear = previousYear;
      if (expectedMonth > 12) {
        expectedMonth = 1;
        expectedYear += 1;
      }
      
      const current = payments[i];
      if (current.month !== expectedMonth || current.year !== expectedYear) {
        problems.push(`Pulo de mês detectado: Do mês ${previousMonth}/${previousYear} pulou para ${current.month}/${current.year}.`);
      }
      
      previousMonth = current.month;
      previousYear = current.year;
    }

    // Se houve algum problema, relata:
    if (problems.length > 0) {
      totalWithProblems++;
      console.log(`❌ [PROBLEMA] Locação: ${rental.property_identifier}`);
      problems.forEach(p => console.log(`   - ${p}`));
      
      // Checar quantas parcelas estavam pagas (para sabermos se o erro afetou status)
      const paidCount = payments.filter(p => p.status === 'paid').length;
      if (paidCount > 0) {
        console.log(`   ⚠️ ATENÇÃO: Esta locação tem ${paidCount} parcela(s) com status PAGO.`);
      }
      console.log("");
    }
  }
  
  console.log(`\n📊 RESULTADO:`);
  console.log(`Total de locações ativas: ${rentals.length}`);
  console.log(`Locações COM PROBLEMAS: ${totalWithProblems}`);
  console.log(`Locações PERFEITAS: ${rentals.length - totalWithProblems}`);
}

run();