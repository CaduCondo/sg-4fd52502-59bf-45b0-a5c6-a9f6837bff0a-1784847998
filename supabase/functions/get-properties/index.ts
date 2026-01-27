import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting get-properties Edge Function')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('📋 Supabase URL:', supabaseUrl ? 'Set ✅' : 'Missing ❌')
    console.log('🔑 Service Key:', supabaseServiceKey ? 'Set ✅' : 'Missing ❌')

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('📊 Fetching all properties...')
    
    // Query ALL properties with locations - SIMPLIFIED
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        id,
        location_id,
        property_identifier,
        complement,
        description,
        rooms,
        bathrooms,
        area,
        has_garage,
        garage_value,
        value,
        has_furniture,
        accepts_pets,
        status,
        images,
        created_at,
        updated_at,
        locations (
          id,
          name,
          street,
          number,
          neighborhood,
          city,
          state,
          zip_code
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log(`✅ Successfully fetched ${properties?.length || 0} properties`)
    
    // Map to flat structure
    const mappedProperties = properties?.map((p: any) => ({
      id: p.id,
      location_id: p.location_id,
      location_name: p.locations?.name || '',
      location_street: p.locations?.street || '',
      location_number: p.locations?.number || '',
      location_neighborhood: p.locations?.neighborhood || '',
      location_city: p.locations?.city || '',
      location_state: p.locations?.state || '',
      location_zip_code: p.locations?.zip_code || '',
      property_identifier: p.property_identifier,
      complement: p.complement,
      description: p.description,
      rooms: p.rooms,
      bathrooms: p.bathrooms,
      area: p.area,
      has_garage: p.has_garage,
      garage_value: p.garage_value,
      value: p.value,
      has_furniture: p.has_furniture,
      accepts_pets: p.accepts_pets,
      status: p.status,
      images: p.images || [],
      created_at: p.created_at,
      updated_at: p.updated_at,
    })) || []

    console.log('📦 Returning mapped properties:', mappedProperties.length)

    return new Response(
      JSON.stringify(mappedProperties),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch properties'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})