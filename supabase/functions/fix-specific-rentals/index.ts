import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('🔍 Buscando locações dos apartamentos Signore Apto 04, 09 e 10...')

    // Buscar as locações ativas desses imóveis
    const { data: rentals, error: rentalsError } = await supabaseClient
      .from('rentals')
      .select(`
        id,
        start_date,
        end_date,
        rent_value,
        has_garage,
        garage_value,
        payment_day,
        status,
        properties (
          id,
          name
        )
      `)
      .in('properties.name', ['Signore Apto 04', 'Signore Apto 09', 'Signore Apto 10'])
      .eq('status', 'active')

    if (rentalsError) {
      console.error('❌ Erro ao buscar locações:', rentalsError)
      throw rentalsError
    }

    if (!rentals || rentals.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma locação ativa encontrada para esses imóveis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log(`📊 Total de locações encontradas: ${rentals.length}`)

    const results = []

    for (const rental of rentals) {
      console.log(`\n🏠 Processando: ${rental.properties?.name}`)
      console.log(`📅 Período: ${rental.start_date} até ${rental.end_date}`)
      console.log(`💰 Valor: R$ ${rental.rent_value}`)

      const rentalId = rental.id
      const endDate = rental.end_date ? new Date(rental.end_date + 'T00:00:00') : null

      if (!endDate) {
        console.log('⚠️ Locação sem data fim - pulando')
        results.push({
          property: rental.properties?.name,
          status: 'skipped',
          reason: 'Sem data fim'
        })
        continue
      }

      // Buscar valores atuais
      const currentMonthlyRent = rental.rent_value || 0
      const currentHasGarage = rental.has_garage
      const currentGarageValue = rental.garage_value || 0
      const currentGarageAmount = currentHasGarage ? currentGarageValue : 0
      const currentTotalRent = currentMonthlyRent + currentGarageAmount
      const paymentDay = rental.payment_day

      console.log(`💰 Valores:`)
      console.log(`   - Aluguel: R$ ${currentMonthlyRent.toFixed(2)}`)
      console.log(`   - Garagem: ${currentHasGarage ? `R$ ${currentGarageValue.toFixed(2)}` : 'Não'}`)
      console.log(`   - Total: R$ ${currentTotalRent.toFixed(2)}`)
      console.log(`   - Dia pagamento: ${paymentDay}`)

      // Buscar pagamentos existentes
      const { data: existingPayments, error: paymentsError } = await supabaseClient
        .from('payments')
        .select('id, reference_month, reference_year, status, expected_amount, breakdown')
        .eq('rental_id', rentalId)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false })

      if (paymentsError) {
        console.error('❌ Erro ao buscar pagamentos:', paymentsError)
        results.push({
          property: rental.properties?.name,
          status: 'error',
          error: paymentsError.message
        })
        continue
      }

      console.log(`📊 Pagamentos existentes: ${existingPayments?.length || 0}`)

      // Criar Set de meses que já existem
      const existingRefs = new Set(
        (existingPayments || []).map(p => `${p.reference_year}-${p.reference_month}`)
      )

      // Atualizar breakdowns dos pagamentos pendentes existentes
      const paymentsToUpdate = []
      for (const payment of existingPayments || []) {
        if (payment.status === 'pending' || payment.status === 'overdue') {
          // Verificar se o breakdown está desatualizado
          const breakdown = payment.breakdown as any[] || []
          const rentBreakdown = breakdown.find(b => b.description === 'Aluguel')
          
          if (!rentBreakdown || rentBreakdown.amount !== currentMonthlyRent) {
            console.log(`🔄 Atualizando breakdown do pagamento ${payment.reference_month}/${payment.reference_year}`)
            
            // Criar novo breakdown
            const newBreakdown = [
              {
                description: 'Aluguel',
                amount: parseFloat(currentMonthlyRent.toFixed(2)),
                type: 'addition',
              }
            ]

            if (currentGarageAmount > 0) {
              newBreakdown.push({
                description: 'Garagem',
                amount: parseFloat(currentGarageAmount.toFixed(2)),
                type: 'addition',
              })
            }

            paymentsToUpdate.push({
              id: payment.id,
              expected_amount: currentTotalRent,
              breakdown: newBreakdown
            })
          }
        }
      }

      // Atualizar pagamentos existentes
      if (paymentsToUpdate.length > 0) {
        console.log(`🔄 Atualizando ${paymentsToUpdate.length} pagamentos existentes...`)
        for (const update of paymentsToUpdate) {
          const { error: updateError } = await supabaseClient
            .from('payments')
            .update({
              expected_amount: update.expected_amount,
              breakdown: update.breakdown
            })
            .eq('id', update.id)

          if (updateError) {
            console.error(`❌ Erro ao atualizar pagamento ${update.id}:`, updateError)
          } else {
            console.log(`✅ Pagamento ${update.id} atualizado`)
          }
        }
      }

      // Determinar de onde começar a verificação
      let startFrom: Date
      if (existingPayments && existingPayments.length > 0) {
        const lastPayment = existingPayments[0]
        startFrom = new Date(
          parseInt(lastPayment.reference_year),
          parseInt(lastPayment.reference_month),
          1
        )
        console.log(`📅 Último pagamento: ${lastPayment.reference_month}/${lastPayment.reference_year}`)
      } else {
        startFrom = new Date(rental.start_date + 'T00:00:00')
        console.log(`📅 Começando da data início: ${rental.start_date}`)
      }

      // Verificar recebimentos faltantes
      const missingPayments = []
      const currentDate = new Date(startFrom)

      while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()
        const refKey = `${year}-${month}`

        if (!existingRefs.has(refKey)) {
          console.log(`❌ Faltando: ${month}/${year}`)

          const dueDate = new Date(year, month - 1, paymentDay)
          const isLastMonth = (year === endDate.getFullYear() && month === endDate.getMonth() + 1)

          if (isLastMonth) {
            const endDay = endDate.getDate()
            const daysInMonth = new Date(year, month, 0).getDate()
            const isProportional = endDay < daysInMonth

            if (isProportional) {
              const proportionalRent = (currentMonthlyRent / 30) * endDay
              const proportionalGarage = currentGarageAmount > 0 ? (currentGarageAmount / 30) * endDay : 0
              const proportionalTotal = proportionalRent + proportionalGarage

              const breakdown = [
                {
                  description: `Aluguel - Última Parcela (${endDay} dias)`,
                  amount: parseFloat(proportionalRent.toFixed(2)),
                  type: 'addition',
                }
              ]

              if (currentGarageAmount > 0) {
                breakdown.push({
                  description: `Garagem (${endDay} dias)`,
                  amount: parseFloat(proportionalGarage.toFixed(2)),
                  type: 'addition',
                })
              }

              missingPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: parseFloat(proportionalTotal.toFixed(2)),
                status: 'pending',
                breakdown: breakdown,
              })

              console.log(`   ➕ Proporcional: R$ ${proportionalTotal.toFixed(2)}`)
            } else {
              const breakdown = [
                {
                  description: 'Aluguel',
                  amount: parseFloat(currentMonthlyRent.toFixed(2)),
                  type: 'addition',
                }
              ]

              if (currentGarageAmount > 0) {
                breakdown.push({
                  description: 'Garagem',
                  amount: parseFloat(currentGarageAmount.toFixed(2)),
                  type: 'addition',
                })
              }

              missingPayments.push({
                rental_id: rentalId,
                reference_month: month.toString(),
                reference_year: year.toString(),
                due_date: dueDate.toISOString().split('T')[0],
                expected_amount: currentTotalRent,
                status: 'pending',
                breakdown: breakdown,
              })

              console.log(`   ➕ Integral: R$ ${currentTotalRent.toFixed(2)}`)
            }
          } else {
            const breakdown = [
              {
                description: 'Aluguel',
                amount: parseFloat(currentMonthlyRent.toFixed(2)),
                type: 'addition',
              }
            ]

            if (currentGarageAmount > 0) {
              breakdown.push({
                description: 'Garagem',
                amount: parseFloat(currentGarageAmount.toFixed(2)),
                type: 'addition',
              })
            }

            missingPayments.push({
              rental_id: rentalId,
              reference_month: month.toString(),
              reference_year: year.toString(),
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: currentTotalRent,
              status: 'pending',
              breakdown: breakdown,
            })

            console.log(`   ➕ Integral: R$ ${currentTotalRent.toFixed(2)}`)
          }
        }

        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      // Inserir recebimentos faltantes
      if (missingPayments.length > 0) {
        console.log(`💾 Criando ${missingPayments.length} recebimentos...`)

        const { data: insertedData, error: insertError } = await supabaseClient
          .from('payments')
          .insert(missingPayments)
          .select()

        if (insertError) {
          console.error('❌ Erro ao inserir:', insertError)
          results.push({
            property: rental.properties?.name,
            status: 'error',
            error: insertError.message,
            updated: paymentsToUpdate.length,
            created: 0
          })
        } else {
          console.log(`✅ ${missingPayments.length} recebimentos criados!`)

          // Atualizar total_installments
          const { data: allPayments } = await supabaseClient
            .from('payments')
            .select('id')
            .eq('rental_id', rentalId)

          const totalInstallments = (allPayments || []).length

          await supabaseClient
            .from('payments')
            .update({ total_installments: totalInstallments })
            .eq('rental_id', rentalId)

          console.log(`✅ Total de parcelas atualizado: ${totalInstallments}`)

          results.push({
            property: rental.properties?.name,
            status: 'success',
            updated: paymentsToUpdate.length,
            created: missingPayments.length,
            total_installments: totalInstallments
          })
        }
      } else {
        console.log('✅ Todos os recebimentos já existem')
        results.push({
          property: rental.properties?.name,
          status: 'success',
          updated: paymentsToUpdate.length,
          created: 0,
          message: 'Todos os recebimentos já existem'
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: rentals.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})