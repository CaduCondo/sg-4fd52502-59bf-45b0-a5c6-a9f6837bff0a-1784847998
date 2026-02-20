import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [DELETE-USER] Iniciando função...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [DELETE-USER] Variáveis de ambiente não configuradas')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Obter o body da requisição
    const body = await req.json()
    const { user_id } = body
    
    console.log(`📝 [DELETE-USER] user_id recebido: ${user_id}`)

    if (!user_id) {
      console.error('❌ [DELETE-USER] user_id não fornecido')
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Buscar informações do usuário em system_users
    console.log(`🔍 [DELETE-USER] Buscando usuário ${user_id} em system_users...`)
    const { data: systemUser, error: systemUserError } = await supabase
      .from('system_users')
      .select('id, email, auth_user_id')
      .eq('id', user_id)
      .maybeSingle()

    if (systemUserError) {
      console.error('❌ [DELETE-USER] Erro ao buscar system_user:', systemUserError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuário', details: systemUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!systemUser) {
      console.log(`⚠️ [DELETE-USER] Usuário ${user_id} não encontrado em system_users`)
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ [DELETE-USER] Usuário encontrado: ${systemUser.email}, auth_user_id: ${systemUser.auth_user_id}`)

    // 2. Deletar do Authentication (se tiver auth_user_id)
    if (systemUser.auth_user_id) {
      console.log(`🗑️ [DELETE-USER] Deletando do Auth: ${systemUser.auth_user_id}`)
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(systemUser.auth_user_id)
      
      if (deleteAuthError) {
        console.error('⚠️ [DELETE-USER] Erro ao deletar do Auth (continuando):', deleteAuthError.message)
        // Não retornar erro aqui, continuar com a exclusão do system_users
      } else {
        console.log('✅ [DELETE-USER] Usuário deletado do Auth com sucesso')
      }
    } else {
      console.log('⚠️ [DELETE-USER] Usuário não tem auth_user_id, pulando exclusão do Auth')
    }

    // 3. Deletar de system_users (com CASCADE para todas as dependências)
    console.log(`🗑️ [DELETE-USER] Deletando de system_users: ${user_id}`)
    const { error: deleteSystemError } = await supabase
      .from('system_users')
      .delete()
      .eq('id', user_id)

    if (deleteSystemError) {
      console.error('❌ [DELETE-USER] Erro ao deletar de system_users:', deleteSystemError)
      return new Response(
        JSON.stringify({ error: 'Erro ao deletar usuário do sistema', details: deleteSystemError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [DELETE-USER] Usuário deletado com sucesso!')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário deletado com sucesso',
        deleted_system_user: true,
        deleted_auth_user: !!systemUser.auth_user_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ [DELETE-USER] Erro inesperado:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})