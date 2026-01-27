import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting get-available-properties Edge Function')
    
    // Criar cliente Supabase com Service Role Key para bypassar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('📊 Fetching available properties...')

    // Query OTIMIZADA: apenas campos essenciais
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        id,
        status,
        description,
        property_identifier,
        complement,
        rooms,
        bathrooms,
        area,
        has_garage,
        garage_value,
        value,
        has_furniture,
        accepts_pets,
        created_at,
        locations!inner (
          id,
          name,
          neighborhood,
          city,
          state
        )
      `)
      .eq('status', 'available')
      .eq('locations.is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ Error fetching properties:', error)
      return new Response(
        JSON.stringify({ 
          error: error.message,
          details: error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Successfully fetched ${properties?.length || 0} properties`)

    // Retornar dados de forma otimizada
    return new Response(
      JSON.stringify({ 
        data: properties || [],
        count: properties?.length || 0,
        success: true
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Unexpected error in Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})