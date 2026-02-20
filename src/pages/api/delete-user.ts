import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🚀 [API-DELETE-USER] Requisição recebida");
  
  if (req.method !== "POST") {
    console.log("❌ [API-DELETE-USER] Método não permitido:", req.method);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { userId } = req.body;
    console.log(`📝 [API-DELETE-USER] userId recebido: ${userId}`);

    if (!userId) {
      console.log("❌ [API-DELETE-USER] userId não fornecido");
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    // Criar cliente Supabase com service_role_key para ter permissões admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ [API-DELETE-USER] Variáveis de ambiente não configuradas");
      return res.status(500).json({ 
        error: "Configuração do servidor incorreta",
        details: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos"
      });
    }

    console.log("✅ [API-DELETE-USER] Variáveis de ambiente OK");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Buscar informações do usuário em system_users
    console.log(`🔍 [API-DELETE-USER] Buscando usuário ${userId} em system_users...`);
    const { data: systemUser, error: systemUserError } = await supabase
      .from("system_users")
      .select("id, email, auth_user_id")
      .eq("id", userId)
      .maybeSingle();

    if (systemUserError) {
      console.error("❌ [API-DELETE-USER] Erro ao buscar system_user:", systemUserError);
      return res.status(500).json({ 
        error: "Erro ao buscar usuário", 
        details: systemUserError.message 
      });
    }

    if (!systemUser) {
      console.log(`⚠️ [API-DELETE-USER] Usuário ${userId} não encontrado em system_users`);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log(`✅ [API-DELETE-USER] Usuário encontrado: ${systemUser.email}, auth_user_id: ${systemUser.auth_user_id}`);

    // 2. Deletar do Authentication (se tiver auth_user_id)
    if (systemUser.auth_user_id) {
      console.log(`🗑️ [API-DELETE-USER] Deletando do Auth: ${systemUser.auth_user_id}`);
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
        systemUser.auth_user_id
      );

      if (deleteAuthError) {
        console.error("⚠️ [API-DELETE-USER] Erro ao deletar do Auth (continuando):", deleteAuthError.message);
        // Não retornar erro aqui, continuar com a exclusão do system_users
      } else {
        console.log("✅ [API-DELETE-USER] Usuário deletado do Auth com sucesso");
      }
    } else {
      console.log("⚠️ [API-DELETE-USER] Usuário não tem auth_user_id, pulando exclusão do Auth");
    }

    // 3. Deletar de system_users (com CASCADE para todas as dependências)
    console.log(`🗑️ [API-DELETE-USER] Deletando de system_users: ${userId}`);
    const { error: deleteSystemError } = await supabase
      .from("system_users")
      .delete()
      .eq("id", userId);

    if (deleteSystemError) {
      console.error("❌ [API-DELETE-USER] Erro ao deletar de system_users:", deleteSystemError);
      return res.status(500).json({ 
        error: "Erro ao deletar usuário do sistema", 
        details: deleteSystemError.message 
      });
    }

    console.log("✅ [API-DELETE-USER] Usuário deletado com sucesso!");
    return res.status(200).json({
      success: true,
      message: "Usuário deletado com sucesso",
      deleted_system_user: true,
      deleted_auth_user: !!systemUser.auth_user_id
    });

  } catch (error: any) {
    console.error("❌ [API-DELETE-USER] Erro inesperado:", error);
    return res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message 
    });
  }
}