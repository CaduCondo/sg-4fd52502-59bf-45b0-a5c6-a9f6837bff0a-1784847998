import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface PaymentToCreate {
  rental_id: string
  expected_amount: number
  paid_amount: number
  due_date: string
  status: string
  reference_month: string
  reference_year: string
  discount_amount: number
  late_fee: number
  interest: number
  notes: string | null
  payment_method: string | null
  breakdown: any
  installment: number | null
  total_installments: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔍 Iniciando auditoria de pagamentos...')

    // Buscar todas as locações ativas
    const { data: rentals, error: rentalsError } = await supabaseClient
      .from('rentals')
      .select(`
        id,
        start_date,
        end_date,
        payment_day,
        value,
        monthly_rent,
        has_garage,
        garage_value,
        properties (
          id,
          complement,
          locations (
            name
          )
        ),
        tenants (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .order('start_date', { ascending: true })

    if (rentalsError) {
      throw rentalsError
    }

    console.log(`📊 Total de locações ativas: ${rentals?.length || 0}`)

    const report: any[] = []
    let totalCreated = 0

    for (const rental of rentals || []) {
      console.log(`
🏠 Processando: ${rental.properties?.locations?.name} ${rental.properties?.complement}`)

      // Buscar pagamentos existentes
      const { data: existingPayments, error: paymentsError } = await supabaseClient
        .from('payments')
        .select('id, reference_month, reference_year, due_date')
        .eq('rental_id', rental.id)
        .order('reference_year', { ascending: true })
        .order('reference_month', { ascending: true })

      if (paymentsError) {
        console.error(`❌ Erro ao buscar pagamentos: ${paymentsError.message}`)
        continue
      }

      // Calcular pagamentos esperados
      const startDate = new Date(rental.start_date + 'T00:00:00')
      const endDate = rental.end_date 
        ? new Date(rental.end_date + 'T00:00:00')
        : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate())

      const paymentDay = rental.payment_day || 5
      
      // Calcular primeiro vencimento
      const startDay = startDate.getDate()
      let firstPaymentDate: Date
      
      if (paymentDay > startDay) {
        firstPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      } else {
        firstPaymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
      }

      // Gerar lista de meses esperados
      const expectedPayments: Array<{ month: number; year: number; dueDate: Date }> = []
      let currentPaymentMonth = new Date(firstPaymentDate)
      const contractEndMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

      while (currentPaymentMonth <= contractEndMonth) {
        const dueDate = new Date(
          currentPaymentMonth.getFullYear(),
          currentPaymentMonth.getMonth(),
          Math.min(paymentDay, 28)
        )
        
        expectedPayments.push({
          month: currentPaymentMonth.getMonth() + 1,
          year: currentPaymentMonth.getFullYear(),
          dueDate: dueDate
        })
        
        currentPaymentMonth = new Date(
          currentPaymentMonth.getFullYear(),
          currentPaymentMonth.getMonth() + 1,
          1
        )
      }

      // Identificar pagamentos faltantes
      const missingPayments: typeof expectedPayments = []
      
      for (const expected of expectedPayments) {
        const exists = existingPayments?.some(
          p => parseInt(p.reference_month) === expected.month && 
               parseInt(p.reference_year) === expected.year
        )
        
        if (!exists) {
          missingPayments.push(expected)
        }
      }

      if (missingPayments.length === 0) {
        console.log(`✅ Nenhum pagamento faltando`)
        continue
      }

      console.log(`⚠️ Faltam ${missingPayments.length} pagamento(s)`)

      // Criar pagamentos faltantes
      const paymentsToCreate: PaymentToCreate[] = []
      const totalInstallments = expectedPayments.length
      const rentalValue = rental.monthly_rent || rental.value || 0
      const garageValue = (rental.has_garage && rental.garage_value) ? rental.garage_value : 0
      const fullMonthlyAmount = rentalValue + garageValue

      for (const missing of missingPayments) {
        const isFirstPayment = missing.month === expectedPayments[0].month && 
                              missing.year === expectedPayments[0].year
        const isLastPayment = missing.month === expectedPayments[expectedPayments.length - 1].month &&
                             missing.year === expectedPayments[expectedPayments.length - 1].year

        let expectedAmount = fullMonthlyAmount
        let rentAmount = rentalValue
        let garageAmount = garageValue
        let isProporcional = false
        let proportionalDays = 0

        const breakdown: any[] = [
          {
            description: "Aluguel",
            amount: rentAmount,
            type: "addition"
          }
        ]

        if (rental.has_garage && garageValue > 0) {
          breakdown.push({
            description: "Garagem",
            amount: garageAmount,
            type: "addition"
          })
        }

        // Calcular proporcional para primeira parcela
        if (isFirstPayment) {
          const dueDate = missing.dueDate
          const diffTime = dueDate.getTime() - startDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

          if (diffDays > 0 && diffDays < 31) {
            isProporcional = true
            proportionalDays = diffDays
            rentAmount = parseFloat(((rentalValue * diffDays) / 30).toFixed(2))
            garageAmount = rental.has_garage ? parseFloat(((garageValue * diffDays) / 30).toFixed(2)) : 0
            expectedAmount = rentAmount + garageAmount

            breakdown[0] = {
              description: `Aluguel (proporcional ${diffDays} dias)`,
              amount: rentAmount,
              type: "addition"
            }

            if (rental.has_garage && garageValue > 0) {
              breakdown[1] = {
                description: `Garagem (proporcional ${diffDays} dias)`,
                amount: garageAmount,
                type: "addition"
              }
            }
          }
        }

        // Calcular proporcional para última parcela
        if (isLastPayment && !isProporcional) {
          const monthStart = new Date(missing.year, missing.month - 1, 1)
          const diffTime = endDate.getTime() - monthStart.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

          if (diffDays > 0 && diffDays < 31) {
            isProporcional = true
            proportionalDays = diffDays
            rentAmount = parseFloat(((rentalValue * diffDays) / 30).toFixed(2))
            garageAmount = rental.has_garage ? parseFloat(((garageValue * diffDays) / 30).toFixed(2)) : 0
            expectedAmount = rentAmount + garageAmount

            breakdown[0] = {
              description: `Aluguel (proporcional ${diffDays} dias)`,
              amount: rentAmount,
              type: "addition"
            }

            if (rental.has_garage && garageValue > 0) {
              breakdown[1] = {
                description: `Garagem (proporcional ${diffDays} dias)`,
                amount: garageAmount,
                type: "addition"
              }
            }
          }
        }

        // Calcular número da parcela
        const installmentNumber = expectedPayments.findIndex(
          p => p.month === missing.month && p.year === missing.year
        ) + 1

        paymentsToCreate.push({
          rental_id: rental.id,
          expected_amount: expectedAmount,
          paid_amount: 0,
          due_date: missing.dueDate.toISOString().split('T')[0],
          status: 'pending',
          reference_month: missing.month.toString(),
          reference_year: missing.year.toString(),
          discount_amount: 0,
          late_fee: 0,
          interest: 0,
          notes: isProporcional ? `Pagamento proporcional (${proportionalDays} dias)` : null,
          payment_method: null,
          breakdown: breakdown,
          installment: isProporcional ? null : installmentNumber,
          total_installments: totalInstallments
        })
      }

      // Inserir pagamentos no banco
      if (paymentsToCreate.length > 0) {
        const { data: created, error: createError } = await supabaseClient
          .from('payments')
          .insert(paymentsToCreate)
          .select('id')

        if (createError) {
          console.error(`❌ Erro ao criar pagamentos: ${createError.message}`)
          report.push({
            rental_id: rental.id,
            location: `${rental.properties?.locations?.name} ${rental.properties?.complement}`,
            tenant: rental.tenants?.name,
            missing_count: missingPayments.length,
            created_count: 0,
            status: 'error',
            error: createError.message
          })
        } else {
          console.log(`✅ ${created?.length || 0} pagamento(s) criado(s)`)
          totalCreated += created?.length || 0
          
          report.push({
            rental_id: rental.id,
            location: `${rental.properties?.locations?.name} ${rental.properties?.complement}`,
            tenant: rental.tenants?.name,
            missing_count: missingPayments.length,
            created_count: created?.length || 0,
            status: 'success',
            payments: missingPayments.map((m, i) => ({
              month: m.month,
              year: m.year,
              due_date: m.dueDate.toISOString().split('T')[0],
              amount: paymentsToCreate[i].expected_amount,
              installment: paymentsToCreate[i].installment,
              is_proportional: paymentsToCreate[i].installment === null
            }))
          })
        }
      }
    }

    console.log(`
🎉 Processo finalizado! Total de pagamentos criados: ${totalCreated}`)

    return new Response(
      JSON.stringify({
        success: true,
        total_rentals_checked: rentals?.length || 0,
        total_payments_created: totalCreated,
        report: report
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})